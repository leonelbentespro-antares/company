import { Router } from 'express';
import { JusticeIntegrationService } from '../services/justiceIntegrationService.js';

const router = Router();

/**
 * Endpoint para sincronizar um processo específico com o Datajud
 * POST /api/justice/sync/:id
 */
router.post('/sync/:id', async (req: any, res) => {
    const { id } = req.params;
    const { cnjNumber } = req.body;
    const tenantId = req.tenantId || 'global';

    if (!cnjNumber) {
        return res.status(400).json({ error: 'Número do CNJ é obrigatório.' });
    }

    try {
        const result = await JusticeIntegrationService.syncProcessWithDatajud(tenantId, id, cnjNumber);
        res.json(JusticeIntegrationService.wrapResponse('ok', 200, result));
    } catch (error: any) {
        console.error('[Justice Route] Sync Error:', error);
        res.status(500).json(JusticeIntegrationService.wrapResponse('error', 500, null, [error.message]));
    }
});

/**
 * Consulta genérica ao Datajud (sem salvar vinculação)
 * POST /api/justice/consult
 */
router.post('/consult', async (req: any, res) => {
    const { cnjNumber, apiKey } = req.body;

    if (!cnjNumber || !apiKey) {
        return res.status(400).json({ error: 'CNJ e API Key são obrigatórios.' });
    }

    try {
        const data = await JusticeIntegrationService.consultDatajud(cnjNumber, apiKey);
        res.json(JusticeIntegrationService.wrapResponse('ok', 200, data));
    } catch (error: any) {
        res.status(500).json(JusticeIntegrationService.wrapResponse('error', 500, null, [error.message]));
    }
});

export { router as justiceRouter };
