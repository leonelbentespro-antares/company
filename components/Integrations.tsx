import { supabase } from '../services/supabaseClient';
import React, { useState, useEffect } from 'react';
import {
  Mail, FolderOpen, Layout, Check, Globe, Loader2, ArrowRight,
  PlugZap, X, Lock, Info, Database, HardDrive, Send, Wrench, AlertCircle,
  Facebook, Instagram, MessageCircle
} from 'lucide-react';
import {
  getIntegrations, upsertIntegration
} from '../services/supabaseService';
import { useTenant } from '../services/tenantContext';
import { useLanguage } from '../services/languageContext';
import { WhatsAppConnector } from './WhatsAppConnector';

interface CloudApp {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: 'Email' | 'Storage' | 'Productivity' | 'Communication' | 'Social';
}


export const Integrations: React.FC = React.memo(() => {
  const { tenantId } = useTenant();
  const { t, locale } = useLanguage();
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [appLoading, setAppLoading] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isWhatsAppModalOpen, setIsWhatsAppModalOpen] = useState(false);
  const [suggestionForm, setSuggestionForm] = useState({ toolName: '', reason: '' });

  const CLOUD_APPS: CloudApp[] = [
    { id: 'gmail', name: 'Gmail', description: locale === 'en' ? 'Sync client emails directly into processes.' : locale === 'es' ? 'Sincronice correos electrónicos de clientes directamente en los procesos.' : 'Sincronize e-mails de clientes diretamente nos processos.', icon: <Mail size={24} />, color: 'bg-red-500', category: 'Email' },
    { id: 'outlook', name: 'Outlook', description: locale === 'en' ? 'Full integration with Microsoft 365 calendar and emails.' : locale === 'es' ? 'Integración completa con el calendario y correos electrónicos de Microsoft 365.' : 'Integração completa com calendário e e-mails Microsoft 365.', icon: <Mail size={24} />, color: 'bg-blue-600', category: 'Email' },
    { id: 'drive', name: 'Google Drive', description: locale === 'en' ? 'Attach cloud documents to your process cards.' : locale === 'es' ? 'Adjunte documentos de la nube a sus tarjetas de procesos.' : 'Anexe documentos da nuvem aos seus cards de processos.', icon: <HardDrive size={24} />, color: 'bg-emerald-500', category: 'Storage' },
    { id: 'gcalendar', name: 'Google Agenda', description: locale === 'en' ? 'Allow our AI Agents to schedule and read appointments from your calendar.' : locale === 'es' ? 'Permita que nuestros Agentes de IA programen y lean citas de su agenda.' : 'Permita que nossos Agentes de IA marquem e leiam compromissos da sua agenda.', icon: <Layout size={24} />, color: 'bg-emerald-600', category: 'Productivity' },
    { id: 'dropbox', name: 'Dropbox', description: locale === 'en' ? 'Quick access to files and external backups.' : locale === 'es' ? 'Acceso rápido a archivos y copias de seguridad externas.' : 'Acesso rápido a arquivos e backups externos.', icon: <FolderOpen size={24} />, color: 'bg-blue-500', category: 'Storage' },
    { id: 'facebook', name: 'Facebook', description: locale === 'en' ? 'Connect your page to manage messages and comments.' : locale === 'es' ? 'Conecte su página para gestionar mensajes y comentarios.' : 'Conecte sua página para gerenciar mensagens e comentários.', icon: <Facebook size={24} />, color: 'bg-blue-600', category: 'Social' },
    { id: 'instagram', name: 'Instagram', description: locale === 'en' ? 'Respond to DMs and interact with your followers directly.' : locale === 'es' ? 'Responda DMs e interactúe con sus seguidores directamente.' : 'Responda DMs e interaja com seus seguidores diretamente.', icon: <Instagram size={24} />, color: 'bg-pink-600', category: 'Social' },
    { id: 'whatsapp_official', name: 'WhatsApp Oficial', description: locale === 'en' ? 'Direct integration with Meta Business API for enterprise scale.' : locale === 'es' ? 'Integración directa con Meta Business API para escala empresarial.' : 'Integração direta com Meta Business API para escala empresarial.', icon: <MessageCircle size={24} />, color: 'bg-emerald-500', category: 'Communication' },
  ];

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const loadData = async () => {
    if (!tenantId) return;
    try {
      const integrations = await getIntegrations(tenantId);
      const apps = integrations
        .filter(i => CLOUD_APPS.some(app => app.id === i.provider) && i.settings.enabled)
        .map(i => i.provider);
      setConnectedApps(apps);
    } catch (error) {
      console.error('Error loading integrations data:', error);
    }
  };

  const handleConnectGoogle = async (appId: string = 'gmail') => {
    if (!tenantId) return;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authWindow = window.open(
      'about:blank',
      'google-auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authWindow) {
      setShowToast(t.integrationsApp.feedback.popupBlocked);
      return;
    }

    setAppLoading(appId);
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/integrations/google/auth?tenantId=${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenantId
        }
      });
      if (!res.ok) throw new Error('Erro ao buscar URL de autenticação');

      const { url } = await res.json();
      authWindow.location.href = url;

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'GOOGLE_AUTH_SUCCESS') {
          setConnectedApps(prev => [...new Set([...prev, 'gmail', 'drive', 'gcalendar'])]);
          setShowToast(t.integrationsApp.feedback.googleConnected);
          window.removeEventListener('message', handleMessage);
          setAppLoading(null);
        }
      };

      window.addEventListener('message', handleMessage);

      const checkClosed = setInterval(() => {
        if (authWindow.closed) {
          clearInterval(checkClosed);
          setAppLoading(null);
          window.removeEventListener('message', handleMessage);
        }
      }, 1000);

    } catch (error) {
      console.error('[OAuth-Debug] Erro no fluxo:', error);
      authWindow.close();
      setShowToast(t.integrationsApp.feedback.googleError);
      setAppLoading(null);
    }
  };

  const handleConnectMicrosoft = async () => {
    if (!tenantId) return;

    const width = 500;
    const height = 600;
    const left = window.screen.width / 2 - width / 2;
    const top = window.screen.height / 2 - height / 2;

    const authWindow = window.open(
      'about:blank',
      'microsoft-auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );

    if (!authWindow) {
      setShowToast(t.integrationsApp.feedback.popupBlocked);
      return;
    }

    setAppLoading('outlook');
    try {
      const apiUrl = import.meta.env.VITE_API_URL || '';
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(`${apiUrl}/api/integrations/microsoft/auth?tenantId=${tenantId}`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenantId
        }
      });
      const { url } = await res.json();
      authWindow.location.href = url;

      const handleMessage = (event: MessageEvent) => {
        if (event.data.type === 'MS_AUTH_SUCCESS') {
          setConnectedApps(prev => [...new Set([...prev, 'outlook'])]);
          setShowToast(t.integrationsApp.feedback.msConnected);
          window.removeEventListener('message', handleMessage);
          setAppLoading(null);
        }
      };
      window.addEventListener('message', handleMessage);
    } catch (error) {
      console.error('Microsoft OAuth error:', error);
      authWindow.close();
      setShowToast(t.integrationsApp.feedback.msError);
      setAppLoading(null);
    }
  };

  const toggleAppConnection = async (appId: string) => {
    if ((appId === 'gmail' || appId === 'drive' || appId === 'gcalendar') && !connectedApps.includes(appId)) {
      handleConnectGoogle(appId);
      return;
    }

    if (appId === 'outlook' && !connectedApps.includes('outlook')) {
      handleConnectMicrosoft();
      return;
    }

    if (appId === 'whatsapp_official') {
      setIsWhatsAppModalOpen(true);
      return;
    }

    setAppLoading(appId);
    const isConnected = connectedApps.includes(appId);
    const newState = !isConnected;

    try {
      await upsertIntegration({
        provider: appId,
        settings: {
          enabled: newState
        }
      });

      setConnectedApps(prev =>
        newState ? [...prev, appId] : prev.filter(id => id !== appId)
      );
      setShowToast(newState ? t.integrationsApp.feedback.integrated : t.integrationsApp.feedback.disconnected);
    } catch (error) {
      console.error('Error toggling app:', error);
      setShowToast(t.integrationsApp.feedback.toggleError);
    } finally {
      setAppLoading(null);
    }
  };

  const handleSendSuggestion = (e: React.FormEvent) => {
    e.preventDefault();
    setAppLoading('suggestion');
    setTimeout(() => {
      setAppLoading(null);
      setIsSuggestModalOpen(false);
      setSuggestionForm({ toolName: '', reason: '' });
      setShowToast(t.integrationsApp.feedback.suggestionSent);
    }, 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      {showToast && (
        <div className="fixed top-24 right-8 z-[200] px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <Check size={20} />
          <p className="font-bold text-sm">{showToast}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-legal-navy dark:text-white tracking-tight">
            {locale === 'en' ? <>Integrations & <span className="text-legal-bronze">Cloud Apps</span></> : 
             locale === 'es' ? <>Integraciones & <span className="text-legal-bronze">Apps Cloud</span></> : 
             <>Integrações & <span className="text-legal-bronze">Apps Cloud</span></>}
          </h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">{t.integrationsApp.subtitle}</p>
        </div>

        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all bg-legal-navy text-white shadow-lg`}
          >
            {t.integrationsApp.cloudApps}
          </button>
        </div>
      </div>

      <div className="space-y-10 animate-in slide-in-from-right duration-500">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {React.useMemo(() => CLOUD_APPS.map((app) => (
            <div key={app.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
              <div className="flex justify-between items-start mb-6">
                <div className={`w-14 h-14 ${app.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform`}>
                  {app.icon}
                </div>
                {connectedApps.includes(app.id) ? (
                  <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                    <Check size={12} /> {t.integrationsApp.active}
                  </span>
                ) : (
                  <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                    {t.integrationsApp.available}
                  </span>
                )}
              </div>

              <div className="space-y-2 mb-8 flex-1">
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">{app.name}</h3>
                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium leading-relaxed">{app.description}</p>
              </div>

              <button
                onClick={() => toggleAppConnection(app.id)}
                disabled={appLoading === app.id}
                className={`w-full py-4 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center justify-center gap-2 mt-auto ${connectedApps.includes(app.id)
                  ? 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-rose-50 hover:text-rose-500'
                  : 'bg-legal-navy text-white hover:brightness-110 shadow-lg shadow-legal-navy/10'
                  }`}
              >
                {appLoading === app.id ? (
                  <Loader2 size={16} className="animate-spin" />
                ) : connectedApps.includes(app.id) ? (
                  t.integrationsApp.disconnect
                ) : (
                  <>{t.integrationsApp.connect(app.name)} <PlugZap size={16} /></>
                )}
              </button>
            </div>
          )), [connectedApps, appLoading])}
        </div>

        {/* SUGGESTION SECTION */}
        <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-6 shadow-sm hover:border-legal-bronze/50 transition-all group overflow-hidden relative">
          <div className="absolute -top-10 -left-10 w-40 h-40 bg-legal-navy/5 dark:bg-legal-bronze/5 rounded-full blur-3xl group-hover:bg-legal-bronze/10 transition-colors"></div>
          <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 group-hover:scale-110 group-hover:bg-legal-navy group-hover:text-white transition-all shadow-inner relative z-10">
            <Wrench size={32} />
          </div>
          <div className="space-y-2 relative z-10">
            <h4 className="text-2xl font-black text-legal-navy dark:text-white">{t.integrationsApp.suggestTitle}</h4>
            <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">{t.integrationsApp.suggestSubtitle}</p>
          </div>
          <div className="relative z-10 pt-4">
            <button
              onClick={() => setIsSuggestModalOpen(true)}
              className="px-10 py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-legal-navy/20 dark:shadow-legal-bronze/20 flex items-center gap-3 mx-auto"
            >
              {t.integrationsApp.suggestButton} <ArrowRight size={20} />
            </button>
          </div>
        </div>
      </div>

      {/* MODAL: SUGGEST NEW INTEGRATION */}
      {isSuggestModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => !appLoading && setIsSuggestModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="bg-legal-navy p-10 text-white relative">
              <button onClick={() => setIsSuggestModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg"><Database size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black">{t.integrationsApp.modalTitle}</h3>
                  <p className="text-white/60 text-sm">{t.integrationsApp.modalSubtitle}</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendSuggestion} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.integrationsApp.softwareName}</label>
                <input
                  required
                  type="text"
                  placeholder={t.integrationsApp.softwarePlaceholder}
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                  value={suggestionForm.toolName}
                  onChange={(e) => setSuggestionForm({ ...suggestionForm, toolName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.integrationsApp.purposeLabel}</label>
                <textarea
                  required
                  className="w-full h-32 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5 resize-none shadow-inner"
                  placeholder={t.integrationsApp.purposePlaceholder}
                  value={suggestionForm.reason}
                  onChange={(e) => setSuggestionForm({ ...suggestionForm, reason: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsSuggestModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold">{t.common.cancel}</button>
                <button
                  type="submit"
                  disabled={appLoading === 'suggestion'}
                  className="flex-1 py-4 bg-legal-navy text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-legal-navy/20 flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-50"
                >
                  {appLoading === 'suggestion' ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> {t.integrationsApp.sendSuggestion}</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isWhatsAppModalOpen && (
        <WhatsAppConnector 
          onClose={() => setIsWhatsAppModalOpen(false)} 
          onSuccess={() => {
            setIsWhatsAppModalOpen(false);
            loadData();
          }}
        />
      )}
    </div>
  );
});
