
import React, { useState, useEffect, useMemo } from 'react';
import { 
  CreditCard, 
  ArrowUpRight, 
  Download, 
  CheckCircle2, 
  Clock, 
  Zap, 
  Users, 
  HardDrive, 
  Plus,
  ShieldCheck,
  ChevronRight,
  X,
  Lock,
  Loader2,
  Check,
  FileText,
  Rocket,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  Edit2,
  Trash2,
  Save,
  DollarSign,
  Calendar
} from 'lucide-react';
import { useLanguage } from '../services/languageContext.tsx';
import { PLANS } from '../constants.ts';
import { PlanName } from '../types.ts';
import { useTenant } from '../services/tenantContext.tsx';
import { supabase } from '../services/supabaseClient';

interface BillingProps {
  userEmail?: string;
}

interface ContractRecord {
  id: string;
  client: string;
  value: number;
  status: 'Paid' | 'Regular' | 'Late';
  dueDate: string;
  category: string;
}

const INITIAL_CONTRACTS: ContractRecord[] = [
  { id: 'ct1', client: 'Carlos Eduardo Oliveira', value: 2500, status: 'Paid', dueDate: '2024-06-10', category: 'Mensalidade' },
  { id: 'ct2', client: 'Maria Helena Souza', value: 1800, status: 'Regular', dueDate: '2024-06-20', category: 'Consultoria' },
  { id: 'ct3', client: 'TecnoLogic LTDA', value: 5000, status: 'Late', dueDate: '2024-06-05', category: 'Êxito' },
  { id: 'ct4', client: 'Roberto J. Pereira', value: 1200, status: 'Paid', dueDate: '2024-05-12', category: 'Mensalidade' },
  { id: 'ct5', client: 'Condomínio Solar', value: 3200, status: 'Late', dueDate: '2024-06-01', category: 'Honorários' },
];
export const Billing: React.FC<BillingProps> = ({ userEmail = 'usuario@lexhub.com.br' }) => {
  const { t, locale } = useLanguage();
  const { tenant, subscription, user: authUser, refresh } = useTenant();
  
  // Mapear o plano do banco de dados para o PlanName do frontend
  const activePlan = useMemo(() => {
    const dbPlan = subscription?.plan || tenant?.plan || 'Starter';
    if (dbPlan === 'Professional') return PlanName.Professional;
    if (dbPlan === 'Enterprise') return PlanName.Enterprise;
    return PlanName.Starter;
  }, [subscription, tenant]);

  const [isAddMethodModalOpen, setIsAddMethodModalOpen] = useState(false);
  const [isPlanModalOpen, setIsPlanModalOpen] = useState(false);
  const [isContractModalOpen, setIsContractModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [planChangeStep, setPlanChangeStep] = useState<'selection' | 'processing' | 'success'>('selection');
  const [showToast, setShowToast] = useState<{message: string, type: 'success' | 'error'} | null>(null);
  const [selectedNewPlan, setSelectedNewPlan] = useState<PlanName | null>(null);
  const [checkoutLoading, setCheckoutLoading] = useState(false);
  
  // Gestão de Recebíveis State
  const [contracts, setContracts] = useState<ContractRecord[]>(() => {
    const saved = localStorage.getItem('lexhub_receivables');
    return saved ? JSON.parse(saved) : INITIAL_CONTRACTS;
  });
  const [isEntryModalOpen, setIsEntryModalOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ContractRecord | null>(null);
  const [entryFormData, setEntryFormData] = useState<Omit<ContractRecord, 'id'>>({
    client: '',
    value: 0,
    status: 'Regular',
    dueDate: new Date().toISOString().split('T')[0],
    category: 'Mensalidade'
  });

  useEffect(() => {
    localStorage.setItem('lexhub_receivables', JSON.stringify(contracts));
  }, [contracts]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // Cálculos dinâmicos do Dashboard
  const stats = useMemo(() => {
    const paidValue = contracts.filter(c => c.status === 'Paid').reduce((acc, curr) => acc + curr.value, 0);
    const lateValue = contracts.filter(c => c.status === 'Late').reduce((acc, curr) => acc + curr.value, 0);
    const regularCount = contracts.filter(c => c.status === 'Regular').length;
    
    return {
      paid: paidValue,
      paidCount: contracts.filter(c => c.status === 'Paid').length,
      regularCount,
      late: lateValue,
      lateCount: contracts.filter(c => c.status === 'Late').length
    };
  }, [contracts]);

  const handleOpenEntryModal = (entry?: ContractRecord) => {
    if (entry) {
      setEditingEntry(entry);
      setEntryFormData({
        client: entry.client,
        value: entry.value,
        status: entry.status,
        dueDate: entry.dueDate,
        category: entry.category
      });
    } else {
      setEditingEntry(null);
      setEntryFormData({
        client: '',
        value: 0,
        status: 'Regular',
        dueDate: new Date().toISOString().split('T')[0],
        category: 'Mensalidade'
      });
    }
    setIsEntryModalOpen(true);
  };

  const handleSaveEntry = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingEntry) {
      setContracts(prev => prev.map(c => c.id === editingEntry.id ? { ...c, ...entryFormData } : c));
      setShowToast({ message: t.common.saveChanges === 'Save Changes' ? 'Entry updated successfully!' : 'Lançamento atualizado com sucesso!', type: 'success' });
    } else {
      const newEntry: ContractRecord = {
        id: `ct_${Date.now()}`,
        ...entryFormData
      };
      setContracts([newEntry, ...contracts]);
      setShowToast({ message: t.common.saveChanges === 'Save Changes' ? 'New financial entry recorded!' : 'Novo lançamento financeiro registrado!', type: 'success' });
    }
    setIsEntryModalOpen(false);
  };

  const handleDeleteEntry = (id: string) => {
    if (confirm(locale === 'en' ? "Are you sure you want to delete this entry?" : locale === 'es' ? "¿Está seguro de que desea eliminar este registro?" : "Deseja realmente excluir este lançamento?")) {
      setContracts(prev => prev.filter(c => c.id !== id));
      setShowToast({ message: locale === 'en' ? 'Entry removed.' : locale === 'es' ? 'Registro eliminado.' : 'Lançamento removido.', type: 'error' });
    }
  };

  const toggleContractStatus = (id: string) => {
    setContracts(prev => prev.map(c => {
      if (c.id !== id) return c;
      const next: Record<string, 'Paid' | 'Regular' | 'Late'> = {
        'Paid': 'Regular',
        'Regular': 'Late',
        'Late': 'Paid'
      };
      return { ...c, status: next[c.status] };
    }));
  };

  const getTranslatedCategory = (cat: string) => {
    if (cat === 'Mensalidade') return t.billing.categoryMonthly;
    if (cat === 'Consultoria') return t.billing.categoryConsultancy;
    if (cat === 'Honorários') return t.billing.categoryFees;
    if (cat === 'Êxito') return t.billing.categorySuccess;
    if (cat === 'Custas Processuais') return t.billing.categoryCosts;
    return cat;
  };

  const getTranslatedStatus = (status: string) => {
    if (status === 'Paid') return t.billing.liquidated;
    if (status === 'Regular') return t.billing.open;
    if (status === 'Late') return t.billing.late;
    return status;
  };

  // Funções de Checkout SaaS Originais
  const handleSavePaymentMethod = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      setIsAddMethodModalOpen(false);
      setShowToast({ message: locale === 'en' ? 'New payment method added!' : locale === 'es' ? '¡Nuevo método de pago añadido!' : 'Novo método de pagamento adicionado!', type: 'success' });
    }, 1500);
  };

  const handlePlanChange = async (planName: PlanName) => {
    const targetPlan = PLANS.find(p => p.name === planName);
    if (!targetPlan) return;

    setSelectedNewPlan(planName);
    setPlanChangeStep('processing');
    setCheckoutLoading(true);

    try {
      const res = await supabase.functions.invoke('create-checkout', {
        body: {
          planId: targetPlan.stripePriceId,
          rootEmail: authUser?.email || tenant?.domain + '@placeholder.com',
          rootUserId: authUser?.id || 'tenant-' + tenant?.id
        }
      });

      const { data, error } = res;
      if (error) {
        let detail = '';
        try {
          const jsonErr = await error.context.json();
          detail = JSON.stringify(jsonErr);
        } catch (e) { }
        throw new Error(error.message + ' | Details: ' + detail);
      }

      if (data?.url) {
        window.location.href = data.url;
      } else {
        // Se não houver URL, simulamos sucesso (ambiente de teste sem stripe configurado)
        setPlanChangeStep('success');
        refresh(); // Tentar atualizar dados locais
      }
    } catch (err: any) {
      console.error('Erro ao redirecionar para o checkout:', err);
      setShowToast({ 
        message: 'Erro ao processar plano: ' + (err.message || 'Erro desconhecido'), 
        type: 'error' 
      });
      setPlanChangeStep('selection');
    } finally {
      setCheckoutLoading(false);
    }
  };

  return (
    <div className="space-y-12 animate-in fade-in duration-500 pb-20 relative">
      
      {showToast && (
        <div className={`fixed top-24 right-8 z-[150] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${showToast.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
          <div className="bg-white/20 p-1.5 rounded-full">
            <Check size={20} />
          </div>
          <p className="font-bold text-sm">{showToast.message}</p>
        </div>
      )}

      {/* --- DASHBOARD DE CONTRATOS E RECEBÍVEIS --- */}
      <section className="space-y-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h2 className="text-3xl font-black text-legal-navy dark:text-white flex items-center gap-3">
              <div className="p-2 bg-legal-navy dark:bg-legal-bronze text-white rounded-xl shadow-lg">
                <TrendingUp size={24} />
              </div>
              {t.billing.title}
            </h2>
            <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{t.billing.subtitle}</p>
          </div>
          <button 
            onClick={() => handleOpenEntryModal()}
            className="flex items-center gap-2 px-6 py-3.5 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold text-sm hover:scale-105 transition-all shadow-xl shadow-legal-navy/10"
          >
            <Plus size={18} /> {t.billing.newEntry}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card: Contratos Pagos (Liquidados) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
              <CheckCircle2 size={80} className="text-emerald-500" />
            </div>
            <p className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest mb-4">{t.billing.totalLiquidated}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">R$ {stats.paid.toLocaleString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-BR')}</h3>
              <span className="text-xs font-bold text-slate-400">({stats.paidCount})</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 w-fit px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800">
              <ArrowUpRight size={12}/> {t.billing.revenueConfirmed}
            </div>
          </div>

          {/* Card: Ativos Regular (Em dia) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
              <Users size={80} className="text-blue-500" />
            </div>
            <p className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-4">{t.billing.onTimeClients}</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">{stats.regularCount}</h3>
              <span className="text-xs font-bold text-slate-400">{t.billing.financialHealth.toLowerCase()}</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-blue-600 bg-blue-50 dark:bg-blue-900/20 w-fit px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800">
              <ShieldCheck size={12}/> {t.billing.financialHealth}
            </div>
          </div>

          {/* Card: Inadimplentes (Em atraso) */}
          <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-rose-100 dark:border-rose-900/30 shadow-sm relative overflow-hidden group hover:shadow-xl transition-all">
            <div className="absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform">
              <AlertTriangle size={80} className="text-rose-500" />
            </div>
            <p className="text-[10px] font-black text-rose-600 dark:text-rose-400 uppercase tracking-widest mb-4">Em Atraso (Inadimplência)</p>
            <div className="flex items-baseline gap-2">
              <h3 className="text-3xl font-black text-slate-900 dark:text-white">R$ {stats.late.toLocaleString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-BR')}</h3>
              <span className="text-xs font-bold text-slate-400">({stats.lateCount})</span>
            </div>
            <div className="mt-4 flex items-center gap-2 text-[10px] font-bold text-rose-600 bg-rose-50 dark:bg-rose-900/20 w-fit px-3 py-1 rounded-full border border-rose-100 dark:border-rose-800">
              <Clock size={12}/> {t.billing.recommendedAction}
            </div>
          </div>
        </div>

        {/* Tabela de Gestão de Recebíveis */}
        <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden transition-colors">
          <div className="p-6 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-800/50">
             <h4 className="text-sm font-black text-slate-900 dark:text-white uppercase tracking-widest flex items-center gap-2">
               <FileText size={18} className="text-legal-bronze" /> {t.billing.receivablesBook}
             </h4>
             <div className="flex items-center gap-3">
               <span className="text-[10px] font-bold text-slate-400 uppercase">{t.billing.filter}:</span>
               <select className="bg-white dark:bg-slate-700 border border-slate-100 dark:border-slate-600 rounded-lg text-[10px] font-bold py-1 px-2 outline-none dark:text-white transition-colors">
                  <option>{t.billing.allStatus}</option>
                  <option>{t.billing.paid}</option>
                  <option>{t.billing.toExpire}</option>
                  <option>{t.billing.lateFilter}</option>
               </select>
             </div>
          </div>
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left">
              <thead>
                <tr className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50/30 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800">
                  <th className="px-8 py-5">{t.billing.beneficiaryClient}</th>
                  <th className="px-8 py-5">{t.billing.category}</th>
                  <th className="px-8 py-5">{t.billing.grossValue}</th>
                  <th className="px-8 py-5">{t.billing.dueDate}</th>
                  <th className="px-8 py-5">{t.billing.status}</th>
                  <th className="px-8 py-5 text-center">{t.billing.actions}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {contracts.map(c => (
                  <tr key={c.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                    <td className="px-8 py-5">
                      <div className="flex items-center gap-3">
                         <div className="w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-xl flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm font-bold shadow-sm">
                           {c.client.charAt(0)}
                         </div>
                         <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{c.client}</span>
                      </div>
                    </td>
                    <td className="px-8 py-5">
                      <span className="text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 px-2 py-1 rounded-md uppercase border border-slate-200 dark:border-slate-700">{getTranslatedCategory(c.category)}</span>
                    </td>
                    <td className="px-8 py-5 text-sm font-black text-slate-900 dark:text-white">{locale === 'en' ? '$' : 'R$'} {c.value.toLocaleString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-BR')}</td>
                    <td className="px-8 py-5 text-xs font-bold text-slate-400 uppercase">{new Date(c.dueDate).toLocaleDateString(locale === 'en' ? 'en-US' : locale === 'es' ? 'es-ES' : 'pt-BR')}</td>
                    <td className="px-8 py-5">
                       <button 
                        onClick={() => toggleContractStatus(c.id)}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-[10px] font-black uppercase tracking-tighter transition-all hover:scale-105 shadow-sm border ${
                          c.status === 'Paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800' :
                          c.status === 'Regular' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800' : 
                          'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/20 dark:text-rose-400 dark:border-rose-800'
                        }`}
                       >
                         {c.status === 'Paid' ? <CheckCircle2 size={12}/> : c.status === 'Regular' ? <Clock size={12}/> : <AlertTriangle size={12}/>}
                         {getTranslatedStatus(c.status)}
                       </button>
                    </td>
                    <td className="px-8 py-5">
                      <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button onClick={() => handleOpenEntryModal(c)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-legal-navy dark:hover:text-legal-bronze rounded-xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm"><Edit2 size={16}/></button>
                        <button onClick={() => handleDeleteEntry(c.id)} className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all border border-slate-100 dark:border-slate-700 shadow-sm"><Trash2 size={16}/></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* --- SEÇÃO DE ASSINATURA SAAS --- */}
      <div className="pt-12 border-t border-slate-100 dark:border-slate-800 space-y-8">
        <div>
           <h2 className="text-2xl font-black text-legal-navy dark:text-white flex items-center gap-3">
             <div className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-xl">
               <Rocket size={20} />
             </div>
             {t.billing.mySubscription}
           </h2>
           <p className="text-slate-500 dark:text-slate-400 text-sm font-medium mt-1">{t.billing.subscriptionSubtitle}</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-legal-navy rounded-[2.5rem] p-8 text-white relative overflow-hidden shadow-xl shadow-legal-navy/20">
            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12">
              <CreditCard size={180} />
            </div>
            
            <div className="relative z-10 flex flex-col h-full justify-between">
              <div>
                <div className="flex items-center gap-3 mb-6">
                  <div className="bg-legal-bronze p-2 rounded-xl">
                    <Zap size={24} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Plano {activePlan}</h3>
                    <p className="text-white/60 text-sm">{t.billing.planRenew.replace('{date}', t.common.saveChanges === 'Save Changes' ? 'June 15, 2024' : '15 de Junho, 2024')}</p>
                  </div>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-extrabold">R$ {PLANS.find(p => p.name === activePlan)?.price},00</span>
                  <span className="text-white/60 font-medium">/ mês</span>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-4">
                <button 
                  onClick={() => setIsPlanModalOpen(true)}
                  className="px-6 py-3 bg-white text-legal-navy rounded-2xl font-bold text-sm hover:scale-105 transition-all flex items-center gap-2 shadow-lg"
                >
                  {t.billing.changePlan} <ArrowUpRight size={18} />
                </button>
                <button 
                  onClick={() => setIsContractModalOpen(true)}
                  className="px-6 py-3 bg-white/10 text-white rounded-2xl font-bold text-sm hover:bg-white/20 transition-all border border-white/20"
                >
                  {t.billing.contractDetails}
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] p-8 border border-slate-200 dark:border-slate-800 shadow-sm space-y-6 transition-colors">
            <h4 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
              <ShieldCheck className="text-legal-bronze" size={20} />
              {t.billing.accountUsage}
            </h4>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><Users size={12}/> {t.billing.users}</span>
                  <span className="dark:text-slate-300">12 / {PLANS.find(p => p.name === activePlan)?.limits.maxUsers === 'Unlimited' ? '∞' : PLANS.find(p => p.name === activePlan)?.limits.maxUsers}</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-legal-navy dark:bg-legal-bronze rounded-full transition-all duration-1000" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase tracking-widest">
                  <span className="flex items-center gap-1"><HardDrive size={12}/> {t.billing.storage}</span>
                  <span className="dark:text-slate-300">22.4 GB / {PLANS.find(p => p.name === activePlan)?.limits.storageGB} GB</span>
                </div>
                <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                  <div className="h-full bg-legal-bronze rounded-full transition-all duration-1000" style={{ width: '45%' }}></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* --- MODAIS DE GESTÃO DE LANÇAMENTOS --- */}
      {isEntryModalOpen && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsEntryModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 transition-colors">
             <div className="bg-legal-navy p-8 text-white relative">
                <button onClick={() => setIsEntryModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                <div className="flex items-center gap-4">
                   <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg"><DollarSign size={28} /></div>
                   <div>
                      <h3 className="text-2xl font-black">{editingEntry ? t.billing.editEntry : t.billing.newEntryTitle}</h3>
                      <p className="text-white/60 text-[10px] font-black uppercase tracking-widest">{t.billing.entrySubtitle}</p>
                   </div>
                </div>
             </div>

             <form onSubmit={handleSaveEntry} className="p-8 space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.billing.beneficiaryClient}</label>
                   <input required type="text" placeholder={t.common.saveChanges === 'Save Changes' ? "Client's full name" : "Nome completo do cliente"} className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5" value={entryFormData.client} onChange={e => setEntryFormData({...entryFormData, client: e.target.value})} />
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.billing.grossValue} (R$)</label>
                      <input required type="number" step="0.01" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5" value={entryFormData.value} onChange={e => setEntryFormData({...entryFormData, value: parseFloat(e.target.value)})} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.billing.dueDate}</label>
                      <input required type="date" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5" value={entryFormData.dueDate} onChange={e => setEntryFormData({...entryFormData, dueDate: e.target.value})} />
                   </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.billing.category}</label>
                      <select className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none" value={entryFormData.category} onChange={e => setEntryFormData({...entryFormData, category: e.target.value})}>
                         <option>{t.billing.categoryMonthly}</option>
                         <option>{t.billing.categoryConsultancy}</option>
                         <option>{t.billing.categoryFees}</option>
                         <option>{t.billing.categorySuccess}</option>
                         <option>{t.billing.categoryCosts}</option>
                      </select>
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">{t.billing.status}</label>
                      <select className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none" value={entryFormData.status} onChange={e => setEntryFormData({...entryFormData, status: e.target.value as any})}>
                         <option value="Regular">{t.billing.open}</option>
                         <option value="Paid">{t.billing.liquidated}</option>
                         <option value="Late">{t.billing.late}</option>
                      </select>
                   </div>
                </div>

                <div className="pt-6 flex gap-4">
                   <button type="button" onClick={() => setIsEntryModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold transition-colors">{t.common.cancel}</button>
                   <button type="submit" className="flex-1 py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-2 hover:brightness-110">
                      <Save size={18} /> {editingEntry ? t.common.saveChanges : t.billing.newEntryTitle}
                   </button>
                </div>
             </form>
          </div>
        </div>
      )}

      {/* --- MODAIS DE ASSINATURA SAAS --- */}
      {isPlanModalOpen && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => !isSaving && setIsPlanModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 transition-colors">
             {planChangeStep === 'selection' && (
               <>
                 <div className="bg-legal-navy p-10 text-white relative">
                    <button onClick={() => setIsPlanModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full"><X size={24} /></button>
                    <div className="flex items-center gap-5">
                       <div className="w-16 h-16 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-xl"><Sparkles size={32} /></div>
                       <div>
                          <h3 className="text-3xl font-bold">{t.billing.chooseUpgrade}</h3>
                          <p className="text-white/60">{t.billing.upgradeSubtitle}</p>
                       </div>
                    </div>
                 </div>
                 <div className="p-10 grid grid-cols-1 md:grid-cols-3 gap-6">
                    {PLANS.map((plan) => (
                      <div key={plan.name} className={`p-6 rounded-3xl border-2 transition-all flex flex-col justify-between ${activePlan === plan.name ? 'border-legal-bronze bg-slate-50 dark:bg-slate-800' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}>
                        <div>
                          <div className="flex justify-between items-center mb-4">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{plan.name}</span>
                          </div>
                          <h4 className="text-2xl font-black text-slate-900 dark:text-white mb-6">{locale === 'en' ? '$' : 'R$'} {plan.price}<span className="text-xs font-bold text-slate-400">{locale === 'en' ? '/mo' : '/mês'}</span></h4>
                          <ul className="space-y-3 mb-8">
                            <li className="flex items-center gap-2 text-xs font-bold text-slate-600 dark:text-slate-400"><Users size={14} className="text-legal-bronze"/> {plan.limits.maxUsers === 'Unlimited' ? (locale === 'en' ? 'Unlimited Users' : locale === 'es' ? 'Usuarios Ilimitados' : 'Usuários Ilimitados') : `${plan.limits.maxUsers} ${t.billing.users}`}</li>
                          </ul>
                        </div>
                        {activePlan === plan.name ? (
                          <div className="w-full py-3 bg-slate-200 dark:bg-slate-700 text-slate-500 dark:text-slate-400 rounded-xl text-center text-xs font-bold cursor-default">{t.billing.currentPlan}</div>
                        ) : (
                          <button onClick={() => handlePlanChange(plan.name)} className="w-full py-3 bg-legal-navy dark:bg-legal-bronze text-white rounded-xl text-xs font-bold hover:brightness-110 transition-all">{t.billing.select}</button>
                        )}
                      </div>
                    ))}
                 </div>
               </>
             )}
             {planChangeStep === 'processing' && (
               <div className="p-20 text-center space-y-8 flex flex-col items-center justify-center min-h-[500px]">
                  <Loader2 size={80} className="text-legal-navy dark:text-legal-bronze animate-spin" />
                  <h3 className="text-2xl font-bold text-legal-navy dark:text-white">{t.billing.processingPayment}</h3>
               </div>
             )}
             {planChangeStep === 'success' && (
               <div className="p-16 text-center space-y-10 flex flex-col items-center justify-center min-h-[500px]">
                  <div className="w-24 h-24 bg-emerald-50 text-emerald-500 rounded-full flex items-center justify-center shadow-xl animate-bounce">
                    <Check size={48} strokeWidth={3} />
                  </div>
                  <h3 className="text-3xl font-extrabold text-legal-navy dark:text-white tracking-tight">{t.billing.paymentConfirmed}</h3>
                  <button onClick={() => setIsPlanModalOpen(false)} className="px-12 py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-2xl">{t.billing.finish}</button>
               </div>
             )}
          </div>
        </div>
      )}
    </div>
  );
};
