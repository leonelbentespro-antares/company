// ============================================================
// INTERFACE DO SISTEMA DE TRADUÇÕES
// ============================================================

export interface Translations {
  nav: {
    dashboard: string;
    chat: string;
    tenants: string;
    team: string;
    processes: string;
    aiModule: string;
    automation: string;
    integrations: string;
    aiAgents: string;
    billing: string;
    plans: string;
    administration: string;
    settings: string;
    security: string;
    logout: string;
  };
  header: {
    search: string;
    lightMode: string;
    darkMode: string;
    officeWebsite: string;
    notifications: string;
    unreadCount: (n: number) => string;
    markAllRead: string;
    noNotifications: string;
  };
  loading: {
    workspace: string;
    failedTitle: string;
    failedDesc: string;
    retry: string;
  };
  profile: {
    title: string;
    activeRegistration: string;
    fullName: string;
    professionalEmail: string;
    oabRegistration: string;
    whatsapp: string;
    saveChanges: string;
    cancel: string;
    backToProfile: string;
    security: string;
    securityDesc: string;
    changePassword: string;
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
    showPasswords: string;
    hidePasswords: string;
    updatePassword: string;
    savedSuccess: string;
    passwordSuccess: string;
    passwordMismatch: string;
    passwordTooShort: string;
    passwordMinChars: string;
  };
  notifications: {
    processUpdate: string;
    processUpdateDesc: string;
    tenantProvisioned: string;
    tenantProvisionedDesc: string;
    securityAlert: string;
    securityAlertDesc: string;
    timeAgo10: string;
    timeAgo2h: string;
    yesterday: string;
  };
  language: {
    label: string;
    select: string;
    ptBR: string;
    en: string;
    es: string;
    fr: string;
    de: string;
  };
  settings: {
    title: string;
    subtitle: string;
    apiIntegrations: string;
    securityLogs: string;
    webhooks: string;
    documentation: string;
    documentationDesc: string;
    openApiDocs: string;
    apiTokens: string;
    liveApiKey: string;
    rotateKey: string;
    apiKeyCopied: string;
    newKeyGenerated: string;
    webhookEndpoints: string;
    newEndpoint: string;
    endpointUrl: string;
    events: string;
    status: string;
    actions: string;
    noWebhooks: string;
    newWebhook: string;
    newWebhookDesc: string;
    destinationUrl: string;
    triggerEvents: string;
    endpointStatus: string;
    active: string;
    inactive: string;
    save: string;
    selectAtLeastOne: string;
    webhookSaved: string;
    webhookDeleted: string;
    lastTriggered: string;
  };
}

// ============================================================
// TRADUÇÃO PADRÃO: PORTUGUÊS BRASIL
// ============================================================

export const ptBR: Translations = {
  nav: {
    dashboard: 'Dashboard',
    chat: 'Chat',
    tenants: 'Tenants',
    team: 'Equipe',
    processes: 'Processos',
    aiModule: 'Módulo IA',
    automation: 'Automação',
    integrations: 'Integrações',
    aiAgents: 'Agentes de IA',
    billing: 'Faturamento',
    plans: 'Planos & Upgrade',
    administration: 'Administração',
    settings: 'Configurações',
    security: 'Segurança & Logs',
    logout: 'Sair do Painel',
  },
  header: {
    search: 'Pesquisar...',
    lightMode: 'Ativar Modo Claro',
    darkMode: 'Ativar Modo Escuro',
    officeWebsite: 'Site do Escritório',
    notifications: 'Notificações',
    unreadCount: (n: number) => `Você tem ${n} nova${n !== 1 ? 's' : ''}`,
    markAllRead: 'Lidas',
    noNotifications: 'Tudo limpo por aqui!',
  },
  loading: {
    workspace: 'Carregando dados do escritório...',
    failedTitle: 'Falha ao Carregar Workspace',
    failedDesc: 'Não foi possível criar ou vincular o seu usuário a um escritório.',
    retry: 'Tentar Novamente',
  },
  profile: {
    title: 'Perfil',
    activeRegistration: 'Cadastro Ativo',
    fullName: 'Nome Completo',
    professionalEmail: 'E-mail Profissional',
    oabRegistration: 'Registro OAB / Profissional',
    whatsapp: 'WhatsApp / Telefone',
    saveChanges: 'Salvar Alterações',
    cancel: 'Cancelar',
    backToProfile: 'Voltar para o Perfil',
    security: 'Segurança da Conta',
    securityDesc: 'Sua conta é protegida por criptografia de ponta a ponta.',
    changePassword: 'Alterar Senha de Acesso',
    currentPassword: 'Senha Atual',
    newPassword: 'Nova Senha',
    confirmPassword: 'Confirmar Nova Senha',
    showPasswords: 'Mostrar Senhas',
    hidePasswords: 'Ocultar Senhas',
    updatePassword: 'Atualizar Senha',
    savedSuccess: 'Perfil atualizado com sucesso!',
    passwordSuccess: 'Senha atualizada com sucesso!',
    passwordMismatch: 'As novas senhas não coincidem.',
    passwordTooShort: 'A nova senha deve ter pelo menos 6 caracteres.',
    passwordMinChars: 'Sua senha deve ter pelo menos 6 caracteres.',
  },
  notifications: {
    processUpdate: 'Movimentação Processual',
    processUpdateDesc: 'Nova sentença publicada no processo 5001234...',
    tenantProvisioned: 'Tenant Provisionado',
    tenantProvisionedDesc: 'Almeida Advocacia ativou o plano Enterprise.',
    securityAlert: 'Alerta de Segurança',
    securityAlertDesc: 'Novo login detectado de um IP desconhecido.',
    timeAgo10: '10 min atrás',
    timeAgo2h: '2 horas atrás',
    yesterday: 'Ontem',
  },
  language: {
    label: 'Idioma',
    select: 'Selecionar idioma',
    ptBR: 'Português (BR)',
    en: 'English',
    es: 'Español',
    fr: 'Français',
    de: 'Deutsch',
  },
  settings: {
    title: 'Configurações do Sistema',
    subtitle: 'Gerencie o ecossistema técnico e integrações do LexHub.',
    apiIntegrations: 'API & Integrações',
    securityLogs: 'Segurança & Logs',
    webhooks: 'Webhooks',
    documentation: 'Documentação',
    documentationDesc: 'Acesse nosso guia completo para desenvolvedores.',
    openApiDocs: 'Abrir API Docs',
    apiTokens: 'API Access Tokens',
    liveApiKey: 'Live API Key (Produção)',
    rotateKey: 'Rotacionar Chave',
    apiKeyCopied: 'API Key copiado!',
    newKeyGenerated: 'Nova chave gerada com sucesso!',
    webhookEndpoints: 'Endpoint Webhooks',
    newEndpoint: 'Novo Endpoint',
    endpointUrl: 'URL do Endpoint',
    events: 'Eventos',
    status: 'Status',
    actions: 'Ações',
    noWebhooks: 'Nenhum webhook configurado',
    newWebhook: 'Novo Webhook',
    newWebhookDesc: 'Receba notificações de eventos em tempo real.',
    destinationUrl: 'URL de Destino (Endpoint)',
    triggerEvents: 'Eventos para Disparo',
    endpointStatus: 'Status do Endpoint',
    active: 'Ativo',
    inactive: 'Inativo',
    save: 'Salvar Webhook',
    selectAtLeastOne: 'Selecione ao menos um evento para continuar',
    webhookSaved: 'Webhook configurado com sucesso!',
    webhookDeleted: 'Webhook removido.',
    lastTriggered: 'Último disparo:',
  },
};
