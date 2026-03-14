import { google } from 'googleapis';
import db from '../database/init.js';

/**
 * Service pour gérer les interactions avec Google Calendar
 */
class GoogleCalendarService {
    /**
     * Récupère un client OAuth2 authentifié pour un outil donné
     */
    async getClient(toolId) {                                                               
        const tool = await db.get('SELECT config FROM tools WHERE id = ?', toolId);
        if (!tool || !tool.config) return null;

        const config = typeof tool.config === 'string' ? JSON.parse(tool.config) : tool.config;
        const { access_token, refresh_token, expiry_date, clientId, clientSecret } = config;

        // On utilise les credentials de l'outil ou les globaux
        const finalClientId = clientId || process.env.GOOGLE_CLIENT_ID;
        const finalClientSecret = clientSecret || process.env.GOOGLE_CLIENT_SECRET;
        const base = (process.env.BASE_URL || 'http://localhost:3001').replace(/\/$/, '');
        const redirectUri = `${base}/api/google-calendar/callback`;

        if (!finalClientId || !finalClientSecret) return null;

        const oauth2Client = new google.auth.OAuth2(finalClientId, finalClientSecret, redirectUri);
        oauth2Client.setCredentials({
            access_token,
            refresh_token,
            expiry_date
        });

        // Refresh token si expiré
        oauth2Client.on('tokens', async (tokens) => {
            const updatedConfig = { ...config, ...tokens };
            await db.run('UPDATE tools SET config = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?', 
                JSON.stringify(updatedConfig), toolId);
        });

        return oauth2Client;
    }

    /**
     * Crée un événement sur Google Calendar
     */
    async createEvent(toolId, eventDetails) {
        const auth = await this.getClient(toolId);
        if (!auth) throw new Error('Google Calendar not configured for this tool');

        const calendar = google.calendar({ version: 'v3', auth });

        const event = {
            summary: eventDetails.summary || 'Rendez-vous SEVEN T',
            location: eventDetails.location || '',
            description: eventDetails.description || 'Créé via SEVEN T',
            start: {
                dateTime: eventDetails.startTime, // Format ISO string
                timeZone: eventDetails.timeZone || 'Africa/Abidjan',
            },
            end: {
                dateTime: eventDetails.endTime, // Format ISO string
                timeZone: eventDetails.timeZone || 'Africa/Abidjan',
            },
            attendees: eventDetails.attendees || [],
            reminders: {
                useDefault: true,
            },
        };

        const response = await calendar.events.insert({
            calendarId: 'primary',
            resource: event,
        });

        return response.data;
    }
}

export default new GoogleCalendarService();
