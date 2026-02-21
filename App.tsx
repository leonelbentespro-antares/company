
import React, { useState, useEffect, useRef } from 'react';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  Settings as SettingsIcon,
  BrainCircuit,
  LogOut,
  Bell,
  Search,
  ChevronRight,
  ShieldCheck,
  Menu,
  X,
  Lock,
  ArrowRight,
  Scale,
  ExternalLink,
  Sparkles,
  MessageSquare,
  Zap,
  Share2,
  MessageCircle,
  PlugZap,
  Camera,
  User as UserIcon,
  Briefcase,
  Phone,
  Save,
  Check,
  Mail,
  Hash,
  Fingerprint,
  Key,
  Eye,
  EyeOff,
  AlertCircle,
  ArrowLeft,
  Moon,
  Sun,
  Clock,
  CheckCircle2,
  AlertTriangle
} from 'lucide-react';
import { Dashboard } from './components/Dashboard.tsx';
import { Tenants } from './components/Tenants.tsx';
import { LegalAI } from './components/LegalAI.tsx';
import { Processes } from './components/Processes.tsx';
import { Settings } from './components/Settings.tsx';
import { Auth } from './components/Auth.tsx';
import { ClientPortal } from './components/ClientPortal.tsx';
import { Billing } from './components/Billing.tsx';
import { Plans } from './components/Plans.tsx';
import { AIAgents } from './components/AIAgents.tsx';
import { Security } from './components/Security.tsx';
import { Automation } from './components/Automation.tsx';
import { Chat } from './components/Chat.tsx';
import { Integrations } from './components/Integrations.tsx';
import { Team } from './components/Team.tsx';
import { User, UserRole } from './types.ts';

interface Notification {
  id: string;
  title: string;
  description: string;
  time: string;
  type: 'update' | 'alert' | 'success';
  read: boolean;
}

const SidebarItem: React.FC<{
  icon: React.ReactNode,
  label: string,
  active?: boolean,
  onClick: () => void,
  badge?: string | number
}> = ({ icon, label, active, onClick, badge }) => (
  <button
    onClick={onClick}
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${active
      ? 'bg-legal-bronze text-white shadow-lg shadow-legal-bronze/20'
      : 'text-slate-400 hover:text-white hover:bg-white/10 dark:text-slate-500 dark:hover:text-slate-200'
      }`}
  >
    {icon}
    <span className="font-medium text-sm lg:text-base">{label}</span>
    {badge && <span className="ml-auto bg-rose-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">{badge}</span>}
    {active && !badge && <ChevronRight size={16} className="ml-auto" />}
  </button>
);

const App: React.FC = () => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [showProfileFeedback, setShowProfileFeedback] = useState(false);

  // State de Modo Escuro
  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('lexhub-theme');
    return saved === 'dark' || (!saved && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  // Notifications State
  const [notifications, setNotifications] = useState<Notification[]>([
    { id: '1', title: 'Movimentação Processual', description: 'Nova sentença publicada no processo 5001234...', time: '10 min atrás', type: 'update', read: false },
    { id: '2', title: 'Tenant Provisionado', description: 'Almeida Advocacia ativou o plano Enterprise.', time: '2 horas atrás', type: 'success', read: false },
    { id: '3', title: 'Alerta de Segurança', description: 'Novo login detectado de um IP desconhecido.', time: 'Ontem', type: 'alert', read: true },
  ]);

  // States para edição de perfil e senha
  const [profileForm, setProfileForm] = useState<Partial<User>>({});
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ current: '', new: '', confirm: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);
  const notificationsRef = useRef<HTMLDivElement>(null);

  // Efeito para aplicar o tema dark/light
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('lexhub-theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('lexhub-theme', 'light');
    }
  }, [isDarkMode]);

  // Fechar menus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationsRef.current && !notificationsRef.current.contains(event.target as Node)) {
        setIsNotificationsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Ensure default state on auth change
  useEffect(() => {
    if (isAuthenticated && currentUser) {
      setActiveTab(currentUser.role === UserRole.Client ? 'portal' : 'dashboard');
      setProfileForm({
        name: currentUser.name,
        email: currentUser.email,
        oab: currentUser.oab || 'OAB/SP 123.456',
        phone: currentUser.phone || '(11) 98877-6655',
        avatar: currentUser.avatar,
        registrationId: currentUser.registrationId
      });
    }
  }, [isAuthenticated, currentUser]);

  const handleLogin = (userData: User) => {
    setCurrentUser(userData);
    setIsAuthenticated(true);
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentUser(null);
  };

  const toggleTheme = () => setIsDarkMode(!isDarkMode);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (currentUser) {
      const updatedUser = { ...currentUser, ...profileForm } as User;
      setCurrentUser(updatedUser);
      setShowProfileFeedback(true);
      setTimeout(() => {
        setShowProfileFeedback(false);
        setIsProfileModalOpen(false);
      }, 1500);
    }
  };

  const markAllAsRead = () => {
    setNotifications(notifications.map(n => ({ ...n, read: true })));
  };

  const handleSavePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (passwordForm.new !== passwordForm.confirm) {
      setPasswordError('As novas senhas não coincidem.');
      return;
    }

    if (passwordForm.new.length < 6) {
      setPasswordError('A nova senha deve ter pelo menos 6 caracteres.');
      return;
    }

    setShowProfileFeedback(true);
    setTimeout(() => {
      setShowProfileFeedback(false);
      setIsChangingPassword(false);
      setPasswordForm({ current: '', new: '', confirm: '' });
    }, 1500);
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileForm(prev => ({ ...prev, avatar: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!isAuthenticated) {
    return <Auth onLogin={handleLogin} />;
  }

  // Visualização específica para o CLIENTE FINAL
  if (currentUser?.role === UserRole.Client) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 transition-colors duration-300">
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-6 flex items-center justify-between sticky top-0 z-50 transition-colors">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-legal-bronze rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-legal-bronze/20">L</div>
            <span className="text-xl font-bold text-legal-navy dark:text-white tracking-tight uppercase">LexHub Client</span>
          </div>
          <div className="flex items-center gap-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
              title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
            </button>
            <button className="hidden md:flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl text-sm font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-all border border-slate-100 dark:border-slate-700">
              <ExternalLink size={16} /> Site do Escritório
            </button>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800"></div>

            <button
              onClick={() => { setIsProfileModalOpen(true); setIsChangingPassword(false); }}
              className="flex items-center gap-3 hover:bg-slate-50 dark:hover:bg-slate-800 px-3 py-2 rounded-xl transition-all group"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black text-legal-navy dark:text-slate-100 leading-none">{currentUser.name}</p>
                <p className="text-[10px] font-bold text-legal-bronze mt-1">{currentUser.registrationId}</p>
              </div>
              <img
                src={currentUser.avatar || `https://ui-avatars.com/api/?name=${currentUser.name}&background=A67C52&color=fff`}
                className="w-10 h-10 rounded-xl object-cover shadow-sm border-2 border-white dark:border-slate-800 group-hover:border-legal-bronze/20 transition-all"
                alt="Avatar"
              />
            </button>

            <button
              onClick={handleLogout}
              className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
            >
              <LogOut size={24} />
            </button>
          </div>
        </header>
        <main className="p-4 lg:p-8">
          <ClientPortal user={currentUser} />
        </main>

        {isProfileModalOpen && renderProfileModal()}
      </div>
    );
  }

  // Visualização ADMINISTRATIVA (Advogado/SaaS Admin)
  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard': return <Dashboard onNavigate={(tab) => setActiveTab(tab)} currentUser={currentUser} />;
      case 'tenants': return <Tenants />;
      case 'processes': return <Processes />;
      case 'ai': return <LegalAI />;
      case 'agents': return <AIAgents />;
      case 'automation': return <Automation />;
      case 'team': return <Team onNavigate={(tab) => setActiveTab(tab)} />;
      case 'integrations': return <Integrations />;
      case 'chat': return <Chat />;
      case 'billing': return <Billing userEmail={currentUser?.email} />;
      case 'plans': return <Plans userEmail={currentUser?.email} />;
      case 'settings': return <Settings />;
      case 'security': return <Security />;
      default: return <Dashboard onNavigate={(tab) => setActiveTab(tab)} currentUser={currentUser} />;
    }
  };

  function renderProfileModal() {
    return (
      <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
        <div className="absolute inset-0 bg-slate-900/70 dark:bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsProfileModalOpen(false)}></div>
        <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh] transition-colors">

          <div className="bg-legal-navy p-10 text-white relative flex-shrink-0">
            <button onClick={() => setIsProfileModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors">
              <X size={24} />
            </button>
            <div className="flex flex-col md:flex-row items-center gap-8">
              <div className="relative group cursor-pointer" onClick={() => !isChangingPassword && fileInputRef.current?.click()}>
                <img
                  src={profileForm.avatar || `https://ui-avatars.com/api/?name=${profileForm.name}&background=A67C52&color=fff`}
                  alt="User"
                  className="w-32 h-32 rounded-[2rem] object-cover border-4 border-white/20 shadow-2xl group-hover:brightness-50 transition-all"
                />
                {!isChangingPassword && (
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera size={32} className="text-white" />
                  </div>
                )}
                <input
                  type="file"
                  ref={fileInputRef}
                  className="hidden"
                  accept="image/*"
                  onChange={handleAvatarChange}
                />
                {!isChangingPassword && (
                  <div className="absolute -bottom-2 -right-2 bg-legal-bronze p-2 rounded-xl shadow-lg border-2 border-legal-navy">
                    <Camera size={14} className="text-white" />
                  </div>
                )}
              </div>

              <div className="text-center md:text-left space-y-2">
                <div className="flex items-center justify-center md:justify-start gap-2 text-legal-bronze bg-legal-bronze/10 w-fit px-3 py-1 rounded-full border border-legal-bronze/20 mx-auto md:mx-0">
                  <Fingerprint size={12} />
                  <span className="text-[10px] font-black uppercase tracking-widest">{currentUser?.registrationId}</span>
                </div>
                <h2 className="text-3xl font-black tracking-tight">{profileForm.name}</h2>
                <div className="flex flex-wrap items-center justify-center md:justify-start gap-3">
                  <span className="bg-white/10 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border border-white/5">{currentUser?.role}</span>
                  <span className="bg-legal-bronze text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm">Cadastro Ativo</span>
                </div>
              </div>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-10 bg-white dark:bg-slate-900">
            {showProfileFeedback && (
              <div className="mb-8 p-4 bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 rounded-2xl flex items-center gap-3 text-emerald-700 dark:text-emerald-400 animate-in slide-in-from-top-2">
                <div className="bg-emerald-500 p-1 rounded-full text-white"><Check size={14} /></div>
                <p className="text-sm font-bold">{isChangingPassword ? 'Senha atualizada com sucesso!' : 'Perfil atualizado com sucesso!'}</p>
              </div>
            )}

            {isChangingPassword ? (
              <div className="animate-in slide-in-from-right duration-300">
                <button
                  onClick={() => setIsChangingPassword(false)}
                  className="flex items-center gap-2 text-xs font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-8 hover:text-legal-navy dark:hover:text-slate-200 transition-colors"
                >
                  <ArrowLeft size={16} /> Voltar para o Perfil
                </button>

                <div className="flex items-center gap-3 mb-8">
                  <div className="p-3 bg-legal-bronze rounded-2xl text-white shadow-lg shadow-legal-bronze/20">
                    <Lock size={24} />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-legal-navy dark:text-white">Alterar Senha de Acesso</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Sua senha deve ter pelo menos 6 caracteres.</p>
                  </div>
                </div>

                {passwordError && (
                  <div className="mb-6 p-4 bg-rose-50 dark:bg-rose-900/20 border border-rose-100 dark:border-rose-800 rounded-2xl flex items-center gap-3 text-rose-600 dark:text-rose-400 animate-in shake">
                    <AlertCircle size={20} />
                    <p className="text-sm font-bold">{passwordError}</p>
                  </div>
                )}

                <form onSubmit={handleSavePassword} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Senha Atual</label>
                    <div className="relative">
                      <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                      <input
                        type={showPassword ? "text" : "password"}
                        required
                        className="w-full pl-12 pr-12 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white outline-none transition-all"
                        value={passwordForm.current}
                        onChange={(e) => setPasswordForm({ ...passwordForm, current: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nova Senha</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white outline-none transition-all"
                          value={passwordForm.new}
                          onChange={(e) => setPasswordForm({ ...passwordForm, new: e.target.value })}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Confirmar Nova Senha</label>
                      <div className="relative">
                        <Key className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                        <input
                          type={showPassword ? "text" : "password"}
                          required
                          className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white outline-none transition-all"
                          value={passwordForm.confirm}
                          onChange={(e) => setPasswordForm({ ...passwordForm, confirm: e.target.value })}
                        />
                      </div>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-legal-navy dark:hover:text-slate-200 transition-colors"
                  >
                    {showPassword ? <><EyeOff size={14} /> Ocultar Senhas</> : <><Eye size={14} /> Mostrar Senhas</>}
                  </button>

                  <div className="pt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsChangingPassword(false)}
                      className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold shadow-2xl shadow-legal-navy/30 dark:shadow-legal-bronze/20 flex items-center justify-center gap-3 hover:brightness-110 transition-all"
                    >
                      <Save size={20} /> Atualizar Senha
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="animate-in slide-in-from-left duration-300">
                <form onSubmit={handleSaveProfile} className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="col-span-1 md:col-span-2 space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                    <div className="relative">
                      <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                      <input
                        type="text"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white outline-none transition-all"
                        value={profileForm.name}
                        onChange={(e) => setProfileForm({ ...profileForm, name: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Profissional</label>
                    <div className="relative">
                      <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                      <input
                        type="email"
                        required
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white outline-none transition-all"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Registro OAB / Profissional</label>
                    <div className="relative">
                      <Briefcase className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white outline-none transition-all"
                        value={profileForm.oab}
                        onChange={(e) => setProfileForm({ ...profileForm, oab: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WhatsApp / Telefone</label>
                    <div className="relative">
                      <Phone className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300 dark:text-slate-600" size={18} />
                      <input
                        type="text"
                        className="w-full pl-12 pr-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white outline-none transition-all"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      />
                    </div>
                  </div>

                  <div className="col-span-1 md:col-span-2 pt-6 flex gap-4">
                    <button
                      type="button"
                      onClick={() => setIsProfileModalOpen(false)}
                      className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-100 dark:border-slate-700 transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold shadow-2xl shadow-legal-navy/30 dark:shadow-legal-bronze/20 flex items-center justify-center gap-3 hover:brightness-110 transition-all"
                    >
                      <Save size={20} /> Salvar Alterações
                    </button>
                  </div>
                </form>

                <div className="mt-10 pt-10 border-t border-slate-50 dark:border-slate-800">
                  <div className="bg-slate-900 dark:bg-slate-800 rounded-[2rem] p-8 text-white flex flex-col md:flex-row items-center justify-between gap-6 transition-colors">
                    <div className="space-y-1 text-center md:text-left">
                      <h4 className="font-bold flex items-center gap-2 justify-center md:justify-start">
                        <ShieldCheck size={18} className="text-legal-bronze" /> Segurança da Conta
                      </h4>
                      <p className="text-white/50 dark:text-slate-400 text-xs">Sua conta é protegida por criptografia de ponta a ponta.</p>
                    </div>
                    <button
                      onClick={() => setIsChangingPassword(true)}
                      className="px-6 py-3 bg-white/10 dark:bg-white/5 border border-white/10 rounded-xl text-xs font-black uppercase tracking-widest hover:bg-white/20 dark:hover:bg-white/10 transition-all"
                    >
                      Alterar Senha de Acesso
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const NavContent = () => (
    <>
      <div className="flex items-center gap-3 mb-12">
        <div className="w-10 h-10 bg-legal-bronze rounded-xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-legal-bronze/20">
          L
        </div>
        <span className="text-xl font-bold text-white tracking-tight uppercase">LexHub</span>
      </div>

      <nav className="flex-1 space-y-2">
        <SidebarItem
          icon={<LayoutDashboard size={20} />}
          label="Dashboard"
          active={activeTab === 'dashboard'}
          onClick={() => { setActiveTab('dashboard'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<MessageCircle size={20} />}
          label="Chat"
          active={activeTab === 'chat'}
          onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
          badge={3}
        />
        <SidebarItem
          icon={<Users size={20} />}
          label="Tenants"
          active={activeTab === 'tenants'}
          onClick={() => { setActiveTab('tenants'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<Briefcase size={20} />}
          label="Team"
          active={activeTab === 'team'}
          onClick={() => { setActiveTab('team'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<Scale size={20} />}
          label="Processos"
          active={activeTab === 'processes'}
          onClick={() => { setActiveTab('processes'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<BrainCircuit size={20} />}
          label="Módulo IA"
          active={activeTab === 'ai'}
          onClick={() => { setActiveTab('ai'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<Share2 size={20} />}
          label="Automação"
          active={activeTab === 'automation'}
          onClick={() => { setActiveTab('automation'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<PlugZap size={20} />}
          label="Integrações"
          active={activeTab === 'integrations'}
          onClick={() => { setActiveTab('integrations'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<MessageSquare size={20} />}
          label="Agentes de IA"
          active={activeTab === 'agents'}
          onClick={() => { setActiveTab('agents'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<CreditCard size={20} />}
          label="Faturamento"
          active={activeTab === 'billing'}
          onClick={() => { setActiveTab('billing'); setIsSidebarOpen(false); }}
        />
        <SidebarItem
          icon={<Sparkles size={20} />}
          label="Planos & Upgrade"
          active={activeTab === 'plans'}
          onClick={() => { setActiveTab('plans'); setIsSidebarOpen(false); }}
        />
        <div className="pt-8 pb-4">
          <p className="px-4 text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Administração</p>
          <SidebarItem
            icon={<SettingsIcon size={20} />}
            label="Configurações"
            active={activeTab === 'settings'}
            onClick={() => { setActiveTab('settings'); setIsSidebarOpen(false); }}
          />
          <SidebarItem
            icon={<ShieldCheck size={20} />}
            label="Segurança & Logs"
            active={activeTab === 'security'}
            onClick={() => { setActiveTab('security'); setIsSidebarOpen(false); }}
          />
        </div>
      </nav>

      <div className="mt-auto pt-6 border-t border-white/10">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-slate-400 hover:text-white transition-colors"
        >
          <LogOut size={20} />
          <span className="font-medium">Sair do Painel</span>
        </button>
      </div>
    </>
  );

  const unreadNotificationsCount = notifications.filter(n => !n.read).length;

  return (
    <div className="min-h-screen flex bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors duration-300">

      {/* Sidebar Desktop */}
      <aside className="w-64 bg-legal-navy shrink-0 hidden lg:flex flex-col p-6 sticky top-0 h-screen overflow-y-auto shadow-2xl">
        <NavContent />
      </aside>

      {/* Sidebar Mobile Overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setIsSidebarOpen(false)}></div>
          <aside className="absolute inset-y-0 left-0 w-72 bg-legal-navy p-6 flex flex-col animate-in slide-in-from-left duration-300">
            <button
              onClick={() => setIsSidebarOpen(false)}
              className="absolute top-6 right-6 text-white/50 hover:text-white"
            >
              <X size={24} />
            </button>
            <NavContent />
          </aside>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Header */}
        <header className="h-20 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 lg:px-8 flex items-center justify-between sticky top-0 z-20 transition-colors">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setIsSidebarOpen(true)}
              className="lg:hidden p-2 text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Menu size={24} />
            </button>

            <div className="hidden md:flex items-center gap-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-full px-4 py-1.5 w-64 lg:w-96 focus-within:ring-2 focus-within:ring-legal-navy/10 transition-all">
              <Search size={18} className="text-slate-400" />
              <input
                type="text"
                placeholder="Pesquisar..."
                className="bg-transparent border-none outline-none text-sm w-full text-slate-900 dark:text-slate-100"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 lg:gap-4">
            {/* Toggle Tema Sun/Moon */}
            <button
              onClick={toggleTheme}
              className="p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl transition-all"
              title={isDarkMode ? "Ativar Modo Claro" : "Ativar Modo Escuro"}
            >
              {isDarkMode ? <Sun size={20} className="text-amber-500" /> : <Moon size={20} />}
            </button>

            {/* Notifications Menu */}
            <div className="relative" ref={notificationsRef}>
              <button
                onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
                className={`p-2.5 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl relative transition-all ${isNotificationsOpen ? 'bg-slate-100 dark:bg-slate-800 text-legal-navy dark:text-legal-bronze' : ''}`}
              >
                <Bell size={20} />
                {unreadNotificationsCount > 0 && (
                  <span className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-slate-900"></span>
                )}
              </button>

              {isNotificationsOpen && (
                <div className="absolute right-0 mt-3 w-[22rem] bg-white dark:bg-slate-900 rounded-[2rem] shadow-2xl border border-slate-100 dark:border-slate-800 z-50 overflow-hidden animate-in slide-in-from-top-2">
                  <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/50 flex items-center justify-between">
                    <div>
                      <h4 className="font-black text-legal-navy dark:text-white uppercase tracking-tighter">Notificações</h4>
                      <p className="text-[10px] font-bold text-slate-400 uppercase">Você tem {unreadNotificationsCount} novas</p>
                    </div>
                    <button
                      onClick={markAllAsRead}
                      className="text-[10px] font-black text-legal-bronze hover:underline uppercase"
                    >
                      Lidas
                    </button>
                  </div>
                  <div className="max-h-[24rem] overflow-y-auto">
                    {notifications.length > 0 ? (
                      <div className="divide-y divide-slate-50 dark:divide-slate-800">
                        {notifications.map((n) => (
                          <div key={n.id} className={`p-5 flex items-start gap-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors relative cursor-pointer ${!n.read ? 'bg-legal-navy/5 dark:bg-legal-bronze/5' : ''}`}>
                            {!n.read && <div className="absolute left-0 top-0 bottom-0 w-1 bg-legal-bronze"></div>}
                            <div className={`mt-1 p-2 rounded-xl shrink-0 ${n.type === 'update' ? 'bg-blue-50 text-blue-500 dark:bg-blue-900/20' :
                              n.type === 'success' ? 'bg-emerald-50 text-emerald-500 dark:bg-emerald-900/20' :
                                'bg-rose-50 text-rose-500 dark:bg-rose-900/20'
                              }`}>
                              {n.type === 'update' ? <Clock size={16} /> : n.type === 'success' ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                            </div>
                            <div className="flex-1 space-y-1">
                              <p className={`text-sm font-bold leading-none ${n.read ? 'text-slate-700 dark:text-slate-300' : 'text-slate-900 dark:text-white'}`}>{n.title}</p>
                              <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">{n.description}</p>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">{n.time}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="p-12 text-center space-y-4">
                        <Bell size={40} className="mx-auto text-slate-200" />
                        <p className="text-sm font-bold text-slate-400">Tudo limpo por aqui!</p>
                      </div>
                    )}
                  </div>
                  <div className="p-4 bg-slate-50 dark:bg-slate-800/30 border-t border-slate-50 dark:border-slate-800 text-center">
                    <button className="text-xs font-black text-legal-navy dark:text-legal-bronze uppercase tracking-widest">Ver Todo o Histórico</button>
                  </div>
                </div>
              )}
            </div>

            <div className="h-8 w-[1px] bg-slate-200 dark:bg-slate-800 mx-1 lg:mx-2"></div>

            <button
              onClick={() => { setIsProfileModalOpen(true); setIsChangingPassword(false); }}
              className="flex items-center gap-2 lg:gap-3 cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800 p-1 lg:p-2 rounded-xl transition-all group border border-transparent hover:border-slate-100 dark:hover:border-slate-700"
            >
              <div className="text-right hidden sm:block">
                <p className="text-xs lg:text-sm font-black text-legal-navy dark:text-slate-100 leading-none group-hover:text-legal-bronze transition-colors">{currentUser?.name}</p>
                <div className="flex items-center justify-end gap-1 mt-1">
                  <Fingerprint size={10} className="text-legal-bronze" />
                  <p className="text-[9px] lg:text-[10px] font-black text-legal-bronze uppercase tracking-widest">{currentUser?.registrationId}</p>
                </div>
              </div>
              <div className="relative">
                <img
                  src={currentUser?.avatar || `https://ui-avatars.com/api/?name=${currentUser?.name || 'Admin'}&background=002B49&color=fff`}
                  alt="Profile"
                  className="w-8 h-8 lg:w-10 lg:h-10 rounded-xl border border-slate-200 dark:border-slate-700 object-cover shadow-sm group-hover:shadow-md transition-all"
                />
                <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 border-2 border-white dark:border-slate-900 rounded-full"></div>
              </div>
            </button>
          </div>
        </header>

        {/* Content Area */}
        <div className="p-4 lg:p-8 max-w-7xl mx-auto w-full transition-colors">
          {renderContent()}
        </div>
      </main>

      {/* MODAL DE PERFIL DO USUÁRIO */}
      {isProfileModalOpen && renderProfileModal()}
    </div>
  );
};

export default App;
