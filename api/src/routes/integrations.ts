import { Router } from 'express';
import { subscribeNotificaMeWebhook } from '../services/notificaMeService.js';
import { getAuthUrl, handleCallback } from '../services/googleAuthService.js';
import { googleCalendarService } from '../services/googleCalendarService.js';
import { getMicrosoftAuthUrl, handleMicrosoftCallback } from '../services/microsoftAuthService.js';
import { getDropboxAuthUrl, handleDropboxCallback } from '../services/dropboxAuthService.js';
import { getMetaAuthUrl, handleMetaCallback } from '../services/metaAuthService.js';
import { getSlackAuthUrl, handleSlackCallback } from '../services/slackAuthService.js';
import { getTrelloAuthUrl, handleTrelloToken } from '../services/trelloAuthService.js';

export const integrationsRouter = Router();

/**
 * Rota para iniciar fluxo Google OAuth
 */
integrationsRouter.get('/google/auth', (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    
    const url = getAuthUrl(tenantId as string);
    res.json({ url });
});

/**
 * Rota de Callback do Google
 */
integrationsRouter.get('/google/callback', async (req, res) => {
    const { code, state: tenantId } = req.query;
    
    if (!code || !tenantId) {
        return res.status(400).send('Code and tenantId are required');
    }

    try {
        await handleCallback(code as string, tenantId as string);
        // Script para fechar o popup e notificar a janela pai
        res.send(`
            <script>
                window.opener.postMessage({ type: 'GOOGLE_AUTH_SUCCESS' }, '*');
                window.close();
            </script>
        `);
    } catch (err: any) {
        console.error('[Google OAuth] Erro no callback:', err);
        res.status(500).send('Erro na autenticação: ' + err.message);
    }
});

/**
 * Rota para salvar evento no Google Calendar
 */
integrationsRouter.post('/google/calendar', async (req, res) => {
    const { tenantId, summary, description, startDateTime, endDateTime } = req.body;
    
    if (!tenantId || !summary || !startDateTime || !endDateTime) {
        return res.status(400).json({ error: 'Faltam parâmetros obrigatórios' });
    }

    try {
        const event = await googleCalendarService.addEvent(tenantId as string, {
            summary,
            description,
            startDateTime,
            endDateTime
        });
        res.json({ success: true, event });
    } catch (err: any) {
        console.error('[Google Calendar] Erro ao agendar evento:', err);
        res.status(500).json({ error: err.message });
    }
});

/**
 * Rota para iniciar fluxo Microsoft OAuth
 */
integrationsRouter.get('/microsoft/auth', (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    
    const url = getMicrosoftAuthUrl(tenantId as string);
    res.json({ url });
});

/**
 * Rota de Callback da Microsoft
 */
integrationsRouter.get('/microsoft/callback', async (req, res) => {
    const { code, state: tenantId } = req.query;
    
    if (!code || !tenantId) {
        return res.status(400).send('Code and tenantId are required');
    }

    try {
        await handleMicrosoftCallback(code as string, tenantId as string);
        res.send(`
            <script>
                window.opener.postMessage({ type: 'MICROSOFT_AUTH_SUCCESS' }, '*');
                window.close();
            </script>
        `);
    } catch (err: any) {
        console.error('[Microsoft OAuth] Erro no callback:', err);
        res.status(500).send('Erro na autenticação: ' + err.message);
    }
});

/**
 * Rota para assinar Webhook do NotificaMe
 */
integrationsRouter.post('/notificame/subscribe', async (req, res) => {
    const { token, channelId, webhookUrl } = req.body;

    if (!token || !channelId || !webhookUrl) {
        return res.status(400).json({ error: 'Parâmetros ausentes: token, channelId e webhookUrl são obrigatórios.' });
    }

    try {
        const result = await subscribeNotificaMeWebhook(token, channelId, webhookUrl);
        res.json({ success: true, data: result });
    } catch (err: any) {
        console.error('[Integrations] Erro ao assinar webhook NotificaMe:', err);
        res.status(500).json({ error: err.message });
    }
});

// --- META (Facebook/Instagram) ---
integrationsRouter.get('/meta/auth', (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const url = getMetaAuthUrl(tenantId as string);
    res.json({ url });
});

integrationsRouter.get('/meta/callback', async (req, res) => {
    const { code, state } = req.query;
    if (!code || !state) return res.status(400).send('Missing code or state');

    try {
        await handleMetaCallback(code as string, state as string);
        res.send(`
      <script>
        window.opener.postMessage({ type: 'META_AUTH_SUCCESS' }, '*');
        window.close();
      </script>
      <h1>Conectado com sucesso! Fechando janela...</h1>
    `);
    } catch (error) {
        console.error('Meta callback error:', error);
        res.status(500).send('Erro na autenticação com Meta.');
    }
});
// --- DROPBOX ---
integrationsRouter.get('/dropbox/auth', (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const url = getDropboxAuthUrl(tenantId as string);
    res.json({ url });
});

integrationsRouter.get('/dropbox/callback', async (req, res) => {
    const { code, state: tenantId } = req.query;
    if (!code || !tenantId) return res.status(400).send('Missing code or tenantId');

    try {
        await handleDropboxCallback(code as string, tenantId as string);
        res.send(`
      <script>
        window.opener.postMessage({ type: 'DROPBOX_AUTH_SUCCESS' }, '*');
        window.close();
      </script>
      <h1>Conectado com sucesso! Fechando janela...</h1>
    `);
    } catch (error) {
        console.error('Dropbox callback error:', error);
        res.status(500).send('Erro na autenticação com Dropbox.');
    }
});

// --- SLACK ---
integrationsRouter.get('/slack/auth', (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const url = getSlackAuthUrl(tenantId as string);
    res.json({ url });
});

integrationsRouter.get('/slack/callback', async (req, res) => {
    const { code, state: tenantId } = req.query;
    if (!code || !tenantId) return res.status(400).send('Missing code or tenantId');

    try {
        await handleSlackCallback(code as string, tenantId as string);
        res.send(`
      <script>
        window.opener.postMessage({ type: 'SLACK_AUTH_SUCCESS' }, '*');
        window.close();
      </script>
      <h1>Conectado com sucesso! Fechando janela...</h1>
    `);
    } catch (error) {
        console.error('Slack callback error:', error);
        res.status(500).send('Erro na autenticação com Slack.');
    }
});

// --- TRELLO ---
integrationsRouter.get('/trello/auth', (req, res) => {
    const { tenantId } = req.query;
    if (!tenantId) return res.status(400).json({ error: 'tenantId is required' });
    const url = getTrelloAuthUrl(tenantId as string);
    res.json({ url });
});

integrationsRouter.get('/trello/callback', async (req, res) => {
    // Trello pode retornar o token no fragmento ou query dependendo da config
    const { token, state: tenantId } = req.query;
    // Se vier via fragmento, o frontend precisará capturar e enviar para o backend
    // Aqui assumimos um fluxo onde o token chega ao servidor
    if (!token || !tenantId) return res.status(400).send('Missing token or tenantId');

    try {
        await handleTrelloToken(token as string, tenantId as string);
        res.send(`
      <script>
        window.opener.postMessage({ type: 'TRELLO_AUTH_SUCCESS' }, '*');
        window.close();
      </script>
      <h1>Conectado com sucesso! Fechando janela...</h1>
    `);
    } catch (error) {
        console.error('Trello callback error:', error);
        res.status(500).send('Erro na autenticação com Trello.');
    }
});
