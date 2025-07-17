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
          message: 'Configurazione Microsoft 365 non completata'
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

    // Prepare attendees array
    const eventAttendees = attendees.map(email => ({
      emailAddress: {
        address: email,
        name: email.split('@')[0]
      }
    }))

    // Create calendar event
    const eventData = {
      subject: subject,
      body: {
        contentType: 'HTML',
        content: description
      },
      start: {
        dateTime: startDateTime,
        timeZone: 'Europe/Rome'
      },
      end: {
        dateTime: endDateTime,
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
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: `Failed to create calendar event: ${calendarResponse.status}`,
          message: 'Errore nella creazione dell\'evento calendario',
          details: errorText
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 500,
        }
      )
    }

    const eventResult = await calendarResponse.json()

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
        message: 'Errore imprevisto nella creazione dell\'evento'
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500,
      }
    )
  }
})