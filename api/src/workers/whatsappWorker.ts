import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';
import { getAIResponse } from '../services/aiService.js';
import { sendTextMessage, sessions } from '../services/whatsappService.js';
import { sendNotificaMeText } from '../services/notificaMeService.js';
import { supabaseAdmin as supabase } from '../config/supabase.js';

export const whatsappWorker = new Worker(
    'whatsapp-incoming',
    async (job: Job) => {
        console.log(`[Worker] Processando Job ${job.id} - ${job.name}`);
        const payload = job.data;
        
        try {
            let senderPhone = '';
            let textBody = '';
            let tenantId = '';

            // Payload da uazapiGO V2
            if (job.name === 'process-uazapi-event') {
                const event = payload.event;
                
                // Ignorar eventos que não são mensagens
                if (event !== 'messages') {
                    console.log(`[Worker] Evento ignorado: ${event}`);
                    return;
                }

                // uazapiGO V2 - Schema Message:
                //   chatid, sender, text, fromMe, isGroup, messageType, senderName
                const msg = payload.data || payload;
                
                // Ignorar mensagens enviadas por nós ou de grupos
                if (msg.fromMe) {
                    console.log('[Worker] Ignorando mensagem fromMe.');
                    return;
                }
                if (msg.isGroup) {
                    console.log('[Worker] Ignorando mensagem de grupo.');
                    return;
                }

                // V2: sender é o JID (ex: 5511999999999@s.whatsapp.net)
                senderPhone = msg.sender || msg.chatid || '';
                textBody = msg.text || msg.message?.conversation || '';
                
                // Identificar o tenant pela instância que enviou o webhook
                // O campo pode vir como "instance" no payload root do webhook
                tenantId = payload.instance || payload.instanceName || '';

            } else if (job.name === 'process-notificame-event') {
                // NotificaMe Hub Schema:
                // { from: 'channel_id', to: 'customer_number', contents: [{ type: 'text', text: 'message' }], ... }
                // No webhook de RECEBIMENTO é invertido ou tem um objeto 'message'
                
                // Baseado na pesquisa, o webhook de recebimento costuma ter o evento, canal e a mensagem
                const msg = payload.message || payload;
                senderPhone = payload.from || msg.from || '';
                
                const content = msg.contents?.[0];
                if (content?.type === 'text') {
                    textBody = content.text || '';
                }

                // Para NotificaMe, precisamos descobrir o tenantId pelo channelId
                // O channelId vem em payload.message.channel ou similar
                const channelId = payload.channel || msg.channel || payload.from;
                
                if (channelId) {
                    const { data: integration } = await supabase
                        .from('integrations')
                        .select('tenant_id')
                        .eq('provider', 'notificame')
                        .filter('settings->channelId', 'eq', channelId)
                        .single();
                    
                    if (integration) {
                        tenantId = integration.tenant_id;
                    }
                }
            } else {
                // Formato Meta Original (Cloud API)
                const entries = payload.entry || [];
                if (!entries.length) return;

                const changes = entries[0].changes;
                if (!changes || !changes.length) return;

                const value = changes[0].value;
                if (!value.messages || !value.messages.length) return;

                const messageObj = value.messages[0];
                senderPhone = messageObj.from;
                textBody = messageObj.text?.body || '';
            }

            if (!textBody) return;

            console.log(`[Worker] Mensagem de ${senderPhone}: "${textBody}"`);

            // RAG e LLM
            const aiContext = { tenantId, agent_id: 'default' };
            console.log(`[Worker] Chamando LLM para o tenant ${tenantId}...`);
            const aiReply = await getAIResponse(textBody, aiContext);

            // Enfileira a RESPOSTA para envio
            let jobName = 'send-reply-meta';
            if (job.name === 'process-uazapi-event') jobName = 'send-reply-uazapi';
            if (job.name === 'process-notificame-event') jobName = 'send-reply-notificame';

            await whatsappOutgoingQueue.add(
                jobName,
                {
                    to: senderPhone,
                    text: aiReply,
                    tenantId
                }
            );

            console.log(`[Worker] Resposta calculada e enviada para a fila outgoing.`);
        } catch (error) {
            console.error(`[Worker] Falha ao processar job ${job.id}:`, error);
            throw error; 
        }
    },
    {
        connection: redisConnection,
        concurrency: 10,
    }
);

// Worker de Envio (Drena a fila 'whatsapp-outgoing')
export const whatsappSenderWorker = new Worker(
    'whatsapp-outgoing',
    async (job: Job) => {
        console.log(`[Sender Worker] Disparando resposta para o Job ${job.id}`);
        const payload = job.data;

        if (job.name === 'send-reply-uazapi') {
            // Envio REAL via uazapiGO V2: POST /send/text
            const session = sessions.get(payload.tenantId);
            if (!session?.token) {
                console.error(`[UAZAPI Envio] Sessão não encontrada para tenant: ${payload.tenantId}`);
                throw new Error(`Sessão não encontrada para tenant: ${payload.tenantId}`);
            }

            try {
                // Limpar o JID para formato número puro (remover @s.whatsapp.net se presente)
                const number = payload.to.replace(/@s\.whatsapp\.net$/i, '').replace(/@lid$/i, '');

                const result = await sendTextMessage(session.token, number, payload.text);
                console.log(`[UAZAPI Envio] ✅ Mensagem enviada para ${number}:`, result.response?.status || 'ok');
            } catch (err) {
                console.error(`[UAZAPI Envio] ❌ Falha ao enviar para ${payload.to}:`, err);
                throw err;
            }
        } else if (job.name === 'send-reply-notificame') {
            // Envio via NotificaMe Hub
            try {
                // Buscar configurações do NotificaMe para o tenant
                const { data: integration } = await supabase
                    .from('integrations')
                    .select('settings')
                    .eq('tenant_id', payload.tenantId)
                    .eq('provider', 'notificame')
                    .single();
                
                if (!integration?.settings?.token || !integration?.settings?.channelId) {
                    throw new Error(`Configurações NotificaMe não encontradas para tenant: ${payload.tenantId}`);
                }

                const result = await sendNotificaMeText(
                    integration.settings.token,
                    integration.settings.channelId,
                    payload.to,
                    payload.text
                );
                console.log(`[NotificaMe Envio] ✅ Mensagem enviada para ${payload.to}:`, result.id || 'ok');
            } catch (err) {
                console.error(`[NotificaMe Envio] ❌ Falha ao enviar para ${payload.to}:`, err);
                throw err;
            }
        } else {
            // Meta API Original (Cloud API)
            // TODO: Implementar envio via Meta Graph API
            console.log(`[Meta Envio] Para: ${payload.to}, Texto: "${payload.text}"`);
        }
    },
    {
        connection: redisConnection,
        concurrency: 50,
    }
);

console.log('👷 Workers V2 iniciados esperando por mensagens nas filas...');
