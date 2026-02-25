
import React, { useState, useEffect, useMemo } from 'react';
import {
  Plus, Zap, CheckCircle2, X, Trash2, Save, Check, BrainCircuit,
  MessageSquareText, Clock, Calendar, ArrowRight, BarChart, TrendingUp,
  Target, Rocket, Send, ChevronRight, Edit2, Tag, ListTodo, ArrowUpRight,
  Gavel, ShieldQuestion, Stethoscope, Baby, User as UserIcon, Info,
  Users, AlertTriangle, FileSignature, CalendarX, Filter, Search,
  Settings2, Database, History, MessageCircle, FilterX, ShieldCheck,
  Image as ImageIcon, FileText, Mic, Play, Pause, ArrowDown, Layers,
  ChevronDown, GripVertical, Terminal, AlertCircle, Share2,
  MousePointer2, Timer, MailCheck, Eye, Smartphone, MoreHorizontal,
  LayoutDashboard, Megaphone, UploadCloud, Music, Power, PowerOff,
  AlarmClock, BellRing, MessageSquare, Sparkles, LayoutTemplate
} from 'lucide-react';
import { FlowTemplates, FLOW_TEMPLATES } from './FlowTemplates.tsx';
import type { FlowTemplate } from './FlowTemplates.tsx';

type BlockType = 'text' | 'wait' | 'image' | 'file' | 'audio' | 'menu';

interface FlowBlock {
  id: string;
  type: BlockType;
  content: string;
  metadata?: any;
}

interface AutomationFlow {
  id: string;
  name: string;
  description: string;
  trigger: string;
  blocks: FlowBlock[];
  active: boolean;
}

interface FollowUpRule {
  id: string;
  name: string;
  sector: string;
  delayValue: number;
  delayUnit: 'hours' | 'days';
  message: string;
  active: boolean;
  targetTags: string[];
  stats: {
    sent: number;
    replied: number;
  };
}

interface BroadcastCampaign {
  id: string;
  name: string;
  status: 'Draft' | 'Sending' | 'Completed' | 'Scheduled' | 'Failed';
  sentCount: number;
  totalCount: number;
  date: string;
  message: string;
  targetSectors: string[];
  targetTags: string[];
  sendType: 'immediate' | 'scheduled';
  scheduledAt?: string;
  mediaUrl?: string;
}

type AutomationTab = 'broadcaster' | 'flows' | 'followups';

const SECTORS = ['Comercial', 'Triagem Jurídica', 'Documentação', 'Jurídico Técnico', 'Protocolo', 'Acompanhamento', 'Financeiro'];
const TAGS = ['Novo Lead', 'Urgente', 'Aguardando Doc', 'Sentença', 'Recurso', 'Finalizado', 'Prioridade', 'Salário Maternidade', 'TEA (Autismo)', 'Consumidor', 'Trabalhista'];

export const Automation: React.FC = () => {
  const [activeTab, setActiveTab] = useState<AutomationTab>('broadcaster');
  const [showToast, setShowToast] = useState<string | null>(null);
  const [isTemplatesOpen, setIsTemplatesOpen] = useState(false);

  // --- PERSISTENCE ---
  const load = (key: string, fallback: any) => {
    const s = localStorage.getItem(key);
    return s ? JSON.parse(s) : fallback;
  };
  const save = (key: string, d: any) => localStorage.setItem(key, JSON.stringify(d));

  const PRE_BUILT_FLOWS: AutomationFlow[] = [
    {
      id: 'f1_mat',
      name: 'Salário Maternidade',
      description: 'Triagem inicial para mães interessadas em benefícios de Salário Maternidade.',
      trigger: 'MATERNIDADE, BEBE, GRAVIDA, LICENCA',
      active: true,
      blocks: [
        { id: 'b1', type: 'text', content: 'Olá! Sou a assistente virtual da LexHub especializada em Direitos Previdenciários.' },
        { id: 'b2', type: 'wait', content: '2', metadata: { duration: 2 } },
        { id: 'b3', type: 'text', content: 'Vi que você tem interesse no Salário Maternidade. O processo é rápido e seguro conosco.' },
        {
          id: 'b4', type: 'menu', content: 'Qual a sua situação atual?',
          metadata: {
            options: [
              { id: 'opt1', label: 'Estou Gestante', targetTag: 'Salário Maternidade', reply: 'Excelente! Vamos iniciar a análise de documentos.' },
              { id: 'opt2', label: 'Bebê já nasceu', targetTag: 'Salário Maternidade', reply: 'Maravilha! Vamos solicitar a Certidão para avaliar.' },
              { id: 'opt3', label: 'Falar com Atendente', targetTag: 'Atendimento Humano', reply: 'Ok, transferindo para nosso(a) consultor(a)...' }
            ]
          }
        }
      ]
    },
    {
      id: 'f2_tea',
      name: 'TEA (Autismo) - BPC/LOAS',
      description: 'Atendimento inicial para leads buscando benefícios assistenciais e laudos TEA.',
      trigger: 'TEA, AUTISMO, BPC, LOAS',
      active: true,
      blocks: [
        { id: 'b1', type: 'text', content: 'Olá, me chamo Ana. Aqui na LexHub somos especialistas em assegurar os direitos do Autista (TEA).' },
        { id: 'b2', type: 'wait', content: '2', metadata: { duration: 2 } },
        {
          id: 'b3', type: 'menu', content: 'Como posso te direcionar da melhor forma?',
          metadata: {
            options: [
              { id: 'opt1', label: 'Benefício BPC/LOAS', targetTag: 'TEA (Autismo)', reply: 'Vamos avaliar a elegibilidade e requisitos para o BPC.' },
              { id: 'opt2', label: 'Direitos na Escola', targetTag: 'TEA (Autismo)', reply: 'Certo, a educação inclusiva é direito garantido!' },
              { id: 'opt3', label: 'Convênio Médico', targetTag: 'TEA (Autismo)', reply: 'Iremos analisar as negativas do seu plano de saúde.' }
            ]
          }
        }
      ]
    },
    {
      id: 'f3_con',
      name: 'Defesa do Consumidor',
      description: 'Fluxo para problemas com voos, bancos, cobranças indevidas e inclusão no SPC/Serasa.',
      trigger: 'CONSUMIDOR, VOO, BANCO, NOME SUJO',
      active: true,
      blocks: [
        { id: 'b1', type: 'text', content: 'Seja bem-vindo(a)! Se os seus direitos como consumidor foram violados, você está no lugar certo.' },
        { id: 'b2', type: 'wait', content: '2', metadata: { duration: 2 } },
        {
          id: 'b3', type: 'menu', content: 'Selecione abaixo o serviço principal que você procura:',
          metadata: {
            options: [
              { id: 'opt1', label: 'Voo Cancelado/Atraso', targetTag: 'Consumidor', reply: 'Precisaremos dos comprovantes de passagens e gastos extras.' },
              { id: 'opt2', label: 'Nome Negativado', targetTag: 'Consumidor', reply: 'Cobrança indevida gera dano moral. Vamos investigar!' },
              { id: 'opt3', label: 'Problemas com Bancos', targetTag: 'Consumidor', reply: 'Entendi. Fraudes ou empréstimos não reconhecidos?' }
            ]
          }
        }
      ]
    },
    {
      id: 'f4_tra',
      name: 'Direito Trabalhista',
      description: 'Rescisão, horas extras, acidente de trabalho ou demissão sem justa causa.',
      trigger: 'TRABALHO, EMPRESA, DEMISSAO, JUSTA CAUSA',
      active: true,
      blocks: [
        { id: 'b1', type: 'text', content: 'Olá! Sou especialista em Direitos do Trabalhador na LexHub.' },
        { id: 'b2', type: 'wait', content: '2', metadata: { duration: 2 } },
        {
          id: 'b3', type: 'menu', content: 'Qual problema ocorreu com seu empregador?',
          metadata: {
            options: [
              { id: 'opt1', label: 'Demissão S/ Justa Causa', targetTag: 'Trabalhista', reply: 'Vamos conferir se as verbas foram pagas corretamente.' },
              { id: 'opt2', label: 'Horas Extras/Assédio', targetTag: 'Trabalhista', reply: 'Certo, isso é grave. Precisa de testemunhas?' },
              { id: 'opt3', label: 'Não tem Carteira Assinada', targetTag: 'Trabalhista', reply: 'Iremos buscar o reconhecimento do vínculo.' }
            ]
          }
        }
      ]
    }
  ];

  const [flows, setFlows] = useState<AutomationFlow[]>(() => load('lex_flows', PRE_BUILT_FLOWS));

  const [broadcasts, setBroadcasts] = useState<BroadcastCampaign[]>(() => load('lex_broadcasts', [
    {
      id: 'b1',
      name: 'Informativo Mensal de Prazos',
      status: 'Completed',
      sentCount: 1240,
      totalCount: 1240,
      date: '12/05/2024',
      message: 'Olá, informamos que seus prazos estão sendo monitorados conforme o planejado.',
      targetTags: ['Prioridade'],
      targetSectors: [],
      sendType: 'immediate'
    }
  ]));

  const [followUpRules, setFollowUpRules] = useState<FollowUpRule[]>(() => load('lex_followups', [
    {
      id: 'fu1',
      name: 'Follow-up de Boas-vindas (3 dias)',
      sector: 'Comercial',
      delayValue: 3,
      delayUnit: 'days',
      message: 'Olá! Vimos que você ainda não enviou os documentos. Podemos ajudar em algo?',
      active: true,
      targetTags: ['Novo Lead'],
      stats: { sent: 142, replied: 85 }
    },
    {
      id: 'fu2',
      name: 'Lembrete de Sentença (7 dias)',
      sector: 'Acompanhamento',
      delayValue: 7,
      delayUnit: 'days',
      message: 'Olá! Passando para informar que estamos aguardando a publicação do acórdão. Alguma dúvida?',
      active: true,
      targetTags: ['Sentença'],
      stats: { sent: 56, replied: 12 }
    }
  ]));

  useEffect(() => save('lex_flows', flows), [flows]);
  useEffect(() => save('lex_broadcasts', broadcasts), [broadcasts]);
  useEffect(() => save('lex_followups', followUpRules), [followUpRules]);

  // --- MODALS STATES ---
  const [isFlowEditorOpen, setIsFlowEditorOpen] = useState(false);
  const [isCampaignModalOpen, setIsCampaignModalOpen] = useState(false);
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);

  // --- EDITING STATES ---
  const [editingId, setEditingId] = useState<string | null>(null);
  const [campaignForm, setCampaignForm] = useState<Partial<BroadcastCampaign>>({
    name: '', message: '', targetSectors: [], targetTags: [], sendType: 'immediate', scheduledAt: ''
  });

  const [flowForm, setFlowForm] = useState<Partial<AutomationFlow>>({
    name: '', trigger: '', description: '', blocks: []
  });

  const [followUpForm, setFollowUpForm] = useState<Partial<FollowUpRule>>({
    name: '', sector: 'Comercial', delayValue: 3, delayUnit: 'days', message: '', targetTags: [], stats: { sent: 0, replied: 0 }
  });

  // --- SIMULATOR STATE ---
  const [isSimulating, setIsSimulating] = useState(false);
  const [simIndex, setSimIndex] = useState(-1);
  const [simMessages, setSimMessages] = useState<any[]>([]);
  const [simTyping, setSimTyping] = useState(false);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  // --- HANDLERS: FOLLOW-UPS ---
  const openFollowUpModal = (rule?: FollowUpRule) => {
    if (rule) {
      setEditingId(rule.id);
      setFollowUpForm({ ...rule });
    } else {
      setEditingId(null);
      setFollowUpForm({
        name: '', sector: SECTORS[0], delayValue: 3, delayUnit: 'days', message: '', targetTags: [], stats: { sent: 0, replied: 0 }
      });
    }
    setIsFollowUpModalOpen(true);
  };

  const handleSaveFollowUp = (e: React.FormEvent) => {
    e.preventDefault();
    const finalRule: FollowUpRule = {
      id: editingId || `fu_${Date.now()}`,
      name: followUpForm.name || 'Nova Régua SLA',
      sector: followUpForm.sector || SECTORS[0],
      delayValue: followUpForm.delayValue || 3,
      delayUnit: followUpForm.delayUnit || 'days',
      message: followUpForm.message || '',
      active: editingId ? (followUpRules.find(r => r.id === editingId)?.active ?? true) : true,
      targetTags: followUpForm.targetTags || [],
      stats: followUpForm.stats || { sent: 0, replied: 0 }
    };

    if (editingId) {
      setFollowUpRules(followUpRules.map(r => r.id === editingId ? finalRule : r));
      setShowToast('Régua atualizada!');
    } else {
      setFollowUpRules([finalRule, ...followUpRules]);
      setShowToast('Régua de Follow-up criada!');
    }
    setIsFollowUpModalOpen(false);
  };

  const toggleFollowUpStatus = (id: string) => {
    setFollowUpRules(prev => prev.map(r => {
      if (r.id === id) {
        const newState = !r.active;
        setShowToast(`SLA "${r.name}" ${newState ? 'ativado' : 'pausado'}.`);
        return { ...r, active: newState };
      }
      return r;
    }));
  };

  // --- HANDLERS: BROADCASTER ---
  const openCampaignModal = (campaign?: BroadcastCampaign) => {
    if (campaign) {
      setEditingId(campaign.id);
      setCampaignForm({ ...campaign });
    } else {
      setEditingId(null);
      setCampaignForm({
        name: '', message: '', targetSectors: [], targetTags: [], sendType: 'immediate',
        scheduledAt: new Date().toISOString().slice(0, 16)
      });
    }
    setIsCampaignModalOpen(true);
  };

  const handleSaveCampaign = (e: React.FormEvent) => {
    e.preventDefault();
    const isImmediate = campaignForm.sendType === 'immediate';
    const newC: BroadcastCampaign = {
      id: editingId || `b_${Date.now()}`,
      name: campaignForm.name || 'Nova Campanha',
      status: editingId ? (broadcasts.find(b => b.id === editingId)?.status || 'Scheduled') : (isImmediate ? 'Sending' : 'Scheduled'),
      sentCount: editingId ? (broadcasts.find(b => b.id === editingId)?.sentCount || 0) : 0,
      totalCount: editingId ? (broadcasts.find(b => b.id === editingId)?.totalCount || 0) : Math.floor(Math.random() * 500) + 200,
      date: isImmediate ? 'Hoje' : new Date(campaignForm.scheduledAt || '').toLocaleDateString(),
      message: campaignForm.message || '',
      targetSectors: campaignForm.targetSectors || [],
      targetTags: campaignForm.targetTags || [],
      sendType: campaignForm.sendType || 'immediate',
      scheduledAt: campaignForm.scheduledAt
    };

    if (editingId) {
      setBroadcasts(broadcasts.map(b => b.id === editingId ? newC : b));
      setShowToast('Campanha atualizada com sucesso!');
    } else {
      setBroadcasts([newC, ...broadcasts]);
      setShowToast(isImmediate ? 'Disparo iniciado com sucesso!' : 'Agendamento confirmado!');
      if (isImmediate) {
        setTimeout(() => {
          setBroadcasts(prev => prev.map(b => b.id === newC.id ? { ...b, status: 'Completed', sentCount: b.totalCount } : b));
        }, 4000);
      }
    }
    setIsCampaignModalOpen(false);
  };

  // --- HANDLERS: FLOWS BUILDER ---
  const openFlowEditor = (flow?: AutomationFlow) => {
    if (flow) {
      setEditingId(flow.id);
      setFlowForm({ ...flow });
    } else {
      setEditingId(null);
      setFlowForm({
        name: '', trigger: '', description: '',
        blocks: [{ id: `b_${Date.now()}`, type: 'text', content: 'Olá! Como posso ajudar?' }]
      });
    }
    setIsFlowEditorOpen(true);
    setIsSimulating(false);
  };

  const addBlockToFlow = (type: BlockType) => {
    const newBlock: FlowBlock = {
      id: `b_${Date.now()}`,
      type,
      content: '',
      metadata: type === 'wait' ? { duration: 5 } : (type === 'audio' ? { recordingTime: 5 } : {})
    };
    setFlowForm(prev => ({ ...prev, blocks: [...(prev.blocks || []), newBlock] }));
  };

  const removeBlockFromFlow = (id: string) => {
    setFlowForm(prev => ({ ...prev, blocks: prev.blocks?.filter(b => b.id !== id) }));
  };

  const updateBlockContent = (id: string, content: string) => {
    setFlowForm(prev => ({
      ...prev,
      blocks: prev.blocks?.map(b => b.id === id ? { ...b, content } : b)
    }));
  };

  const handleSaveFlow = (e: React.FormEvent) => {
    e.preventDefault();
    const finalFlow: AutomationFlow = {
      id: editingId || `f_${Date.now()}`,
      name: flowForm.name || 'Sem nome',
      description: flowForm.description || '',
      trigger: flowForm.trigger || '',
      blocks: flowForm.blocks || [],
      active: true
    };

    if (editingId) {
      setFlows(flows.map(f => f.id === editingId ? finalFlow : f));
      setShowToast('Fluxo atualizado!');
    } else {
      setFlows([finalFlow, ...flows]);
      setShowToast('Novo fluxo criado!');
    }
    setIsFlowEditorOpen(false);
  };

  // Converte um FlowTemplate (sistema de steps rico) para AutomationFlow (builder de blocos)
  const handleUseTemplate = (template: FlowTemplate) => {
    setIsTemplatesOpen(false);
    // Converte os steps do template em blocos editáveis
    const blocks: FlowBlock[] = template.steps
      .filter(s => s.type !== 'end')
      .flatMap(step => {
        const msgs: FlowBlock[] = [];
        msgs.push({ id: `b_${Date.now()}_${step.id}`, type: 'text', content: step.message });
        if (step.options && step.options.length > 0) {
          msgs.push({
            id: `menu_${Date.now()}_${step.id}`,
            type: 'menu',
            content: step.message.split('\n')[0],
            metadata: {
              options: step.options.map((opt, i) => ({
                id: `opt_${i}`,
                label: opt.label,
                targetTag: opt.tag,
                reply: `Entendido! TAG [${opt.tag}] aplicada.`
              }))
            }
          });
        }
        if (step.actions && step.actions.length > 0) {
          msgs.push({
            id: `act_${Date.now()}_${step.id}`,
            type: 'text',
            content: `[AÇÃO AUTOMÁTICA]\n${step.actions.join('\n')}`,
          });
        }
        return msgs;
      });

    const newFlow: AutomationFlow = {
      id: `f_${Date.now()}`,
      name: template.name,
      description: template.description,
      trigger: template.trigger,
      blocks: blocks.length > 0 ? blocks : [{ id: `b_${Date.now()}`, type: 'text', content: 'Olá! Como posso ajudar?' }],
      active: true,
    };
    setEditingId(null);
    setFlowForm(newFlow);
    setIsFlowEditorOpen(true);
    setShowToast(`Template "${template.name}" carregado! Edite e salve.`);
  };

  const toggleFlowStatus = (id: string) => {
    setFlows(prev => prev.map(f => {
      if (f.id === id) {
        const newState = !f.active;
        setShowToast(`Fluxo "${f.name}" ${newState ? 'ativado' : 'pausado'}.`);
        return { ...f, active: newState };
      }
      return f;
    }));
  };

  // --- SIMULATOR LOGIC ---
  const startSimulation = () => {
    if (!flowForm.blocks || flowForm.blocks.length === 0) return;
    setIsSimulating(true);
    setSimMessages([]);
    setSimIndex(0);
    processSimBlock(0);
  };

  const processSimBlock = (index: number) => {
    const block = flowForm.blocks![index];
    if (!block) {
      setIsSimulating(false);
      return;
    }

    if (block.type === 'wait') {
      const waitTime = (Number(block.content) || block.metadata?.duration || 5) * 1000;
      setTimeout(() => {
        setSimIndex(index + 1);
        processSimBlock(index + 1);
      }, waitTime);
    } else {
      setSimTyping(true);
      const typeTime = block.type === 'audio' ? 3000 : 1500;
      setTimeout(() => {
        setSimMessages(prev => [...prev, { ...block, fromMe: false }]);
        setSimTyping(false);
        setSimIndex(index + 1);
        processSimBlock(index + 1);
      }, typeTime);
    }
  };

  const toggleList = (list: string[], item: string) => {
    return list.includes(item) ? list.filter(i => i !== item) : [...list, item];
  };

  // --- SLA DASHBOARD CALCULATIONS ---
  const slaMetrics = useMemo(() => {
    const totalSent = followUpRules.reduce((acc, r) => acc + (r.stats?.sent || 0), 0);
    const totalReplied = followUpRules.reduce((acc, r) => acc + (r.stats?.replied || 0), 0);
    const conversionRate = totalSent > 0 ? ((totalReplied / totalSent) * 100).toFixed(1) : '0';

    return { totalSent, totalReplied, conversionRate };
  }, [followUpRules]);

  return (
    <div className="space-y-8 animate-in fade-in duration-700 pb-20 relative">
      {showToast && (
        <div className="fixed top-24 right-8 z-[260] px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <CheckCircle2 size={20} /> <p className="font-bold text-sm">{showToast}</p>
        </div>
      )}

      {/* MODAL — GALERIA DE TEMPLATES PRÉ-PRONTOS */}
      {isTemplatesOpen && (
        <FlowTemplates
          onUseTemplate={handleUseTemplate}
          onClose={() => setIsTemplatesOpen(false)}
        />
      )}

      {/* Header & Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-4xl font-black text-legal-navy dark:text-white tracking-tight">Automação <span className="text-legal-bronze">CRM</span></h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Gestão de disparos, fluxos por blocos e réguas de follow-up (SLA).</p>
        </div>

        <div className="flex bg-white dark:bg-slate-900 p-1 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-x-auto max-w-full">
          {[
            { id: 'broadcaster', label: 'Dashboard de Disparos' },
            { id: 'flows', label: 'Fluxos Automáticos' },
            { id: 'followups', label: 'Réguas SLA' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as AutomationTab)}
              className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === tab.id ? 'bg-legal-navy text-white shadow-lg' : 'text-slate-400 hover:text-slate-600 dark:text-slate-500'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* VIEW: BROADCASTER (CAMPAIGNS) */}
      {activeTab === 'broadcaster' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-6 duration-500">

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-blue-50 dark:bg-blue-900/20 rounded-xl flex items-center justify-center text-blue-600 mb-4"><Megaphone size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total Enviado</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{broadcasts.reduce((acc, b) => acc + b.sentCount, 0).toLocaleString()}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-amber-50 dark:bg-amber-900/20 rounded-xl flex items-center justify-center text-amber-600 mb-4"><Timer size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Agendados</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">{broadcasts.filter(b => b.status === 'Scheduled').length}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 mb-4"><CheckCircle2 size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Sucesso Entrega</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">99.8%</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-rose-50 dark:bg-rose-900/20 rounded-xl flex items-center justify-center text-rose-600 mb-4"><Target size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Alcance Médio</p>
              <p className="text-2xl font-black text-slate-900 dark:text-white">~ 420</p>
            </div>
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden p-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
              <div>
                <h3 className="text-2xl font-black text-slate-900 dark:text-white">Gestão de Campanhas</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-medium">Controle total sobre disparos imediatos e programados.</p>
              </div>
              <button
                onClick={() => openCampaignModal()}
                className="flex items-center gap-2 px-8 py-4 bg-legal-navy text-white rounded-2xl font-bold hover:brightness-110 transition-all shadow-xl shadow-legal-navy/20"
              >
                <Plus size={20} /> Nova Campanha
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {broadcasts.map(b => (
                <div key={b.id} className="bg-slate-50/50 dark:bg-slate-800/30 p-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col md:flex-row items-center justify-between gap-6 group hover:bg-white dark:hover:bg-slate-800 hover:shadow-lg transition-all border-l-4" style={{ borderLeftColor: b.status === 'Completed' ? '#10b981' : b.status === 'Scheduled' ? '#f59e0b' : '#3b82f6' }}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3 mb-2">
                      <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${b.status === 'Completed' ? 'bg-emerald-500' : b.status === 'Scheduled' ? 'bg-amber-500' : 'bg-blue-500 animate-pulse'}`}>
                        {b.status === 'Completed' ? 'Enviado' : b.status === 'Scheduled' ? 'Agendado' : 'Processando'}
                      </span>
                      <p className="text-[10px] font-bold text-slate-400 uppercase flex items-center gap-1">
                        <Calendar size={12} /> {b.date}
                      </p>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 dark:text-white truncate">{b.name}</h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 line-clamp-1 italic">"{b.message}"</p>
                  </div>

                  <div className="w-full md:w-64 space-y-2">
                    <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase">
                      <span>Progresso</span>
                      <span>{b.sentCount} / {b.totalCount}</span>
                    </div>
                    <div className="h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
                      <div className={`h-full transition-all duration-1000 ${b.status === 'Completed' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${(b.sentCount / b.totalCount) * 100}%` }}></div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button onClick={() => openCampaignModal(b)} className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-legal-navy dark:hover:text-legal-bronze border border-slate-100 dark:border-slate-700 rounded-xl transition-all shadow-sm">
                      <Edit2 size={18} />
                    </button>
                    <button onClick={() => setBroadcasts(broadcasts.filter(item => item.id !== b.id))} className="p-3 bg-white dark:bg-slate-900 text-slate-400 hover:text-rose-500 border border-slate-100 dark:border-slate-700 rounded-xl transition-all shadow-sm">
                      <Trash2 size={18} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* VIEW: FLOWS (BUILDER) */}
      {activeTab === 'flows' && (
        <div className="space-y-8 animate-in slide-in-from-left duration-500">
          <div className="bg-legal-navy rounded-[3rem] p-10 text-white relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 p-12 opacity-10 rotate-12 scale-150"><BrainCircuit size={200} /></div>
            <div className="relative z-10 max-w-2xl">
              <h2 className="text-3xl font-black mb-4">Construtor de <span className="text-legal-bronze">Fluxos Inteligentes</span></h2>
              <p className="text-white/60 text-lg leading-relaxed">Crie árvores de conversa complexas com envio de áudios simulados, fotos e documentos PDF.</p>
              <div className="flex gap-4 mt-8">
                <button onClick={() => setIsTemplatesOpen(true)} className="px-8 py-4 bg-legal-bronze text-white rounded-2xl font-bold flex items-center gap-3 hover:brightness-110 transition-all shadow-xl">
                  <LayoutTemplate size={20} /> Usar Fluxo Pré-Pronto
                </button>
                <button onClick={() => openFlowEditor()} className="px-8 py-4 bg-white/10 text-white border border-white/20 rounded-2xl font-bold flex items-center gap-3 hover:bg-white/20 transition-all">
                  <Plus size={20} /> Criar do Zero
                </button>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {flows.map(f => (
              <div key={f.id} className={`bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 shadow-sm hover:border-legal-bronze transition-all flex flex-col justify-between group ${!f.active ? 'opacity-70' : ''}`}>
                <div>
                  <div className="flex justify-between items-start mb-6">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors ${f.active ? 'bg-slate-50 dark:bg-slate-800 text-legal-navy dark:text-legal-bronze' : 'bg-slate-100 dark:bg-slate-800 text-slate-300'}`}>
                      <Zap size={24} />
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${f.active ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'}`}>
                      {f.active ? 'Ativo' : 'Pausado'}
                    </span>
                  </div>
                  <h4 className={`text-xl font-bold mb-2 ${f.active ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>{f.name}</h4>
                  <p className="text-sm text-slate-400 font-medium mb-4 line-clamp-2">{f.description}</p>
                  <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 uppercase mb-6">
                    <Layers size={14} /> {f.blocks.length} Blocos Configurados
                  </div>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => toggleFlowStatus(f.id)}
                    className={`w-full py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${f.active
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                      }`}
                  >
                    {f.active ? <><PowerOff size={16} /> Desativar Fluxo</> : <><Power size={16} /> Ativar Fluxo</>}
                  </button>
                  <div className="flex gap-2">
                    <button onClick={() => openFlowEditor(f)} className="flex-1 py-3 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-bold text-xs hover:bg-legal-navy hover:text-white transition-all">Editar Fluxo</button>
                    <button onClick={() => setFlows(flows.filter(it => it.id !== f.id))} className="p-3 bg-slate-100 dark:bg-slate-800 text-slate-400 hover:text-rose-500 rounded-xl transition-all"><Trash2 size={18} /></button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* VIEW: FOLLOW-UPS (SLA RULES) */}
      {activeTab === 'followups' && (
        <div className="space-y-8 animate-in slide-in-from-right duration-500">

          {/* SLA DASHBOARD */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl flex items-center justify-center text-indigo-600 mb-4"><Send size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Follow-ups Enviados</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{slaMetrics.totalSent}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl flex items-center justify-center text-emerald-600 mb-4"><MessageSquare size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Retornos / Respostas</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{slaMetrics.totalReplied}</p>
            </div>
            <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
              <div className="w-10 h-10 bg-legal-bronze/10 rounded-xl flex items-center justify-center text-legal-bronze mb-4"><TrendingUp size={20} /></div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Taxa de Conversão</p>
              <p className="text-3xl font-black text-slate-900 dark:text-white mt-1">{slaMetrics.conversionRate}%</p>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
            <div>
              <h2 className="text-3xl font-black text-legal-navy dark:text-white flex items-center gap-3">
                <div className="p-2 bg-legal-bronze text-white rounded-xl shadow-lg"><AlarmClock size={24} /></div>
                Réguas de Follow-up (SLA)
              </h2>
              <p className="text-slate-500 dark:text-slate-400 font-medium mt-1">Automatize o contato baseado em tempo de inatividade.</p>
            </div>
            <button
              onClick={() => openFollowUpModal()}
              className="flex items-center gap-2 px-8 py-4 bg-legal-navy text-white rounded-2xl font-bold hover:brightness-110 transition-all shadow-xl shadow-legal-navy/20"
            >
              <Plus size={20} /> Nova Régua SLA
            </button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {followUpRules.map(rule => (
              <div key={rule.id} className={`bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-200 dark:border-slate-800 p-8 shadow-sm hover:shadow-xl transition-all group relative overflow-hidden flex flex-col justify-between ${!rule.active ? 'opacity-60' : ''}`}>
                <div className="absolute top-0 right-0 p-8">
                  <span className={`px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white ${rule.active ? 'bg-emerald-500' : 'bg-slate-400'}`}>
                    {rule.active ? 'Monitorando' : 'Pausado'}
                  </span>
                </div>

                <div className="space-y-6">
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-colors shadow-inner ${rule.active ? 'bg-amber-50 dark:bg-amber-900/20 text-amber-600' : 'bg-slate-100 text-slate-400'}`}>
                      <BellRing size={28} />
                    </div>
                    <div>
                      <h4 className="text-xl font-bold text-slate-900 dark:text-white">{rule.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-[10px] font-black uppercase text-legal-bronze bg-legal-bronze/5 px-2 py-0.5 rounded border border-legal-bronze/10">{rule.sector}</span>
                        <span className="text-[10px] font-bold text-slate-400 flex items-center gap-1"><Clock size={10} /> Janela: {rule.delayValue} {rule.delayUnit === 'days' ? 'dias' : 'horas'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[9px] font-black uppercase text-slate-400">Enviados</p>
                      <p className="text-xl font-black text-slate-700 dark:text-slate-300">{rule.stats?.sent || 0}</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800 p-3 rounded-xl border border-slate-100 dark:border-slate-700">
                      <p className="text-[9px] font-black uppercase text-slate-400">Retornos</p>
                      <p className="text-xl font-black text-slate-700 dark:text-slate-300">{rule.stats?.replied || 0}</p>
                    </div>
                  </div>

                  <div className="p-5 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800 italic text-sm text-slate-600 dark:text-slate-400 leading-relaxed min-h-[80px]">
                    "{rule.message}"
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {rule.targetTags.map(tag => (
                      <span key={tag} className="text-[9px] font-black uppercase bg-white dark:bg-slate-800 text-slate-400 border border-slate-200 dark:border-slate-700 px-2 py-1 rounded-md">{tag}</span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 mt-8">
                  <button
                    onClick={() => toggleFollowUpStatus(rule.id)}
                    className={`flex-1 py-3 rounded-xl font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-sm ${rule.active
                      ? 'bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-900/20 dark:text-rose-400'
                      : 'bg-emerald-50 text-emerald-600 hover:bg-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400'
                      }`}
                  >
                    {rule.active ? <><PowerOff size={16} /> Pausar Monitoramento</> : <><Power size={16} /> Ativar SLA</>}
                  </button>
                  <button onClick={() => openFollowUpModal(rule)} className="p-3 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all shadow-sm"><Edit2 size={18} /></button>
                  <button onClick={() => setFollowUpRules(followUpRules.filter(r => r.id !== rule.id))} className="p-3 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-rose-500 border border-slate-100 dark:border-slate-700 rounded-xl transition-all shadow-sm"><Trash2 size={18} /></button>
                </div>
              </div>
            ))}

            {followUpRules.length === 0 && (
              <div className="lg:col-span-2 py-20 bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-[3rem] text-center space-y-4 opacity-50">
                <AlarmClock size={48} className="mx-auto text-slate-300" />
                <div className="space-y-1">
                  <h4 className="text-xl font-bold text-slate-700 dark:text-slate-300">Nenhuma Régua SLA Ativa</h4>
                  <p className="text-slate-500 text-sm">Crie automações de contato para não perder o timing dos processos.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: FOLLOW-UP EDITOR */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsFollowUpModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="bg-legal-navy p-10 text-white relative">
              <button onClick={() => setIsFollowUpModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-xl"><AlarmClock size={32} /></div>
                <div>
                  <h3 className="text-3xl font-black">{editingId ? 'Editar Régua SLA' : 'Nova Régua SLA'}</h3>
                  <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">Configuração de Alerta e Contato Automático</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveFollowUp} className="p-10 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identificação da Régua</label>
                <input required type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5" value={followUpForm.name} onChange={(e) => setFollowUpForm({ ...followUpForm, name: e.target.value })} placeholder="Ex: Retomar contato Novo Lead" />
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Setor Responsável</label>
                  <select required className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none" value={followUpForm.sector} onChange={(e) => setFollowUpForm({ ...followUpForm, sector: e.target.value })}>
                    {SECTORS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Janela de Inatividade</label>
                  <div className="flex gap-2">
                    <input required type="number" min="1" className="w-20 px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white text-center outline-none" value={followUpForm.delayValue} onChange={(e) => setFollowUpForm({ ...followUpForm, delayValue: parseInt(e.target.value) })} />
                    <select className="flex-1 px-4 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none" value={followUpForm.delayUnit} onChange={(e) => setFollowUpForm({ ...followUpForm, delayUnit: e.target.value as any })}>
                      <option value="hours">Horas</option>
                      <option value="days">Dias</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Atalhos Sugeridos (Janelas Padrão)</label>
                <div className="flex gap-3">
                  {[3, 7, 14].map(val => (
                    <button key={val} type="button" onClick={() => setFollowUpForm({ ...followUpForm, delayValue: val, delayUnit: 'days' })} className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all ${followUpForm.delayValue === val && followUpForm.delayUnit === 'days' ? 'border-legal-bronze bg-amber-50 dark:bg-amber-900/20 text-legal-bronze' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                      {val} Dias
                    </button>
                  ))}
                  <button type="button" onClick={() => setFollowUpForm({ ...followUpForm, delayValue: 24, delayUnit: 'hours' })} className={`flex-1 py-3 px-4 rounded-xl border-2 font-bold text-xs transition-all ${followUpForm.delayValue === 24 && followUpForm.delayUnit === 'hours' ? 'border-legal-bronze bg-amber-50 dark:bg-amber-900/20 text-legal-bronze' : 'border-slate-100 dark:border-slate-800 text-slate-400'}`}>
                    24h
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Etiquetas Monitoradas</label>
                <div className="flex flex-wrap gap-2 p-4 bg-slate-50 dark:bg-slate-800/50 rounded-2xl border border-slate-100 dark:border-slate-800">
                  {TAGS.map(t => (
                    <button key={t} type="button" onClick={() => setFollowUpForm({ ...followUpForm, targetTags: toggleList(followUpForm.targetTags || [], t) })} className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase transition-all border ${followUpForm.targetTags?.includes(t) ? 'bg-legal-navy text-white border-legal-navy shadow-sm' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mensagem de Retomada</label>
                <textarea required className="w-full h-32 px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium dark:text-white outline-none resize-none focus:ring-4 focus:ring-legal-navy/5 shadow-inner" placeholder="O que o robô deve enviar ao cliente?" value={followUpForm.message} onChange={(e) => setFollowUpForm({ ...followUpForm, message: e.target.value })} />
              </div>

              <div className="pt-6 flex gap-4">
                <button type="button" onClick={() => setIsFollowUpModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 transition-all uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" className="flex-1 py-5 bg-legal-navy text-white rounded-2xl font-bold shadow-xl shadow-legal-navy/30 flex items-center justify-center gap-3 hover:brightness-110 uppercase text-xs tracking-widest">
                  <Save size={20} /> Salvar Automação
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CAMPAIGN EDITOR */}
      {isCampaignModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsCampaignModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-4xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[95vh]">
            <div className="bg-legal-navy p-10 text-white relative shrink-0">
              <button onClick={() => setIsCampaignModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-xl"><Megaphone size={32} /></div>
                <div>
                  <h3 className="text-3xl font-black">{editingId ? 'Editar Campanha' : 'Nova Campanha de Disparo'}</h3>
                  <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">Configuração de Disparo WhatsApp Business API</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveCampaign} className="flex-1 overflow-y-auto p-10 space-y-8 custom-scrollbar">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Identificação Interna</label>
                    <input required type="text" className="w-full px-6 py-4 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold dark:text-white outline-none focus:ring-4 focus:ring-legal-navy/5" value={campaignForm.name} onChange={(e) => setCampaignForm({ ...campaignForm, name: e.target.value })} placeholder="Ex: Campanha Revisão FGTS" />
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Público Alvo (Setores)</label>
                    <div className="flex flex-wrap gap-2">
                      {SECTORS.map(s => (
                        <button key={s} type="button" onClick={() => setCampaignForm({ ...campaignForm, targetSectors: toggleList(campaignForm.targetSectors || [], s) })}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${campaignForm.targetSectors?.includes(s) ? 'bg-legal-navy text-white border-legal-navy shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Público Alvo (Etiquetas)</label>
                    <div className="flex flex-wrap gap-2">
                      {TAGS.map(t => (
                        <button key={t} type="button" onClick={() => setCampaignForm({ ...campaignForm, targetTags: toggleList(campaignForm.targetTags || [], t) })}
                          className={`px-3 py-1.5 rounded-xl text-[10px] font-black uppercase transition-all border ${campaignForm.targetTags?.includes(t) ? 'bg-legal-bronze text-white border-legal-bronze shadow-md' : 'bg-white dark:bg-slate-800 text-slate-400 border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}>
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="space-y-4">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Modalidade de Envio</label>
                    <div className="grid grid-cols-2 gap-3">
                      <button type="button" onClick={() => setCampaignForm({ ...campaignForm, sendType: 'immediate' })} className={`p-5 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${campaignForm.sendType === 'immediate' ? 'border-legal-navy bg-blue-50 dark:bg-blue-900/20 text-legal-navy dark:text-white' : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60'}`}>
                        <Zap size={24} /> <span className="text-[11px] font-black uppercase">Imediato</span>
                      </button>
                      <button type="button" onClick={() => setCampaignForm({ ...campaignForm, sendType: 'scheduled' })} className={`p-5 rounded-[2rem] border-2 flex flex-col items-center gap-3 transition-all ${campaignForm.sendType === 'scheduled' ? 'border-legal-bronze bg-amber-50 dark:bg-amber-900/20 text-legal-bronze dark:text-white' : 'border-slate-100 dark:border-slate-800 text-slate-400 opacity-60'}`}>
                        <Clock size={24} /> <span className="text-[11px] font-black uppercase">Agendado</span>
                      </button>
                    </div>
                  </div>

                  {campaignForm.sendType === 'scheduled' && (
                    <div className="space-y-2 animate-in slide-in-from-top-2 p-6 bg-amber-50/30 dark:bg-amber-900/10 rounded-[2rem] border border-amber-100 dark:border-amber-900/30">
                      <label className="text-[10px] font-bold text-amber-700 dark:text-amber-500 uppercase ml-1 block mb-2">Data e Hora Escolhida</label>
                      <input type="datetime-local" className="w-full px-5 py-4 bg-white dark:bg-slate-900 border border-amber-200 dark:border-amber-800 rounded-2xl text-sm font-bold dark:text-white outline-none" value={campaignForm.scheduledAt} onChange={(e) => setCampaignForm({ ...campaignForm, scheduledAt: e.target.value })} />
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Texto da Mensagem</label>
                    <textarea required className="w-full h-48 px-6 py-5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-[2rem] text-sm font-medium dark:text-white outline-none resize-none focus:ring-4 focus:ring-legal-navy/5 shadow-inner" placeholder="Escreva a mensagem para seus clientes..." value={campaignForm.message} onChange={(e) => setCampaignForm({ ...campaignForm, message: e.target.value })} />
                  </div>
                </div>
              </div>

              <div className="p-8 bg-slate-900 rounded-[3rem] flex flex-col md:flex-row items-center justify-between text-white shadow-2xl relative overflow-hidden group">
                <div className="absolute right-0 top-0 p-12 opacity-5 rotate-12 transition-transform group-hover:scale-110"><Target size={180} /></div>
                <div className="relative z-10 flex items-center gap-6">
                  <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center text-legal-bronze shadow-inner"><Target size={32} /></div>
                  <div>
                    <p className="text-[10px] font-black text-white/40 uppercase tracking-widest mb-1">Público Estimado (Real-time)</p>
                    <p className="text-4xl font-black tracking-tight">~ {Math.floor(Math.random() * 300) + 250} <span className="text-lg font-bold text-white/40">Leads</span></p>
                  </div>
                </div>
                <div className="relative z-10 text-right mt-6 md:mt-0 flex flex-col items-center md:items-end">
                  <p className="text-[10px] font-black text-white/40 uppercase mb-2">Auditores de Entrega</p>
                  <span className="bg-emerald-500/20 text-emerald-400 text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-tighter border border-emerald-500/30 flex items-center gap-2">
                    <Check size={12} /> Pronto para o Disparo
                  </span>
                </div>
              </div>

              <div className="flex gap-4 pt-6">
                <button type="button" onClick={() => setIsCampaignModalOpen(false)} className="flex-1 py-5 bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 rounded-2xl font-bold hover:bg-slate-200 dark:hover:bg-slate-700 transition-all uppercase text-xs tracking-widest">Cancelar</button>
                <button type="submit" className={`flex-1 py-5 text-white rounded-2xl font-bold shadow-2xl flex items-center justify-center gap-3 transition-all hover:brightness-110 uppercase text-xs tracking-widest ${campaignForm.sendType === 'immediate' ? 'bg-legal-navy shadow-legal-navy/30' : 'bg-legal-bronze shadow-legal-bronze/30'}`}>
                  {campaignForm.sendType === 'immediate' ? <><Send size={22} /> Iniciar Agora</> : <><Calendar size={22} /> Salvar Alterações</>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: FLOW EDITOR */}
      {isFlowEditorOpen && (
        <div className="fixed inset-0 z-[250] flex items-start justify-center p-4 overflow-y-auto">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md animate-in fade-in" onClick={() => setIsFlowEditorOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl w-full max-w-5xl animate-in zoom-in-95 my-8 flex flex-col overflow-hidden">

            {/* Header */}
            <div className="bg-legal-navy p-10 text-white relative shrink-0">
              <button onClick={() => setIsFlowEditorOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors"><X size={24} /></button>
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-xl"><BrainCircuit size={32} /></div>
                <div>
                  <h3 className="text-3xl font-black">{editingId ? 'Editar Fluxo' : 'Novo Fluxo por Blocos'}</h3>
                  <p className="text-white/60 text-[10px] uppercase font-black tracking-widest mt-1">Construtor visual de conversas automatizadas</p>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveFlow} className="flex flex-col lg:flex-row min-h-0" style={{ minHeight: '520px' }}>

              {/* LEFT: Config + Block Palette */}
              <div className="w-full lg:w-80 bg-slate-50 dark:bg-slate-800/50 border-r border-slate-100 dark:border-slate-800 p-8 space-y-6 shrink-0 lg:overflow-y-auto">
                <div className="space-y-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Nome do Fluxo</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Boas-vindas Trabalhista"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-legal-navy/10"
                      value={flowForm.name || ''}
                      onChange={(e) => setFlowForm({ ...flowForm, name: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Palavra-chave Gatilho</label>
                    <input
                      type="text"
                      placeholder="Ex: INFO, AJUDA, OLÁ"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-legal-navy/10"
                      value={flowForm.trigger || ''}
                      onChange={(e) => setFlowForm({ ...flowForm, trigger: e.target.value })}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Descrição</label>
                    <textarea
                      rows={2}
                      placeholder="Para que serve este fluxo?"
                      className="w-full px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none focus:ring-2 focus:ring-legal-navy/10"
                      value={flowForm.description || ''}
                      onChange={(e) => setFlowForm({ ...flowForm, description: e.target.value })}
                    />
                  </div>
                </div>

                {/* Paleta de Blocos */}
                <div>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Adicionar Bloco</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { type: 'text' as BlockType, label: 'Mensagem', icon: <MessageSquareText size={18} />, color: 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 hover:bg-blue-100 dark:hover:bg-blue-900/40' },
                      { type: 'wait' as BlockType, label: 'Aguardar', icon: <Clock size={18} />, color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 hover:bg-amber-100 dark:hover:bg-amber-900/40' },
                      { type: 'image' as BlockType, label: 'Imagem', icon: <ImageIcon size={18} />, color: 'bg-purple-50 dark:bg-purple-900/20 text-purple-600 hover:bg-purple-100 dark:hover:bg-purple-900/40' },
                      { type: 'file' as BlockType, label: 'PDF', icon: <FileText size={18} />, color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 hover:bg-rose-100 dark:hover:bg-rose-900/40' },
                      { type: 'audio' as BlockType, label: 'Áudio', icon: <Mic size={18} />, color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 hover:bg-emerald-100 dark:hover:bg-emerald-900/40' },
                      { type: 'menu' as BlockType, label: 'Menu', icon: <ListTodo size={18} />, color: 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 hover:bg-indigo-100 dark:hover:bg-indigo-900/40' },
                    ]).map(({ type, label, icon, color }) => (
                      <button
                        key={type}
                        type="button"
                        onClick={() => addBlockToFlow(type)}
                        className={`flex flex-col items-center gap-2 p-4 rounded-2xl border border-transparent ${color} transition-all font-bold text-[10px] uppercase tracking-wider shadow-sm hover:shadow-md`}
                      >
                        {icon}
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Botões de Ação */}
                <div className="space-y-2 pt-2">
                  <button
                    type="button"
                    onClick={startSimulation}
                    disabled={!flowForm.blocks?.length || isSimulating}
                    className="w-full py-3 bg-legal-bronze/10 text-legal-bronze border border-legal-bronze/20 rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:bg-legal-bronze/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <Play size={16} /> {isSimulating ? 'Simulando...' : 'Simular Fluxo'}
                  </button>
                  <button
                    type="submit"
                    className="w-full py-3 bg-legal-navy text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 hover:brightness-110 transition-all shadow-lg shadow-legal-navy/20"
                  >
                    <Save size={16} /> Salvar Fluxo
                  </button>
                </div>
              </div>

              {/* CENTER: Block List */}
              <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
                <div className="flex items-center justify-between mb-6">
                  <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-tight flex items-center gap-2">
                    <Layers size={16} className="text-legal-bronze" />
                    Blocos do Fluxo
                    <span className="bg-legal-bronze/10 text-legal-bronze text-[10px] px-2 py-0.5 rounded-full font-black">{flowForm.blocks?.length || 0}</span>
                  </h4>
                </div>

                {(!flowForm.blocks || flowForm.blocks.length === 0) ? (
                  <div className="flex flex-col items-center justify-center py-24 text-center space-y-4 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-[2rem]">
                    <Layers size={48} className="text-slate-200 dark:text-slate-700" />
                    <div>
                      <p className="font-bold text-slate-400">Nenhum bloco adicionado</p>
                      <p className="text-xs text-slate-300 mt-1">Clique nos tipos de bloco ao lado para montar o fluxo</p>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {flowForm.blocks.map((block, idx) => {
                      const cfgMap: Record<BlockType, { label: string; color: string; icon: React.ReactNode }> = {
                        text: { label: 'Mensagem de Texto', color: 'border-l-blue-400', icon: <MessageSquareText size={16} className="text-blue-500" /> },
                        wait: { label: 'Tempo de Espera', color: 'border-l-amber-400', icon: <Clock size={16} className="text-amber-500" /> },
                        image: { label: 'Enviar Imagem', color: 'border-l-purple-400', icon: <ImageIcon size={16} className="text-purple-500" /> },
                        file: { label: 'Enviar Arquivo PDF', color: 'border-l-rose-400', icon: <FileText size={16} className="text-rose-500" /> },
                        audio: { label: 'Mensagem de Áudio', color: 'border-l-emerald-400', icon: <Mic size={16} className="text-emerald-500" /> },
                        menu: { label: 'Menu de Opções', color: 'border-l-indigo-400', icon: <ListTodo size={16} className="text-indigo-500" /> },
                      };
                      const cfg = cfgMap[block.type];
                      return (
                        <div key={block.id} className={`bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 border-l-4 ${cfg.color} p-4 shadow-sm hover:shadow-md transition-all group`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-black text-slate-300 w-5 text-center">{idx + 1}</span>
                              {cfg.icon}
                              <span className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">{cfg.label}</span>
                            </div>
                            <button type="button" onClick={() => removeBlockFromFlow(block.id)} className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-300 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-lg transition-all">
                              <X size={14} />
                            </button>
                          </div>

                          {block.type === 'text' && (
                            <textarea rows={2} placeholder="Mensagem que o bot vai enviar..." className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none resize-none focus:ring-2 focus:ring-legal-navy/10" value={block.content} onChange={(e) => updateBlockContent(block.id, e.target.value)} />
                          )}
                          {block.type === 'wait' && (
                            <div className="flex items-center gap-3">
                              <input type="number" min="1" max="60" placeholder="5" className="w-20 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none text-center" value={block.content || ''} onChange={(e) => updateBlockContent(block.id, e.target.value)} />
                              <span className="text-xs text-slate-400 font-bold">segundos de espera antes do próximo bloco</span>
                            </div>
                          )}
                          {block.type === 'image' && (
                            <input type="text" placeholder="URL da imagem (https://...)" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-legal-navy/10" value={block.content} onChange={(e) => updateBlockContent(block.id, e.target.value)} />
                          )}
                          {block.type === 'file' && (
                            <input type="text" placeholder="Nome do arquivo (ex: contrato_modelo.pdf)" className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-sm dark:text-white outline-none focus:ring-2 focus:ring-legal-navy/10" value={block.content} onChange={(e) => updateBlockContent(block.id, e.target.value)} />
                          )}
                          {block.type === 'audio' && (
                            <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 rounded-xl px-4 py-3 border border-slate-100 dark:border-slate-700">
                              <Mic size={16} className="text-emerald-500 shrink-0" />
                              <input type="text" placeholder="Nome do arquivo de áudio (ex: audio_boas_vindas.mp3)" className="flex-1 bg-transparent text-sm dark:text-white outline-none" value={block.content} onChange={(e) => updateBlockContent(block.id, e.target.value)} />
                              <span className="text-[9px] text-emerald-600 font-black bg-emerald-50 dark:bg-emerald-900/20 px-2 py-0.5 rounded-full">Áudio</span>
                            </div>
                          )}
                          {block.type === 'menu' && (
                            <div className="space-y-3">
                              <input
                                type="text"
                                placeholder="Pergunta do menu (Ex: Qual o seu serviço desejado?)"
                                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white outline-none focus:ring-2 focus:ring-indigo-500/10 mb-2"
                                value={block.content}
                                onChange={(e) => updateBlockContent(block.id, e.target.value)}
                              />
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest pl-1">Opções do Botão</p>
                              <div className="space-y-2">
                                {(block.metadata?.options || []).map((opt: any, optIdx: number) => (
                                  <div key={opt.id} className="bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-700 flex flex-col gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="bg-indigo-500 text-white w-5 h-5 flex items-center justify-center rounded-lg text-[10px] font-black shrink-0">{optIdx + 1}</span>
                                      <input
                                        type="text"
                                        placeholder="Rótulo do botão"
                                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs dark:text-white outline-none"
                                        value={opt.label}
                                        onChange={(e) => {
                                          const newOpts = [...block.metadata.options];
                                          newOpts[optIdx] = { ...opt, label: e.target.value };
                                          setFlowForm(prev => ({
                                            ...prev,
                                            blocks: prev.blocks?.map(b => b.id === block.id ? { ...b, metadata: { ...b.metadata, options: newOpts } } : b)
                                          }));
                                        }}
                                      />
                                      <button
                                        type="button"
                                        className="text-rose-400 hover:text-rose-500 p-1"
                                        onClick={() => {
                                          const newOpts = block.metadata.options.filter((_: any, i: number) => i !== optIdx);
                                          setFlowForm(prev => ({
                                            ...prev,
                                            blocks: prev.blocks?.map(b => b.id === block.id ? { ...b, metadata: { ...b.metadata, options: newOpts } } : b)
                                          }));
                                        }}
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                    <div className="flex items-center gap-2 pl-7">
                                      <Tag size={12} className="text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Tag Alvo (Ex: Trabalhista)"
                                        className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 pb-0.5 text-[10px] dark:text-slate-300 outline-none"
                                        value={opt.targetTag || ''}
                                        onChange={(e) => {
                                          const newOpts = [...block.metadata.options];
                                          newOpts[optIdx] = { ...opt, targetTag: e.target.value };
                                          setFlowForm(prev => ({
                                            ...prev,
                                            blocks: prev.blocks?.map(b => b.id === block.id ? { ...b, metadata: { ...b.metadata, options: newOpts } } : b)
                                          }));
                                        }}
                                      />
                                    </div>
                                    <div className="flex items-center gap-2 pl-7">
                                      <MessageSquare size={12} className="text-slate-400" />
                                      <input
                                        type="text"
                                        placeholder="Resposta do bot"
                                        className="flex-1 bg-transparent border-b border-slate-200 dark:border-slate-700 pb-0.5 text-[10px] dark:text-slate-300 outline-none"
                                        value={opt.reply || ''}
                                        onChange={(e) => {
                                          const newOpts = [...block.metadata.options];
                                          newOpts[optIdx] = { ...opt, reply: e.target.value };
                                          setFlowForm(prev => ({
                                            ...prev,
                                            blocks: prev.blocks?.map(b => b.id === block.id ? { ...b, metadata: { ...b.metadata, options: newOpts } } : b)
                                          }));
                                        }}
                                      />
                                    </div>
                                  </div>
                                ))}
                                <button
                                  type="button"
                                  className="w-full py-2 bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 rounded-xl font-bold text-xs hover:bg-indigo-100 transition-all flex items-center justify-center gap-2"
                                  onClick={() => {
                                    const currOpts = block.metadata?.options || [];
                                    const newOpts = [...currOpts, { id: `opt_${Date.now()}`, label: 'Nova Opção', targetTag: '', reply: '' }];
                                    setFlowForm(prev => ({
                                      ...prev,
                                      blocks: prev.blocks?.map(b => b.id === block.id ? { ...b, metadata: { ...b.metadata, options: newOpts } } : b)
                                    }));
                                  }}
                                >
                                  <Plus size={14} /> Adicionar Botão
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                    <div className="flex items-center gap-3 py-2 opacity-40">
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                      <span className="text-[9px] font-black uppercase text-slate-400">Fim do Fluxo</span>
                      <div className="flex-1 h-px bg-slate-200 dark:bg-slate-700"></div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT: Simulator (WhatsApp Preview) */}
              <div className="w-full lg:w-72 bg-slate-900 p-6 flex flex-col shrink-0" style={{ minHeight: '300px' }}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center">
                    <Smartphone size={14} className="text-white" />
                  </div>
                  <div>
                    <p className="text-white font-black text-sm">Prévia WhatsApp</p>
                    <p className="text-white/40 text-[9px] uppercase">Simulação em tempo real</p>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto space-y-3 custom-scrollbar">
                  {simMessages.length === 0 && !isSimulating && (
                    <div className="flex flex-col items-center justify-center h-full py-10 text-center">
                      <Play size={28} className="text-white/20 mb-3" />
                      <p className="text-white/30 text-xs">Clique em "Simular Fluxo"<br />para ver a prévia</p>
                    </div>
                  )}
                  {simMessages.map((msg, i) => (
                    <div key={i} className="flex justify-start animate-in slide-in-from-bottom-2">
                      <div className={`max-w-[85%] px-4 py-3 rounded-2xl rounded-tl-none ${msg.type === 'audio' ? 'bg-emerald-900/60 border border-emerald-800' : 'bg-slate-700'}`}>
                        {msg.type === 'audio' ? (
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center shrink-0"><Mic size={12} className="text-white" /></div>
                            <div>
                              <div className="h-1 w-24 bg-emerald-400/60 rounded-full mb-1"></div>
                              <p className="text-emerald-300 text-[9px]">{msg.content || 'Áudio'}</p>
                            </div>
                          </div>
                        ) : msg.type === 'image' ? (
                          <div className="bg-purple-700/30 rounded-xl p-3 text-center">
                            <ImageIcon size={20} className="text-purple-300 mx-auto mb-1" />
                            <p className="text-purple-300 text-[10px]">Imagem</p>
                          </div>
                        ) : msg.type === 'file' ? (
                          <div className="flex items-center gap-2">
                            <FileText size={16} className="text-rose-300" />
                            <p className="text-white text-xs">{msg.content || 'Documento PDF'}</p>
                          </div>
                        ) : msg.type === 'menu' ? (
                          <div className="space-y-3 pb-1">
                            <p className="text-white font-bold text-sm leading-relaxed">{msg.content || 'Selecione uma opção:'}</p>
                            <div className="space-y-2">
                              {msg.metadata?.options?.map((opt: any, optIdx: number) => (
                                <button
                                  key={optIdx}
                                  onClick={() => {
                                    if (isSimulating) return; // For visual only, wait for typing simulation
                                    setSimMessages(prev => [...prev, { type: 'text', content: opt.label, fromMe: true }]);
                                    setSimTyping(true);
                                    if (opt.targetTag) {
                                      setTimeout(() => {
                                        setSimMessages(prev => [...prev, { type: 'text', content: `[Sistema] Tag Aplicada: ${opt.targetTag}`, fromMe: false, isTag: true }]);
                                      }, 500);
                                    }
                                    if (opt.reply) {
                                      setTimeout(() => {
                                        setSimMessages(prev => [...prev, { type: 'text', content: opt.reply, fromMe: false }]);
                                        setSimTyping(false);
                                      }, 1500);
                                    } else {
                                      setTimeout(() => setSimTyping(false), 800);
                                    }
                                  }}
                                  className="w-full py-2.5 px-4 bg-indigo-500 hover:bg-indigo-600 transition-colors text-white text-xs font-bold rounded-xl flex items-center justify-between group-btn"
                                >
                                  {opt.label || `Opção ${optIdx + 1}`}
                                  <ChevronRight size={14} className="opacity-50" />
                                </button>
                              ))}
                            </div>
                          </div>
                        ) : msg.isTag ? (
                          <div className="bg-slate-800/80 rounded-lg p-2 flex items-center justify-center gap-2 border border-slate-600">
                            <Tag size={12} className="text-slate-400" />
                            <p className="text-slate-300 text-[10px] font-bold uppercase tracking-widest">{msg.content}</p>
                          </div>
                        ) : (
                          <p className="text-white text-xs leading-relaxed">{msg.content}</p>
                        )}
                        <p className="text-white/30 text-[8px] text-right mt-1">Agora ✓✓</p>
                      </div>
                    </div>
                  ))}
                  {simTyping && (
                    <div className="flex justify-start animate-in fade-in">
                      <div className="bg-slate-700 px-4 py-3 rounded-2xl rounded-tl-none flex items-center gap-1.5">
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                        <div className="w-1.5 h-1.5 bg-white/40 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                      </div>
                    </div>
                  )}
                  {!isSimulating && simMessages.length > 0 && (
                    <div className="text-center">
                      <span className="bg-emerald-500/20 text-emerald-400 text-[9px] font-black px-3 py-1 rounded-full border border-emerald-500/30 uppercase">✓ Fluxo concluído</span>
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
