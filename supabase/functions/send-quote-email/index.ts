import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface EmailRequest {
  to: string
  supplierName: string
  quoteTitle: string
  quoteDescription: string
  farmName: string
  dueDate?: string
  contactInfo: {
    companyName: string
    email: string
    phone?: string
  }
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, supplierName, quoteTitle, quoteDescription, farmName, dueDate, contactInfo }: EmailRequest = await req.json()

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

    // Create email content
    const emailSubject = `Richiesta Preventivo - ${quoteTitle}`
    const emailBody = `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="background: linear-gradient(135deg, #E31E24, #FF6B70); color: white; padding: 20px; border-radius: 10px 10px 0 0;">
              <h1 style="margin: 0; font-size: 24px;">AllevApp - Richiesta Preventivo</h1>
            </div>
            
            <div style="background: #f8f9fa; padding: 20px; border: 1px solid #e9ecef;">
              <h2 style="color: #1E3A8A; margin-top: 0;">Gentile ${supplierName},</h2>
              
              <p>Vi contattamo per richiedere un preventivo per i seguenti servizi/prodotti:</p>
              
              <div style="background: white; padding: 15px; border-radius: 8px; border-left: 4px solid #E31E24; margin: 20px 0;">
                <h3 style="color: #E31E24; margin-top: 0;">${quoteTitle}</h3>
                <p style="margin-bottom: 0;"><strong>Descrizione:</strong></p>
                <p style="background: #f8f9fa; padding: 10px; border-radius: 4px;">${quoteDescription}</p>
                
                <p><strong>Allevamento:</strong> ${farmName}</p>
                ${dueDate ? `<p><strong>Scadenza richiesta:</strong> ${new Date(dueDate).toLocaleDateString('it-IT')}</p>` : ''}
              </div>
              
              <div style="background: #e3f2fd; padding: 15px; border-radius: 8px; margin: 20px 0;">
                <h4 style="color: #1976d2; margin-top: 0;">Informazioni di Contatto</h4>
                <p><strong>Azienda:</strong> ${contactInfo.companyName}</p>
                <p><strong>Email:</strong> <a href="mailto:${contactInfo.email}" style="color: #E31E24;">${contactInfo.email}</a></p>
                ${contactInfo.phone ? `<p><strong>Telefono:</strong> ${contactInfo.phone}</p>` : ''}
              </div>
              
              <div style="background: #fff3cd; padding: 15px; border-radius: 8px; border: 1px solid #ffeaa7; margin: 20px 0;">
                <h4 style="color: #856404; margin-top: 0;">📋 Cosa Includere nel Preventivo</h4>
                <ul style="margin: 10px 0; padding-left: 20px;">
                  <li>Descrizione dettagliata dei prodotti/servizi</li>
                  <li>Prezzi unitari e totali (IVA inclusa/esclusa)</li>
                  <li>Tempi di consegna/esecuzione</li>
                  <li>Condizioni di pagamento</li>
                  <li>Validità dell'offerta</li>
                  <li>Eventuali garanzie offerte</li>
                </ul>
              </div>
              
              <p>Vi preghiamo di inviarci il preventivo rispondendo a questa email o contattandoci ai recapiti sopra indicati.</p>
              
              <p>Restiamo in attesa di un vostro cortese riscontro.</p>
              
              <div style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #e9ecef;">
                <p style="margin: 0;"><strong>Cordiali saluti,</strong></p>
                <p style="margin: 5px 0; color: #E31E24; font-weight: bold;">${contactInfo.companyName}</p>
                <p style="margin: 0; font-size: 14px; color: #666;">
                  Sistema di Gestione Allevamenti - AllevApp
                </p>
              </div>
            </div>
            
            <div style="background: #1E3A8A; color: white; padding: 15px; border-radius: 0 0 10px 10px; text-align: center; font-size: 12px;">
              <p style="margin: 0;">Questa email è stata generata automaticamente dal sistema AllevApp</p>
              <p style="margin: 5px 0 0 0;">Per assistenza tecnica: <a href="mailto:${contactInfo.email}" style="color: #FF9F9B;">${contactInfo.email}</a></p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Microsoft Graph API
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
                address: to,
                name: supplierName,
              },
            },
          ],
          from: {
            emailAddress: {
              address: Deno.env.get('MICROSOFT_SENDER_EMAIL'),
              name: contactInfo.companyName,
            },
          },
          replyTo: [
            {
              emailAddress: {
                address: contactInfo.email,
                name: contactInfo.companyName,
              },
            },
          ],
        },
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      throw new Error(`Failed to send email: ${errorText}`)
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email inviata con successo',
        recipient: to,
        subject: emailSubject
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Errore nell\'invio dell\'email'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})