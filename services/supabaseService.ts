/**
 * ============================================================
 * LEXHUB SAAS — SUPABASE SERVICE (MULTI-TENANT ISOLATED)
 *
 * REGRA DE OURO: Toda query que acessa dados de negócio
 * DEVE incluir .eq('tenant_id', tenantId)
 * Nenhum dado cruza a fronteira entre diferentes escritórios.
 * ============================================================
 */

import { supabase } from './supabaseClient';
import {
    Tenant, Process, AIAgent, ChatConversation, User, PlanName,
    CRMStage, ProcessStage, UserRole, Integration, WhatsAppDevice,
    MetaConnection, UnifiedConversation
} from '../types';

// ============================================================
// HELPER: garante que tenantId está presente
// ============================================================
function requireTenantId(tenantId?: string | null): string {
    if (!tenantId) throw new Error('tenant_id obrigatório — faça login novamente.');
    return tenantId;
}

// ============================================================
// PROFILES
// ============================================================

export async function getProfiles(tenantId?: string | null): Promise<User[]> {
    const tid = requireTenantId(tenantId);

    // Buscar profiles dos usuários que pertencem ao tenant
    const { data, error } = await supabase
        .from('profiles')
        .select('*, tenant_users!inner(tenant_id)')
        .eq('tenant_users.tenant_id', tid)
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id,
        registrationId: row.registration_id,
        name: row.name,
        email: row.email,
        role: row.role as UserRole,
        oab: row.oab,
        phone: row.phone,
        cpfCnpj: row.cpf_cnpj,
        avatar: row.avatar_url,
    }));
}

export async function upsertProfile(user: Partial<User> & { authUserId?: string }): Promise<User> {
    const { data, error } = await supabase
        .from('profiles')
        .upsert({
            auth_user_id: user.authUserId,
            registration_id: user.registrationId,
            name: user.name,
            email: user.email,
            role: user.role,
            oab: user.oab,
            phone: user.phone,
            cpf_cnpj: user.cpfCnpj,
            avatar_url: user.avatar,
        }, { onConflict: 'email' })
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id,
        registrationId: data.registration_id,
        name: data.name,
        email: data.email,
        role: data.role as UserRole,
        oab: data.oab,
        phone: data.phone,
        cpfCnpj: data.cpf_cnpj,
        avatar: data.avatar_url,
    };
}

// ============================================================
// TENANT — dados do próprio escritório
// ============================================================

export async function getMyTenant(tenantId: string | null): Promise<Tenant | null> {
    const tid = requireTenantId(tenantId);

    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .eq('id', tid)
        .single();

    if (error) return null;

    return {
        id: data.id,
        name: data.name,
        domain: data.domain,
        plan: data.plan as PlanName,
        status: data.status as 'Active' | 'Suspended' | 'Pending',
        crmStage: data.crm_stage as CRMStage,
        mrr: data.mrr,
        joinDate: data.join_date,
    };
}

/** Apenas para o painel de admin SaaS (lista todos os tenants) */
export async function getTenants(): Promise<Tenant[]> {
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id,
        name: row.name,
        domain: row.domain,
        plan: row.plan as PlanName,
        status: row.status as 'Active' | 'Suspended' | 'Pending',
        crmStage: row.crm_stage as CRMStage,
        mrr: row.mrr,
        joinDate: row.join_date,
    }));
}

export async function createTenant(tenant: Omit<Tenant, 'id'>): Promise<Tenant> {
    const { data, error } = await supabase
        .from('tenants')
        .insert({
            name: tenant.name,
            domain: tenant.domain,
            plan: tenant.plan,
            status: tenant.status,
            crm_stage: tenant.crmStage,
            mrr: tenant.mrr,
            join_date: tenant.joinDate,
        })
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id, name: data.name, domain: data.domain,
        plan: data.plan as PlanName,
        status: data.status as 'Active' | 'Suspended' | 'Pending',
        crmStage: data.crm_stage as CRMStage,
        mrr: data.mrr, joinDate: data.join_date,
    };
}

export async function updateTenant(id: string, updates: Partial<Tenant>): Promise<void> {
    const { error } = await supabase
        .from('tenants')
        .update({
            name: updates.name,
            domain: updates.domain,
            plan: updates.plan,
            status: updates.status,
            crm_stage: updates.crmStage,
            mrr: updates.mrr,
        })
        .eq('id', id);
    if (error) throw error;
}

export async function deleteTenant(id: string): Promise<void> {
    const { error } = await supabase.from('tenants').delete().eq('id', id);
    if (error) throw error;
}

// ============================================================
// PIPELINE STAGES (compartilhado, sem tenant_id)
// ============================================================

export async function getPipelineStages(): Promise<any[]> {
    const { data, error } = await supabase
        .from('pipeline_stages').select('*')
        .order('position', { ascending: true });
    if (error) throw error;
    return data || [];
}

export async function createPipelineStage(stage: { label: string; color: string; position: number }): Promise<any> {
    const { data, error } = await supabase.from('pipeline_stages').insert(stage).select().single();
    if (error) throw error;
    return data;
}

export async function updatePipelineStage(id: string, updates: { label?: string; color?: string; position?: number }): Promise<void> {
    const { error } = await supabase.from('pipeline_stages').update(updates).eq('id', id);
    if (error) throw error;
}

export async function deletePipelineStage(id: string): Promise<void> {
    const { error } = await supabase.from('pipeline_stages').delete().eq('id', id);
    if (error) throw error;
}

// ============================================================
// PROCESSES — isolados por tenant
// ============================================================

export async function getProcesses(tenantId: string | null): Promise<Process[]> {
    const tid = requireTenantId(tenantId);

    const { data, error } = await supabase
        .from('processes')
        .select('*, process_documents(*)')
        .eq('tenant_id', tid)                  // ← ISOLAMENTO CRÍTICO
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id,
        number: row.number,
        clientName: row.client_name,
        clientCpf: row.client_cpf,
        subject: row.subject,
        court: row.court,
        status: row.status as 'Active' | 'Archived' | 'Suspended',
        stage: row.stage as ProcessStage,
        lastMovement: row.last_movement,
        createdAt: row.created_at,
        documents: (row.process_documents || []).map((doc: any) => ({
            id: doc.id,
            name: doc.name,
            status: doc.status as 'Received' | 'Pending' | 'Missing',
        })),
    }));
}

export async function createProcess(
    tenantId: string | null,
    process: Omit<Process, 'id' | 'createdAt'>
): Promise<Process> {
    const tid = requireTenantId(tenantId);

    const { data, error } = await supabase
        .from('processes')
        .insert({
            tenant_id: tid,                       // ← SEMPRE incluir tenant_id
            number: process.number,
            client_name: process.clientName,
            client_cpf: process.clientCpf,
            subject: process.subject,
            court: process.court,
            status: process.status,
            stage: process.stage,
            last_movement: process.lastMovement,
        })
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id, number: data.number, clientName: data.client_name,
        clientCpf: data.client_cpf, subject: data.subject, court: data.court,
        status: data.status as 'Active' | 'Archived' | 'Suspended',
        stage: data.stage as ProcessStage, lastMovement: data.last_movement,
        createdAt: data.created_at, documents: [],
    };
}

export async function updateProcess(id: string, tenantId: string | null, updates: Partial<Process>): Promise<void> {
    const tid = requireTenantId(tenantId);
    const { error } = await supabase
        .from('processes')
        .update({
            client_name: updates.clientName, subject: updates.subject,
            court: updates.court, status: updates.status, stage: updates.stage,
            last_movement: updates.lastMovement,
        })
        .eq('id', id)
        .eq('tenant_id', tid);                  // ← Dupla proteção
    if (error) throw error;
}

export async function deleteProcess(id: string, tenantId: string | null): Promise<void> {
    const tid = requireTenantId(tenantId);
    const { error } = await supabase.from('processes').delete()
        .eq('id', id).eq('tenant_id', tid);
    if (error) throw error;
}

// ============================================================
// AI AGENTS — isolados por tenant
// ============================================================

export async function getAIAgents(tenantId: string | null): Promise<AIAgent[]> {
    const tid = requireTenantId(tenantId);

    const { data, error } = await supabase
        .from('ai_agents')
        .select('*')
        .eq('tenant_id', tid)                   // ← ISOLAMENTO CRÍTICO
        .order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id, name: row.name, personality: row.personality,
        status: row.status as 'Active' | 'Disconnected' | 'Connecting',
        whatsappNumber: row.whatsapp_number, totalInteractions: row.total_interactions,
        createdAt: row.created_at,
    }));
}

export async function createAIAgent(
    tenantId: string | null,
    agent: Omit<AIAgent, 'id' | 'createdAt'>
): Promise<AIAgent> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('ai_agents')
        .insert({
            tenant_id: tid,
            name: agent.name, personality: agent.personality, status: agent.status,
            whatsapp_number: agent.whatsappNumber, total_interactions: agent.totalInteractions,
        })
        .select().single();
    if (error) throw error;
    return {
        id: data.id, name: data.name, personality: data.personality,
        status: data.status as 'Active' | 'Disconnected' | 'Connecting',
        whatsappNumber: data.whatsapp_number, totalInteractions: data.total_interactions,
        createdAt: data.created_at,
    };
}

export async function updateAIAgent(id: string, tenantId: string | null, updates: Partial<AIAgent>): Promise<void> {
    const tid = requireTenantId(tenantId);
    const { error } = await supabase
        .from('ai_agents')
        .update({
            name: updates.name, personality: updates.personality, status: updates.status,
            whatsapp_number: updates.whatsappNumber, total_interactions: updates.totalInteractions,
        })
        .eq('id', id).eq('tenant_id', tid);
    if (error) throw error;
}

// ============================================================
// CHAT — isolado por tenant
// ============================================================

export async function getChatConversations(tenantId: string | null): Promise<ChatConversation[]> {
    const tid = requireTenantId(tenantId);

    const { data, error } = await supabase
        .from('chat_conversations')
        .select('*, chat_messages(*)')
        .eq('tenant_id', tid)                   // ← ISOLAMENTO CRÍTICO
        .order('updated_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(row => ({
        id: row.id, contactName: row.contact_name,
        lastMessage: row.last_message || '', timestamp: row.updated_at,
        unreadCount: row.unread_count, online: row.online, avatar: row.avatar_url,
        messages: (row.chat_messages || [])
            .sort((a: any, b: any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
            .map((msg: any) => ({ id: msg.id, text: msg.text, timestamp: msg.created_at, fromMe: msg.from_me })),
    }));
}

export async function sendChatMessage(
    conversationId: string, text: string, fromMe: boolean
): Promise<void> {
    const { error: msgError } = await supabase
        .from('chat_messages')
        .insert({ conversation_id: conversationId, text, from_me: fromMe });
    if (msgError) throw msgError;

    const { error: convError } = await supabase
        .from('chat_conversations')
        .update({ last_message: text, updated_at: new Date().toISOString() })
        .eq('id', conversationId);
    if (convError) throw convError;
}

// ============================================================
// REALTIME — com filtro de tenant
// ============================================================

export function subscribeToProcesses(tenantId: string | null, callback: (processes: Process[]) => void) {
    return supabase
        .channel(`processes-changes-${tenantId}`)
        .on('postgres_changes', {
            event: '*', schema: 'public', table: 'processes',
            filter: tenantId ? `tenant_id=eq.${tenantId}` : undefined,
        }, async () => {
            const processes = await getProcesses(tenantId);
            callback(processes);
        })
        .subscribe();
}

export function subscribeToTenants(callback: (tenants: Tenant[]) => void) {
    return supabase
        .channel('tenants-changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'tenants' }, async () => {
            const tenants = await getTenants();
            callback(tenants);
        })
        .subscribe();
}

// ============================================================
// INTEGRATIONS — isoladas por tenant
// ============================================================

export async function getIntegrations(tenantId?: string | null): Promise<Integration[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('integrations').select('*')
        .eq('tenant_id', tid)                   // ← ISOLAMENTO CRÍTICO
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id, tenantId: row.tenant_id, provider: row.provider,
        settings: row.settings, createdAt: row.created_at,
    }));
}

export async function upsertIntegration(integration: Partial<Integration>): Promise<Integration> {
    const { data, error } = await supabase
        .from('integrations')
        .upsert({
            tenant_id: integration.tenantId,
            provider: integration.provider,
            settings: integration.settings,
        }, { onConflict: 'tenant_id,provider' })
        .select().single();
    if (error) throw error;
    return {
        id: data.id, tenantId: data.tenant_id, provider: data.provider,
        settings: data.settings, createdAt: data.created_at,
    };
}

// ============================================================
// WHATSAPP DEVICES — isolados por tenant
// ============================================================

export async function getWhatsAppDevices(tenantId?: string | null): Promise<WhatsAppDevice[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('whatsapp_devices').select('*')
        .eq('tenant_id', tid)                   // ← ISOLAMENTO CRÍTICO
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id, tenantId: row.tenant_id, name: row.name, phone: row.phone,
        status: row.status as 'connected' | 'disconnected' | 'connecting',
        type: row.type as 'qr' | 'official', batteryLevel: row.battery_level,
        lastActive: row.last_active, createdAt: row.created_at,
    }));
}

export async function createWhatsAppDevice(
    device: Omit<WhatsAppDevice, 'id' | 'createdAt'>
): Promise<WhatsAppDevice> {
    const { data, error } = await supabase
        .from('whatsapp_devices')
        .insert({
            tenant_id: device.tenantId,
            name: device.name, phone: device.phone, status: device.status,
            type: device.type, battery_level: device.batteryLevel, last_active: device.lastActive,
        })
        .select().single();
    if (error) throw error;
    return {
        id: data.id, tenantId: data.tenant_id, name: data.name, phone: data.phone,
        status: data.status as 'connected' | 'disconnected' | 'connecting',
        type: data.type as 'qr' | 'official', batteryLevel: data.battery_level,
        lastActive: data.last_active, createdAt: data.created_at,
    };
}

export async function updateWhatsAppDevice(id: string, updates: Partial<WhatsAppDevice>): Promise<void> {
    const { error } = await supabase
        .from('whatsapp_devices')
        .update({
            name: updates.name, phone: updates.phone, status: updates.status,
            battery_level: updates.batteryLevel, last_active: updates.lastActive
        })
        .eq('id', id);
    if (error) throw error;
}

export async function deleteWhatsAppDevice(id: string): Promise<void> {
    const { error } = await supabase.from('whatsapp_devices').delete().eq('id', id);
    if (error) throw error;
}

// ============================================================
// META CONNECTIONS — isoladas por tenant
// ============================================================

export async function getMetaConnections(tenantId?: string | null): Promise<MetaConnection[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('meta_connections').select('*')
        .eq('tenant_id', tid)                   // ← ISOLAMENTO CRÍTICO
        .order('created_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id, tenantId: row.tenant_id, providerId: row.provider_id,
        metaAccountId: row.meta_account_id, metaAccountName: row.meta_account_name,
        accessToken: row.access_token, refreshToken: row.refresh_token,
        tokenExpiresAt: row.token_expires_at, isActive: row.is_active, createdAt: row.created_at,
    }));
}

export async function upsertMetaConnection(connection: Partial<MetaConnection>): Promise<MetaConnection> {
    const { data, error } = await supabase
        .from('meta_connections')
        .upsert({
            tenant_id: connection.tenantId, provider_id: connection.providerId,
            meta_account_id: connection.metaAccountId, meta_account_name: connection.metaAccountName,
            access_token: connection.accessToken, refresh_token: connection.refreshToken,
            token_expires_at: connection.tokenExpiresAt, is_active: connection.isActive,
        }, { onConflict: 'tenant_id,meta_account_id' })
        .select().single();
    if (error) throw error;
    return {
        id: data.id, tenantId: data.tenant_id, providerId: data.provider_id,
        metaAccountId: data.meta_account_id, metaAccountName: data.meta_account_name,
        accessToken: data.access_token, refreshToken: data.refresh_token,
        tokenExpiresAt: data.token_expires_at, isActive: data.is_active, createdAt: data.created_at,
    };
}

export async function deleteMetaConnection(id: string): Promise<void> {
    const { error } = await supabase.from('meta_connections').delete().eq('id', id);
    if (error) throw error;
}

// ============================================================
// UNIFIED CONVERSATIONS — isoladas por tenant
// ============================================================

export async function getUnifiedConversations(tenantId?: string | null): Promise<UnifiedConversation[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('conversations').select('*')
        .eq('tenant_id', tid)                   // ← ISOLAMENTO CRÍTICO
        .order('last_message_at', { ascending: false });
    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id, tenantId: row.tenant_id, channel: row.channel,
        externalUserId: row.external_user_id, userName: row.user_name,
        status: row.status, lastMessageAt: row.last_message_at, metaConnectionId: row.meta_connection_id,
    }));
}

export async function createUnifiedConversation(
    conversation: Omit<UnifiedConversation, 'id'>
): Promise<UnifiedConversation> {
    const { data, error } = await supabase
        .from('conversations')
        .insert({
            tenant_id: conversation.tenantId, channel: conversation.channel,
            external_user_id: conversation.externalUserId, user_name: conversation.userName,
            status: conversation.status, last_message_at: conversation.lastMessageAt || new Date().toISOString(),
            meta_connection_id: conversation.metaConnectionId,
        })
        .select().single();
    if (error) throw error;
    return {
        id: data.id, tenantId: data.tenant_id, channel: data.channel,
        externalUserId: data.external_user_id, userName: data.user_name,
        status: data.status, lastMessageAt: data.last_message_at, metaConnectionId: data.meta_connection_id,
    };
}

export async function updateUnifiedConversation(id: string, updates: Partial<UnifiedConversation>): Promise<void> {
    const { error } = await supabase
        .from('conversations')
        .update({ user_name: updates.userName, status: updates.status, last_message_at: updates.lastMessageAt })
        .eq('id', id);
    if (error) throw error;
}
