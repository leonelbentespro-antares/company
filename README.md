# ⚖️ LexHub SaaS

Sistema de gestão jurídica multi-tenant com IA, módulo de chat com transferência de atendimento, automação de fluxos e integração com WhatsApp/Instagram/Meta.

## 🚀 Tecnologias

- **Frontend:** React 18 + TypeScript + Vite
- **Estilização:** TailwindCSS + Lucide Icons
- **Backend/BaaS:** Supabase (Auth + PostgreSQL + Storage)
- **IA:** Gemini API (Google)
- **Deploy:** Coolify (auto-deploy via GitHub)

## ⚙️ Configuração Local

### 1. Clone o repositório
```bash
git clone https://github.com/SEU-USUARIO/lexhub-saas.git
cd lexhub-saas
```

### 2. Instale as dependências
```bash
npm install
```

### 3. Configure as variáveis de ambiente
```bash
cp .env.example .env.local
# Edite o .env.local com suas chaves do Supabase e Gemini
```

### 4. Inicie o servidor de desenvolvimento
```bash
npm run dev
```

A aplicação estará disponível em `http://localhost:5173`.

## 📁 Estrutura do Projeto

```
lexhub-saas-21/
├── components/         # Componentes React (Chat, AIAgents, Processes, etc.)
├── services/           # Integrações (Supabase, IA, Meta APIs)
├── scripts/            # Scripts utilitários
├── types.ts            # Tipos TypeScript globais
├── constants.ts        # Constantes da aplicação
├── App.tsx             # Componente raiz
└── index.tsx           # Entry point
```

## 🔑 Variáveis de Ambiente

| Variável | Descrição |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | Chave anon pública do Supabase |
| `GEMINI_API_KEY` | Chave da API Gemini (Google) |

> ⚠️ **Nunca faça commit do `.env.local`** — ele está no `.gitignore`.

## 🏗️ Build de Produção

```bash
npm run build
```

## 📋 Funcionalidades Principais

- ✅ Gestão de processos jurídicos
- ✅ Chat com transferência de atendimento entre departamentos
- ✅ Automação de fluxos (drag & drop)
- ✅ Módulo de IA com agentes personalizados
- ✅ Integração Meta (WhatsApp, Instagram, Facebook)
- ✅ Multi-tenant com planos e faturamento
- ✅ Portal do cliente
- ✅ Dashboard analítico
