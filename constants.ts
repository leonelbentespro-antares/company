
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
    stripePriceId: 'price_1T3jHtJ9ZEZzMZTmJ5KkKRJ0',
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
    stripePriceId: 'price_1T3jHvJ9ZEZzMZTmLmeSeRpP',
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
    stripePriceId: 'price_1T3jHwJ9ZEZzMZTmoobBAcbc',
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

export const MOCK_TENANTS: Tenant[] = [];

export const MOCK_PROCESSES: Process[] = [];
