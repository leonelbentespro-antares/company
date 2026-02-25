import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

// Fila de recebimento de mensagens
// Quando a Meta bate no nosso Webhook, nós apenas jogamos a mensagem aqui e retornamos HTTP 200 pro Facebook
export const whatsappIncomingQueue = new Queue('whatsapp-incoming', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 3,
        backoff: {
            type: 'exponential',
            delay: 1000,
        },
    },
});

// Fila de Envio (usada posteriormente pelo AI Worker)
export const whatsappOutgoingQueue = new Queue('whatsapp-outgoing', {
    connection: redisConnection,
    defaultJobOptions: {
        attempts: 5,
        backoff: {
            type: 'exponential',
            delay: 2000,
        },
    },
});
