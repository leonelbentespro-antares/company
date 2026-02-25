# Plano de Migração Arquitetural LexHub SaaS

**De:** Monolito Frontend (SPA) + Supabase Direto
**Para:** Arquitetura Híbrida Orientada a Eventos (EDA) e Microsserviços

Como não há usuários reais utilizando a plataforma no momento, podemos fazer uma **migração disruptiva** ("Big Bang Re-architecture"). O objetivo é preparar o LexHub para suportar dezenas de milhares de requisições simultâneas de clientes via WhatsApp e orquestração pesada de Agentes de IA sem comprometer o painel dos advogados (Tenant).

---

## 🎯 Visão Geral da Nova Arquitetura

1. **Frontend (BFF):** Mantém-se em React/Vite, mas todas as requisições complexas passarão por um API Gateway próprio, não apenas chamadas diretas ao Supabase.
2. **Core API / API Gateway (Node.js + NestJS/Express):** Gerencia assinaturas (Stripe), controle de acesso (RBAC e Tenants), regras de negócio pesadas e orquestra comunicação entre serviços.
3. **Serviço de Mensageria (WhatsApp/Instagram):** Um microsserviço isolado apenas para receber Webhooks da Meta, responder instantaneamente com HTTP 200 (evitando penalidades da Meta) e despachar a mensagem para a fila (Queue).
4. **Message Broker / Filas (Redis + BullMQ ou RabbitMQ):** O "coração" da escalabilidade. Gerenciará o tráfego de mensagens recebidas e tarefas a serem processadas.
5. **Serviço de Inteligência Artificial (Workers):** Processos rodando em background consumindo as mensagens da fila. Eles enviam para LLMs (Google GenAI, OpenAI), recebem a resposta assincronamente e colocam o resultado em outra fila para envio.

---

## 📅 Plano de Ação Passo a Passo

### Fase 1: Preparação da Infraestrutura & Message Broker
Nesta etapa, preparamos o ambiente para suportar filas e serviços em background.

*   [ ] **1.1 Subir a Infraestrutura Base:** Provisionar servidor Redis (no Coolify, AWS ElastiCache, ou via Docker localmente) para gerenciar as filas.
*   [ ] **1.2 Migração de Scripts de Banco de Dados:** Consolidar todo o schema do banco de dados (Tabelas, políticas RLS, Functions) em migrations SQL versionadas via CLI do Supabase.
*   [ ] **1.3 RLS (Row Level Security):** Garantir que TODAS as tabelas do Supabase (`processes`, `clients`, `conversations`) tenham a coluna obrigatória `tenant_id` e políticas RLS impenetráveis (onde apenas o token do Tenant correto consiga acessar dados via Frontend).

### Fase 2: Criação do API Gateway (Core Service) e Microsserviço de Webhooks
Desenvolveremos o backend centralizado e o microsserviço para lidar exclusivamente com chamadas de alta vazão.

*   [ ] **2.1 Setup do Projeto API (Node.js/TypeScript):** Criar repositório/pasta do Gateway. (Ex: `lexhub-core-api`).
*   [ ] **2.2 Migração do Stripe e Lógica de Negócios:** Mover toda a lógica de checkout do Stripe, Webhooks de faturamento, gerenciamento de Tenants (suspensão/ativação) para o Core API.
*   [ ] **2.3 Microsserviço de Webhooks (Omnichannel API):** Criar API super enxuta. O único papel deste serviço é ouvir `/webhooks/meta`, autenticar a requisição, empacotar os dados (telefone, mensagem do contato) e enfileirar no Redis (BullMQ: Job `whatsapp-message-received`), retornando código HTTP 200 pro Meta na mesma hora.

### Fase 3: Worker Service de Inteligência Artificial (Serviço de Processamento Pesado)
Este é o serviço que executa tarefas demoradas e não pode bloquear a UI. Pode ser feito em NodeJS ou Python.

*   [ ] **3.1 Criar o AI Worker Component:** Setup do worker que escuta a fila do Redis (`whatsapp-message-received`).
*   [ ] **3.2 Integração com LLMs SDK & Contexto:** O Worker vai desempacotar a Job e rodar o fluxo de IA: 
    *   Fazer fetch assíncrono do perfil do `Agent IA` daquele Tenant.
    *   Pegar o histórico das últimas N mensagens daquele contato (Supabase).
    *   Enviar o prompt completo + RAG pro Google GenAI/OpenAI.
*   [ ] **3.3 Fila de Resposta (Saída):** Com a resposta gerada da IA pronta, enfileirar um novo Job (`send-whatsapp-message`) com o texto. O Microsserviço Omnichannel (Fase 2) processa o envio de volta ao Meta. Salvar tudo no DB assincronamente.

### Fase 4: O Workflow de Automação Interna
Aplicativo de UI precisa enviar fluxos pesados para o backend em vez de travar o navegador.

*   [ ] **4.1 Criar Fila de Geração de Documentos:** Criar fila genérica `document-generation`.
*   [ ] **4.2 Migração da Lógica Local:** Transformar as requisições de IA feitas hoje diretamente pelo React (no painel "Módulo IA") em requisições assíncronas POST para o Core API. 
*   [ ] **4.3 Realtime Push (WebSockets/Supabase Realtime):** Quando a IA/Worker terminar a geração do documento em background, atualizar uma linha no banco do Supabase e disparar um evento (Supabase Realtime) sinalizando ao Painel SPA do usuário (React) que a tarefa terminou (mostrando o toast verde).

### Fase 5: Refatoração do Frontend (SPA React/Vite)
Desconectar o frontend de chamadas complexas diretas ao banco de dados e plugá-lo no Gateway/Eventos.

*   [ ] **5.1 Substituição dos SDKs Lentos:** Trocar as gerações síncronas de IA no frontend (`@google/genai` não deve estar rodando no Browser do usuário) por chamadas de API (`POST /api/agents/chat/enqueue`).
*   [ ] **5.2 Assinatura Realtime Global:** Implementar o listener do Supabase Realtime no nível do contexto `App.tsx` para monitorar "jobs finalizados". Assim que o banco sinalizar conclusão, um Alert ou Toast global deve notificar o advogado de que a triagem, o peticionamento, ou o resumo está pronto.
*   [ ] **5.3 Limpeza:** Remover todo código do arquivo `aiTools.ts` do Frontend para o serviço de Worker do Backend.

### Fase 6: Deploy & Orquestração
*   [ ] **6.1 Dockerização:** Criar `Dockerfile`s distintos para: 
    1) Frontend (Dist do Vite/Nginx). 
    2) Core API Gateway. 
    3) Omnichannel Microservice (Fastify/Express). 
    4) AI Worker Service (NodeJS/Python puro).
*   [ ] **6.2 Compose/Orquestrador (Coolify):** Configurar no Coolify o mapeamento e criação destes containeres com escalabilidade cruzada de Workers.
*   [ ] **6.3 Monitoramento Base:** Setup de logs (como Sentry ou ELK) centralizado nos Workers, pois quando erros ocorrem soltos em Filas no backend, eles são silenciosos e o frontend não ficará sabendo.

---

## ⚡ Benefícios Imediatos após Migração (O Impacto da Escala)
*   **Zero Concurrency Blocking:** Múltiplos processos simultâneos acontecendo no mesmo momento (e.g., dezenas de mensagens do Instagram + Webhooks + 3 advogados pedindo resumo de petição) enfileiram silenciosamente, sendo processados controladamente, sem pico exaustivo de gargalo.
*   **Tolerância a Falhas Segura (Dead Letter Queues):** Se a AI falhar por timeout da OpenAI/Gemini, o Worker de IA coloca o Job de volta no final da fila para retry automático. O usuário frontend não perde o dado.
*   **Security (Frontend Dummy):** O client React fica mais enxuto e estrito: só exibe dados ou faz dispatches. As regras de negócio confidenciais tornam-se inalcançáveis via ferramentas de desenvolvedor do navegador.
