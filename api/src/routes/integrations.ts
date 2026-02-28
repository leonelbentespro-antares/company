
import { Router } from 'express';
import { subscribeNotificaMeWebhook } from '../services/notificaMeService.js';

export const integrationsRouter = Router();

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
