import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
import { whatsappOutgoingQueue } from '../queues/whatsapp.js';
import { getAIResponse } from '../services/aiService.js';

export const whatsappWorker = new Worker(
    'whatsapp-incoming',
    async (job: Job) => {
        console.log(`[Worker] Processando Job ${job.id} de mensagem recebida...`);
        const payload = job.data;
        
        try {
            // Normalmente extrairíamos o body.entry[0].changes[0].value.messages[0] do payload Meta
            const entries = payload.entry || [];
            if (!entries.length) return;

            const changes = entries[0].changes;
            if (!changes || !changes.length) return;

            const value = changes[0].value;
            if (!value.messages || !value.messages.length) return;

            const messageObj = value.messages[0];
            const senderPhone = messageObj.from;
            const textBody = messageObj.text?.body || '';

            console.log(`[Worker] Mensagem de ${senderPhone}: "${textBody}"`);

            // Aqui consultaríamos o Supabase para pegar o Tenant, o Agente configurado e o histórico (RAG)
            const mockTenantContext = { agent_id: 'default' };
            
            // Requerindo resposta gerada do LLM
            console.log(`[Worker] Chamando LLM...`);
            const aiReply = await getAIResponse(textBody, mockTenantContext);

            // Uma vez processado pela IA de forma assíncrona, enfileiramos a RESPOSTA no webhook
            await whatsappOutgoingQueue.add('send-reply', {
                to: senderPhone,
                text: aiReply
            });

            console.log(`[Worker] Resposta calculada e enviada para a fila outgoing.`);
        } catch (error) {
            console.error(`[Worker] Falha ao processar job ${job.id}:`, error);
            throw error; // Re-joga o erro pro BullMQ aplicar retry ou mover pra Failed (Dead Letter)
        }
    },
    {
        connection: redisConnection,
        concurrency: 10, // Processa até 10 mensagens pesadas de LLM simultaneamente (Escalável!)
    }
);

// Worker de Envio (Drena a fila 'whatsapp-outgoing' para disparar pro Facebook Graph API)
export const whatsappSenderWorker = new Worker(
    'whatsapp-outgoing',
    async (job: Job) => {
        console.log(`[Sender Worker] Disparando resposta para o Meta API da mensagem do Job ${job.id}`);
        // Aqui você faria o POST pro Graph API usando Axios/Fetch com o Access Token
        // await axios.post('https://graph.facebook.com/v21.0/.../messages', { ... });
    },
    {
        connection: redisConnection,
        concurrency: 50, // O envio pra API do meta é rápido, pode ter alta concorrência
    }
);

console.log('👷 Workers iniciados esperando por mensagens nas filas...');
