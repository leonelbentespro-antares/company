
import React, { useState } from 'react';
import { 
  Mail, 
  Lock, 
  User as UserIcon, 
  ArrowRight, 
  ShieldCheck, 
  Scale,
  CheckCircle2,
  Briefcase,
  Users,
  AlertCircle,
  Hash
} from 'lucide-react';
import { UserRole } from '../types.ts';

interface AuthProps {
  onLogin: (userData: any) => void;
}

export const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [authType, setAuthType] = useState<'professional' | 'client'>('professional');
  const [error, setError] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação de senha no cadastro
    if (!isLogin && formData.password !== formData.confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }

    setLoading(true);
    
    // Simulação de autenticação
    setTimeout(() => {
      setLoading(false);
      
      const role = authType === 'client' ? UserRole.Client : UserRole.Admin;
      const name = authType === 'client' ? 'Carlos Eduardo Oliveira' : (formData.name || 'Admin LexHub');
      
      // Gerar um ID de registro único (ex: LH-2024-XXXX)
      const randomSuffix = Math.floor(1000 + Math.random() * 9000);
      const registrationId = `LH-2024-${randomSuffix}`;

      onLogin({ 
        id: Math.random().toString(36).substr(2, 9),
        registrationId: registrationId,
        name: name, 
        email: formData.email || 'contato@exemplo.com',
        role: role,
        avatar: role === UserRole.Client 
          ? 'https://ui-avatars.com/api/?name=Carlos+Eduardo&background=002B49&color=fff' 
          : undefined
      });
    }, 1500);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-inter text-slate-900">
      <div className="max-w-5xl w-full bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[700px]">
        
        {/* Lado Esquerdo - Branding & Info */}
        <div className="md:w-1/2 bg-legal-navy p-12 text-white flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-legal-bronze/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-legal-bronze/10 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-legal-bronze rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                L
              </div>
              <span className="text-2xl font-bold tracking-tight uppercase">LexHub</span>
            </div>
            
            <h1 className="text-4xl font-bold leading-tight mb-6">
              Transparência e <span className="text-legal-bronze">agilidade</span> jurídica.
            </h1>
            <p className="text-slate-300 text-lg mb-8">
              Conectando advogados e clientes em um ambiente digital seguro e intuitivo.
            </p>
          </div>

          <div className="space-y-4 relative z-10">
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <CheckCircle2 size={18} className="text-legal-bronze" />
              <span>Conformidade total com a LGPD</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <ShieldCheck size={18} className="text-legal-bronze" />
              <span>Segurança nível bancário (AES-256)</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-slate-300">
              <Scale size={18} className="text-legal-bronze" />
              <span>Acompanhamento processual em tempo real</span>
            </div>
          </div>
        </div>

        {/* Lado Direito - Form de Auth */}
        <div className="md:w-1/2 p-12 flex flex-col justify-center bg-white relative">
          
          {/* Auth Type Selector */}
          <div className="flex p-1 bg-slate-100 rounded-2xl mb-10 w-full max-w-sm mx-auto">
            <button 
              onClick={() => setAuthType('professional')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${authType === 'professional' ? 'bg-white shadow-sm text-legal-navy' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Briefcase size={14} /> Profissional
            </button>
            <button 
              onClick={() => setAuthType('client')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition-all ${authType === 'client' ? 'bg-legal-bronze shadow-sm text-white' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={14} /> Sou Cliente
            </button>
          </div>

          <div className="mb-8 text-center md:text-left">
            <h2 className="text-3xl font-bold text-legal-navy mb-2">
              {isLogin ? (authType === 'client' ? 'Portal do Cliente' : 'Acesso Profissional') : 'Criar minha conta'}
            </h2>
            <p className="text-slate-500 font-medium">
              {isLogin 
                ? (authType === 'client' ? 'Consulte seus processos com transparência.' : 'Acesse seu painel administrativo.') 
                : 'Cadastre sua banca e comece agora.'}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-rose-50 border border-rose-100 rounded-2xl flex items-center gap-3 text-rose-600 animate-in slide-in-from-top-2">
              <AlertCircle size={20} />
              <p className="text-sm font-bold">{error}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                <div className="relative">
                  <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="text" name="name" required placeholder="Ex: João Silva" 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 transition-all font-medium"
                    value={formData.name} onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <div className="space-y-1">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">
                {authType === 'client' ? 'Seu E-mail ou CPF' : 'E-mail Corporativo'}
              </label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="text" name="email" required placeholder={authType === 'client' ? "nome@email.com" : "advogado@escritorio.com"}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 transition-all font-medium"
                  value={formData.email} onChange={handleChange}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Senha de Acesso</label>
                {isLogin && <a href="#" className="text-[10px] text-legal-bronze font-bold hover:underline uppercase tracking-widest">Esqueceu?</a>}
              </div>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" name="password" required placeholder="••••••••" 
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 transition-all font-medium"
                  value={formData.password} onChange={handleChange}
                />
              </div>
            </div>

            {!isLogin && (
              <div className="space-y-1 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input 
                    type="password" name="confirmPassword" required placeholder="••••••••" 
                    className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 transition-all font-medium"
                    value={formData.confirmPassword} onChange={handleChange}
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" disabled={loading}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-70 mt-4 ${authType === 'client' ? 'bg-legal-bronze text-white shadow-legal-bronze/20' : 'bg-legal-navy text-white shadow-legal-navy/20'}`}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {isLogin ? 'Entrar no Portal' : 'Finalizar Cadastro'}
                  <ArrowRight size={18} />
                </>
              )}
            </button>
          </form>

          {authType === 'professional' && (
            <div className="mt-8 pt-8 border-t border-slate-100 text-center">
              <p className="text-slate-500 text-sm font-medium">
                {isLogin ? 'Não possui uma conta?' : 'Já possui uma conta?'}
                <button 
                  onClick={() => setIsLogin(!isLogin)}
                  className="ml-2 text-legal-navy font-bold hover:underline"
                >
                  {isLogin ? 'Cadastre sua banca' : 'Faça login'}
                </button>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
