
import React, { useState } from 'react';
import { 
  Users, 
  Search, 
  Plus, 
  Phone, 
  Mail, 
  Clock, 
  Calendar, 
  Edit3, 
  ChevronRight,
  FileText,
  AlertCircle,
  MoreVertical,
  CheckCircle2,
  Trash2,
  DollarSign,
  Briefcase,
  Scale
} from 'lucide-react';

interface Client {
  id: string;
  name: string;
  phone: string;
  email: string;
  status: 'Normal' | 'VIP' | 'Crítico';
  avatar?: string;
  lastAction: string;
}

export const ClientsView: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('1');

  const clients: Client[] = [
    { id: '1', name: 'Adina Sousa', phone: '92 98160-1718', email: 'adina.sousa@gmail.com', status: 'Normal', lastAction: 'Audiência marcada' },
    { id: '2', name: 'Amanda Sterling', phone: '+55 11 91234-5678', email: 'amanda@st.com', status: 'VIP', lastAction: 'Petição protocolada' },
    { id: '3', name: 'Elena Rodriguez', phone: '+55 11 93456-7890', email: 'elena.r@law.es', status: 'Normal', lastAction: 'Aguardando doc' },
    { id: '4', name: 'Emma Wilson', phone: '+55 11 95678-9012', email: 'emma@wilson.com', status: 'Crítico', lastAction: 'Recurso negado' },
    { id: '5', name: 'Straus 🐿️', phone: '55 92 92588407', email: 'straus@lexhub.com', status: 'VIP', lastAction: 'Finalizado' },
  ];

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedClient = clients.find(c => c.id === selectedClientId) || clients[0];

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-160px)] animate-in fade-in duration-500">
      
      {/* Sidebar de Clientes */}
      <aside className="w-full lg:w-80 flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden">
        <div className="p-8 space-y-6">
          <button className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 shadow-lg transition-all active:scale-95">
            <Plus size={20} />
            <span>Novo Cliente</span>
          </button>

          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
            <input 
              type="text" 
              placeholder="Buscar cliente..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none transition-all dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-2 pb-8 space-y-1">
          {filteredClients.map(client => (
            <button
              key={client.id}
              onClick={() => setSelectedClientId(client.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-3xl transition-all group ${selectedClientId === client.id ? 'bg-rose-50 dark:bg-rose-900/20 border-r-4 border-rose-500' : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-sm transition-transform group-hover:scale-110 ${client.id === '1' ? 'bg-rose-500' : 'bg-legal-navy dark:bg-slate-700'}`}>
                {client.name.substring(0, 2).toUpperCase()}
              </div>
              <div className="text-left overflow-hidden">
                <p className={`text-sm font-black truncate ${selectedClientId === client.id ? 'text-legal-navy dark:text-white' : 'text-slate-700 dark:text-slate-300'}`}>{client.name}</p>
                <p className="text-[10px] font-bold text-slate-400 truncate">{client.phone}</p>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Detalhes do Cliente */}
      <div className="flex-1 space-y-6">
        
        {/* Profile Header Card */}
        <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 transition-colors">
          <div className="w-24 h-24 rounded-[2rem] bg-rose-500 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-rose-500/30">
            {selectedClient.name.substring(0, 2).toUpperCase()}
          </div>
          
          <div className="flex-1 text-center md:text-left space-y-3">
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
              <h2 className="text-3xl font-black text-legal-navy dark:text-white tracking-tight">{selectedClient.name}</h2>
              <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedClient.status === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-100' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                {selectedClient.status}
              </span>
            </div>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 dark:text-slate-500 text-xs font-bold">
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <Briefcase size={14} className="text-slate-300" />
                <span>904385c9</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <Phone size={14} className="text-slate-300" />
                <span>{selectedClient.phone}</span>
              </div>
              <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                <Mail size={14} className="text-slate-300" />
                <span className="truncate max-w-[150px]">{selectedClient.email}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all">
              Agendar
            </button>
            <button className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all active:scale-95">
              Editar Perfil
            </button>
          </div>
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Content (History) */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter">Histórico de Processos</h3>
                <button className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors">Ver todos</button>
              </div>
              
              <div className="relative p-6 bg-slate-50/50 dark:bg-slate-800/30 rounded-3xl border border-slate-50 dark:border-slate-800 group hover:border-rose-100 dark:hover:border-rose-900/30 transition-all">
                <div className="absolute top-6 right-6 px-3 py-1 bg-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest">Ativo</div>
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl shadow-sm text-rose-500">
                      <Scale size={20} />
                    </div>
                    <div>
                      <h4 className="font-bold text-legal-navy dark:text-white">Ação Indenizatória</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">Protocolado em 12 de Jan, 2026</p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 dark:text-slate-400 bg-white/50 dark:bg-slate-900/50 p-4 rounded-2xl leading-relaxed italic">
                    "O cliente relatou danos materiais após incidente no local de trabalho. Documentação inicial enviada para análise do tribunal."
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase tracking-widest pt-2">
                    <div className="flex items-center gap-2">
                      <Clock size={12} />
                      <span>Último andamento: 17 de mar. de 2026</span>
                    </div>
                    <span className="text-legal-navy dark:text-white">Dra. Sarah Smith</span>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter mb-8">Arquivos do Caso</h3>
              <div className="flex items-center justify-center p-12 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-400 font-bold text-sm">
                Nenhum arquivo carregado ainda.
              </div>
            </div>
          </div>

          {/* Sidebar Area (Notes/Stats) */}
          <div className="space-y-6">
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
              <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter mb-4">Notas Jurídicas</h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl leading-relaxed min-h-[100px]">
                {selectedClient.status === 'VIP' ? 'Cliente de alta prioridade. Relacionamento estratégico com o escritório.' : 'Atendimento padrão. Necessário agendar retorno em 15 dias.'}
              </p>
            </div>

            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800">
              <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter mb-2">Snapshot</h3>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 dark:border-slate-800 pb-2">Controle Financeiro</p>
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Honorários Totais</p>
                    <p className="text-xl font-black text-legal-navy dark:text-white">R$ 12.500,00</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-2xl">
                    <AlertCircle size={20} />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Pendências</p>
                    <p className="text-xl font-black text-legal-navy dark:text-white">R$ 0,00</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
