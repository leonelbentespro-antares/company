
import { Plan, PlanName, Tenant, Process, CRMStage, ProcessStage } from './types.ts';

export const COLORS = {
  NAVY: '#002B49',
  BRONZE: '#A67C52',
  WHITE: '#FFFFFF',
  SLATE: '#64748b'
};

export const PLANS: Plan[] = [
  {
    name: PlanName.Starter,
    price: 297,
    currency: 'BRL',
    setupFee: 997,
    stripePriceId: 'price_starter_placeholder', // TODO: Replace with real Stripe Price ID
    limits: {
      maxUsers: 5,
      maxClients: 200,
      storageGB: 10,
      apiAccess: false,
      whiteLabel: false,
      aiAgents: 1,
      automations: false,
      triggers: true,
      flows: true
    }
  },
  {
    name: PlanName.Professional,
    price: 697,
    currency: 'BRL',
    setupFee: 1997,
    stripePriceId: 'price_professional_placeholder', // TODO: Replace with real Stripe Price ID
    limits: {
      maxUsers: 20,
      maxClients: 1000,
      storageGB: 50,
      apiAccess: true,
      whiteLabel: true,
      aiAgents: 'Unlimited',
      automations: true,
      triggers: true,
      flows: true
    }
  },
  {
    name: PlanName.Enterprise,
    price: 1497,
    currency: 'BRL',
    setupFee: 4997,
    stripePriceId: 'price_enterprise_placeholder', // TODO: Replace with real Stripe Price ID
    limits: {
      maxUsers: 'Unlimited',
      maxClients: 'Unlimited',
      storageGB: 200,
      apiAccess: true,
      whiteLabel: true,
      prioritySupport: true,
      aiAgents: 'Unlimited',
      automations: true,
      triggers: true,
      flows: true
    }
  }
];

export const MOCK_TENANTS: Tenant[] = [
  { id: '1', name: 'Almeida Advocacia', domain: 'almeida.lexhub', plan: PlanName.Enterprise, status: 'Active', crmStage: CRMStage.Closed, mrr: 1497, joinDate: '2023-10-15' },
  { id: '2', name: 'Santos & Filhos', domain: 'santos.lexhub', plan: PlanName.Professional, status: 'Active', crmStage: CRMStage.Closed, mrr: 697, joinDate: '2023-11-02' },
  { id: '3', name: 'Borges Legal Tech', domain: 'borges.lexhub', plan: PlanName.Starter, status: 'Active', crmStage: CRMStage.Closed, mrr: 297, joinDate: '2023-12-20' },
];

export const MOCK_PROCESSES: Process[] = [
  {
    id: '1',
    number: '5001234-56.2023.8.26.0001',
    clientName: 'Carlos Eduardo Oliveira',
    subject: 'Indenização por Danos Morais',
    court: '3ª Vara Cível de São Paulo',
    status: 'Active',
    stage: ProcessStage.Initial,
    lastMovement: '2024-05-10',
    createdAt: '2023-01-15',
    documents: [
      { id: 'd1', name: 'RG/CPF', status: 'Received' },
      { id: 'd2', name: 'Comprovante Residência', status: 'Pending' },
      { id: 'd3', name: 'Contrato Assinado', status: 'Received' }
    ]
  },
  {
    id: 'mat_1',
    number: '1099887-22.2024.4.03.6100',
    clientName: 'Maria Helena Souza',
    subject: 'Salário Maternidade Rural',
    court: 'Justiça Federal - TRF3',
    status: 'Active',
    stage: ProcessStage.Evidence,
    lastMovement: '2024-05-22',
    createdAt: '2024-02-15',
    maternityData: {
      monthsAtEntry: 3,
      entryDate: '2024-02-15'
    },
    documents: [
      { id: 'm1', name: 'Documento Pessoal', status: 'Received' },
      { id: 'm2', name: 'Laudo Médico (DUM)', status: 'Received' },
      { id: 'm3', name: 'CadÚnico Atualizado', status: 'Missing' },
      { id: 'm4', name: 'Comprovante de Atividade Rural', status: 'Pending' }
    ]
  }
];
