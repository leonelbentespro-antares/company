-- Migration: Adicionar campo de controle de carência para assinaturas atrasadas
-- LexHub SaaS - Stripe Integration

ALTER TABLE public.tenant_subscriptions 
ADD COLUMN IF NOT EXISTS past_due_since TIMESTAMPTZ;

-- Comentário para documentação
COMMENT ON COLUMN public.tenant_subscriptions.past_due_since IS 'Data em que a assinatura entrou no estado past_due pela primeira vez no ciclo atual';

-- Opcional: Garantir que os campos básicos existam se a tabela for nova
-- ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS stripe_subscription_id TEXT;
-- ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS stripe_customer_id TEXT;
-- ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS status TEXT;
-- ALTER TABLE public.tenant_subscriptions ADD COLUMN IF NOT EXISTS plan TEXT;
