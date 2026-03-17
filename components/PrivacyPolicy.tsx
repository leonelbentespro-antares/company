import React from 'react';
import { Shield, ArrowLeft } from 'lucide-react';

export const PrivacyPolicy: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 md:p-12 font-sans selection:bg-legal-bronze/30">
      <div className="max-w-4xl mx-auto bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800">
        <div className="bg-legal-navy p-10 text-white relative flex flex-col items-center justify-center text-center">
          <button 
            onClick={() => window.location.href = '/'} 
            className="absolute top-8 left-8 p-3 bg-white/10 hover:bg-white/20 rounded-xl transition-all flex items-center gap-2"
          >
            <ArrowLeft size={18} />
            <span className="text-sm font-bold">Voltar</span>
          </button>
          
          <div className="w-20 h-20 bg-legal-bronze rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-legal-bronze/20">
            <Shield size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Política de Privacidade</h1>
          <p className="text-legal-bronze mt-2 font-medium">Última atualização: Março de 2026</p>
        </div>

        <div className="p-8 md:p-12 text-slate-700 dark:text-slate-300 space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              1. Coleta de Informações
            </h2>
            <p className="text-lg">
              O LexHub coleta informações necessárias para a prestação de serviços de gestão jurídica e automação. Isso inclui dados cadastrais (nome, e-mail, telefone), bem como dados providos mediante autorização expressa em integrações de terceiros, como o <strong>Google OAuth</strong> (para sincronização de e-mails, arquivos de Drive e Calendário) e sistemas do Tribunal (PJe).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              2. Uso das Informações (Escopos Sensíveis)
            </h2>
            <p className="text-lg mb-4">
              A fim de maximizar a automação do seu escritório, nossa aplicação pode solicitar as seguintes permissões sensíveis (Google OAuth):
            </p>
            <ul className="list-disc pl-6 space-y-2 text-lg">
              <li><strong>Gmail:</strong> Leitura e envio de e-mails judiciais ou respostas programadas para clientes em nome do escritório.</li>
              <li><strong>Google Drive:</strong> Leitura e armazenamento automatizado de peças e jurisprudências relacionadas aos casos registrados no sistema.</li>
              <li><strong>Google Calendar:</strong> Leitura e criação de eventos/agendamentos atrelados aos clientes no chat ou no módulo Agenda.</li>
            </ul>
            <p className="text-lg mt-4 bg-blue-50 dark:bg-blue-900/10 p-4 rounded-xl text-blue-800 dark:text-blue-300 font-medium">
              Nota importante: O uso interno e a transferência de informações recebidas das APIs do Google (Google Workspace APIs) atenderão inteiramente à Política de Dados do Usuário dos Serviços de API do Google, incluindo os requisitos do Uso Limitado (Limited Use).
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              3. Compartilhamento e Proteção
            </h2>
            <p className="text-lg">
              O LexHub jamais comercializa ou compartilha dados sensíveis com terceiros de forma não-autorizada. A comunicação entre o nosso sistema e plataformas externas (Supabase, Google Cloud, APIs de IA) é feita inteiramente sobre protocolos criptografados (TLS/SSL). Os dados são mantidos em locatários estritamente separados (multitenancy arquitetônico), garantindo que apenas os membros autorizados da sua firma visualizem suas informações.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              4. Direitos do Usuário e Deleção
            </h2>
            <p className="text-lg">
              Você pode desvincular a sua conta de qualquer provedor (ex: revogar acesso via Google Account Settings) a qualquer momento. Caso queira deletar a totalidade de seus dados custodiados pelo LexHub, basta entrar em contato através do painel de Configurações do seu ambiente ou via suporte. As exclusões operacionais (Histórico de Chat e WhatsApp) são implementadas para respeitar o direito de exclusão imediato.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-slate-500 font-medium">
            <p>Se você tem alguma dúvida sobre os termos ou coleta de dados, contate nosso DPO ou suporte técnico empresarial.</p>
            <p className="mt-2 text-legal-bronze font-bold">LexHub Company © 2026</p>
          </div>
        </div>
      </div>
    </div>
  );
};
