
import React, { useState } from 'react';
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
  CheckCircle2
} from 'lucide-react';
import { useLanguage } from '../services/languageContext';

interface Event {
  id: string;
  title: string;
  client: string;
  time: string;
  day: number; // 0-6 (Sun-Sat)
  type: 'audiencia' | 'reuniao' | 'prazo';
  professional: string;
}

export const AgendaView: React.FC = () => {
  const { t } = useLanguage();
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [selectedProfessional, setSelectedProfessional] = useState('all');

  const professionals = [
    { id: '1', name: 'Dr. Sarah Smith', color: 'bg-rose-500' },
    { id: '2', name: 'Dr. John Doe', color: 'bg-blue-500' },
    { id: '3', name: 'Dra. Elena Silva', color: 'bg-emerald-500' }
  ];

  const categories = [
    { id: 'audiencia', label: 'Audiências', color: 'bg-rose-400' },
    { id: 'reuniao', label: 'Reuniões', color: 'bg-sky-400' },
    { id: 'prazo', label: 'Prazos Críticos', color: 'bg-amber-400' }
  ];

  const events: Event[] = [
    { id: '1', title: 'Audiência de Instrução', client: 'Jardel Bandeira', time: '10:00', day: 2, type: 'audiencia', professional: 'Dr. Sarah Smith' },
    { id: '2', title: 'Reunião de Alinhamento', client: 'Adina Sousa', time: '11:00', day: 3, type: 'reuniao', professional: 'Dr. Sarah Smith' },
    { id: '3', title: 'Petição Inicial', client: 'Straus 🐿️', time: '14:00', day: 5, type: 'prazo', professional: 'Dra. Elena Silva' }
  ];

  const days = [
    { short: 'SEG', num: 16 },
    { short: 'TER', num: 17 },
    { short: 'QUA', num: 18 },
    { short: 'QUI', num: 19 },
    { short: 'SEX', num: 20 },
    { short: 'SÁB', num: 21 },
    { short: 'DOM', num: 22 },
  ];

  const hours = Array.from({ length: 12 }, (_, i) => `${(i + 8).toString().padStart(2, '0')}:00`);

  return (
    <div className="flex flex-col lg:flex-row gap-6 min-h-[calc(100vh-160px)] animate-in fade-in duration-500">
      
      {/* Sidebar de Filtros */}
      <aside className="w-full lg:w-72 space-y-8 bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-sm border border-slate-100 dark:border-slate-800 transition-colors">
        
        <div className="space-y-4">
          <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Advogados</label>
          <div className="space-y-2">
            <button 
              onClick={() => setSelectedProfessional('all')}
              className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${selectedProfessional === 'all' ? 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400 shadow-sm border border-rose-100 dark:border-rose-800' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
            >
              <Users size={18} />
              <span>Todos</span>
            </button>
            {professionals.map(p => (
              <button 
                key={p.id}
                onClick={() => setSelectedProfessional(p.id)}
                className={`w-full flex items-center gap-3 p-4 rounded-2xl transition-all font-bold text-sm ${selectedProfessional === p.id ? 'bg-slate-100 dark:bg-slate-800 text-legal-navy dark:text-white' : 'text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
              >
                <div className={`w-2 h-2 rounded-full ${p.color}`}></div>
                <span>{p.name}</span>
              </button>
            ))}
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
            <h2 className="text-2xl font-black text-legal-navy dark:text-white tracking-tight">Agenda Semanal</h2>
            <div className="flex items-center gap-4 text-slate-400 font-bold text-sm">
              <button className="hover:text-legal-navy dark:hover:text-white transition-colors"><ChevronLeft size={20} /></button>
              <span className="uppercase tracking-widest text-[10px] text-slate-600 dark:text-slate-400">16 SEG — 22 DOM, 2026</span>
              <button className="hover:text-legal-navy dark:hover:text-white transition-colors"><ChevronRight size={20} /></button>
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
            
            <button className="bg-rose-500 hover:bg-rose-600 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 shadow-lg shadow-rose-500/20 transition-all active:scale-95">
              <Plus size={20} />
              <span>Novo</span>
            </button>
          </div>
        </div>

        {/* Hour Grid */}
        <div className="flex-1 overflow-x-auto">
          <div className="min-w-[800px] h-full flex flex-col">
            
            {/* Days Header */}
            <div className="flex border-b border-slate-50 dark:border-slate-800">
              <div className="w-20 p-4 text-[10px] font-black text-slate-300 dark:text-slate-600 uppercase border-r border-slate-50 dark:border-slate-800 flex items-center justify-center">GMT-3</div>
              {days.map((d, i) => (
                <div key={i} className="flex-1 p-4 text-center border-r last:border-r-0 border-slate-50 dark:border-slate-800">
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">{d.short}</p>
                  <p className={`text-xl font-black ${d.num === 16 ? 'text-rose-500' : 'text-legal-navy dark:text-white'}`}>{d.num}</p>
                </div>
              ))}
            </div>

            {/* Time Slots */}
            <div className="flex-1 overflow-y-auto">
              {hours.map((hour, hIndex) => (
                <div key={hIndex} className="flex border-b border-slate-50 dark:border-slate-800 hover:bg-slate-50/30 dark:hover:bg-slate-800/10 transition-colors">
                  <div className="w-20 p-4 text-[10px] font-black text-slate-400 dark:text-slate-500 border-r border-slate-50 dark:border-slate-800 text-center">{hour}</div>
                  {days.map((_, dIndex) => {
                    const event = events.find(e => e.time === hour && e.day === dIndex + 1);
                    return (
                      <div key={dIndex} className="flex-1 p-1 border-r last:border-r-0 border-slate-50 dark:border-slate-800 relative group min-h-[80px]">
                        {event && (
                          <div className={`absolute inset-1 p-3 rounded-xl ${event.type === 'audiencia' ? 'bg-rose-50 dark:bg-rose-900/20 border-l-4 border-rose-500' : event.type === 'reuniao' ? 'bg-sky-50 dark:bg-sky-900/20 border-l-4 border-sky-500' : 'bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500'} shadow-sm animate-in zoom-in-95 duration-300 cursor-pointer hover:shadow-md transition-all`}>
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
          </div>
        </div>
      </div>
    </div>
  );
};
