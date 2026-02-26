/**
 * ============================================================
 * LEXHUB SAAS — API GATEWAY SECURITY MIDDLEWARE
 * Camada 2: Segurança do Backend (API Gateway)
 * ============================================================
 */
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
declare global {
    namespace Express {
        interface Request {
            tenantId?: string | undefined;
            userId?: string | undefined;
            userEmail?: string | undefined;
        }
    }
}
export declare const configureHelmet: () => any;
export declare const configureCors: () => (req: cors.CorsRequest, res: {
    statusCode?: number | undefined;
    setHeader(key: string, value: string): any;
    end(): any;
}, next: (err?: any) => any) => void;
export declare const configureRateLimit: () => import("express-rate-limit").RateLimitRequestHandler;
export declare const authRateLimit: import("express-rate-limit").RateLimitRequestHandler;
export declare const verifySupabaseJWT: (req: Request, res: Response, next: NextFunction) => void;
export declare const extractTenant: (req: Request, res: Response, next: NextFunction) => Promise<void>;
export declare const verifyMetaHMAC: (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=security.d.ts.map