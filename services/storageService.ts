/**
 * ============================================================
 * LEXHUB SAAS — STORAGE SERVICE
 * Upload e gerenciamento de documentos completamente isolados por tenant.
 *
 * Estrutura de pastas no Supabase Storage:
 *   tenant-documents/
 *     {tenantId}/
 *       processes/
 *         {processId}/
 *           {filename}
 *       general/
 *         {filename}
 *
 * Cada escritório só consegue acessar sua propria pasta — garantido por RLS.
 * ============================================================
 */

import { supabase } from './supabaseClient';

const BUCKET = 'tenant-documents';

export interface UploadResult {
    path: string;
    publicUrl: string | null;
    size: number;
    contentType: string;
}

export interface StorageFile {
    name: string;
    path: string;
    size: number;
    updatedAt: string;
    signedUrl?: string;
}

// ============================================================
// UPLOAD DE DOCUMENTO
// ============================================================

/**
 * Faz upload de um arquivo para a pasta exclusiva do tenant
 * O caminho fica: {tenantId}/processes/{processId}/{filename}
 */
export async function uploadProcessDocument(
    tenantId: string,
    processId: string,
    file: File
): Promise<UploadResult> {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${tenantId}/processes/${processId}/${timestamp}_${safeFileName}`;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
            contentType: file.type,
        });

    if (error) throw new Error(`Erro no upload: ${error.message}`);

    return {
        path: data.path,
        publicUrl: null, // Bucket privado — usar URLs assinadas
        size: file.size,
        contentType: file.type,
    };
}

/**
 * Faz upload de um documento geral do escritório
 * O caminho fica: {tenantId}/general/{filename}
 */
export async function uploadGeneralDocument(
    tenantId: string,
    file: File
): Promise<UploadResult> {
    const safeFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const timestamp = Date.now();
    const filePath = `${tenantId}/general/${timestamp}_${safeFileName}`;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .upload(filePath, file, {
            cacheControl: '3600',
            upsert: false,
        });

    if (error) throw new Error(`Erro no upload: ${error.message}`);

    return {
        path: data.path,
        publicUrl: null,
        size: file.size,
        contentType: file.type,
    };
}

// ============================================================
// LISTAGEM DE ARQUIVOS
// ============================================================

/**
 * Lista todos os documentos de um processo específico
 */
export async function listProcessDocuments(
    tenantId: string,
    processId: string
): Promise<StorageFile[]> {
    const folderPath = `${tenantId}/processes/${processId}`;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(folderPath, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) throw new Error(`Erro ao listar arquivos: ${error.message}`);

    return (data || [])
        .filter(f => f.name !== '.keep')
        .map(f => ({
            name: f.name.replace(/^\d+_/, ''), // Remove prefixo de timestamp
            path: `${folderPath}/${f.name}`,
            size: f.metadata?.size ?? 0,
            updatedAt: f.updated_at ?? new Date().toISOString(),
        }));
}

/**
 * Lista todos os documentos gerais do escritório
 */
export async function listGeneralDocuments(tenantId: string): Promise<StorageFile[]> {
    const folderPath = `${tenantId}/general`;

    const { data, error } = await supabase.storage
        .from(BUCKET)
        .list(folderPath, { sortBy: { column: 'created_at', order: 'desc' } });

    if (error) {
        if (error.message.includes('Not Found')) return [];
        throw new Error(`Erro ao listar arquivos: ${error.message}`);
    }

    return (data || [])
        .filter(f => f.name !== '.keep')
        .map(f => ({
            name: f.name.replace(/^\d+_/, ''),
            path: `${folderPath}/${f.name}`,
            size: f.metadata?.size ?? 0,
            updatedAt: f.updated_at ?? new Date().toISOString(),
        }));
}

// ============================================================
// DOWNLOAD / URL ASSINADA
// ============================================================

/**
 * Gera uma URL assinada e temporária para download seguro
 * Expira em 1 hora por padrão
 */
export async function getSignedUrl(filePath: string, expiresInSeconds = 3600): Promise<string> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(filePath, expiresInSeconds);

    if (error) throw new Error(`Erro ao gerar URL: ${error.message}`);
    return data.signedUrl;
}

/**
 * Gera múltiplas URLs assinadas de uma vez
 */
export async function getSignedUrls(
    paths: string[],
    expiresInSeconds = 3600
): Promise<Record<string, string>> {
    const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrls(paths, expiresInSeconds);

    if (error) throw new Error(`Erro ao gerar URLs: ${error.message}`);

    const result: Record<string, string> = {};
    (data || []).forEach(item => {
        if (item.signedUrl) {
            result[item.path] = item.signedUrl;
        }
    });
    return result;
}

// ============================================================
// EXCLUSÃO
// ============================================================

/**
 * Deleta um arquivo do storage (somente arquivos do próprio tenant — garantido por RLS)
 */
export async function deleteDocument(filePath: string): Promise<void> {
    const { error } = await supabase.storage.from(BUCKET).remove([filePath]);
    if (error) throw new Error(`Erro ao deletar arquivo: ${error.message}`);
}

// ============================================================
// UTILITÁRIOS
// ============================================================

export function formatFileSize(bytes: number): string {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function getFileIcon(fileName: string): string {
    const ext = fileName.split('.').pop()?.toLowerCase() ?? '';
    const icons: Record<string, string> = {
        pdf: '📄', doc: '📝', docx: '📝', xls: '📊', xlsx: '📊',
        jpg: '🖼️', jpeg: '🖼️', png: '🖼️', webp: '🖼️',
        txt: '📃', zip: '📦', rar: '📦',
    };
    return icons[ext] ?? '📁';
}

export function isAllowedFileType(file: File): boolean {
    const allowed = [
        'application/pdf',
        'image/jpeg', 'image/png', 'image/webp',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
    ];
    return allowed.includes(file.type);
}

export const MAX_FILE_SIZE_MB = 50;
export const MAX_FILE_SIZE_BYTES = MAX_FILE_SIZE_MB * 1024 * 1024;

export default {
    uploadProcessDocument,
    uploadGeneralDocument,
    listProcessDocuments,
    listGeneralDocuments,
    getSignedUrl,
    getSignedUrls,
    deleteDocument,
    formatFileSize,
    getFileIcon,
    isAllowedFileType,
};
