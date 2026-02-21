
import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Users,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  Download,
  Loader2,
  CheckCircle2,
  Calendar,
  Sparkles,
  Zap,
  Info,
  X,
  Settings2,
  Plus,
  Scale,
  Briefcase,
  Eye,
  EyeOff,
  LayoutGrid,
  Check,
  Calculator,
  Trash2,
  BarChart,
  PieChart
} from 'lucide-react';
import {
  AreaChart,
  Area,
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell
} from 'recharts';
import { COLORS } from '../constants.ts';
import { User, UserRole, Tenant, Process } from '../types.ts';
import { getTenants, getProcesses, getMyTenant } from '../services/supabaseService.ts';
import { useTenant } from '../services/tenantContext.tsx';

const dataPerformance = [
  { name: 'Jan', mrr: 65000, processes: 120 },
  { name: 'Fev', mrr: 68000, processes: 145 },
  { name: 'Mar', mrr: 72000, processes: 160 },
  { name: 'Abr', mrr: 78000, processes: 190 },
  { name: 'Mai', mrr: 84000, processes: 210 },
  { name: 'Jun', mrr: 84520, processes: 235 },
];

interface DashboardProps {
  onNavigate?: (tab: string) => void;
  currentUser: User | null;
}

interface WidgetConfig {
  id: string;
  label: string;
  category: 'metric' | 'chart' | 'list' | 'custom';
  roles: UserRole[];
  enabled: boolean;
  icon: React.ReactNode;
  dataSource?: 'processes' | 'tenants' | 'mrr';
  operation?: 'count' | 'sum' | 'avg';
  color?: string;
}

const ICON_OPTIONS = [
  { id: 'scale', icon: <Scale size={16} /> },
  { id: 'users', icon: <Users size={16} /> },
  { id: 'credit', icon: <CreditCard size={16} /> },
  { id: 'zap', icon: <Zap size={16} /> },
  { id: 'trending', icon: <TrendingUp size={16} /> },
  { id: 'briefcase', icon: <Briefcase size={16} /> },
];

export const Dashboard: React.FC<DashboardProps> = ({ onNavigate, currentUser }) => {
  const { tenantId, tenant: myTenant } = useTenant();
  const [isExporting, setIsExporting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCustomizing, setIsCustomizing] = useState(false);
  const [isCreatingMetric, setIsCreatingMetric] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [processes, setProcesses] = useState<Process[]>([]);

  useEffect(() => {
    if (!tenantId) return;
    // Admin vê todos os tenants; outros vêem apenas seus próprios dados
    if (currentUser?.role === UserRole.Admin) {
      getTenants().then(setTenants).catch(console.error);
    } else if (myTenant) {
      setTenants([myTenant as any]);
    }
    getProcesses(tenantId).then(setProcesses).catch(console.error);
  }, [tenantId, myTenant]);

  const [widgets, setWidgets] = useState<WidgetConfig[]>([
    { id: 'mrr', label: 'Métrica: MRR Realizado', category: 'metric', roles: [UserRole.Admin], enabled: true, icon: <CreditCard size={14} /> },
    { id: 'arr', label: 'Métrica: ARR Projetado', category: 'metric', roles: [UserRole.Admin], enabled: true, icon: <Zap size={14} /> },
    { id: 'churn', label: 'Métrica: Churn Rate', category: 'metric', roles: [UserRole.Admin], enabled: true, icon: <Layers size={14} /> },
    { id: 'ltv', label: 'Métrica: LTV', category: 'metric', roles: [UserRole.Admin, UserRole.Lawyer], enabled: true, icon: <TrendingUp size={14} /> },
    { id: 'tenants_count', label: 'Métrica: Total de Tenants', category: 'metric', roles: [UserRole.Admin], enabled: true, icon: <Briefcase size={14} /> },
    { id: 'processes_count', label: 'Métrica: Processos Ativos', category: 'metric', roles: [UserRole.Admin, UserRole.Lawyer], enabled: true, icon: <Scale size={14} /> },
    { id: 'revenue_chart', label: 'Gráfico: Performance de Receita', category: 'chart', roles: [UserRole.Admin], enabled: true, icon: <TrendingUp size={14} /> },
    { id: 'retention_chart', label: 'Gráfico: Retenção (Churn)', category: 'chart', roles: [UserRole.Admin], enabled: true, icon: <Layers size={14} /> },
    { id: 'infra_status', label: 'Status: Infraestrutura', category: 'list', roles: [UserRole.Admin, UserRole.Lawyer], enabled: true, icon: <Zap size={14} /> },
  ]);

  const [newMetricForm, setNewMetricForm] = useState({
    label: '',
    dataSource: 'processes' as 'processes' | 'tenants' | 'mrr',
    operation: 'count' as 'count' | 'sum' | 'avg',
    iconId: 'scale'
  });

  useEffect(() => {
    const saved = localStorage.getItem(`lexhub-dashboard-v2-${currentUser?.id}`);
    if (saved) {
      try {
        const savedWidgets = JSON.parse(saved);
        const merged = savedWidgets.map((sw: any) => {
          const original = widgets.find(w => w.id === sw.id);
          if (original) return { ...sw, icon: original.icon };
          if (sw.category === 'custom') {
            const iconOption = ICON_OPTIONS.find(io => io.id === sw.iconId);
            return { ...sw, icon: iconOption?.icon || <Calculator size={14} /> };
          }
          return sw;
        });
        setWidgets(merged);
      } catch (e) { console.error("Error parsing widgets", e); }
    }
  }, [currentUser]);

  const persistWidgets = (updated: WidgetConfig[]) => {
    const toSave = updated.map(({ icon, ...rest }) => rest);
    localStorage.setItem(`lexhub-dashboard-v2-${currentUser?.id}`, JSON.stringify(toSave));
    setWidgets(updated);
  };

  const toggleWidget = (id: string) => {
    const updated = widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w);
    persistWidgets(updated);
  };

  const deleteCustomMetric = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = widgets.filter(w => w.id !== id);
    persistWidgets(updated);
  };

  const handleCreateMetric = (e: React.FormEvent) => {
    e.preventDefault();
    const iconOption = ICON_OPTIONS.find(io => io.id === newMetricForm.iconId);

    const customMetric: WidgetConfig = {
      id: `custom_${Date.now()}`,
      label: newMetricForm.label,
      category: 'custom',
      roles: [UserRole.Admin, UserRole.Lawyer],
      enabled: true,
      icon: iconOption?.icon || <Calculator size={14} />,
      dataSource: newMetricForm.dataSource,
      operation: newMetricForm.operation,
      // @ts-ignore
      iconId: newMetricForm.iconId
    };

    const updated = [...widgets, customMetric];
    persistWidgets(updated);
    setIsCreatingMetric(false);
    setNewMetricForm({ label: '', dataSource: 'processes', operation: 'count', iconId: 'scale' });
  };

  const calculateValue = (widget: WidgetConfig) => {
    if (widget.category !== 'custom') return 0;
    switch (widget.dataSource) {
      case 'processes': return processes.length;
      case 'tenants': return tenants.length;
      case 'mrr':
        const total = tenants.reduce((sum, t) => sum + t.mrr, 0);
        return widget.operation === 'avg' ? (total / (tenants.length || 1)).toFixed(0) : total;
      default: return 0;
    }
  };

  const handleExport = () => {
    setIsExporting(true);
    setTimeout(() => {
      setIsExporting(false);
      setShowFeedback(true);
      setTimeout(() => setShowFeedback(false), 3000);
    }, 1500);
  };

  const filteredWidgets = widgets.filter(w => w.roles.includes(currentUser?.role || UserRole.Lawyer));
  const totalTenants = tenants.length;
  const activeProcesses = processes.filter(p => p.status === 'Active').length;
  const totalMRR = tenants.reduce((sum, t) => sum + t.mrr, 0);

  const MetricCard: React.FC<{ label: string, value: string | number, percentage: number, trend: 'up' | 'down', icon: React.ReactNode, onClick?: () => void }> = ({ label, value, percentage, trend, icon, onClick }) => (
    <div
      onClick={onClick}
      className="bg-white dark:bg-slate-900 p-8 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group cursor-pointer relative overflow-hidden"
    >
      <div className="flex justify-between items-start mb-6">
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-2xl group-hover:bg-legal-navy dark:group-hover:bg-legal-bronze group-hover:text-white transition-colors">
          {icon}
        </div>
        <div className={`flex items-center text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest ${trend === 'up' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600' : 'bg-rose-50 dark:bg-rose-900/20 text-rose-600'
          }`}>
          {trend === 'up' ? <ArrowUpRight size={12} className="mr-1" /> : <ArrowDownRight size={12} className="mr-1" />}
          {percentage}%
        </div>
      </div>
      <p className="text-[11px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 truncate">{label}</p>
      <h3 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight truncate">{value}</h3>
      <div className="mt-6 h-1 w-full bg-slate-50 dark:bg-slate-800 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${trend === 'up' ? 'bg-emerald-500' : 'bg-rose-500'}`} style={{ width: '70%' }}></div>
      </div>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in duration-700 pb-20">
      {showFeedback && (
        <div className="fixed top-24 right-8 z-[150] px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <div className="bg-white/20 p-1.5 rounded-full"><CheckCircle2 size={20} /></div>
          <p className="font-bold text-sm">Dashboard exportado com sucesso!</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-legal-navy dark:text-white tracking-tight">Overview <span className="text-slate-300 dark:text-slate-600 font-light">LexHub</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Olá, {currentUser?.name}. Gerencie sua operação jurídica com métricas personalizadas.</p>
        </div>

        <div className="flex items-center gap-4 w-full md:w-auto">
          <button
            onClick={() => setIsCustomizing(true)}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all shadow-sm"
          >
            <Settings2 size={18} className="text-legal-bronze" /> Personalizar Dashboard
          </button>
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-3.5 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold text-sm hover:brightness-110 transition-all shadow-xl shadow-legal-navy/20"
          >
            {isExporting ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
            {isExporting ? 'Processando...' : 'Exportar Dados'}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {filteredWidgets.filter(w => (w.category === 'metric' || w.category === 'custom') && w.enabled).map(widget => {
          if (widget.category === 'custom') {
            const val = calculateValue(widget);
            const displayVal = widget.dataSource === 'mrr' ? `R$ ${Number(val).toLocaleString('pt-BR')}` : val;
            return <MetricCard key={widget.id} label={widget.label} value={displayVal} percentage={0} trend="up" icon={widget.icon} />;
          }

          switch (widget.id) {
            case 'mrr': return <MetricCard key={widget.id} label="MRR Realizado" value={`R$ ${totalMRR.toLocaleString('pt-BR')}`} percentage={12.5} trend="up" icon={<CreditCard size={20} />} onClick={() => onNavigate?.('billing')} />;
            case 'arr': return <MetricCard key={widget.id} label="ARR Projetado" value={`R$ ${(totalMRR * 12).toLocaleString('pt-BR')}`} percentage={8.2} trend="up" icon={<Zap size={20} />} onClick={() => onNavigate?.('billing')} />;
            case 'tenants_count': return <MetricCard key={widget.id} label="Tenants Ativos" value={totalTenants} percentage={5.4} trend="up" icon={<Briefcase size={20} />} onClick={() => onNavigate?.('tenants')} />;
            case 'processes_count': return <MetricCard key={widget.id} label="Processos no CRM" value={activeProcesses} percentage={10.1} trend="up" icon={<Scale size={20} />} onClick={() => onNavigate?.('processes')} />;
            case 'churn': return <MetricCard key={widget.id} label="Churn Rate" value="1.4%" percentage={0.2} trend="down" icon={<Layers size={20} />} onClick={() => onNavigate?.('security')} />;
            case 'ltv': return <MetricCard key={widget.id} label="Lifetime Value" value="R$ 18.200" percentage={3.1} trend="up" icon={<TrendingUp size={20} />} />;
            default: return null;
          }
        })}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {filteredWidgets.find(w => w.id === 'revenue_chart')?.enabled && (
          <div className="lg:col-span-2 bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm transition-colors">
            <div className="flex justify-between items-center mb-10">
              <div>
                <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                  <TrendingUp size={24} className="text-legal-bronze" />
                  Crescimento Operacional
                </h3>
              </div>
            </div>
            <div className="h-80">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dataPerformance}>
                  <defs>
                    <linearGradient id="colorMrr" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.NAVY} stopOpacity={0.1} />
                      <stop offset="95%" stopColor={COLORS.NAVY} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="5 5" vertical={false} stroke="#f1f5f9" opacity={0.5} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} dy={15} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11, fontWeight: 'bold' }} dx={-10} />
                  <Tooltip contentStyle={{ borderRadius: '20px', border: 'none', boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)', padding: '16px' }} />
                  <Area type="monotone" dataKey="mrr" stroke={COLORS.NAVY} strokeWidth={4} fillOpacity={1} fill="url(#colorMrr)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}

        {filteredWidgets.find(w => w.id === 'retention_chart')?.enabled && (
          <div className="bg-white dark:bg-slate-900 p-10 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-between transition-colors">
            <div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2 uppercase tracking-tighter">
                <Layers size={24} className="text-legal-bronze" />
                Retenção
              </h3>
            </div>
            <div className="h-56 mt-8">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsBarChart data={dataPerformance}>
                  <Bar dataKey="processes" fill={COLORS.NAVY} radius={[4, 4, 0, 0]}>
                    {dataPerformance.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={index === dataPerformance.length - 1 ? COLORS.BRONZE : COLORS.NAVY} />
                    ))}
                  </Bar>
                </RechartsBarChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
      </div>

      {isCustomizing && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsCustomizing(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-3xl overflow-hidden animate-in zoom-in-95 transition-colors">
            <div className="bg-legal-navy p-8 text-white relative">
              <button onClick={() => setIsCustomizing(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg">
                  <LayoutGrid size={32} />
                </div>
                <div>
                  <h3 className="text-2xl font-bold">Personalizar Dashboard</h3>
                  <p className="text-white/60 text-sm">Crie novas métricas ou gerencie as existentes.</p>
                </div>
              </div>
            </div>

            <div className="flex flex-col md:flex-row h-[60vh]">
              <div className="flex-1 overflow-y-auto p-8 border-r border-slate-100 dark:border-slate-800 custom-scrollbar">
                <div className="flex justify-between items-center mb-6">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Widgets Disponíveis</h4>
                  {!isCreatingMetric && (
                    <button
                      onClick={() => setIsCreatingMetric(true)}
                      className="flex items-center gap-1.5 text-[10px] font-black text-legal-bronze hover:underline uppercase"
                    >
                      <Plus size={14} /> Criar Métrica
                    </button>
                  )}
                </div>

                <div className="space-y-3">
                  {filteredWidgets.map((widget) => (
                    <div
                      key={widget.id}
                      onClick={() => toggleWidget(widget.id)}
                      className={`w-full p-4 rounded-2xl border transition-all flex items-center justify-between group cursor-pointer ${widget.enabled
                        ? 'bg-legal-navy text-white border-legal-navy shadow-lg'
                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 text-slate-500'
                        }`}
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${widget.enabled ? 'bg-white/10' : 'bg-slate-50 dark:bg-slate-700'}`}>
                          {widget.icon}
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-bold truncate max-w-[150px]">{widget.label}</p>
                          <p className={`text-[9px] font-black uppercase tracking-widest ${widget.enabled ? 'text-white/50' : 'text-slate-400'}`}>
                            {widget.category}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {widget.category === 'custom' && (
                          <button
                            onClick={(e) => deleteCustomMetric(widget.id, e)}
                            className={`p-1.5 rounded-md hover:bg-rose-500 hover:text-white transition-colors ${widget.enabled ? 'text-white/40' : 'text-slate-300'}`}
                          >
                            <Trash2 size={14} />
                          </button>
                        )}
                        {widget.enabled && <Check size={16} />}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {isCreatingMetric ? (
                <div className="w-full md:w-80 bg-slate-50 dark:bg-slate-800/50 p-8 animate-in slide-in-from-right duration-300">
                  <h4 className="text-sm font-black text-legal-navy dark:text-white uppercase mb-6 flex items-center gap-2">
                    <Calculator size={18} className="text-legal-bronze" /> Nova Métrica
                  </h4>

                  <form onSubmit={handleCreateMetric} className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Nome da Métrica</label>
                      <input
                        required
                        type="text"
                        placeholder="Ex: Total de Ganhos"
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none focus:ring-2 focus:ring-legal-navy/10"
                        value={newMetricForm.label}
                        onChange={(e) => setNewMetricForm({ ...newMetricForm, label: e.target.value })}
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Fonte de Dados</label>
                      <select
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none"
                        value={newMetricForm.dataSource}
                        onChange={(e) => setNewMetricForm({ ...newMetricForm, dataSource: e.target.value as any })}
                      >
                        <option value="processes">Processos Judiciais</option>
                        <option value="tenants">Tenants / Bancas</option>
                        <option value="mrr">Faturamento (MRR)</option>
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cálculo</label>
                      <select
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-bold dark:text-white outline-none"
                        value={newMetricForm.operation}
                        onChange={(e) => setNewMetricForm({ ...newMetricForm, operation: e.target.value as any })}
                      >
                        <option value="count">Contagem Total</option>
                        <option value="sum">Soma de Valores</option>
                        <option value="avg">Média Mensal</option>
                      </select>
                    </div>

                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Ícone Representativo</label>
                      <div className="grid grid-cols-3 gap-2">
                        {ICON_OPTIONS.map(opt => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setNewMetricForm({ ...newMetricForm, iconId: opt.id })}
                            className={`p-3 rounded-xl border flex items-center justify-center transition-all ${newMetricForm.iconId === opt.id ? 'bg-legal-navy text-white border-legal-navy shadow-md' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-700 text-slate-400 hover:bg-slate-50'}`}
                          >
                            {opt.icon}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 space-y-2">
                      <button
                        type="submit"
                        className="w-full py-4 bg-legal-bronze text-white rounded-2xl font-bold text-sm shadow-xl shadow-legal-bronze/20 hover:brightness-110 transition-all"
                      >
                        Adicionar ao Painel
                      </button>
                      <button
                        type="button"
                        onClick={() => setIsCreatingMetric(false)}
                        className="w-full py-3 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600"
                      >
                        Cancelar
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <div className="hidden md:flex flex-1 flex-col items-center justify-center p-10 text-center bg-slate-50 dark:bg-slate-800/20">
                  <PieChart size={48} className="text-slate-200 dark:text-slate-700 mb-4" />
                  <h5 className="text-sm font-bold text-slate-400 mb-2">Painel Dinâmico LexHub</h5>
                  <p className="text-xs text-slate-300 dark:text-slate-500 max-w-[200px]">Selecione os widgets ao lado para compor sua visão operacional.</p>
                </div>
              )}
            </div>

            <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end">
              <button
                onClick={() => setIsCustomizing(false)}
                className="px-10 py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20 hover:brightness-110 transition-all"
              >
                Salvar Painel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
