
import React, { useState, useEffect } from 'react';
import {
  Search,
  Globe,
  Plus,
  ShieldAlert,
  Clock,
  Building2,
  Check,
  Trash2,
  Edit2,
  Zap,
  LayoutGrid,
  List,
  ChevronRight,
  MoreHorizontal,
  Settings2,
  X,
  ArrowLeft,
  ArrowRight,
  AlertCircle
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import { PlanName, Tenant, CRMStage, PipelineStage } from '../types.ts';
import {
  getTenants,
  createTenant,
  updateTenant,
  deleteTenant,
  getPipelineStages,
  createPipelineStage,
  updatePipelineStage,
  deletePipelineStage
} from '../services/supabaseService.ts';

type TenantStatus = 'All' | 'Active' | 'Suspended' | 'Pending';
type ViewMode = 'Table' | 'Kanban';

const INITIAL_STAGES: PipelineStage[] = [];

const STAGE_COLORS = [
  'bg-slate-500', 'bg-blue-500', 'bg-amber-500', 'bg-indigo-500',
  'bg-emerald-500', 'bg-rose-500', 'bg-purple-500', 'bg-cyan-500'
];

export const Tenants: React.FC = () => {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    getTenants()
      .then(setTenants)
      .catch(err => console.error('Erro ao carregar tenants:', err))
      .finally(() => setIsLoading(false));
  }, []);

  const [kanbanStages, setKanbanStages] = useState<PipelineStage[]>([]);

  useEffect(() => {
    getPipelineStages()
      .then(setKanbanStages)
      .catch(err => console.error('Erro ao carregar estágios:', err));
  }, []);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantStatus>('All');
  const [viewMode, setViewMode] = useState<ViewMode>('Table');

  // Modals State
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isStageModalOpen, setIsStageModalOpen] = useState(false);

  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null);
  const [selectedStage, setSelectedStage] = useState<PipelineStage | null>(null);
  const [showFeedback, setShowFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    plan: PlanName.Starter,
    status: 'Active' as 'Active' | 'Suspended' | 'Pending'
  });

  const [stageFormData, setStageFormData] = useState({
    label: '',
    color: STAGE_COLORS[0]
  });

  useEffect(() => {
    if (showFeedback) {
      const timer = setTimeout(() => setShowFeedback(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showFeedback]);

  const filteredTenants = tenants.filter(t => {
    const matchesSearch = t.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      t.domain.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'All' || t.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const moveStage = async (tenantId: string, direction: 'next' | 'prev') => {
    const tenant = tenants.find(t => t.id === tenantId);
    if (!tenant || !tenant.crmStage) return;
    const currentIndex = kanbanStages.findIndex(s => s.id === tenant.crmStage);
    const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
    if (nextIndex < 0 || nextIndex >= kanbanStages.length) return;
    const newStage = kanbanStages[nextIndex].id;
    // Check if new stage is "Closed" (we use label for now as ID is UUID)
    // Actually, we can check if it's the last stage
    const isClosedStage = nextIndex === kanbanStages.length - 1;
    const newStatus = isClosedStage ? 'Active' : tenant.status;
    try {
      await updateTenant(tenantId, { crmStage: newStage, status: newStatus });
      setTenants(prev => prev.map(t =>
        t.id === tenantId ? { ...t, crmStage: newStage, status: newStatus } : t
      ));
    } catch (err) {
      console.error('Erro ao mover estágio:', err);
      setShowFeedback({ message: 'Erro ao mover estágio.', type: 'error' });
    }
  };

  const reorderStage = async (index: number, direction: 'left' | 'right') => {
    const newStages = [...kanbanStages];
    const targetIndex = direction === 'left' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newStages.length) return;

    [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
    setKanbanStages(newStages);

    // Persist changes
    try {
      await Promise.all([
        updatePipelineStage(newStages[index].id, { position: targetIndex }),
        updatePipelineStage(newStages[targetIndex].id, { position: index })
      ]);
    } catch (err) {
      console.error('Erro ao reordenar estágios:', err);
    }
  };

  const onDragEnd = async (result: DropResult) => {
    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (
      destination.droppableId === source.droppableId &&
      destination.index === source.index
    ) {
      return;
    }

    const tenant = tenants.find(t => t.id === draggableId);
    if (!tenant) return;

    const newStageId = destination.droppableId;
    const newStageIndex = kanbanStages.findIndex(s => s.id === newStageId);

    // Check if moving to closed stage (last stage)
    const isClosedStage = newStageIndex === kanbanStages.length - 1;
    const newStatus = isClosedStage ? 'Active' : tenant.status;

    // Optimistic update
    const previousTenants = [...tenants];
    setTenants(prev => prev.map(t =>
      t.id === draggableId ? { ...t, crmStage: newStageId, status: newStatus } : t
    ));

    try {
      await updateTenant(draggableId, { crmStage: newStageId, status: newStatus });
    } catch (err) {
      console.error('Erro ao mover card:', err);
      // Revert on error
      setTenants(previousTenants);
      setShowFeedback({ message: 'Erro ao mover card.', type: 'error' });
    }
  };

  const handleSaveStage = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (selectedStage) {
        // Update
        await updatePipelineStage(selectedStage.id, {
          label: stageFormData.label, // Fixed incorrect property name if different
          color: stageFormData.color
        });
        setKanbanStages(prev => prev.map(s =>
          s.id === selectedStage.id ? { ...s, label: stageFormData.label, color: stageFormData.color } : s
        ));
        setShowFeedback({ message: 'Estágio atualizado!', type: 'success' });
      } else {
        // Create
        const newStage = await createPipelineStage({
          label: stageFormData.label,
          color: stageFormData.color,
          position: kanbanStages.length
        });
        setKanbanStages([...kanbanStages, newStage]);
        setShowFeedback({ message: 'Estágio criado com sucesso!', type: 'success' });
      }
      setIsStageModalOpen(false);
      setStageFormData({ label: '', color: STAGE_COLORS[0] });
      setSelectedStage(null);
    } catch (err) {
      console.error('Erro ao salvar estágio:', err);
      setShowFeedback({ message: 'Erro ao salvar estágio.', type: 'error' });
    }
  };

  const handleDeleteStage = async () => {
    if (!selectedStage) return;

    // Check if stage has tenants
    if (tenants.some(t => t.crmStage === selectedStage.id)) {
      setShowFeedback({ message: 'Não é possível excluir estágio com leads ativos.', type: 'error' });
      return;
    }

    try {
      await deletePipelineStage(selectedStage.id);
      setKanbanStages(prev => prev.filter(s => s.id !== selectedStage.id));
      setIsStageModalOpen(false);
      setSelectedStage(null);
      setShowFeedback({ message: 'Estágio removido.', type: 'success' });
    } catch (err) {
      console.error('Erro ao excluir estágio:', err);
      setShowFeedback({ message: 'Erro ao excluir estágio.', type: 'error' });
    }
  };

  const handleCreateTenant = async (e: React.FormEvent) => {
    e.preventDefault();

    const name = formData.name.trim();
    const domain = formData.domain.trim();

    if (!name || !domain) {
      setShowFeedback({ message: 'Por favor, preencha todos os campos.', type: 'error' });
      return;
    }

    const cleanDomain = domain.toLowerCase().replace(/\s+/g, '-');
    try {
      const newTenant = await createTenant({
        name: name,
        domain: `${cleanDomain}.lexhub`,
        plan: formData.plan,
        status: formData.status,
        crmStage: kanbanStages[0].id as CRMStage,
        mrr: 0,
        joinDate: new Date().toISOString().split('T')[0]
      });
      setTenants([newTenant, ...tenants]);
      setIsCreateModalOpen(false);
      setShowFeedback({ message: 'Lead adicionado ao pipeline!', type: 'success' });
      setFormData({ name: '', domain: '', plan: PlanName.Starter, status: 'Active' });
    } catch (err: any) {
      console.error('Erro ao criar tenant:', err);
      if (err.code === '23505' || (err.message && err.message.includes('duplicate key'))) {
        setShowFeedback({ message: 'Este domínio já está em uso. Escolha outro.', type: 'error' });
      } else {
        setShowFeedback({ message: 'Erro ao criar tenant. Tente novamente.', type: 'error' });
      }
    }
  };

  const handleUpdateTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      await updateTenant(selectedTenant.id, { name: formData.name, domain: formData.domain });
      setTenants(prev => prev.map(t =>
        t.id === selectedTenant.id ? { ...t, name: formData.name, domain: formData.domain } : t
      ));
      setIsEditModalOpen(false);
      setShowFeedback({ message: 'Tenant atualizado com sucesso!', type: 'success' });
    } catch (err) {
      console.error('Erro ao atualizar tenant:', err);
      setShowFeedback({ message: 'Erro ao atualizar tenant.', type: 'error' });
    }
  };

  const handleDeleteTenant = async () => {
    if (!selectedTenant) return;
    try {
      await deleteTenant(selectedTenant.id);
      setTenants(prev => prev.filter(t => t.id !== selectedTenant.id));
      setIsDeleteConfirmOpen(false);
      setShowFeedback({ message: 'Tenant removido do sistema.', type: 'error' });
    } catch (err) {
      console.error('Erro ao deletar tenant:', err);
      setShowFeedback({ message: 'Erro ao remover tenant.', type: 'error' });
    }
  };

  const handleUpgradeTenant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTenant) return;
    try {
      await updateTenant(selectedTenant.id, { plan: formData.plan });
      setTenants(prev => prev.map(t =>
        t.id === selectedTenant.id ? { ...t, plan: formData.plan } : t
      ));
      setIsUpgradeModalOpen(false);
      setShowFeedback({ message: `Upgrade para o plano ${formData.plan} realizado!`, type: 'success' });
    } catch (err) {
      console.error('Erro ao fazer upgrade:', err);
      setShowFeedback({ message: 'Erro ao atualizar plano.', type: 'error' });
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Active': return <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"><Check size={10} /> Ativo</span>;
      case 'Suspended': return <span className="flex items-center gap-1 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"><ShieldAlert size={10} /> Suspenso</span>;
      default: return <span className="flex items-center gap-1 text-slate-500 bg-slate-50 px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest"><Clock size={10} /> Pendente</span>;
    }
  };

  return (
    <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-900 relative pb-20 dark:text-slate-100">

      {showFeedback && (
        <div className={`fixed top-24 right-8 z-[120] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${showFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
          <div className="bg-white/20 p-1.5 rounded-full"><Check size={20} /></div>
          <p className="font-bold">{showFeedback.message}</p>
        </div>
      )}

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-legal-navy dark:text-white flex items-center gap-2">
            <Building2 className="text-legal-bronze" /> Gestão de Tenants & CRM
          </h2>
          <p className="text-slate-500 dark:text-slate-400 text-sm">Controle de instâncias e pipeline de vendas do ecossistema.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-white dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800 flex shadow-sm">
            <button
              onClick={() => setViewMode('Table')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'Table' ? 'bg-legal-navy text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
            >
              <List size={14} /> Lista
            </button>
            <button
              onClick={() => setViewMode('Kanban')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'Kanban' ? 'bg-legal-bronze text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
            >
              <LayoutGrid size={14} /> Kanban CRM
            </button>
          </div>


          <button
            onClick={() => {
              setSelectedStage(null);
              setStageFormData({ label: '', color: STAGE_COLORS[0] });
              setIsStageModalOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700 transition-all font-bold text-xs"
          >
            <Plus size={14} /> Nova Coluna
          </button>

          <button
            onClick={() => {
              setFormData({ name: '', domain: '', plan: PlanName.Starter, status: 'Active' });
              setIsCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 bg-legal-navy text-white rounded-xl hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-legal-navy/20 dark:bg-legal-bronze dark:shadow-legal-bronze/20"
          >
            <Plus size={20} /> Novo Tenant
          </button>
        </div>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 transition-colors">
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
            <input
              type="text"
              placeholder="Buscar organização ou domínio..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 dark:text-white text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as TenantStatus)}
            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold focus:outline-none focus:ring-2 focus:ring-legal-navy/10 cursor-pointer min-w-[160px] dark:text-white"
          >
            <option value="All">Todos Status</option>
            <option value="Active">Ativos</option>
            <option value="Suspended">Suspenso</option>
            <option value="Pending">Pendente</option>
          </select>
        </div>

        {viewMode === 'Table' ? (
          <div className="overflow-x-auto min-h-[400px]">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-slate-50/50 dark:bg-slate-800/50 text-slate-400 dark:text-slate-500 text-[10px] font-bold uppercase tracking-[0.1em] border-b border-slate-100 dark:border-slate-800">
                  <th className="px-6 py-4">Organização</th>
                  <th className="px-6 py-4">Acesso (Domínio)</th>
                  <th className="px-6 py-4">Plano</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {filteredTenants.map((tenant) => (
                  <tr key={tenant.id} className="hover:bg-slate-50/30 dark:hover:bg-slate-800/30 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center font-bold text-slate-500 dark:text-slate-400 text-lg group-hover:bg-legal-navy group-hover:text-white transition-all shadow-sm">
                          {tenant.name.charAt(0)}
                        </div>
                        <div>
                          <p className="font-bold text-slate-900 dark:text-slate-100 leading-none mb-1">{tenant.name}</p>
                          <p className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">DESDE {new Date(tenant.joinDate).toLocaleDateString()}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-medium text-slate-600 dark:text-slate-400">
                        <Globe size={14} className="text-slate-400" />
                        <span className="hover:text-legal-navy dark:hover:text-legal-bronze hover:underline cursor-pointer">{tenant.domain}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 font-bold text-sm text-legal-bronze">{tenant.plan}</td>
                    <td className="px-6 py-4">{getStatusBadge(tenant.status)}</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex justify-center gap-2">
                        <button onClick={() => { setSelectedTenant(tenant); setFormData({ ...formData, name: tenant.name, domain: tenant.domain }); setIsEditModalOpen(true); }} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-legal-navy hover:text-white dark:hover:bg-legal-bronze rounded-xl transition-all"><Edit2 size={16} /></button>
                        <button onClick={() => { setSelectedTenant(tenant); setFormData({ ...formData, plan: tenant.plan }); setIsUpgradeModalOpen(true); }} className="p-2 bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 rounded-xl transition-all"><Zap size={16} /></button>
                        <button onClick={() => { setSelectedTenant(tenant); setIsDeleteConfirmOpen(true); }} className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 rounded-xl transition-all"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <DragDropContext onDragEnd={onDragEnd}>
            <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px] snap-x">
              {kanbanStages.map((stage, idx) => {
                const stageTenants = filteredTenants.filter(t => t.crmStage === stage.id);

                return (
                  <Droppable key={stage.id} droppableId={stage.id}>
                    {(provided) => (
                      <div
                        ref={provided.innerRef}
                        {...provided.droppableProps}
                        className="min-w-[320px] flex-1 flex flex-col gap-4 bg-slate-50/50 dark:bg-slate-800/30 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 snap-center"
                      >
                        <div className="flex items-center justify-between px-2 py-1 group/header">
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${stage.color}`}></div>
                            <h3 className="font-bold text-slate-700 dark:text-slate-300 text-xs uppercase tracking-wider">{stage.label}</h3>
                          </div>

                          <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                            <button
                              onClick={() => reorderStage(idx, 'left')}
                              disabled={idx === 0}
                              className="p-1 text-slate-400 hover:text-legal-navy disabled:opacity-0"
                            >
                              <ArrowLeft size={12} />
                            </button>
                            <button
                              onClick={() => reorderStage(idx, 'right')}
                              disabled={idx === kanbanStages.length - 1}
                              className="p-1 text-slate-400 hover:text-legal-navy disabled:opacity-0"
                            >
                              <ArrowRight size={12} />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedStage(stage);
                                setStageFormData({ label: stage.label, color: stage.color });
                                setIsStageModalOpen(true);
                              }}
                              className="p-1 text-slate-400 hover:text-legal-navy ml-2"
                            >
                              <Settings2 size={12} />
                            </button>
                          </div>

                          <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-600 dark:text-white">{stageTenants.length}</span>
                        </div>

                        <div className="flex flex-col gap-3 h-full min-h-[100px]">
                          {stageTenants.map((tenant, index) => (
                            <Draggable key={tenant.id} draggableId={tenant.id} index={index}>
                              {(provided) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  {...provided.dragHandleProps}
                                  className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative"
                                >
                                  <div className="flex justify-between items-start mb-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 bg-slate-100 dark:bg-slate-700 rounded-lg flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400">{tenant.name.charAt(0)}</div>
                                      <div>
                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">{tenant.name}</h4>
                                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium">{tenant.domain}</p>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <button onClick={() => { setSelectedTenant(tenant); setFormData({ ...formData, name: tenant.name, domain: tenant.domain }); setIsEditModalOpen(true); }} className="text-slate-300 dark:text-slate-600 hover:text-legal-navy"><Edit2 size={12} /></button>
                                      <button onClick={() => { setSelectedTenant(tenant); setIsDeleteConfirmOpen(true); }} className="text-slate-300 dark:text-slate-600 hover:text-rose-500"><Trash2 size={12} /></button>
                                    </div>
                                  </div>

                                  <div className="flex items-center justify-between mb-3">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-md ${tenant.plan === PlanName.Enterprise ? 'bg-purple-100 text-purple-600' :
                                      tenant.plan === PlanName.Professional ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400'
                                      }`}>
                                      {tenant.plan.toUpperCase()}
                                    </span>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      </div>
                    )}
                  </Droppable>
                )
              })}
            </div>
          </DragDropContext>
        )}
      </div>

      {/* --- MODAL EDITAR TENANT --- */}
      {isEditModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsEditModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 transition-colors">
            <div className="bg-legal-navy p-8 text-white relative">
              <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-legal-bronze rounded-xl flex items-center justify-center">
                  <Edit2 size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Editar Tenant</h3>
                  <p className="text-white/60 text-xs">Atualize os dados da organização.</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleUpdateTenant} className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Organização</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white"
                  value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Domínio de Acesso</label>
                <input required type="text" className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white"
                  value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} />
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-legal-navy text-white rounded-2xl font-bold">Salvar Alterações</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL UPGRADE PLANO --- */}
      {isUpgradeModalOpen && selectedTenant && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsUpgradeModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 transition-colors">
            <div className="bg-amber-500 p-8 text-white relative">
              <button onClick={() => setIsUpgradeModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center text-amber-500 shadow-lg">
                  <Zap size={24} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Alterar Plano</h3>
                  <p className="text-white/80 text-xs">Selecione o novo nível de serviço para {selectedTenant.name}.</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleUpgradeTenant} className="p-8 space-y-6">
              <div className="space-y-4">
                {Object.values(PlanName).map(plan => (
                  <button
                    key={plan}
                    type="button"
                    onClick={() => setFormData({ ...formData, plan })}
                    className={`w-full p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${formData.plan === plan ? 'border-amber-500 bg-amber-50 dark:bg-amber-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-slate-200'}`}
                  >
                    <span className={`font-bold ${formData.plan === plan ? 'text-amber-700 dark:text-amber-400' : 'text-slate-600 dark:text-slate-400'}`}>{plan}</span>
                    {formData.plan === plan && <Check size={18} className="text-amber-500" />}
                  </button>
                ))}
              </div>
              <div className="pt-4 flex gap-3">
                <button type="button" onClick={() => setIsUpgradeModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-amber-500 text-white rounded-2xl font-bold shadow-xl shadow-amber-500/20">Efetivar Upgrade</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EXCLUIR TENANT --- */}
      {isDeleteConfirmOpen && selectedTenant && (
        <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsDeleteConfirmOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 transition-colors">
            <div className="p-8 text-center space-y-6">
              <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/20 rounded-full flex items-center justify-center mx-auto text-rose-500">
                <Trash2 size={40} />
              </div>
              <div>
                <h3 className="text-xl font-bold text-slate-900 dark:text-white">Remover Tenant?</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm mt-2 font-medium">Esta ação é irreversível. Todos os dados de <strong>{selectedTenant.name}</strong> serão permanentemente excluídos.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setIsDeleteConfirmOpen(false)} className="flex-1 py-3.5 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-2xl font-bold">Manter</button>
                <button onClick={handleDeleteTenant} className="flex-1 py-3.5 bg-rose-500 text-white rounded-2xl font-bold shadow-lg shadow-rose-500/20">Remover</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- MODAL NOVO TENANT --- */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsCreateModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-xl overflow-hidden animate-in zoom-in-95">
            <div className="bg-legal-navy p-8 text-white">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg"><Plus size={32} /></div>
                <div>
                  <h3 className="text-2xl font-bold">Adicionar Prospect</h3>
                  <p className="text-white/60 text-sm">Insira uma nova banca no seu pipeline de vendas.</p>
                </div>
              </div>
            </div>
            <form onSubmit={handleCreateTenant} className="p-8 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Organização</label>
                  <input required type="text" placeholder="Ex: Almeida Advocacia"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-legal-navy/10 dark:text-white text-sm font-medium"
                    value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Subdomínio</label>
                  <input required type="text" placeholder="almeida"
                    className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl focus:ring-2 focus:ring-legal-navy/10 dark:text-white text-sm font-medium"
                    value={formData.domain} onChange={(e) => setFormData({ ...formData, domain: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest ml-1">Plano Pretendido</label>
                  <select className="w-full px-4 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white"
                    value={formData.plan} onChange={(e) => setFormData({ ...formData, plan: e.target.value as PlanName })}>
                    <option value={PlanName.Starter}>Starter (R$ 297)</option>
                    <option value={PlanName.Professional}>Professional (R$ 697)</option>
                    <option value={PlanName.Enterprise}>Enterprise (R$ 1.497)</option>
                  </select>
                </div>
              </div>
              <div className="pt-4 flex gap-4">
                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-2xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold hover:brightness-110 shadow-xl shadow-legal-navy/20 dark:shadow-legal-bronze/20">Iniciar Pipeline</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* --- MODAL EDITAR COLUNA (STAGE) --- */}
      {isStageModalOpen && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsStageModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 transition-colors">
            <div className={`${selectedStage ? selectedStage.color : 'bg-legal-navy'} p-6 text-white relative transition-colors`}>
              <button onClick={() => setIsStageModalOpen(false)} className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
              <h3 className="text-lg font-bold">{selectedStage ? 'Editar Coluna' : 'Nova Coluna'}</h3>
            </div>

            <form onSubmit={handleSaveStage} className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Etapa</label>
                <input
                  type="text"
                  required
                  className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 dark:text-white"
                  value={stageFormData.label}
                  onChange={(e) => setStageFormData({ ...stageFormData, label: e.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cor de Identificação</label>
                <div className="flex flex-wrap gap-2">
                  {STAGE_COLORS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStageFormData({ ...stageFormData, color })}
                      className={`w-8 h-8 rounded-full ${color} ${stageFormData.color === color ? 'ring-4 ring-offset-2 ring-slate-200 dark:ring-slate-700 dark:ring-offset-slate-900' : 'opacity-70 hover:opacity-100'} transition-all`}
                    />
                  ))}
                </div>
              </div>

              <div className="pt-4 flex gap-2">
                {selectedStage && (
                  <button
                    type="button"
                    onClick={handleDeleteStage}
                    className="p-3 bg-rose-50 dark:bg-rose-900/20 text-rose-500 rounded-xl hover:bg-rose-100 transition-colors"
                  >
                    <Trash2 size={18} />
                  </button>
                )}
                <button type="button" onClick={() => setIsStageModalOpen(false)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-500 rounded-xl font-bold">Cancelar</button>
                <button type="submit" className="flex-1 py-3 bg-legal-navy text-white rounded-xl font-bold">Salvar</button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
