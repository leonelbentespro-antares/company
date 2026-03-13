
import React, { useState, useEffect, useRef } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  MessageSquare, Plus, Settings2, QrCode, Power, BrainCircuit, CheckCircle2,
  Clock, Zap, Smartphone, Info, X, RefreshCw, MoreVertical, Trash2,
  ShieldCheck, ToggleLeft as Toggle, MessageCircle, ChevronRight, Save, Loader2,
  PowerOff, Key, Lock, Globe, Cpu, Sparkles, Binary, TerminalSquare
} from 'lucide-react';
import { AIAgent } from '../types.ts';
import { getAIAgents, createAIAgent, updateAIAgent, getIntegrations, upsertIntegration } from '../services/supabaseService.ts';
import { useTenant } from '../services/tenantContext.tsx';
import { useLanguage } from '../services/languageContext.tsx';

export const AIAgents: React.FC = () => {
  const { tenantId } = useTenant();
  const { t, locale } = useLanguage();
  const [agents, setAgents] = useState<AIAgent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'agents' | 'integrations'>('agents');

  useEffect(() => {
    if (!tenantId) return;
    getAIAgents(tenantId)
      .then(setAgents)
      .catch(err => console.error('Erro ao carregar agentes:', err))
      .finally(() => setIsLoading(false));
  }, [tenantId]);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalStep, setModalStep] = useState<'config' | 'pairing'>('config');
  const [editingAgent, setEditingAgent] = useState<AIAgent | null>(null);
  const [loading, setLoading] = useState(false);
  const [showFeedback, setShowFeedback] = useState<string | null>(null);
  const [formData, setFormData] = useState({ name: '', personality: '', skills: '' });
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => setShowFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  const handleOpenCreate = () => {
    setEditingAgent(null);
    setFormData({ name: '', personality: '', skills: '' });
    setModalStep('config');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (agent: AIAgent) => {
    setEditingAgent(agent);
    setFormData({ name: agent.name, personality: agent.personality, skills: agent.skills || '' });
    setModalStep('config');
    setIsModalOpen(true);
  };

  const handleFileImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      setFormData(prev => ({ ...prev, skills: content }));
      setShowFeedback(t.aiAgents.feedback.importSuccess);
    };
    reader.readAsText(file);
  };

  const handleSaveAgent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingAgent) {
      try {
        await updateAIAgent(editingAgent.id, tenantId, {
          name: formData.name,
          personality: formData.personality,
          skills: formData.skills
        });
        setAgents(prev => prev.map(a => a.id === editingAgent.id ? {
          ...a,
          name: formData.name,
          personality: formData.personality,
          skills: formData.skills
        } : a));
        setIsModalOpen(false);
        setShowFeedback(t.aiAgents.feedback.updateSuccess);
      } catch (err) {
        console.error('Erro ao atualizar agente:', err);
        setShowFeedback(t.aiAgents.feedback.updateError);
      }
    } else {
      setModalStep('pairing');
    }
  };

  const toggleAgentStatus = async (id: string) => {
    const agent = agents.find(a => a.id === id);
    if (!agent) return;
    const newStatus = agent.status === 'Active' ? 'Disconnected' : 'Active';
    try {
      await updateAIAgent(id, tenantId, { status: newStatus });
      setAgents(prev => prev.map(a => a.id === id ? { ...a, status: newStatus } : a));
      setShowFeedback(t.aiAgents.feedback.statusSuccess(newStatus));
    } catch (err) {
      console.error('Erro ao alterar status do agente:', err);
      setShowFeedback(t.aiAgents.feedback.statusError);
    }
  };

  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairCodeData, setPairCodeData] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('');
  const pollTimeout = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (!isModalOpen) {
      if (pollTimeout.current) clearTimeout(pollTimeout.current);
      setQrCodeData(null);
      setPairCodeData(null);
    }
  }, [isModalOpen]);

  const pollStatus = async () => {
    if (!tenantId) return;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    try {
      const res = await fetch(`${apiUrl}/api/whatsapp/status/${tenantId}`);
      if (!res.ok) throw new Error('Falha HTTP do Backend');

      const data = await res.json();

      if (data.status === 'QR_READY' && data.qr) {
        setConnectionStatus(t.aiAgents.feedback.awaitingQr);
        setQrCodeData(data.qr);
        setPairCodeData(null);
        setLoading(false);
      } else if (data.status === 'PAIR_CODE_READY' && data.paircode) {
        setConnectionStatus(t.aiAgents.feedback.useCode);
        setPairCodeData(data.paircode);
        setQrCodeData(null);
        setLoading(false);
      } else if (data.status === 'Connected') {
        setConnectionStatus(t.aiAgents.feedback.connected);
        setShowFeedback(t.aiAgents.feedback.whatsappConnected);

        try {
          const newAgent = await createAIAgent(tenantId, {
            name: formData.name || 'Assistente WhatsApp',
            personality: formData.personality || 'Atendimento',
            skills: formData.skills,
            status: 'Active',
            whatsappNumber: data.user?.id?.split(':')[0] || 'Desconhecido',
            totalInteractions: 0
          });
          setAgents(prev => [newAgent, ...prev]);
        } catch (e) { console.error('Erro ao salvar agente:', e) }

        setIsModalOpen(false);
        setQrCodeData(null);
        return;
      } else {
        setConnectionStatus(t.aiAgents.feedback.startingSession);
      }

      if (modalStep === 'pairing' && data.status !== 'Connected') {
        pollTimeout.current = setTimeout(pollStatus, 3000);
      }
    } catch (err) {
      console.error('Erro no polling:', err);
      pollTimeout.current = setTimeout(pollStatus, 5000);
    }
  };

  const startRealConnection = async () => {
    setLoading(true);
    setConnectionStatus('Requisitando código via API...');
    setQrCodeData(null);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/whatsapp/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId })
      });
      pollStatus();
    } catch (err) {
      console.error(err);
      setShowFeedback(t.aiAgents.feedback.pairingError);
      setLoading(false);
    }
  };

  const deleteAgent = async (id: string) => {
    try {
      const { supabase } = await import('../services/supabaseClient.ts');
      await supabase.from('ai_agents').delete().eq('id', id).eq('tenant_id', tenantId);
      setAgents(agents.filter(a => a.id !== id));
      setShowFeedback(t.aiAgents.feedback.agentRemoved);
    } catch (err) {
      console.error('Erro ao deletar agente:', err);
      setShowFeedback(t.aiAgents.feedback.removeError);
    }
  };



  // Integrations Logic
  const [apiKeys, setApiKeys] = useState<{ [key: string]: string }>({
    openai: '',
    anthropic: '',
    xai: '',
    meta: '',
    google: ''
  });

  useEffect(() => {
    loadIntegrations();
  }, []);

  const loadIntegrations = async () => {
    if (!tenantId) return;
    try {
      const integrations = await getIntegrations(tenantId);
      const keys: { [key: string]: string } = {};
      integrations.forEach(i => {
        if (i.settings && i.settings.apiKey) {
          keys[i.provider] = i.settings.apiKey;
        }
      });
      setApiKeys(prev => ({ ...prev, ...keys }));
    } catch (error) {
      console.error('Error loading integrations:', error);
    }
  };

  const handleSaveKey = async (provider: string, key: string) => {
    try {
      if (!tenantId) throw new Error('Tenant ID is required');
      await upsertIntegration({
        tenantId: tenantId,
        provider: provider,
        settings: {
          apiKey: key,
          enabled: true
        }
      });
      const newKeys = { ...apiKeys, [provider]: key };
      setApiKeys(newKeys);
      setShowFeedback(t.aiAgents.feedback.apiKeySaved(provider.charAt(0).toUpperCase() + provider.slice(1)));
    } catch (error) {
      console.error('Error saving API key:', error);
      setShowFeedback(t.aiAgents.feedback.apiKeyError);
    }
  };

  const INTEGRATIONS = [
    { id: 'openai', name: 'ChatGPT (OpenAI)', icon: <MessageSquare size={24} />, description: 'Modelos GPT-4 e GPT-3.5 Turbo.' },
    { id: 'anthropic', name: 'Claude (Anthropic)', icon: <BrainCircuit size={24} />, description: 'Modelos Claude 3 Opus, Sonnet e Haiku.' },
    { id: 'xai', name: 'Grok (xAI)', icon: <TerminalSquare size={24} />, description: 'Acesso ao modelo Grok-1 da xAI.' },
    { id: 'meta', name: 'Llama (Meta)', icon: <Binary size={24} />, description: 'Integração com Llama 3 via API.' },
    { id: 'google', name: 'Gemini (Google)', icon: <Sparkles size={24} />, description: 'Modelos Gemini Pro e Ultra.' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold text-legal-navy dark:text-white flex items-center gap-3">
            <div className="p-2 bg-legal-navy text-white rounded-xl shadow-lg"><MessageSquare size={24} /></div>
            {t.aiAgents.title}
          </h2>
          <p className="text-slate-500 dark:text-slate-400 font-medium">{t.aiAgents.subtitle}</p>
        </div>

        {activeTab === 'agents' && (
          <button onClick={handleOpenCreate} className="px-6 py-3 bg-legal-navy text-white rounded-2xl font-bold hover:brightness-110 shadow-xl transition-all flex items-center gap-2">
            <Plus size={20} /> {t.aiAgents.newAgent}
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 bg-slate-100 dark:bg-slate-800 p-1.5 rounded-2xl w-fit">
        <button
          onClick={() => setActiveTab('agents')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all ${activeTab === 'agents'
            ? 'bg-white dark:bg-slate-700 text-legal-navy dark:text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          {t.aiAgents.myAgents}
        </button>
        <button
          onClick={() => setActiveTab('integrations')}
          className={`px-6 py-2.5 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === 'integrations'
            ? 'bg-white dark:bg-slate-700 text-legal-navy dark:text-white shadow-sm'
            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
        >
          <Globe size={16} /> {t.aiAgents.integrations}
        </button>
      </div>

      {activeTab === 'agents' ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {agents.map((agent) => (
            <div key={agent.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden">
              {/* ... Agent Card Content ... */}
              <div className="absolute top-0 right-0 p-8">
                <div className={`flex items-center gap-2 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${agent.status === 'Active' ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${agent.status === 'Active' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`}></div>
                  {agent.status === 'Active' ? t.aiAgents.connected : t.aiAgents.disconnected}
                </div>
              </div>
              <div className="flex items-start gap-6 mb-8">
                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shrink-0 transition-all duration-500 shadow-inner ${agent.status === 'Active' ? 'bg-slate-50 dark:bg-slate-800 text-legal-bronze group-hover:bg-legal-navy group-hover:text-white' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 opacity-60'}`}>
                  <BrainCircuit size={32} />
                </div>
                <div className="space-y-1 pr-24">
                  <h3 className={`text-xl font-bold transition-colors ${agent.status === 'Active' ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{agent.name}</h3>
                  <p className="text-xs text-slate-400 font-bold uppercase">
                    {locale === 'en' ? 'Created on' : locale === 'es' ? 'Creado en' : 'Criado em'} {new Date(agent.createdAt).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <div className="space-y-4 mb-8">
                <div className={`p-4 rounded-2xl border min-h-[100px] transition-colors ${agent.status === 'Active' ? 'bg-slate-50 dark:bg-slate-800/50 border-slate-100 dark:border-slate-800' : 'bg-slate-100/50 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'}`}>
                  <p className="text-sm text-slate-600 dark:text-slate-400 font-medium italic">"{agent.personality}"</p>
                  {agent.skills && (
                    <div className="mt-4 pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">{t.aiAgents.skillsLabel}</p>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-3 font-mono leading-relaxed">{agent.skills}</p>
                    </div>
                  )}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => toggleAgentStatus(agent.id)}
                  className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${agent.status === 'Active'
                    ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                    : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                    }`}
                >
                  {agent.status === 'Active' ? <><PowerOff size={16} /> {t.aiAgents.deactivate}</> : <><Power size={16} /> {t.aiAgents.activate}</>}
                </button>
                <button onClick={() => handleOpenEdit(agent)} className="p-3 bg-slate-900 text-white rounded-xl font-bold text-xs hover:bg-slate-800 transition-all flex items-center justify-center gap-2 shadow-sm">
                  <Settings2 size={16} />
                </button>
                <button onClick={() => deleteAgent(agent.id)} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 border border-slate-100 dark:border-slate-700 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
          {INTEGRATIONS.map((integration) => (
            <div key={integration.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm flex flex-col gap-6">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-legal-navy dark:text-white">
                    {integration.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-bold text-legal-navy dark:text-white">{integration.name}</h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 font-medium">{integration.description}</p>
                  </div>
                </div>
                <div className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest flex items-center gap-2 ${apiKeys[integration.id] ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                  <div className={`w-2 h-2 rounded-full ${apiKeys[integration.id] ? 'bg-emerald-500' : 'bg-slate-400'}`}></div>
                  {apiKeys[integration.id] ? t.aiAgents.connected : (locale === 'en' ? 'Not Configured' : locale === 'es' ? 'No Configurado' : 'Não Configurado')}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">API Key</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    type="password"
                    placeholder={(locale === 'en' ? 'Insert your key ' : locale === 'es' ? 'Inserte su clave ' : 'Insira sua chave ') + integration.name}
                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl font-medium dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5 text-sm"
                    value={apiKeys[integration.id] || ''}
                    onChange={(e) => setApiKeys({ ...apiKeys, [integration.id]: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => handleSaveKey(integration.id, apiKeys[integration.id])}
                  disabled={!apiKeys[integration.id]}
                  className="w-full py-3 bg-legal-navy text-white rounded-xl font-bold shadow-lg shadow-legal-navy/20 hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 text-sm"
                >
                  <Save size={16} /> {t.aiAgents.saveIntegration}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
            {modalStep === 'config' ? (
              <>
                <div className="bg-legal-navy p-8 text-white relative">
                  <button onClick={() => setIsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg"><Plus size={32} /></div>
                    <h3 className="text-2xl font-bold">{t.aiAgents.configTitle}</h3>
                  </div>
                </div>
                <form onSubmit={handleSaveAgent} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto custom-scrollbar">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.aiAgents.nameLabel}</label>
                      <input required type="text" className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-legal-navy/10" value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">{t.aiAgents.personalityLabel}</label>
                      <textarea required placeholder={t.aiAgents.personalityPlaceholder} className="w-full h-24 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium dark:text-white outline-none resize-none focus:ring-2 focus:ring-legal-navy/10" value={formData.personality} onChange={(e) => setFormData({ ...formData, personality: e.target.value })} />
                    </div>
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Habilidades & Conhecimento (Skills)</label>
                        <button
                          type="button"
                          onClick={() => fileInputRef.current?.click()}
                          className="text-[10px] font-bold text-legal-bronze hover:underline flex items-center gap-1"
                        >
                          <Plus size={12} /> {t.aiAgents.importFile}
                        </button>
                        <input
                          type="file"
                          ref={fileInputRef}
                          className="hidden"
                          accept=".txt,.json,.csv"
                          onChange={handleFileImport}
                        />
                      </div>
                      <textarea
                        className="w-full h-32 px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-mono dark:text-teal-400 outline-none resize-none focus:ring-2 focus:ring-legal-navy/10"
                        placeholder={t.aiAgents.skillsPlaceholder}
                        value={formData.skills}
                        onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="pt-4 flex gap-4 bg-white dark:bg-slate-900 sticky bottom-0">
                    <button type="button" onClick={() => setIsModalOpen(false)} className="flex-1 py-4 bg-slate-100 text-slate-500 rounded-2xl font-bold">{t.aiAgents.cancel}</button>
                    <button type="submit" className="flex-1 py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl">{editingAgent ? t.aiAgents.saveChanges : t.aiAgents.nextStep}</button>
                  </div>
                </form>
              </>
            ) : (
              <div className="p-12 text-center space-y-8">
                <h3 className="text-3xl font-bold text-legal-navy dark:text-white tracking-tight">{t.aiAgents.pairingTitle}</h3>
                <div className="relative group max-w-[340px] mx-auto p-2 bg-white border-4 border-legal-navy rounded-[3rem] shadow-2xl animate-in zoom-in-95 duration-500">
                  {loading ? <div className="aspect-square flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-[2.5rem]"><RefreshCw size={48} className="text-legal-bronze animate-spin" /><p className="text-[10px] font-bold text-slate-400 uppercase">{t.aiAgents.validating}</p></div> :
                    pairCodeData ? (
                      <div className="aspect-square bg-slate-50 rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-center p-8 transition-all">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{t.aiAgents.pairingCode}</p>
                        <div className="text-5xl font-black text-legal-navy tracking-[0.2em] bg-white px-8 py-6 rounded-3xl shadow-inner border border-slate-100">
                          {pairCodeData}
                        </div>
                        <p className="text-[10px] text-slate-500 font-medium mt-4">{t.aiAgents.pairingInstructions}</p>
                      </div>
                    ) : qrCodeData ? (
                      <div className="aspect-square bg-white rounded-[2.5rem] flex flex-col items-center justify-center p-0 relative overflow-hidden">
                        {qrCodeData.startsWith('data:') ? (
                          <img
                            src={qrCodeData}
                            alt="QR Code do WhatsApp"
                            className="w-full h-full object-contain"
                            style={{ imageRendering: 'pixelated' }}
                          />
                        ) : (
                          <div className="p-4 bg-white w-full h-full flex items-center justify-center">
                            <QRCodeSVG
                              value={qrCodeData}
                              size={220}
                              level="H"
                              includeMargin={true}
                              className="w-full h-full"
                            />
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square bg-white rounded-[2.5rem] flex flex-col items-center justify-center p-4 relative overflow-hidden"><QrCode size={180} className="text-legal-navy opacity-20" />
                        <div className="absolute inset-0 bg-white/40 flex items-center justify-center backdrop-blur-[1px]"><button onClick={startRealConnection} className="bg-legal-navy text-white px-8 py-4 rounded-full font-bold shadow-xl hover:scale-105 transition-all">{t.aiAgents.generateQr}</button></div>
                      </div>
                    )}
                </div>
                {connectionStatus && <p className="text-sm font-bold text-legal-bronze mt-4">{connectionStatus}</p>}
                <button onClick={() => setModalStep('config')} className="text-slate-400 font-bold text-sm hover:underline">{t.aiAgents.back}</button>
              </div>
            )}
          </div>
        </div>
      )}

      {showFeedback && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[150] px-8 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
          <CheckCircle2 size={24} />
          <p className="font-bold">{showFeedback}</p>
        </div>
      )}
    </div>
  );
};
