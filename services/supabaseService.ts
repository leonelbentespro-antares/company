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
    MetaConnection, UnifiedConversation, ProcessDocument,
    Client, Appointment, FinancialReceivable
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

    const insertPayload: Record<string, any> = {
        tenant_id: tid,                       // ← SEMPRE incluir tenant_id
        number: process.number,
        client_name: process.clientName,
        subject: process.subject,
        court: process.court,
        status: process.status,
        stage: process.stage,
        last_movement: process.lastMovement,
    };
    if (process.clientCpf !== undefined) insertPayload.client_cpf = process.clientCpf;

    const { data, error } = await supabase
        .from('processes')
        .insert(insertPayload)
        .select()
        .single();

    if (error) {
        console.error('Supabase DB Error [createProcess]:', JSON.stringify(error, null, 2));
        throw error;
    }

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
    
    // Create an update payload mapping camelCase to snake_case only for defined properties
    const updatePayload: Record<string, any> = {};
    if (updates.number !== undefined) updatePayload.number = updates.number;
    if (updates.clientName !== undefined) updatePayload.client_name = updates.clientName;
    if (updates.clientCpf !== undefined) updatePayload.client_cpf = updates.clientCpf;
    if (updates.subject !== undefined) updatePayload.subject = updates.subject;
    if (updates.court !== undefined) updatePayload.court = updates.court;
    if (updates.status !== undefined) updatePayload.status = updates.status;
    if (updates.stage !== undefined) updatePayload.stage = updates.stage;
    if (updates.lastMovement !== undefined) updatePayload.last_movement = updates.lastMovement;

    const { error } = await supabase
        .from('processes')
        .update(updatePayload)
        .eq('id', id)
        .eq('tenant_id', tid);                  // ← Dupla proteção
    if (error) throw error;
}

export async function deleteProcess(id: string, tenantId: string | null): Promise<void> {
    const tid = requireTenantId(tenantId);
    const { error } = await supabase.from('processes').delete().eq('id', id).eq('tenant_id', tid);
    if (error) throw error;
}

// ============================================================
// PROCESS DOCUMENTS — arquivos de cada processo
// ============================================================

export async function getProcessDocuments(tenantId: string | null, processId: string): Promise<ProcessDocument[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('process_documents')
        .select('*')
        .eq('process_id', processId)
        .eq('tenant_id', tid)
        .order('created_at', { ascending: false });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        process_id: row.process_id,
        name: row.name,
        status: row.status as any,
        file_url: row.file_url,
        file_size: row.file_size,
        file_type: row.file_type,
        storage_path: row.storage_path,
        created_at: row.created_at
    }));
}

export async function uploadProcessDocument(
    tenantId: string | null, 
    processId: string, 
    file: File
): Promise<ProcessDocument> {
    const tid = requireTenantId(tenantId);
    
    // 1. Upload para o Storage
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;
    const filePath = `${tid}/${processId}/${fileName}`;
    
    const { data: storageData, error: storageError } = await supabase.storage
        .from('process-documents')
        .upload(filePath, file);
        
    if (storageError) throw storageError;

    // 2. Obter URL pública (ou assinada, mas aqui usaremos o helper da base)
    const { data: { publicUrl } } = supabase.storage
        .from('process-documents')
        .getPublicUrl(filePath);

    // 3. Registrar no Banco de Dados
    const { data, error } = await supabase
        .from('process_documents')
        .insert({
            tenant_id: tid,
            process_id: processId,
            name: file.name,
            status: 'Received',
            file_url: publicUrl,
            file_size: file.size,
            file_type: file.type,
            storage_path: filePath
        })
        .select()
        .single();
        
    if (error) {
        // Cleanup storage if db fails
        await supabase.storage.from('process-documents').remove([filePath]);
        throw error;
    }

    return {
        id: data.id,
        process_id: data.process_id,
        name: data.name,
        status: data.status,
        file_url: data.file_url,
        file_size: data.file_size,
        file_type: data.file_type,
        storage_path: data.storage_path,
        created_at: data.created_at
    };
}

export async function deleteProcessDocument(
    tenantId: string | null, 
    docId: string, 
    storagePath: string
): Promise<void> {
    const tid = requireTenantId(tenantId);
    
    // 1. Remover do Storage
    const { error: storageError } = await supabase.storage
        .from('process-documents')
        .remove([storagePath]);
        
    if (storageError) console.error('Aviso: Erro ao remover do storage, continuando...', storageError);

    // 2. Remover do Banco
    const { error } = await supabase
        .from('process_documents')
        .delete()
        .eq('id', docId)
        .eq('tenant_id', tid);
        
    if (error) throw error;
}

export async function getProcessDocumentSignedUrl(
    tenantId: string | null, 
    storagePath: string
): Promise<string> {
    const tid = requireTenantId(tenantId);
    
    // Garantir que o path pertence ao tenant (segurança extra)
    if (!storagePath.startsWith(`${tid}/`)) {
        throw new Error('Acesso negado: O documento não pertence ao seu escritório.');
    }

    const { data, error } = await supabase.storage
        .from('process-documents')
        .createSignedUrl(storagePath, 3600); // URL válida por 1 hora

    if (error) throw error;
    if (!data?.signedUrl) throw new Error('Não foi possível gerar a URL de acesso.');

    return data.signedUrl;
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
        skills: row.skills,
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
            name: agent.name, personality: agent.personality, 
            skills: agent.skills,
            status: agent.status,
            whatsapp_number: agent.whatsappNumber, total_interactions: agent.totalInteractions,
        })
        .select().single();
    if (error) throw error;
    return {
        id: data.id, name: data.name, personality: data.personality,
        skills: data.skills,
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
            name: updates.name, personality: updates.personality, 
            skills: updates.skills,
            status: updates.status,
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

// ============================================================
// CLIENTES — isolados por tenant
// ============================================================

export async function getClients(tenantId: string | null): Promise<Client[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tid)
        .order('nome', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        name: row.nome,
        phone: row.telefone,
        email: row.email,
        status: row.status as any,
        sexo: row.sexo,
        endereco: row.endereco,
        dataNascimento: row.data_nascimento,
        dataCadastro: row.data_cadastro
    }));
}

export async function getClientByPhone(tenantId: string | null, phone: string): Promise<Client | null> {
    const tid = requireTenantId(tenantId);
    // Remove caracteres não numéricos para comparação se necessário, 
    // mas aqui seguiremos a string exata primeiro
    const { data, error } = await supabase
        .from('clientes')
        .select('*')
        .eq('tenant_id', tid)
        .eq('telefone', phone)
        .maybeSingle();

    if (error) throw error;
    if (!data) return null;

    return {
        id: data.id,
        name: data.nome,
        phone: data.telefone,
        email: data.email,
        status: data.status as any,
        sexo: data.sexo,
        endereco: data.endereco,
        dataNascimento: data.data_nascimento,
        dataCadastro: data.data_cadastro
    };
}

export async function createClient(tenantId: string | null, client: Omit<Client, 'id' | 'dataCadastro'>): Promise<Client> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('clientes')
        .insert({
            tenant_id: tid,
            nome: client.name,
            telefone: client.phone,
            email: client.email,
            sexo: client.sexo,
            endereco: client.endereco,
            status: client.status || 'Normal'
        })
        .select()
        .single();

    if (error) throw error;
    return {
        id: data.id,
        name: data.nome,
        phone: data.telefone,
        email: data.email,
        status: data.status as any,
        dataCadastro: data.data_cadastro
    };
}

export async function updateClient(id: string, tenantId: string | null, updates: Partial<Client>): Promise<void> {
    const tid = requireTenantId(tenantId);
    
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.nome = updates.name;
    if (updates.phone !== undefined) dbUpdates.telefone = updates.phone;
    if (updates.email !== undefined) dbUpdates.email = updates.email;
    if (updates.sexo !== undefined) dbUpdates.sexo = updates.sexo;
    if (updates.endereco !== undefined) dbUpdates.endereco = updates.endereco;
    if (updates.status !== undefined) dbUpdates.status = updates.status;

    if (Object.keys(dbUpdates).length === 0) return;

    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from('clientes')
        .update(dbUpdates)
        .eq('id', id)
        .eq('tenant_id', tid);

    if (error) throw error;
}

export async function deleteClient(id: string, tenantId: string | null): Promise<void> {
    const tid = requireTenantId(tenantId);
    const { error } = await supabase
        .from('clientes')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tid);

    if (error) throw error;
}


// ============================================================
// AGENDAMENTOS — isolados por tenant
// ============================================================

export async function getAppointments(tenantId: string | null): Promise<Appointment[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('agendamentos')
        .select('*, clientes(nome)')
        .eq('tenant_id', tid)
        .order('data_hora', { ascending: true });

    if (error) throw error;
    return (data || []).map(row => ({
        id: row.id,
        clientId: row.cliente_id,
        clientName: row.clientes?.nome,
        dateTime: row.data_hora,
        service: row.servico,
        professional: row.profissional,
        status: row.status as any,
        notes: row.notas,
        createdAt: row.created_at
    }));
}

export async function createAppointment(tenantId: string | null, appointment: Omit<Appointment, 'id' | 'createdAt'>): Promise<Appointment> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('agendamentos')
        .insert({
            tenant_id: tid,
            cliente_id: appointment.clientId,
            data_hora: appointment.dateTime,
            servico: appointment.service,
            profissional: appointment.professional,
            status: appointment.status || 'Pendente',
            notas: appointment.notes
        })
        .select('*, clientes(nome)')
        .single();

    if (error) throw error;
    return {
        id: data.id,
        clientId: data.cliente_id,
        clientName: data.clientes?.nome,
        dateTime: data.data_hora,
        service: data.servico,
        professional: data.profissional,
        status: data.status as any,
        notes: data.notas,
        createdAt: data.created_at
    };
}

// ============================================================
// FINANCIAL RECEIVABLES (Faturamento)
// ============================================================

export async function getFinancialReceivables(tenantId: string | null): Promise<FinancialReceivable[]> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('financial_receivables')
        .select('*')
        .eq('tenant_id', tid)
        .order('due_date', { ascending: true });

    if (error) throw error;

    return data.map(r => ({
        id: r.id,
        client: r.client_name,
        value: Number(r.value),
        status: r.status as any,
        dueDate: r.due_date,
        category: r.category
    }));
}

export async function createFinancialReceivable(tenantId: string | null, receivable: Omit<FinancialReceivable, 'id'>): Promise<FinancialReceivable> {
    const tid = requireTenantId(tenantId);
    const { data, error } = await supabase
        .from('financial_receivables')
        .insert({
            tenant_id: tid,
            client_name: receivable.client,
            value: receivable.value,
            status: receivable.status,
            due_date: receivable.dueDate,
            category: receivable.category
        })
        .select()
        .single();

    if (error) throw error;

    return {
        id: data.id,
        client: data.client_name,
        value: Number(data.value),
        status: data.status as any,
        dueDate: data.due_date,
        category: data.category
    };
}

export async function updateFinancialReceivable(id: string, tenantId: string | null, updates: Partial<FinancialReceivable>): Promise<void> {
    const tid = requireTenantId(tenantId);
    
    const dbUpdates: any = {};
    if (updates.client !== undefined) dbUpdates.client_name = updates.client;
    if (updates.value !== undefined) dbUpdates.value = updates.value;
    if (updates.status !== undefined) dbUpdates.status = updates.status;
    if (updates.dueDate !== undefined) dbUpdates.due_date = updates.dueDate;
    if (updates.category !== undefined) dbUpdates.category = updates.category;

    if (Object.keys(dbUpdates).length === 0) return;

    dbUpdates.updated_at = new Date().toISOString();

    const { error } = await supabase
        .from('financial_receivables')
        .update(dbUpdates)
        .eq('id', id)
        .eq('tenant_id', tid);

    if (error) throw error;
}

export async function deleteFinancialReceivable(id: string, tenantId: string | null): Promise<void> {
    const tid = requireTenantId(tenantId);
    const { error } = await supabase
        .from('financial_receivables')
        .delete()
        .eq('id', id)
        .eq('tenant_id', tid);

    if (error) throw error;
}
