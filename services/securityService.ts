/**
 * ============================================================
 * LEXHUB SAAS - SECURITY SERVICE
 * Sistema de Segurança Multi-Camada - Camada Frontend
 * ============================================================
 * Proteções implementadas:
 * - Rate Limiting no cliente
 * - Sanitização XSS de inputs
 * - Validação de dados brasileiros (CPF, CNPJ, OAB, Email)
 * - Detecção de anomalias / padrões suspeitos
 * - Gerenciamento seguro de sessão
 * - Log de eventos de segurança
 * - Proteção contra clickjacking via checks
 * ============================================================
 */

import { supabase } from './supabaseClient';

// ============================================================
// TIPOS
// ============================================================

export interface SecurityEvent {
    type: 'rate_limit' | 'xss_attempt' | 'suspicious_input' | 'auth_error' | 'access_denied' | 'anomaly';
    severity: 'info' | 'warning' | 'critical';
    resource?: string;
    details: Record<string, unknown>;
    timestamp: number;
}

export interface RateLimitResult {
    allowed: boolean;
    attemptsRemaining?: number;
    retryAfterMs?: number;
    reason?: string;
}

export interface ValidationResult {
    valid: boolean;
    errors: string[];
}

// ============================================================
// RATE LIMITING NO CLIENTE (antes de chamar o servidor)
// ============================================================

class ClientRateLimiter {
    private buckets = new Map<string, { count: number; windowStart: number; blockedUntil?: number }>();
    private readonly MAX_ATTEMPTS = 5;
    private readonly WINDOW_MS = 30_000;   // 30 segundos
    private readonly BLOCK_MS = 300_000;   // 5 minutos

    check(key: string, maxAttempts = this.MAX_ATTEMPTS, windowMs = this.WINDOW_MS): RateLimitResult {
        const now = Date.now();
        const bucket = this.buckets.get(key);

        if (bucket?.blockedUntil && bucket.blockedUntil > now) {
            return {
                allowed: false,
                reason: 'rate_limited',
                retryAfterMs: bucket.blockedUntil - now,
            };
        }

        if (!bucket || bucket.windowStart + windowMs < now) {
            this.buckets.set(key, { count: 1, windowStart: now });
            return { allowed: true, attemptsRemaining: maxAttempts - 1 };
        }

        if (bucket.count >= maxAttempts) {
            bucket.blockedUntil = now + this.BLOCK_MS;
            this.buckets.set(key, bucket);
            SecurityService.logEvent({
                type: 'rate_limit',
                severity: 'warning',
                resource: key,
                details: { attempts: bucket.count, blockedUntilMs: bucket.blockedUntil },
                timestamp: now,
            });
            return { allowed: false, reason: 'rate_limited', retryAfterMs: this.BLOCK_MS };
        }

        bucket.count += 1;
        this.buckets.set(key, bucket);
        return { allowed: true, attemptsRemaining: maxAttempts - bucket.count };
    }

    reset(key: string): void {
        this.buckets.delete(key);
    }
}

// ============================================================
// SANITIZAÇÃO XSS
// ============================================================

const XSS_PATTERNS = [
    /<script[\s\S]*?>[\s\S]*?<\/script>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,        // onclick=, onload=, onmouseover=, etc.
    /<iframe[\s\S]*?>/gi,
    /<object[\s\S]*?>/gi,
    /<embed[\s\S]*?>/gi,
    /data:text\/html/gi,
    /vbscript:/gi,
    /<\s*svg[\s\S]*?on\w+/gi,
    /expression\s*\(/gi,  // CSS expression
];

const SQL_INJECTION_PATTERNS = [
    /('|--|;|\/\*|\*\/|xp_|sp_exec|exec\s*\(|union\s+select|drop\s+table|insert\s+into|delete\s+from|update\s+\w+\s+set)/gi,
];

function sanitizeString(input: string): string {
    if (typeof input !== 'string') return String(input);

    let sanitized = input
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');

    return sanitized;
}

function detectXSS(input: string): boolean {
    return XSS_PATTERNS.some(pattern => pattern.test(input));
}

function detectSQLInjection(input: string): boolean {
    return SQL_INJECTION_PATTERNS.some(pattern => pattern.test(input));
}

// ============================================================
// VALIDADORES BRASILEIROS
// ============================================================

function validateCPF(cpf: string): boolean {
    const cleaned = cpf.replace(/[^\d]/g, '');
    if (cleaned.length !== 11) return false;
    if (/^(\d)\1{10}$/.test(cleaned)) return false; // sequências repetidas

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += parseInt(cleaned[i]) * (10 - i);
    let remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    if (remainder !== parseInt(cleaned[9])) return false;

    sum = 0;
    for (let i = 0; i < 10; i++) sum += parseInt(cleaned[i]) * (11 - i);
    remainder = (sum * 10) % 11;
    if (remainder === 10 || remainder === 11) remainder = 0;
    return remainder === parseInt(cleaned[10]);
}

function validateCNPJ(cnpj: string): boolean {
    const cleaned = cnpj.replace(/[^\d]/g, '');
    if (cleaned.length !== 14) return false;
    if (/^(\d)\1{13}$/.test(cleaned)) return false;

    const calcDigit = (str: string, weights: number[]) => {
        const sum = str.split('').reduce((acc, d, i) => acc + parseInt(d) * weights[i], 0);
        const rem = sum % 11;
        return rem < 2 ? 0 : 11 - rem;
    };

    const d1 = calcDigit(cleaned.slice(0, 12), [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);
    const d2 = calcDigit(cleaned.slice(0, 13), [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]);

    return d1 === parseInt(cleaned[12]) && d2 === parseInt(cleaned[13]);
}

function validateOAB(oab: string): boolean {
    // Formato: UF + número, ex: SP123456, RJ98765
    return /^[A-Z]{2}\d{4,6}$/.test(oab.trim().toUpperCase());
}

function validateEmail(email: string): boolean {
    const emailRegex = /^[a-zA-Z0-9._%+\-]+@[a-zA-Z0-9.\-]+\.[a-zA-Z]{2,}$/;
    return emailRegex.test(email) && email.length <= 254;
}

function validatePhone(phone: string): boolean {
    const cleaned = phone.replace(/[^\d]/g, '');
    return cleaned.length >= 10 && cleaned.length <= 11;
}

// ============================================================
// ARMAZENAMENTO SEGURO NO CLIENTE
// ============================================================

class SecureStorage {
    private readonly PREFIX = 'lx_sec_';

    set(key: string, value: unknown): void {
        try {
            const payload = {
                v: JSON.stringify(value),
                t: Date.now(),
                h: this.simpleHash(JSON.stringify(value)),
            };
            sessionStorage.setItem(this.PREFIX + key, JSON.stringify(payload));
        } catch {
            // SessionStorage pode estar desabilitado
        }
    }

    get<T>(key: string, maxAgeMs = 3_600_000): T | null {
        try {
            const raw = sessionStorage.getItem(this.PREFIX + key);
            if (!raw) return null;

            const payload = JSON.parse(raw);
            if (Date.now() - payload.t > maxAgeMs) {
                this.remove(key);
                return null;
            }

            // Verificar integridade
            if (this.simpleHash(payload.v) !== payload.h) {
                this.remove(key);
                SecurityService.logEvent({
                    type: 'anomaly',
                    severity: 'critical',
                    resource: 'secure_storage',
                    details: { key, reason: 'tampering_detected' },
                    timestamp: Date.now(),
                });
                return null;
            }

            return JSON.parse(payload.v) as T;
        } catch {
            return null;
        }
    }

    remove(key: string): void {
        sessionStorage.removeItem(this.PREFIX + key);
    }

    private simpleHash(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return hash.toString(36);
    }
}

// ============================================================
// SERVIÇO PRINCIPAL DE SEGURANÇA
// ============================================================

const rateLimiter = new ClientRateLimiter();
const secureStorage = new SecureStorage();
const eventLog: SecurityEvent[] = [];

export const SecurityService = {
    rateLimiter,
    secureStorage,

    // ----------------------------------------------------------
    // 1. RATE LIMITING
    // ----------------------------------------------------------
    checkRateLimit(action: string, userId?: string): RateLimitResult {
        const key = userId ? `${action}:${userId}` : `${action}:anonymous`;
        return rateLimiter.check(key);
    },

    checkRateLimitServer: async (action: string): Promise<RateLimitResult> => {
        const { data: { user } } = await supabase.auth.getUser();
        const identifier = user?.id ?? 'anonymous';

        const { data, error } = await supabase.rpc('check_rate_limit', {
            p_identifier: identifier,
            p_action: action,
            p_max_attempts: 10,
            p_window_seconds: 60,
            p_block_seconds: 300,
        });

        if (error || !data) {
            return { allowed: true }; // Fail open para não bloquear usuários legítimos
        }

        return {
            allowed: (data as any).allowed,
            retryAfterMs: (data as any).retry_after_seconds ? (data as any).retry_after_seconds * 1000 : undefined,
            reason: (data as any).reason,
        };
    },

    // ----------------------------------------------------------
    // 2. SANITIZAÇÃO E VALIDAÇÃO
    // ----------------------------------------------------------
    sanitize(input: string): string {
        const hasXSS = detectXSS(input);
        const hasSQL = detectSQLInjection(input);

        if (hasXSS || hasSQL) {
            SecurityService.logEvent({
                type: hasXSS ? 'xss_attempt' : 'suspicious_input',
                severity: 'critical',
                details: { input: input.substring(0, 100), hasXSS, hasSQL },
                timestamp: Date.now(),
            });
        }

        return sanitizeString(input);
    },

    sanitizeObject<T extends Record<string, unknown>>(obj: T): T {
        const result: Record<string, unknown> = {};
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'string') {
                result[key] = SecurityService.sanitize(value);
            } else if (typeof value === 'object' && value !== null) {
                result[key] = SecurityService.sanitizeObject(value as Record<string, unknown>);
            } else {
                result[key] = value;
            }
        }
        return result as T;
    },

    validateEmail(email: string): ValidationResult {
        const errors: string[] = [];
        if (!email) errors.push('E-mail é obrigatório');
        else if (!validateEmail(email)) errors.push('E-mail inválido');
        return { valid: errors.length === 0, errors };
    },

    validateCPF(cpf: string): ValidationResult {
        const errors: string[] = [];
        if (!cpf) errors.push('CPF é obrigatório');
        else if (!validateCPF(cpf)) errors.push('CPF inválido');
        return { valid: errors.length === 0, errors };
    },

    validateCNPJ(cnpj: string): ValidationResult {
        const errors: string[] = [];
        if (!cnpj) errors.push('CNPJ é obrigatório');
        else if (!validateCNPJ(cnpj)) errors.push('CNPJ inválido');
        return { valid: errors.length === 0, errors };
    },

    validateOAB(oab: string): ValidationResult {
        const errors: string[] = [];
        if (!oab) errors.push('OAB é obrigatório');
        else if (!validateOAB(oab)) errors.push('OAB inválido (formato: UF + número, ex: SP123456)');
        return { valid: errors.length === 0, errors };
    },

    validatePhone(phone: string): ValidationResult {
        const errors: string[] = [];
        if (!phone) errors.push('Telefone é obrigatório');
        else if (!validatePhone(phone)) errors.push('Telefone inválido');
        return { valid: errors.length === 0, errors };
    },

    validatePassword(password: string): ValidationResult {
        const errors: string[] = [];
        if (!password) errors.push('Senha é obrigatória');
        else {
            if (password.length < 8) errors.push('Mínimo de 8 caracteres');
            if (!/[A-Z]/.test(password)) errors.push('Pelo menos uma letra maiúscula');
            if (!/[a-z]/.test(password)) errors.push('Pelo menos uma letra minúscula');
            if (!/\d/.test(password)) errors.push('Pelo menos um número');
            if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) errors.push('Pelo menos um caractere especial');
        }
        return { valid: errors.length === 0, errors };
    },

    isStrongText(text: string, minLength = 3): ValidationResult {
        const errors: string[] = [];
        if (!text || text.trim().length < minLength) {
            errors.push(`Mínimo de ${minLength} caracteres`);
        }
        if (detectXSS(text)) {
            errors.push('Conteúdo com caracteres não permitidos');
        }
        return { valid: errors.length === 0, errors };
    },

    // ----------------------------------------------------------
    // 3. LOG DE EVENTOS DE SEGURANÇA
    // ----------------------------------------------------------
    logEvent(event: SecurityEvent): void {
        eventLog.push(event);
        // Manter apenas os últimos 100 eventos no cliente
        if (eventLog.length > 100) eventLog.shift();

        if (event.severity === 'critical') {
            console.warn('[SECURITY CRITICAL]', event);
            // Enviar para o banco de forma assíncrona
            SecurityService.reportEventToServer(event).catch(() => { });
        }
    },

    getRecentEvents(count = 20): SecurityEvent[] {
        return [...eventLog].reverse().slice(0, count);
    },

    reportEventToServer: async (event: SecurityEvent): Promise<void> => {
        try {
            await supabase.rpc('log_security_event', {
                p_event_type: event.type,
                p_severity: event.severity,
                p_resource: event.resource ?? null,
                p_action: null,
                p_details: event.details,
            });
        } catch {
            // Fail silently — log local já foi feito
        }
    },

    // ----------------------------------------------------------
    // 4. DETECÇÃO DE ANOMALIAS
    // ----------------------------------------------------------
    detectAnomaly(action: string, context: Record<string, unknown> = {}): boolean {
        const recentEvents = eventLog.filter(
            e => Date.now() - e.timestamp < 60_000 // últimos 60s
        );

        const suspiciousCount = recentEvents.filter(
            e => e.severity === 'warning' || e.severity === 'critical'
        ).length;

        if (suspiciousCount >= 5) {
            SecurityService.logEvent({
                type: 'anomaly',
                severity: 'critical',
                resource: action,
                details: { suspiciousCount, context, recentEvents: recentEvents.length },
                timestamp: Date.now(),
            });
            return true;
        }

        return false;
    },

    // ----------------------------------------------------------
    // 5. VERIFICAÇÕES DE SEGURANÇA DO AMBIENTE
    // ----------------------------------------------------------
    checkEnvironment(): { secure: boolean; warnings: string[] } {
        const warnings: string[] = [];

        // Verificar HTTPS (em produção)
        if (window.location.protocol !== 'https:' && window.location.hostname !== 'localhost') {
            warnings.push('Conexão não está usando HTTPS');
        }

        // Verificar se está em iframe (clickjacking)
        if (window.self !== window.top) {
            warnings.push('Aplicação está sendo executada dentro de um iframe');
            SecurityService.logEvent({
                type: 'anomaly',
                severity: 'critical',
                resource: 'environment',
                details: { reason: 'iframe_detected' },
                timestamp: Date.now(),
            });
        }

        // Verificar se DevTools está aberto (heurística básica)
        const threshold = 160;
        if (window.outerWidth - window.innerWidth > threshold || window.outerHeight - window.innerHeight > threshold) {
            warnings.push('DevTools pode estar aberto — atenção ao não expor dados sensíveis');
        }

        return { secure: warnings.length === 0, warnings };
    },

    // ----------------------------------------------------------
    // 6. PROTEÇÃO DE DADOS NA MEMÓRIA
    // ----------------------------------------------------------
    maskSensitiveData(data: string, visibleChars = 4): string {
        if (!data || data.length <= visibleChars) return '****';
        return '****' + data.slice(-visibleChars);
    },

    maskToken(token: string): string {
        return SecurityService.maskSensitiveData(token, 8);
    },

    maskEmail(email: string): string {
        const [local, domain] = email.split('@');
        if (!domain) return '****';
        const masked = local.length > 2 ? local[0] + '***' + local[local.length - 1] : '***';
        return `${masked}@${domain}`;
    },
};

export default SecurityService;
