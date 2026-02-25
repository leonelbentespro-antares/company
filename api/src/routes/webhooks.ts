import { Router } from 'express';
import type { Request, Response } from 'express';
import { whatsappIncomingQueue } from '../queues/whatsapp.js';
import { verifyMetaHMAC } from '../middleware/security.js';
import { reportThreat } from '../middleware/threatDetector.js';

export const webhookRouter = Router();

webhookRouter.get('/meta', (req: Request, res: Response) => {
    const mode      = req.query['hub.mode'];
    const token     = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (mode === 'subscribe' && token === process.env['META_VERIFY_TOKEN']) {
        console.log('✅ Webhook verificado pela Meta');
        res.status(200).send(challenge);
    } else {
        console.warn(`[Webhook] Verificação falhou — token incorreto de ${req.ip}`);
        reportThreat(req.ip ?? 'unknown', 15, 'Token inválido na verificação de webhook');
        res.sendStatus(403);
    }
});

webhookRouter.post('/meta', verifyMetaHMAC, async (req: Request, res: Response) => {
    const body = req.body as { object?: string };

    if (body.object === 'whatsapp_business_account') {
        try {
            await whatsappIncomingQueue.add('process-incoming-message', req.body);
            console.log('📥 Mensagem Meta recebida e enfileirada.');
        } catch (error) {
            console.error('[Webhook] Erro ao enfileirar:', error);
        }
    }

    res.status(200).send('EVENT_RECEIVED');
});
