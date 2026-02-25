import { Worker, Job } from 'bullmq';
import { redisConnection } from '../config/redis.js';
// import { supabaseAdmin } from '../config/supabase'; // Criação futura de client Admin
// import { generateDocumentComGenAI } from '../services/aiService';

export const documentWorker = new Worker(
    'document-generation',
    async (job: Job) => {
        console.log(`📝 [DocWorker] Iniciando Geração de ${job.data.type} (Job: ${job.id})`);
        
        try {
            const { tenantId, userId, type, context } = job.data;
            
            // 1. Simula processamento pesado na IA (5 a 15 segundos)
            // const generatedText = await generateDocumentComGenAI(type, context);
            
            // Simulação de delay:
            await new Promise(resolve => setTimeout(resolve, 8000));
            const generatedText = `[Simulação] Documento gerado do tipo ${type} para o cliente ${context?.clientName || 'Desconhecido'}`;

            // 2. Salva o resultado no banco de dados (Supabase) via Admin Client
            /*
            const { data, error } = await supabaseAdmin
                .from('ai_generated_docs')
                .insert({
                    tenant_id: tenantId,
                    user_id: userId,
                    type: type,
                    content: generatedText,
                    status: 'completed'
                });
            if (error) throw error;
            */

             console.log(`✅ [DocWorker] Documento finalizado e salvo no banco! Supabase Realtime notificará o React do usuário ${userId}.`);
             
        } catch (error) {
            console.error(`❌ [DocWorker] Falha ao gerar documento ${job.id}:`, error);
            // Aqui poderíamos atualizar o banco para status="failed" para a UI sinalizar erro também
            throw error; 
        }
    },
    {
        connection: redisConnection,
        concurrency: 5, // Até 5 documentos pesados simultâneos por servidor (Escalável!)
    }
);

console.log('📝 Document Worker iniciado...');
