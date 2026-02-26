import { Router } from 'express';
import { documentGenerationQueue } from '../queues/documents.js';
import { verifySupabaseJWT, extractTenant } from '../middleware/security.js';
export const aiRouter = Router();
// Autenticação em TODAS as rotas deste router
aiRouter.use(verifySupabaseJWT);
aiRouter.use(extractTenant);
const ALLOWED_DOC_TYPES = ['RESUMO_PROCESSO', 'PETICAO_INICIAL', 'CONTRATO', 'PARECER'];
aiRouter.post('/documents/generate', async (req, res) => {
    const tenantId = req.tenantId;
    const userId = req.userId;
    const { type, context } = req.body;
    if (!type || !ALLOWED_DOC_TYPES.includes(type)) {
        res.status(400).json({
            error: `Tipo inválido. Permitidos: ${ALLOWED_DOC_TYPES.join(', ')}`,
            code: 'INVALID_DOC_TYPE',
        });
        return;
    }
    if (context && JSON.stringify(context).length > 50_000) {
        res.status(400).json({ error: 'Contexto muito grande. Máximo 50KB.', code: 'PAYLOAD_TOO_LARGE' });
        return;
    }
    try {
        const job = await documentGenerationQueue.add('generate-doc', {
            tenantId, userId, type, context: context ?? {},
        });
        res.status(202).json({
            status: 'Processing',
            jobId: job.id,
            message: 'Documento enviado para a fila de IA.',
        });
    }
    catch (error) {
        console.error('[AI Router] Erro ao enfileirar:', error);
        res.status(500).json({ error: 'Erro interno.', code: 'QUEUE_ERROR' });
    }
});
aiRouter.get('/documents/status/:jobId', async (req, res) => {
    const jobId = String(req.params['jobId'] ?? '');
    try {
        const job = await documentGenerationQueue.getJob(jobId ?? '');
        if (!job) {
            res.status(404).json({ error: 'Job não encontrado.', code: 'JOB_NOT_FOUND' });
            return;
        }
        const state = await job.getState();
        res.json({ jobId, state, progress: job.progress });
    }
    catch {
        res.status(500).json({ error: 'Erro ao consultar job.', code: 'JOB_ERROR' });
    }
});
//# sourceMappingURL=ai.js.map