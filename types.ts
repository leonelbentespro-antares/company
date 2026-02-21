
export enum PlanName {
  Starter = 'Starter',
  Professional = 'Professional',
  Enterprise = 'Enterprise'
}

export enum UserRole {
  Admin = 'Admin',
  Lawyer = 'Lawyer',
  Client = 'Client'
}

export enum CRMStage {
  Prospect = 'Prospect',
  Qualification = 'Qualification',
  Proposal = 'Proposal',
  Negotiation = 'Negotiation',
  Closed = 'Closed'
}

export enum ProcessStage {
  Initial = 'Initial',
  Evidence = 'Evidence',
  Decision = 'Decision',
  Appeal = 'Appeal',
  Archived = 'Archived'
}

// Fixed: Added missing Plan interface required by constants.ts
export interface Plan {
  name: PlanName;
  price: number;
  currency: string;
  setupFee: number;
  limits: {
    maxUsers: number | 'Unlimited';
    maxClients: number | 'Unlimited';
    storageGB: number;
    apiAccess: boolean;
    whiteLabel: boolean;
    prioritySupport?: boolean;
  };
}

// Fixed: Added missing Tenant interface required by constants.ts and Tenants.tsx
export interface Tenant {
  id: string;
  name: string;
  domain: string;
  plan: PlanName;
  status: 'Active' | 'Suspended' | 'Pending';
  crmStage: string;
  mrr: number;
  joinDate: string;
}

export interface User {
  id: string;
  registrationId: string;
  name: string;
  email: string;
  role: UserRole;
  cpfCnpj?: string;
  avatar?: string;
  oab?: string;
  phone?: string;
}

export interface ProcessDocument {
  id: string;
  name: string;
  status: 'Received' | 'Pending' | 'Missing';
}

export interface Process {
  id: string;
  number: string;
  clientName: string;
  subject: string;
  court: string;
  status: 'Active' | 'Archived' | 'Suspended';
  stage: ProcessStage | string;
  lastMovement: string;
  createdAt: string;
  clientCpf?: string;
  maternityData?: {
    monthsAtEntry: number;
    entryDate: string;
  };
  documents?: ProcessDocument[];
}

export interface AIAgent {
  id: string;
  name: string;
  personality: string;
  status: 'Active' | 'Disconnected' | 'Connecting';
  whatsappNumber?: string;
  totalInteractions: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  text: string;
  timestamp: string;
  fromMe: boolean;
}

export interface ChatConversation {
  id: string;
  contactName: string;
  lastMessage: string;
  timestamp: string;
  unreadCount: number;
  online: boolean;
  avatar?: string;
  messages: ChatMessage[];
}

export interface PipelineStage {
  id: string;
  label: string;
  color: string;
  position: number;
}

export interface Integration {
  id: string;
  tenantId?: string;
  provider: string; // 'openai', 'anthropic', 'gmail', etc.
  settings: {
    apiKey?: string;
    token?: string;
    enabled?: boolean;
    [key: string]: any;
  };
  createdAt: string;
}

export interface WhatsAppDevice {
  id: string;
  tenantId?: string;
  name: string;
  phone: string;
  status: 'connected' | 'disconnected' | 'connecting';
  type: 'qr' | 'official';
  batteryLevel?: number;
  lastActive?: string;
  createdAt: string;
}

export interface MetaConnection {
  id: string;
  tenantId: string;
  providerId: 'facebook' | 'instagram' | 'whatsapp';
  metaAccountId: string;
  metaAccountName?: string;
  accessToken: string;
  refreshToken?: string;
  tokenExpiresAt?: string;
  isActive: boolean;
  createdAt: string;
}

export interface WebhookEvent {
  id: string;
  metaEventId?: string;
  payload: any;
  status: 'pending' | 'processed' | 'failed';
  errorLog?: string;
  createdAt: string;
}

export interface UnifiedConversation {
  id: string;
  tenantId: string;
  channel: 'whatsapp' | 'instagram_dm' | 'facebook_messenger';
  externalUserId: string;
  userName?: string;
  status: 'active' | 'archived' | 'human_needed';
  lastMessageAt: string;
  metaConnectionId?: string;
}

export interface AIAuditLog {
  id: string;
  tenantId: string;
  conversationId: string;
  inputMessage?: string;
  aiResponse?: string;
  modelUsed?: string;
  tokensUsed?: number;
  latencyMs?: number;
  sentimentScore?: number;
  createdAt: string;
}
