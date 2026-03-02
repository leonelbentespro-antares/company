// Mock das filas para evitar conexão com Redis
export const whatsappIncomingQueue = { add: async () => ({}) } as any;
export const whatsappOutgoingQueue = { add: async () => ({}) } as any;

/*
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
*/
