
import React, { useState, useMemo, useEffect } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  Plus, 
  Users, 
  Clock, 
  Filter,
  Search,
  MoreVertical,
  CheckCircle2,
  X,
  Save,
  Trash2,
  CalendarDays,
  UserPlus
} from 'lucide-react';
import { useLanguage } from '../services/languageContext';
import { useTenant } from '../services/tenantContext';
import { getAppointments } from '../services/supabaseService';
import { supabase } from '../services/supabaseClient';
import { Appointment } from '../types';

interface Event {
  id: string;
  title: string;
  client: string;
  time: string;
  day: number; // 0-6 (Sun-Sat)
  type: 'audiencia' | 'reuniao' | 'prazo';
  professional: string;
  notes?: string;
}

interface Professional {
  id: string;
  name: string;
  color: string;
  role?: string;
}

export const AgendaView: React.FC = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedProfessional, setSelectedProfessional] = useState('all');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [isAddProfModalOpen, setIsAddProfModalOpen] = useState(false);
  const [newProfName, setNewProfName] = useState('');
  const [newProfRole, setNewProfRole] = useState('');
  
  // Estado inicial de eventos
  const [events, setEvents] = useState<Event[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { tenantId } = useTenant();

  const PROF_COLORS = [
    'bg-rose-500', 'bg-blue-500', 'bg-emerald-500', 'bg-amber-500',
    'bg-purple-500', 'bg-cyan-500', 'bg-orange-500', 'bg-indigo-500'
  ];

  // Form de novo/editar evento
  const [eventForm, setEventForm] = useState<Partial<Event>>({
    type: 'reuniao',
    professional: '',
    day: 1
  });

  const categories = [
    { id: 'audiencia', label: 'Audiências', color: 'bg-rose-400' },
    { id: 'reuniao', label: 'Reuniões', color: 'bg-sky-400' },
    { id: 'prazo', label: 'Prazos Críticos', color: 'bg-amber-400' }
  ];

  const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);
  const days = [
    { short: 'SEG', num: 1 },
    { short: 'TER', num: 2 },
    { short: 'QUA', num: 3 },
    { short: 'QUI', num: 4 },
    { short: 'SEX', num: 5 },
    { short: 'SÁB', num: 6 },
    { short: 'DOM', num: 7 },
  ];

  // Lógica de Data Real
  const [currentDate, setCurrentDate] = useState(new Date()); 

  // Carregar membros da equipe como profissionais
  useEffect(() => {
    if (!tenantId) return;
    const loadProfessionals = async () => {
      try {
        const { data } = await supabase
          .from('team_members')
          .select('id, name, role')
          .eq('tenant_id', tenantId)
          .eq('status', 'active')
          .order('name');
        if (data && data.length > 0) {
          setProfessionals(data.map((m: any, idx: number) => ({
            id: m.id,
            name: m.name,
            role: m.role,
            color: PROF_COLORS[idx % PROF_COLORS.length]
          })));
        }
      } catch (err) {
        console.error('[Agenda] Erro ao carregar profissionais:', err);
      }
    };
    loadProfessionals();
  }, [tenantId]);

  // Efeito para carregar agendamentos do Supabase
  useEffect(() => {
    if (!tenantId) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const data = await getAppointments(tenantId);
        setAppointments(data);
        
        // Mapear Appointments para o formato Event usado no grid
        const mappedEvents: Event[] = data.map(app => {
          const date = new Date(app.dateTime);
          return {
            id: app.id,
            title: app.service,
            client: app.clientName || 'Cliente',
            time: date.getHours().toString().padStart(2, '0') + ':00',
            day: date.getDay(), // 0-6
            dateStr: `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`, // YYYY-MM-DD local
            type: app.service.toLowerCase().includes('audi') ? 'audiencia' : 'reuniao',
            professional: app.professional,
            notes: app.notes
          };
        });
        setEvents(mappedEvents as any);
      } catch (error) {
        console.error('Erro ao carregar agendamentos:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [tenantId]);

  const getWeekDays = (date: Date) => {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Ajuste para segunda-feira
    start.setDate(diff);
    
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return {
        short: d.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase().replace('.', ''),
        num: d.getDate(),
        full: d
      };
    });
  };

  const getMonthDays = (date: Date) => {
    const start = new Date(date.getFullYear(), date.getMonth(), 1);
    const last = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    const daysArr = [];
    
    // Preencher dias do mês anterior
    const firstDayIndex = start.getDay() === 0 ? 6 : start.getDay() - 1;
    for (let i = firstDayIndex; i > 0; i--) {
      const d = new Date(start);
      d.setDate(start.getDate() - i);
      daysArr.push({ num: d.getDate(), current: false, date: d });
    }
    
    // Dias do mês atual
    for (let i = 1; i <= last.getDate(); i++) {
      const d = new Date(date.getFullYear(), date.getMonth(), i);
      daysArr.push({ num: i, current: true, date: d });
    }
    
    return daysArr;
  };

  const handleNavigate = (direction: 'prev' | 'next') => {
    const newDate = new Date(currentDate);
    if (viewMode === 'day') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    } else if (viewMode === 'week') {
      newDate.setDate(currentDate.getDate() + (direction === 'next' ? 7 : -7));
    } else {
      newDate.setMonth(currentDate.getMonth() + (direction === 'next' ? 1 : -1));
    }
    setCurrentDate(newDate);
  };

  const currentDays = useMemo(() => getWeekDays(currentDate), [currentDate]);
  
  const dateRangeLabel = useMemo(() => {
    if (viewMode === 'day') {
      return currentDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' }).toUpperCase();
    } else if (viewMode === 'week') {
      const start = currentDays[0].full;
      const end = currentDays[6].full;
      return `${start.getDate()} ${start.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()} — ${end.getDate()} ${end.toLocaleDateString('pt-BR', { month: 'short' }).toUpperCase()}, ${end.getFullYear()}`;
    } else {
      return currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }).toUpperCase();
    }
  }, [viewMode, currentDate, currentDays]);

  const filteredEvents = useMemo(() => {
    let evs = events;
    if (selectedProfessional !== 'all') {
      const profName = professionals.find(p => p.id === selectedProfessional)?.name;
      evs = events.filter(e => e.professional === profName);
    }
    return evs;
  }, [events, selectedProfessional]);

  const handleOpenModal = (event?: Event) => {
    if (event) {
      setEditingEvent(event);
      setEventForm(event);
    } else {
      setEditingEvent(null);
      setEventForm({
        type: 'reuniao',
        professional: professionals[0]?.name || '',
        day: currentDate.getDay(),
        time: '08:00'
      });
    }
    setIsModalOpen(true);
  };

  const handleSaveEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEvent) {
      setEvents(events.map(ev => ev.id === editingEvent.id ? { ...ev, ...eventForm } as Event : ev));
    } else {
      const newEvent = {
        ...eventForm,
        id: Math.random().toString(36).substr(2, 9),
      } as Event;
      setEvents([...events, newEvent]);
    }
    setIsModalOpen(false);
  };

  const handleDeleteEvent = (id: string) => {
    setEvents(events.filter(e => e.id !== id));
    setIsModalOpen(false);
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-160px)] animate-in fade-in duration-500">
      
      {/* Sidebar de Filtros */}
      <aside className="w-full lg:w-72 space-y-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Profissionais</label>
            <button
              onClick={() => setIsAddProfModalOpen(true)}
              title="Cadastrar profissional"
              className="w-7 h-7 rounded-xl bg-legal-bronze/10 hover:bg-legal-bronze/20 flex items-center justify-center text-legal-bronze transition-colors"
            >
              <UserPlus size={14} />
            </button>
          </div>
          <div className="space-y-2">
            <button 
              onClick={() => setSelectedProfessional('all')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${selectedProfessional === 'all' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-800' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Users size={18} />
              <span>Todos</span>
            </button>
            {professionals.length === 0 ? (
              <button
                onClick={() => setIsAddProfModalOpen(true)}
                className="w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-400 hover:border-legal-bronze hover:text-legal-bronze transition-all font-bold text-sm"
              >
                <UserPlus size={16} />
                <span>Cadastrar profissional</span>
              </button>
            ) : (
              professionals.map(p => (
                <button 
                  key={p.id}
                  onClick={() => setSelectedProfessional(p.id)}
                  className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${selectedProfessional === p.id ? 'bg-slate-100 dark:bg-slate-800 text-legal-navy dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${p.color}`}></div>
                  <div className="flex-1 text-left">
                    <span className="block">{p.name}</span>
                    {p.role && <span className="text-[10px] font-normal text-slate-400">{p.role}</span>}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="space-y-4 pt-4 border-t border-slate-50 dark:border-slate-800">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Tipos de Serviço</label>
          <div className="space-y-3">
            {categories.map(c => (
              <div key={c.id} className="flex items-center gap-3 px-4 py-1 group cursor-pointer">
                <div className={`w-3 h-3 rounded-full ${c.color} transition-transform group-hover:scale-125`}></div>
                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </aside>

      {/* Main Agenda Grid */}
      <div className="flex-1 bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 overflow-hidden flex flex-col transition-colors">
        
        {/* Header da Agenda */}
        <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-legal-navy dark:text-white tracking-tight">
              {viewMode === 'day' ? 'Agenda Diária' : viewMode === 'week' ? 'Agenda Semanal' : 'Agenda Mensal'}
            </h2>
            <div className="flex items-center gap-4 text-slate-400 font-bold text-sm">
              <button onClick={() => handleNavigate('prev')} className="hover:text-legal-navy dark:hover:text-white transition-colors cursor-pointer p-1"><ChevronLeft size={20} /></button>
              <span className="uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400 min-w-[180px] text-center font-black">
                {dateRangeLabel}
              </span>
              <button onClick={() => handleNavigate('next')} className="hover:text-legal-navy dark:hover:text-white transition-colors cursor-pointer p-1"><ChevronRight size={20} /></button>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="bg-slate-50 dark:bg-slate-800 p-1 rounded-2xl flex border border-slate-100 dark:border-slate-700">
              {(['day', 'week', 'month'] as const).map(mode => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${viewMode === mode ? 'bg-white dark:bg-slate-900 text-rose-500 shadow-sm' : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'}`}
                >
                  {mode === 'day' ? 'Dia' : mode === 'week' ? 'Semana' : 'Mês'}
                </button>
              ))}
            </div>
            
            <button 
              onClick={() => handleOpenModal()}
              className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all active:scale-95"
            >
              <Plus size={20} />
              <span>Novo</span>
            </button>
          </div>
        </div>

        {/* Dynamic Grid Overlay */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[800px] h-full flex flex-col">
            
            {viewMode === 'month' ? (
              /* MONTH VIEW */
              <div className="flex-1 flex flex-col">
                <div className="grid grid-cols-7 border-b border-slate-50 dark:border-slate-800">
                  {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(d => (
                    <div key={d} className="p-4 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">{d}</div>
                  ))}
                </div>
                <div className="flex-1 grid grid-cols-7 auto-rows-fr">
                  {getMonthDays(currentDate).map((d, i) => (
                    <div key={i} className={`p-4 border-r border-b border-slate-50 dark:border-slate-800 min-h-[100px] transition-colors ${!d.current ? 'bg-slate-50/50 dark:bg-slate-800/10 grayscale' : 'hover:bg-slate-50/30 dark:hover:bg-slate-800/10'}`}>
                      <p className={`text-sm font-black mb-2 ${d.current ? 'text-legal-navy dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>{d.num}</p>
                      {/* Simulação de eventos no mês */}
                      {d.current && d.num % 5 === 0 && (
                        <div className="bg-rose-500/10 border-l-2 border-rose-500 p-1.5 rounded-md mb-1">
                          <p className="text-[8px] font-black text-rose-600 truncate uppercase">Audiência</p>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              /* DAY / WEEK VIEW */
              <>
                {/* Days Header */}
                <div className="flex border-b border-slate-50 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-800/30">
                  <div className="w-20 p-4 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase border-r border-slate-50 dark:border-slate-800 flex items-center justify-center">GMT-3</div>
                  {(viewMode === 'day' ? [{ short: currentDate.toLocaleDateString('pt-BR', { weekday: 'short' }).toUpperCase(), num: currentDate.getDate() }] : currentDays).map((d, i) => (
                    <div key={i} className="flex-1 p-4 text-center border-r last:border-r-0 border-slate-50 dark:border-slate-800">
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{d.short}</p>
                      <p className={`text-xl font-black ${d.num === new Date().getDate() ? 'text-rose-500' : 'text-legal-navy dark:text-white'}`}>{d.num}</p>
                    </div>
                  ))}
                </div>

                {/* Time Slots */}
                <div className="flex-1 overflow-y-auto">
                  {hours.map((hour, hIndex) => (
                    <div key={hIndex} className="flex border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                      <div className="w-20 p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 border-r border-slate-50 dark:border-slate-800 text-center">{hour}</div>
                      {(viewMode === 'day' ? [0] : Array.from({ length: 7 }, (_, i) => i)).map((dIndex) => {
                        // Lógica de mapeamento de evento (Baseada na data real do slot)
                        const slotDate = viewMode === 'day' ? currentDate : currentDays[dIndex].full;
                        const slotDateStr = `${slotDate.getFullYear()}-${(slotDate.getMonth() + 1).toString().padStart(2, '0')}-${slotDate.getDate().toString().padStart(2, '0')}`;

                        const event = filteredEvents.find((e: any) => 
                          e.dateStr === slotDateStr && 
                          e.time === hour
                        );
                        
                        return (
                          <div key={dIndex} className="flex-1 p-1 border-r last:border-r-0 border-slate-50 dark:border-slate-800 relative group min-h-[80px]">
                            {event && (
                              <div 
                                onClick={() => handleOpenModal(event)}
                                className={`absolute inset-1 p-3 rounded-xl z-10 ${event.type === 'audiencia' ? 'bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500' : event.type === 'reuniao' ? 'bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500' : 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500'} shadow-sm animate-in zoom-in-95 duration-300 cursor-pointer hover:shadow-md transition-all`}
                              >
                                <p className="text-[9px] font-black uppercase text-slate-500 dark:text-slate-400 mb-1 leading-none">{event.type}</p>
                                <p className="text-xs font-bold text-legal-navy dark:text-white leading-tight mb-1">{event.title}</p>
                                <p className="text-[10px] font-bold text-rose-500 truncate">{event.client}</p>
                              </div>
                            )}
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-legal-navy/5 dark:bg-white/5 pointer-events-none transition-opacity"></div>
                          </div>
                        );
                      })}
                    </div>
                  ))}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal de Evento (Novo/Editar) */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between bg-slate-50/50 dark:bg-slate-800/50">
              <h3 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter">
                {editingEvent ? 'Editar Compromisso' : 'Novo Compromisso'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white dark:hover:bg-slate-800 rounded-full transition-colors text-slate-400">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEvent} className="p-8 space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Tipo</label>
                  <select 
                    value={eventForm.type}
                    onChange={(e) => setEventForm({...eventForm, type: e.target.value as any})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  >
                    <option value="audiencia">Audiência</option>
                    <option value="reuniao">Reunião</option>
                    <option value="prazo">Prazo Crítico</option>
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Responsável</label>
                  <select 
                    value={eventForm.professional}
                    onChange={(e) => setEventForm({...eventForm, professional: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  >
                    {professionals.length === 0 ? (
                      <option value="">Nenhum profissional cadastrado</option>
                    ) : (
                      professionals.map(p => <option key={p.id} value={p.name}>{p.name}</option>)
                    )}
                  </select>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Assunto / Título</label>
                <input 
                  type="text"
                  required
                  value={eventForm.title || ''}
                  onChange={(e) => setEventForm({...eventForm, title: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  placeholder="Ex: Audiência de Instrução"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cliente</label>
                <input 
                  type="text"
                  required
                  value={eventForm.client || ''}
                  onChange={(e) => setEventForm({...eventForm, client: e.target.value})}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  placeholder="Nome do cliente"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Dia da Semana</label>
                  <select 
                    value={eventForm.day}
                    onChange={(e) => setEventForm({...eventForm, day: Number(e.target.value)})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  >
                    {days.map((d, i) => <option key={i} value={i+1}>{d.short}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Horário</label>
                  <select 
                    value={eventForm.time}
                    onChange={(e) => setEventForm({...eventForm, time: e.target.value})}
                    className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-rose-500/5 outline-none dark:text-white"
                  >
                    {hours.map((h, i) => <option key={i} value={h}>{h}</option>)}
                  </select>
                </div>
              </div>

              <div className="pt-6 flex gap-4">
                {editingEvent && (
                  <button
                    type="button"
                    onClick={() => handleDeleteEvent(editingEvent.id)}
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
                  {editingEvent ? 'Salvar Alterações' : 'Criar Compromisso'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Cadastro de Profissional */}
      {isAddProfModalOpen && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={() => setIsAddProfModalOpen(false)} />
          <div className="relative bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden animate-in zoom-in-95 z-10">
            <div className="bg-gradient-to-br from-legal-navy to-blue-900 p-8 text-white">
              <button onClick={() => setIsAddProfModalOpen(false)} className="absolute top-4 right-4 p-2 text-white/60 hover:text-white transition-colors rounded-full hover:bg-white/10">
                <X size={18} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-legal-bronze/20 rounded-2xl flex items-center justify-center border border-legal-bronze/30">
                  <UserPlus size={22} className="text-legal-bronze" />
                </div>
                <div>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Agenda</p>
                  <h3 className="text-xl font-black">Cadastrar Profissional</h3>
                </div>
              </div>
            </div>

            <form
              className="p-8 space-y-6"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newProfName.trim() || !tenantId) return;
                try {
                  const { data, error } = await supabase
                    .from('team_members')
                    .insert({
                      tenant_id: tenantId,
                      name: newProfName.trim(),
                      role: newProfRole.trim() || 'Advogado',
                      status: 'active'
                    })
                    .select('id, name, role')
                    .single();
                  if (error) throw error;
                  const idx = professionals.length;
                  setProfessionals(prev => [...prev, {
                    id: data.id,
                    name: data.name,
                    role: data.role,
                    color: PROF_COLORS[idx % PROF_COLORS.length]
                  }]);
                  setNewProfName('');
                  setNewProfRole('');
                  setIsAddProfModalOpen(false);
                } catch (err: any) {
                  alert('Erro ao cadastrar: ' + err.message);
                }
              }}
            >
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome completo</label>
                <input
                  type="text"
                  required
                  value={newProfName}
                  onChange={(e) => setNewProfName(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-legal-navy/10 dark:text-white transition-all"
                  placeholder="Ex: Dr. João da Silva"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Especialidade</label>
                <input
                  type="text"
                  value={newProfRole}
                  onChange={(e) => setNewProfRole(e.target.value)}
                  className="w-full p-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold outline-none focus:ring-4 focus:ring-legal-navy/10 dark:text-white transition-all"
                  placeholder="Ex: Advogado Trabalhista"
                />
              </div>
              <button
                type="submit"
                className="w-full py-4 bg-legal-navy text-white rounded-2xl font-black uppercase tracking-widest shadow-lg hover:brightness-110 transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <UserPlus size={18} />
                Cadastrar Profissional
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
