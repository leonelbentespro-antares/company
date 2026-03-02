// Mock das filas
export const documentGenerationQueue = { add: async () => ({}) } as any;

/*
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
*/
