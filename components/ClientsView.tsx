
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
  Scale,
  X,
  Save,
  UserPlus
} from 'lucide-react';

import { useTenant } from '../services/tenantContext';
import { getClients, createClient, updateClient, deleteClient } from '../services/supabaseService';
import { Client } from '../types';

interface ClientsViewProps {
  onNavigate?: (tab: string) => void;
}

export const ClientsView: React.FC<ClientsViewProps> = ({ onNavigate }) => {
  const { tenant } = useTenant();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [clients, setClients] = useState<Client[]>([]);

  const loadClients = async () => {
    if (!tenant?.id) return;
    try {
      setIsLoading(true);
      const data = await getClients(tenant.id);
      setClients(data);
      if (data.length > 0 && !selectedClientId) {
        setSelectedClientId(data[0].id);
      }
    } catch (err) {
      console.error('Erro ao buscar clientes:', err);
    } finally {
      setIsLoading(false);
    }
  };

  React.useEffect(() => {
    loadClients();
  }, [tenant?.id]);

  // Form de cliente
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    status: 'Normal'
  });

  const filteredClients = clients.filter(c => c.name.toLowerCase().includes(searchQuery.toLowerCase()));
  const selectedClient = clients.find(c => c.id === selectedClientId) || clients[0];

  const handleOpenModal = (client?: Client) => {
    if (client) {
      setEditingClient(client);
      setClientForm(client);
    } else {
      setEditingClient(null);
      setClientForm({ status: 'Normal', name: '', phone: '', email: '' });
    }
    setIsModalOpen(true);
  };

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingClient) {
        await updateClient(editingClient.id, tenant?.id || null, clientForm);
        setClients(clients.map(c => c.id === editingClient.id ? { ...c, ...clientForm } as Client : c));
      } else {
        const newClient = await createClient(tenant?.id || null, clientForm as any);
        setClients([newClient, ...clients]);
        setSelectedClientId(newClient.id);
      }
      setIsModalOpen(false);
      loadClients();
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar cliente.');
    }
  };

  const handleDeleteClient = async (id: string) => {
    if (confirm('Tem certeza que deseja remover este cliente?')) {
      try {
        await deleteClient(id, tenant?.id || null);
        const filtered = clients.filter(c => c.id !== id);
        setClients(filtered);
        if (selectedClientId === id) setSelectedClientId(filtered[0]?.id || null);
        setIsModalOpen(false);
      } catch (err) {
        console.error(err);
        alert('Erro ao excluir cliente.');
      }
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-160px)] animate-in fade-in duration-500">
      
      {/* Sidebar de Clientes */}
      <aside className="w-full lg:w-80 flex flex-col bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors overflow-hidden">
        <div className="p-8 space-y-6">
          <button 
            onClick={() => handleOpenModal()}
            className="w-full bg-rose-500 hover:bg-rose-600 text-white py-4 rounded-2xl font-black uppercase tracking-widest flex items-center justify-center gap-2 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
          >
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
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-black text-white shadow-sm transition-transform group-hover:scale-110 ${selectedClientId === client.id ? 'bg-rose-500' : 'bg-legal-navy dark:bg-slate-700'}`}>
                {(client.name || '??').substring(0, 2).toUpperCase()}
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
        
        {selectedClient ? (
          <>
            {/* Profile Header Card */}
            <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center gap-8 transition-colors">
              <div className="w-24 h-24 rounded-[2rem] bg-rose-500 flex items-center justify-center text-3xl font-black text-white shadow-2xl shadow-rose-500/30">
                {(selectedClient.name || '??').substring(0, 2).toUpperCase()}
              </div>
              
              <div className="flex-1 text-center md:text-left space-y-3">
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <h2 className="text-3xl font-black text-legal-navy dark:text-white tracking-tight">{selectedClient.name}</h2>
                  <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${selectedClient.status === 'VIP' ? 'bg-amber-50 text-amber-600 border-amber-100' : selectedClient.status === 'Crítico' ? 'bg-rose-100 text-rose-700 border-rose-200' : 'bg-rose-50 text-rose-600 border-rose-100'}`}>
                    {selectedClient.status}
                  </span>
                </div>
                
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 text-slate-400 dark:text-slate-500 text-xs font-bold">
                  <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-xl border border-slate-100 dark:border-slate-700">
                    <Briefcase size={14} className="text-slate-300" />
                    <span>ID-{selectedClient.id.substring(0, 6)}</span>
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
                <button 
                  onClick={() => onNavigate?.('agenda')}
                  className="bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest hover:bg-slate-100 dark:hover:bg-slate-700 transition-all"
                >
                  Agendar
                </button>
                <button 
                  onClick={() => handleOpenModal(selectedClient)}
                  className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-4 rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-rose-500/20 transition-all active:scale-95"
                >
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
                    <button 
                      onClick={() => onNavigate?.('processes')}
                      className="text-[10px] font-black text-slate-400 hover:text-rose-500 uppercase tracking-widest transition-colors"
                    >
                      Ver todos
                    </button>
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
                          <span>{selectedClient.dataCadastro ? new Date(selectedClient.dataCadastro).toLocaleDateString('pt-BR') : 'Hoje'}</span>
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
                  <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter mb-4">Informações</h3>
                  <p className="text-sm font-bold text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800 p-6 rounded-3xl leading-relaxed min-h-[100px]">
                    Cadastrado em: {' '}
                    <span className="text-slate-700 dark:text-slate-200 uppercase tracking-widest">{selectedClient.dataCadastro ? new Date(selectedClient.dataCadastro).toLocaleDateString('pt-BR') : 'Hoje'}</span>
                  </p>
                </div>

                <div 
                  onClick={() => onNavigate?.('billing')}
                  className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-all bg-gradient-to-br from-white to-slate-50 dark:from-slate-900 dark:to-slate-800 cursor-pointer hover:shadow-md group"
                >
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter">Resumo Financeiro</h3>
                    <ChevronRight size={16} className="text-slate-300 group-hover:text-rose-500 transition-colors" />
                  </div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-6 border-b border-slate-50 dark:border-slate-800 pb-2">Conectado ao Faturamento</p>
                  <div className="space-y-6">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-500 rounded-2xl">
                        <DollarSign size={20} />
                      </div>
                      <div>
                        <p className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Honorários Totais</p>
                        <p className="text-xl font-black text-legal-navy dark:text-white">R$ {selectedClient.status === 'VIP' ? '12.500,00' : '0,00'}</p>
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
          </>
        ) : (
          <div className="flex h-full items-center justify-center p-20 text-slate-400 font-bold uppercase tracking-widest text-xs">
            Selecione um cliente para ver os detalhes
          </div>
        )}
      </div>

      {/* Modal de Cliente (Novo/Editar) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter flex items-center gap-2">
                {editingClient ? <Edit3 size={20} className="text-rose-500" /> : <UserPlus size={20} className="text-rose-500" />}
                {editingClient ? 'Editar Perfil' : 'Cadastrar Novo Cliente'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <input 
                  type="text"
                  required
                  value={clientForm.name || ''}
                  onChange={(e) => setClientForm({...clientForm, name: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  placeholder="Ex: João da Silva"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone</label>
                  <input 
                    type="text"
                    required
                    value={clientForm.phone || ''}
                    onChange={(e) => setClientForm({...clientForm, phone: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                    placeholder="(92) 90000-0000"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                  <select 
                    value={clientForm.status}
                    onChange={(e) => setClientForm({...clientForm, status: e.target.value as any})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  >
                    <option value="Normal">Normal</option>
                    <option value="VIP">VIP</option>
                    <option value="Crítico">Crítico</option>
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                <input 
                  type="email"
                  required
                  value={clientForm.email || ''}
                  onChange={(e) => setClientForm({...clientForm, email: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  placeholder="email@exemplo.com"
                />
              </div>

              <div className="pt-6 flex gap-4">
                {editingClient && (
                  <button
                    type="button"
                    onClick={() => handleDeleteClient(editingClient.id)}
                    className="px-6 py-4 bg-rose-50 text-rose-500 rounded-2xl font-bold hover:bg-rose-100 transition-colors flex items-center justify-center"
                  >
                    <Trash2 size={20} />
                  </button>
                )}
                <button
                  type="submit"
                  className="flex-1 py-4 bg-legal-navy dark:bg-rose-500 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl transition-all hover:brightness-110 active:scale-95 flex items-center justify-center gap-2"
                >
                  <Save size={20} />
                  {editingClient ? 'Salvar Alterações' : 'Cadastrar Cliente'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
