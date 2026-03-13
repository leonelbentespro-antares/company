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
    listView: string;
    kanban: string;
    billing: string;
    plans: string;
    administration: string;
    settings: string;
    security: string;
    referrals: string;
    logout: string;
  };
  chat: {
    messages: string;
    listView: string;
    kanbanView: string;
    manageTags: string;
    quickRepliesTitle: string;
    newChatContact: string;
    newAction: string;
    transferChat: string;
    inbox: string;
    pending: string;
    searching: string;
    noConversations: string;
    typeMessage: string;
    external: string;
    internal: string;
    deleteTitle: string;
    archiveTitle: string;
    transferTitle: string;
    organizationTitle: string;
    departments: {
       admin: string;
       financial: string;
       legal: string;
       support: string;
    };
    tags: {
       urgent: string;
       financial: string;
       review: string;
       maternity: string;
       tea: string;
       consumer: string;
       labor: string;
    };
    quickReplies: {
       ola: string;
       doc: string;
       andamento: string;
       acordo: string;
    };
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
    light: string;
    dark: string;
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
  dashboard: {
    overview: string;
    mrr: string;
    arr: string;
    tenants: string;
    processes: string;
    churn: string;
    ltv: string;
    growth: string;
    retention: string;
    exportSuccess: string;
    processing: string;
    exportData: string;
    customize: string;
    availableWidgets: string;
    createMetric: string;
    newMetric: string;
    metricName: string;
    metricNamePlaceholder: string;
    dataSource: string;
    operation: string;
    processesSource: string;
    tenantsSource: string;
    mrrSource: string;
    countOp: string;
    sumOp: string;
    avgOp: string;
    selectIcon: string;
    saveMetric: string;
    savePanel: string;
    dynamicPanel: string;
    dynamicPanelDesc: string;
    cancel: string;
    infraStatus: string;
  };
  whatsapp: {
    connectionName: string;
    connectionPlaceholder: string;
    startConnection: string;
    scanQrCode: string;
    scanInstructions: string;
    connectingSuccess: string;
    connectingSuccessDesc: string;
    closePanel: string;
    generatingCode: string;
    giveNameInstructions: string;
  };
  tenants: {
    title: string;
    subtitle: string;
    organization: string;
    organizationName: string;
    accessDomain: string;
    status: string;
    allStatus: string;
    responsible: string;
    plan: string;
    actions: string;
    newRegistration: string;
    editTenant: string;
    editSubtitle: string;
    active: string;
    inactive: string;
    pending: string;
    suspended: string;
    searchPlaceholder: string;
    since: string;
    newTenant: string;
    newColumn: string;
    upgradeTitle: string;
    upgradeSubtitle: string;
    confirmUpgrade: string;
    deleteTitle: string;
    deleteSubtitle: string;
    addProspect: string;
    addProspectSubtitle: string;
    startPipeline: string;
    editColumn: string;
    columnName: string;
    columnColor: string;
    columnProspect: string;
    columnQualification: string;
    columnProposal: string;
    columnNegotiation: string;
    columnClosed: string;
    columnOverdue: string;
  };
  billing: {
    title: string;
    subtitle: string;
    totalLiquidated: string;
    onTimeClients: string;
    overdue: string;
    receivablesBook: string;
    newEntry: string;
    liquidated: string;
    open: string;
    late: string;
    mySubscription: string;
    changePlan: string;
    contractDetails: string;
    accountUsage: string;
    revenueConfirmed: string;
    financialHealth: string;
    recommendedAction: string;
    filter: string;
    allStatus: string;
    paid: string;
    toExpire: string;
    lateFilter: string;
    beneficiaryClient: string;
    category: string;
    grossValue: string;
    dueDate: string;
    status: string;
    actions: string;
    editEntry: string;
    newEntryTitle: string;
    entrySubtitle: string;
    categoryMonthly: string;
    categoryConsultancy: string;
    categoryFees: string;
    categorySuccess: string;
    categoryCosts: string;
    subscriptionSubtitle: string;
    planRenew: string;
    users: string;
    storage: string;
    chooseUpgrade: string;
    upgradeSubtitle: string;
    currentPlan: string;
    select: string;
    processingPayment: string;
    paymentConfirmed: string;
    finish: string;
    since: string;
  };
  team: {
    title: string;
    subtitle: string;
    inviteMember: string;
    searchPlaceholder: string;
    roleAdmin: string;
    roleMember: string;
    statusActive: string;
    statusPending: string;
    statusInactive: string;
  };
  processes: {
    title: string;
    subtitle: string;
    newProcess: string;
    initialPetition: string;
    evidence: string;
    decision: string;
    appeal: string;
    archived: string;
    exportSuccess: string;
    importSuccess: (n: number) => string;
    tabList: string;
    tabKanban: string;
    tabData: string;
    searchPlaceholder: string;
    statusAll: string;
    statusActive: string;
    statusSuspended: string;
    statusArchived: string;
    tableNumberStage: string;
    tableClientSubject: string;
    tableStatus: string;
    tableMovement: string;
    tableActions: string;
    kanbanBack: string;
    kanbanNext: string;
    kanbanNewStage: string;
    importTitle: string;
    importSubtitle: string;
    importSelectFile: string;
    exportTitle: string;
    exportSubtitle: string;
    exportButton: string;
    importError: string;
    importDuplicate: string;
    importFormatError: string;
    importMissingCols: string;
    instructionsTitle: string;
    instructionsText: string;
    modalEditTitle: string;
    modalEditSubtitle: string;
    modalCreateTitle: string;
    modalCreateSubtitle: string;
    labelCnj: string;
    labelClient: string;
    labelSubject: string;
    labelCourt: string;
    labelStatus: string;
    placeholderCnj: string;
    placeholderClient: string;
    placeholderNewClient: string;
    placeholderSubject: string;
    placeholderCourt: string;
    docsTitle: string;
    docsSubtitle: string;
    docsEmpty: string;
    docsEmptySubtitle: string;
    docsOpening: string;
    btnNewClient: string;
    btnCancel: string;
    btnUpload: string;
    docPreviewLoading: string;
    docPreviewType: string;
    docPreviewUnsupported: string;
    btnDownloadComputer: string;
    docPreviewError: string;
  };
  aiAgents: {
    title: string;
    subtitle: string;
    newAgent: string;
    myAgents: string;
    integrations: string;
    connected: string;
    disconnected: string;
    deactivate: string;
    activate: string;
    saveIntegration: string;
    configTitle: string;
    nameLabel: string;
    personalityLabel: string;
    personalityPlaceholder: string;
    skillsLabel: string;
    importFile: string;
    skillsPlaceholder: string;
    cancel: string;
    saveChanges: string;
    nextStep: string;
    pairingTitle: string;
    validating: string;
    pairingCode: string;
    pairingInstructions: string;
    generateQr: string;
    back: string;
    feedback: {
      importSuccess: string;
      updateSuccess: string;
      updateError: string;
      statusSuccess: (status: string) => string;
      statusError: string;
      awaitingQr: string;
      useCode: string;
      connected: string;
      whatsappConnected: string;
      startingSession: string;
      pairingError: string;
      agentRemoved: string;
      removeError: string;
      apiKeySaved: (provider: string) => string;
      apiKeyError: string;
    }
  };
  integrationsApp: {
    title: string;
    subtitle: string;
    cloudApps: string;
    active: string;
    available: string;
    disconnect: string;
    connect: (name: string) => string;
    suggestTitle: string;
    suggestSubtitle: string;
    suggestButton: string;
    modalTitle: string;
    modalSubtitle: string;
    softwareName: string;
    softwarePlaceholder: string;
    purposeLabel: string;
    purposePlaceholder: string;
    sendSuggestion: string;
    feedback: {
      popupBlocked: string;
      googleConnected: string;
      googleError: string;
      msConnected: string;
      msError: string;
      integrated: string;
      disconnected: string;
      toggleError: string;
      suggestionSent: string;
    }
  };
  common: {
    close: string;
    save: string;
    cancel: string;
    loading: string;
    saveChanges: string;
    keep: string;
    remove: string;
    all: string;
    list: string;
    error: string;
  };
}

// ============================================================
// TRADUÇÃO PADRÃO: PORTUGUÊS BRASIL
// ============================================================

export const ptBR: Translations = {
  nav: {
    dashboard: 'Dashboard',
    chat: 'Chat',
    tenants: 'Organização',
    team: 'Equipe',
    processes: 'Processos',
    aiModule: 'Módulo IA',
    automation: 'Automação',
    integrations: 'Integrações',
    aiAgents: 'Agentes de IA',
    listView: 'Lista',
    kanban: 'Kanban de Atendimentos',
    billing: 'Faturamento',
    plans: 'Planos & Upgrade',
    administration: 'Administração',
    settings: 'Configurações',
    security: 'Segurança & Logs',
    referrals: 'Indicações',
    logout: 'Sair do Painel',
  },
  chat: {
    messages: 'Mensagens',
    listView: 'Modo Lista',
    kanbanView: 'Modo Kanban',
    manageTags: 'Gerenciar Etiquetas',
    quickRepliesTitle: 'Respostas Rápidas',
    newChatContact: 'Novo Chat / Contato',
    newAction: 'Nova Ação',
    transferChat: 'Transferir Atendimento',
    inbox: 'Caixa de Entrada',
    pending: 'Pendentes',
    searching: 'Buscar conversas...',
    noConversations: 'Nenhuma conversa encontrada',
    typeMessage: 'Escreva sua mensagem...',
    external: 'Atendimento Externo',
    internal: 'Equipe Interna',
    deleteTitle: 'Excluir Conversa',
    archiveTitle: 'Arquivar Conversa',
    transferTitle: 'Transferir Atendimento',
    organizationTitle: 'Organização por Categorias',
    departments: {
       admin: 'Administrativo',
       financial: 'Financeiro',
       legal: 'Jurídico',
       support: 'Suporte',
    },
    tags: {
       urgent: 'Urgente',
       financial: 'Financeiro',
       review: 'Revisão',
       maternity: 'Salário Maternidade',
       tea: 'TEA (Autismo)',
       consumer: 'Consumidor',
       labor: 'Trabalhista',
    },
    quickReplies: {
       ola: 'Olá! Sou o Dr. Responsável pelo seu caso. Como posso ajudá-lo hoje?',
       doc: 'Recebemos seus documentos com sucesso. Vamos analisá-los e retornaremos em breve.',
       andamento: 'Seu processo teve uma nova movimentação hoje. Já estamos verificando os detalhes para você.',
       acordo: 'A parte contrária enviou uma proposta de acordo. Gostaria de agendar uma breve reunião para discutirmos?',
    },
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
    light: 'Claro',
    dark: 'Escuro',
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
    processUpdateDesc: '...',
    tenantProvisioned: 'Escritório Ativado',
    tenantProvisionedDesc: 'Seu escritório foi ativado com sucesso.',
    securityAlert: 'Alerta de Segurança',
    securityAlertDesc: 'Novo login detectado.',
    timeAgo10: '',
    timeAgo2h: '',
    yesterday: '',
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
  dashboard: {
    overview: 'Visão Geral',
    mrr: 'MRR Realizado',
    arr: 'ARR Projetado',
    tenants: 'Tenants Ativos',
    processes: 'Processos no CRM',
    churn: 'Churn Rate',
    ltv: 'Lifetime Value',
    growth: 'Crescimento Operacional',
    retention: 'Retenção',
    exportSuccess: 'Dashboard exportado com sucesso!',
    processing: 'Processando...',
    exportData: 'Exportar Dados',
    customize: 'Personalizar Dashboard',
    availableWidgets: 'Widgets Disponíveis',
    createMetric: 'Criar Métrica',
    newMetric: 'Nova Métrica',
    metricName: 'Nome da Métrica',
    metricNamePlaceholder: 'Ex: Total de Ganhos',
    dataSource: 'Fonte de Dados',
    operation: 'Cálculo',
    processesSource: 'Processos Judiciais',
    tenantsSource: 'Tenants / Bancas',
    mrrSource: 'Faturamento (MRR)',
    countOp: 'Contagem Total',
    sumOp: 'Soma Total',
    avgOp: 'Média',
    selectIcon: 'Selecione um Ícone',
    saveMetric: 'Criar Métrica Agora',
    savePanel: 'Salvar Painel',
    dynamicPanel: 'Painel Dinâmico LexHub',
    dynamicPanelDesc: 'Selecione os widgets ao lado para compor sua visão operacional.',
    cancel: 'Cancelar',
    infraStatus: 'Status da Infraestrutura',
  },
  whatsapp: {
    connectionName: 'Nome do Dispositivo',
    connectionPlaceholder: 'Ex: Celular Dr. Marcos',
    startConnection: 'Iniciar Conexão',
    scanQrCode: 'Escaneie o QR Code',
    scanInstructions: 'Abra o WhatsApp > Configurações > Dispositivos Conectados',
    connectingSuccess: 'Conectado com Sucesso!',
    connectingSuccessDesc: 'Agora você já pode enviar e receber mensagens pelo LexHub.',
    closePanel: 'Fechar Painel',
    generatingCode: 'Gerando Código...',
    giveNameInstructions: 'Dê um nome para esta conexão (ex: "Recepção Principal") e clique em iniciar.',
  },
  tenants: {
    title: 'Gestão de Organizações & CRM',
    subtitle: 'Controle de instâncias e pipeline de vendas do ecossistema.',
    organization: 'Organização',
    organizationName: 'Nome da Organização',
    accessDomain: 'Acesso (Domínio)',
    status: 'Status',
    allStatus: 'Todos Status',
    responsible: 'Usuário Responsável',
    plan: 'Plano',
    actions: 'Ações',
    newRegistration: 'Novo Registro',
    editTenant: 'Editar Organização',
    editSubtitle: 'Atualize os dados da organização.',
    active: 'Ativo',
    inactive: 'Inativo',
    pending: 'Pendente',
    suspended: 'Suspenso',
    searchPlaceholder: 'Buscar organização ou domínio...',
    since: 'DESDE',
    newTenant: 'Nova Organização',
    newColumn: 'Nova Coluna',
    upgradeTitle: 'Alterar Plano',
    upgradeSubtitle: 'Selecione o novo nível de serviço para {name}.',
    confirmUpgrade: 'Efetivar Upgrade',
    deleteTitle: 'Remover Organização?',
    deleteSubtitle: 'Esta ação é irreversível. Todos os dados serão permanentemente excluídos.',
    addProspect: 'Adicionar Banca',
    addProspectSubtitle: 'Insira uma nova banca no seu pipeline de vendas.',
    startPipeline: 'Iniciar Pipeline',
    editColumn: 'Editar Coluna',
    columnName: 'Nome da Etapa',
    columnColor: 'Cor de Identificação',
    columnProspect: 'Prospecção',
    columnQualification: 'Qualificação',
    columnProposal: 'Proposta',
    columnNegotiation: 'Negociação',
    columnClosed: 'Fechado',
    columnOverdue: 'Inadimplente',
  },
  billing: {
    title: 'Recebíveis & Fluxo de Caixa',
    subtitle: 'Indicadores financeiros e controle de inadimplência dos clientes.',
    totalLiquidated: 'Total Liquidado',
    onTimeClients: 'Clientes em Dia',
    overdue: 'Em Atraso (Inadimplência)',
    receivablesBook: 'Livro de Recebíveis',
    newEntry: 'Novo Lançamento',
    liquidated: 'Liquidado',
    open: 'Em Aberto',
    late: 'Em Atraso',
    mySubscription: 'Minha Assinatura LexHub',
    changePlan: 'Alterar Plano',
    contractDetails: 'Ver Detalhes do Contrato',
    accountUsage: 'Uso da Conta',
    revenueConfirmed: 'Receita Confirmada',
    financialHealth: 'Saúde Financeira',
    recommendedAction: 'Ação Recomendada',
    filter: 'Filtro',
    allStatus: 'Todos os Status',
    paid: 'Pagos',
    toExpire: 'A vencer',
    lateFilter: 'Atrasados',
    beneficiaryClient: 'Cliente Beneficiário',
    category: 'Categoria',
    grossValue: 'Valor Bruto',
    dueDate: 'Vencimento',
    status: 'Status',
    actions: 'Ações',
    editEntry: 'Editar Lançamento',
    newEntryTitle: 'Novo Lançamento',
    entrySubtitle: 'Controle de Honorários e Custas',
    categoryMonthly: 'Mensalidade',
    categoryConsultancy: 'Consultoria',
    categoryFees: 'Honorários',
    categorySuccess: 'Êxito',
    categoryCosts: 'Custas Processuais',
    subscriptionSubtitle: 'Gerencie seu plano de acesso à plataforma SaaS.',
    planRenew: 'Sua assinatura renova em {date}',
    users: 'Usuários',
    storage: 'Armazenamento',
    chooseUpgrade: 'Escolha seu Upgrade',
    upgradeSubtitle: 'Selecione o plano ideal para a nova fase do seu escritório.',
    currentPlan: 'Plano Atual',
    select: 'Selecionar',
    processingPayment: 'Identificando Pagamento...',
    paymentConfirmed: 'Pagamento Confirmado!',
    finish: 'Concluir',
    since: 'DESDE',
  },
  team: {
    title: 'Nosso Time',
    subtitle: 'Gerenciando equipe para o workspace atual.',
    inviteMember: 'Convidar Membro',
    searchPlaceholder: 'Buscar membro...',
    roleAdmin: 'Administrador',
    roleMember: 'Colaborador',
    statusActive: 'Ativo',
    statusPending: 'Convite Enviado',
    statusInactive: 'Inativo',
  },
  processes: {
    title: 'Processos Judiciais & CRM',
    subtitle: 'Gerencie o acervo e mova os processos através das fases do tribunal.',
    newProcess: 'Novo Processo',
    initialPetition: 'Petição Inicial',
    evidence: 'Instrução',
    decision: 'Sentença',
    appeal: 'Recursos',
    archived: 'Arquivado',
    exportSuccess: 'Acervo exportado com sucesso!',
    importSuccess: (n: number) => `${n} processo(s) importado(s) com sucesso!`,
    tabList: 'Lista',
    tabKanban: 'Kanban',
    tabData: 'Dados',
    searchPlaceholder: 'Buscar por CNJ ou Cliente...',
    statusAll: 'Todos Status',
    statusActive: 'Em Curso',
    statusSuspended: 'Suspenso',
    statusArchived: 'Arquivado',
    tableNumberStage: 'Número / Estágio',
    tableClientSubject: 'Cliente / Objeto',
    tableStatus: 'Status',
    tableMovement: 'Movimentação',
    tableActions: 'Ações',
    kanbanBack: 'Voltar',
    kanbanNext: 'Avançar',
    kanbanNewStage: 'Nova Etapa',
    importTitle: 'Importar Processos',
    importSubtitle: 'Selecione um arquivo CSV ou Excel para carregar novos processos em massa.',
    importSelectFile: 'Selecionar Arquivo',
    exportTitle: 'Exportar Acervo',
    exportSubtitle: 'Baixe toda a sua base de dados processuais para backup ou integração externa.',
    exportButton: 'Exportar Acervo',
    importError: 'Erro ao importar processos.',
    importDuplicate: 'Nenhum processo novo para importar (podem ser duplicados na base atual).',
    importFormatError: 'O arquivo não contém dados para importar.',
    importMissingCols: 'Colunas obrigatórias não encontradas.',
    instructionsTitle: 'Instruções para Importação',
    instructionsText: 'Para garantir o sucesso da importação, seu arquivo deve conter as colunas: Número CNJ, Cliente, Assunto e Tribunal.',
    modalEditTitle: 'Editar Processo',
    modalEditSubtitle: 'Atualize os dados e movimentações',
    modalCreateTitle: 'Novo Processo',
    modalCreateSubtitle: 'Cadastre um novo caso no acervo',
    labelCnj: 'Número do Processo (CNJ)',
    labelClient: 'Cliente',
    labelSubject: 'Assunto / Objeto',
    labelCourt: 'Tribunal / Vara',
    labelStatus: 'Status Atual',
    placeholderCnj: '0000000-00.0000.0.00.0000',
    placeholderClient: 'Selecione um cliente',
    placeholderNewClient: 'Nome do novo cliente',
    placeholderSubject: 'Descreva o assunto ou objeto do processo...',
    placeholderCourt: 'Ex: 1ª Vara Cível de São Paulo',
    docsTitle: 'Cofre de Documentos',
    docsSubtitle: 'Suba procurações, petições ou provas aqui.',
    docsEmpty: 'Nenhum documento guardado',
    docsEmptySubtitle: 'Suba documentos para este processo.',
    docsOpening: 'Abrindo Cofre...',
    btnNewClient: 'Novo',
    btnCancel: 'Cancelar',
    btnUpload: 'Subir Arquivo',
    docPreviewLoading: 'Gerando acesso seguro...',
    docPreviewType: 'Arquivo',
    docPreviewUnsupported: 'Este formato não suporta visualização direta no navegador. Use o botão abaixo para baixar e abrir no seu sistema.',
    btnDownloadComputer: 'Baixar para o Computador',
    docPreviewError: 'Erro ao carregar visualização.',
  },
  aiAgents: {
    title: 'Agentes de IA',
    subtitle: 'Gerencie seus assistentes virtuais inteligentes e integrações.',
    newAgent: 'Criar Novo Agente',
    myAgents: 'Meus Agentes',
    integrations: 'Integrações',
    connected: 'Conectado',
    disconnected: 'Desconectado',
    deactivate: 'Desativar Agente',
    activate: 'Ativar Agente',
    saveIntegration: 'Salvar Integração',
    configTitle: 'Configurar Agente',
    nameLabel: 'Nome',
    personalityLabel: 'Personalidade',
    personalityPlaceholder: 'Descreva como o agente deve se comportar...',
    skillsLabel: 'Habilidades & Conhecimento (Skills)',
    importFile: 'Importar Arquivo (.txt)',
    skillsPlaceholder: 'Cole aqui ou importe as instruções e habilidades do agente...',
    cancel: 'Cancelar',
    saveChanges: 'Salvar Alterações',
    nextStep: 'Próximo Passo',
    pairingTitle: 'Pareamento WhatsApp',
    validating: 'Validando...',
    pairingCode: 'Código de Pareamento',
    pairingInstructions: 'Digite este código no seu WhatsApp em "Conectar com número de telefone".',
    generateQr: 'Gerar QR Code',
    back: 'Voltar',
    feedback: {
      importSuccess: 'Skills importadas com sucesso!',
      updateSuccess: 'Agente atualizado com segurança!',
      updateError: 'Erro ao atualizar agente.',
      statusSuccess: (status: string) => `Agente ${status === 'Active' ? 'ativado' : 'desativado'} com sucesso!`,
      statusError: 'Erro ao alterar status.',
      awaitingQr: 'Aguardando escaneamento do QR Code...',
      useCode: 'Utilize o código abaixo no seu WhatsApp...',
      connected: 'Criptografia Estabelecida. Conectado!',
      whatsappConnected: 'WhatsApp Conectado com Sucesso!',
      startingSession: 'Iniciando Sessão Segura com WhatsApp...',
      pairingError: 'Erro ao iniciar pareamento com o backend.',
      agentRemoved: 'Agente removido.',
      removeError: 'Erro ao remover agente.',
      apiKeySaved: (provider: string) => `${provider} API Key salva!`,
      apiKeyError: 'Erro ao salvar API Key.',
    }
  },
  integrationsApp: {
    title: 'Integrações & Apps Cloud',
    subtitle: 'Conecte ferramentas de produtividade para potencializar seu escritório.',
    cloudApps: 'Aplicativos Cloud',
    active: 'Ativo',
    available: 'Disponível',
    disconnect: 'Desconectar App',
    connect: (name: string) => `Conectar ${name}`,
    suggestTitle: 'Deseja integrar outra ferramenta?',
    suggestSubtitle: 'Nossa equipe de engenharia pode desenvolver conectores personalizados.',
    suggestButton: 'Sugerir Nova Integração',
    modalTitle: 'Sugerir Integração',
    modalSubtitle: 'Qual ferramenta você gostaria de ver no LexHub?',
    softwareName: 'Nome do Software / App',
    softwarePlaceholder: 'Ex: RD Station, Notion, ERP Interno...',
    purposeLabel: 'Finalidade da Integração',
    purposePlaceholder: 'Como essa integração ajudaria o seu escritório?',
    sendSuggestion: 'Enviar Sugestão',
    feedback: {
      popupBlocked: '⚠️ O popup foi bloqueado pelo navegador.',
      googleConnected: 'Google Cloud conectado com sucesso! 🚀',
      googleError: 'Erro ao iniciar conexão com Google.',
      msConnected: 'Microsoft 365 conectado com sucesso! 🚀',
      msError: 'Erro ao iniciar conexão Microsoft.',
      integrated: 'Aplicativo integrado com sucesso!',
      disconnected: 'Aplicativo desconectado.',
      toggleError: 'Erro ao alterar conexão do app.',
      suggestionSent: 'Sugestão enviada para nossa equipe de produto!',
    }
  },
  common: {
    close: 'Fechar',
    save: 'Salvar',
    cancel: 'Cancelar',
    loading: 'Carregando...',
    saveChanges: 'Salvar Alterações',
    keep: 'Manter',
    remove: 'Remover',
    all: 'Todos',
    list: 'Lista',
    error: 'Erro'
  },
};
