/**
 * ============================================================
 * LEXHUB SAAS — THREAT DETECTOR (SISTEMA OCULTO DE DEFESA)
 * ============================================================
 */
import { createClient } from '@supabase/supabase-js';
// ============================================================
// HONEYPOT PATHS
// ============================================================
const HONEYPOT_PATHS = {
    '/.env': { decoy: '# Environment Config\nDATABASE_URL=\n', score: 100 },
    '/.env.local': { decoy: '# Local Config\n', score: 100 },
    '/.git/config': { decoy: '[core]\n\trepositoryformatversion = 0\n', score: 100 },
    '/config.php': { decoy: '<?php\n// Config\n', score: 100 },
    '/wp-config.php': { decoy: '<?php\n// WordPress\n', score: 100 },
    '/wp-login.php': { decoy: '<!DOCTYPE html><html><body><form>Login</form></body></html>', score: 80 },
    '/wp-admin': { decoy: '<!DOCTYPE html><html><body>Redirecting...</body></html>', score: 80 },
    '/admin/login': { decoy: '{"status":"ok","redirect":"/admin/dashboard"}', score: 80 },
    '/phpmyadmin': { decoy: '<!DOCTYPE html><html><body>phpMyAdmin</body></html>', score: 80 },
    '/adminer.php': { decoy: '<?php', score: 80 },
    '/api/keys': { decoy: '{"keys":[],"status":"empty"}', score: 90 },
    '/api/v1/users/export': { decoy: '{"data":[],"total":0}', score: 70 },
    '/api/admin/users': { decoy: '{"users":[],"page":1}', score: 70 },
    '/api/internal/config': { decoy: '{"config":{}}', score: 90 },
    '/api/debug': { decoy: '{"debug":false}', score: 60 },
    '/api/test/token': { decoy: '{"token":""}', score: 60 },
    '/etc/passwd': { decoy: 'root:x:0:0\n', score: 100 },
    '/actuator/health': { decoy: '{"status":"UP"}', score: 50 },
    '/actuator/env': { decoy: '{"profiles":[]}', score: 80 },
    '/graphql': { decoy: '{"errors":[{"message":"Not found"}]}', score: 40 },
    '/graphiql': { decoy: '<!DOCTYPE html><html></html>', score: 50 },
    '/shell.php': { decoy: '', score: 100 },
    '/cmd.php': { decoy: '', score: 100 },
    '/c99.php': { decoy: '', score: 100 },
    '/backdoor.php': { decoy: '', score: 100 },
    '/eval.php': { decoy: '', score: 100 },
};
// Padrões suspeitos no path
const SUSPICIOUS_PATH_PATTERNS = [
    /select\s+.*\s+from/i,
    /union\s+select/i,
    /drop\s+table/i,
    /<script/i,
    /javascript:/i,
    /\.\.\//,
    /etc\/passwd/i,
    /base64_decode/i,
    /eval\(/i,
];
// User-agents de ferramentas de ataque conhecidas
const MALICIOUS_UA_PATTERNS = [
    /sqlmap/i,
    /nikto/i,
    /nmap/i,
    /masscan/i,
    /zgrab/i,
    /acunetix/i,
    /nessus/i,
    /burpsuite/i,
    /dirbuster/i,
    /gobuster/i,
    /ffuf/i,
    /nuclei/i,
];
// ============================================================
// THREAT STORE
// ============================================================
const threatStore = new Map();
const BLOCK_DURATION_MS = 24 * 60 * 60 * 1000;
const SCORE_THRESHOLD = 100;
// Limpeza periódica a cada 30 min
setInterval(() => {
    const now = Date.now();
    for (const [ip, entry] of threatStore.entries()) {
        if (entry.blockedUntil && entry.blockedUntil < now) {
            threatStore.delete(ip);
        }
    }
}, 30 * 60 * 1000);
// ============================================================
// FUNÇÕES INTERNAS
// ============================================================
function getClientIP(req) {
    const forwarded = req.headers['x-forwarded-for'];
    if (typeof forwarded === 'string')
        return forwarded.split(',')[0]?.trim() ?? req.socket.remoteAddress ?? 'unknown';
    return req.socket.remoteAddress ?? 'unknown';
}
function addThreatScore(ip, score, event) {
    const now = Date.now();
    const existing = threatStore.get(ip) ?? {
        score: 0,
        firstSeen: now,
        lastSeen: now,
        events: [],
        requestCount: 0,
    };
    existing.score += score;
    existing.lastSeen = now;
    existing.requestCount += 1;
    existing.events.push(`[${new Date(now).toISOString()}] ${event} (+${score}pts)`);
    if (existing.events.length > 50) {
        existing.events = existing.events.slice(-50);
    }
    if (existing.score >= SCORE_THRESHOLD && existing.blockedUntil === undefined) {
        existing.blockedUntil = now + BLOCK_DURATION_MS;
        console.error(`🚫 [TRIPWIRE] IP BLOQUEADO AUTOMATICAMENTE: ${ip} | Score: ${existing.score}`);
    }
    threatStore.set(ip, existing);
    return existing;
}
async function persistAlert(alert) {
    try {
        const url = process.env['SUPABASE_URL'];
        const key = process.env['SUPABASE_SERVICE_ROLE_KEY'];
        if (!url || !key)
            return;
        const supabase = createClient(url, key);
        await supabase.from('threat_alerts').insert({
            ip: alert.ip,
            type: alert.type,
            severity: alert.severity,
            path: alert.path,
            user_agent: alert.userAgent ?? null,
            details: alert.details,
            created_at: new Date(alert.timestamp).toISOString(),
        });
    }
    catch {
        // Fail silently — log local já capturou o evento
    }
}
function checkMaliciousUA(req) {
    const ua = req.headers['user-agent'] ?? '';
    return MALICIOUS_UA_PATTERNS.some(p => p.test(ua)) ? 40 : 0;
}
function checkSuspiciousPath(path) {
    try {
        const decoded = decodeURIComponent(path);
        return SUSPICIOUS_PATH_PATTERNS.some(p => p.test(decoded)) ? 50 : 0;
    }
    catch {
        return 30; // URL malformada também é suspeita
    }
}
// ============================================================
// MIDDLEWARE 1: BLOQUEIO DE IPs NA BLACKLIST
// ============================================================
// IPs que nunca devem ser bloqueados (ambiente de desenvolvimento local)
const LOCAL_WHITELIST = new Set(['::1', '127.0.0.1', '::ffff:127.0.0.1', 'localhost']);
export function ipBlacklistGuard(req, res, next) {
    const ip = getClientIP(req);
    // Nunca bloquear IPs locais — isso evita que o polling do frontend seja penalizado em dev
    if (LOCAL_WHITELIST.has(ip)) {
        next();
        return;
    }
    const entry = threatStore.get(ip);
    if (entry?.blockedUntil !== undefined && entry.blockedUntil > Date.now()) {
        console.warn(`🚫 [BLACKLIST] ${ip} → ${req.method} ${req.path}`);
        res.status(403).json({ error: 'Acesso negado.', code: 'ACCESS_DENIED' });
        return;
    }
    // Verificar UA malicioso
    const uaScore = checkMaliciousUA(req);
    if (uaScore > 0) {
        const ua = req.headers['user-agent'];
        addThreatScore(ip, uaScore, `Scanner detectado: "${ua}"`);
        console.warn(`⚠️  [TRIPWIRE] Scanner: ${ip} | UA: ${ua} | Path: ${req.path}`);
        persistAlert({
            ip, type: 'MALICIOUS_BOT', severity: 'high', path: req.path,
            userAgent: ua, details: { user_agent: ua, method: req.method },
            timestamp: Date.now(),
        });
    }
    // Verificar path suspeito
    const pathScore = checkSuspiciousPath(req.path);
    if (pathScore > 0) {
        addThreatScore(ip, pathScore, `Path suspeito: ${req.path}`);
    }
    next();
}
// ============================================================
// MIDDLEWARE 2: HONEYPOT ROUTES
// ============================================================
export function registerHoneypotRoutes(app) {
    for (const [path, config] of Object.entries(HONEYPOT_PATHS)) {
        const handler = (req, res) => {
            const ip = getClientIP(req);
            const ua = req.headers['user-agent'];
            const entry = addThreatScore(ip, config.score, `Honeypot acessado: ${path}`);
            console.error(`🚨 [TRIPWIRE] HONEYPOT ATIVADO!\n` +
                `   IP: ${ip} | Path: ${path} | Method: ${req.method}\n` +
                `   UA: ${ua}\n` +
                `   Score: ${entry.score} | Bloqueado: ${entry.blockedUntil !== undefined ? 'SIM' : 'NÃO'}`);
            persistAlert({
                ip, type: 'HONEYPOT_ACCESS',
                severity: config.score >= 100 ? 'critical' : config.score >= 70 ? 'high' : 'medium',
                path, userAgent: ua,
                details: {
                    method: req.method,
                    honeypot_score: config.score,
                    total_score: entry.score,
                    blocked: entry.blockedUntil !== undefined,
                    request_count: entry.requestCount,
                },
                timestamp: Date.now(),
            });
            // Resposta "decoy" — o atacante não percebe que ativou o alarme
            setTimeout(() => {
                if (path.endsWith('.json')) {
                    res.setHeader('Content-Type', 'application/json');
                    res.status(200).send(config.decoy || '{}');
                }
                else if (path.endsWith('.php') || path.endsWith('.html')) {
                    res.setHeader('Content-Type', 'text/html');
                    res.status(200).send(config.decoy || '');
                }
                else {
                    res.status(404).send('Not Found');
                }
            }, 800);
        };
        app.get(path, handler);
        app.post(path, handler);
    }
    console.log(`✅ [TRIPWIRE] ${Object.keys(HONEYPOT_PATHS).length} honeypot routes ativas`);
}
// ============================================================
// MIDDLEWARE 3: DETECTOR DE ANOMALIAS
// ============================================================
export function anomalyDetector(req, res, next) {
    const ip = getClientIP(req);
    const originalSend = res.send.bind(res);
    res.send = function (body) {
        if (res.statusCode === 404) {
            const entry = addThreatScore(ip, 5, `404 em ${req.path}`);
            const count404 = entry.events.filter(e => e.includes('404')).length;
            if (count404 >= 10) {
                addThreatScore(ip, 15, `Scanner de paths (${count404} 404s)`);
                console.warn(`⚠️  [TRIPWIRE] Scanner de paths: ${ip} — ${count404} erros 404`);
            }
        }
        if (res.statusCode === 401) {
            addThreatScore(ip, 10, `Falha de auth em ${req.path}`);
        }
        return originalSend(body);
    };
    next();
}
// ============================================================
// UTILITÁRIOS EXPORTADOS
// ============================================================
export function reportThreat(ip, score, reason) {
    addThreatScore(ip, score, reason);
}
export function getThreatScore(ip) {
    return threatStore.get(ip);
}
export function getThreatReport() {
    return Array.from(threatStore.entries()).map(([ip, entry]) => ({ ip, entry }));
}
export function getBlockedIPs() {
    const now = Date.now();
    return Array.from(threatStore.entries())
        .filter(([, entry]) => (entry.blockedUntil ?? 0) > now)
        .map(([ip]) => ip);
}
export function unblockIP(ip) {
    const entry = threatStore.get(ip);
    if (!entry)
        return false;
    delete entry.blockedUntil;
    entry.score = 0;
    threatStore.set(ip, entry);
    return true;
}
//# sourceMappingURL=threatDetector.js.map