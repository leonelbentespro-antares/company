import React from 'react';
import { FileText, ArrowLeft } from 'lucide-react';

export const TermsOfService: React.FC = () => {
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
            <FileText size={40} className="text-white" />
          </div>
          <h1 className="text-4xl font-black uppercase tracking-tight">Termos de Serviço</h1>
          <p className="text-legal-bronze mt-2 font-medium">Última atualização: Março de 2026</p>
        </div>

        <div className="p-8 md:p-12 text-slate-700 dark:text-slate-300 space-y-8 leading-relaxed">
          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              1. Aceitação
            </h2>
            <p className="text-lg">
              Ao acessar ou utilizar a plataforma LexHub, você, pessoa física ou jurídica (Escritório), concorda expressamente e se submete de forma irrestrita a este Termo de Serviço. Se não concordar com todas as disposições, por favor, interrompa imediatamente o uso da aplicação.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              2. Natureza da Ferramenta
            </h2>
            <p className="text-lg">
              O LexHub é um software SaaS (Software as a Service) provedor de eficiência de fluxo de trabalho jurídico. Nossos módulos (Chatbots Inteligentes, Integrações Institucionais e CRM PJe) atuam com o melhor esforço para orquestrar as rotinas de escritórios de advocacia. Nenhuma resposta provida pelas IAs de automação isenta o advogado titular da revisão processual obrigatória para a prestação jurisdicional.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              3. Permissões de Integração da Conta (Cloud)
            </h2>
            <p className="text-lg mb-4">
              O cliente autoriza o LexHub a agir como intermediário autorizado perante os sistemas aos quais ele espontaneamente se conectar na Aba de <b>Integrações</b>:
            </p>
            <ul className="list-disc pl-6 space-y-2 text-lg">
              <li>Sistemas Judiciais Eletrônicos (como PJe, E-proc, mediante uso local/criptografado dos certificados).</li>
              <li>Google Workspace (via OAuth 2.0), outorgando provisoriamente leitura de calendário, acesso de edição a discos (Drive) para a alocação de documentos e envio delegado de comunicações em nome da firma.</li>
              <li>API do WhatsApp Oficial ou não oficial para o tráfego autônomo e imediato das mensagens de clientes.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              4. Limitação de Responsabilidade
            </h2>
            <p className="text-lg">
              O LexHub assegura a alta disponibilidade dos servidores (via nuvem distribuída e infraestrutura resiliente), mas não pode ser responsabilizado por: manutenções inesperadas nos tribunais de justiça originários; falhas na API do Meta (WhatsApp); e instabilidades que ultrapassem nossa camada de comunicação durante acionamentos ao Google Cloud.
            </p>
          </section>
          
          <section>
            <h2 className="text-2xl font-bold text-legal-navy dark:text-white mb-4 flex items-center gap-3">
              <div className="w-2 h-8 bg-legal-bronze rounded-full"></div>
              5. Encerramento e Cobranças
            </h2>
            <p className="text-lg">
              Estes termos permanecem válidos pelo período da assinatura contratada (mensal ou anual). A interrupção de pagamento ou violação ativa de engenharia reversa para burlar o licenciamento resultará na interrupção progressiva dos serviços, conforme modalidade da sua licença.
            </p>
          </section>

          <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-800 text-center text-slate-500 font-medium">
            <p>LexHub Company © 2026 - Inovando e Acelerando a Advocacia do Futuro.</p>
          </div>
        </div>
      </div>
    </div>
  );
};
