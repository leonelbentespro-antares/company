/**
 * ============================================================
 * LEXHUB SAAS — SOCKET.IO SERVER
 * Camada de Comunicação em Tempo Real (WebSocket)
 * Isolamento multi-tenant: cada tenant recebe apenas seus eventos
 * ============================================================
 */
import { Server as SocketIOServer } from 'socket.io';
let io = null;
// ============================================================
// INICIALIZAÇÃO — Deve ser chamado no index.ts com o httpServer
// ============================================================
export function initSocketIO(httpServer) {
    const allowedOrigins = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173')
        .split(',')
        .map(o => o.trim());
    io = new SocketIOServer(httpServer, {
        cors: {
            origin: allowedOrigins,
            methods: ['GET', 'POST'],
            credentials: true,
        },
        // Permite tanto WebSocket quanto polling como fallback
        transports: ['websocket', 'polling'],
    });
    io.on('connection', (socket) => {
        const tenantId = socket.handshake.auth['tenantId'];
        if (!tenantId) {
            console.warn(`[Socket] Conexão sem tenantId. Socket: ${socket.id}`);
            socket.disconnect();
            return;
        }
        // Cada tenant entra em sua própria "sala" isolada
        void socket.join(`tenant:${tenantId}`);
        console.log(`[Socket] ✅ Tenant ${tenantId} conectado. Socket: ${socket.id}`);
        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Tenant ${tenantId} desconectado. Razão: ${reason}`);
        });
    });
    console.log('🔌 [Socket.IO] Servidor WebSocket inicializado.');
    return io;
}
// ============================================================
// UTILITÁRIO — Emitir evento para todos os sockets de um tenant
// ============================================================
export function emitToTenant(tenantId, event, data) {
    if (!io) {
        console.warn('[Socket] emitToTenant chamado antes de initSocketIO.');
        return;
    }
    io.to(`tenant:${tenantId}`).emit(event, data);
}
export function getIO() {
    return io;
}
//# sourceMappingURL=index.js.map