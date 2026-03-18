/**
 * ============================================================
 * LEXHUB SAAS — SOCKET.IO SERVER
 * Camada de Comunicação em Tempo Real (WebSocket)
 * Isolamento multi-tenant: cada tenant recebe apenas seus eventos
 * ============================================================
 */

import { Server as SocketIOServer } from 'socket.io';
import type { Server as HttpServer } from 'http';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase.js';

const connectedSockets = new Map<string, { tenantId: string, userId: string }>();

function getOnlineUsers(tenantId: string): string[] {
    const users = new Set<string>();
    for (const [_, data] of connectedSockets.entries()) {
        if (data.tenantId === tenantId && data.userId) {
            users.add(data.userId);
        }
    }
    return Array.from(users);
}

let io: SocketIOServer | null = null;

// ============================================================
// INICIALIZAÇÃO — Deve ser chamado no index.ts com o httpServer
// ============================================================

export function initSocketIO(httpServer: HttpServer): SocketIOServer {
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

    io.on('connection', async (socket) => {
        let tenantId = socket.handshake.auth['tenantId'] as string | undefined;
        const token = socket.handshake.auth['token'] as string | undefined;

        // Sempre tenta extrair o userId do token JWT (independente do tenantId já ter sido passado)
        if (token) {
            try {
                const decoded = jwt.decode(token) as any;
                
                if (decoded && decoded.sub) {
                    const userId = decoded.sub;
                    socket.data.userId = userId;

                    // Se tenantId não foi passado no handshake, resolvê-lo via banco
                    if (!tenantId || tenantId.trim() === '') {
                        const { data: tenantUsers } = await supabaseAdmin
                            .from('tenant_users')
                            .select('tenant_id')
                            .eq('user_id', userId)
                            .limit(1);
                        
                        if (tenantUsers && tenantUsers.length > 0) {
                            tenantId = (tenantUsers[0] as any).tenant_id;
                            console.log(`[Socket] Tenant resolvido para usuário ${userId}: ${tenantId}`);
                        } else {
                            console.warn(`[Socket] Nenhum tenant encontrado para o usuário ${userId}`);
                        }
                    } else {
                        console.log(`[Socket] UserId ${userId} extraído, tenantId já presente: ${tenantId}`);
                    }
                }
            } catch (err) {
                console.error('[Socket] Erro ao processar token no handshake:', err);
            }
        }

        if (!tenantId) {
            console.warn(`[Socket] Conexão sem tenantId. Socket: ${socket.id}`);
            socket.disconnect();
            return;
        }

        // Cada tenant entra em sua própria "sala" isolada
        void socket.join(`tenant:${tenantId}`);
        console.log(`[Socket] ✅ Tenant ${tenantId} conectado. Socket: ${socket.id}`);

        if (socket.data.userId) {
            connectedSockets.set(socket.id, { tenantId, userId: socket.data.userId });
            emitToTenant(tenantId, 'presence_update', getOnlineUsers(tenantId));
        }

        socket.on('get_presence', () => {
            socket.emit('presence_update', getOnlineUsers(tenantId!));
        });

        socket.on('disconnect', (reason) => {
            console.log(`[Socket] Tenant ${tenantId} desconectado. Razão: ${reason}`);
            if (socket.data.userId) {
                connectedSockets.delete(socket.id);
                emitToTenant(tenantId!, 'presence_update', getOnlineUsers(tenantId!));
            }
        });
    });

    console.log('🔌 [Socket.IO] Servidor WebSocket inicializado.');
    return io;
}

// ============================================================
// UTILITÁRIO — Emitir evento para todos os sockets de um tenant
// ============================================================

export function emitToTenant(tenantId: string, event: string, data: unknown): void {
    if (!io) {
        console.warn('[Socket] emitToTenant chamado antes de initSocketIO.');
        return;
    }
    const room = `tenant:${tenantId}`;
    const sockets = io.sockets.adapter.rooms.get(room);
    const count = sockets ? sockets.size : 0;
    
    console.log(`[Socket] Emitindo "${event}" para tenant ${tenantId} (Sala: ${room}, Sockets ativos: ${count})`);
    
    if (count === 0) {
        console.warn(`[Socket] AVISO: Nenhum socket ativo na sala ${room} para receber o evento "${event}"`);
    }

    io.to(room).emit(event, data);
}

export function getIO(): SocketIOServer | null {
    return io;
}
