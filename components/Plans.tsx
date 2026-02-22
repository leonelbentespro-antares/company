
import React, { useState } from 'react';
import {
  Check,
  Zap,
  ShieldCheck,
  Rocket,
  Crown,
  ArrowRight,
  Mail,
  CreditCard,
  Lock,
  ChevronRight,
  Sparkles,
  X
} from 'lucide-react';
import { PLANS } from '../constants.ts';
import { PlanName } from '../types.ts';
import { supabase } from '../services/supabaseClient';

interface PlansProps {
  currentPlan?: PlanName;
  userEmail?: string;
}

export const Plans: React.FC<PlansProps> = ({ currentPlan = PlanName.Starter, userEmail = 'usuario@lexhub.com.br' }) => {
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [step, setStep] = useState<'selection' | 'checkout' | 'success'>('selection');
  const [loading, setLoading] = useState(false);

  const handleOpenCheckout = (plan: any) => {
    setSelectedPlan(plan);
    setStep('checkout');
    setIsCheckoutOpen(true);
  };

  const handleConfirmUpgrade = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('create-checkout', {
        body: { planId: selectedPlan?.stripePriceId }
      });
      if (error) throw error;

      if (data?.url) {
        window.location.href = data.url;
      } else {
        setStep('success'); // Fallback in case of no url configured properly yet
      }
    } catch (err) {
      console.error('Error creating checkout session', err);
      alert('Erro ao processar checkout. Verifique o console.');
    } finally {
      setLoading(false);
    }
  };

  const closeModals = () => {
    setIsCheckoutOpen(false);
    setStep('selection');
    setSelectedPlan(null);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20">
      <div className="text-center max-w-3xl mx-auto space-y-4">
        <h2 className="text-4xl font-extrabold text-legal-navy tracking-tight">
          Escalone sua banca com o <span className="text-legal-bronze">plano ideal</span>
        </h2>
        <p className="text-slate-500 text-lg font-medium">
          Escolha a potência necessária para gerir seus processos e clientes com total segurança e automação.
        </p>
      </div>

      {/* Plan Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
        {PLANS.map((plan) => {
          const isCurrent = plan.name === currentPlan;
          const isPro = plan.name === PlanName.Professional;
          const isEnterprise = plan.name === PlanName.Enterprise;

          return (
            <div
              key={plan.name}
              className={`relative bg-white rounded-[2.5rem] p-8 border-2 transition-all hover:shadow-2xl hover:-translate-y-2 flex flex-col ${isPro ? 'border-legal-bronze shadow-xl shadow-legal-bronze/10' : 'border-slate-100'
                }`}
            >
              {isPro && (
                <div className="absolute -top-5 left-1/2 -translate-x-1/2 bg-legal-bronze text-white px-6 py-1.5 rounded-full text-xs font-bold uppercase tracking-widest flex items-center gap-2">
                  <Sparkles size={14} /> Mais Popular
                </div>
              )}

              <div className="mb-8">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 ${isEnterprise ? 'bg-legal-navy text-white' : isPro ? 'bg-legal-bronze text-white' : 'bg-slate-100 text-slate-600'
                  }`}>
                  {isEnterprise ? <Crown size={28} /> : isPro ? <Zap size={28} /> : <Rocket size={28} />}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 mb-2">{plan.name}</h3>
                <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-black text-slate-900">R$ {plan.price}</span>
                  <span className="text-slate-400 font-bold text-sm">/mês</span>
                </div>
                <p className="text-slate-400 text-xs mt-2 font-bold uppercase tracking-wider">Setup: R$ {plan.setupFee}</p>
              </div>

              <div className="space-y-4 mb-10 flex-1">
                <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                  <span>{plan.limits.maxUsers === 'Unlimited' ? 'Usuários Ilimitados' : `${plan.limits.maxUsers} Usuários`}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                  <span>{plan.limits.maxClients === 'Unlimited' ? 'Clientes Ilimitados' : `${plan.limits.maxClients} Clientes`}</span>
                </div>
                <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                  <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                  <span>{plan.limits.storageGB} GB Armazenamento</span>
                </div>
                {plan.limits.apiAccess && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                    <span>Acesso Total via API</span>
                  </div>
                )}
                {plan.limits.whiteLabel && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                    <span>White-label (Marca Própria)</span>
                  </div>
                )}
                {plan.limits.aiAgents && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                    <span>{plan.limits.aiAgents === 'Unlimited' ? 'Agentes de IA Ilimitados' : `${plan.limits.aiAgents} Agente de IA`}</span>
                  </div>
                )}
                {plan.limits.automations && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                    <span>Automações</span>
                  </div>
                )}
                {plan.limits.triggers && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                    <span>Disparos</span>
                  </div>
                )}
                {plan.limits.flows && (
                  <div className="flex items-center gap-3 text-sm font-bold text-slate-700">
                    <div className="w-5 h-5 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></div>
                    <span>Fluxo Próprio</span>
                  </div>
                )}
              </div>

              {isCurrent ? (
                <div className="w-full py-4 bg-slate-100 text-slate-400 rounded-2xl font-bold flex items-center justify-center gap-2 cursor-default">
                  <ShieldCheck size={20} /> Plano Atual
                </div>
              ) : (
                <button
                  onClick={() => handleOpenCheckout(plan)}
                  className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-lg ${isPro ? 'bg-legal-bronze text-white shadow-legal-bronze/20 hover:brightness-110' : 'bg-legal-navy text-white shadow-legal-navy/20 hover:brightness-110'
                    }`}
                >
                  Fazer Upgrade <ArrowRight size={20} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Checkout & Success Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={closeModals}></div>
          <div className="relative bg-white rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">

            {step === 'checkout' && (
              <>
                <div className="bg-legal-navy p-8 text-white relative">
                  <button onClick={closeModals} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg"><Lock size={28} /></div>
                    <div>
                      <h3 className="text-2xl font-bold">Finalizar Upgrade</h3>
                      <p className="text-white/60 text-sm">Transação segura e criptografada.</p>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-6">
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 flex justify-between items-center">
                    <div>
                      <p className="text-xs font-bold text-slate-400 uppercase">Plano Selecionado</p>
                      <p className="text-lg font-bold text-legal-navy">{selectedPlan?.name}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-400 uppercase">Mensalidade</p>
                      <p className="text-lg font-bold text-legal-bronze">R$ {selectedPlan?.price}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cartão de Crédito</label>
                      <div className="relative">
                        <CreditCard className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={20} />
                        <input type="text" placeholder="0000 0000 0000 0000" disabled className="w-full pl-12 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium opacity-60" defaultValue="•••• •••• •••• 8842" />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Vencimento</label>
                        <input type="text" placeholder="MM/AA" disabled className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium opacity-60" defaultValue="12/28" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">CVV</label>
                        <input type="text" placeholder="123" disabled className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm font-medium opacity-60" defaultValue="•••" />
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={handleConfirmUpgrade}
                    disabled={loading}
                    className="w-full py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20 flex items-center justify-center gap-3 hover:brightness-110 disabled:opacity-50 transition-all"
                  >
                    {loading ? <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div> : (
                      <>Pagar R$ {selectedPlan?.price} Agora <ChevronRight size={18} /></>
                    )}
                  </button>

                  <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-tight">Ao confirmar, você concorda com nossos termos de serviço.</p>
                </div>
              </>
            )}

            {step === 'success' && (
              <div className="p-12 text-center space-y-6">
                <div className="w-24 h-24 bg-emerald-50 rounded-full flex items-center justify-center text-emerald-500 mx-auto animate-bounce">
                  <Check size={48} strokeWidth={3} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-3xl font-bold text-slate-900">Upgrade Concluído!</h3>
                  <p className="text-slate-500 font-medium">Sua conta agora é <strong>{selectedPlan?.name}</strong>.</p>
                </div>

                <div className="bg-emerald-50 p-6 rounded-[2rem] border border-emerald-100 flex items-center gap-4 text-left">
                  <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-emerald-600 shadow-sm"><Mail size={24} /></div>
                  <div>
                    <p className="text-xs font-bold text-emerald-800 uppercase tracking-widest">E-mail de Confirmação Enviado</p>
                    <p className="text-sm text-emerald-700">Enviamos os detalhes da sua assinatura para <strong>{userEmail}</strong>.</p>
                  </div>
                </div>

                <button
                  onClick={closeModals}
                  className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold shadow-lg hover:bg-slate-800 transition-all"
                >
                  Ir para o Painel
                </button>
              </div>
            )}

          </div>
        </div>
      )}
    </div>
  );
};
