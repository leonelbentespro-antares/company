import { supabaseAdmin } from '../../config/supabase.js';

/**
 * Faz o upload de um arquivo para o Supabase Storage
 * @param fileBuffer O buffer do arquivo a ser enviado
 * @param fileName O nome original do arquivo
 * @param tenantId O ID do cliente (para isolar os arquivos por pasta)
 * @param mimeType O tipo do arquivo (ex: image/jpeg)
 * @returns A URL pública do arquivo
 */
export async function uploadMediaToSupabase(
  fileBuffer: Buffer,
  fileName: string,
  tenantId: string,
  mimeType: string
): Promise<string> {
  const BUCKET_NAME = 'lexhub-storage';
  
  try {
    // 1. Garantir que o bucket existe (tenta criar se não existir)
    await supabaseAdmin.storage.createBucket(BUCKET_NAME, {
      public: true,
      fileSizeLimit: 52428800, // 50MB
    }).catch(() => {
        // Ignora erro se bucket já existir
    });

    const fileExtension = fileName.split('.').pop();
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}.${fileExtension}`;
    const filePath = `tenants/${tenantId}/media/${uniqueName}`;

    // 2. Upload do arquivo
    const { data, error } = await supabaseAdmin.storage
      .from(BUCKET_NAME)
      .upload(filePath, fileBuffer, {
        contentType: mimeType,
        upsert: true
      });

    if (error) throw error;

    // 3. Gerar URL pública
    const { data: { publicUrl } } = supabaseAdmin.storage
      .from(BUCKET_NAME)
      .getPublicUrl(filePath);

    console.log(`[Storage Supabase] Mídia salva: ${filePath} -> ${publicUrl}`);
    return publicUrl;
  } catch (error) {
    console.error('[Storage Supabase] Erro ao fazer upload:', error);
    throw new Error('Falha no upload do arquivo para o Supabase');
  }
}
