import React, { useState } from 'react';
import {
    Baby, X, Check, ChevronRight, Sparkles, Plus, Copy,
    Tag, ArrowRight, ShieldCheck, UserX, Play, Eye,
    Stethoscope, Gavel, Users, Briefcase, Star, Lock
} from 'lucide-react';

// ============================================================
// TIPOS
// ============================================================

export interface FlowStep {
    id: string;
    stage: string;
    type: 'message' | 'question' | 'condition' | 'action' | 'end';
    message: string;
    /** Para tipo 'question': opções de resposta */
    options?: {
        number: string;
        label: string;
        tag: string;
        /** Próximo estágio ao escolher esta opção */
        nextStage?: string;
    }[];
    /** Para tipo 'condition': lógica de saída */
    conditions?: {
        tags: string[];
        label: string;
        nextStage: string;
        isQualified?: boolean;
    }[];
    /** Para tipo 'action': lista de ações a executar */
    actions?: string[];
    nextStage?: string;
}

export interface FlowTemplate {
    id: string;
    name: string;
    category: string;
    description: string;
    icon: React.ReactNode;
    color: string;         // Tailwind bg class
    textColor: string;     // Tailwind text class
    trigger: string;       // Palavras-chave que disparam o fluxo
    tags: string[];        // Todas as tags que o fluxo pode criar
    steps: FlowStep[];
    isPremium?: boolean;
}

// ============================================================
// TEMPLATE: SALÁRIO MATERNIDADE — INSS
// ============================================================

export const TEMPLATE_SALARIO_MATERNIDADE: FlowTemplate = {
    id: 'tpl_salario_maternidade',
    name: 'Salário Maternidade — INSS',
    category: 'Previdenciário',
    description: 'Triagem automática para identificar possibilidade de direito ao Salário-Maternidade. Qualifica leads e encaminha apenas casos com potencial para a equipe jurídica.',
    icon: <Baby size={28} />,
    color: 'bg-pink-50 dark:bg-pink-900/20',
    textColor: 'text-pink-600 dark:text-pink-400',
    trigger: 'MATERNIDADE, BEBE, GRAVIDA, LICENCA, INSS, SALARIO',
    tags: [
        'gravida', 'bebe_nasceu', 'gestacao_1_5', 'gestacao_6_9',
        'bebe_menos_1_mes', 'bebe_1_4_meses', 'bebe_mais_4_meses',
        'desempregada', 'empregada', 'mei_autonoma',
        'carencia_ok', 'sem_carencia', 'carencia_desconhecida',
        'potencial_direito_sm', 'nao_qualificado_sm'
    ],
    steps: [
        // ETAPA 1 — BOAS-VINDAS
        {
            id: 'step_1',
            stage: 'Boas-vindas',
            type: 'message',
            message: 'Olá, seja bem-vinda ao atendimento do escritório 👩‍⚖️\n\nVamos fazer uma análise rápida para verificar se você pode receber o salário-maternidade do INSS.\n\nLeva menos de 2 minutos, pode ser?',
            nextStage: 'step_2',
        },
        // ETAPA 2 — SITUAÇÃO ATUAL
        {
            id: 'step_2',
            stage: 'Situação Atual',
            type: 'question',
            message: 'Digite a opção correspondente:\n\n1️⃣ Estou grávida\n2️⃣ Meu bebê já nasceu',
            options: [
                { number: '1', label: 'Estou grávida', tag: 'gravida', nextStage: 'step_3a' },
                { number: '2', label: 'Meu bebê já nasceu', tag: 'bebe_nasceu', nextStage: 'step_3b' },
            ],
        },
        // ETAPA 3A — SE GRÁVIDA
        {
            id: 'step_3a',
            stage: 'Tempo de Gestação',
            type: 'question',
            message: 'Com quantos meses de gestação você está?\n\n1️⃣ Entre 1 e 5 meses\n2️⃣ Entre 6 e 9 meses',
            options: [
                { number: '1', label: 'Entre 1 e 5 meses', tag: 'gestacao_1_5', nextStage: 'step_4' },
                { number: '2', label: 'Entre 6 e 9 meses', tag: 'gestacao_6_9', nextStage: 'step_4' },
            ],
        },
        // ETAPA 3B — SE BEBÊ JÁ NASCEU
        {
            id: 'step_3b',
            stage: 'Tempo do Nascimento',
            type: 'question',
            message: 'Há quanto tempo seu bebê nasceu?\n\n1️⃣ Menos de 1 mês\n2️⃣ Entre 1 e 4 meses\n3️⃣ Mais de 4 meses',
            options: [
                { number: '1', label: 'Menos de 1 mês', tag: 'bebe_menos_1_mes', nextStage: 'step_4' },
                { number: '2', label: 'Entre 1 e 4 meses', tag: 'bebe_1_4_meses', nextStage: 'step_4' },
                { number: '3', label: 'Mais de 4 meses', tag: 'bebe_mais_4_meses', nextStage: 'step_4' },
            ],
        },
        // ETAPA 4 — SITUAÇÃO DE TRABALHO
        {
            id: 'step_4',
            stage: 'Situação de Trabalho',
            type: 'question',
            message: 'No momento você está trabalhando ou desempregada?\n\n1️⃣ Estou desempregada\n2️⃣ Estou trabalhando registrada\n3️⃣ Sou MEI ou autônoma',
            options: [
                { number: '1', label: 'Desempregada', tag: 'desempregada', nextStage: 'step_5' },
                { number: '2', label: 'Trabalhando registrada', tag: 'empregada', nextStage: 'step_5' },
                { number: '3', label: 'MEI ou autônoma', tag: 'mei_autonoma', nextStage: 'step_5' },
            ],
        },
        // ETAPA 5 — CONTRIBUIÇÃO INSS
        {
            id: 'step_5',
            stage: 'Contribuição INSS',
            type: 'question',
            message: 'Você já contribuiu para o INSS por pelo menos 10 meses?\n\n1️⃣ Sim\n2️⃣ Não\n3️⃣ Não sei informar',
            options: [
                { number: '1', label: 'Sim', tag: 'carencia_ok', nextStage: 'step_qualify' },
                { number: '2', label: 'Não', tag: 'sem_carencia', nextStage: 'step_disqualify' },
                { number: '3', label: 'Não sei informar', tag: 'carencia_desconhecida', nextStage: 'step_qualify' },
            ],
        },
        // CONDIÇÃO — QUALIFICAÇÃO
        {
            id: 'step_qualify',
            stage: 'Lead Qualificado',
            type: 'action',
            message: '🎉 Pela sua resposta, existe possibilidade de você ter direito ao salário-maternidade.\n\nVou encaminhar agora seu caso para análise jurídica detalhada.',
            actions: [
                'Criar TAG: potencial_direito_sm',
                'Notificar equipe jurídica interna',
                'Direcionar para atendente humano',
            ],
            nextStage: 'step_end_qualified',
        },
        // ENCERRAMENTO — NÃO QUALIFICADO
        {
            id: 'step_disqualify',
            stage: 'Lead Não Qualificado',
            type: 'action',
            message: 'Neste momento, pelas informações enviadas, pode ser que você ainda não cumpra os requisitos exigidos pelo INSS.\n\nMas podemos reavaliar caso tenha mais informações. Ficamos à disposição.',
            actions: [
                'Criar TAG: nao_qualificado_sm',
                'Encerrar fluxo automaticamente',
            ],
            nextStage: 'step_end_nq',
        },
        // FIM — QUALIFICADO
        {
            id: 'step_end_qualified',
            stage: 'Encaminhado',
            type: 'end',
            message: 'Lead encaminhado para análise jurídica com a TAG potencial_direito_sm.',
        },
        // FIM — NÃO QUALIFICADO
        {
            id: 'step_end_nq',
            stage: 'Encerrado',
            type: 'end',
            message: 'Fluxo encerrado. TAG nao_qualificado_sm aplicada.',
        },
    ],
};

// ============================================================
// OUTROS TEMPLATES (para expansão futura)
// ============================================================

export const FLOW_TEMPLATES: FlowTemplate[] = [
    TEMPLATE_SALARIO_MATERNIDADE,
    {
        id: 'tpl_tea_bpc',
        name: 'TEA (Autismo) — BPC/LOAS',
        category: 'Previdenciário',
        description: 'Triagem para benefício BPC/LOAS para pessoas com TEA. Identifica elegibilidade e encaminha laudo.',
        icon: <Stethoscope size={28} />,
        color: 'bg-purple-50 dark:bg-purple-900/20',
        textColor: 'text-purple-600 dark:text-purple-400',
        trigger: 'TEA, AUTISMO, BPC, LOAS',
        tags: ['tea', 'bpc_loas', 'tem_laudo', 'sem_laudo', 'potencial_bpc', 'nao_qualificado_bpc'],
        steps: [],
        isPremium: false,
    },
    {
        id: 'tpl_trabalhista',
        name: 'Direito Trabalhista',
        category: 'Trabalhista',
        description: 'Rescisão, horas extras, acidente de trabalho ou demissão sem justa causa.',
        icon: <Briefcase size={28} />,
        color: 'bg-amber-50 dark:bg-amber-900/20',
        textColor: 'text-amber-600 dark:text-amber-400',
        trigger: 'TRABALHO, EMPRESA, DEMISSAO, CTPS',
        tags: ['trabalhista', 'demissao', 'rescisao', 'horas_extras', 'acidente_trabalho'],
        steps: [],
        isPremium: true,
    },
    {
        id: 'tpl_consumidor',
        name: 'Defesa do Consumidor',
        category: 'Consumidor',
        description: 'Voo cancelado, nome sujo, problemas com bancos e cobranças indevidas.',
        icon: <Gavel size={28} />,
        color: 'bg-blue-50 dark:bg-blue-900/20',
        textColor: 'text-blue-600 dark:text-blue-400',
        trigger: 'CONSUMIDOR, VOO, SPC, SERASA, BANCO',
        tags: ['consumidor', 'voo_cancelado', 'nome_negativado', 'fraude_bancaria'],
        steps: [],
        isPremium: true,
    },
];

// ============================================================
// COMPONENTE: GALERIA DE TEMPLATES
// ============================================================

interface FlowTemplatesProps {
    onUseTemplate: (template: FlowTemplate) => void;
    onClose: () => void;
}

const StepTypeIcon: React.FC<{ type: FlowStep['type'] }> = ({ type }) => {
    const map = {
        message: { icon: '💬', label: 'Mensagem', color: 'bg-blue-100 text-blue-700' },
        question: { icon: '❓', label: 'Pergunta', color: 'bg-purple-100 text-purple-700' },
        condition: { icon: '🔀', label: 'Condição', color: 'bg-amber-100 text-amber-700' },
        action: { icon: '⚡', label: 'Ação', color: 'bg-emerald-100 text-emerald-700' },
        end: { icon: '🏁', label: 'Fim', color: 'bg-slate-100 text-slate-600' },
    };
    const item = map[type];
    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${item.color}`}>
            {item.icon} {item.label}
        </span>
    );
};

export const FlowTemplates: React.FC<FlowTemplatesProps> = ({ onUseTemplate, onClose }) => {
    const [selected, setSelected] = useState<FlowTemplate | null>(null);
    const [activeStep, setActiveStep] = useState<string | null>(null);

    const preview = selected ?? TEMPLATE_SALARIO_MATERNIDADE;

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-slate-950/85 backdrop-blur-md animate-in fade-in"
                onClick={onClose}
            />

            <div className="relative bg-white dark:bg-slate-950 rounded-[3rem] shadow-2xl w-full max-w-7xl h-[92vh] overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col">

                {/* HEADER */}
                <div className="bg-gradient-to-r from-legal-navy to-legal-navy/90 p-8 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-xl">
                            <Sparkles size={28} />
                        </div>
                        <div>
                            <h2 className="text-3xl font-black">Fluxos Pré-Prontos</h2>
                            <p className="text-white/60 text-sm font-medium mt-0.5">
                                Escolha um template, visualize e use com 1 clique — ou edite do zero.
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-3 hover:bg-white/10 rounded-2xl transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* BODY — 2 colunas */}
                <div className="flex flex-1 overflow-hidden">

                    {/* COLUNA ESQUERDA — Lista de templates */}
                    <div className="w-80 shrink-0 border-r border-slate-100 dark:border-slate-800 overflow-y-auto p-6 space-y-3">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                            {FLOW_TEMPLATES.length} Templates Disponíveis
                        </p>

                        {FLOW_TEMPLATES.map(tpl => (
                            <button
                                key={tpl.id}
                                onClick={() => { setSelected(tpl); setActiveStep(null); }}
                                className={`w-full text-left p-5 rounded-2xl border-2 transition-all group ${(selected?.id ?? TEMPLATE_SALARIO_MATERNIDADE.id) === tpl.id
                                        ? 'border-legal-bronze bg-legal-bronze/5 dark:bg-legal-bronze/10'
                                        : 'border-transparent hover:border-slate-200 dark:hover:border-slate-700 bg-slate-50 dark:bg-slate-900'
                                    }`}
                            >
                                <div className="flex items-center gap-3 mb-2">
                                    <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${tpl.color} ${tpl.textColor}`}>
                                        {tpl.icon}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-1.5">
                                            <p className="font-bold text-slate-800 dark:text-white text-sm truncate">{tpl.name}</p>
                                            {tpl.isPremium && (
                                                <Lock size={11} className="text-legal-bronze shrink-0" />
                                            )}
                                        </div>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase">{tpl.category}</p>
                                    </div>
                                </div>
                                <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-2 leading-relaxed">
                                    {tpl.description}
                                </p>
                                <div className="flex items-center gap-2 mt-3">
                                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full ${tpl.color} ${tpl.textColor}`}>
                                        {tpl.steps.length} etapas
                                    </span>
                                    <span className="text-[9px] font-black text-slate-300 uppercase">
                                        {tpl.tags.length} tags
                                    </span>
                                </div>
                            </button>
                        ))}

                        {/* Criar do zero */}
                        <button
                            onClick={() => onUseTemplate({ ...TEMPLATE_SALARIO_MATERNIDADE, id: `custom_${Date.now()}`, name: 'Novo Fluxo Personalizado', steps: [], tags: [], trigger: '' })}
                            className="w-full text-left p-5 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 hover:border-legal-navy/40 transition-all group"
                        >
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:bg-legal-navy/10 group-hover:text-legal-navy dark:group-hover:text-legal-bronze transition-colors">
                                    <Plus size={20} />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-600 dark:text-slate-300 text-sm">Criar do Zero</p>
                                    <p className="text-[10px] text-slate-400">Fluxo completamente personalizado</p>
                                </div>
                            </div>
                        </button>
                    </div>

                    {/* COLUNA DIREITA — Preview detalhado */}
                    <div className="flex-1 overflow-y-auto">

                        {/* Header do preview */}
                        <div className={`p-8 border-b border-slate-100 dark:border-slate-800 ${preview.color}`}>
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex items-center gap-5">
                                    <div className={`w-16 h-16 rounded-2xl flex items-center justify-center shadow-lg ${preview.color} ${preview.textColor} border border-white/50`}>
                                        {preview.icon}
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2 mb-1">
                                            <h3 className="text-2xl font-black text-slate-800 dark:text-white">{preview.name}</h3>
                                            {preview.isPremium && (
                                                <span className="px-2 py-0.5 bg-legal-bronze text-white text-[10px] font-black rounded-full uppercase">Premium</span>
                                            )}
                                        </div>
                                        <p className="text-slate-600 dark:text-slate-400 text-sm max-w-xl leading-relaxed">
                                            {preview.description}
                                        </p>
                                        <div className="flex items-center gap-3 mt-3 text-[10px] font-black text-slate-400 uppercase">
                                            <span>🎯 Gatilho: <span className="text-slate-600 dark:text-slate-300">{preview.trigger || 'não definido'}</span></span>
                                            <span>· {preview.steps.filter(s => s.type !== 'end').length} etapas</span>
                                            <span>· {preview.tags.length} tags automáticas</span>
                                        </div>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2 shrink-0">
                                    <button
                                        onClick={() => onUseTemplate(preview)}
                                        disabled={preview.isPremium}
                                        className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm transition-all shadow-lg ${preview.isPremium
                                                ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                : 'bg-legal-navy text-white hover:brightness-110 shadow-legal-navy/20'
                                            }`}
                                    >
                                        {preview.isPremium ? <Lock size={16} /> : <Copy size={16} />}
                                        {preview.isPremium ? 'Plano Superior' : 'Usar Este Template'}
                                    </button>
                                    {!preview.isPremium && (
                                        <button
                                            onClick={() => onUseTemplate({ ...preview, name: `${preview.name} (Personalizado)` })}
                                            className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
                                        >
                                            <Play size={16} /> Usar e Editar
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Tags automáticas */}
                        {preview.tags.length > 0 && (
                            <div className="px-8 py-5 border-b border-slate-100 dark:border-slate-800">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                                    <Tag size={12} /> Tags Criadas Automaticamente pelo Fluxo
                                </p>
                                <div className="flex flex-wrap gap-1.5">
                                    {preview.tags.map(tag => (
                                        <span
                                            key={tag}
                                            className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-full text-[10px] font-bold border border-slate-200 dark:border-slate-700"
                                        >
                                            #{tag}
                                        </span>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Fluxo visual passo a passo */}
                        {preview.steps.length > 0 ? (
                            <div className="p-8 space-y-3">
                                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">
                                    Visualização do Fluxo Completo
                                </p>

                                {preview.steps.map((step, idx) => (
                                    <div key={step.id}>
                                        <button
                                            onClick={() => setActiveStep(activeStep === step.id ? null : step.id)}
                                            className={`w-full text-left p-5 rounded-2xl border-2 transition-all ${activeStep === step.id
                                                    ? 'border-legal-navy/30 bg-legal-navy/3 dark:bg-legal-navy/10'
                                                    : 'border-slate-100 dark:border-slate-800 hover:border-slate-200 dark:hover:border-slate-700 bg-white dark:bg-slate-900'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                {/* Número */}
                                                <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-sm font-black shrink-0 ${step.type === 'end'
                                                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-400'
                                                        : step.type === 'action'
                                                            ? (step.actions?.some(a => a.includes('Encerrar')) ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-700')
                                                            : 'bg-legal-navy/10 text-legal-navy dark:bg-legal-bronze/10 dark:text-legal-bronze'
                                                    }`}>
                                                    {step.type === 'end' ? '⊘' : idx + 1}
                                                </div>

                                                {/* Info */}
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <p className="font-bold text-slate-800 dark:text-white text-sm">{step.stage}</p>
                                                        <StepTypeIcon type={step.type} />
                                                    </div>
                                                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1">
                                                        {step.message.split('\n')[0]}
                                                    </p>
                                                </div>

                                                {/* Setas condicionais */}
                                                {step.options && (
                                                    <div className="flex items-center gap-1 text-[10px] font-black text-slate-300">
                                                        <ArrowRight size={14} />
                                                        {step.options.length} opções
                                                    </div>
                                                )}
                                                {step.actions && (
                                                    <div className={`flex items-center gap-1 text-[10px] font-black ${step.actions.some(a => a.includes('Encerrar')) ? 'text-rose-400' : 'text-emerald-500'}`}>
                                                        {step.actions.some(a => a.includes('Encerrar')) ? <UserX size={14} /> : <ShieldCheck size={14} />}
                                                        {step.actions.some(a => a.includes('Encerrar')) ? 'Encerra' : 'Qualificado'}
                                                    </div>
                                                )}

                                                <ChevronRight
                                                    size={18}
                                                    className={`text-slate-300 transition-transform ${activeStep === step.id ? 'rotate-90' : ''}`}
                                                />
                                            </div>

                                            {/* DETALHES EXPANDIDOS */}
                                            {activeStep === step.id && (
                                                <div className="mt-5 space-y-4 animate-in slide-in-from-top-2 duration-200">
                                                    {/* Mensagem completa */}
                                                    <div className="bg-slate-50 dark:bg-slate-800 rounded-2xl p-4 border border-slate-100 dark:border-slate-700">
                                                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">💬 Mensagem</p>
                                                        <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed">
                                                            {step.message}
                                                        </p>
                                                    </div>

                                                    {/* Opções de resposta */}
                                                    {step.options && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">❓ Opções e Tags Geradas</p>
                                                            {step.options.map(opt => (
                                                                <div
                                                                    key={opt.number}
                                                                    className="flex items-center gap-3 p-3 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800"
                                                                >
                                                                    <span className="w-7 h-7 bg-legal-navy text-white rounded-lg text-xs font-black flex items-center justify-center shrink-0">
                                                                        {opt.number}
                                                                    </span>
                                                                    <span className="flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                                                                        {opt.label}
                                                                    </span>
                                                                    <span className="text-[10px] font-black text-legal-bronze bg-legal-bronze/10 px-2 py-0.5 rounded-full">
                                                                        #{opt.tag}
                                                                    </span>
                                                                    {opt.nextStage && (
                                                                        <span className="text-[10px] text-slate-400 flex items-center gap-1">
                                                                            <ArrowRight size={10} /> {preview.steps.find(s => s.id === opt.nextStage)?.stage ?? opt.nextStage}
                                                                        </span>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}

                                                    {/* Ações automáticas */}
                                                    {step.actions && (
                                                        <div className="space-y-2">
                                                            <p className="text-[10px] font-black text-slate-400 uppercase">⚡ Ações Automáticas</p>
                                                            {step.actions.map((action, i) => (
                                                                <div key={i} className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
                                                                    <Check size={14} className="text-emerald-500 shrink-0" />
                                                                    {action}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </button>

                                        {/* Conector visual entre etapas */}
                                        {idx < preview.steps.length - 1 && (
                                            <div className="flex justify-center my-1">
                                                <div className="w-0.5 h-4 bg-slate-200 dark:bg-slate-700" />
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        ) : (
                            /* Template vazio (em breve) */
                            <div className="flex-1 flex items-center justify-center p-16">
                                <div className="text-center space-y-4 opacity-50">
                                    <Lock size={48} className="mx-auto text-slate-300" />
                                    <div>
                                        <p className="text-xl font-bold text-slate-500">Template Premium</p>
                                        <p className="text-sm text-slate-400 mt-1">Disponível nos planos Professional e Enterprise</p>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};
