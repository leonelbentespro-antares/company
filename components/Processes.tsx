import React, { useState, useEffect, useRef } from 'react';
import {
    Search,
    Filter,
    Plus,
    Scale,
    Gavel,
    User,
    Calendar,
    ChevronDown,
    X,
    Check,
    Clock,
    Archive,
    Hash,
    ArrowUpRight,
    Edit2,
    Trash2,
    CheckCircle,
    AlertCircle,
    UserPlus,
    Briefcase,
    LayoutGrid,
    List,
    ChevronRight,
    MoreHorizontal,
    Settings2,
    Palette,
    Save,
    ArrowLeft,
    ArrowRight,
    FileSpreadsheet,
    UploadCloud,
    Download,
    Loader2,
    FileText,
    Database
} from 'lucide-react';
import { Process, ProcessStage } from '../types.ts';
import { getProcesses, createProcess, updateProcess, deleteProcess } from '../services/supabaseService.ts';
import { useTenant } from '../services/tenantContext.tsx';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const INITIAL_CLIENTS = [
    "Carlos Eduardo Oliveira",
    "Maria Helena Souza",
    "TecnoLogic LTDA",
    "Roberto J. Pereira",
    "Bancos S.A.",
    "Condomínio Solar das Palmeiras"
];

interface KanbanStage {
    id: string;
    label: string;
    color: string;
}

const INITIAL_PROCESS_STAGES: KanbanStage[] = [
    { id: ProcessStage.Initial, label: 'Petição Inicial', color: 'bg-blue-500' },
    { id: ProcessStage.Evidence, label: 'Instrução', color: 'bg-indigo-500' },
    { id: ProcessStage.Decision, label: 'Sentença', color: 'bg-amber-500' },
    { id: ProcessStage.Appeal, label: 'Recursos', color: 'bg-rose-500' },
    { id: ProcessStage.Archived, label: 'Arquivado', color: 'bg-emerald-500' },
];

const STAGE_COLORS = [
    'bg-blue-500', 'bg-indigo-500', 'bg-amber-500', 'bg-rose-500',
    'bg-emerald-500', 'bg-purple-500', 'bg-slate-500', 'bg-cyan-500'
];

type ViewMode = 'Table' | 'Kanban' | 'ImportExport';

export const Processes: React.FC = () => {
    const { tenantId } = useTenant();
    const [processes, setProcesses] = useState<Process[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (!tenantId) return;
        getProcesses(tenantId)
            .then(setProcesses)
            .catch(err => console.error('Erro ao carregar processos:', err))
            .finally(() => setIsLoading(false));
    }, [tenantId]);
    const [kanbanStages, setKanbanStages] = useState<KanbanStage[]>(INITIAL_PROCESS_STAGES);
    const [clients, setClients] = useState<string[]>(INITIAL_CLIENTS);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [viewMode, setViewMode] = useState<ViewMode>('Table');

    // Modals
    const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [isStageModalOpen, setIsStageModalOpen] = useState(false);

    const [isAddingNewClient, setIsAddingNewClient] = useState(false);
    const [selectedProcess, setSelectedProcess] = useState<Process | null>(null);
    const [selectedStage, setSelectedStage] = useState<KanbanStage | null>(null);
    const [showFeedback, setShowFeedback] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const [formData, setFormData] = useState<{
        number: string;
        clientName: string;
        subject: string;
        court: string;
        status: 'Active' | 'Suspended' | 'Archived';
        stage: ProcessStage | string;
    }>({
        number: '',
        clientName: '',
        subject: '',
        court: '',
        status: 'Active',
        stage: ProcessStage.Initial
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

    const filteredProcesses = processes.filter(p => {
        const matchesSearch = p.number.includes(searchTerm) ||
            p.clientName.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = statusFilter === 'All' || p.status === statusFilter;
        return matchesSearch && matchesStatus;
    });

    // --- IMPORT / EXPORT LOGIC ---
    const handleExportCSV = () => {
        setIsProcessing(true);
        setTimeout(() => {
            const headers = ['Número CNJ', 'Cliente', 'Assunto', 'Tribunal', 'Status', 'Fase', 'Última Movimentação', 'Criado em'];
            const rows = processes.map(p => [
                p.number,
                p.clientName,
                `"${p.subject.replace(/"/g, '""')}"`,
                p.court,
                p.status,
                kanbanStages.find(s => s.id === p.stage)?.label || p.stage,
                p.lastMovement,
                p.createdAt
            ]);

            const csvContent = "\uFEFF" + [headers, ...rows].map(e => e.join(',')).join('\n');
            const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.setAttribute('href', url);
            link.setAttribute('download', `LexHub_Processos_${new Date().toISOString().split('T')[0]}.csv`);
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);

            setIsProcessing(false);
            setShowFeedback({ message: 'Acervo exportado com sucesso!', type: 'success' });
        }, 1200);
    };

    const handleImportCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        const reader = new FileReader();
        reader.onload = async (event) => {
            try {
                const text = event.target?.result as string;

                const rows: string[][] = [];
                let currentRow: string[] = [];
                let currentCell = '';
                let insideQuotes = false;

                const firstLine = text.substring(0, text.indexOf('\n') > -1 ? text.indexOf('\n') : text.length);
                const separator = firstLine.split(';').length > firstLine.split(',').length ? ';' : ',';

                for (let i = 0; i < text.length; i++) {
                    const char = text[i];
                    const nextChar = text[i + 1];

                    if (char === '"' && insideQuotes && nextChar === '"') {
                        currentCell += '"';
                        i++;
                    } else if (char === '"') {
                        insideQuotes = !insideQuotes;
                    } else if (char === separator && !insideQuotes) {
                        currentRow.push(currentCell.trim());
                        currentCell = '';
                    } else if ((char === '\n' || (char === '\r' && nextChar === '\n')) && !insideQuotes) {
                        currentRow.push(currentCell.trim());
                        rows.push(currentRow);
                        currentRow = [];
                        currentCell = '';
                        if (char === '\r') i++;
                    } else {
                        currentCell += char;
                    }
                }

                if (currentCell !== '' || currentRow.length > 0) {
                    currentRow.push(currentCell.trim());
                    rows.push(currentRow);
                }

                const validRows = rows.filter(row => row.length > 1 || (row.length === 1 && row[0] !== ''));
                if (validRows.length < 2) throw new Error("O arquivo não contém dados para importar.");

                const headers = validRows[0].map(h => h.toLowerCase().replace(/^["'](.*)["']$/, '$1').trim());

                const getColIndex = (possibleNames: string[]) => {
                    return headers.findIndex(h => possibleNames.some(name => h.includes(name.toLowerCase())));
                };

                const cnjIdx = getColIndex(['número cnj', 'numero cnj', 'cnj', 'numero', 'processo', 'nº cnj', 'nº do processo']);
                const clientIdx = getColIndex(['cliente', 'parte', 'nome', 'autor', 'réu', 'reu']);
                const subjectIdx = getColIndex(['assunto', 'objeto', 'tema', 'ação', 'acao', 'tipo de ação']);
                const courtIdx = getColIndex(['tribunal', 'vara', 'órgão', 'orgao', 'juízo', 'juizo', 'comarca']);

                const missingCols = [];
                if (cnjIdx === -1) missingCols.push('"Número CNJ"');
                if (clientIdx === -1) missingCols.push('"Cliente"');

                if (missingCols.length > 0) {
                    const cabecalhoLido = validRows[0].join(' | ');
                    throw new Error(`As seguintes colunas obrigatórias não foram encontradas: ${missingCols.join(' e ')}. Verifique se a 1ª linha do seu arquivo contém esses títulos. Cabeçalho lido do arquivo: [ ${cabecalhoLido} ]`);
                }

                const imported: Process[] = [];
                const currentDate = new Date().toISOString().split('T')[0];

                for (let i = 1; i < validRows.length; i++) {
                    const row = validRows[i];
                    if (!row[cnjIdx] || !row[clientIdx]) continue;

                    const clean = (val: string) => val ? val.replace(/^["'](.*)["']$/, '$1').trim() : '';

                    const newProcess: Process = {
                        id: `imp_${Date.now()}_${i}`,
                        number: clean(row[cnjIdx]),
                        clientName: clean(row[clientIdx]),
                        subject: subjectIdx !== -1 ? clean(row[subjectIdx]) : 'Processo importado',
                        court: courtIdx !== -1 ? clean(row[courtIdx]) : '',
                        status: 'Active',
                        stage: ProcessStage.Initial,
                        lastMovement: currentDate,
                        createdAt: currentDate,
                    };

                    const exists = processes.some(p => p.number === newProcess.number) || imported.some(p => p.number === newProcess.number);
                    if (!exists) {
                        imported.push(newProcess);
                    }
                }

                if (imported.length > 0) {
                    const createdProcesses: Process[] = [];
                    for (const p of imported) {
                        try {
                            const created = await createProcess(tenantId, {
                                number: p.number,
                                clientName: p.clientName,
                                subject: p.subject,
                                court: p.court,
                                status: p.status,
                                stage: p.stage,
                                lastMovement: p.lastMovement
                            });
                            createdProcesses.push(created);
                        } catch (err) {
                            console.error('Erro inserindo processo:', err);
                        }
                    }

                    if (createdProcesses.length > 0) {
                        setProcesses(prev => [...createdProcesses, ...prev]);
                        setShowFeedback({ message: `${createdProcesses.length} processo(s) importado(s) com sucesso!`, type: 'success' });
                    } else {
                        setShowFeedback({ message: `Erro ao salvar processos no banco de dados. Processos lidos: ${imported.length}.`, type: 'error' });
                    }
                } else {
                    setShowFeedback({ message: `Nenhum processo novo para importar (podem ser duplicados na base atual).`, type: 'error' });
                }

            } catch (err: any) {
                console.error("Erro na importação: ", err);
                setShowFeedback({ message: `Erro ao importar: ${err.message}`, type: 'error' });
            } finally {
                setIsProcessing(false);
                if (fileInputRef.current) fileInputRef.current.value = '';
            }
        };
        reader.readAsText(file);
    };

    const moveStage = async (processId: string, direction: 'next' | 'prev') => {
        const process = processes.find(p => p.id === processId);
        if (!process) return;
        const currentIndex = kanbanStages.findIndex(s => s.id === process.stage);
        const nextIndex = direction === 'next' ? currentIndex + 1 : currentIndex - 1;
        if (nextIndex < 0 || nextIndex >= kanbanStages.length) return;
        const newStage = kanbanStages[nextIndex].id;
        const newStatus = newStage === ProcessStage.Archived ? 'Archived' : 'Active';
        const lastMovement = new Date().toISOString().split('T')[0];
        try {
            await updateProcess(processId, tenantId, { stage: newStage, status: newStatus, lastMovement });
            setProcesses(prev => prev.map(p =>
                p.id === processId ? { ...p, stage: newStage, status: newStatus, lastMovement } : p
            ));
        } catch (err) {
            console.error('Erro ao mover estágio:', err);
        }
    };

    const reorderStage = (index: number, direction: 'left' | 'right') => {
        const newStages = [...kanbanStages];
        const targetIndex = direction === 'left' ? index - 1 : index + 1;
        if (targetIndex < 0 || targetIndex >= newStages.length) return;

        [newStages[index], newStages[targetIndex]] = [newStages[targetIndex], newStages[index]];
        setKanbanStages(newStages);
    };

    const getStatusBadge = (status: string) => {
        switch (status) {
            case 'Active': return <span className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight"><Check size={12} /> EM CURSO</span>;
            case 'Suspended': return <span className="flex items-center gap-1.5 text-amber-600 bg-amber-50 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight"><Clock size={12} /> SUSPENSO</span>;
            case 'Archived': return <span className="flex items-center gap-1.5 text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-tight"><CheckCircle size={12} /> FINALIZADO</span>;
            default: return null;
        }
    };

    const handleCreateProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (isAddingNewClient && !clients.includes(formData.clientName)) {
            setClients(prev => [...prev, formData.clientName].sort());
        }
        try {
            const newProcess = await createProcess(tenantId, {
                ...formData,
                lastMovement: new Date().toISOString().split('T')[0]
            });
            setProcesses([newProcess, ...processes]);
            setIsCreateModalOpen(false);
            setIsAddingNewClient(false);
            setShowFeedback({ message: 'Processo cadastrado no CRM com sucesso!', type: 'success' });
        } catch (err: any) {
            console.error('Erro ao criar processo:', err);
            setShowFeedback({ message: `Erro: ${err.message || 'Falha ao criar processo no banco de dados.'}`, type: 'error' });
        }
    };

    const handleUpdateProcess = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedProcess) return;
        try {
            await updateProcess(selectedProcess.id, tenantId, formData);
            setProcesses(prev => prev.map(p => p.id === selectedProcess.id ? { ...p, ...formData } : p));
            setIsEditModalOpen(false);
            setShowFeedback({ message: 'Processo atualizado!', type: 'success' });
        } catch (err) {
            console.error('Erro ao atualizar processo:', err);
            setShowFeedback({ message: 'Erro ao atualizar processo.', type: 'error' });
        }
    };

    const handleAddStage = (e: React.FormEvent) => {
        e.preventDefault();
        const newStage: KanbanStage = {
            id: `custom_${Math.random().toString(36).substr(2, 5)}`,
            label: stageFormData.label,
            color: stageFormData.color
        };
        setKanbanStages([...kanbanStages, newStage]);
        setIsStageModalOpen(false);
        setShowFeedback({ message: 'Nova aba adicionada ao Kanban!', type: 'success' });
        setStageFormData({ label: '', color: STAGE_COLORS[0] });
    };

    const handleRenameStage = (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedStage) return;
        setKanbanStages(prev => prev.map(s => s.id === selectedStage.id ? { ...s, label: stageFormData.label, color: stageFormData.color } : s));
        setIsStageModalOpen(false);
        setSelectedStage(null);
        setShowFeedback({ message: 'Aba renomeada com sucesso!', type: 'success' });
    };

    const openStageModal = (stage?: KanbanStage) => {
        if (stage) {
            setSelectedStage(stage);
            setStageFormData({ label: stage.label, color: stage.color });
        } else {
            setSelectedStage(null);
            setStageFormData({ label: '', color: STAGE_COLORS[0] });
        }
        setIsStageModalOpen(true);
    };

    const handleDeleteProcess = async () => {
        if (!selectedProcess) return;
        try {
            await deleteProcess(selectedProcess.id, tenantId);
            setProcesses(prev => prev.filter(p => p.id !== selectedProcess.id));
            setIsDeleteModalOpen(false);
            setShowFeedback({ message: 'Processo excluído.', type: 'error' });
        } catch (err) {
            console.error('Erro ao deletar processo:', err);
            setShowFeedback({ message: 'Erro ao excluir processo.', type: 'error' });
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

        const process = processes.find(p => p.id === draggableId);
        if (!process) return;

        const newStageId = destination.droppableId;
        const newStatus = newStageId === ProcessStage.Archived ? 'Archived' : 'Active';
        const lastMovement = new Date().toISOString().split('T')[0];

        const previousProcesses = [...processes];
        setProcesses(prev => prev.map(p =>
            p.id === draggableId ? { ...p, stage: newStageId, status: newStatus, lastMovement } : p
        ));

        try {
            await updateProcess(draggableId, tenantId, { stage: newStageId, status: newStatus, lastMovement });
        } catch (err) {
            console.error('Erro ao mover processo:', err);
            setProcesses(previousProcesses);
            setShowFeedback({ message: 'Erro ao mover processo.', type: 'error' });
        }
    };

    return (
        <div className="space-y-6 animate-in slide-in-from-bottom-4 duration-500 text-slate-900 pb-20 dark:text-slate-100 transition-colors">

            {showFeedback && (
                <div className={`fixed top-24 right-8 z-[120] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300 ${showFeedback.type === 'success' ? 'bg-emerald-600' : 'bg-rose-600'} text-white`}>
                    <div className="bg-white/20 p-1.5 rounded-full"><Check size={20} /></div>
                    <p className="font-bold">{showFeedback.message}</p>
                </div>
            )}

            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-legal-navy dark:text-white flex items-center gap-2">
                        <Scale className="text-legal-bronze" /> Processos Judiciais & CRM
                    </h2>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie o acervo e mova os processos através das fases do tribunal.</p>
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
                            <LayoutGrid size={14} /> Kanban
                        </button>
                        <button
                            onClick={() => setViewMode('ImportExport')}
                            className={`px-3 py-1.5 rounded-lg flex items-center gap-2 text-xs font-bold transition-all ${viewMode === 'ImportExport' ? 'bg-legal-navy text-white shadow-md' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
                        >
                            <FileSpreadsheet size={14} /> Dados
                        </button>
                    </div>

                    <button
                        onClick={() => {
                            setFormData({ number: '', clientName: '', subject: '', court: '', status: 'Active', stage: kanbanStages[0].id });
                            setIsAddingNewClient(false);
                            setIsCreateModalOpen(true);
                        }}
                        className="flex items-center gap-2 px-5 py-2.5 bg-legal-navy text-white rounded-xl hover:bg-opacity-90 transition-all font-bold shadow-lg shadow-legal-navy/20 dark:bg-legal-bronze dark:shadow-legal-bronze/20"
                    >
                        <Plus size={20} /> Novo Processo
                    </button>
                </div>
            </div>

            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-4 transition-colors">
                {viewMode !== 'ImportExport' && (
                    <div className="flex flex-col md:flex-row gap-4 mb-6">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar por CNJ ou Cliente..."
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 text-sm dark:text-white"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                            />
                        </div>
                        <select
                            value={statusFilter}
                            onChange={(e) => setStatusFilter(e.target.value)}
                            className="px-4 py-2.5 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold outline-none cursor-pointer min-w-[160px] dark:text-white"
                        >
                            <option value="All">Todos Status</option>
                            <option value="Active">Em Curso</option>
                            <option value="Suspended">Suspenso</option>
                            <option value="Archived">Arquivado</option>
                        </select>
                    </div>
                )}

                {viewMode === 'Table' && (
                    <div className="overflow-x-auto min-h-[400px]">
                        <table className="w-full text-left">
                            <thead>
                                <tr className="bg-slate-50 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                                    <th className="px-6 py-4">Número / Estágio</th>
                                    <th className="px-6 py-4">Cliente / Objeto</th>
                                    <th className="px-6 py-4">Status</th>
                                    <th className="px-6 py-4">Movimentação</th>
                                    <th className="px-6 py-4 text-center">Ações</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                                {filteredProcesses.map((p) => (
                                    <tr key={p.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <div className="flex items-center gap-1.5 text-slate-900 dark:text-slate-100 font-bold text-sm">
                                                    <Hash size={14} className="text-legal-bronze" />
                                                    {p.number}
                                                </div>
                                                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
                                                    FASE: {kanbanStages.find(s => s.id === p.stage)?.label || 'Outros'}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="space-y-1">
                                                <p className="font-bold text-slate-700 dark:text-slate-300 text-sm">{p.clientName}</p>
                                                <p className="text-xs text-slate-400 dark:text-slate-500 truncate max-w-[180px]">{p.subject}</p>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">{getStatusBadge(p.status)}</td>
                                        <td className="px-6 py-4">
                                            <p className="text-xs font-bold text-slate-600 dark:text-slate-400">{new Date(p.lastMovement).toLocaleDateString()}</p>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button onClick={() => { setSelectedProcess(p); setFormData({ ...p }); setIsEditModalOpen(true); }} className="p-2 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-legal-navy hover:text-white dark:hover:bg-legal-bronze rounded-xl transition-all"><Edit2 size={16} /></button>
                                                <button onClick={() => { setSelectedProcess(p); setIsDeleteModalOpen(true); }} className="p-2 bg-rose-50 dark:bg-rose-900/20 text-rose-500 hover:bg-rose-100 rounded-xl transition-all"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

                {viewMode === 'Kanban' && (
                    <DragDropContext onDragEnd={onDragEnd}>
                        <div className="flex gap-4 overflow-x-auto pb-6 min-h-[600px] snap-x">
                            {kanbanStages.map((stage, idx) => {
                                const stageProcesses = filteredProcesses.filter(p => p.stage === stage.id);

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
                                                        <button onClick={() => openStageModal(stage)} className="p-1 hover:bg-white dark:hover:bg-slate-700 rounded-md transition-colors text-slate-300 dark:text-slate-600 hover:text-legal-navy">
                                                            <Settings2 size={12} />
                                                        </button>
                                                    </div>

                                                    <div className="flex items-center gap-1 opacity-0 group-hover/header:opacity-100 transition-opacity">
                                                        <button onClick={() => reorderStage(idx, 'left')} disabled={idx === 0} className="p-1 text-slate-400 hover:text-legal-navy disabled:opacity-0"><ArrowLeft size={12} /></button>
                                                        <button onClick={() => reorderStage(idx, 'right')} disabled={idx === kanbanStages.length - 1} className="p-1 text-slate-400 hover:text-legal-navy disabled:opacity-0"><ArrowRight size={12} /></button>
                                                    </div>

                                                    <span className="bg-white dark:bg-slate-700 px-2 py-0.5 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-600 dark:text-white">{stageProcesses.length}</span>
                                                </div>

                                                <div className="flex flex-col gap-3 h-full min-h-[100px]">
                                                    {stageProcesses.map((process, index) => (
                                                        <Draggable key={process.id} draggableId={process.id} index={index}>
                                                            {(provided) => (
                                                                <div
                                                                    ref={provided.innerRef}
                                                                    {...provided.draggableProps}
                                                                    {...provided.dragHandleProps}
                                                                    className="bg-white dark:bg-slate-800 p-4 rounded-xl border border-slate-200 dark:border-slate-700 shadow-sm hover:shadow-md transition-all group relative"
                                                                >
                                                                    <div className="space-y-2 mb-4">
                                                                        <div className="flex justify-between items-start">
                                                                            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">CNJ: {process.number.split('.')[0]}...</span>
                                                                            <div className="flex items-center gap-1">
                                                                                <button onClick={() => { setSelectedProcess(process); setFormData({ ...process }); setIsEditModalOpen(true); }} className="text-slate-300 dark:text-slate-600 hover:text-legal-navy"><Edit2 size={12} /></button>
                                                                                <button onClick={() => { setSelectedProcess(process); setIsDeleteModalOpen(true); }} className="text-slate-300 dark:text-slate-600 hover:text-rose-500"><Trash2 size={12} /></button>
                                                                            </div>
                                                                        </div>
                                                                        <h4 className="font-bold text-slate-900 dark:text-slate-100 text-sm leading-tight">{process.clientName}</h4>
                                                                        <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2">{process.subject}</p>
                                                                    </div>

                                                                    <div className="flex items-center justify-between pt-3 border-t border-slate-50 dark:border-slate-700">
                                                                        <button onClick={() => moveStage(process.id, 'prev')} disabled={kanbanStages.indexOf(stage) === 0} className="px-2 py-1 text-[10px] font-bold text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-0">Voltar</button>
                                                                        <button onClick={() => moveStage(process.id, 'next')} disabled={kanbanStages.indexOf(stage) === kanbanStages.length - 1} className="px-3 py-1.5 bg-legal-navy dark:bg-legal-bronze text-white rounded-lg text-[10px] font-bold hover:brightness-110 disabled:opacity-0 flex items-center gap-1">Avançar <ChevronRight size={10} /></button>
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

                            {/* New Stage Button */}
                            <div className="min-w-[300px] flex-1 flex flex-col items-center justify-center bg-white/50 dark:bg-slate-800/10 p-6 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800 group cursor-pointer hover:border-legal-bronze hover:bg-white dark:hover:bg-slate-800 transition-all snap-center"
                                onClick={() => openStageModal()}>
                                <div className="w-12 h-12 bg-white dark:bg-slate-800 rounded-full flex items-center justify-center text-slate-300 dark:text-slate-600 group-hover:text-legal-bronze group-hover:scale-110 transition-all shadow-sm"><Plus size={24} /></div>
                                <p className="mt-4 text-xs font-bold text-slate-400 group-hover:text-legal-bronze uppercase tracking-widest">Nova Etapa</p>
                            </div>
                        </div>
                    </DragDropContext>
                )}


                {viewMode === 'ImportExport' && (
                    <div className="p-8 space-y-12 animate-in fade-in duration-500 min-h-[500px]">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {/* Card Importação */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-[2.5rem] p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-6 hover:border-legal-navy dark:hover:border-legal-bronze transition-all group">
                                <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform text-legal-navy dark:text-legal-bronze">
                                    <UploadCloud size={40} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Importar Processos</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Selecione um arquivo CSV ou Excel para carregar novos processos em massa.</p>
                                </div>
                                <div className="pt-4">
                                    <input type="file" ref={fileInputRef} onChange={handleImportCSV} className="hidden" accept=".csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        disabled={isProcessing}
                                        className="px-10 py-4 bg-legal-navy dark:bg-legal-bronze text-white rounded-2xl font-bold text-sm shadow-xl shadow-legal-navy/20 dark:shadow-legal-bronze/20 hover:brightness-110 transition-all flex items-center justify-center gap-3 mx-auto"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <FileSpreadsheet size={18} />}
                                        Selecionar Arquivo
                                    </button>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Formatos: .CSV, .XLSX</p>
                            </div>

                            {/* Card Exportação */}
                            <div className="bg-slate-50/50 dark:bg-slate-800/30 rounded-[2.5rem] p-10 border-2 border-dashed border-slate-200 dark:border-slate-800 text-center space-y-6 hover:border-legal-navy dark:hover:border-legal-bronze transition-all group">
                                <div className="w-20 h-20 bg-white dark:bg-slate-700 rounded-[2rem] flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform text-legal-bronze">
                                    <Download size={40} />
                                </div>
                                <div>
                                    <h3 className="text-xl font-black text-slate-900 dark:text-white mb-2">Exportar Acervo</h3>
                                    <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs mx-auto">Baixe toda a sua base de dados processuais para backup ou integração externa.</p>
                                </div>
                                <div className="pt-4">
                                    <button
                                        onClick={handleExportCSV}
                                        disabled={isProcessing}
                                        className="px-10 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 rounded-2xl font-bold text-sm shadow-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition-all flex items-center justify-center gap-3 mx-auto"
                                    >
                                        {isProcessing ? <Loader2 className="animate-spin" size={18} /> : <Database size={18} />}
                                        Gerar Planilha (CSV)
                                    </button>
                                </div>
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total: {processes.length} registros</p>
                            </div>
                        </div>

                        <div className="bg-amber-50 dark:bg-amber-900/10 p-8 rounded-[2rem] border border-amber-100 dark:border-amber-900/30 flex items-start gap-6">
                            <div className="p-3 bg-white dark:bg-amber-900/30 rounded-xl text-amber-600 shrink-0 shadow-sm"><AlertCircle size={24} /></div>
                            <div className="space-y-2">
                                <h4 className="text-amber-800 dark:text-amber-400 font-bold uppercase text-xs tracking-widest">Instruções para Importação</h4>
                                <p className="text-sm text-amber-700 dark:text-amber-500 font-medium leading-relaxed">
                                    Para garantir o sucesso da importação, seu arquivo deve conter as colunas: <strong>Número CNJ, Cliente, Assunto</strong> e <strong>Tribunal</strong>.
                                    Processos duplicados serão identificados automaticamente pelo número CNJ e não serão sobrescritos.
                                </p>
                                <button className="text-[10px] font-black text-amber-600 dark:text-amber-400 hover:underline uppercase">Baixar Modelo Exemplo</button>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* --- MODAIS EXISTENTES --- */}
            {isEditModalOpen && selectedProcess && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsEditModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="bg-legal-navy p-8 text-white relative">
                            <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-legal-bronze rounded-xl flex items-center justify-center text-white shadow-lg"><Edit2 size={24} /></div>
                                <div>
                                    <h3 className="text-2xl font-bold">Editar Processo</h3>
                                    <p className="text-indigo-100">Atualize os dados e movimentações</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleUpdateProcess} className="p-8 grid grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Número do Processo (CNJ)</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white"
                                        value={formData.number}
                                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Cliente</label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        list="clients-list"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white"
                                        value={formData.clientName}
                                        onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                    />
                                    <datalist id="clients-list">
                                        {clients.map(c => <option key={c} value={c} />)}
                                    </datalist>
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Assunto / Objeto</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <textarea
                                        required
                                        rows={3}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-medium text-slate-600 dark:text-slate-300 resize-none"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Tribunal / Vara</label>
                                <div className="relative">
                                    <Gavel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white"
                                        value={formData.court}
                                        onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Status Atual</label>
                                <div className="relative">
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    <select
                                        className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white appearance-none cursor-pointer"
                                        value={formData.status}
                                        onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                                    >
                                        <option value="Active">Em Curso</option>
                                        <option value="Suspended">Suspenso</option>
                                        <option value="Archived">Arquivado</option>
                                    </select>
                                </div>
                            </div>

                            <div className="col-span-2 pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsEditModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-legal-navy text-white rounded-xl font-bold hover:brightness-110 shadow-lg shadow-legal-navy/20 flex items-center justify-center gap-2">
                                    <Save size={20} /> Salvar Alterações
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isCreateModalOpen && (
                <div className="fixed inset-0 z-[130] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsCreateModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95">
                        <div className="bg-legal-navy p-8 text-white relative">
                            <button onClick={() => setIsCreateModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 bg-legal-bronze rounded-xl flex items-center justify-center text-white shadow-lg"><Scale size={24} /></div>
                                <div>
                                    <h3 className="text-2xl font-bold">Novo Processo</h3>
                                    <p className="text-indigo-100">Cadastre um novo caso no acervo</p>
                                </div>
                            </div>
                        </div>

                        <form onSubmit={handleCreateProcess} className="p-8 grid grid-cols-2 gap-6">
                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Número do Processo (CNJ)</label>
                                <div className="relative">
                                    <Hash className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="0000000-00.0000.0.00.0000"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white placeholder:font-normal"
                                        value={formData.number}
                                        onChange={(e) => setFormData({ ...formData, number: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase flex justify-between">
                                    Cliente
                                    {!isAddingNewClient ? (
                                        <button type="button" onClick={() => { setIsAddingNewClient(true); setFormData({ ...formData, clientName: '' }); }} className="text-legal-navy hover:underline flex items-center gap-1"><UserPlus size={10} /> Novo</button>
                                    ) : (
                                        <button type="button" onClick={() => { setIsAddingNewClient(false); setFormData({ ...formData, clientName: '' }); }} className="text-rose-500 hover:underline flex items-center gap-1"><X size={10} /> Cancelar</button>
                                    )}
                                </label>
                                <div className="relative">
                                    <User className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    {isAddingNewClient ? (
                                        <input
                                            type="text"
                                            required
                                            autoFocus
                                            placeholder="Nome do novo cliente"
                                            className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-bronze/20 font-bold text-slate-700 dark:text-white border-legal-bronze"
                                            value={formData.clientName}
                                            onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                        />
                                    ) : (
                                        <>
                                            <input
                                                type="text"
                                                required
                                                list="clients-list-create"
                                                placeholder="Selecione um cliente"
                                                className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white placeholder:font-normal"
                                                value={formData.clientName}
                                                onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
                                            />
                                            <datalist id="clients-list-create">
                                                {clients.map(c => <option key={c} value={c} />)}
                                            </datalist>
                                        </>
                                    )}
                                </div>
                            </div>

                            <div className="col-span-2 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Assunto / Objeto</label>
                                <div className="relative">
                                    <FileText className="absolute left-3 top-3 text-slate-400" size={18} />
                                    <textarea
                                        required
                                        rows={3}
                                        placeholder="Descrição resumida do caso..."
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-medium text-slate-600 dark:text-slate-300 resize-none placeholder:font-normal"
                                        value={formData.subject}
                                        onChange={(e) => setFormData({ ...formData, subject: e.target.value })}
                                    ></textarea>
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Tribunal / Vara</label>
                                <div className="relative">
                                    <Gavel className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                    <input
                                        type="text"
                                        required
                                        placeholder="Ex: 3ª Vara Cível de SP"
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white placeholder:font-normal"
                                        value={formData.court}
                                        onChange={(e) => setFormData({ ...formData, court: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="col-span-2 md:col-span-1 space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Fase Inicial</label>
                                <div className="relative">
                                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" size={18} />
                                    <select
                                        className="w-full pl-4 pr-10 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white appearance-none cursor-pointer"
                                        value={formData.stage}
                                        onChange={(e) => setFormData({ ...formData, stage: e.target.value })}
                                    >
                                        {kanbanStages.map(s => <option key={s.id} value={s.id}>{s.label}</option>)}
                                    </select>
                                </div>
                            </div>

                            <div className="col-span-2 pt-4 flex gap-3">
                                <button type="button" onClick={() => setIsCreateModalOpen(false)} className="flex-1 py-4 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                                <button type="submit" className="flex-1 py-4 bg-legal-navy text-white rounded-xl font-bold hover:brightness-110 shadow-lg shadow-legal-navy/20 flex items-center justify-center gap-2">
                                    <CheckCircle size={20} /> Cadastrar Processo
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {isDeleteModalOpen && selectedProcess && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsDeleteModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-sm overflow-hidden animate-in zoom-in-95 p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-rose-100 dark:bg-rose-900/30 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
                            <Trash2 size={40} />
                        </div>
                        <div>
                            <h3 className="text-2xl font-black text-slate-900 dark:text-white">Excluir Processo?</h3>
                            <p className="text-slate-500 dark:text-slate-400 text-sm mt-2">
                                Tem certeza que deseja remover o processo <strong>{selectedProcess.number}</strong>? Esta ação não pode ser desfeita.
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <button onClick={() => setIsDeleteModalOpen(false)} className="flex-1 py-3 rounded-xl font-bold text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800 transition-colors">Cancelar</button>
                            <button onClick={handleDeleteProcess} className="flex-1 py-3 bg-rose-600 text-white rounded-xl font-bold hover:bg-rose-700 shadow-lg shadow-rose-600/20">Sim, Excluir</button>
                        </div>
                    </div>
                </div>
            )}

            {isStageModalOpen && (
                <div className="fixed inset-0 z-[140] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsStageModalOpen(false)}></div>
                    <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95">
                        <div className="bg-legal-navy p-6 text-white flex justify-between items-center">
                            <h3 className="text-xl font-bold">{selectedStage ? 'Editar Etapa' : 'Nova Etapa Kanban'}</h3>
                            <button onClick={() => setIsStageModalOpen(false)} className="p-1 hover:bg-white/10 rounded-full transition-colors"><X size={20} /></button>
                        </div>
                        <form onSubmit={selectedStage ? handleRenameStage : handleAddStage} className="p-6 space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Nome da Etapa</label>
                                <input
                                    type="text"
                                    required
                                    placeholder="Ex: Execução, Perícia..."
                                    className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-legal-navy/10 font-bold text-slate-700 dark:text-white"
                                    value={stageFormData.label}
                                    onChange={(e) => setStageFormData({ ...stageFormData, label: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-xs font-black text-slate-500 uppercase">Cor da Etiqueta</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {STAGE_COLORS.map(color => (
                                        <div
                                            key={color}
                                            onClick={() => setStageFormData({ ...stageFormData, color })}
                                            className={`h-10 rounded-xl cursor-pointer transition-all ${color} ${stageFormData.color === color ? 'ring-4 ring-offset-2 ring-legal-navy dark:ring-offset-slate-900 scale-105' : 'hover:scale-105 opacity-70 hover:opacity-100'}`}
                                        ></div>
                                    ))}
                                </div>
                            </div>

                            <button type="submit" className="w-full py-4 bg-legal-navy text-white rounded-xl font-bold hover:brightness-110 shadow-lg shadow-legal-navy/20">
                                {selectedStage ? 'Salvar Alterações' : 'Criar Etapa'}
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};
