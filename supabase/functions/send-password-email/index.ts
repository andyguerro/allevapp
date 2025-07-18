import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

interface PasswordEmailRequest {
  to: string
  userName: string
  username: string
  password: string
  role: string
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { to, userName, username, password, role }: PasswordEmailRequest = await req.json()

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
          message: 'Configurazione email non completata. Le credenziali sono state create ma non inviate via email.'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to authenticate with Microsoft 365: ${tokenResponse.status}`,
          message: 'Errore di autenticazione Microsoft 365'
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const tokenData = await tokenResponse.json()
    const accessToken = tokenData.access_token

    // Get role text in Italian
    const getRoleText = (role: string) => {
      switch (role) {
        case 'admin': return 'Amministratore'
        case 'manager': return 'Manager'
        case 'technician': return 'Tecnico'
        default: return role
      }
    }

    // Create email content
    const emailSubject = `AllevApp - Le tue credenziali di accesso`
    const emailBody = `
      <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Credenziali AllevApp</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; background-color: #f8f9fa;">
          <div style="max-width: 600px; margin: 0 auto; background-color: white;">
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #E31E24, #FF6B70); color: white; padding: 30px 20px; text-align: center;">
              <h1 style="margin: 0; font-size: 28px; font-weight: bold;">AllevApp</h1>
              <p style="margin: 10px 0 0 0; font-size: 16px; opacity: 0.9;">Sistema di Gestione Allevamenti</p>
            </div>

            <!-- Content -->
            <div style="padding: 30px 20px;">
              <h2 style="color: #1E3A8A; margin-top: 0; margin-bottom: 20px;">Ciao ${userName}!</h2>
              
              <p style="margin-bottom: 20px;">
                Il tuo account AllevApp è stato creato con successo. Ecco le tue credenziali di accesso:
              </p>
              
              <!-- Credentials Box -->
              <div style="background: #f8f9fa; border: 2px solid #E31E24; border-radius: 12px; padding: 25px; margin: 25px 0; text-align: center;">
                <h3 style="color: #E31E24; margin-top: 0; margin-bottom: 20px; font-size: 20px;">🔐 Le tue Credenziali</h3>
                
                <div style="background: white; border-radius: 8px; padding: 20px; margin-bottom: 15px; border: 1px solid #e9ecef;">
                  <div style="margin-bottom: 15px;">
                    <strong style="color: #1E3A8A; display: block; margin-bottom: 5px;">Nome Utente:</strong>
                    <span style="font-family: 'Courier New', monospace; font-size: 18px; color: #E31E24; font-weight: bold; background: #f8f9fa; padding: 8px 12px; border-radius: 4px; display: inline-block;">${username}</span>
                  </div>
                  
                  <div>
                    <strong style="color: #1E3A8A; display: block; margin-bottom: 5px;">Password:</strong>
                    <span style="font-family: 'Courier New', monospace; font-size: 18px; color: #E31E24; font-weight: bold; background: #f8f9fa; padding: 8px 12px; border-radius: 4px; display: inline-block;">${password}</span>
                  </div>
                </div>
                
                <div style="background: #e3f2fd; border-radius: 8px; padding: 15px; border: 1px solid #bbdefb;">
                  <strong style="color: #1976d2;">Ruolo:</strong> ${getRoleText(role)}
                </div>
              </div>

              <!-- Instructions -->
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #856404; margin-top: 0; margin-bottom: 15px;">📋 Come Accedere</h4>
                <ol style="margin: 0; padding-left: 20px; color: #856404;">
                  <li style="margin-bottom: 8px;">Vai su <strong>AllevApp</strong></li>
                  <li style="margin-bottom: 8px;">Inserisci il <strong>Nome Utente</strong> nel primo campo</li>
                  <li style="margin-bottom: 8px;">Inserisci la <strong>Password</strong> nel secondo campo</li>
                  <li style="margin-bottom: 8px;">Clicca <strong>"Accedi"</strong></li>
                </ol>
              </div>

              <!-- Security Notice -->
              <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #dc2626; margin-top: 0; margin-bottom: 15px;">🔒 Sicurezza</h4>
                <ul style="margin: 0; padding-left: 20px; color: #dc2626; font-size: 14px;">
                  <li style="margin-bottom: 5px;">Conserva queste credenziali in un luogo sicuro</li>
                  <li style="margin-bottom: 5px;">Non condividere la password con altri</li>
                  <li style="margin-bottom: 5px;">Contatta l'amministratore per modifiche</li>
                </ul>
              </div>

              <!-- Support -->
              <div style="background: #f0f9ff; border: 1px solid #bae6fd; border-radius: 8px; padding: 20px; margin: 25px 0;">
                <h4 style="color: #1E3A8A; margin-top: 0; margin-bottom: 15px;">💬 Supporto</h4>
                <p style="margin: 0; color: #1E3A8A; font-size: 14px;">
                  Per assistenza o problemi di accesso, contatta l'amministratore del sistema.
                </p>
              </div>

              <p style="margin-top: 30px; margin-bottom: 0;">
                Benvenuto nel team AllevApp!
              </p>
              
              <p style="margin: 10px 0 0 0; color: #6b7280; font-size: 14px;">
                <strong>Il Team AllevApp</strong><br>
                Sistema di Gestione Allevamenti
              </p>
            </div>

            <!-- Footer -->
            <div style="background: #1E3A8A; color: white; padding: 20px; text-align: center;">
              <p style="margin: 0; font-size: 14px;">
                <strong>AllevApp - Sistema di Gestione Allevamenti</strong>
              </p>
              <p style="margin: 10px 0 0 0; font-size: 12px; opacity: 0.8;">
                Questa email è stata generata automaticamente il ${new Date().toLocaleDateString('it-IT')}
              </p>
            </div>
          </div>
        </body>
      </html>
    `

    // Send email via Microsoft Graph API
    const emailResponse = await fetch(`https://graph.microsoft.com/v1.0/users/${senderEmail}/sendMail`, {
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
                name: userName,
              },
            },
          ],
          from: {
            emailAddress: {
              address: senderEmail,
              name: 'AllevApp Sistema',
            },
          },
        },
      }),
    })

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text()
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to send email: ${emailResponse.status}`,
          message: 'Errore nell\'invio dell\'email con le credenziali',
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Email con credenziali inviata con successo',
        recipient: to
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    )

  } catch (error) {
    console.error('Error sending password email:', error)
    
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Errore imprevisto nell\'invio dell\'email'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})