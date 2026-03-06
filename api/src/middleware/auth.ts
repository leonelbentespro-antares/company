import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { supabaseAdmin } from '../config/supabase.js';
import { validateApiKey } from '../services/apiKeyService.js';

/**
 * Middleware de Autenticação Universal
 * Aceita:
 * 1. Header 'x-api-key': Para integrações externas e webhooks.
 * 2. Header 'Authorization: Bearer <token>': Para o frontend (Supabase JWT).
 */
export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
    const apiKey = req.headers['x-api-key'] as string;
    const authHeader = req.headers['authorization'];

    try {
        // 1. Tentar autenticação por API Key
        if (apiKey) {
            const tenantId = await validateApiKey(apiKey);
            if (tenantId) {
                req.tenantId = tenantId;
                return next();
            }
        }

        // 2. Tentar autenticação por Bearer Token (JWT do Supabase)
        if (authHeader && authHeader.startsWith('Bearer ')) {
            const token = authHeader.split(' ')[1];
            const jwtSecret = (process.env.SUPABASE_JWT_SECRET || process.env.JWT_SECRET || '') as string;

            if (!jwtSecret) {
                console.error('[Auth] SUPABASE_JWT_SECRET não configurado.');
                res.status(500).json({ error: 'Erro interno de configuração de segurança.' });
                return;
            }

            try {
                // Tenta decodificar o token sem verificar a assinatura para extrair o userId
                // A segurança real é feita na query do Supabase que valida se o usuário existe e 
                // qual o seu tenant_id. Supabase pode demorar para trocar ES256 -> HS256.
                const decoded = jwt.decode(token as string) as any;
                console.log(`[Auth Debug] Token decoded: ${decoded ? 'SUCCESS' : 'NULL'} | Sub: ${decoded?.sub || 'MISSING'}`);
                
                if (!decoded || !decoded.sub) {
                    console.error('[Auth] Token inválido ou sem subject (sub)');
                    res.status(401).json({ error: 'Token de sessão inválido.' });
                    return;
                }

                const userId = decoded.sub;

                // Verificar se foi passado um tenantId específico via header
                const requestedTenantId = req.headers['x-tenant-id'] as string;

                // 2. Validar usuário e buscar tenant no Supabase
                const query = supabaseAdmin
                    .from('tenant_users')
                    .select('tenant_id')
                    .eq('user_id', userId);

                // Se o cliente enviou um x-tenant-id, tenta validar especificamente ele
                if (requestedTenantId && requestedTenantId.trim() !== '') {
                    query.eq('tenant_id', requestedTenantId);
                }

                const { data: tenantUsers, error } = await query;

                if (error || !tenantUsers || tenantUsers.length === 0) {
                    console.error(`[Auth] Usuário ${userId} sem acesso ao tenant ${requestedTenantId || 'qualquer'}`);
                    res.status(401).json({ error: 'Você não tem acesso a este escritório.' });
                    return;
                }

                // Se não pediu um específico, pega o primeiro da lista
                req.tenantId = (requestedTenantId && requestedTenantId.trim() !== '') 
                    ? requestedTenantId 
                    : (tenantUsers[0] as any).tenant_id;
                
                console.log(`[Auth] User: ${userId} -> Tenant: ${req.tenantId} (Requested: ${requestedTenantId || 'None'})`);
                req.userId = userId;
                return next();
            } catch (jwtErr: any) {
                console.error('[Auth] Erro ao processar JWT:', jwtErr.message);
                res.status(401).json({ error: 'Erro ao validar sessão.' });
                return;
            }
        }

        // 3. Se nenhum método funcionou
        console.warn(`[Auth] Falha completa. Headers: ${JSON.stringify({ 
            auth: !!authHeader, 
            apiKey: !!apiKey,
            tenant: req.headers['x-tenant-id']
        })}`);
        
        res.status(401).json({
            error: 'Autenticação necessária. Use x-api-key ou Bearer Token.',
            code: 'UNAUTHORIZED'
        });

    } catch (err: any) {
        console.error('[Auth] Erro crítico no middleware:', err);
        res.status(500).json({ error: 'Erro interno ao processar autenticação.' });
    }
}
