import { Router } from 'express';
import { apiKeyAuth } from '../middleware/apiKeyAuth.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';

export const messagesRouter = Router();

/**
 * Endpoint para envio de mensagens via API Key (Uso Externo)
 * POST /api/messages/send
 */
messagesRouter.post('/send', apiKeyAuth, async (req, res) => {
    const { to, text } = req.body;

    if (!to || !text) {
        return res.status(400).json({ 
            error: 'Campos obrigatórios ausentes: "to" e "text".',
            code: 'MISSING_FIELDS'
        });
    }

    try {
        const tenantId = req.tenantId!;
        
        // Adiciona à fila de saída do WhatsApp
        // O Job Name 'send-reply-uazapi' serve para mensagens simples também
        await whatsappOutgoingQueue.add(
            'send-reply-uazapi',
            {
                to,
                text,
                tenantId
            }
        );

        console.log(`[Messages Router] Mensagem enfileirada para o tenant: ${tenantId}`);

        res.json({
            success: true,
            message: 'Mensagem enviada para processamento.',
            tenantId
        });
    } catch (err: any) {
        console.error('[Messages Router] Erro ao processar envio:', err);
        res.status(500).json({ 
            error: 'Erro interno ao processar mensagem.',
            code: 'INTERNAL_ERROR'
        });
    }
});
