-- Migration: Adicionar campos para armazenamento de documentos e configurar Bucket
-- LexHub SaaS - Process Document Storage

-- 1. Melhorar a tabela de documentos
ALTER TABLE public.process_documents 
ADD COLUMN IF NOT EXISTS tenant_id UUID REFERENCES public.tenants(id),
ADD COLUMN IF NOT EXISTS file_url TEXT,
ADD COLUMN IF NOT EXISTS file_size BIGINT,
ADD COLUMN IF NOT EXISTS file_type TEXT,
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- 2. Backfill do tenant_id para processos existentes (opcional, se já houver dados)
UPDATE public.process_documents pd
SET tenant_id = p.tenant_id
FROM public.processes p
WHERE pd.process_id = p.id
AND pd.tenant_id IS NULL;

-- 3. Habilitar RLS e Políticas
ALTER TABLE public.process_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can only see documents from their own tenant"
ON public.process_documents
FOR ALL
USING (tenant_id = (SELECT id FROM public.tenants WHERE id = tenant_id));

-- 4. Criar o Bucket no Storage (via SQL se permitido, ou para registro)
-- Nota: Supabase storage buckets são registros na tabela storage.buckets
INSERT INTO storage.buckets (id, name, public)
VALUES ('process-documents', 'process-documents', false)
ON CONFLICT (id) DO NOTHING;

-- 5. Políticas de Storage para isolamento de Tenant
-- Permite que usuários acessem apenas arquivos no path 'tenant_id/*'
CREATE POLICY "Tenant isolation for processing documents"
ON storage.objects
FOR ALL
TO authenticated
USING (bucket_id = 'process-documents' AND (storage.foldername(name))[1] = (SELECT id::text FROM public.tenants WHERE id = (SELECT tenant_id FROM public.users_profiles WHERE id = auth.uid())));
