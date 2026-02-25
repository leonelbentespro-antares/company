import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

// Fila para rodar integrações com LLM internamente (Ex: "Escrever Resumo de Processo", "Triagem de Documentos")
export const documentGenerationQueue = new Queue('document-generation', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 2, // IA pode falhar (Rate Limit/Timeout), então limitamos os retries
        backoff: {
            type: 'exponential',
            delay: 5000,
        },
    },
});
