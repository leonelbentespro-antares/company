import { Redis } from 'ioredis';
import dotenv from 'dotenv';
dotenv.config();

// Conexão com o servidor Redis (Local ou AWS/Upstash)
export const redisConnection = new Redis(process.env.REDIS_URL || 'redis://localhost:6379', {
    maxRetriesPerRequest: null, // Necessário para o BullMQ funcionar corretamente
});

redisConnection.on('error', (err) => {
    console.error('Redis Connection Error:', err);
});

redisConnection.on('ready', () => {
    console.log('✅ Redis Connected');
});
