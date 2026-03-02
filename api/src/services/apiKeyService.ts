import { supabaseAdmin } from '../config/supabase.js';
import crypto from 'crypto';

/**
 * Serviço para gerenciamento de chaves de API (Access Tokens)
 */

export interface ApiKey {
    id: string;
    tenant_id: string;
    name: string;
    key_preview: string;
    created_at: string;
    last_used_at?: string;
}

/**
 * Gera uma nova chave de API segura
 * Formato: lh_live_[32 chars random hex]
 */
export function generateSecureKey(): string {
    const randomBuffer = crypto.randomBytes(24);
    return `lh_live_${randomBuffer.toString('hex')}`;
}

/**
 * Gera um hash SHA-256 de uma chave
 */
export function hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
}

/**
 * Lista todas as chaves de um tenant
 */
export async function listApiKeys(tenantId: string): Promise<ApiKey[]> {
    const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('id, tenant_id, name, key_preview, created_at, last_used_at')
        .eq('tenant_id', tenantId)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
}

/**
 * Cria uma nova chave para o tenant
 */
export async function createApiKey(tenantId: string, name: string): Promise<{ id: string, rawKey: string }> {
    const rawKey = generateSecureKey();
    const keyHash = hashKey(rawKey);
    const keyPreview = `${rawKey.substring(0, 12)}...${rawKey.substring(rawKey.length - 4)}`;

    const { data, error } = await supabaseAdmin
        .from('api_keys')
        .insert([{
            tenant_id: tenantId,
            name,
            key_hash: keyHash,
            key_preview: keyPreview
        }])
        .select('id')
        .single();

    if (error) throw error;

    return {
        id: data.id,
        rawKey
    };
}

/**
 * Remove uma chave de API
 */
export async function deleteApiKey(id: string, tenantId: string): Promise<void> {
    const { error } = await supabaseAdmin
        .from('api_keys')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tenantId);

    if (error) throw error;
}

/**
 * Valida uma chave de API e retorna o tenant_id associado
 */
export async function validateApiKey(rawKey: string): Promise<string | null> {
    const keyHash = hashKey(rawKey);
    
    const { data, error } = await supabaseAdmin
        .from('api_keys')
        .select('tenant_id')
        .eq('key_hash', keyHash)
        .single();

    if (error || !data) return null;

    // Atualiza o last_used_at de forma assíncrona (fire and forget)
    supabaseAdmin
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('key_hash', keyHash)
        .then();

    return data.tenant_id;
}
