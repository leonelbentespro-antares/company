
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
  Hash,
  Eye,
  EyeOff,
  Loader2,
  Server
} from 'lucide-react';
import { UserRole } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import { Turnstile } from '@marsidev/react-turnstile';
import { useLanguage } from '../services/languageContext';

interface AuthProps {
  onLogin: (userData: any) => void;
  initialView?: 'auth' | 'forgot-password' | 'update-password';
}

export const Auth: React.FC<AuthProps> = ({ onLogin, initialView = 'auth' }) => {
  const [view, setView] = useState<'auth' | 'forgot-password' | 'update-password'>(initialView);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [isSignUpSuccess, setIsSignUpSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);
  const [authType, setAuthType] = useState<'professional' | 'client'>('professional');
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  
  const { t } = useLanguage();
  const [isPjeLoading, setIsPjeLoading] = useState(false);
  const [showPjeError, setShowPjeError] = useState(false);

  const handlePjeLogin = async () => {
    setIsPjeLoading(true);
    setShowPjeError(false);
    setError(null);
    try {
      // 1. Tentar conectar com o PJeOffice local (porta padrão 8800)
      const pjeUrl = 'http://127.0.0.1:8800/pjeOffice/';
      const checkRes = await fetch(pjeUrl, { mode: 'no-cors' }).catch(() => null);

      if (!checkRes) {
        throw new Error('PJE_NOT_FOUND');
      }

      // Se respondeu, tentar disparar "assinatura" (Mock local)
      const payload = {
        tarefa: "assinarDados",
        servidor: window.location.origin,
        codigoPerfil: "lexhub-auth",
        dados: [
          {
            idDado: "login-challenge",
            tipoDado: "TEXTO_PURO",
            dado: btoa("lexhub-login-" + Date.now())
          }
        ]
      };

      // Dispara a requisicao de assinatura para o PJeOffice
      const signRes = await fetch('http://127.0.0.1:8800/pjeOffice/requisicao', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      }).catch(() => null);

      if (!signRes || !signRes.ok) {
        throw new Error('PJE_REJECTED');
      }

      // Se passou por tudo, simula login como Admin local
      onLogin({
        id: 'pje-auth-user',
        registrationId: 'OAB-123456',
        name: 'Advogado (PJe)',
        email: 'pje@lexhub.com.br',
        role: UserRole.Admin
      });

    } catch (err: any) {
      if (err.message === 'PJE_NOT_FOUND') {
        setShowPjeError(true);
      } else {
        setError('A assinatura do certificado foi rejeitada ou falhou.');
      }
    } finally {
      setIsPjeLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validação de senha no cadastro ou atualização
    if ((!isLogin || view === 'update-password') && formData.password !== formData.confirmPassword) {
      setError("As senhas digitadas não coincidem.");
      return;
    }

    if ((isLogin || !isLogin) && view === 'auth' && !captchaToken) {
      setError("Por favor, resolva o Captcha antes de continuar.");
      return;
    }

    setLoading(true);

    try {
      if (view === 'forgot-password') {
        const { error: resetError } = await supabase.auth.resetPasswordForEmail(formData.email, {
          redirectTo: window.location.origin,
        });
        if (resetError) throw resetError;
        setResetSuccess(true);
      } else if (view === 'update-password') {
        const { error: updateError } = await supabase.auth.updateUser({
          password: formData.password
        });
        if (updateError) throw updateError;
        setUpdateSuccess(true);
      } else {
        let authUser = null;

        if (isLogin) {
          const { data, error: signInError } = await supabase.auth.signInWithPassword({
            email: formData.email,
            password: formData.password,
            options: {
              captchaToken: captchaToken!
            }
          });
          if (signInError) throw signInError;
          authUser = data.user;
        } else {
          const { data, error: signUpError } = await supabase.auth.signUp({
            email: formData.email,
            password: formData.password,
            options: { 
              data: { full_name: formData.name },
              captchaToken: captchaToken!
            }
          });
          if (signUpError) throw signUpError;
          authUser = data.user;
        }

        const role = authType === 'client' ? UserRole.Client : UserRole.Admin;
        const name = authType === 'client' ? (authUser?.user_metadata?.full_name || 'Cliente') : (formData.name || authUser?.user_metadata?.full_name || 'Usuário');
        const registrationId = `LH-2024-${Math.floor(1000 + Math.random() * 9000)}`;

        if (authUser) {
          if (!isLogin) {
            setIsSignUpSuccess(true);
            return;
          }
          onLogin({
            id: authUser.id,
            registrationId: registrationId,
            name: name,
            email: authUser.email || formData.email,
            role: role
          });
        }
      }
    } catch (err: any) {
      console.error("[Auth] Falha:", err);
      setError(err.message || 'Erro ao processar solicitação.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError(null);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4 font-inter text-slate-900">
      <div className="max-w-5xl w-full bg-white rounded-[2rem] md:rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row">

        {/* Lado Esquerdo - Branding & Info */}
        <div className="flex md:w-1/2 bg-legal-navy p-8 md:p-12 text-white flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 right-0 -mr-16 -mt-16 w-64 h-64 bg-legal-bronze/20 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 -ml-16 -mb-16 w-64 h-64 bg-legal-bronze/10 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-12">
              <div className="w-12 h-12 bg-legal-bronze rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg">
                L
              </div>
              <span className="text-2xl font-bold tracking-tight uppercase">LexHub</span>
            </div>

            <h1 className="text-2xl md:text-4xl font-bold leading-tight mb-4 md:mb-6">
              Transparência e <span className="text-legal-bronze">agilidade</span> jurídica.
            </h1>
            <p className="text-slate-300 text-sm md:text-lg mb-6 md:mb-8">
              Conectando advogados e clientes em um ambiente digital seguro e intuitivo.
            </p>
          </div>

          <div className="space-y-3 md:space-y-4 relative z-10 mt-6 md:mt-0">
            <div className="flex items-center gap-3 text-xs md:text-sm text-slate-300">
              <CheckCircle2 size={16} className="text-legal-bronze md:w-4.5 md:h-4.5" />
              <span>Conformidade total com a LGPD</span>
            </div>
            <div className="flex items-center gap-3 text-xs md:text-sm text-slate-300">
              <ShieldCheck size={16} className="text-legal-bronze md:w-4.5 md:h-4.5" />
              <span>Segurança nível bancário (AES-256)</span>
            </div>
            <div className="flex items-center gap-3 text-xs md:text-sm text-slate-300">
              <Scale size={16} className="text-legal-bronze md:w-4.5 md:h-4.5" />
              <span>Acompanhamento processual em tempo real</span>
            </div>
          </div>
        </div>

        {/* Lado Direito - Form de Auth */}
        <div className="w-full md:w-1/2 p-6 md:p-12 flex flex-col justify-center bg-white relative">

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
              {view === 'forgot-password' ? 'Recuperar Senha' : 
               view === 'update-password' ? 'Nova Senha' :
               isLogin ? (authType === 'client' ? 'Portal do Cliente' : 'Acesso Profissional') : 'Criar minha conta'}
            </h2>
            <p className="text-slate-500 font-medium">
              {view === 'forgot-password' ? 'Enviaremos um link de recuperação para seu e-mail.' :
               view === 'update-password' ? 'Crie uma nova senha segura para sua conta.' :
               isLogin
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

            {(view === 'auth' || view === 'forgot-password') && (
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
            )}

            {(view === 'auth' || view === 'update-password') && (
              <div className="space-y-1">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    {view === 'update-password' ? 'Nova Senha' : 'Senha de Acesso'}
                  </label>
                  {isLogin && view === 'auth' && (
                    <button 
                      type="button"
                      onClick={() => setView('forgot-password')}
                      className="text-[10px] text-legal-bronze font-bold hover:underline uppercase tracking-widest"
                    >
                      Esqueceu?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showPassword ? "text" : "password"} name="password" required placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 transition-all font-medium"
                    value={formData.password} onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {(!isLogin || view === 'update-password') && (
              <div className="space-y-1 animate-in slide-in-from-top-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Confirmar Senha</label>
                <div className="relative">
                  <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                  <input
                    type={showConfirmPassword ? "text" : "password"} name="confirmPassword" required placeholder="••••••••"
                    className="w-full pl-12 pr-12 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 transition-all font-medium"
                    value={formData.confirmPassword} onChange={handleChange}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            )}

            {view === 'auth' && (
              <div className="flex justify-center my-4">
                <Turnstile 
                  siteKey={import.meta.env.VITE_TURNSTILE_SITE_KEY || ''} 
                  onSuccess={(token) => {
                    setCaptchaToken(token);
                    if (error) setError(null);
                  }}
                  onExpire={() => setCaptchaToken(null)}
                  onError={() => {
                    setError("Erro ao carregar o captcha. Tente novamente.");
                    setCaptchaToken(null);
                  }}
                />
              </div>
            )}

            <button
              type="submit" disabled={loading || (view === 'auth' && !captchaToken)}
              className={`w-full py-4 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl disabled:opacity-70 mt-4 ${authType === 'client' ? 'bg-legal-bronze text-white shadow-legal-bronze/20' : 'bg-legal-navy text-white shadow-legal-navy/20'}`}
            >
              {loading ? (
                <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  {view === 'forgot-password' ? 'Enviar Link' :
                   view === 'update-password' ? 'Salvar Nova Senha' :
                   isLogin ? 'Entrar no Portal' : 'Finalizar Cadastro'}
                   <ArrowRight size={18} />
                </>
              )}
            </button>

            {isLogin && view === 'auth' && authType === 'professional' && (
              <button
                type="button"
                onClick={handlePjeLogin}
                disabled={isPjeLoading}
                className="w-full py-4 mt-3 bg-white border-2 border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all disabled:opacity-70 group"
              >
                {isPjeLoading ? (
                  <>
                    <Loader2 size={18} className="animate-spin text-legal-bronze" />
                    {t.auth.pjeOfficeWaiting}
                  </>
                ) : (
                  <>
                    <Server size={18} className="text-legal-bronze group-hover:scale-110 transition-transform" />
                    {t.auth.loginCerts}
                  </>
                )}
              </button>
            )}

            {view !== 'auth' && !updateSuccess && !resetSuccess && (
              <button
                type="button"
                onClick={() => { setView('auth'); setResetSuccess(false); setUpdateSuccess(false); setError(null); }}
                className="w-full py-2 text-xs font-bold text-slate-400 hover:text-legal-navy transition-colors uppercase tracking-widest mt-2"
              >
                Voltar para o Login
              </button>
            )}
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

          {/* Popup de Sucesso no Reset de Senha */}
          {resetSuccess && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setResetSuccess(false)}></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in-95 border border-white/10">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                  <CheckCircle2 size={40} />
                </div>
                <h2 className="text-2xl font-black text-legal-navy dark:text-white mb-4">E-mail Enviado!</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Verifique sua caixa de entrada. Enviamos um link para você redefinir sua senha com segurança.
                </p>
                <button
                  onClick={() => { setResetSuccess(false); setView('auth'); }}
                  className="w-full py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20"
                >
                  Voltar para o Login
                </button>
              </div>
            </div>
          )}

          {/* Popup de Sucesso na Atualização de Senha */}
          {updateSuccess && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => { setUpdateSuccess(false); setView('auth'); window.location.reload(); }}></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in-95 border border-white/10">
                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-emerald-600">
                  <ShieldCheck size={40} />
                </div>
                <h2 className="text-2xl font-black text-legal-navy dark:text-white mb-4">Senha Atualizada!</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                  Sua nova senha foi salva com sucesso. Você já pode acessar o portal agora.
                </p>
                <button
                  onClick={() => { setUpdateSuccess(false); setView('auth'); window.location.reload(); }}
                  className="w-full py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20"
                >
                  Fazer Login
                </button>
              </div>
            </div>
          )}

          {/* Popup de Confirmação de E-mail (Cadastro) */}
          {isSignUpSuccess && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in duration-300" onClick={() => { setIsSignUpSuccess(false); setView('auth'); setIsLogin(true); }}></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in-95 duration-300 transition-colors border border-white/10">
                <div className="w-24 h-24 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-8 text-emerald-600 shadow-xl shadow-emerald-500/10">
                  <Mail size={48} className="animate-bounce" />
                </div>

                <h2 className="text-3xl font-black text-legal-navy dark:text-white mb-4">Termine seu cadastro!</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8 leading-relaxed">
                  Enviamos um link de confirmação para:<br />
                  <span className="text-legal-navy dark:text-legal-bronze font-bold break-all">{formData.email}</span><br /><br />
                  Por favor, confirme no seu e-mail para ativar sua conta.
                </p>

                <button
                  onClick={() => { setIsSignUpSuccess(false); setView('auth'); setIsLogin(true); }}
                  className="w-full py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/20 dark:shadow-legal-bronze/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  Entendi, vou verificar!
                </button>
              </div>
            </div>
          )}

          {/* Popup Erro PJeOffice */}
          {showPjeError && (
            <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
              <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowPjeError(false)}></div>
              <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md p-10 text-center animate-in zoom-in-95 border border-white/10">
                <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 rounded-full flex items-center justify-center mx-auto mb-6 text-rose-600 shadow-xl shadow-rose-500/10">
                  <Server size={40} className="animate-pulse" />
                </div>
                <h2 className="text-2xl font-black text-legal-navy dark:text-white mb-4">{t.auth.pjeOfficeNotFoundTitle}</h2>
                <p className="text-slate-500 dark:text-slate-400 font-medium mb-8">
                  {t.auth.pjeOfficeNotFoundDesc}
                </p>
                <div className="p-4 bg-slate-50 dark:bg-slate-800 rounded-2xl text-left border border-slate-100 dark:border-slate-700 mb-8">
                  <ul className="text-xs text-slate-500 font-medium space-y-2 list-disc pl-4">
                    <li>Certifique-se de que o <strong>PJeOffice</strong> está instalado.</li>
                    <li>Abra o aplicativo no seu computador.</li>
                    <li>Verifique se o ícone do PJeOffice está verde (ativo) na bandeja do sistema.</li>
                  </ul>
                </div>
                <button
                  onClick={() => setShowPjeError(false)}
                  className="w-full py-4 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-white rounded-2xl font-bold transition-all"
                >
                  Entendi
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
