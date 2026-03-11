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
             const status = getVal(body.instance || body.data || body, 'status') || (event === 'messages' ? 'connected' : undefined);
             const phone = getVal(body.instance || body.data || body, 'phone') || getVal(body.data?.instance || {}, 'phone');
             
             if (status) {
                 console.log(`📡 [uazapiGO V2] Atualizando status forçado via webhook: ${status} (instância: ${instance}, phone: ${phone || 'N/A'})`);
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

/**
 * Webhook para o Supabase (Tabela workspace_invites)
 * Disparado quando um novo convite é inserido.
 */
webhookRouter.post('/supabase/invites', async (req: Request, res: Response) => {
    console.log('[Webhook Supabase] Recebido:', JSON.stringify(req.body));
    const { record, type } = req.body;

    // Apenas processamos inserções
    if (type !== 'INSERT') {
        console.log('[Webhook Supabase] Ignorando tipo de evento:', type);
        return res.status(200).send('Event ignored');
    }

    if (!record) {
        console.error('[Webhook Supabase] Payload inválido: "record" ausente.');
        return res.status(400).send('Invalid payload');
    }

    const { email, tenant_id, role } = record;

    if (!email || !tenant_id) {
        console.warn('[Webhook Supabase] Dados insuficientes no registro:', record);
        return res.status(400).send('Missing email or tenant_id');
    }

    try {
        console.log(`[Webhook Supabase] Processando convite para ${email} (Tenant: ${tenant_id})`);
        const { emailService } = await import('../services/emailService.js');
        const { supabaseAdmin } = await import('../config/supabase.js');

        // 1. Buscar nome do Escritório (Tenant)
        const { data: tenant, error: tenantError } = await supabaseAdmin
            .from('tenants')
            .select('name')
            .eq('id', tenant_id)
            .single();

        if (tenantError) {
            console.error('[Webhook Supabase] Erro ao buscar tenant:', tenantError);
        }

        const tenantName = tenant?.name || 'LexHub Workspace';
        const baseUrl = process.env.VITE_APP_URL || 'https://lexhub.company';

        console.log(`[Webhook Supabase] Preparando email para ${email} em nome de ${tenantName}`);

        // 2. Enviar Email
        const { data, error } = await emailService.sendEmail({
            from: 'LexHub <noreply@lexhub.company>',
            to: email,
            subject: `Você foi convidado para o time ${tenantName} no LexHub`,
            html: `
                <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #eee; rounded: 10px;">
                    <h2 style="color: #1e293b;">Olá! 👋</h2>
                    <p style="font-size: 16px; color: #475569;">
                        Você foi convidado para se juntar ao escritório <strong>${tenantName}</strong> no LexHub como <strong>${role === 'admin' ? 'Administrador' : 'Colaborador'}</strong>.
                    </p>
                    <p style="font-size: 16px; color: #475569;">
                        Para aceitar o convite e começar a trabalhar, clique no botão abaixo para criar sua conta ou fazer login:
                    </p>
                    <div style="text-align: center; margin: 30px 0;">
                        <a href="${baseUrl}/auth" style="background-color: #0f172a; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                            Acessar LexHub
                        </a>
                    </div>
                    <hr style="border: 0; border-top: 1px solid #eee;" />
                    <p style="font-size: 12px; color: #94a3b8;">
                        Se você não esperava este convite, pode ignorar este email.
                    </p>
                </div>
            `
        });

        if (error) {
            console.error('[Webhook Supabase] Erro ao enviar email:', error);
            return res.status(500).json({ error: 'Email failed', details: error });
        }

        console.log(`✅ Convite enviado com sucesso para: ${email}. ID Resend:`, data);
        res.status(200).send('Invite sent');
    } catch (err) {
        console.error('[Webhook Supabase] Erro crítico:', err);
        res.status(500).send('Internal error');
    }
});
