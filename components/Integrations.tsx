import { supabase } from '../services/supabaseClient';
import { io as socketIO } from 'socket.io-client';
import React, { useState, useEffect, useRef } from 'react';
import {
  Mail, FolderOpen, Layout, Slack, Plus, Check, Settings2, Globe, Loader2, ArrowRight,
  PlugZap, MessageCircle, QrCode, Zap, Trash2, RefreshCw, X, Lock, SmartphoneNfc,
  Info, Database, HardDrive, Edit2, Save, Send, Wrench, Smartphone, AlertCircle, ShieldCheck,
  Facebook, Instagram
} from 'lucide-react';
import { WhatsAppDevice } from '../types';
import {
  getWhatsAppDevices, createWhatsAppDevice, updateWhatsAppDevice, deleteWhatsAppDevice,
  getIntegrations, upsertIntegration
} from '../services/supabaseService';
import { useTenant } from '../services/tenantContext';

// WhatsAppSession interface removed in favor of WhatsAppDevice from types

interface CloudApp {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  category: 'Email' | 'Storage' | 'Productivity' | 'Communication' | 'Social';
}

const CLOUD_APPS: CloudApp[] = [
  { id: 'gmail', name: 'Gmail', description: 'Sincronize e-mails de clientes diretamente nos processos.', icon: <Mail size={24} />, color: 'bg-red-500', category: 'Email' },
  { id: 'outlook', name: 'Outlook', description: 'Integração completa com calendário e e-mails Microsoft 365.', icon: <Mail size={24} />, color: 'bg-blue-600', category: 'Email' },
  { id: 'drive', name: 'Google Drive', description: 'Anexe documentos da nuvem aos seus cards de processos.', icon: <HardDrive size={24} />, color: 'bg-emerald-500', category: 'Storage' },
  { id: 'dropbox', name: 'Dropbox', description: 'Acesso rápido a arquivos e backups externos.', icon: <FolderOpen size={24} />, color: 'bg-blue-500', category: 'Storage' },
  { id: 'trello', name: 'Trello', description: 'Sincronize prazos e tarefas com seus quadros do Trello.', icon: <Layout size={24} />, color: 'bg-indigo-500', category: 'Productivity' },
  { id: 'slack', name: 'Slack', description: 'Notificações de movimentações judiciais em seus canais.', icon: <Slack size={24} />, color: 'bg-purple-600', category: 'Communication' },
  { id: 'facebook', name: 'Facebook', description: 'Conecte sua página para gerenciar mensagens e comentários.', icon: <Facebook size={24} />, color: 'bg-blue-600', category: 'Social' },
  { id: 'instagram', name: 'Instagram', description: 'Responda DMs e interaja com seus seguidores diretamente.', icon: <Instagram size={24} />, color: 'bg-pink-600', category: 'Social' },
  { id: 'notificame', name: 'NotificaMe Hub', description: 'Centralize canais de atendimento e automação via NotificaMe.', icon: <Globe size={24} />, color: 'bg-indigo-600', category: 'Communication' },
];

// INITIAL_SESSIONS removed

export const Integrations: React.FC = () => {
  const { tenantId } = useTenant();
  const [activeTab, setActiveTab] = useState<'channels' | 'apps'>('channels');
  const [sessions, setSessions] = useState<WhatsAppDevice[]>([]);
  const [connectedApps, setConnectedApps] = useState<string[]>([]);
  const [isOfficialConnected, setIsOfficialConnected] = useState(false);
  const [metaConfig, setMetaConfig] = useState({ token: '', phoneId: '', businessId: '' });

  useEffect(() => {
    if (tenantId) {
      loadData();
    }
  }, [tenantId]);

  const loadData = async () => {
    if (!tenantId) return;
    try {
      const devices = await getWhatsAppDevices(tenantId);
      setSessions(devices);

      const integrations = await getIntegrations(tenantId);

      // Process Connected Apps
      const apps = integrations
        .filter(i => CLOUD_APPS.some(app => app.id === i.provider) && i.settings.enabled)
        .map(i => i.provider);
      setConnectedApps(apps);

      // Process Meta Config
      const metaIntegration = integrations.find(i => i.provider === 'meta');
      if (metaIntegration) {
        setIsOfficialConnected(!!metaIntegration.settings.enabled);
        setMetaConfig({
          token: metaIntegration.settings.token || '',
          phoneId: metaIntegration.settings.phoneId || '',
          businessId: metaIntegration.settings.businessId || ''
        });
      }

      // Process NotificaMe Config
      const notificaMeIntegration = integrations.find(i => i.provider === 'notificame');
      if (notificaMeIntegration) {
        setNotificaMeConfig({
          token: notificaMeIntegration.settings.token || '',
          channelId: notificaMeIntegration.settings.channelId || ''
        });
      }
    } catch (error) {
      console.error('Error loading integrations data:', error);
    }
  };

  const [isQRModalOpen, setIsQRModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isMetaModalOpen, setIsMetaModalOpen] = useState(false);
  const [isNotificaMeModalOpen, setIsNotificaMeModalOpen] = useState(false);
  const [isSuggestModalOpen, setIsSuggestModalOpen] = useState(false);
  const [isConnecting, setIsConnecting] = useState(false);
  const [qrStep, setQrStep] = useState<'naming' | 'scanning' | 'success'>('naming');
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [notificaMeConfig, setNotificaMeConfig] = useState({ token: '', channelId: '' });
  const socketRef = useRef<ReturnType<typeof socketIO> | null>(null);

  const [editingSession, setEditingSession] = useState<WhatsAppDevice | null>(null);
  const [sessionForm, setSessionForm] = useState({ name: '', phone: '' });

  const [suggestionForm, setSuggestionForm] = useState({ toolName: '', reason: '' });
  const [appLoading, setAppLoading] = useState<string | null>(null);
  const [showToast, setShowToast] = useState<string | null>(null);

  // Removed localStorage effects

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Cleanup: desconectar socket ao fechar o modal de QR
  useEffect(() => {
    if (!isQRModalOpen) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
      setPairCode(null);
      setQrCodeData(null);
    }
  }, [isQRModalOpen]);

  // Conectar ao WebSocket e escutar eventos do WhatsApp
  const connectSocket = (sessionName: string) => {
    if (!tenantId) return;

    // Evitar múltiplas conexões
    if (socketRef.current?.connected) return;

    const socket = socketIO(import.meta.env.VITE_API_URL || '', {
      auth: { tenantId },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log(`[Socket Debug] Conectado! Tenant=${tenantId}, SocketId=${socket.id}`);
    });

    // Evento: QR Code ou Pair Code gerado
    socket.on('qr:update', (data: { qr?: string; paircode?: string; status: string }) => {
      console.log('[Socket Debug] qr:update recebido:', data);
      if (data.paircode) {
        setPairCode(data.paircode);
      }
      if (data.qr) {
        setQrCodeData(data.qr);
      }
      setIsConnecting(false);
    });

    socket.on('qr:error', (data: { message: string }) => {
      console.warn('[Socket Debug] qr:error recebido:', data);
      setIsConnecting(false);
      setShowToast(`Erro: ${data.message}`);
    });

    // Evento: WhatsApp conectado com sucesso
    socket.on('whatsapp:connected', async (data: { status: string; user: any }) => {
      setShowToast('WhatsApp Conectado com Sucesso! 🎉');
      setQrStep('success');
      try {
        const newDevice = await createWhatsAppDevice({
          name: sessionName,
          phone: data.user?.id?.split(':')[0] || 'Desconhecido',
          status: 'connected',
          type: 'qr',
          batteryLevel: 100,
          lastActive: new Date().toISOString()
        });
        setSessions(prev => [newDevice, ...prev]);
      } catch (error) {
        console.error('Error saving device:', error);
      }
      setQrCodeData(null);
      setPairCode(null);
      setIsConnecting(false);
      socket.disconnect();
    });

    socket.on('connect_error', (err) => {
      console.error('[Socket] Erro de conexão:', err.message);
    });
  };

  // Fallback Polling: Se o socket demorar, consulta o status via HTTP
  useEffect(() => {
    let pollTimer: NodeJS.Timeout;

    if (isConnecting && isQRModalOpen) {
      pollTimer = setInterval(async () => {
        console.log('[Fallback] Consultando status via HTTP...');
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
        try {
          const res = await fetch(`${apiUrl}/api/whatsapp/status/${tenantId}`);
          const data = await res.json();

          if (data.status === 'QR_READY' && data.qr) {
            setQrCodeData(data.qr);
            setIsConnecting(false);
          } else if (data.status === 'PAIR_CODE_READY' && data.paircode) {
            setPairCode(data.paircode);
            setIsConnecting(false);
          } else if (data.status === 'Connected') {
            setIsConnecting(false);
            setQrStep('success');
            setShowToast('WhatsApp Conectado! 🎉');
          }
        } catch (err) {
          console.warn('[Fallback] Erro ao consultar status:', err);
        }
      }, 3000);
    }

    return () => clearInterval(pollTimer);
  }, [isConnecting, isQRModalOpen, tenantId]);

  const handleCreateSession = async () => {
    if (!sessionForm.name.trim()) return;
    setQrStep('scanning');
    setIsConnecting(true);
    setQrCodeData(null);
    setPairCode(null);
    const name = sessionForm.name;
    const phone = sessionForm.phone; // Captura o telefone para Pair Code

    try {
      // 1. Conectar ao WebSocket ANTES de iniciar a sessão (evita race condition)
      connectSocket(name);

      // 2. Disparar início da sessão no backend
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      await fetch(`${apiUrl}/api/whatsapp/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, phone })
      });
    } catch (err) {
      console.error(err);
      setShowToast('Erro ao iniciar pareamento com o backend.');
      setIsConnecting(false);
    }
  };

  const handleEditSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSession) return;

    try {
      await updateWhatsAppDevice(editingSession.id, {
        name: sessionForm.name,
        phone: sessionForm.phone
      });

      setSessions(prev => prev.map(s =>
        s.id === editingSession.id
          ? { ...s, name: sessionForm.name, phone: sessionForm.phone }
          : s
      ));

      setIsEditModalOpen(false);
      setEditingSession(null);
      setShowToast("Configurações do aparelho atualizadas!");
    } catch (error) {
      console.error('Error updating device:', error);
      setShowToast("Erro ao atualizar aparelho.");
    }
  };

  const openEditModal = (session: WhatsAppDevice) => {
    setEditingSession(session);
    setSessionForm({ name: session.name, phone: session.phone });
    setIsEditModalOpen(true);
  };

  const handleSaveMetaConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppLoading('meta');

    try {
      await upsertIntegration({
        provider: 'meta',
        settings: {
          ...metaConfig,
          enabled: true
        }
      });

      setIsOfficialConnected(true);
      setIsMetaModalOpen(false);
      setShowToast("API da Meta conectada e validada!");
    } catch (error) {
      console.error('Error saving meta config:', error);
      setShowToast("Erro ao conectar API da Meta.");
    } finally {
      setAppLoading(null);
    }
  };

  const disconnectMeta = async () => {
    if (confirm("Deseja realmente desconectar a API da Meta? Isso interromperá disparos em massa ativos.")) {
      try {
        await upsertIntegration({
          provider: 'meta',
          settings: {
            ...metaConfig,
            enabled: false
          }
        });
        setIsOfficialConnected(false);
        setShowToast("API da Meta desconectada.");
      } catch (error) {
        console.error('Error disconnecting meta:', error);
        setShowToast("Erro ao desconectar.");
      }
    }
  };

  const handleSaveNotificaMeConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    setAppLoading('notificame');

    try {
      await upsertIntegration({
        provider: 'notificame',
        settings: {
          ...notificaMeConfig,
          enabled: true
        }
      });

      setConnectedApps(prev => [...prev, 'notificame']);
      setIsNotificaMeModalOpen(false);
      setShowToast("NotificaMe Hub conectado com sucesso!");

      // Registrar webhook automaticamente (opcional, pode ser feito no backend ao salvar)
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
      const webhookUrl = `${apiUrl}/api/webhooks/notificame`;

      // Chamada para o backend registrar o webhook no NotificaMe
      await fetch(`${apiUrl}/api/integrations/notificame/subscribe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tenantId, token: notificaMeConfig.token, channelId: notificaMeConfig.channelId, webhookUrl })
      });

    } catch (error) {
      console.error('Error saving NotificaMe config:', error);
      setShowToast("Erro ao conectar NotificaMe Hub.");
    } finally {
      setAppLoading(null);
    }
  };

  const toggleAppConnection = async (appId: string) => {
    if (appId === 'notificame' && !connectedApps.includes('notificame')) {
      setIsNotificaMeModalOpen(true);
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
      setShowToast(newState ? "Aplicativo integrado com sucesso!" : "Aplicativo desconectado.");
    } catch (error) {
      console.error('Error toggling app:', error);
      setShowToast("Erro ao alterar conexão do app.");
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
      setShowToast("Sugestão enviada para nossa equipe de produto!");
    }, 2000);
  };

  const removeSession = async (id: string) => {
    try {
      await deleteWhatsAppDevice(id);
      setSessions(sessions.filter(s => s.id !== id));
      setShowToast("Conexão removida.");
    } catch (error) {
      console.error("Error removing session:", error);
      setShowToast("Erro ao remover conexão.");
    }
  };

  const qrSessions = sessions.filter(s => s.type === 'qr');
  const MAX_QR = 10;

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
          <h1 className="text-4xl font-black text-legal-navy dark:text-white tracking-tight">Canais & <span className="text-legal-bronze">Apps Cloud</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Configure seus aparelhos de recepção e conecte ferramentas de produtividade.</p>
        </div>

        <div className="flex bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
          <button
            onClick={() => setActiveTab('channels')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'channels' ? 'bg-legal-navy text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Mensageria (WhatsApp)
          </button>
          <button
            onClick={() => setActiveTab('apps')}
            className={`px-6 py-3 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'apps' ? 'bg-legal-navy text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
          >
            Aplicativos Cloud
          </button>
        </div>
      </div>

      {activeTab === 'channels' ? (
        <div className="space-y-10 animate-in slide-in-from-left duration-500">

          {/* SECTION: WHATSAPP WEB (QR CODE) */}
          <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
              <div>
                <div className="flex items-center gap-2 text-[10px] font-black text-legal-bronze uppercase tracking-[0.2em] mb-2">
                  <QrCode size={14} /> Multi-dispositivos
                </div>
                <h2 className="text-2xl font-black text-legal-navy dark:text-white">Conexões por <span className="text-slate-300 dark:text-slate-700">QR Code</span></h2>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Gerencie os aparelhos de recepção, triagem e setores específicos.</p>
              </div>
              <div className="bg-white dark:bg-slate-900 px-6 py-4 rounded-[1.5rem] border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-6 transition-colors">
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Capacidade de Sessões</p>
                  <div className="flex items-center gap-3">
                    <div className="w-32 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-legal-navy transition-all duration-700" style={{ width: `${(qrSessions.length / MAX_QR) * 100}%` }}></div>
                    </div>
                    <span className="text-sm font-black text-legal-navy dark:text-white">{qrSessions.length} / {MAX_QR}</span>
                  </div>
                </div>
                <button
                  onClick={() => { setQrStep('naming'); setSessionForm({ name: '', phone: '' }); setIsQRModalOpen(true); }}
                  disabled={qrSessions.length >= MAX_QR}
                  className="px-6 py-3 bg-legal-navy text-white rounded-xl font-bold text-xs hover:brightness-110 disabled:opacity-30 transition-all flex items-center gap-2 shadow-lg shadow-legal-navy/20"
                >
                  <Plus size={16} /> Gerar QR Code
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {qrSessions.map((session) => (
                <div key={session.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl transition-all group overflow-hidden relative flex flex-col">
                  <div className="absolute top-0 right-0 p-8">
                    {session.status === 'connected' ? (
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-900/10 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/20">
                        <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div> Online
                      </span>
                    ) : (
                      <span className="flex items-center gap-2 text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                        Desconectado
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-6 mb-8 mt-2">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-legal-navy dark:text-legal-bronze group-hover:scale-110 transition-transform shadow-inner">
                      <SmartphoneNfc size={32} />
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-slate-900 dark:text-white truncate max-w-[150px]">{session.name}</h3>
                      <p className="text-sm font-bold text-slate-400 dark:text-slate-500">{session.phone}</p>
                    </div>
                  </div>

                  <div className="flex-1 space-y-4">
                    {session.status === 'connected' && (
                      <>
                        <div className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          <span className="flex items-center gap-1.5"><Zap size={12} /> Saúde da Sessão</span>
                          <span className={session.batteryLevel && session.batteryLevel < 20 ? 'text-rose-500' : 'text-emerald-500'}>{session.batteryLevel}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                          <div className={`h-full transition-all duration-700 ${session.batteryLevel && session.batteryLevel < 20 ? 'bg-rose-500' : 'bg-emerald-500'}`} style={{ width: `${session.batteryLevel}%` }}></div>
                        </div>
                      </>
                    )}
                  </div>

                  <div className="flex gap-2 mt-8">
                    <button
                      onClick={() => openEditModal(session)}
                      className="flex-1 py-3 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold text-xs hover:bg-legal-navy hover:text-white transition-all flex items-center justify-center gap-2 group-hover:shadow-md"
                    >
                      <Edit2 size={16} /> Editar
                    </button>
                    <button
                      onClick={() => removeSession(session.id)}
                      className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-500 hover:text-white transition-all group-hover:shadow-md"
                      title="Remover sessão"
                    >
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* SECTION: OFFICIAL META API */}
          <div className="space-y-6">
            <div className="flex items-center gap-2 text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-2">
              <ShieldCheck size={14} /> WhatsApp Business Platform
            </div>
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl group border border-white/5">
              <div className="absolute top-0 right-0 p-12 opacity-5 rotate-12 transition-transform group-hover:scale-110"><Globe size={240} /></div>

              <div className="relative z-10 flex flex-col lg:flex-row justify-between items-center gap-10">
                <div className="max-w-2xl space-y-6">
                  <div className="flex items-center gap-4">
                    <div className="w-20 h-20 bg-white/10 rounded-[2rem] flex items-center justify-center text-emerald-400 shadow-xl border border-white/10 backdrop-blur-sm">
                      <MessageCircle size={48} />
                    </div>
                    <div>
                      <h2 className="text-3xl font-black">Meta <span className="text-emerald-400">Official API</span></h2>
                      <p className="text-white/50 font-medium mt-1">A solução definitiva para grandes volumes de atendimento e segurança de marca.</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors">
                      <div className="p-2 bg-amber-500/20 rounded-lg text-amber-400"><Zap size={20} /></div>
                      <div>
                        <p className="text-[10px] font-black text-white/40 uppercase">Performance</p>
                        <p className="text-xs font-bold text-white/90">Disparos em massa ilimitados</p>
                      </div>
                    </div>
                    <div className="p-4 bg-white/5 border border-white/10 rounded-2xl flex items-center gap-4 hover:bg-white/10 transition-colors">
                      <div className="p-2 bg-blue-500/20 rounded-lg text-blue-400"><Lock size={20} /></div>
                      <div>
                        <p className="text-[10px] font-black text-white/40 uppercase">Segurança</p>
                        <p className="text-xs font-bold text-white/90">Sem risco de banimento</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="w-full lg:w-80 shrink-0">
                  {isOfficialConnected ? (
                    <div className="bg-emerald-500/10 border border-emerald-500/30 p-8 rounded-[2.5rem] space-y-4 animate-in zoom-in-95 backdrop-blur-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-[10px] font-black text-emerald-400 uppercase tracking-widest">Status: Conectado</span>
                        <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]"></div>
                      </div>
                      <p className="text-xs text-white/60 font-medium leading-relaxed">Sua conta do Meta Business Manager está integrada com sucesso.</p>
                      <div className="flex gap-2">
                        <button onClick={() => setIsMetaModalOpen(true)} className="flex-1 py-3 bg-white/10 hover:bg-white/20 rounded-xl text-[10px] font-black uppercase transition-colors">Ajustes</button>
                        <button onClick={disconnectMeta} className="flex-1 py-3 bg-rose-500/20 hover:bg-rose-500/40 text-rose-400 rounded-xl text-[10px] font-black uppercase transition-colors">Sair</button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setIsMetaModalOpen(true)}
                      className="w-full py-5 bg-emerald-500 text-slate-900 rounded-[2rem] font-black text-sm uppercase tracking-widest shadow-xl shadow-emerald-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3"
                    >
                      Configurar API <ArrowRight size={20} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* APPS VIEW */
        <div className="space-y-10 animate-in slide-in-from-right duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {CLOUD_APPS.map((app) => (
              <div key={app.id} className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl transition-all group flex flex-col h-full">
                <div className="flex justify-between items-start mb-6">
                  <div className={`w-14 h-14 ${app.color} text-white rounded-2xl flex items-center justify-center shadow-lg group-hover:rotate-6 transition-transform`}>
                    {app.icon}
                  </div>
                  {connectedApps.includes(app.id) ? (
                    <span className="flex items-center gap-1.5 text-[10px] font-black uppercase text-emerald-500 bg-emerald-50 dark:bg-emerald-900/20 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-900/30">
                      <Check size={12} /> Ativo
                    </span>
                  ) : (
                    <span className="text-[10px] font-black uppercase text-slate-400 bg-slate-50 dark:bg-slate-800 px-3 py-1 rounded-full border border-slate-100 dark:border-slate-700">
                      Disponível
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
                    'Desconectar App'
                  ) : (
                    <>Conectar {app.name} <PlugZap size={16} /></>
                  )}
                </button>
              </div>
            ))}
          </div>

          {/* SUGGESTION SECTION */}
          <div className="bg-white dark:bg-slate-900 p-12 rounded-[3.5rem] border border-dashed border-slate-200 dark:border-slate-800 text-center space-y-6 shadow-sm hover:border-legal-bronze/50 transition-all group overflow-hidden relative">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-legal-navy/5 dark:bg-legal-bronze/5 rounded-full blur-3xl group-hover:bg-legal-bronze/10 transition-colors"></div>
            <div className="w-20 h-20 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto text-slate-400 group-hover:scale-110 group-hover:bg-legal-navy group-hover:text-white transition-all shadow-inner relative z-10">
              <Wrench size={32} />
            </div>
            <div className="space-y-2 relative z-10">
              <h4 className="text-2xl font-black text-legal-navy dark:text-white">Deseja integrar outra ferramenta?</h4>
              <p className="text-slate-500 dark:text-slate-400 max-w-md mx-auto font-medium">Nossa equipe de engenharia pode desenvolver conectores personalizados via Webhook ou integração direta.</p>
            </div>
            <div className="relative z-10 pt-4">
              <button
                onClick={() => setIsSuggestModalOpen(true)}
                className="px-10 py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-legal-navy/20 dark:shadow-legal-bronze/20 flex items-center gap-3 mx-auto"
              >
                Sugerir Nova Integração <ArrowRight size={20} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: QR CODE PAIRING */}
      {isQRModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => !isConnecting && setIsQRModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95 flex flex-col">

            {qrStep === 'naming' && (
              <div className="p-10 space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-legal-navy text-white rounded-2xl flex items-center justify-center shadow-lg"><Smartphone size={28} /></div>
                  <div>
                    <h3 className="text-2xl font-black text-legal-navy dark:text-white">Gerar Novo QR Code</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Identifique o aparelho antes de iniciar o pareamento.</p>
                  </div>
                </div>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Setor / Aparelho</label>
                    <input
                      type="text"
                      placeholder="Ex: Aparelho Jurídico 04"
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                      value={sessionForm.name}
                      onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número do Whatsapp (Opcional)</label>
                    <input
                      type="tel"
                      placeholder="Ex: +55 11 99999-9999"
                      className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                      value={sessionForm.phone}
                      onChange={(e) => setSessionForm({ ...sessionForm, phone: e.target.value })}
                    />
                    <p className="text-[10px] text-slate-400 pl-1"><AlertCircle size={10} className="inline mr-1" /> Use apenas para identificação interna.</p>
                  </div>
                </div>
                <button
                  onClick={handleCreateSession}
                  disabled={!sessionForm.name.trim()}
                  className="w-full py-4 bg-legal-navy text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-legal-navy/20 hover:brightness-110 disabled:opacity-50 transition-all"
                >
                  Gerar Código QR
                </button>
              </div>
            )}

            {qrStep === 'scanning' && (
              <div className="p-12 text-center space-y-10">
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-legal-navy dark:text-white">Escaneie o Código</h3>
                  <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Vá em Configurações {'>'} Aparelhos Conectados no seu celular.</p>
                </div>

                <div className="relative group max-w-[280px] mx-auto p-4 bg-white rounded-[2.5rem] shadow-2xl border-4 border-legal-navy">
                  {isConnecting ? (
                    <div className="aspect-square flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-[1.5rem]">
                      <RefreshCw size={48} className="text-legal-bronze animate-spin" />
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">Validando Conexão...</p>
                    </div>
                  ) : pairCode ? (
                    <div className="aspect-square bg-slate-50 rounded-[1.5rem] flex flex-col items-center justify-center gap-4 text-center p-6">
                      <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Código de Pareamento</p>
                      <div className="text-4xl font-black text-legal-navy tracking-[0.2em] bg-white px-6 py-4 rounded-2xl shadow-inner border border-slate-100">
                        {pairCode}
                      </div>
                      <p className="text-[10px] text-slate-500 font-medium">Digite este código no seu WhatsApp em "Conectar com número de telefone".</p>
                    </div>
                  ) : qrCodeData ? (
                    <div className="aspect-square bg-white rounded-[1.5rem] flex flex-col items-center justify-center p-2 relative">
                      <img src={qrCodeData} alt="QR Code do WhatsApp" className="w-full h-full object-contain" />
                    </div>
                  ) : (
                    <div className="aspect-square bg-white rounded-[1.5rem] flex flex-col items-center justify-center p-2 relative">
                      <QrCode size={240} className="text-slate-900 opacity-20" />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-500">Gerando...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  <ShieldCheck size={14} className="text-emerald-500" /> Segurança LexHub Docker
                </div>
              </div>
            )}

            {qrStep === 'success' && (
              <div className="p-16 text-center space-y-8 animate-in zoom-in-95 duration-500">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto shadow-xl shadow-emerald-100">
                  <Check size={48} strokeWidth={3} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight">Sessão Ativada!</h3>
                  <p className="text-slate-500 dark:text-slate-400 font-medium">O aparelho <strong>{sessionForm.name}</strong> já está integrado.</p>
                </div>
                <button
                  onClick={() => { setIsQRModalOpen(false); setQrStep('naming'); }}
                  className="w-full py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20"
                >
                  Começar Atendimento
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: META API CONFIG */}
      {isMetaModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => !appLoading && setIsMetaModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="bg-legal-navy p-10 text-white relative flex-shrink-0">
              <button onClick={() => setIsMetaModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-emerald-500 text-white rounded-2xl flex items-center justify-center shadow-xl"><Globe size={32} /></div>
                <div>
                  <h3 className="text-3xl font-black">Meta API Config</h3>
                  <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">Conexão WhatsApp Cloud Platform</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveMetaConfig} className="p-10 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone Number ID</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 10542387..."
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                    value={metaConfig.phoneId}
                    onChange={(e) => setMetaConfig({ ...metaConfig, phoneId: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Business Account ID</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 8842105..."
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                    value={metaConfig.businessId}
                    onChange={(e) => setMetaConfig({ ...metaConfig, businessId: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Permanent Access Token (System User)</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                  <input
                    required
                    type="password"
                    placeholder="EAABW2..."
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                    value={metaConfig.token}
                    onChange={(e) => setMetaConfig({ ...metaConfig, token: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl flex items-start gap-4">
                <Info className="text-blue-500 shrink-0" size={20} />
                <p className="text-[10px] text-blue-700 dark:text-blue-300 font-bold uppercase leading-relaxed">Certifique-se de que o Webhook do LexHub (Cloud Connector) esteja configurado em seu painel de desenvolvedor da Meta para receber eventos em tempo real.</p>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsMetaModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                <button
                  type="submit"
                  disabled={appLoading === 'meta'}
                  className="flex-1 py-4 bg-emerald-500 text-slate-900 rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-emerald-500/20 flex items-center justify-center gap-3"
                >
                  {appLoading === 'meta' ? <Loader2 size={18} className="animate-spin" /> : <><Globe size={18} /> Conectar API Oficial</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT SESSION */}
      {isEditModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-legal-navy p-10 text-white relative">
              <button onClick={() => setIsEditModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg"><Settings2 size={28} /></div>
                <div>
                  <h3 className="text-2xl font-black">Configurar Aparelho</h3>
                  <p className="text-white/60 text-sm">Atualize os dados desta conexão WhatsApp.</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleEditSession} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identificação do Aparelho</label>
                <input
                  required
                  type="text"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                  value={sessionForm.name}
                  onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Número de Telefone</label>
                <input
                  required
                  type="text"
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                  value={sessionForm.phone}
                  onChange={(e) => setSessionForm({ ...sessionForm, phone: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2">
                  <Save size={18} /> Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
                  <h3 className="text-2xl font-black">Sugerir Integração</h3>
                  <p className="text-white/60 text-sm">Qual ferramenta você gostaria de ver no LexHub?</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSendSuggestion} className="p-10 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome do Software / App</label>
                <input
                  required
                  type="text"
                  placeholder="Ex: RD Station, Notion, ERP Interno..."
                  className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                  value={suggestionForm.toolName}
                  onChange={(e) => setSuggestionForm({ ...suggestionForm, toolName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Finalidade da Integração</label>
                <textarea
                  required
                  className="w-full h-32 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-medium dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5 resize-none shadow-inner"
                  placeholder="Como essa integração ajudaria o seu escritório?"
                  value={suggestionForm.reason}
                  onChange={(e) => setSuggestionForm({ ...suggestionForm, reason: e.target.value })}
                />
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsSuggestModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold">Cancelar</button>
                <button
                  type="submit"
                  disabled={appLoading === 'suggestion'}
                  className="flex-1 py-4 bg-legal-navy text-white rounded-2xl font-black uppercase text-xs tracking-widest shadow-xl shadow-legal-navy/20 flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-50"
                >
                  {appLoading === 'suggestion' ? <Loader2 size={18} className="animate-spin" /> : <><Send size={18} /> Enviar Sugestão</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* MODAL: NOTIFICAME HUB CONFIG */}
      {isNotificaMeModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-md animate-in fade-in" onClick={() => !appLoading && setIsNotificaMeModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="bg-indigo-600 p-10 text-white relative flex-shrink-0">
              <button onClick={() => setIsNotificaMeModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-white text-indigo-600 rounded-2xl flex items-center justify-center shadow-xl"><Globe size={32} /></div>
                <div>
                  <h3 className="text-3xl font-black">NotificaMe Hub</h3>
                  <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">Configuração de Integração Omnichannel</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveNotificaMeConfig} className="p-10 space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Account API Token</label>
                  <div className="relative">
                    <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={18} />
                    <input
                      required
                      type="password"
                      placeholder="Token da sua conta NotificaMe"
                      className="w-full pl-12 pr-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-indigo-600/5"
                      value={notificaMeConfig.token}
                      onChange={(e) => setNotificaMeConfig({ ...notificaMeConfig, token: e.target.value })}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Channel ID (WhatsApp)</label>
                  <input
                    required
                    type="text"
                    placeholder="Ex: 5511999999999 ou UUID do canal"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-indigo-600/5"
                    value={notificaMeConfig.channelId}
                    onChange={(e) => setNotificaMeConfig({ ...notificaMeConfig, channelId: e.target.value })}
                  />
                </div>
              </div>

              <div className="p-4 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-900/30 rounded-2xl flex items-start gap-4">
                <Info className="text-indigo-600 shrink-0" size={20} />
                <div className="space-y-1">
                  <p className="text-[10px] text-indigo-700 dark:text-indigo-300 font-bold uppercase tracking-tight">Registro Automático</p>
                  <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed">Ao salvar, o LexHub tentará registrar automaticamente o webhook no seu canal NotificaMe para receber mensagens em tempo real.</p>
                </div>
              </div>

              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsNotificaMeModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all">Cancelar</button>
                <button
                  type="submit"
                  disabled={appLoading === 'notificame'}
                  className="flex-[2] py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-600/20 hover:brightness-110 transition-all flex items-center justify-center gap-2"
                >
                  {appLoading === 'notificame' ? <Loader2 size={20} className="animate-spin" /> : 'Salvar e Conectar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
