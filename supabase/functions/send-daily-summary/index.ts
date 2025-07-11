import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface UrgentReport {
  id: string
  title: string
  description: string
  urgency: string
  status: string
  farm_name: string
  equipment_name?: string
  created_at: string
}

interface MaintenanceItem {
  id: string
  name: string
  type: 'equipment' | 'facility'
  farm_name: string
  next_maintenance_due: string
  last_maintenance?: string
  status: string
  facility_type?: string
}

interface EmailRecipient {
  email: string
  name: string
  role: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Get current date
    const today = new Date()
    const todayStr = today.toISOString().split('T')[0]
    const nextWeek = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000))
    const nextWeekStr = nextWeek.toISOString().split('T')[0]

    // Fetch urgent reports (high/critical and not closed/resolved)
    const { data: urgentReports, error: reportsError } = await supabase
      .from('reports')
      .select(`
        id, title, description, urgency, status, created_at,
        farms(name),
        equipment(name)
      `)
      .in('urgency', ['high', 'critical'])
      .not('status', 'in', '(closed,resolved)')
      .order('created_at', { ascending: false })

    if (reportsError) throw reportsError

    // Transform reports data
    const transformedReports: UrgentReport[] = urgentReports.map(report => ({
      ...report,
      farm_name: report.farms?.name || 'N/A',
      equipment_name: report.equipment?.name
    }))

    // Fetch overdue equipment maintenance
    const { data: overdueEquipment, error: equipmentError } = await supabase
      .from('equipment')
      .select(`
        id, name, next_maintenance_due, last_maintenance, status,
        farms(name)
      `)
      .not('next_maintenance_due', 'is', null)
      .lt('next_maintenance_due', todayStr)

    if (equipmentError) throw equipmentError

    // Fetch due soon equipment maintenance (next 7 days)
    const { data: dueSoonEquipment, error: dueSoonEquipmentError } = await supabase
      .from('equipment')
      .select(`
        id, name, next_maintenance_due, last_maintenance, status,
        farms(name)
      `)
      .not('next_maintenance_due', 'is', null)
      .gte('next_maintenance_due', todayStr)
      .lte('next_maintenance_due', nextWeekStr)

    if (dueSoonEquipmentError) throw dueSoonEquipmentError

    // Fetch overdue facilities maintenance
    const { data: overdueFacilities, error: facilitiesError } = await supabase
      .from('facilities')
      .select(`
        id, name, type, next_maintenance_due, last_maintenance, status,
        farms(name)
      `)
      .not('next_maintenance_due', 'is', null)
      .lt('next_maintenance_due', todayStr)

    if (facilitiesError) throw facilitiesError

    // Fetch due soon facilities maintenance (next 7 days)
    const { data: dueSoonFacilities, error: dueSoonFacilitiesError } = await supabase
      .from('facilities')
      .select(`
        id, name, type, next_maintenance_due, last_maintenance, status,
        farms(name)
      `)
      .not('next_maintenance_due', 'is', null)
      .gte('next_maintenance_due', todayStr)
      .lte('next_maintenance_due', nextWeekStr)

    if (dueSoonFacilitiesError) throw dueSoonFacilitiesError

    // Transform maintenance data
    const overdueMaintenanceItems: MaintenanceItem[] = [
      ...overdueEquipment.map(item => ({
        ...item,
        type: 'equipment' as const,
        farm_name: item.farms?.name || 'N/A'
      })),
      ...overdueFacilities.map(item => ({
        ...item,
        type: 'facility' as const,
        farm_name: item.farms?.name || 'N/A',
        facility_type: item.type
      }))
    ]

    const dueSoonMaintenanceItems: MaintenanceItem[] = [
      ...dueSoonEquipment.map(item => ({
        ...item,
        type: 'equipment' as const,
        farm_name: item.farms?.name || 'N/A'
      })),
      ...dueSoonFacilities.map(item => ({
        ...item,
        type: 'facility' as const,
        farm_name: item.farms?.name || 'N/A',
        facility_type: item.type
      }))
    ]

    // Check if there's anything to report
    const hasUrgentReports = transformedReports.length > 0
    const hasOverdueMaintenance = overdueMaintenanceItems.length > 0
    const hasDueSoonMaintenance = dueSoonMaintenanceItems.length > 0

    if (!hasUrgentReports && !hasOverdueMaintenance && !hasDueSoonMaintenance) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Nessun elemento da segnalare oggi',
          sent: false
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      )
    }

    // Fetch email recipients (admin and manager users)
    const { data: recipients, error: recipientsError } = await supabase
      .from('users')
      .select('full_name, email, role')
      .in('role', ['admin', 'manager'])
      .eq('active', true)

    if (recipientsError) throw recipientsError

    if (!recipients || recipients.length === 0) {
      throw new Error('Nessun destinatario trovato per il report giornaliero')
    }

    // Get Microsoft Graph access token
    const tokenResponse = await fetch('https://login.microsoftonline.com/' + Deno.env.get('MICROSOFT_TENANT_ID') + '/oauth2/v2.0/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: Deno.env.get('MICROSOFT_CLIENT_ID') || '',
        client_secret: Deno.env.get('MICROSOFT_CLIENT_SECRET') || '',
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    })

    if (!tokenResponse.ok) {
      throw new Error('Failed to get access token')
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Helper functions
    const getUrgencyText = (urgency: string) => {
      switch (urgency) {
        case 'high': return 'Alta'
        case 'critical': return 'Critica'
        default: return urgency
      }
    }

    const getUrgencyColor = (urgency: string) => {
      switch (urgency) {
        case 'high': return '#dc2626'
        case 'critical': return '#7c2d12'
        default: return '#6b7280'
      }
    }

    const getFacilityTypeText = (type?: string) => {
      switch (type) {
        case 'electrical': return 'Elettrico'
        case 'plumbing': return 'Idraulico'
        case 'ventilation': return 'Ventilazione'
        case 'heating': return 'Riscaldamento'
        case 'cooling': return 'Raffreddamento'
        case 'lighting': return 'Illuminazione'
        case 'security': return 'Sicurezza'
        default: return 'Altro'
      }
    }

    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString('it-IT')
    }

    const getDaysOverdue = (dueDate: string) => {
      const due = new Date(dueDate)
      const diffTime = today.getTime() - due.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    const getDaysUntilDue = (dueDate: string) => {
      const due = new Date(dueDate)
      const diffTime = due.getTime() - today.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      return diffDays
    }

    // Create email content
    const emailSubject = `AllevApp - Report Giornaliero ${today.toLocaleDateString('it-IT')}`
    const emailBody = `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Report Giornaliero AllevApp</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
          <div style="max-width: 800px; margin: 0 auto; background-color: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #E31E24, #FF6B70); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AllevApp</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Report Giornaliero - ${today.toLocaleDateString('it-IT', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}</p>
            </div>

            <!-- Summary -->
            <div style="padding: 20px; background: #f8f9fa; border-bottom: 1px solid #e9ecef;">
              <div style="display: flex; justify-content: space-around; text-align: center; flex-wrap: wrap;">
                <div style="margin: 10px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 150px;">
                  <div style="font-size: 24px; font-weight: bold; color: #E31E24;">${transformedReports.length}</div>
                  <div style="font-size: 14px; color: #6b7280;">Segnalazioni Urgenti</div>
                </div>
                <div style="margin: 10px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 150px;">
                  <div style="font-size: 24px; font-weight: bold; color: #dc2626;">${overdueMaintenanceItems.length}</div>
                  <div style="font-size: 14px; color: #6b7280;">Manutenzioni Scadute</div>
                </div>
                <div style="margin: 10px; padding: 15px; background: white; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); min-width: 150px;">
                  <div style="font-size: 24px; font-weight: bold; color: #f59e0b;">${dueSoonMaintenanceItems.length}</div>
                  <div style="font-size: 14px; color: #6b7280;">In Scadenza (7gg)</div>
                </div>
              </div>
            </div>

            <div style="padding: 20px;">
              ${hasUrgentReports ? `
                <!-- Urgent Reports Section -->
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #E31E24; border-bottom: 2px solid #E31E24; padding-bottom: 10px; margin-bottom: 20px;">
                    🚨 Segnalazioni Urgenti (${transformedReports.length})
                  </h2>
                  ${transformedReports.map(report => `
                    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #1E3A8A; font-size: 16px;">${report.title}</h3>
                        <span style="background: ${getUrgencyColor(report.urgency)}; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                          ${getUrgencyText(report.urgency)}
                        </span>
                      </div>
                      <p style="margin: 10px 0; color: #4b5563; font-size: 14px;">${report.description}</p>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px; color: #6b7280;">
                        <div><strong>Allevamento:</strong> ${report.farm_name}</div>
                        ${report.equipment_name ? `<div><strong>Attrezzatura:</strong> ${report.equipment_name}</div>` : ''}
                        <div><strong>Creata il:</strong> ${formatDate(report.created_at)}</div>
                        <div><strong>Stato:</strong> ${report.status}</div>
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${hasOverdueMaintenance ? `
                <!-- Overdue Maintenance Section -->
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px; margin-bottom: 20px;">
                    ⚠️ Manutenzioni Scadute (${overdueMaintenanceItems.length})
                  </h2>
                  ${overdueMaintenanceItems.map(item => `
                    <div style="background: #fef2f2; border: 1px solid #fca5a5; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #1E3A8A; font-size: 16px;">
                          ${item.type === 'equipment' ? '🔧' : '⚙️'} ${item.name}
                        </h3>
                        <span style="background: #dc2626; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                          ${getDaysOverdue(item.next_maintenance_due)} giorni di ritardo
                        </span>
                      </div>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px; color: #6b7280;">
                        <div><strong>Tipo:</strong> ${item.type === 'equipment' ? 'Attrezzatura' : `Impianto ${getFacilityTypeText(item.facility_type)}`}</div>
                        <div><strong>Allevamento:</strong> ${item.farm_name}</div>
                        <div><strong>Scadenza:</strong> ${formatDate(item.next_maintenance_due)}</div>
                        ${item.last_maintenance ? `<div><strong>Ultima manutenzione:</strong> ${formatDate(item.last_maintenance)}</div>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              ${hasDueSoonMaintenance ? `
                <!-- Due Soon Maintenance Section -->
                <div style="margin-bottom: 30px;">
                  <h2 style="color: #f59e0b; border-bottom: 2px solid #f59e0b; padding-bottom: 10px; margin-bottom: 20px;">
                    ⏰ Manutenzioni in Scadenza (${dueSoonMaintenanceItems.length})
                  </h2>
                  ${dueSoonMaintenanceItems.map(item => `
                    <div style="background: #fffbeb; border: 1px solid #fde68a; border-radius: 8px; padding: 15px; margin-bottom: 15px;">
                      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 10px;">
                        <h3 style="margin: 0; color: #1E3A8A; font-size: 16px;">
                          ${item.type === 'equipment' ? '🔧' : '⚙️'} ${item.name}
                        </h3>
                        <span style="background: #f59e0b; color: white; padding: 4px 8px; border-radius: 12px; font-size: 12px; font-weight: bold;">
                          ${getDaysUntilDue(item.next_maintenance_due)} giorni
                        </span>
                      </div>
                      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 13px; color: #6b7280;">
                        <div><strong>Tipo:</strong> ${item.type === 'equipment' ? 'Attrezzatura' : `Impianto ${getFacilityTypeText(item.facility_type)}`}</div>
                        <div><strong>Allevamento:</strong> ${item.farm_name}</div>
                        <div><strong>Scadenza:</strong> ${formatDate(item.next_maintenance_due)}</div>
                        ${item.last_maintenance ? `<div><strong>Ultima manutenzione:</strong> ${formatDate(item.last_maintenance)}</div>` : ''}
                      </div>
                    </div>
                  `).join('')}
                </div>
              ` : ''}

              <!-- Actions Section -->
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin-top: 30px;">
                <h3 style="color: #1E3A8A; margin-top: 0;">📋 Azioni Consigliate</h3>
                <ul style="margin: 10px 0; padding-left: 20px; color: #4b5563;">
                  ${hasUrgentReports ? '<li>Verificare e gestire le segnalazioni urgenti in sospeso</li>' : ''}
                  ${hasOverdueMaintenance ? '<li>Programmare immediatamente le manutenzioni scadute</li>' : ''}
                  ${hasDueSoonMaintenance ? '<li>Pianificare le manutenzioni in scadenza nei prossimi 7 giorni</li>' : ''}
                  <li>Accedere al sistema AllevApp per gestire le attività</li>
                  <li>Aggiornare lo stato delle attività completate</li>
                </ul>
              </div>
            </div>

            <!-- Footer -->
            <div style="background: #1E3A8A; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">
                <strong>AllevApp - Sistema di Gestione Allevamenti</strong>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
                Questo report è stato generato automaticamente il ${today.toLocaleDateString('it-IT')} alle ${today.toLocaleTimeString('it-IT')}
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
                Per assistenza: info@allevapp.com
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email to all recipients
    const emailPromises = recipients.map(async (recipient) => {
      try {
        const emailResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${Deno.env.get('MICROSOFT_SENDER_EMAIL')}/sendMail`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message: {
              subject: emailSubject,
              body: {
                contentType: 'HTML',
                content: emailBody,
              },
              toRecipients: [
                {
                  emailAddress: {
                    address: recipient.email,
                    name: recipient.full_name,
                  },
                },
              ],
              from: {
                emailAddress: {
                  address: Deno.env.get('MICROSOFT_SENDER_EMAIL'),
                  name: 'AllevApp Sistema',
                },
              },
            },
          }),
        })

        if (!emailResponse.ok) {
          const errorText = await emailResponse.text()
          throw new Error(`Failed to send email to ${recipient.email}: ${errorText}`)
        }

        return { success: true, recipient: recipient.email }
      } catch (error) {
        console.error(`Error sending email to ${recipient.email}:`, error)
        return { success: false, recipient: recipient.email, error: error.message }
      }
    })

    const emailResults = await Promise.all(emailPromises)
    const successCount = emailResults.filter(r => r.success).length
    const failureCount = emailResults.filter(r => !r.success).length

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Report giornaliero inviato con successo`,
        sent: true,
        recipients: recipients.length,
        successful_sends: successCount,
        failed_sends: failureCount,
        summary: {
          urgent_reports: transformedReports.length,
          overdue_maintenance: overdueMaintenanceItems.length,
          due_soon_maintenance: dueSoonMaintenanceItems.length
        },
        email_results: emailResults
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending daily summary:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Errore nell\'invio del report giornaliero'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})