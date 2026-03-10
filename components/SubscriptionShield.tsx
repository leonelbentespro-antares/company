import React from 'react';
import { useTenant } from '../services/tenantContext.tsx';
import { ShieldAlert, CreditCard, Lock, ArrowRight } from 'lucide-react';

interface SubscriptionShieldProps {
    children: React.ReactNode;
}

const SubscriptionShield: React.FC<SubscriptionShieldProps> = ({ children }) => {
    const { isBlocked, blockReason, subscription } = useTenant();

    if (!isBlocked) {
        return <>{children}</>;
    }

    return (
        <div className="relative w-full h-full min-h-[400px]">
            {/* O conteúdo original fica desfocado por baixo */}
            <div className="filter blur-sm pointer-events-none select-none opacity-40 h-full w-full">
                {children}
            </div>

            {/* Overlay de Bloqueio */}
            <div className="absolute inset-0 z-50 flex items-center justify-center p-6 bg-white/60 backdrop-blur-md">
                <div className="max-w-md w-full bg-white rounded-2xl shadow-2xl border border-red-100 p-8 text-center animate-in fade-in zoom-in duration-300">
                    <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
                        <ShieldAlert className="w-10 h-10 text-red-600" />
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-3">
                        {blockReason === 'PAST_DUE' ? 'Pagamento Atrasado' : 'Acesso Restrito'}
                    </h2>

                    <p className="text-gray-600 mb-8 leading-relaxed">
                        {blockReason === 'PAST_DUE' 
                            ? 'Sua assinatura está com pagamento pendente há mais de 3 dias. Para continuar utilizando o LexHub, por favor atualize seus dados de cobrança.'
                            : 'Você não possui uma assinatura ativa ou seu plano foi cancelado. Escolha um plano para liberar os recursos do sistema.'}
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => window.location.href = '/dashboard/plans'}
                            className="w-full h-12 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-red-200"
                        >
                            <CreditCard className="w-5 h-5" />
                            {blockReason === 'PAST_DUE' ? 'Atualizar Pagamento' : 'Ver Planos Disponíveis'}
                        </button>

                        <button
                            onClick={() => window.location.href = 'mailto:suporte@lexhub.com.br'}
                            className="w-full h-12 bg-gray-50 hover:bg-gray-100 text-gray-700 font-medium rounded-xl transition-all flex items-center justify-center gap-2"
                        >
                            Falar com o Suporte
                        </button>
                    </div>

                    {subscription && (
                        <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-center gap-4 text-xs text-gray-400">
                            <span className="flex items-center gap-1">
                                <Lock className="w-3 h-3" />
                                Status: <span className="font-semibold uppercase">{subscription.status}</span>
                            </span>
                            <span className="w-1 h-1 bg-gray-200 rounded-full" />
                            <span>ID: {subscription.id.slice(0, 8)}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default SubscriptionShield;
