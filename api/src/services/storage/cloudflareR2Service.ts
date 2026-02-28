import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

// Configuração do cliente S3 apontando para a Cloudflare R2
// A API da Cloudflare R2 é 100% compatível com o padrão AWS S3
const r2Client = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.CLOUDFLARE_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY || '',
  },
});

const BUCKET_NAME = process.env.CLOUDFLARE_R2_BUCKET_NAME || 'lexhub-storage';

/**
 * Faz o upload de um arquivo para o Cloudflare R2
 * @param fileBuffer O buffer do arquivo a ser enviado
 * @param fileName O nome original do arquivo
 * @param tenantId O ID do cliente (para isolar os arquivos por pasta)
 * @param mimeType O tipo do arquivo (ex: application/pdf, image/jpeg)
 * @returns A URL pública ou caminho do arquivo salvo
 */
export async function uploadFileToR2(
  fileBuffer: Buffer,
  fileName: string,
  tenantId: string,
  mimeType: string
): Promise<string> {
  try {
    // Organiza os arquivos em pastas por Tenant (Cliente) para manter o multi-atendimento seguro
    const fileExtension = path.extname(fileName);
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1e9)}${fileExtension}`;
    const objectKey = `tenants/${tenantId}/${uniqueName}`;

    const command = new PutObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
      Body: fileBuffer,
      ContentType: mimeType,
    });

    await r2Client.send(command);
    console.log(`[Storage] Arquivo ${fileName} salvo com sucesso no R2 (Key: ${objectKey})`);

    return objectKey;
  } catch (error) {
    console.error('[Storage] Erro ao fazer upload para o Cloudflare R2:', error);
    throw new Error('Falha no upload do arquivo');
  }
}

/**
 * Gera uma URL temporária (Presigned URL) para download ou visualização segura do arquivo
 * @param objectKey O caminho do arquivo salvo no R2 (retornado no upload)
 * @param expiresIn Tempo em segundos para a URL expirar (padrão: 1 hora)
 */
export async function getSecureFileUrl(objectKey: string, expiresIn = 3600): Promise<string> {
  try {
    const command = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    const url = await getSignedUrl(r2Client, command, { expiresIn });
    return url;
  } catch (error) {
    console.error('[Storage] Erro ao gerar URL segura no Cloudflare R2:', error);
    throw new Error('Falha ao obter link do documento');
  }
}

/**
 * Deleta um arquivo do storage
 * @param objectKey O caminho do arquivo no R2
 */
export async function deleteFileFromR2(objectKey: string): Promise<boolean> {
  try {
    const command = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: objectKey,
    });

    await r2Client.send(command);
    console.log(`[Storage] Arquivo ${objectKey} deletado com sucesso do R2.`);
    return true;
  } catch (error) {
    console.error('[Storage] Erro ao deletar arquivo no Cloudflare R2:', error);
    return false;
  }
}
