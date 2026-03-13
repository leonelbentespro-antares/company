
import React, { useState, useEffect, useRef } from 'react';
import { QrCode, Loader2, CheckCircle2, Phone, X, RefreshCw, Smartphone, Info, MessageCircle } from 'lucide-react';
import { io, Socket } from 'socket.io-client';
import { supabase } from '../services/supabaseClient';
import { useTenant } from '../services/tenantContext';
import { useLanguage } from '../services/languageContext';

interface WhatsAppConnectorProps {
  onSuccess?: () => void;
  variant?: 'inline' | 'modal';
  onClose?: () => void;
}

export const WhatsAppConnector: React.FC<WhatsAppConnectorProps> = ({ onSuccess, variant = 'modal', onClose }) => {
  const { tenantId } = useTenant();
  const { t } = useLanguage();
  const [qrStep, setQrStep] = useState<'naming' | 'scanning' | 'success' | 'connected'>('naming');
  const [connectedDevice, setConnectedDevice] = useState<any>(null);
  const [sessionForm, setSessionForm] = useState({ name: '', phone: '' });
  const [qrCodeData, setQrCodeData] = useState<string | null>(null);
  const [pairCode, setPairCode] = useState<string | null>(null);
  const [isConnecting, setIsConnecting] = useState(false);
  const [showToast, setShowToast] = useState<string | null>(null);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    checkConnection();
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [tenantId]);

  const checkConnection = async () => {
    if (!tenantId) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/devices`, {
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenantId || ''
        }
      });
      if (response.ok) {
        const devices = await response.json();
        const activeDevice = devices.find((d: any) => d.status === 'connected');
        if (activeDevice) {
          setConnectedDevice(activeDevice);
          setQrStep('connected');
        }
      }
    } catch (err) {
      console.error('Error checking WhatsApp connection:', err);
    }
  };

  const handleDisconnect = async () => {
    if (!window.confirm(t.whatsapp.confirmDisconnect || 'Tem certeza que deseja desconectar o WhatsApp?')) return;
    
    setIsConnecting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      // Chamar o endpoint de desconexão (assumindo DELETE /api/whatsapp/devices/:id ou similar)
      const response = await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/devices/${connectedDevice.id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'x-tenant-id': tenantId || ''
        }
      });

      if (response.ok) {
        setQrStep('naming');
        setConnectedDevice(null);
        setShowToast(t.whatsapp.disconnectedSuccess || 'WhatsApp desconectado com sucesso.');
      } else {
        setShowToast('Erro ao desconectar.');
      }
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
      setShowToast('Erro de rede ao desconectar.');
    } finally {
      setIsConnecting(false);
    }
  };

  const connectSocket = (sessionName: string) => {
    if (!tenantId) return;
    if (socketRef.current?.connected) return;

    const socket = io(import.meta.env.VITE_API_URL || '', {
      auth: { tenantId },
      transports: ['websocket', 'polling'],
      withCredentials: true
    });
    socketRef.current = socket;

    socket.on('qr:update', (data: { qr?: string; paircode?: string; status: string }) => {
      if (data.paircode) setPairCode(data.paircode);
      if (data.qr) setQrCodeData(data.qr);
      setIsConnecting(false);
    });

    socket.on('whatsapp:connected', async (data: any) => {
      setQrStep('success');
      setShowToast(t.whatsapp.connectingSuccess);
      
      try {
        const { data: { session } } = await supabase.auth.getSession();
        await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/devices`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${session?.access_token}`,
            'x-tenant-id': tenantId || ''
          },
          body: JSON.stringify({
            name: sessionName,
            phone: data.user?.id?.split(':')[0] || sessionForm.phone || 'Desconhecido',
            status: 'connected',
            type: 'qr',
            lastActive: new Date().toISOString()
          })
        });
        if (onSuccess) onSuccess();
      } catch (e) { console.error(e); }
      
      setIsConnecting(false);
      socket.disconnect();
    });
  };

  const handleStart = async () => {
    if (!sessionForm.name.trim()) return;
    setQrStep('scanning');
    setIsConnecting(true);
    connectSocket(sessionForm.name);

    try {
      const { data: { session: authSession } } = await supabase.auth.getSession();
      await fetch(`${import.meta.env.VITE_API_URL}/api/whatsapp/start`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${authSession?.access_token}`,
          'x-tenant-id': tenantId!
        },
        body: JSON.stringify({ tenantId, phone: sessionForm.phone })
      });
    } catch (err) {
      setIsConnecting(false);
    }
  };

  const renderContent = () => {
    if (qrStep === 'naming') {
      return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
          <div className="p-4 bg-legal-bronze/5 border border-legal-bronze/10 rounded-2xl flex items-start gap-4">
            <Info className="text-legal-bronze shrink-0 mt-0.5" size={18} />
            <p className="text-sm text-slate-600 dark:text-slate-400 font-medium leading-relaxed">
              {t.whatsapp.giveNameInstructions}
            </p>
          </div>
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">{t.whatsapp.connectionName}</label>
              <input
                type="text"
                placeholder={t.whatsapp.connectionPlaceholder}
                className="w-full px-5 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 outline-none transition-all dark:text-white"
                value={sessionForm.name}
                onChange={(e) => setSessionForm({ ...sessionForm, name: e.target.value })}
              />
            </div>
          </div>
          <button
            onClick={handleStart}
            disabled={!sessionForm.name.trim() || isConnecting}
            className="w-full py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20 flex items-center justify-center gap-3 hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-50"
          >
            {isConnecting ? <Loader2 className="animate-spin" size={20} /> : <QrCode size={20} />}
            {t.whatsapp.startConnection}
          </button>
        </div>
      );
    }

    if (qrStep === 'scanning') {
      return (
        <div className="flex flex-col items-center gap-8 py-4 animate-in zoom-in-95">
          <div className="relative p-6 bg-white rounded-3xl shadow-inner border-2 border-slate-50">
            {qrCodeData ? (
              <img src={qrCodeData} alt="QR Code" className="w-64 h-64 rounded-xl" />
            ) : (
              <div className="w-64 h-64 flex flex-col items-center justify-center gap-4 bg-slate-50 rounded-xl">
                <Loader2 size={48} className="text-legal-bronze animate-spin" />
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none">{t.whatsapp.generatingCode}</p>
              </div>
            )}
            {isConnecting && !qrCodeData && (
              <div className="absolute inset-0 bg-white/80 backdrop-blur-sm flex items-center justify-center rounded-3xl">
                <Loader2 size={32} className="animate-spin text-legal-bronze" />
              </div>
            )}
          </div>
          
          <div className="text-center space-y-2">
            <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter">{t.whatsapp.scanQrCode}</h3>
            <p className="text-sm text-slate-500 font-medium">{t.whatsapp.scanInstructions}</p>
          </div>
        </div>
      );
    }

    if (qrStep === 'success' || qrStep === 'connected') {
      const device = connectedDevice || sessionForm;
      return (
        <div className="py-2 flex flex-col items-center text-center animate-in zoom-in-95">
          <div className="w-20 h-20 bg-emerald-500 text-white rounded-full flex items-center justify-center shadow-2xl shadow-emerald-500/30 mb-6">
            <CheckCircle2 size={40} />
          </div>
          <h2 className="text-xl font-black text-legal-navy dark:text-white mb-1">
            {qrStep === 'success' ? t.whatsapp.connectingSuccess : 'WhatsApp Conectado'}
          </h2>
          <div className="mb-8 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 w-full">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dispositivo</span>
              <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span> Ativo
              </span>
            </div>
            <div className="flex items-center gap-3 text-left">
              <div className="p-2 bg-emerald-100 text-emerald-600 rounded-lg">
                <Smartphone size={18} />
              </div>
              <div>
                <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{device.name || 'Meu WhatsApp'}</p>
                <p className="text-[10px] text-slate-400 font-medium">{device.phone || 'Sessão Ativa'}</p>
              </div>
            </div>
          </div>

          <div className="flex gap-3 w-full">
            <button
              onClick={onClose}
              className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold hover:bg-slate-200 transition-colors text-sm"
            >
              {t.whatsapp.closePanel}
            </button>
            <button
              onClick={handleDisconnect}
              disabled={isConnecting}
              className="flex-1 py-3 bg-rose-50 text-rose-600 rounded-xl font-bold hover:bg-rose-100 transition-colors text-sm border border-rose-100/50 flex items-center justify-center gap-2"
            >
              {isConnecting ? <Loader2 className="animate-spin" size={16} /> : <X size={16} />}
              Desconectar
            </button>
          </div>
        </div>
      );
    }
  };

  if (variant === 'inline') return renderContent();

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={onClose}></div>
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-8 duration-300">
        <div className="bg-legal-navy p-8 text-white flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="p-2.5 bg-white/10 rounded-xl">
              <MessageCircle size={24} className="text-legal-bronze" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight uppercase">WhatsApp Hub</h2>
              <p className="text-white/50 text-[10px] font-bold tracking-widest uppercase">Conexão em Tempo Real</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-colors text-white/50 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="p-8">
          {renderContent()}
        </div>
      </div>
    </div>
  );
};


