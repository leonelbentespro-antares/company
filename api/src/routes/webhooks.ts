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

// Webhook para a uazapiGO V2
// Suporta eventos: messages, connection, messages_update, etc.
webhookRouter.post('/uazapi', async (req: Request, res: Response) => {
    const body = req.body;
    const event = body.event || 'unknown';
    const instance = body.instance || body.instanceName || 'unknown';

    console.log(`📥 [uazapiGO V2] Evento "${event}" da instância "${instance}"`);

    // Eventos de connection podem ser tratados inline para atualizar status
    if (event === 'connection') {
        const status = body.data?.status || body.status;
        console.log(`📡 [uazapiGO V2] Status de conexão: ${status} (instância: ${instance})`);
        // Os eventos de connection são processados mas não precisam de fila
        // O serviço de sessão será atualizado via Socket.IO
    }

    try {
        // Enfileira o payload completo para processamento assíncrono
        await whatsappIncomingQueue.add('process-uazapi-event', body);
    } catch (error) {
        console.error('[Webhook uazapiGO V2] Erro ao enfileirar evento:', error);
    }
    
    // uazapiGO V2 requer retorno 200 rápido
    res.status(200).send('OK');
});

/**
 * Webhook para o NotificaMe Hub
 * Suporta recebimento de mensagens
 */
webhookRouter.post('/notificame', async (req: Request, res: Response) => {
    const body = req.body;
    console.log('📥 [NotificaMe Hub] Evento recebido:', JSON.stringify(body).substring(0, 200));

    try {
        // Enfileira para processamento assíncrono
        await whatsappIncomingQueue.add('process-notificame-event', body);
    } catch (error) {
        console.error('[Webhook NotificaMe] Erro ao enfileirar evento:', error);
    }

    res.status(200).send('OK');
});
