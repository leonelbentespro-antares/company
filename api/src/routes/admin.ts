import { Router } from 'express';
import type { Request, Response } from 'express';
import {
    getThreatReport,
    getBlockedIPs,
    unblockIP,
    getThreatScore,
} from '../middleware/threatDetector.js';

export const adminRouter = Router();

const INTERNAL_SECRET = process.env['INTERNAL_ADMIN_SECRET'];

const requireInternalAuth = (req: Request, res: Response, next: () => void) => {
    const secret = req.headers['x-internal-secret'];
    if (!INTERNAL_SECRET || secret !== INTERNAL_SECRET) {
        res.status(404).json({ error: 'Not Found' });
        return;
    }
    next();
};

adminRouter.use(requireInternalAuth);

adminRouter.get('/security/threats', (req: Request, res: Response) => {
    const report  = getThreatReport();
    const blocked = getBlockedIPs();
    res.json({
        total_monitored_ips: report.length,
        blocked_ips_count: blocked.length,
        blocked_ips: blocked,
        top_threats: report
            .sort((a, b) => b.entry.score - a.entry.score)
            .slice(0, 20)
            .map(({ ip, entry }) => ({
                ip,
                score: entry.score,
                blocked: entry.blockedUntil !== undefined,
                blocked_until: entry.blockedUntil !== undefined ? new Date(entry.blockedUntil).toISOString() : null,
                first_seen: new Date(entry.firstSeen).toISOString(),
                last_seen: new Date(entry.lastSeen).toISOString(),
                request_count: entry.requestCount,
                recent_events: entry.events.slice(-5),
            })),
    });
});

adminRouter.get('/security/ip/:ip', (req: Request, res: Response) => {
    const ip = String(req.params['ip'] ?? '');
    const entry = getThreatScore(ip);
    if (!entry) { res.json({ ip, status: 'clean', score: 0 }); return; }
    res.json({
        ip,
        score: entry.score,
        blocked: entry.blockedUntil !== undefined,
        blocked_until: entry.blockedUntil !== undefined ? new Date(entry.blockedUntil).toISOString() : null,
        first_seen: new Date(entry.firstSeen).toISOString(),
        request_count: entry.requestCount,
        events: entry.events,
    });
});

adminRouter.delete('/security/ip/:ip/block', (req: Request, res: Response) => {
    const ip = String(req.params['ip'] ?? '');
    const success = unblockIP(ip);
    if (success) {
        console.log(`[ADMIN] IP desbloqueado: ${ip}`);
        res.json({ success: true, message: `IP ${ip} desbloqueado.` });
    } else {
        res.status(404).json({ error: `IP ${ip} não encontrado na blacklist.` });
    }
});

adminRouter.get('/security/health', (_req: Request, res: Response) => {
    res.json({
        status: 'ok',
        threat_detection: 'active',
        honeypots: 'active',
        jwt_validation: 'active',
        hmac_validation: 'active',
        timestamp: new Date().toISOString(),
    });
});
