import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface CalendarEventRequest {
  subject: string
  description: string
  startDateTime: string
  endDateTime: string
  location?: string
  attendees?: string[]
  isAllDay?: boolean
  reminderMinutes?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      subject, 
      description, 
      startDateTime, 
      endDateTime, 
      location, 
      attendees = [], 
      isAllDay = false,
      reminderMinutes = 15
    }: CalendarEventRequest = await req.json()

    // Check if all required environment variables are present
    const tenantId = Deno.env.get('MICROSOFT_TENANT_ID')
    const clientId = Deno.env.get('MICROSOFT_CLIENT_ID')
    const clientSecret = Deno.env.get('MICROSOFT_CLIENT_SECRET')
    const senderEmail = Deno.env.get('MICROSOFT_SENDER_EMAIL')

    if (!tenantId || !clientId || !clientSecret || !senderEmail) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Microsoft 365 credentials not configured',
          message: 'Configurazione Microsoft 365 non completata. Vai su Impostazioni → Configura Microsoft 365 per completare la configurazione.',
          missingVars: {
            tenantId: !tenantId,
            clientId: !clientId,
            clientSecret: !clientSecret,
            senderEmail: !senderEmail
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    console.log('Attempting to get Microsoft Graph access token...')

    // Get Microsoft Graph access token
    const tokenResponse = await fetch(`https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'https://graph.microsoft.com/.default',
        grant_type: 'client_credentials',
      }),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token request failed:', errorText)
      
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to authenticate with Microsoft 365: ${tokenResponse.status}`,
          message: 'Errore di autenticazione Microsoft 365. Verifica le credenziali in Azure AD.',
          details: errorText,
          troubleshooting: {
            step: 'Verifica Passo 2 della guida: Configurazione Autenticazione',
            checkList: [
              'Client Secret non scaduto',
              'Tenant ID corretto',
              'Client ID corretto',
              'Consenso amministratore concesso'
            ]
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    console.log('Access token obtained successfully')

    // Prepare attendees array
    const eventAttendees = attendees.map(email => ({
      emailAddress: {
        address: email,
        name: email.split('@')[0]
      }
    }))

    // Format datetime strings properly
    const formatDateTime = (dateTimeStr: string) => {
      // Ensure the datetime string is in ISO format
      if (!dateTimeStr.includes('T')) {
        return `${dateTimeStr}T00:00:00.000Z`
      }
      if (!dateTimeStr.endsWith('Z') && !dateTimeStr.includes('+')) {
        return `${dateTimeStr}.000Z`
      }
      return dateTimeStr
    }

    // Create calendar event
    const eventData = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: description || ''
      },
      start: isAllDay ? {
        date: startDateTime.split('T')[0]
      } : {
        dateTime: formatDateTime(startDateTime),
        timeZone: 'Europe/Rome'
      },
      end: isAllDay ? {
        date: endDateTime.split('T')[0]
      } : {
        dateTime: formatDateTime(endDateTime),
        timeZone: 'Europe/Rome'
      },
      location: location ? {
        displayName: location
      } : undefined,
      attendees: eventAttendees,
      isAllDay: isAllDay,
      reminderMinutesBeforeStart: reminderMinutes,
      showAs: 'busy',
      importance: 'normal'
    }

    console.log('Creating calendar event for user:', senderEmail)
    console.log('Event data:', JSON.stringify(eventData, null, 2))

    // Create the event in Microsoft 365 calendar
    const calendarResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/events`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(eventData),
    })

    if (!calendarResponse.ok) {
      const errorText = await calendarResponse.text()
      console.error('Calendar creation failed:', errorText)
      
      let troubleshootingMessage = ''
      let checkList: string[] = []
      
      if (calendarResponse.status === 403) {
        troubleshootingMessage = 'Errore 403: Permessi insufficienti. Verifica la configurazione Azure AD.'
        checkList = [
          'Permesso "Calendars.ReadWrite" aggiunto in Azure AD',
          'Consenso amministratore concesso per tutti i permessi',
          'Email mittente ha licenza Exchange Online',
          'Account email mittente esistente e attivo'
        ]
      } else if (calendarResponse.status === 401) {
        troubleshootingMessage = 'Errore 401: Credenziali non valide.'
        checkList = [
          'Client Secret non scaduto',
          'Variabili d\'ambiente corrette in Supabase',
          'Tenant ID e Client ID corrispondenti'
        ]
      } else if (calendarResponse.status === 404) {
        troubleshootingMessage = 'Errore 404: Utente o calendario non trovato.'
        checkList = [
          'Email mittente esistente in Microsoft 365',
          'Account ha accesso al calendario',
          'Licenza Exchange Online attiva'
        ]
      }

      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create calendar event: ${calendarResponse.status}`,
          message: troubleshootingMessage || 'Errore nella creazione dell\'evento calendario',
          details: errorText,
          troubleshooting: {
            step: calendarResponse.status === 403 ? 'Verifica Passo 2: Permessi API' : 'Verifica configurazione generale',
            checkList: checkList,
            nextSteps: [
              'Vai su Impostazioni → Configura Microsoft 365',
              'Segui la guida passo-passo',
              'Testa la configurazione al Passo 5'
            ]
          }
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const eventResult = await calendarResponse.json()
    console.log('Calendar event created successfully:', eventResult.id)

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Evento calendario creato con successo',
        eventId: eventResult.id,
        webLink: eventResult.webLink
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error creating calendar event:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Errore imprevisto nella creazione dell\'evento',
        troubleshooting: {
          step: 'Verifica configurazione Microsoft 365',
          suggestion: 'Vai su Impostazioni → Configura Microsoft 365 per una guida completa'
        }
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})