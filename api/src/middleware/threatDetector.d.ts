/**
 * ============================================================
 * LEXHUB SAAS — THREAT DETECTOR (SISTEMA OCULTO DE DEFESA)
 * ============================================================
 */
import type { Request, Response, NextFunction } from 'express';
import type { Application } from 'express';
interface ThreatEntry {
    score: number;
    firstSeen: number;
    lastSeen: number;
    blockedUntil?: number;
    events: string[];
    requestCount: number;
}
export declare function ipBlacklistGuard(req: Request, res: Response, next: NextFunction): void;
export declare function registerHoneypotRoutes(app: Application): void;
export declare function anomalyDetector(req: Request, res: Response, next: NextFunction): void;
export declare function reportThreat(ip: string, score: number, reason: string): void;
export declare function getThreatScore(ip: string): ThreatEntry | undefined;
export declare function getThreatReport(): Array<{
    ip: string;
    entry: ThreatEntry;
}>;
export declare function getBlockedIPs(): string[];
export declare function unblockIP(ip: string): boolean;
export {};
//# sourceMappingURL=threatDetector.d.ts.map