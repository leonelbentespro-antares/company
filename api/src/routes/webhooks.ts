import { Router } from 'express';
import type { Request, Response } from 'express';
import { verifyMetaHMAC } from '../middleware/security.js';
import { reportThreat } from '../middleware/threatDetector.js';
import { processIncomingMessage } from '../services/messageProcessor.js';
import { handleConnectionEvent } from '../services/whatsappService.js';

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
            await processIncomingMessage(req.body, 'meta');
            console.log('📥 Mensagem Meta recebida e processada.');
        } catch (error) {
            console.error('[Webhook] Erro ao processar:', error);
        }
    }

    res.status(200).send('EVENT_RECEIVED');
});

// Webhook para a uazapiGO V2
// Suporta eventos: messages, connection, messages_update, etc.
webhookRouter.post(['/uazapi', '/uazapi/:event'], async (req: Request, res: Response) => {
    const body = req.body;
    
    // Função auxiliar para pegar valor independente de case
    const getVal = (obj: any, key: string) => {
        if (!obj) return undefined;
        const foundKey = Object.keys(obj).find(k => k.toLowerCase() === key.toLowerCase());
        return foundKey ? obj[foundKey] : undefined;
    };

    const eventType = getVal(body, 'EventType') || getVal(body, 'type');
    const eventObj = getVal(body, 'event');
    const instanceName = getVal(body, 'instanceName') || getVal(body, 'instance');
    const eventUrl = req.params.event;

    const event = eventType || (typeof eventObj === 'string' ? eventObj : null) || eventUrl || 'unknown';
    const instance = (typeof instanceName === 'object' ? (instanceName.name || instanceName.id) : instanceName) || 'unknown';

    console.log(`📥 [uazapiGO V2] Evento "${event}" da instância "${instance}" (Raw: ${eventType})`);

    // Se recebermos mensagem ou qualquer evento de uma instância, e ela estiver como offline, podemos forçar o status para connected
    if (instance !== 'unknown' && event !== 'unknown') {
        // Se recebermos uma mensagem, garantimos que o status está ok
        if (event === 'messages' || event === 'connection') {
             const status = getVal(body.data || body, 'status') || (event === 'messages' ? 'connected' : undefined);
             const phone = getVal(body.data || body, 'phone');
             
             if (status) {
                 console.log(`📡 [uazapiGO V2] Atualizando status forçado via webhook: ${status} (instância: ${instance})`);
                 await handleConnectionEvent(instance, status, phone);
             }
        }
    }

    if (event === 'connection') {
        return res.status(200).send('OK');
    }    

    try {
        // Enfileira o payload completo para processamento síncrono
        await processIncomingMessage(body, 'uazapi');
    } catch (error) {
        console.error('[Webhook uazapiGO V2] Erro ao processar evento:', error);
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
        // Enfileira para processamento síncrono
        await processIncomingMessage(body, 'notificame');
    } catch (error) {
        console.error('[Webhook NotificaMe] Erro ao processar evento:', error);
    }

    res.status(200).send('OK');
});
