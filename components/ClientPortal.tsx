
import React, { useState, useMemo, useRef } from 'react';
import { 
  Scale, 
  Calendar, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  FileText, 
  ShieldCheck, 
  ArrowUpRight,
  MessageCircle,
  Phone,
  Baby,
  AlertTriangle,
  UploadCloud,
  FileSearch,
  Timer,
  X,
  Loader2,
  Check,
  ExternalLink,
  History,
  Gavel
} from 'lucide-react';
import { MOCK_PROCESSES } from '../constants.ts';
import { User, Process, ProcessDocument } from '../types.ts';

interface ClientPortalProps {
  user: User;
}

const OFFICE_WHATSAPP = "5511999999999"; // Número do escritório

export const ClientPortal: React.FC<ClientPortalProps> = ({ user }) => {
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showToast, setShowToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Simula o filtro de processos do cliente logado
  const [clientProcesses, setClientProcesses] = useState<Process[]>(() => 
    MOCK_PROCESSES.filter(p => 
      p.clientName.toLowerCase().includes(user.name.toLowerCase()) || 
      user.name.toLowerCase().includes(p.clientName.toLowerCase())
    )
  );

  const mainProcess = clientProcesses[0];

  // Regra de Cálculo Automático - Gestação
  const maternityStats = useMemo(() => {
    if (!mainProcess?.maternityData) return null;
    
    const entryDate = new Date(mainProcess.maternityData.entryDate);
    const today = new Date();
    
    const diffTime = Math.abs(today.getTime() - entryDate.getTime());
    const diffMonths = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 30.44));
    
    const currentMonths = mainProcess.maternityData.monthsAtEntry + diffMonths;
    
    const monthsRemaining = 9 - currentMonths;
    const dueDate = new Date();
    dueDate.setMonth(today.getMonth() + monthsRemaining);

    return {
      currentMonths: Math.min(currentMonths, 9),
      dueDate: dueDate.toLocaleDateString('pt-BR'),
      isHighAlert: currentMonths >= 7
    };
  }, [mainProcess]);

  const documentStats = useMemo(() => {
    if (!mainProcess?.documents) return { received: 0, pending: 0, missing: 0 };
    return {
      received: mainProcess.documents.filter(d => d.status === 'Received').length,
      pending: mainProcess.documents.filter(d => d.status === 'Pending').length,
      missing: mainProcess.documents.filter(d => d.status === 'Missing').length,
    };
  }, [mainProcess]);

  // --- HANDLERS ---

  const handleStartChat = () => {
    const message = encodeURIComponent(`Olá! Sou ${user.name} e gostaria de tirar uma dúvida sobre o meu processo ${mainProcess.number}.`);
    window.open(`https://wa.me/${OFFICE_WHATSAPP}?text=${message}`, '_blank');
  };

  const handleFileSelect = () => {
    fileInputRef.current?.click();
  };

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      simulateUpload();
    }
  };

  const simulateUpload = () => {
    setUploading(true);
    setUploadProgress(0);
    
    const interval = setInterval(() => {
      setUploadProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + 10;
      });
    }, 200);

    setTimeout(() => {
      setUploading(false);
      setIsUploadModalOpen(false);
      setShowToast("Documento enviado para análise com sucesso!");
      
      // Atualiza o estado local para simular que o documento "pendente" virou "em análise"
      setClientProcesses(prev => prev.map(p => ({
        ...p,
        documents: p.documents?.map(d => d.status !== 'Received' ? { ...d, status: 'Pending' as const } : d)
      })));

      setTimeout(() => setShowToast(null), 3000);
    }, 2500);
  };

  if (!mainProcess) {
    return (
      <div className="bg-white p-20 rounded-[3rem] border border-dashed border-slate-300 text-center animate-in fade-in duration-700">
         <Scale size={48} className="text-slate-200 mx-auto mb-4" />
         <p className="text-slate-500 font-bold">Nenhum processo vinculado localizado.</p>
         <p className="text-sm text-slate-400">Vincule seu CPF no primeiro atendimento.</p>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-700 pb-20 relative">
      
      {showToast && (
        <div className="fixed top-24 right-8 z-[200] px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <CheckCircle2 size={20} />
          <p className="font-bold text-sm">{showToast}</p>
        </div>
      )}

      {/* 🔄 BANNER DE ÚLTIMA ATUALIZAÇÃO */}
      <div className="bg-legal-navy text-white p-5 rounded-[2rem] shadow-2xl flex flex-col md:flex-row justify-between items-center gap-4 border-l-8 border-legal-bronze">
         <div className="flex items-center gap-4">
            <div className="p-3 bg-white/10 rounded-2xl">
               <Timer size={24} className="text-legal-bronze" />
            </div>
            <div>
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Última Atualização</p>
               <h4 className="text-sm font-bold">{new Date(mainProcess.lastMovement).toLocaleDateString('pt-BR')} às 10:43</h4>
            </div>
         </div>
         <div className="flex items-center gap-6">
            <div className="text-right hidden sm:block">
               <p className="text-[10px] font-black uppercase tracking-[0.2em] text-white/50">Status Atual</p>
               <h4 className="text-sm font-bold uppercase text-legal-bronze">{mainProcess.status === 'Active' ? 'Em Análise no INSS' : 'Arquivado'}</h4>
            </div>
            <button 
              onClick={() => setIsDetailsModalOpen(true)}
              className="px-6 py-2 bg-legal-bronze text-white rounded-xl font-bold text-xs hover:brightness-110 transition-all flex items-center gap-2 shadow-lg shadow-legal-bronze/20"
            >
               Ver Detalhes <ArrowUpRight size={14} />
            </button>
         </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-8">
          
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm flex flex-col md:flex-row items-center gap-6">
            <img 
              src={user.avatar || `https://ui-avatars.com/api/?name=${user.name}&background=002B49&color=fff`} 
              className="w-24 h-24 rounded-[2rem] object-cover shadow-lg border-4 border-slate-50"
              alt="Avatar"
            />
            <div className="text-center md:text-left flex-1">
               <div className="flex flex-wrap items-center justify-center md:justify-start gap-2 mb-2">
                  <span className="bg-slate-100 text-slate-500 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">CLIENTE PREMIUM</span>
                  <span className="bg-blue-50 text-blue-600 text-[9px] font-black px-2 py-0.5 rounded uppercase tracking-tighter">{mainProcess.subject}</span>
               </div>
               <h1 className="text-3xl font-black text-slate-900 tracking-tight">Olá, {user.name.split(' ')[0]}!</h1>
               <p className="text-slate-500 font-medium text-sm mt-1">Sua transparência jurídica em tempo real.</p>
            </div>
          </div>

          {maternityStats && (
            <div className="bg-gradient-to-br from-white to-rose-50 p-8 rounded-[3rem] border border-rose-100 shadow-sm relative overflow-hidden group transition-all hover:shadow-xl">
               <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
                  <Baby size={120} className="text-rose-500" />
               </div>
               
               <div className="relative z-10">
                  <h3 className="text-xl font-black text-slate-900 flex items-center gap-2 mb-6">
                     <Baby className="text-rose-500" size={24} /> Monitoramento Gestacional
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                     <div className="space-y-4">
                        <div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Tempo de Gestação Atual</p>
                           <h4 className="text-4xl font-black text-rose-600">{maternityStats.currentMonths} <span className="text-sm text-slate-400">meses</span></h4>
                        </div>
                        <div className="space-y-1">
                           <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                              <span>Progresso</span>
                              <span>{Math.round((maternityStats.currentMonths/9)*100)}%</span>
                           </div>
                           <div className="h-3 bg-rose-100 rounded-full overflow-hidden">
                              <div className="h-full bg-rose-500 transition-all duration-1000" style={{ width: `${(maternityStats.currentMonths/9)*100}%` }}></div>
                           </div>
                        </div>
                     </div>

                     <div className="bg-white/50 p-6 rounded-[2rem] border border-rose-100/50 space-y-4">
                        <div className="flex items-center gap-3">
                           <div className="p-2 bg-rose-500 text-white rounded-xl shadow-lg shadow-rose-200"><Calendar size={20}/></div>
                           <div>
                              <p className="text-[10px] font-black text-slate-400 uppercase">Previsão de Parto</p>
                              <p className="text-lg font-bold text-slate-800">{maternityStats.dueDate}</p>
                           </div>
                        </div>
                        {maternityStats.isHighAlert && (
                          <div className="flex items-center gap-2 text-amber-600 font-bold text-[10px] uppercase bg-amber-50 p-2 rounded-lg">
                             <AlertTriangle size={14}/> Reta final: Avise-nos quando nascer!
                          </div>
                        )}
                     </div>
                  </div>
               </div>
            </div>
          )}

          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
             <h3 className="text-xl font-black text-slate-900 flex items-center gap-2">
                <FileSearch className="text-legal-navy" size={24} /> Acompanhamento Simplificado
             </h3>
             
             <div className="relative">
                <div className="absolute top-5 left-6 bottom-0 w-0.5 bg-slate-100 hidden sm:block"></div>
                <div className="space-y-10">
                   {[
                     { label: 'Documentação Recebida', date: '15/02', status: 'done', desc: 'Sua documentação inicial foi validada por nossa triagem.' },
                     { label: 'Pedido Protocolado', date: '22/02', status: 'done', desc: 'A petição inicial foi enviada com sucesso ao tribunal.' },
                     { label: 'Em Análise no Órgão', date: 'Hoje', status: 'active', desc: 'Aguardando o prazo legal para manifestação da parte contrária.' },
                     { label: 'Aguardando Decisão', date: '-', status: 'pending', desc: 'Fase final onde o juiz proferirá a sentença.' },
                   ].map((step, i) => (
                     <div key={i} className="flex gap-6 relative group">
                        <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 z-10 transition-all ${step.status === 'done' ? 'bg-emerald-500 text-white' : step.status === 'active' ? 'bg-legal-navy text-white animate-pulse shadow-xl' : 'bg-slate-50 text-slate-300'}`}>
                           {step.status === 'done' ? <CheckCircle2 size={24} /> : <div className="font-black text-xs">{i+1}</div>}
                        </div>
                        <div className="flex-1 pt-1">
                           <div className="flex justify-between items-center mb-1">
                              <h4 className={`font-black text-sm uppercase tracking-tight ${step.status === 'pending' ? 'text-slate-300' : 'text-slate-900'}`}>{step.label}</h4>
                              <span className="text-[10px] font-bold text-slate-400">{step.date}</span>
                           </div>
                           <p className={`text-xs font-medium leading-relaxed ${step.status === 'pending' ? 'text-slate-300' : 'text-slate-50'}`}>{step.desc}</p>
                        </div>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>

        <div className="space-y-8">
          
          <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-6">
             <div className="flex justify-between items-center">
                <h3 className="font-black text-slate-900 uppercase text-xs tracking-widest">Documentação</h3>
                <div className="flex gap-2">
                   <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded text-[9px] font-black">{documentStats.received}</div>
                   <div className="px-2 py-0.5 bg-rose-50 text-rose-600 rounded text-[9px] font-black">{documentStats.missing}</div>
                </div>
             </div>
             
             <div className="space-y-3">
                {mainProcess.documents?.map(doc => (
                  <div key={doc.id} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex items-center justify-between group hover:bg-white hover:shadow-md transition-all">
                     <div className="flex items-center gap-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${doc.status === 'Received' ? 'bg-emerald-100 text-emerald-600' : doc.status === 'Pending' ? 'bg-amber-100 text-amber-600' : 'bg-rose-100 text-rose-600'}`}>
                           <FileText size={18} />
                        </div>
                        <div className="min-w-0">
                           <p className="text-xs font-bold text-slate-700 truncate">{doc.name}</p>
                           <p className="text-[9px] font-black uppercase tracking-tighter opacity-50">
                              {doc.status === 'Received' ? 'Validado' : doc.status === 'Pending' ? 'Em Análise' : 'Não enviado'}
                           </p>
                        </div>
                     </div>
                     {doc.status !== 'Received' ? (
                       <button 
                        onClick={() => setIsUploadModalOpen(true)}
                        className="p-2 bg-white rounded-lg text-legal-navy hover:bg-legal-navy hover:text-white transition-all shadow-sm"
                       >
                          <UploadCloud size={16}/>
                       </button>
                     ) : (
                       <CheckCircle2 size={16} className="text-emerald-500 mr-2" />
                     )}
                  </div>
                ))}
             </div>

             <button 
              onClick={() => setIsUploadModalOpen(true)}
              className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold text-xs uppercase tracking-widest hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
             >
                <UploadCloud size={16}/> Enviar Documentos
             </button>
          </div>

          <div 
            onClick={handleStartChat}
            className="bg-legal-bronze p-8 rounded-[3rem] text-white shadow-xl shadow-legal-bronze/20 space-y-6 group cursor-pointer hover:-translate-y-1 transition-all"
          >
             <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-white/20 rounded-[1.5rem] flex items-center justify-center shadow-inner">
                   <MessageCircle size={32} />
                </div>
                <div>
                   <h3 className="text-xl font-black tracking-tight leading-none mb-1">Dúvidas?</h3>
                   <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">Fale no WhatsApp</p>
                </div>
             </div>
             
             <p className="text-sm font-medium leading-relaxed">Fale agora com um especialista. Nosso chat oficial do WhatsApp está disponível.</p>
             
             <div className="pt-2">
                <button className="w-full py-4 bg-white text-legal-bronze rounded-2xl font-black text-sm uppercase tracking-widest group-hover:scale-105 transition-transform flex items-center justify-center gap-2">
                   Iniciar WhatsApp <ExternalLink size={16} />
                </button>
             </div>
          </div>

          <div className="p-6 bg-slate-100 rounded-[2.5rem] flex items-center justify-between group cursor-pointer hover:bg-slate-200 transition-all">
             <div className="flex items-center gap-3">
                <Phone size={20} className="text-slate-400 group-hover:text-legal-navy transition-colors" />
                <span className="text-sm font-bold text-slate-500 group-hover:text-slate-900">Telefone do Escritório</span>
             </div>
             <ChevronRight size={18} className="text-slate-300" />
          </div>

        </div>
      </div>

      {/* --- MODAL: VER DETALHES --- */}
      {isDetailsModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsDetailsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
             <div className="bg-legal-navy p-10 text-white relative">
                <button onClick={() => setIsDetailsModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                <div className="flex items-center gap-6">
                   <div className="w-16 h-16 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-xl"><Gavel size={32} /></div>
                   <div>
                      <h3 className="text-3xl font-black tracking-tight">Espelho do Processo</h3>
                      <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">Dados Oficiais e Histórico</p>
                   </div>
                </div>
             </div>

             <div className="p-10 overflow-y-auto space-y-8 custom-scrollbar">
                <div className="grid grid-cols-2 gap-8 border-b border-slate-100 pb-8">
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Número do Processo</p>
                      <p className="text-sm font-black text-legal-navy">{mainProcess.number}</p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Tribunal / Vara</p>
                      <p className="text-sm font-bold text-slate-700">{mainProcess.court}</p>
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Tipo da Ação</p>
                      <p className="text-sm font-bold text-slate-700">{mainProcess.subject}</p>
                   </div>
                   <div className="space-y-1 text-right">
                      <p className="text-[10px] font-black text-slate-400 uppercase">Data de Abertura</p>
                      <p className="text-sm font-bold text-slate-700">{new Date(mainProcess.createdAt).toLocaleDateString('pt-BR')}</p>
                   </div>
                </div>

                <div className="space-y-6">
                   <h4 className="font-black text-slate-900 uppercase text-xs flex items-center gap-2">
                      <History size={16} className="text-legal-bronze" /> Histórico de Movimentações
                   </h4>
                   <div className="space-y-4">
                      {[
                        { date: '22/05/2024', event: 'Manifestação protocolada pelo escritório.' },
                        { date: '10/05/2024', event: 'Aguardando prazo da parte contrária.' },
                        { date: '28/04/2024', event: 'Citação eletrônica expedida com sucesso.' },
                        { date: '15/04/2024', event: 'Processo distribuído para a 2ª Vara Federal.' },
                      ].map((h, i) => (
                        <div key={i} className="flex gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                           <div className="text-[10px] font-black text-legal-navy shrink-0 pt-1">{h.date}</div>
                           <p className="text-xs font-medium text-slate-600 leading-relaxed">{h.event}</p>
                        </div>
                      ))}
                   </div>
                </div>

                <button onClick={() => setIsDetailsModalOpen(false)} className="w-full py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-xs tracking-widest hover:bg-slate-200 transition-all mt-4">Fechar Janela</button>
             </div>
          </div>
        </div>
      )}

      {/* --- MODAL: ENVIAR DOCUMENTOS --- */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => !uploading && setIsUploadModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 flex flex-col">
             <div className="p-10 text-center space-y-6">
                <div className={`w-20 h-20 rounded-[2rem] flex items-center justify-center mx-auto shadow-xl transition-colors ${uploading ? 'bg-blue-50 text-blue-500 animate-pulse' : 'bg-legal-bronze text-white'}`}>
                   {uploading ? <Loader2 size={40} className="animate-spin" /> : <UploadCloud size={40} />}
                </div>
                
                <div>
                   <h3 className="text-2xl font-black text-slate-900">Upload de Arquivos</h3>
                   <p className="text-slate-500 text-sm mt-1">Selecione fotos ou PDF dos seus documentos.</p>
                </div>

                {uploading ? (
                   <div className="space-y-4 py-4">
                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                         <div className="h-full bg-legal-navy transition-all duration-300" style={{ width: `${uploadProgress}%` }}></div>
                      </div>
                      <p className="text-[10px] font-black text-slate-400 uppercase animate-pulse">Criptografando e enviando... {uploadProgress}%</p>
                   </div>
                ) : (
                  <div 
                    onClick={handleFileSelect}
                    className="border-2 border-dashed border-slate-200 rounded-[2rem] p-12 hover:border-legal-bronze hover:bg-amber-50/30 transition-all cursor-pointer group"
                  >
                     <input type="file" ref={fileInputRef} className="hidden" onChange={onFileChange} multiple />
                     <FileText size={48} className="mx-auto text-slate-200 group-hover:text-legal-bronze transition-colors mb-4" />
                     <p className="text-xs font-bold text-slate-400 group-hover:text-legal-bronze">Toque para selecionar arquivos</p>
                  </div>
                )}

                {!uploading && (
                  <div className="flex gap-3 pt-4">
                     <button onClick={() => setIsUploadModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold uppercase text-xs">Cancelar</button>
                     <button onClick={handleFileSelect} className="flex-1 py-4 bg-legal-navy text-white rounded-2xl font-bold uppercase text-xs shadow-lg shadow-legal-navy/20">Escolher Arquivo</button>
                  </div>
                )}
             </div>
          </div>
        </div>
      )}
    </div>
  );
};
