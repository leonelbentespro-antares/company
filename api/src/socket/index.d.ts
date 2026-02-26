/**
 * ============================================================
 * LEXHUB SAAS — SOCKET.IO SERVER
 * Camada de Comunicação em Tempo Real (WebSocket)
 * Isolamento multi-tenant: cada tenant recebe apenas seus eventos
 * ============================================================
 */
import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
export declare function initSocketIO(httpServer: HttpServer): SocketIOServer;
export declare function emitToTenant(tenantId: string, event: string, data: unknown): void;
export declare function getIO(): SocketIOServer | null;
//# sourceMappingURL=index.d.ts.map