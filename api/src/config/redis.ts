import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// Conexão com o servidor Redis (Local ou AWS/Upstash)
// export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
//     maxRetriesPerRequest: 1,
//     retryStrategy(times) {
//         if (times > 1) return null; // Para de tentar após a primeira falha
//         return 1000;
//     },
// });

// Mock para evitar quebra de outros arquivos que importam redisConnection
// BullMQ precisa que o objeto tenha certos métodos e o status 'ready'
class RedisMock {
    status = 'ready';
    on() { return this; }
    once() { return this; }
    off() { return this; }
    quit() { return Promise.resolve(); }
    defineCommand() {}
    multi() { return { exec: () => Promise.resolve([]) }; }
    get() { return Promise.resolve(null); }
    set() { return Promise.resolve('OK'); }
    del() { return Promise.resolve(0); }
}

export const redisConnection = new RedisMock() as any;
