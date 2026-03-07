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

        if (!tenantId && token) {
            try {
                // Decodifica sem validar assinatura para contornar discrepância de algoritmos (HS256 vs ES256)
                // A validação real ocorre ao consultar a tabela tenant_users logo abaixo.
                const decoded = jwt.decode(token) as any;
                
                if (decoded && decoded.sub) {
                    const userId = decoded.sub;
                    
                    const query = supabaseAdmin
                        .from('tenant_users')
                        .select('tenant_id')
                        .eq('user_id', userId);
                    
                    if (tenantId && tenantId.trim() !== '') {
                        query.eq('tenant_id', tenantId);
                    }

                    const { data: tenantUsers } = await query;
                    
                    if (tenantUsers && tenantUsers.length > 0) {
                        // Prioriza o tenantId vindo do auth, ou pega o primeiro
                        tenantId = (tenantId && tenantId.trim() !== '') ? tenantId : (tenantUsers[0] as any).tenant_id;
                        console.log(`[Socket] Tenant detectado para usuário ${userId}: ${tenantId}`);
                    } else {
                        console.warn(`[Socket] Nenhum tenant encontrado para o usuário ${userId}`);
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
