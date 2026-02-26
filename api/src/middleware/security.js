/**
 * ============================================================
 * LEXHUB SAAS — API GATEWAY SECURITY MIDDLEWARE
 * Camada 2: Segurança do Backend (API Gateway)
 * ============================================================
 */
import helmet from 'helmet';
import cors from 'cors';
import { rateLimit } from 'express-rate-limit';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
// ============================================================
// 1. HELMET — Headers de Segurança HTTP
// ============================================================
export const configureHelmet = () => helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            connectSrc: ["'self'", `https://${process.env['SUPABASE_REF'] ?? ''}.supabase.co`],
            frameSrc: ["'none'"],
            objectSrc: ["'none'"],
            baseUri: ["'self'"],
            formAction: ["'self'"],
        },
    },
    hsts: {
        maxAge: 31_536_000,
        includeSubDomains: true,
        preload: true,
    },
    frameguard: { action: 'deny' },
    noSniff: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true,
});
// ============================================================
// 2. CORS — Whitelist de Origins Permitidas
// ============================================================
const ALLOWED_ORIGINS = (process.env['ALLOWED_ORIGINS'] ?? 'http://localhost:5173')
    .split(',')
    .map(o => o.trim());
export const configureCors = () => cors({
    origin: (origin, callback) => {
        if (!origin)
            return callback(null, true);
        if (ALLOWED_ORIGINS.includes(origin)) {
            callback(null, true);
        }
        else {
            console.warn(`[CORS] Origin bloqueada: ${origin}`);
            callback(new Error(`Origin não autorizada: ${origin}`));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Tenant-ID'],
    credentials: true,
    maxAge: 86400,
});
// ============================================================
// 3. RATE LIMITING — Proteção contra Força Bruta / DDoS
// ============================================================
export const configureRateLimit = () => rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        error: 'Muitas requisições. Tente novamente em 15 minutos.',
        code: 'RATE_LIMIT_EXCEEDED',
    },
    handler: (req, res) => {
        console.warn(`[RATE LIMIT] IP bloqueado: ${req.ip} — ${req.path}`);
        res.status(429).json({
            error: 'Muitas requisições. Tente novamente em 15 minutos.',
            code: 'RATE_LIMIT_EXCEEDED',
        });
    },
});
// Limitador mais agressivo para rotas de autenticação
export const authRateLimit = rateLimit({
    windowMs: 5 * 60 * 1000,
    max: 10,
    message: {
        error: 'Muitas tentativas de login. Tente novamente em 5 minutos.',
        code: 'AUTH_RATE_LIMIT_EXCEEDED',
    },
});
// ============================================================
// 4. VERIFICAÇÃO JWT DO SUPABASE
// ============================================================
const SUPABASE_JWT_SECRET = process.env['SUPABASE_JWT_SECRET'] ?? '';
if (!SUPABASE_JWT_SECRET) {
    console.error('❌ [SECURITY] SUPABASE_JWT_SECRET não configurado! A API está INSEGURA.');
}
export const verifySupabaseJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
        res.status(401).json({
            error: 'Token de autenticação ausente.',
            code: 'MISSING_AUTH_TOKEN',
        });
        return;
    }
    const token = authHeader.split(' ')[1] ?? '';
    try {
        const decoded = jwt.verify(token, SUPABASE_JWT_SECRET);
        req.userId = decoded['sub'] ?? undefined;
        req.userEmail = decoded['email'] ?? undefined;
        next();
    }
    catch (err) {
        const message = err instanceof Error ? err.message : 'Token inválido';
        console.warn(`[JWT] Token inválido de ${req.ip}: ${message}`);
        res.status(401).json({
            error: 'Token inválido ou expirado. Faça login novamente.',
            code: 'INVALID_AUTH_TOKEN',
        });
    }
};
// ============================================================
// 5. EXTRAÇÃO SEGURA DO TENANT_ID (nunca do body!)
// ============================================================
export const extractTenant = async (req, res, next) => {
    if (!req.userId) {
        res.status(401).json({ error: 'Usuário não autenticado.', code: 'NOT_AUTHENTICATED' });
        return;
    }
    try {
        const { createClient } = await import('@supabase/supabase-js');
        const supabase = createClient(process.env['SUPABASE_URL'] ?? '', process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '');
        const { data, error } = await supabase
            .from('tenant_users')
            .select('tenant_id')
            .eq('user_id', req.userId)
            .limit(1)
            .single();
        if (error || !data) {
            res.status(403).json({
                error: 'Usuário sem tenant associado. Contate o suporte.',
                code: 'NO_TENANT_FOUND',
            });
            return;
        }
        req.tenantId = data.tenant_id;
        next();
    }
    catch (err) {
        console.error('[extractTenant] Erro ao buscar tenant:', err);
        res.status(500).json({ error: 'Erro interno ao verificar acesso.', code: 'TENANT_ERROR' });
    }
};
// ============================================================
// 6. VALIDAÇÃO HMAC DO WEBHOOK META (X-Hub-Signature-256)
// ============================================================
export const verifyMetaHMAC = (req, res, next) => {
    const signature = req.headers['x-hub-signature-256'];
    const appSecret = process.env['META_APP_SECRET'];
    if (!appSecret) {
        console.error('[HMAC] META_APP_SECRET não configurado!');
        if (process.env['NODE_ENV'] === 'production') {
            res.status(500).json({ error: 'Configuração de segurança incompleta.' });
            return;
        }
        next();
        return;
    }
    if (!signature) {
        console.warn(`[HMAC] Webhook sem assinatura de ${req.ip}`);
        res.status(403).json({ error: 'Assinatura de segurança ausente.', code: 'MISSING_SIGNATURE' });
        return;
    }
    const rawBody = JSON.stringify(req.body);
    const expectedSignature = `sha256=${crypto
        .createHmac('sha256', appSecret)
        .update(rawBody)
        .digest('hex')}`;
    try {
        const sigBuffer = Buffer.from(signature);
        const expBuffer = Buffer.from(expectedSignature);
        const isValid = sigBuffer.length === expBuffer.length &&
            crypto.timingSafeEqual(sigBuffer, expBuffer);
        if (!isValid) {
            console.warn(`[HMAC] Assinatura inválida de ${req.ip}`);
            res.status(403).json({ error: 'Assinatura inválida.', code: 'INVALID_SIGNATURE' });
            return;
        }
    }
    catch {
        res.status(403).json({ error: 'Erro na validação de assinatura.', code: 'SIGNATURE_ERROR' });
        return;
    }
    next();
};
//# sourceMappingURL=security.js.map