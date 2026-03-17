import { google } from 'googleapis';
import { supabaseAdmin } from '../config/supabase.js';

const oauth2Client = new google.auth.OAuth2(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'https://lexhub.company/api/integrations/google/callback'
);

export class GoogleCalendarService {
  /**
   * Obtem as credenciais do usuario pelo tenantId
   */
  private async getUserCredentials(tenantId: string) {
    const { data: tokenData, error } = await supabaseAdmin
      .from('cloud_auth_tokens')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('provider', 'google')
      .single();

    if (error || !tokenData) {
      throw new Error('Google connection not found for this tenant.');
    }

    // Refresh credentials if needed in oauth2 client
    oauth2Client.setCredentials({
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token,
      expiry_date: new Date(tokenData.expires_at).getTime()
    });

    return oauth2Client;
  }

  /**
   * Adiciona um evento no Google Calendar
   */
  async addEvent(tenantId: string, eventData: {
    summary: string;
    description?: string;
    startDateTime: string;
    endDateTime: string;
    timeZone?: string;
  }) {
    try {
      const auth = await this.getUserCredentials(tenantId);
      const calendar = google.calendar({ version: 'v3', auth });
      
      const event = {
        summary: eventData.summary,
        description: eventData.description || 'Criado via LexHub',
        start: {
          dateTime: eventData.startDateTime,
          timeZone: eventData.timeZone || 'America/Sao_Paulo',
        },
        end: {
          dateTime: eventData.endDateTime,
          timeZone: eventData.timeZone || 'America/Sao_Paulo',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 },
            { method: 'popup', minutes: 30 },
          ],
        },
      };

      const response = await calendar.events.insert({
        calendarId: 'primary',
        requestBody: event,
      });

      return response.data;
    } catch (error) {
      console.error('Error adding event to Google Calendar:', error);
      throw error;
    }
  }

}

export const googleCalendarService = new GoogleCalendarService();
