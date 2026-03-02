
import React, { useState, useEffect } from 'react';
import { useTenant } from '../services/tenantContext';
import { supabase } from '../services/supabaseClient';
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
  const { tenantId } = useTenant();
  const [apiKeys, setApiKeys] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
  const [isApiKeyModalOpen, setIsApiKeyModalOpen] = useState(false);
  const [newKeySnippet, setNewKeySnippet] = useState<{ id: string, rawKey: string } | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
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
    if (tenantId) {
      loadApiKeys();
    }
  }, [tenantId]);

  const loadApiKeys = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const response = await fetch(`${apiUrl}/api/api-keys`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });
      if (response.ok) {
        const data = await response.json();
        setApiKeys(data);
      }
    } catch (error) {
      console.error('Error loading API keys:', error);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setShowFeedback({ message: `${label} copiado!`, type: 'success' });
  };

  const handleCreateKey = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newKeyName || loading) return;

    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const response = await fetch(`${apiUrl}/api/api-keys`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session?.access_token}`
        },
        body: JSON.stringify({ name: newKeyName })
      });

      if (response.ok) {
        const result = await response.json();
        console.log('[Settings] Chave gerada com sucesso:', result);
        setNewKeySnippet(result);
        setShowFeedback({ message: 'Nova chave gerada com sucesso!', type: 'success' });
        loadApiKeys();
        setIsApiKeyModalOpen(false);
        setNewKeyName('');
      } else {
        const errorData = await response.json();
        console.error('[Settings] Erro ao criar chave de API:', errorData);
        setShowFeedback({ message: `Erro: ${errorData.error || 'Falha na comunicação com o servidor'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error creating API key:', error);
      setShowFeedback({ message: 'Erro de rede ou servidor ao gerar chave.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteKey = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja revogar esta chave? Sistema externos que a utilizam perderão o acesso.')) return;

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3005';
      const response = await fetch(`${apiUrl}/api/api-keys/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`
        }
      });

      if (response.ok) {
        setShowFeedback({ message: 'Chave revogada.', type: 'success' });
        loadApiKeys();
      }
    } catch (error) {
      console.error('Error deleting API key:', error);
    }
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
    setShowFeedback({ message: 'Webhook configurado com sucesso!', type: 'success' });
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
    setShowFeedback({ message: 'Webhook removido.', type: 'success' });
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
          <div className={`flex items-center gap-2 px-4 py-2 ${showFeedback.type === 'success' ? 'bg-emerald-600 shadow-emerald-200' : 'bg-rose-600 shadow-rose-200'} text-white rounded-xl text-xs font-bold animate-in slide-in-from-top-2 shadow-lg`}>
            {showFeedback.type === 'success' ? <Check size={14} /> : <AlertCircle size={14} />} {showFeedback.message}
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
                onClick={() => setIsApiKeyModalOpen(true)}
                className="flex items-center gap-2 text-xs font-bold text-legal-navy hover:bg-slate-100 px-4 py-2 rounded-xl transition-all border border-slate-200"
              >
                <Plus size={14} /> Criar Novo Token
              </button>
            </div>

            <div className="p-0 overflow-x-auto">
              <table className="w-full text-left">
                <thead className="bg-slate-50/50">
                  <tr className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="px-6 py-4">Nome / Apelido</th>
                    <th className="px-6 py-4">Preview</th>
                    <th className="px-6 py-4">Último Uso</th>
                    <th className="px-6 py-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {apiKeys.map(key => (
                    <tr key={key.id} className="hover:bg-slate-50/30 transition-colors">
                      <td className="px-6 py-5">
                        <p className="text-sm font-bold text-slate-700">{key.name}</p>
                        <p className="text-[10px] text-slate-400">Criado em: {new Date(key.created_at).toLocaleDateString()}</p>
                      </td>
                      <td className="px-6 py-5">
                        <code className="text-xs bg-slate-100 px-2 py-1 rounded text-legal-navy font-mono">{key.key_preview}</code>
                      </td>
                      <td className="px-6 py-5">
                        <p className="text-xs text-slate-500 font-medium">
                          {key.last_used_at ? new Date(key.last_used_at).toLocaleString() : 'Nunca usado'}
                        </p>
                      </td>
                      <td className="px-6 py-5 text-right">
                        <button
                          onClick={() => handleDeleteKey(key.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                          title="Revogar Chave"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {apiKeys.length === 0 && (
                    <tr>
                      <td colSpan={4} className="p-12 text-center">
                        <p className="text-sm text-slate-400 font-medium italic">Nenhuma chave de API gerada.</p>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
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
        // ... (existing code for webhook modal)
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
                  onChange={(e) => setNewWebhook({ ...newWebhook, url: e.target.value })}
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
                      className={`flex items-center justify-between p-4 rounded-xl border transition-all text-left ${newWebhook.events.includes(event.id)
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
                  onChange={(e) => setNewWebhook({ ...newWebhook, status: e.target.value as any })}
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

      {/* Modal: Criar Nova Chave */}
      {isApiKeyModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsApiKeyModalOpen(false)}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
            <div className="bg-legal-navy p-8 text-white relative">
              <button onClick={() => setIsApiKeyModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-legal-bronze rounded-xl flex items-center justify-center shadow-lg"><Key size={24} /></div>
                <div>
                  <h3 className="text-xl font-bold text-white">Novo Token de Acesso</h3>
                  <p className="text-white/60 text-xs">Dê um nome para identificar sua chave.</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleCreateKey} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Chave</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: Integração ERP, Bot WhatsApp, etc."
                  className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-legal-navy/5 outline-none transition-all"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                />
              </div>
              <button
                type="submit"
                disabled={!newKeyName || loading}
                className="w-full py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20 hover:brightness-110 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
              >
                {loading ? <RefreshCw className="animate-spin" size={18} /> : <Check size={18} />}
                Gerar Chave de Produção
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Exibir Chave Gerada (ONLY ONCE) */}
      {newKeySnippet && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-md animate-in fade-in"></div>
          <div className="relative bg-white rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 border-2 border-emerald-500">
            <div className="bg-emerald-600 p-10 text-white text-center">
              <div className="w-20 h-20 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck size={48} />
              </div>
              <h3 className="text-3xl font-black mb-2">Chave Gerada com Sucesso!</h3>
              <p className="text-emerald-100 font-medium">Guarde esta chave em um local seguro. Por segurança, você não poderá vê-la novamente.</p>
            </div>
            <div className="p-10 space-y-8">
              <div className="space-y-3">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block">Sua Secret Key</label>
                <div className="flex gap-2">
                  <div className="flex-1 bg-slate-50 border-2 border-slate-100 rounded-2xl p-5 break-all">
                    <code className="text-sm font-mono font-bold text-legal-navy">{newKeySnippet.rawKey}</code>
                  </div>
                  <button
                    onClick={() => copyToClipboard(newKeySnippet.rawKey, 'Secret Key')}
                    className="p-5 bg-slate-900 text-white rounded-2xl hover:bg-slate-800 transition-all shadow-xl"
                  >
                    <Copy size={24} />
                  </button>
                </div>
              </div>

              <div className="p-6 bg-amber-50 border border-amber-100 rounded-2xl flex items-start gap-4">
                <AlertCircle className="text-amber-600 shrink-0" size={24} />
                <p className="text-xs text-amber-800 font-bold leading-relaxed">
                  Esta é a única vez que você verá esta chave completa. Se perdê-la, você precisará revogar este token e gerar um novo.
                </p>
              </div>

              <button
                onClick={() => setNewKeySnippet(null)}
                className="w-full py-5 bg-legal-navy text-white rounded-2xl font-black text-lg shadow-2xl shadow-legal-navy/30 hover:scale-[1.02] active:scale-[0.98] transition-all"
              >
                Já Copiei, Pode Fechar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
