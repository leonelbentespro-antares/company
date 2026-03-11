import React, { useState, useEffect } from 'react';
import {
    Users, UserPlus, Search, MoreVertical, Mail, Phone, Calendar,
    MapPin, Briefcase, Clock, Star, Trash2, Edit2, X, Save, CheckCircle2, Lock, Rocket,
    MailQuestion, CheckCircle, Clock3, AlertCircle
} from 'lucide-react';
import { PLANS } from '../constants.ts';
import { PlanName } from '../types.ts';
import { supabase } from '../services/supabaseClient.ts';
import { useTenant } from '../services/tenantContext.tsx';

interface TeamProps {
    onNavigate?: (tab: string) => void;
}

interface TeamMember {
    id: string;
    name: string;
    role: string;
    email: string;
    phone: string;
    startDate: string;
    avatar?: string;
    status: 'active' | 'inactive' | 'pending';
    department: string;
    location: string;
    isInvite?: boolean;
}

export const Team: React.FC<TeamProps> = ({ onNavigate }) => {
    const { tenantId, subscription, user: currentUser } = useTenant();
    const currentPlan = (subscription?.plan as PlanName) || PlanName.Starter;

    const [loading, setLoading] = useState(true);
    const [members, setMembers] = useState<TeamMember[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<TeamMember | null>(null);
    const [showUpgradeModal, setShowUpgradeModal] = useState(false);

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

    const fetchTeam = async () => {
        if (!tenantId) return;
        setLoading(true);
        try {
            // 1. Buscar membros ativos (tenant_users -> profiles)
            const { data: activeData, error: activeError } = await supabase
                .from('tenant_users')
                .select(`
                    role,
                    user_id,
                    profiles:user_id (
                        id,
                        name,
                        email,
                        phone,
                        avatar_url,
                        created_at
                    )
                `)
                .eq('tenant_id', tenantId);

            if (activeError) throw activeError;

            // 2. Buscar convites pendentes
            const { data: inviteData, error: inviteError } = await supabase
                .from('workspace_invites')
                .select('*')
                .eq('tenant_id', tenantId);

            if (inviteError) throw inviteError;

            const mappedMembers: TeamMember[] = [
                ...(activeData || []).map((tu: any) => ({
                    id: tu.user_id,
                    name: tu.profiles?.name || 'Usuário Sem Nome',
                    role: tu.role === 'admin' ? 'Administrador' : 'Colaborador',
                    email: tu.profiles?.email || '',
                    phone: tu.profiles?.phone || '-',
                    startDate: tu.profiles?.created_at || new Date().toISOString(),
                    avatar: tu.profiles?.avatar_url,
                    status: 'active' as const,
                    department: 'Jurídico',
                    location: 'Remoto'
                })),
                ...(inviteData || []).map((inv: any) => ({
                    id: inv.id,
                    name: inv.email.split('@')[0],
                    role: inv.role === 'admin' ? 'Administrador' : 'Colaborador',
                    email: inv.email,
                    phone: '-',
                    startDate: inv.created_at,
                    status: 'pending' as const,
                    department: 'Pendente',
                    location: '-',
                    isInvite: true
                }))
            ];

            setMembers(mappedMembers || []);
        } catch (err) {
            console.error('Erro ao buscar time:', err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchTeam();
    }, [tenantId]);

    const calculateTenure = (startDate: string) => {
        const start = new Date(startDate);
        const now = new Date();
        let years = now.getFullYear() - start.getFullYear();
        let months = now.getMonth() - start.getMonth();
        if (months < 0) { years--; months += 12; }
        if (years === 0 && months === 0) return 'Recém-chegado';
        const yearsStr = years > 0 ? `${years} ${years === 1 ? 'ano' : 'anos'}` : '';
        const monthsStr = months > 0 ? `${months} ${months === 1 ? 'mês' : 'meses'}` : '';
        return [yearsStr, monthsStr].filter(Boolean).join(' e ');
    };

    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSaveMember = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!tenantId) return;

        try {
            if (editingMember) {
                if (editingMember.isInvite) {
                    await supabase
                        .from('workspace_invites')
                        .update({ 
                            email: formData.email, 
                            role: formData.role === 'Administrador' ? 'admin' : 'lawyer' 
                        })
                        .eq('id', editingMember.id);
                }
                setSuccessMessage('Convite atualizado com sucesso!');
            } else {
                const planDetail = PLANS.find(p => p.name === currentPlan);
                const maxUsers = planDetail?.limits.maxUsers;
                if (maxUsers !== 'Unlimited' && members.length >= (maxUsers as number)) {
                    setIsModalOpen(false);
                    setShowUpgradeModal(true);
                    return;
                }

                const { error: invError } = await supabase
                    .from('workspace_invites')
                    .insert({
                        email: formData.email,
                        tenant_id: tenantId,
                        role: formData.role === 'Administrador' ? 'admin' : 'lawyer',
                        invited_by: currentUser?.id
                    });

                if (invError) throw invError;
                setSuccessMessage('Convite enviado! Peça ao novo membro para verificar o e-mail e confirmar.');
            }

            await fetchTeam();
            setIsModalOpen(false);
            setEditingMember(null);
            setFormData({ startDate: new Date().toISOString().split('T')[0], status: 'active', role: 'Colaborador' });
            
            // Limpar mensagem após 5 segundos
            setTimeout(() => setSuccessMessage(null), 5000);
        } catch (err: any) {
            if (err.message?.includes('duplicate key value') || err.code === '23505') {
                alert('Este e-mail já possui um convite pendente para este escritório.');
            } else {
                alert('Erro ao salvar: ' + err.message);
            }
        }
    };

    const deleteMember = async (member: TeamMember) => {
        if (!confirm(`Tem certeza que deseja remover ${member.name} da equipe?`)) return;

        try {
            if (member.isInvite) {
                await supabase.from('workspace_invites').delete().eq('id', member.id);
            } else {
                await supabase
                    .from('tenant_users')
                    .delete()
                    .eq('user_id', member.id)
                    .eq('tenant_id', tenantId);
            }
            await fetchTeam();
        } catch (err: any) {
            alert('Erro ao remover: ' + err.message);
        }
    };

    const openNewMemberModal = () => {
        const planDetail = PLANS.find(p => p.name === currentPlan);
        const maxUsers = planDetail?.limits.maxUsers;
        if (maxUsers !== 'Unlimited' && members.length >= (maxUsers as number)) {
            setShowUpgradeModal(true);
            return;
        }
        setEditingMember(null);
        setFormData({ startDate: new Date().toISOString().split('T')[0], status: 'active', role: 'Colaborador' });
        setIsModalOpen(true);
    };

    const filteredMembers = (members || []).filter(m =>
        (m.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.role || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (m.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-8 animate-in fade-in duration-700 pb-20">
            {/* Banner de Sucesso */}
            {successMessage && (
                <div className="bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-900/30 p-4 rounded-2xl flex items-center gap-4 animate-in slide-in-from-top-4 duration-500">
                    <div className="w-10 h-10 bg-emerald-500 text-white rounded-xl flex items-center justify-center shrink-0">
                        <CheckCircle2 size={24} />
                    </div>
                    <div className="flex-1">
                        <p className="text-emerald-800 dark:text-emerald-400 font-bold">{successMessage}</p>
                    </div>
                    <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-emerald-600 transition-colors p-2">
                        <X size={20} />
                    </button>
                </div>
            )}

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                <div>
                    <h1 className="text-4xl font-black text-legal-navy dark:text-white tracking-tight">Nosso <span className="text-legal-bronze">Time</span></h1>
                    <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">
                        Gerenciando equipe para o workspace atual. ({members.length} / {PLANS.find(p => p.name === currentPlan)?.limits.maxUsers === 'Unlimited' ? '∞' : PLANS.find(p => p.name === currentPlan)?.limits.maxUsers})
                    </p>
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
                        <UserPlus size={18} /> <span className="hidden md:inline">Convidar Membro</span>
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    {[1, 2, 3, 4].map(i => (
                        <div key={i} className="h-64 bg-white dark:bg-slate-900 rounded-[2rem] animate-pulse border border-slate-100 dark:border-slate-800"></div>
                    ))}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {filteredMembers.map((member) => (
                        <div key={member.id} className={`bg-white dark:bg-slate-900 rounded-[2rem] border ${member.status === 'pending' ? 'border-legal-bronze/30 border-dashed' : 'border-slate-200 dark:border-slate-800'} p-6 shadow-sm hover:shadow-xl transition-all group relative flex flex-col`}>

                            <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                                {member.isInvite && (
                                    <button
                                        onClick={() => { setEditingMember(member); setFormData(member); setIsModalOpen(true); }}
                                        className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:text-legal-navy dark:hover:text-white rounded-lg transition-colors"
                                    >
                                        <Edit2 size={14} />
                                    </button>
                                )}
                                <button
                                    onClick={() => deleteMember(member)}
                                    className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 dark:hover:bg-rose-900/40 rounded-lg transition-colors"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>

                            <div className="flex flex-col items-center text-center mb-6">
                                <div className={`w-24 h-24 rounded-2xl ${member.status === 'pending' ? 'bg-legal-bronze/5' : 'bg-slate-100 dark:bg-slate-800'} mb-4 overflow-hidden shadow-inner border-2 ${member.status === 'pending' ? 'border-legal-bronze/20' : 'border-white dark:border-slate-700'} relative`}>
                                    <img
                                        src={member.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=${member.status === 'pending' ? 'A67C52' : '002B49'}&color=fff`}
                                        alt={member.name}
                                        className={`w-full h-full object-cover ${member.status === 'pending' ? 'grayscale opacity-50' : ''}`}
                                    />
                                    {member.status === 'pending' && (
                                        <div className="absolute inset-0 flex items-center justify-center">
                                            <MailQuestion size={32} className="text-legal-bronze animate-pulse" />
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-lg font-black text-slate-900 dark:text-white leading-tight">{member.name}</h3>
                                <p className="text-sm font-bold text-legal-bronze mt-1">{member.role}</p>
                                <span className="text-xs text-slate-400 mt-1">{member.department}</span>
                            </div>

                            <div className="space-y-3 flex-1">
                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 shadow-sm">
                                        {member.status === 'pending' ? <Clock3 size={16} /> : <Clock size={16} />}
                                    </div>
                                    <div>
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                            {member.status === 'pending' ? 'Convidado em' : 'Tempo de Casa'}
                                        </p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {member.status === 'pending' ? new Date(member.startDate).toLocaleDateString() : calculateTenure(member.startDate)}
                                        </p>
                                    </div>
                                </div>

                                <div className="flex items-center gap-3 p-3 bg-slate-50 dark:bg-slate-800/50 rounded-xl">
                                    <div className="p-2 bg-white dark:bg-slate-800 rounded-lg text-slate-400 shadow-sm"><Mail size={16} /></div>
                                    <div className="overflow-hidden">
                                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">E-mail</p>
                                        <p className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{member.email}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 flex justify-between items-center">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest ${member.status === 'active'
                                    ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                    : member.status === 'pending'
                                        ? 'bg-amber-50 text-amber-600 dark:bg-amber-900/20 dark:text-amber-400'
                                        : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}>
                                    <span className={`w-1.5 h-1.5 rounded-full ${member.status === 'active' ? 'bg-emerald-500' : member.status === 'pending' ? 'bg-amber-500' : 'bg-slate-400'}`}></span>
                                    {member.status === 'active' ? 'Ativo' : member.status === 'pending' ? 'Convite Enviado' : 'Inativo'}
                                </span>
                                {member.status === 'active' && (
                                    <span className="text-[10px] font-medium text-slate-400 flex items-center gap-1">
                                        <CheckCircle size={10} className="text-emerald-500" /> Verificado
                                    </span>
                                )}
                            </div>
                        </div>
                    ))}

                    {filteredMembers.length === 0 && (
                        <div className="col-span-full py-12 text-center text-slate-400">
                            <div className="w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
                                <Users size={32} />
                            </div>
                            <p className="text-lg font-medium">Nenhum membro encontrado.</p>
                        </div>
                    )}
                </div>
            )}

            {/* Modal de Convite */}
            {isModalOpen && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in" onClick={() => setIsModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col transition-all">
                        <div className="bg-legal-navy p-8 text-white flex justify-between items-center">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center"><UserPlus size={24} /></div>
                                <div>
                                    <h3 className="text-2xl font-black">{editingMember ? 'Editar Convite' : 'Novo Convite'}</h3>
                                    <p className="text-white/60 text-sm">O colaborador receberá um convite por e-mail.</p>
                                </div>
                            </div>
                            <button onClick={() => setIsModalOpen(false)} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                        </div>

                        <form onSubmit={handleSaveMember} className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">E-mail do Colaborador</label>
                                    <div className="relative">
                                        <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input
                                            required
                                            type="email"
                                            placeholder="exemplo@email.com"
                                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                            value={formData.email}
                                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Nível de Acesso</label>
                                    <select
                                        className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5"
                                        value={formData.role === 'Administrador' ? 'Administrador' : 'Colaborador'}
                                        onChange={(e) => setFormData({ ...formData, role: e.target.value })}
                                    >
                                        <option value="Colaborador">Colaborador (Visualização e Edição)</option>
                                        <option value="Administrador">Administrador (Controle Total)</option>
                                    </select>
                                </div>

                                <div className="p-4 bg-amber-50 dark:bg-amber-900/10 rounded-xl border border-amber-100 dark:border-amber-900/30 flex gap-3 text-amber-700 dark:text-amber-400">
                                    <AlertCircle size={20} className="shrink-0" />
                                    <p className="text-xs font-medium">
                                        Após enviar o convite, o usuário deverá se cadastrar no LexHub usando este mesmo e-mail para acessar o escritório.
                                    </p>
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
                                    <Mail size={20} /> {editingMember ? 'Atualizar Convite' : 'Enviar Convite'}
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
                                Seu plano <strong>{currentPlan}</strong> atingiu o limite de usuários. Faça um upgrade para adicionar mais colaboradores.
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
