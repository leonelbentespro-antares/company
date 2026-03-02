import { Router } from 'express';
import { verifySupabaseJWT, extractTenant } from '../middleware/security.js';
import { listApiKeys, createApiKey, deleteApiKey } from '../services/apiKeyService.js';

export const apiKeysRouter = Router();

// Todas as rotas de gerenciamento exigem autenticação do usuário
apiKeysRouter.use(verifySupabaseJWT);
apiKeysRouter.use(extractTenant);

/**
 * Lista todas as chaves do Tenant atual
 */
apiKeysRouter.get('/', async (req, res) => {
    try {
        const keys = await listApiKeys(req.tenantId!);
        res.json(keys);
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});

/**
 * Cria uma nova chave de API
 */
apiKeysRouter.post('/', async (req, res) => {
    const { name } = req.body;
    console.log(`[API_KEYS] Tentativa de criar chave: "${name}" para o tenant: ${req.tenantId}`);
    
    if (!name) {
        return res.status(400).json({ error: 'O nome da chave é obrigatório.' });
    }

    try {
        const result = await createApiKey(req.tenantId!, name);
        console.log(`[API_KEYS] Chave criada com sucesso para o tenant: ${req.tenantId}`);
        res.json(result);
    } catch (err: any) {
        console.error(`[API_KEYS] Erro ao criar chave:`, err);
        res.status(500).json({ error: err.message || 'Erro interno ao criar chave de API' });
    }
});

/**
 * Remove uma chave de API
 */
apiKeysRouter.delete('/:id', async (req, res) => {
    const { id } = req.params;

    try {
        await deleteApiKey(id, req.tenantId!);
        res.json({ success: true });
    } catch (err: any) {
        res.status(500).json({ error: err.message });
    }
});
