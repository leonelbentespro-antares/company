
import React, { useState, useEffect } from 'react';
import {
    Users, UserPlus, Search, MoreVertical, Mail, Phone, Calendar,
    MapPin, Briefcase, Clock, Star, Trash2, Edit2, X, Save, CheckCircle2, Lock, Rocket
} from 'lucide-react';
import { PLANS } from '../constants.ts';
import { PlanName } from '../types.ts';

interface TeamProps {
    onNavigate?: (tab: string) => void;
}

interface TeamMember {
    id: string;
    name: string;
    role: string; // Especialidade / Cargo
    email: string;
    phone: string;
    startDate: string; // YYYY-MM-DD
    avatar?: string;
    status: 'active' | 'inactive';
    department: string;
    location: string;
}

const INITIAL_MEMBERS: TeamMember[] = [
    {
        id: '1',
        name: 'Ana Silva',
        role: 'Advogada Sênior',
        email: 'ana.silva@lexhub.com',
        phone: '(11) 99999-1111',
        startDate: '2020-03-15',
        status: 'active',
        department: 'Contencioso Cível',
        location: 'São Paulo, SP'
    },
    {
        id: '2',
        name: 'Carlos Oliveira',
        role: 'Paralegal',
        email: 'carlos.o@lexhub.com',
        phone: '(11) 98888-2222',
        startDate: '2022-08-10',
        status: 'active',
        department: 'Administrativo',
        location: 'Remoto'
    },
    {
        id: '3',
        name: 'Mariana Souza',
        role: 'Estagiária de Direito',
        email: 'mari.s@lexhub.com',
        phone: '(11) 97777-3333',
        startDate: '2024-01-20',
        status: 'active',
        department: 'Trabalhista',
        location: 'São Paulo, SP'
    }
];

export const Team: React.FC<TeamProps> = ({ onNavigate }) => {
    const [currentPlan, setCurrentPlan] = useState<PlanName>(() => {
        return (localStorage.getItem('lexhub-user-plan') as PlanName) || PlanName.Starter;
    });

    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

    const [members, setMembers] = useState<TeamMember[]>(() => {
        try {
            const saved = localStorage.getItem('lexhub_team_members');
            return saved ? JSON.parse(saved) : INITIAL_MEMBERS;
        } catch (e) {
            console.error('Error parsing team members:', e);
            return INITIAL_MEMBERS;
        }
    });

    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);

    const [formData, setFormData] = useState<Partial<TeamMember>>({
        name: '',
        role: '',
        email: '',
        phone: '',
        startDate: new Date().toISOString().split('T')[0],
        department: '',
        location: '',
        status: 'active'
    });

    useEffect(() => {
        localStorage.setItem('lexhub_team_members', JSON.stringify(members));
    }, [members]);

    const calculateTenure = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();

        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();

        if (months < 0) {
            years--;
            months += 12;
        }

        if (years === 0 && months === 0) return 'Recém-chegado';

        const yearsStr = years > 0 ? `${years} ${years === 1 ? 'ano' : 'anos'}` : '';
        const monthsStr = months > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : '';

        return [yearsStr, monthsStr].filter(Boolean).join(' e ');
    };

    const handleSaveMember = (e: React.FormEvent) => {
        e.preventDefault();

        if (editingMember) {
            setMembers(prev => prev.map(m => m.id === editingMember.id ? { ...m, ...formData } as TeamMember : m));
        } else {
            // Check Plan Limits
            const planDetail = PLANS.find(p => p.name === currentPlan);
            const maxUsers = planDetail?.limits.maxUsers;

            if (maxUsers !== 'Unlimited' && members.length >= (maxUsers as number)) {
                setIsModalOpen(false);
                setShowUpgradeModal(true);
                return;
            }

            const newMember: TeamMember = {
                id: Math.random().toString(36).substr(2, 9),
                ...formData
            } as TeamMember;
            setMembers(prev => [newMember, ...prev]);
        }

        setIsModalOpen(false);
        setEditingMember(null);
        setFormData({ startDate: new Date().toISOString().split('T')[0], status: 'active' });
    };

    const openEditModal = (member: TeamMember) => {
        setEditingMember(member);
        setFormData(member);
        setIsModalOpen(true);
    };

    const deleteMember = (id: string) => {
        if (confirm('Tem certeza que deseja remover este membro da equipe?')) {
            setMembers(prev => prev.filter(m => m.id !== id));
        }
    };

    const filteredMembers = members.filter(m =>
        m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
        m.department.toLowerCase().includes(searchTerm.toLowerCase())
    );

    const openNewMemberModal = () => {
        const planDetail = PLANS.find(p => p.name === currentPlan);
        const maxUsers = planDetail?.limits.maxUsers;

        if (maxUsers !== 'Unlimited' && members.length >= (maxUsers as number)) {
            setShowUpgradeModal(true);
            return;
        }

        setEditingMember(null);
        setFormData({ startDate: new Date().toISOString().split('T')[0], status: 'active' });
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-legal-navy dark:text-white tracking-tight">Nosso <span className="text-legal-bronze">Time</span></h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gerencie os colaboradores ({members.length} / {PLANS.find(p => p.name === currentPlan)?.limits.maxUsers === 'Unlimited' ? '∞' : PLANS.find(p => p.name === currentPlan)?.limits.maxUsers}).</p>
                </div>

                <div className="flex gap-3 w-full md:w-auto">
                    <div className="relative flex-1 md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar membro..."
                            className="w-full pl-12 pr-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:ring-4 focus:ring-legal-navy/5 outline-none transition-all font-medium"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={openNewMemberModal}
                        className="px-6 py-3 bg-legal-navy text-white rounded-xl font-bold text-sm hover:brightness-110 shadow-lg shadow-legal-navy/20 flex items-center gap-2 transition-all"
                    >
                        <UserPlus size={18} /> <span className="hidden md:inline">Novo Membro</span>
                    </button>
                </div>
            </div>

            {/* Grid de Membros */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {filteredMembers.map((member) => (
                    <div key={member.id} className="bg-white dark:bg-slate-900 rounded-[2rem] border border-slate-200 dark:border-slate-800 p-6 shadow-sm hover:shadow-xl transition-all group relative flex flex-col">

                        <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                            <button
                                onClick={() => openEditModal(member)}
                                className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-legal-navy dark:hover:text-white rounded-lg transition-colors"
                            >
                                <Edit2 size={14} />
                            </button>
                            <button
                                onClick={() => deleteMember(member.id)}
                                className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                            >
                                <Trash2 size={14} />
                            </button>
                        </div>

                        <div className="flex flex-col items-center text-center mb-6">
                            <div className="w-24 h-24 rounded-2xl bg-slate-100 dark:bg-slate-800 mb-4 overflow-hidden shadow-inner border-2 border-white dark:border-slate-700">
                                <img
                                    src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=002B49&color=fff`}
                                    alt={member.name}
                                    className="w-full h-full object-cover"
                                />
                            </div>
                            <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{member.name}</h3>
                            <p className="text-sm font-bold text-legal-bronze mt-1">{member.role}</p>
                            <span className="text-xs text-slate-400 mt-1">{member.department}</span>
                        </div>

                        <div className="space-y-3 flex-1">
                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 shadow-sm"><Clock size={16} /></div>
                                <div>
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Tempo de Casa</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300">{calculateTenure(member.startDate)}</p>
                                </div>
                            </div>

                            <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 shadow-sm"><Mail size={16} /></div>
                                <div className="overflow-hidden">
                                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Contato</p>
                                    <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{member.email}</p>
                                </div>
                            </div>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${member.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                }`}>
                                <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : 'bg-slate-400'}`}></span>
                                {member.status === 'active' ? 'Ativo' : 'Inativo'}
                            </span>
                            <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                <MapPin size={10} /> {member.location}
                            </span>
                        </div>
                    </div>
                ))}

                {/* Card de Adicionar Novo (Empty State se nenhum membro) */}
                {filteredMembers.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400">
                        <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Users size={32} />
                        </div>
                        <p className="text-lg font-medium">Nenhum membro encontrado.</p>
                    </div>
                )}
            </div>

            {/* Modal de Edição/Criação */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
                        <div className="bg-legal-navy p-8 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><Users size={24} /></div>
                                <div>
                                    <h3 className="text-2xl font-black">{editingMember ? 'Editar Membro' : 'Novo Colaborador'}</h3>
                                    <p className="text-white/60 text-sm">Preencha as informações do profissional.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSaveMember} className="p-8 overflow-y-auto space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.name}
                                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Cargo / Especialidade</label>
                                    <input
                                        required
                                        type="text"
                                        placeholder="Ex: Advogado Trabalhista"
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.role}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail Profissional</label>
                                    <input
                                        required
                                        type="email"
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.email}
                                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Telefone / WhatsApp</label>
                                    <input
                                        required
                                        type="text"
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.phone}
                                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Departamento</label>
                                    <select
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                    >
                                        <option value="">Selecione...</option>
                                        <option value="Administrativo">Administrativo</option>
                                        <option value="Comercial">Comercial</option>
                                        <option value="Contencioso Cível">Contencioso Cível</option>
                                        <option value="Trabalhista">Trabalhista</option>
                                        <option value="Tributário">Tributário</option>
                                        <option value="Tecnologia">Tecnologia</option>
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Localização</label>
                                    <input
                                        type="text"
                                        placeholder="Ex: São Paulo, SP"
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Data de Início</label>
                                    <div className="relative">
                                        <Calendar className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type="date"
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                            value={formData.startDate}
                                            onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                                        />
                                    </div>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Status</label>
                                    <select
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="active">Ativo</option>
                                        <option value="inactive">Inativo</option>
                                    </select>
                                </div>
                            </div>

                            <div className="pt-6 flex gap-4 border-t border-slate-100 dark:border-slate-800 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-xl font-bold hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-4 bg-legal-navy text-white rounded-xl font-bold shadow-xl shadow-legal-navy/20 flex items-center justify-center gap-2 hover:brightness-110 transition-all"
                                >
                                    <Save size={20} /> Salvar Membro
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Upgrade Modal */}
            {showUpgradeModal && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setShowUpgradeModal(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-legal-bronze/10 text-legal-bronze rounded-full flex items-center justify-center mx-auto mb-4">
                            <Rocket size={40} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Limite do Plano Atingido</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                                Seu plano <strong>{currentPlan}</strong> permite apenas {PLANS.find(p => p.name === currentPlan)?.limits.maxUsers} usuários. Faça um upgrade para adicionar mais colaboradores.
                            </p>
                        </div>
                        <div className="flex gap-3 flex-col">
                            <button
                                onClick={() => {
                                    setShowUpgradeModal(false);
                                    onNavigate?.('plans');
                                }}
                                className="w-full py-4 bg-legal-navy text-white rounded-xl font-bold hover:bg-legal-navy/90 shadow-lg shadow-legal-navy/20 flex items-center justify-center gap-2"
                            >
                                <Rocket size={18} /> Fazer Upgrade Agora
                            </button>
                            <button
                                onClick={() => setShowUpgradeModal(false)}
                                className="w-full py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
                            >
                                Talvez Depois
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
