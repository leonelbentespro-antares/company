import React, { useEffect, useState } from 'react';
import { X, CalendarCheck, Clock, User2, Briefcase } from 'lucide-react';
import { useTenant } from '../services/tenantContext';
import { supabase } from '../services/supabaseClient';
import { Appointment } from '../types';

interface TodayReminderProps {
  onNavigate?: (tab: string) => void;
}

export const TodayReminder: React.FC<TodayReminderProps> = ({ onNavigate }) => {
  const { tenantId } = useTenant();
  const [todayAppointments, setTodayAppointments] = useState<Appointment[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (!tenantId || dismissed) return;

    const today = new Date();
    const todayStr = `${today.getFullYear()}-${(today.getMonth() + 1).toString().padStart(2, '0')}-${today.getDate().toString().padStart(2, '0')}`;

    // Verificar se já foi exibido hoje para este tenant
    const reminderKey = `lexhub_reminder_${tenantId}_${todayStr}`;
    const alreadyShown = sessionStorage.getItem(reminderKey);
    if (alreadyShown) return;

    const fetchToday = async () => {
      try {
        const today = new Date();
        const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const todayEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();
        
        const { data, error } = await supabase
          .from('agendamentos')
          .select('*, clientes(nome)')
          .eq('tenant_id', tenantId)
          .gte('data_hora', todayStart)
          .lt('data_hora', todayEnd)
          .neq('status', 'Cancelado')
          .neq('status', 'Concluído')
          .order('data_hora', { ascending: true });
          
        if (error) throw error;
        
        if (data && data.length > 0) {
          const mapped: Appointment[] = data.map((d: any) => ({
            id: d.id,
            clientId: d.cliente_id,
            clientName: d.clientes?.nome || '',
            dateTime: d.data_hora,
            service: d.servico || 'Compromisso',
            professional: d.profissional || '',
            status: (d.status || 'Pendente') as Appointment['status'],
            notes: d.notas,
          }));
          setTodayAppointments(mapped);
          setTimeout(() => setIsOpen(true), 1500);
          sessionStorage.setItem(reminderKey, 'shown');
        }
      } catch (err) {
        console.error('[TodayReminder] Erro ao buscar compromissos:', err);
      }
    };

    fetchToday();
  }, [tenantId]);

  if (!isOpen || todayAppointments.length === 0) return null;

  const formatTime = (dateTime: string) => {
    const d = new Date(dateTime);
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Manaus' });
  };

  const handleDismiss = () => {
    setIsOpen(false);
    setDismissed(true);
  };

  const handleGoToAgenda = () => {
    handleDismiss();
    onNavigate?.('agenda');
  };

  return (
    <div className="fixed inset-0 z-[500] flex items-center justify-center p-4 animate-in fade-in duration-500">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-slate-900/70 backdrop-blur-sm"
        onClick={handleDismiss}
      />

      {/* Modal */}
      <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-500">
        
        {/* Header */}
        <div className="bg-gradient-to-br from-legal-navy via-legal-navy to-blue-900 p-8 text-white relative overflow-hidden">
          <div className="absolute -top-8 -right-8 w-36 h-36 bg-white/5 rounded-full" />
          <div className="absolute -bottom-6 -left-6 w-24 h-24 bg-legal-bronze/20 rounded-full" />
          <button
            onClick={handleDismiss}
            className="absolute top-4 right-4 p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-full transition-colors z-10"
          >
            <X size={18} />
          </button>

          <div className="relative z-10 flex items-start gap-4">
            <div className="w-14 h-14 bg-legal-bronze/20 rounded-2xl flex items-center justify-center shrink-0 border border-legal-bronze/30">
              <CalendarCheck size={28} className="text-legal-bronze" />
            </div>
            <div>
              <p className="text-white/60 text-xs font-bold uppercase tracking-widest mb-1">Lembrete do Dia</p>
              <h2 className="text-2xl font-black leading-tight">
                {todayAppointments.length === 1
                  ? 'Você tem 1 compromisso hoje!'
                  : `Você tem ${todayAppointments.length} compromissos hoje!`}
              </h2>
              <p className="text-white/50 text-sm mt-1">
                {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}
              </p>
            </div>
          </div>
        </div>

        {/* Lista de Compromissos */}
        <div className="p-6 space-y-3 max-h-72 overflow-y-auto">
          {todayAppointments.map((app, idx) => (
            <div
              key={app.id}
              className="flex items-start gap-4 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-legal-bronze/30 transition-colors"
            >
              {/* Número/Horário */}
              <div className="flex flex-col items-center gap-1">
                <div className="w-9 h-9 rounded-xl bg-legal-navy text-white flex items-center justify-center font-black text-sm dark:bg-legal-bronze">
                  {String(idx + 1).padStart(2, '0')}
                </div>
                <div className="flex items-center gap-1 text-[10px] font-bold text-legal-bronze whitespace-nowrap">
                  <Clock size={10} />
                  {formatTime(app.dateTime)}
                </div>
              </div>

              {/* Detalhes */}
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-800 dark:text-white text-sm truncate">
                  {app.service}
                </p>
                <div className="flex flex-wrap gap-3 mt-1.5">
                  <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                    <User2 size={12} className="text-slate-400" />
                    {app.clientName || 'Cliente não informado'}
                  </span>
                  {app.professional && (
                    <span className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                      <Briefcase size={12} className="text-slate-400" />
                      {app.professional}
                    </span>
                  )}
                </div>
                {app.status && (
                  <span className={`inline-flex items-center gap-1 mt-1.5 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide
                    ${app.status === 'Confirmado' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400' 
                      : 'bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${app.status === 'Confirmado' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {app.status}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleDismiss}
            className="flex-1 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-sm hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
          >
            Fechar
          </button>
          <button
            onClick={handleGoToAgenda}
            className="flex-1 py-3 rounded-2xl bg-legal-navy text-white font-bold text-sm hover:brightness-110 shadow-lg shadow-legal-navy/20 flex items-center justify-center gap-2 transition-all"
          >
            <CalendarCheck size={16} />
            Ver Agenda
          </button>
        </div>
      </div>
    </div>
  );
};
