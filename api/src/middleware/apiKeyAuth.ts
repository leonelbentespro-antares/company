import type { Request, Response, NextFunction } from 'express';
import { validateApiKey } from '../services/apiKeyService.js';

/**
 * Middleware para autenticar requisições usando x-api-key
 * Injeta o tenantId no objeto request
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
    const apiKey = req.headers['x-api-key'] as string;

    if (!apiKey) {
        res.status(401).json({
            error: 'Chave de API ausente (header x-api-key).',
            code: 'MISSING_API_KEY'
        });
        return;
    }

    try {
        const tenantId = await validateApiKey(apiKey);

        if (!tenantId) {
            res.status(401).json({
                error: 'Chave de API inválida ou revogada.',
                code: 'INVALID_API_KEY'
            });
            return;
        }

        // Injeta o tenantId para que os controllers possam usá-lo
        req.tenantId = tenantId;
        next();
    } catch (err: any) {
        console.error('[apiKeyAuth] Erro ao validar chave:', err);
        res.status(500).json({
            error: 'Erro interno ao validar autenticação.',
            code: 'AUTH_ERROR'
        });
    }
}
