import type { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../config/supabase.js';

/**
 * Middleware para controle de acesso baseado em assinatura (LexHub SaaS)
 * Regras:
 * - Status 'active' or 'trialing': Acesso total.
 * - Status 'past_due': 3 dias de carência a partir de 'past_due_since'.
 * - Outros status ('unpaid', 'canceled', etc): Acesso bloqueado.
 */
export async function subscriptionGuard(req: Request, res: Response, next: NextFunction): Promise<void> {
    const tenantId = req.tenantId;

    if (!tenantId) {
        // Se não houver tenantId, o authMiddleware falhou ou não foi aplicado
        console.warn(`[SubscriptionGuard] Bloqueio preventivo: tenantId ausente para a rota ${req.path}`);
        res.status(401).json({ error: 'Tenant não identificado. Autenticação necessária.', code: 'UNAUTHORIZED' });
        return;
    }

    try {
        const { data: subscription, error } = await supabaseAdmin
            .from('tenant_subscriptions')
            .select('status, past_due_since')
            .eq('tenant_id', tenantId)
            .single();

        if (error || !subscription) {
            // Sem assinatura ativa = bloquear (pode ser redirecionado para página de planos)
            res.status(403).json({ 
                error: 'Assinatura necessária para acessar este recurso.', 
                code: 'SUBSCRIPTION_REQUIRED',
                details: 'Nenhuma assinatura encontrada para este escritório.'
            });
            return;
        }

        const { status, past_due_since } = subscription;

        // 1. Acesso liberado para status saudáveis
        if (status === 'active' || status === 'trialing') {
            return next();
        }

        // 2. Acesso em modo "Atrasado" (Dunning) com 3 dias de carência
        if (status === 'past_due') {
            if (!past_due_since) {
                // Se por algum motivo não tivermos a data, permitimos mas avisamos no log
                console.warn(`[SubscriptionGuard] Tenant ${tenantId} em status past_due sem data de início registrada.`);
                return next();
            }

            const pastDueDate = new Date(past_due_since);
            const now = new Date();
            const diffInDays = (now.getTime() - pastDueDate.getTime()) / (1000 * 3600 * 24);

            if (diffInDays <= 3) {
                console.log(`[SubscriptionGuard] Tenant ${tenantId} em atraso há ${diffInDays.toFixed(1)} dias. Acesso permitido (carência de 3 dias).`);
                return next();
            }

            res.status(403).json({
                error: 'Acesso bloqueado por falta de pagamento.',
                code: 'PAYMENT_REQUIRED',
                details: 'Sua assinatura está atrasada há mais de 3 dias. Atualize seus dados de pagamento para continuar.'
            });
            return;
        }

        // 3. Bloqueio total para outros estados (canceled, unpaid, incomplete)
        console.warn(`[SubscriptionGuard] Acesso bloqueado para tenant ${tenantId}. Status: ${status}`);
        res.status(403).json({
            error: 'Assinatura inválida ou cancelada.',
            code: 'SUBSCRIPTION_INVALID',
            details: `O status atual da sua assinatura é: ${status}.`
        });

    } catch (err) {
        console.error('[SubscriptionGuard] Erro crítico:', err);
        // Em caso de erro técnico no guard, permitimos o acesso para não derrubar o SaaS por falha no billing
        // mas registramos o erro.
        next();
    }
}
