/**
 * ============================================================
 * LEXHUB SAAS — TENANT CONTEXT
 * Contexto global que isola os dados de cada escritório/assinante
 *
 * Como funciona:
 * - Ao fazer login, carrega o tenant_id do usuário autenticado
 * - Disponibiliza tenantId para TODOS os componentes via hook useTenant()
 * - Nenhum componente acessa dados sem saber qual tenant está ativo
 * ============================================================
 */

import React, { createContext, useContext, useEffect, useState, useCallback, ReactNode } from 'react';
import { supabase } from './supabaseClient';
import { User, UserRole } from '../types.ts';

// ============================================================
// TIPOS
// ============================================================

export interface TenantInfo {
    id: string;
    name: string;
    domain: string;
    plan: 'Starter' | 'Professional' | 'Enterprise';
    status: 'Active' | 'Suspended' | 'Pending';
}

export interface TenantSubscription {
    id: string;
    plan: string;
    status: 'active' | 'trialing' | 'past_due' | 'canceled' | 'paused';
    trialEndsAt: string | null;
    currentPeriodEnd: string | null;
}

interface TenantContextValue {
    tenantId: string | null;
    tenant: TenantInfo | null;
    subscription: TenantSubscription | null;
    user: User | null;
    isAuthenticated: boolean;
    loading: boolean;
    error: string | null;
    refresh: () => Promise<void>;
    isTrialing: boolean;
    trialDaysLeft: number;
}

// ============================================================
// CONTEXTO
// ============================================================

const TenantContext = createContext<TenantContextValue>({
    tenantId: null,
    tenant: null,
    subscription: null,
    user: null,
    isAuthenticated: false,
    loading: true,
    error: null,
    refresh: async () => { },
    isTrialing: false,
    trialDaysLeft: 0,
});

// ============================================================
// PROVIDER — envolve o App inteiro
// ============================================================

export const TenantProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [tenantId, setTenantId] = useState<string | null>(null);
    const [tenant, setTenant] = useState<TenantInfo | null>(null);
    const [subscription, setSubscription] = useState<TenantSubscription | null>(null);
    const [user, setUser] = useState<User | null>(null);
    const [isAuthenticated, setIsAuthenticated] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const loadTenant = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

            if (authError || !authUser) {
                setTenantId(null);
                setTenant(null);
                setSubscription(null);
                setUser(null);
                setIsAuthenticated(false);
                setLoading(false);
                return;
            }

            // 1. Buscar Perfil do Usuário
            const { data: profileData, error: profileError } = await supabase
                .from('profiles')
                .select('*')
                .eq('auth_user_id', authUser.id)
                .single();

            if (profileData) {
                setUser({
                    id: profileData.id,
                    registrationId: profileData.registration_id,
                    name: profileData.name,
                    email: profileData.email,
                    role: profileData.role as UserRole,
                    cpfCnpj: profileData.cpf_cnpj,
                    avatar: profileData.avatar_url,
                    oab: profileData.oab,
                    phone: profileData.phone
                });
                setIsAuthenticated(true);
            }

            // 2. Buscar o tenant_id do usuário autenticado
            const { data: tuData, error: tuError } = await supabase
                .from('tenant_users')
                .select('tenant_id, role')
                .eq('user_id', authUser.id)
                .limit(1)
                .single();

            if (tuError || !tuData) {
                // Usuário sem tenant (pode ter sido criado antes do trigger)
                // Tentar criar automaticamente
                await attemptTenantProvision(authUser);
                setLoading(false);
                return;
            }

            const tid = tuData.tenant_id;
            setTenantId(tid);

            // Buscar dados completos do tenant em paralelo
            const [tenantResult, subscriptionResult] = await Promise.all([
                supabase.from('tenants').select('*').eq('id', tid).single(),
                supabase.from('tenant_subscriptions').select('*').eq('tenant_id', tid).single(),
            ]);

            if (tenantResult.data) {
                setTenant({
                    id: tenantResult.data.id,
                    name: tenantResult.data.name,
                    domain: tenantResult.data.domain,
                    plan: tenantResult.data.plan,
                    status: tenantResult.data.status,
                });
            }

            if (subscriptionResult.data) {
                setSubscription({
                    id: subscriptionResult.data.id,
                    plan: subscriptionResult.data.plan,
                    status: subscriptionResult.data.status,
                    trialEndsAt: subscriptionResult.data.trial_ends_at,
                    currentPeriodEnd: subscriptionResult.data.current_period_end,
                });
            }
        } catch (err) {
            setError('Erro ao carregar dados do escritório.');
            console.error('[TenantContext] loadTenant error:', err);
        } finally {
            setLoading(false);
        }
    }, []);

    // Tentar provisionar tenant manualmente (fallback para usuários antigos)
    const attemptTenantProvision = async (user: any) => {
        try {
            const userName = user.user_metadata?.full_name ?? user.email.split('@')[0];
            const domain = user.email.split('@')[1];

            // Criar tenant
            const { data: newTenant, error: tenantError } = await supabase
                .from('tenants')
                .insert({
                    name: `${userName}'s Office`,
                    domain: `${domain}_${user.id.slice(0, 8)}`,
                    plan: 'Starter',
                    status: 'Active',
                    crm_stage: 'c4901030-f28e-4d59-9802-3a887057d723'
                })
                .select()
                .single();

            if (tenantError || !newTenant) {
                console.error('[TenantContext] Falha ao criar Tenant (Auto-Provision):', tenantError);
                setError(`Erro Supabase Auto-Provision (tenants): ${tenantError?.message || tenantError?.details || JSON.stringify(tenantError)}`);
                return;
            }

            // Vincular usuário ao tenant
            const { error: linkError } = await supabase.from('tenant_users').insert({
                user_id: user.id,
                tenant_id: newTenant.id,
                role: 'admin',
            });
            if (linkError) {
                setError(`Erro Supabase Auto-Provision (tenant_users): ${linkError.message || JSON.stringify(linkError)}`);
                return;
            }

            // Criar assinatura trial
            await supabase.from('tenant_subscriptions').insert({
                tenant_id: newTenant.id,
                plan: 'Starter',
                status: 'trialing',
                trial_ends_at: new Date(Date.now() + 14 * 86400000).toISOString(),
                current_period_end: new Date(Date.now() + 14 * 86400000).toISOString(),
            });

            setTenantId(newTenant.id);
            setTenant({
                id: newTenant.id,
                name: newTenant.name,
                domain: newTenant.domain,
                plan: newTenant.plan,
                status: newTenant.status,
            });
        } catch (err) {
            console.error('[TenantContext] attemptTenantProvision error:', err);
        }
    };

    useEffect(() => {
        loadTenant();

        // Recarregar ao fazer login/logout
        const { data: { subscription: authSub } } = supabase.auth.onAuthStateChange((event) => {
            if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
                loadTenant();
            } else if (event === 'SIGNED_OUT') {
                setTenantId(null);
                setTenant(null);
                setSubscription(null);
                setUser(null);
                setIsAuthenticated(false);
            }
        });

        return () => authSub.unsubscribe();
    }, [loadTenant]);

    // Calcular dias restantes de trial
    const isTrialing = subscription?.status === 'trialing';
    const trialDaysLeft = isTrialing && subscription?.trialEndsAt
        ? Math.max(0, Math.ceil((new Date(subscription.trialEndsAt).getTime() - Date.now()) / 86400000))
        : 0;

    return (
        <TenantContext.Provider value={{
            tenantId,
            tenant,
            subscription,
            user,
            isAuthenticated,
            loading,
            error,
            refresh: loadTenant,
            isTrialing,
            trialDaysLeft,
        }}>
            {children}
        </TenantContext.Provider>
    );
};

// ============================================================
// HOOK — use em qualquer componente para acessar o tenant
// ============================================================

export function useTenant(): TenantContextValue {
    const context = useContext(TenantContext);
    if (!context) {
        throw new Error('useTenant() deve ser usado dentro de <TenantProvider>');
    }
    return context;
}

export default TenantContext;
