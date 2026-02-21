
import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Zap, 
  Key, 
  Globe, 
  Copy, 
  RefreshCw, 
  ExternalLink, 
  Plus, 
  Check, 
  Trash2, 
  Code2, 
  Terminal,
  ShieldCheck,
  Eye,
  EyeOff,
  X,
  AlertCircle
} from 'lucide-react';

interface Webhook {
  id: string;
  url: string;
  events: string[];
  status: 'Active' | 'Inactive';
  lastTriggered?: string;
}

const AVAILABLE_EVENTS = [
  { id: 'process.created', label: 'Processo Criado' },
  { id: 'process.updated', label: 'Movimentação Processual' },
  { id: 'tenant.created', label: 'Novo Tenant Provisionado' },
  { id: 'tenant.suspended', label: 'Tenant Suspenso' },
  { id: 'billing.success', label: 'Pagamento Confirmado' },
  { id: 'billing.failed', label: 'Falha no Pagamento' },
];

export const Settings: React.FC = () => {
  const [apiKey, setApiKey] = useState('lh_live_51Pq9X2kLz8R2m5N0v1Q3W4E5R6T7Y8U9I0O');
  const [showKey, setShowKey] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [isWebhookModalOpen, setIsWebhookModalOpen] = useState(false);
  
  const [webhooks, setWebhooks] = useState<Webhook[]>([
    { id: '1', url: 'https://api.zapier.com/hooks/catch/12345/abcde', events: ['process.created', 'tenant.suspended'], status: 'Active', lastTriggered: '2024-05-20 14:30' },
    { id: '2', url: 'https://seu-erp.com.br/webhooks/lexhub', events: ['billing.success'], status: 'Active' }
  ]);

  const [newWebhook, setNewWebhook] = useState<{
    url: string;
    events: string[];
    status: 'Active' | 'Inactive';
  }>({
    url: '',
    events: [],
    status: 'Active'
  });

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => setShowFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setShowFeedback(`${label} copiado!`);
  };

  const generateNewKey = () => {
    const newKey = `lh_live_${Math.random().toString(36).substr(2, 24).toUpperCase()}`;
    setApiKey(newKey);
    setShowFeedback('Nova chave gerada com sucesso!');
  };

  const handleAddWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newWebhook.url || newWebhook.events.length === 0) return;

    const webhook: Webhook = {
      id: Math.random().toString(36).substr(2, 9),
      ...newWebhook
    };

    setWebhooks([webhook, ...webhooks]);
    setIsWebhookModalOpen(false);
    setNewWebhook({ url: '', events: [], status: 'Active' });
    setShowFeedback('Webhook configurado com sucesso!');
  };

  const toggleEvent = (eventId: string) => {
    setNewWebhook(prev => ({
      ...prev,
      events: prev.events.includes(eventId) 
        ? prev.events.filter(id => id !== eventId)
        : [...prev.events, eventId]
    }));
  };

  const deleteWebhook = (id: string) => {
    setWebhooks(webhooks.filter(w => w.id !== id));
    setShowFeedback('Webhook removido.');
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-20">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-legal-navy flex items-center gap-2">
            <SettingsIcon className="text-legal-bronze" /> Configurações do Sistema
          </h2>
          <p className="text-slate-500 text-sm font-medium">Gerencie o ecossistema técnico e integrações do LexHub.</p>
        </div>
        {showFeedback && (
          <div className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold animate-in slide-in-from-top-2 shadow-lg shadow-emerald-200">
            <Check size={14} /> {showFeedback}
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Lado Esquerdo - Navegação */}
        <div className="lg:col-span-1 space-y-4">
           <div className="bg-white rounded-3xl border border-slate-200 p-4 shadow-sm">
              <button className="w-full flex items-center gap-3 px-4 py-3 bg-legal-navy text-white rounded-2xl font-bold shadow-lg shadow-legal-navy/20">
                <Globe size={18} /> API & Integrações
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl font-bold transition-all mt-1">
                <ShieldCheck size={18} /> Segurança & Logs
              </button>
              <button className="w-full flex items-center gap-3 px-4 py-3 text-slate-500 hover:bg-slate-50 rounded-2xl font-bold transition-all mt-1">
                <Terminal size={18} /> Webhooks
              </button>
           </div>

           <div className="bg-legal-bronze/10 rounded-3xl p-6 border border-legal-bronze/20">
              <div className="flex items-center gap-3 text-legal-bronze mb-3">
                 <Code2 size={24} />
                 <h4 className="font-bold">Documentação</h4>
              </div>
              <p className="text-slate-600 text-sm mb-4">Acesse nosso guia completo para desenvolvedores e integre o LexHub ao seu fluxo.</p>
              <button className="flex items-center gap-2 text-legal-navy font-bold text-sm hover:underline">
                 Abrir API Docs <ExternalLink size={14} />
              </button>
           </div>
        </div>

        {/* Lado Direito */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Section: API Key */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-legal-navy text-white rounded-xl"><Key size={20} /></div>
                 <h3 className="font-bold text-slate-800">API Access Tokens</h3>
              </div>
              <button 
                onClick={generateNewKey}
                className="flex items-center gap-2 text-xs font-bold text-legal-navy hover:bg-slate-100 px-3 py-1.5 rounded-lg transition-all"
              >
                <RefreshCw size={14} /> Rotacionar Chave
              </button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Live API Key (Produção)</label>
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <input 
                      type={showKey ? "text" : "password"} 
                      readOnly 
                      value={apiKey}
                      className="w-full px-5 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-mono text-legal-navy"
                    />
                    <button 
                      onClick={() => setShowKey(!showKey)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-legal-navy transition-colors"
                    >
                      {showKey ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                  <button 
                    onClick={() => copyToClipboard(apiKey, 'API Key')}
                    className="p-3.5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-lg shadow-slate-200"
                  >
                    <Copy size={20} />
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Section: Webhooks */}
          <div className="bg-white rounded-[2rem] border border-slate-200 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 flex justify-between items-center">
              <div className="flex items-center gap-3">
                 <div className="p-2 bg-legal-bronze text-white rounded-xl"><Terminal size={20} /></div>
                 <h3 className="font-bold text-slate-800">Endpoint Webhooks</h3>
              </div>
              <button 
                onClick={() => setIsWebhookModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 bg-legal-navy text-white rounded-xl text-xs font-bold hover:brightness-110 shadow-lg shadow-legal-navy/10"
              >
                <Plus size={14} /> Novo Endpoint
              </button>
            </div>
            
            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">URL do Endpoint</th>
                    <th className="px-6 py-4">Eventos</th>
                    <th className="px-6 py-4">Status</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {webhooks.map(webhook => (
                    <tr key={webhook.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <div className="space-y-1">
                          <p className="text-sm font-bold text-slate-700 truncate max-w-[200px]">{webhook.url}</p>
                          {webhook.lastTriggered && (
                            <p className="text-[10px] text-slate-400">Último disparo: {webhook.lastTriggered}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <div className="flex flex-wrap gap-1">
                          {webhook.events.map(ev => (
                            <span key={ev} className="text-[9px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md border border-slate-200 uppercase">{ev}</span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-5">
                        <span className={`flex items-center gap-1.5 text-[10px] font-bold ${webhook.status === 'Active' ? 'text-emerald-600 bg-emerald-50' : 'text-slate-400 bg-slate-50'} px-2 py-0.5 rounded-full w-fit`}>
                          <div className={`w-1.5 h-1.5 rounded-full ${webhook.status === 'Active' ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'}`}></div>
                          {webhook.status === 'Active' ? 'ATIVO' : 'INATIVO'}
                        </span>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <div className="flex justify-end gap-2">
                           <button className="p-2 text-slate-400 hover:text-legal-navy transition-colors"><RefreshCw size={16} /></button>
                           <button 
                            onClick={() => deleteWebhook(webhook.id)}
                            className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                           >
                            <Trash2 size={16} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {webhooks.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-20 text-center">
                        <div className="flex flex-col items-center gap-2 opacity-30">
                          <Terminal size={48} />
                          <p className="font-bold">Nenhum webhook configurado</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Modal Novo Webhook */}
      {isWebhookModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsWebhookModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-legal-navy p-8 text-white relative">
              <button 
                onClick={() => setIsWebhookModalOpen(false)}
                className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"
              >
                <X size={24} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg">
                  <Terminal size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-white">Novo Webhook</h3>
                  <p className="text-white/60 text-sm">Receba notificações de eventos em tempo real.</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleAddWebhook} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">URL de Destino (Endpoint)</label>
                <input 
                  required 
                  type="url" 
                  placeholder="https://seu-servidor.com/webhook" 
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-legal-navy/5 outline-none transition-all"
                  value={newWebhook.url}
                  onChange={(e) => setNewWebhook({...newWebhook, url: e.target.value})}
                />
              </div>

              <div className="space-y-3">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Eventos para Disparo</label>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {AVAILABLE_EVENTS.map(event => (
                    <button
                      key={event.id}
                      type="button"
                      onClick={() => toggleEvent(event.id)}
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${
                        newWebhook.events.includes(event.id)
                          ? 'bg-legal-navy text-white border-legal-navy'
                          : 'bg-white border-slate-100 hover:border-slate-200 text-slate-600'
                      }`}
                    >
                      <span className="text-xs font-bold">{event.label}</span>
                      {newWebhook.events.includes(event.id) && <Check size={14} />}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                <div className="flex items-center gap-3">
                  <div className={`w-3 h-3 rounded-full ${newWebhook.status === 'Active' ? 'bg-emerald-500' : 'bg-slate-300'}`}></div>
                  <span className="text-sm font-bold text-slate-700">Status do Endpoint</span>
                </div>
                <select 
                  className="bg-transparent text-sm font-bold text-legal-navy outline-none cursor-pointer"
                  value={newWebhook.status}
                  onChange={(e) => setNewWebhook({...newWebhook, status: e.target.value as any})}
                >
                  <option value="Active">Ativo</option>
                  <option value="Inactive">Inativo</option>
                </select>
              </div>

              <div className="pt-4 flex gap-4">
                <button 
                  type="button" 
                  onClick={() => setIsWebhookModalOpen(false)} 
                  className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold hover:bg-slate-200 transition-all"
                >
                  Cancelar
                </button>
                <button 
                  type="submit" 
                  disabled={!newWebhook.url || newWebhook.events.length === 0}
                  className="flex-1 py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20 hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  Salvar Webhook
                </button>
              </div>
              
              {!newWebhook.events.length && newWebhook.url && (
                <div className="flex items-center gap-2 text-amber-600 bg-amber-50 p-3 rounded-xl border border-amber-100 animate-in fade-in slide-in-from-top-1">
                  <AlertCircle size={16} />
                  <p className="text-[10px] font-bold uppercase">Selecione ao menos um evento para continuar</p>
                </div>
              )}
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
