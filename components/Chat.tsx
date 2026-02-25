
import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  MoreVertical,
  Send,
  Paperclip,
  Smile,
  Phone,
  Video,
  User,
  CheckCheck,
  Search as SearchIcon,
  X,
  Plus,
  ArrowLeft,
  Settings2,
  AlertCircle,
  QrCode,
  MessageCircle,
  ImageIcon,
  FileText,
  UserCircle,
  Archive,
  Ban,
  Clock,
  Check,
  Calendar,
  FolderOpen,
  Layout,
  Loader2,
  Zap,
  Trash2,
  MessageSquareText,
  Edit3,
  ChevronRight,
  Save,
  Users,
  ShieldCheck,
  Briefcase,
  Tag,
  Palette,
  Filter,
  UserPlus,
  UploadCloud,
  Download,
  FileSpreadsheet,
  ArrowRightLeft,
  Building2,
  KanbanSquare,
  List
} from 'lucide-react';
import { ChatConversation, ChatMessage } from '../types.ts';

interface ChatTag {
  id: string;
  label: string;
  color: string;
}

interface QuickReply {
  id: string;
  command: string;
  text: string;
}

interface Contact {
  id: string;
  name: string;
  phone: string;
  email: string;
  company: string;
}

interface DeptAgent {
  id: string;
  name: string;
  avatar: string;
  status: 'online' | 'offline' | 'busy';
}

interface Department {
  id: string;
  name: string;
  color: string;
  bgColor: string;
  agents: DeptAgent[];
}

const DEPARTMENTS: Department[] = [
  {
    id: 'admin',
    name: 'Administrativo',
    color: '#3b82f6',
    bgColor: '#eff6ff',
    agents: [
      { id: 'adm1', name: 'Ana Cláudia Santos', avatar: 'https://ui-avatars.com/api/?name=Ana+Claudia&background=3b82f6&color=fff', status: 'online' },
      { id: 'adm2', name: 'Fernando Costa', avatar: 'https://ui-avatars.com/api/?name=Fernando+Costa&background=3b82f6&color=fff', status: 'busy' },
    ]
  },
  {
    id: 'financial',
    name: 'Financeiro',
    color: '#10b981',
    bgColor: '#ecfdf5',
    agents: [
      { id: 'fin1', name: 'Dr. Marcos (Financeiro)', avatar: 'https://ui-avatars.com/api/?name=Marcos+Silva&background=10b981&color=fff', status: 'online' },
      { id: 'fin2', name: 'Priscila Ramos', avatar: 'https://ui-avatars.com/api/?name=Priscila+Ramos&background=10b981&color=fff', status: 'offline' },
    ]
  },
  {
    id: 'legal',
    name: 'Jurídico',
    color: '#A67C52',
    bgColor: '#fdf8f4',
    agents: [
      { id: 'jur1', name: 'Dra. Beatriz Lima', avatar: 'https://ui-avatars.com/api/?name=Beatriz+Lima&background=A67C52&color=fff', status: 'online' },
      { id: 'jur2', name: 'Dr. Ricardo Almeida', avatar: 'https://ui-avatars.com/api/?name=Ricardo+Almeida&background=A67C52&color=fff', status: 'busy' },
    ]
  },
  {
    id: 'support',
    name: 'Suporte',
    color: '#8b5cf6',
    bgColor: '#f5f3ff',
    agents: [
      { id: 'sup1', name: 'Lucas Mendes', avatar: 'https://ui-avatars.com/api/?name=Lucas+Mendes&background=8b5cf6&color=fff', status: 'online' },
    ]
  },
];

const INITIAL_TAGS: ChatTag[] = [
  { id: 't1', label: 'Urgente', color: '#ef4444' },
  { id: 't2', label: 'Financeiro', color: '#10b981' },
  { id: 't3', label: 'Revisão', color: '#f59e0b' },
  { id: 't4', label: 'Salário Maternidade', color: '#ec4899' },
  { id: 't5', label: 'TEA (Autismo)', color: '#3b82f6' },
  { id: 't6', label: 'Consumidor', color: '#8b5cf6' },
  { id: 't7', label: 'Trabalhista', color: '#A67C52' },
];

const INITIAL_QUICK_REPLIES: QuickReply[] = [
  { id: '1', command: 'ola', text: 'Olá! Sou o Dr. Responsável pelo seu caso. Como posso ajudá-lo hoje?' },
  { id: '2', command: 'doc', text: 'Recebemos seus documentos com sucesso. Vamos analisá-los e retornaremos em breve.' },
  { id: '3', command: 'andamento', text: 'Seu processo teve uma nova movimentação hoje. Já estamos verificando os detalhes para você.' },
  { id: '4', command: 'acordo', text: 'A parte contrária enviou uma proposta de acordo. Gostaria de agendar uma breve reunião para discutirmos?' },
];

const MOCK_CONTACTS: Contact[] = [
  { id: 'c1', name: 'Carlos Eduardo Oliveira', phone: '+55 (11) 98877-6655', email: 'carlos@email.com', company: 'Pessoa Física' },
  { id: 'c2', name: 'Dra. Aline Silva', phone: '+55 (11) 97766-5544', email: 'aline@juridico.com', company: 'Silva Advocacia' },
  { id: 'c3', name: 'Roberto J. Pereira', phone: '+55 (21) 90000-1111', email: 'roberto@email.com', company: 'Pessoa Física' },
];

const MOCK_EXTERNAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: '1',
    contactName: 'Carlos Eduardo Oliveira',
    lastMessage: 'Doutor, você viu a última movimentação do processo?',
    timestamp: '10:45',
    unreadCount: 2,
    online: true,
    avatar: 'https://ui-avatars.com/api/?name=Carlos+Eduardo&background=002B49&color=fff',
    messages: [
      { id: 'm1', text: 'Bom dia, Carlos!', timestamp: '09:00', fromMe: true },
      { id: 'm2', text: 'Bom dia, Doutor. Gostaria de saber sobre o processo de indenização.', timestamp: '09:05', fromMe: false },
      { id: 'm3', text: 'Já estamos verificando. Houve uma sentença favorável ontem.', timestamp: '10:00', fromMe: true },
      { id: 'm4', text: 'Doutor, você viu a última movimentação do processo?', timestamp: '10:45', fromMe: false },
    ]
  },
  {
    id: '2',
    contactName: 'Dra. Aline Silva (Testemunha)',
    lastMessage: 'Os documentos já foram anexados no drive.',
    timestamp: '08:20',
    unreadCount: 0,
    online: false,
    avatar: 'https://ui-avatars.com/api/?name=Aline+Silva&background=A67C52&color=fff',
    messages: [
      { id: 'a1', text: 'Olá Aline, pode enviar os arquivos?', timestamp: '08:00', fromMe: true },
      { id: 'a2', text: 'Os documentos já foram anexados no drive.', timestamp: '08:20', fromMe: false },
    ]
  }
];

const MOCK_INTERNAL_CONVERSATIONS: ChatConversation[] = [
  {
    id: 'team1',
    contactName: 'Dr. Marcos (Financeiro)',
    lastMessage: 'Marcos, o repasse do processo #452 foi feito?',
    timestamp: 'Ontem',
    unreadCount: 0,
    online: true,
    avatar: 'https://ui-avatars.com/api/?name=Marcos+Silva&background=A67C52&color=fff',
    messages: [
      { id: 't1', text: 'Marcos, o repasse do processo #452 foi feito?', timestamp: '16:00', fromMe: true },
    ]
  },
  {
    id: 'team2',
    contactName: 'Beatriz - Controladoria',
    lastMessage: 'Prazos da semana revisados. Tudo em dia.',
    timestamp: '09:15',
    unreadCount: 1,
    online: true,
    avatar: 'https://ui-avatars.com/api/?name=Beatriz+Luz&background=002B49&color=fff',
    messages: [
      { id: 'b1', text: 'Prazos da semana revisados. Tudo em dia.', timestamp: '09:15', fromMe: false },
    ]
  }
];

const EMOJIS = ['⚖️', '📋', '✅', '🤝', '📅', '🏛️', '💡', '👍', '😊', '📎'];
const TAG_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#64748b', '#A67C52'];

export const Chat: React.FC = () => {
  const [chatTab, setChatTab] = useState<'external' | 'internal'>('external');
  const [chatViewMode, setChatViewMode] = useState<'list' | 'kanban'>('list');
  const [externalConversations, setExternalConversations] = useState<ChatConversation[]>(() => {
    const saved = localStorage.getItem('lexhub_chat_external_v1');
    return saved ? JSON.parse(saved) : MOCK_EXTERNAL_CONVERSATIONS;
  });
  const [internalConversations, setInternalConversations] = useState<ChatConversation[]>(() => {
    const saved = localStorage.getItem('lexhub_chat_internal_v1');
    return saved ? JSON.parse(saved) : MOCK_INTERNAL_CONVERSATIONS;
  });

  const [contacts, setContacts] = useState<Contact[]>(() => {
    const saved = localStorage.getItem('lexhub_chat_contacts');
    return saved ? JSON.parse(saved) : MOCK_CONTACTS;
  });

  // Tags State
  const [tags, setTags] = useState<ChatTag[]>(() => {
    const saved = localStorage.getItem('lexhub_chat_tags');
    return saved ? JSON.parse(saved) : INITIAL_TAGS;
  });

  // Map of ChatID -> Array of TagIDs
  const [chatTagRelations, setChatTagRelations] = useState<Record<string, string[]>>(() => {
    const saved = localStorage.getItem('lexhub_chat_tag_relations');
    return saved ? JSON.parse(saved) : {};
  });

  const [filterTagId, setFilterTagId] = useState<string | null>(null);

  const currentConversations = (chatTab === 'external' ? externalConversations : internalConversations)
    .filter(chat => {
      if (!filterTagId) return true;
      return chatTagRelations[chat.id]?.includes(filterTagId);
    });

  const [selectedChat, setSelectedChat] = useState<ChatConversation | null>(null);
  const [newMessage, setNewMessage] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [syncingTool, setSyncingTool] = useState<string | null>(null);

  // Quick Replies State
  const [quickReplies, setQuickReplies] = useState<QuickReply[]>(INITIAL_QUICK_REPLIES);
  const [showQuickReplyMenu, setShowQuickReplyMenu] = useState(false);

  // Modals
  const [isQuickReplyModalOpen, setIsQuickReplyModalOpen] = useState(false);
  const [isTagsModalOpen, setIsTagsModalOpen] = useState(false);
  const [isNewActionModalOpen, setIsNewActionModalOpen] = useState(false);
  const [newActionTab, setNewActionTab] = useState<'chat' | 'contact' | 'import'>('chat');
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);

  // Transfer State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferStep, setTransferStep] = useState<'department' | 'agent'>('department');
  const [transferSelectedDept, setTransferSelectedDept] = useState<Department | null>(null);
  const [transferNote, setTransferNote] = useState('');
  const [chatAssignments, setChatAssignments] = useState<Record<string, { departmentId: string; departmentName: string; agentId: string; agentName: string; color: string }>>(() => {
    const saved = localStorage.getItem('lexhub_chat_assignments');
    return saved ? JSON.parse(saved) : {};
  });

  const [newQR, setNewQR] = useState({ command: '', text: '' });
  const [editingQRId, setEditingQRId] = useState<string | null>(null);

  const [newTagForm, setNewTagForm] = useState({ label: '', color: TAG_COLORS[2] });
  const [editingTagId, setEditingTagId] = useState<string | null>(null);

  // New Chat Form State
  const [newChatForm, setNewChatForm] = useState({
    contactId: '',
    initialMessage: '',
    type: 'external' as 'external' | 'internal'
  });

  // New Contact Form State
  const [newContactForm, setNewContactForm] = useState({
    name: '', phone: '', email: '', company: ''
  });

  const [showToast, setShowToast] = useState<string | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    localStorage.setItem('lexhub_chat_external_v1', JSON.stringify(externalConversations));
    localStorage.setItem('lexhub_chat_internal_v1', JSON.stringify(internalConversations));
    localStorage.setItem('lexhub_chat_tags', JSON.stringify(tags));
    localStorage.setItem('lexhub_chat_tag_relations', JSON.stringify(chatTagRelations));
    localStorage.setItem('lexhub_chat_contacts', JSON.stringify(contacts));
    localStorage.setItem('lexhub_chat_assignments', JSON.stringify(chatAssignments));
  }, [externalConversations, internalConversations, tags, chatTagRelations, contacts, chatAssignments]);

  useEffect(() => {
    if (showToast) {
      const timer = setTimeout(() => setShowToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [showToast]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [selectedChat, externalConversations, internalConversations]);

  useEffect(() => {
    if (newMessage.startsWith('/')) {
      setShowQuickReplyMenu(true);
    } else {
      setShowQuickReplyMenu(false);
    }
  }, [newMessage]);

  const handleSendMessage = (e?: React.FormEvent, textOverride?: string) => {
    if (e) e.preventDefault();
    const textToSend = textOverride || newMessage;
    if (!textToSend.trim() || !selectedChat) return;

    const msg: ChatMessage = {
      id: Date.now().toString(),
      text: textToSend,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fromMe: true
    };

    const updateFn = (prev: ChatConversation[]) => prev.map(c => {
      if (c.id === selectedChat.id) {
        const updated = {
          ...c,
          messages: [...c.messages, msg],
          lastMessage: textToSend,
          timestamp: 'Agora'
        };
        if (selectedChat.id === c.id) setSelectedChat(updated);
        return updated;
      }
      return c;
    });

    if (chatTab === 'external') setExternalConversations(updateFn);
    else setInternalConversations(updateFn);

    setNewMessage('');
    setIsEmojiPickerOpen(false);
    setShowQuickReplyMenu(false);
  };

  // --- NEW CHAT HANDLER ---
  const handleCreateNewChat = (e: React.FormEvent) => {
    e.preventDefault();
    const selectedContact = contacts.find(c => c.id === newChatForm.contactId);
    if (!selectedContact) return;

    const newChatId = `chat_${selectedContact.id}`;

    // Check if chat already exists
    const existing = (newChatForm.type === 'external' ? externalConversations : internalConversations)
      .find(c => c.id === newChatId);

    if (existing) {
      setSelectedChat(existing);
      setIsNewActionModalOpen(false);
      setIsSidebarOpen(false);
      setChatTab(newChatForm.type);
      return;
    }

    const initialMsgs: ChatMessage[] = [];
    if (newChatForm.initialMessage.trim()) {
      initialMsgs.push({
        id: `m_init_${Date.now()}`,
        text: newChatForm.initialMessage,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        fromMe: true
      });
    }

    const newChat: ChatConversation = {
      id: newChatId,
      contactName: selectedContact.name,
      lastMessage: newChatForm.initialMessage || 'Conversa iniciada',
      timestamp: 'Agora',
      unreadCount: 0,
      online: true,
      avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(selectedContact.name)}&background=${newChatForm.type === 'external' ? '002B49' : 'A67C52'}&color=fff`,
      messages: initialMsgs
    };

    if (newChatForm.type === 'external') {
      setExternalConversations([newChat, ...externalConversations]);
      setChatTab('external');
    } else {
      setInternalConversations([newChat, ...internalConversations]);
      setChatTab('internal');
    }

    setSelectedChat(newChat);
    setIsNewActionModalOpen(false);
    setNewChatForm({ contactId: '', initialMessage: '', type: 'external' });
    setIsSidebarOpen(false);
  };

  // --- NEW CONTACT HANDLER ---
  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    const newContact: Contact = {
      id: `c_${Date.now()}`,
      ...newContactForm
    };
    setContacts([newContact, ...contacts]);
    setNewContactForm({ name: '', phone: '', email: '', company: '' });
    setNewActionTab('chat');
    setNewChatForm(prev => ({ ...prev, contactId: newContact.id }));
    setShowToast('Contato criado com sucesso!');
  };

  // --- IMPORT/EXPORT HANDLERS ---
  const handleExportCSV = () => {
    const headers = ['Nome', 'Telefone', 'Email', 'Empresa'];
    const rows = contacts.map(c => [c.name, c.phone, c.email, c.company]);
    const csvContent = [headers, ...rows].map(e => e.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `contatos_lexhub_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setShowToast('Lista exportada com sucesso!');
  };

  const handleImportFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.csv';
    input.onchange = (e: any) => {
      const file = e.target.files?.[0];
      if (!file) return;

      setShowToast('Processando arquivo...');
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        try {
          const rows = text.split('\n').filter(r => r.trim());
          const imported: Contact[] = [];

          const startIndex = rows.length > 0 && rows[0].toLowerCase().includes('nome') ? 1 : 0;

          for (let i = startIndex; i < rows.length; i++) {
            // Basic CSV parsing splitting by comma, ignoring commas inside quotes could be complex but basic is fine for now
            const cols = rows[i].split(',');
            if (cols.length >= 2) {
              imported.push({
                id: `imp_${Date.now()}_${i}`,
                name: cols[0]?.trim() || 'Sem Nome',
                phone: cols[1]?.trim() || '',
                email: cols[2]?.trim() || '',
                company: cols[3]?.trim() || 'Importado'
              });
            }
          }

          if (imported.length > 0) {
            setContacts(prev => [...imported, ...prev]);
            setShowToast(`${imported.length} contatos importados com sucesso!`);
          } else {
            setShowToast('Nenhum contato válido encontrado no arquivo.');
          }
        } catch (error) {
          setShowToast('Erro ao ler o arquivo CSV.');
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  // --- TAG HANDLERS ---
  const handleCreateTag = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagForm.label) return;

    if (editingTagId) {
      setTags(tags.map(t => t.id === editingTagId ? { ...t, ...newTagForm } : t));
      setEditingTagId(null);
    } else {
      const tag: ChatTag = {
        id: `tag_${Date.now()}`,
        ...newTagForm
      };
      setTags([...tags, tag]);
    }
    setNewTagForm({ label: '', color: TAG_COLORS[2] });
  };

  const deleteTag = (id: string) => {
    setTags(tags.filter(t => t.id !== id));
    const newRelations = { ...chatTagRelations };
    Object.keys(newRelations).forEach(chatId => {
      newRelations[chatId] = newRelations[chatId].filter(tid => tid !== id);
    });
    setChatTagRelations(newRelations);
  };

  const toggleTagInChat = (chatId: string, tagId: string) => {
    const currentTags = chatTagRelations[chatId] || [];
    const updated = currentTags.includes(tagId)
      ? currentTags.filter(id => id !== tagId)
      : [...currentTags, tagId];

    setChatTagRelations({ ...chatTagRelations, [chatId]: updated });
  };

  const handleSelectQuickReply = (reply: QuickReply) => {
    setNewMessage(reply.text);
    setShowQuickReplyMenu(false);
    inputRef.current?.focus();
  };

  const handleSaveQuickReply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQR.command || !newQR.text) return;
    if (editingQRId) {
      setQuickReplies(prev => prev.map(qr => qr.id === editingQRId ? { ...qr, command: newQR.command.replace('/', ''), text: newQR.text } : qr));
      setEditingQRId(null);
    } else {
      const reply: QuickReply = { id: Date.now().toString(), command: newQR.command.replace('/', ''), text: newQR.text };
      setQuickReplies([...quickReplies, reply]);
    }
    setNewQR({ command: '', text: '' });
  };

  const handleSyncTool = (toolName: string) => {
    setSyncingTool(toolName);
    setTimeout(() => {
      setSyncingTool(null);
      setShowToast(`${toolName} sincronizado!`);
    }, 1200);
  };

  // --- TRANSFER HANDLERS ---
  const handleOpenTransfer = () => {
    setTransferStep('department');
    setTransferSelectedDept(null);
    setTransferNote('');
    setIsUserMenuOpen(false);
    setIsTransferModalOpen(true);
  };

  const handleConfirmTransfer = (agent: DeptAgent) => {
    if (!selectedChat || !transferSelectedDept) return;
    const systemMsg: ChatMessage = {
      id: `sys_${Date.now()}`,
      text: `__SYSTEM__ Atendimento transferido para ${agent.name} (${transferSelectedDept.name})${transferNote ? ` - "${transferNote}"` : ''}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      fromMe: false,
    };
    const updateFn = (prev: ChatConversation[]) => prev.map(c => {
      if (c.id === selectedChat.id) {
        const updated = { ...c, messages: [...c.messages, systemMsg] };
        setSelectedChat(updated);
        return updated;
      }
      return c;
    });
    if (chatTab === 'external') setExternalConversations(updateFn);
    else setInternalConversations(updateFn);
    setChatAssignments(prev => ({
      ...prev,
      [selectedChat.id]: {
        departmentId: transferSelectedDept.id,
        departmentName: transferSelectedDept.name,
        agentId: agent.id,
        agentName: agent.name,
        color: transferSelectedDept.color,
      }
    }));
    setIsTransferModalOpen(false);
    setShowToast(`Transferido para ${agent.name} (${transferSelectedDept.name})!`);
  };

  const filteredQuickReplies = quickReplies.filter(qr =>
    qr.command.toLowerCase().includes(newMessage.toLowerCase().substring(1))
  );

  // --- KANBAN LOGIC ---
  const handleDragStart = (e: React.DragEvent, chatId: string) => {
    e.dataTransfer.setData('chatId', chatId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent, targetTagId: string | null) => {
    e.preventDefault();
    const chatId = e.dataTransfer.getData('chatId');
    if (!chatId) return;

    const currentTags = chatTagRelations[chatId] || [];

    // Se "targetTagId" for null, significa que soltou na coluna "Sem Tag"
    // Removemos todas as outras tags de serviço principais para este exemplo simplificado,
    // ou mantemos o controle de trocar a tag do card.

    // Simplificando o Kanban: quando arrasta para uma coluna, ele SETA a tag da coluna 
    // e remove de outras tags do "Kanban" se for exclusivo. 
    // Para simplificar: apenas add a "targetTagId" e remove o resto.
    if (targetTagId === null) {
      setChatTagRelations({ ...chatTagRelations, [chatId]: [] });
      setShowToast('Card movido para "Sem Tag"');
    } else {
      setChatTagRelations({ ...chatTagRelations, [chatId]: [targetTagId] });
      setShowToast('Tag atualizada via Kanban!');
    }
  };

  return (
    <div className="h-[calc(100vh-140px)] bg-white dark:bg-slate-900 rounded-[3rem] border border-slate-200 dark:border-slate-800 shadow-xl overflow-hidden flex animate-in fade-in duration-700 relative">

      {showToast && (
        <div className="fixed top-24 right-8 z-[300] px-6 py-4 bg-emerald-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 animate-in slide-in-from-right duration-300">
          <Check size={20} />
          <p className="font-bold text-sm">{showToast}</p>
        </div>
      )}

      {/* Sidebar - Lista de Conversas */}
      <div className={`w-full md:w-80 lg:w-96 border-r border-slate-100 dark:border-slate-800 flex flex-col bg-slate-50/50 dark:bg-slate-900/50 ${!isSidebarOpen && 'hidden md:flex'}`}>
        <div className="p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-black text-legal-navy dark:text-white uppercase tracking-tighter">Mensagens</h2>
            <div className="flex gap-2">
              <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mr-2">
                <button
                  onClick={() => setChatViewMode('list')}
                  title="Modo Lista"
                  className={`p-1.5 rounded-lg transition-all ${chatViewMode === 'list' ? 'bg-white dark:bg-slate-700 shadow-sm text-legal-navy dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <List size={14} />
                </button>
                <button
                  onClick={() => setChatViewMode('kanban')}
                  title="Modo Kanban"
                  className={`p-1.5 rounded-lg transition-all ${chatViewMode === 'kanban' ? 'bg-white dark:bg-slate-700 shadow-sm text-legal-navy dark:text-white' : 'text-slate-400 hover:text-slate-600'}`}
                >
                  <KanbanSquare size={14} />
                </button>
              </div>
              <button
                onClick={() => setIsTagsModalOpen(true)}
                title="Gerenciar Etiquetas"
                className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:bg-legal-bronze hover:text-white text-legal-bronze transition-all"
              >
                <Tag size={16} />
              </button>
              <button
                onClick={() => setIsQuickReplyModalOpen(true)}
                title="Respostas Rápidas"
                className="p-2 bg-white dark:bg-slate-800 rounded-xl shadow-sm hover:bg-legal-navy hover:text-white text-slate-500 transition-all"
              >
                <Zap size={16} />
              </button>
              <button
                onClick={() => { setNewActionTab('chat'); setIsNewActionModalOpen(true); }}
                title="Novo Chat / Contato"
                className="p-2 bg-legal-navy text-white rounded-xl shadow-lg hover:bg-legal-bronze transition-all"
              >
                <Plus size={16} />
              </button>
            </div>
          </div>

          <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl">
            <button
              onClick={() => { setChatTab('external'); setSelectedChat(null); setFilterTagId(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chatTab === 'external' ? 'bg-white dark:bg-slate-700 text-legal-navy dark:text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <MessageCircle size={14} /> WhatsApp
            </button>
            <button
              onClick={() => { setChatTab('internal'); setSelectedChat(null); setFilterTagId(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${chatTab === 'internal' ? 'bg-legal-bronze text-white shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}
            >
              <Users size={14} /> Equipe
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
            <button
              onClick={() => setFilterTagId(null)}
              className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all shrink-0 ${!filterTagId ? 'bg-legal-navy text-white border-legal-navy' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-400'}`}
            >
              Todos
            </button>
            {tags.map(tag => (
              <button
                key={tag.id}
                onClick={() => setFilterTagId(tag.id === filterTagId ? null : tag.id)}
                className={`px-3 py-1 rounded-full text-[9px] font-black uppercase border transition-all shrink-0`}
                style={{
                  backgroundColor: filterTagId === tag.id ? tag.color : 'transparent',
                  color: filterTagId === tag.id ? '#fff' : tag.color,
                  borderColor: tag.color
                }}
              >
                {tag.label}
              </button>
            ))}
          </div>

          <div className="relative">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
            <input
              type="text"
              placeholder="Buscar conversas..."
              className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-xs font-bold focus:ring-4 focus:ring-legal-navy/5 outline-none transition-all dark:text-white"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto px-4 space-y-2">
          {currentConversations.map(chat => {
            const chatTags = (chatTagRelations[chat.id] || [])
              .map(tid => tags.find(t => t.id === tid))
              .filter(Boolean) as ChatTag[];

            return (
              <button
                key={chat.id}
                onClick={() => { setSelectedChat(chat); setIsSidebarOpen(false); }}
                className={`w-full p-4 rounded-3xl flex items-center gap-4 transition-all text-left group ${selectedChat?.id === chat.id ? 'bg-white dark:bg-slate-800 shadow-xl shadow-slate-200/50 dark:shadow-black/50 ring-1 ring-slate-100 dark:ring-slate-700' : 'hover:bg-white/40 dark:hover:bg-slate-800/40'}`}
              >
                <div className="relative shrink-0">
                  <img src={chat.avatar} alt={chat.contactName} className="w-12 h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-700" />
                  {chat.online && <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 border-4 border-white dark:border-slate-800 rounded-full"></div>}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <h4 className={`font-black text-sm truncate ${selectedChat?.id === chat.id ? 'text-legal-navy dark:text-legal-bronze' : 'text-slate-700 dark:text-slate-200'}`}>{chat.contactName}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{chat.timestamp}</span>
                  </div>
                  <div className="flex justify-between items-center mb-1">
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-medium truncate italic flex-1">
                      {chat.lastMessage}
                    </p>
                    {chat.unreadCount > 0 && (
                      <span className="bg-legal-bronze text-white text-[10px] font-black px-2 py-0.5 rounded-full ml-2">{chat.unreadCount}</span>
                    )}
                  </div>
                  {chatTags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {chatTags.map(t => (
                        <div key={t.id} className="w-2 h-2 rounded-full" style={{ backgroundColor: t.color }} title={t.label} />
                      ))}
                    </div>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Área Principal de Chat / Kanban */}
      <div className={`flex-1 flex flex-col bg-white dark:bg-slate-900 ${isSidebarOpen && 'hidden md:flex'}`}>
        {selectedChat && chatViewMode === 'list' ? (
          <>
            <div className="p-4 md:p-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-3 md:gap-4">
                <button
                  onClick={() => setIsSidebarOpen(true)}
                  className="md:hidden p-2 text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 rounded-xl"
                >
                  <ArrowLeft size={20} />
                </button>
                <img src={selectedChat.avatar} alt={selectedChat.contactName} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl object-cover border border-slate-100 dark:border-slate-700" />
                <div className="hidden sm:block">
                  <h3 className="font-black text-legal-navy dark:text-white leading-none mb-1 text-sm md:text-base">{selectedChat.contactName}</h3>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-[9px] md:text-[10px] font-black text-emerald-500 uppercase tracking-widest flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></div>
                      {chatTab === 'external' ? 'WhatsApp' : 'Online'}
                    </p>
                    {chatAssignments[selectedChat.id] && (
                      <button
                        onClick={handleOpenTransfer}
                        className="flex items-center gap-1 text-[8px] font-black uppercase px-2 py-0.5 rounded-full text-white transition-opacity hover:opacity-80"
                        style={{ backgroundColor: chatAssignments[selectedChat.id].color }}
                        title={`Responsável: ${chatAssignments[selectedChat.id].agentName} — clique para transferir`}
                      >
                        <ArrowRightLeft size={8} />
                        {chatAssignments[selectedChat.id].agentName.split(' ')[0]} · {chatAssignments[selectedChat.id].departmentName}
                      </button>
                    )}
                    <div className="flex gap-1">
                      {(chatTagRelations[selectedChat.id] || []).map(tid => {
                        const t = tags.find(tag => tag.id === tid);
                        if (!t) return null;
                        return <span key={t.id} className="text-[8px] font-black uppercase px-1.5 py-0.5 rounded text-white" style={{ backgroundColor: t.color }}>{t.label}</span>;
                      })}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 md:gap-2">
                <div className="flex items-center gap-1 mr-1 md:mr-4 px-2 py-1 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700">
                  <button onClick={() => handleSyncTool('Google Calendar')} className="p-2 text-blue-500 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all">
                    {syncingTool === 'Google Calendar' ? <Loader2 size={18} className="animate-spin" /> : <Calendar size={18} />}
                  </button>
                  <button onClick={() => handleSyncTool('Dropbox')} className="p-2 text-sky-500 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all">
                    {syncingTool === 'Dropbox' ? <Loader2 size={18} className="animate-spin" /> : <FolderOpen size={18} />}
                  </button>
                  <button onClick={() => handleSyncTool('Trello')} className="p-2 text-indigo-600 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all">
                    {syncingTool === 'Trello' ? <Loader2 size={18} className="animate-spin" /> : <Layout size={18} />}
                  </button>
                </div>

                <div className="relative">
                  <button
                    onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
                    className={`p-2 md:p-3 rounded-2xl transition-all ${isUserMenuOpen ? 'bg-legal-navy text-white' : 'text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                  >
                    <MoreVertical size={20} />
                  </button>

                  {isUserMenuOpen && (
                    <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 py-2 z-30 animate-in slide-in-from-top-2">
                      <div className="px-4 py-2 border-b border-slate-50 dark:border-slate-700 mb-2">
                        <p className="text-[10px] font-black text-slate-400 uppercase mb-2">Gerenciar Etiquetas</p>
                        <div className="flex flex-wrap gap-1">
                          {tags.map(t => {
                            const isActive = chatTagRelations[selectedChat.id]?.includes(t.id);
                            return (
                              <button
                                key={t.id}
                                onClick={() => toggleTagInChat(selectedChat.id, t.id)}
                                className={`px-2 py-1 rounded text-[9px] font-black uppercase transition-all border ${isActive ? 'text-white' : 'bg-transparent'}`}
                                style={{
                                  backgroundColor: isActive ? t.color : 'transparent',
                                  borderColor: t.color,
                                  color: isActive ? '#fff' : t.color
                                }}
                              >
                                {t.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                      <button className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <UserCircle size={16} className="text-legal-bronze" /> Ver Perfil
                      </button>
                      <button
                        onClick={handleOpenTransfer}
                        className="w-full px-4 py-2.5 text-left text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 flex items-center gap-3 transition-colors"
                      >
                        <ArrowRightLeft size={16} className="text-indigo-500" /> Transferir Atendimento
                      </button>
                      <button className="w-full px-4 py-2.5 text-left text-sm font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 flex items-center gap-3">
                        <Archive size={16} className="text-slate-400" /> Arquivar
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6 bg-slate-50/30 dark:bg-slate-900/30">
              {selectedChat.messages.map((msg) => {
                const isSystem = msg.text.startsWith('__SYSTEM__');
                if (isSystem) {
                  const displayText = msg.text.replace('__SYSTEM__', '').trim();
                  return (
                    <div key={msg.id} className="flex justify-center animate-in fade-in duration-500">
                      <div className="flex items-center gap-2 px-4 py-2 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-full shadow-sm max-w-[90%]">
                        <ArrowRightLeft size={12} className="text-indigo-500 shrink-0" />
                        <p className="text-[10px] font-bold text-indigo-600 dark:text-indigo-300 text-center">{displayText}</p>
                        <span className="text-[9px] text-indigo-400 shrink-0">{msg.timestamp}</span>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={msg.id} className={`flex ${msg.fromMe ? 'justify-end' : 'justify-start'} animate-in slide-in-from-bottom-2 duration-300`}>
                    <div className={`max-w-[85%] md:max-w-[75%] px-4 md:px-5 py-3 rounded-2xl md:rounded-3xl shadow-sm ${msg.fromMe
                      ? 'bg-legal-navy dark:bg-legal-bronze text-white rounded-tr-none'
                      : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-100 dark:border-slate-700 rounded-tl-none'
                      }`}>
                      <p className="text-sm font-medium leading-relaxed">{msg.text}</p>
                      <div className={`flex items-center justify-end gap-1.5 mt-2 ${msg.fromMe ? 'text-white/40' : 'text-slate-300 dark:text-slate-500'}`}>
                        <span className="text-[10px] font-bold uppercase">{msg.timestamp}</span>
                        {msg.fromMe && <CheckCheck size={12} />}
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            <div className="p-4 md:p-6 bg-white dark:bg-slate-900 border-t border-slate-50 dark:border-slate-800 relative">
              {showQuickReplyMenu && filteredQuickReplies.length > 0 && (
                <div className="absolute bottom-full left-6 right-6 mb-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-2xl overflow-hidden z-40 animate-in slide-in-from-bottom-4">
                  {filteredQuickReplies.map(qr => (
                    <button key={qr.id} onClick={() => handleSelectQuickReply(qr)} className="w-full p-4 flex items-center gap-4 hover:bg-slate-50 dark:hover:bg-slate-700 border-b border-slate-50 dark:border-slate-700 text-left transition-all">
                      <span className="text-xs font-black text-legal-bronze uppercase shrink-0 min-w-[60px]">/{qr.command}</span>
                      <p className="text-sm font-medium text-slate-600 dark:text-slate-400 truncate flex-1">{qr.text}</p>
                    </button>
                  ))}
                </div>
              )}

              <form onSubmit={handleSendMessage} className="flex items-center gap-2 md:gap-4">
                <button type="button" onClick={() => setIsEmojiPickerOpen(!isEmojiPickerOpen)} className="p-2 md:p-3 text-slate-400 hover:text-legal-navy hover:bg-slate-50 dark:hover:bg-slate-800 rounded-2xl">
                  <Smile size={20} />
                </button>
                <input
                  type="text"
                  ref={inputRef}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Envie uma mensagem (use '/' para atalhos)..."
                  className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-[2rem] px-4 md:px-6 py-3 md:py-4 text-sm font-medium outline-none focus:ring-4 focus:ring-legal-navy/5 dark:text-white"
                />
                <button type="submit" disabled={!newMessage.trim()} className="p-3 md:p-4 bg-legal-navy text-white rounded-[2rem] shadow-xl disabled:opacity-50">
                  <Send size={20} fill="currentColor" />
                </button>
              </form>
            </div>
          </>
        ) : chatViewMode === 'kanban' ? (
          <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-900/50 overflow-hidden">
            <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900">
              <div>
                <h3 className="text-2xl font-black text-legal-navy dark:text-white flex items-center gap-3">
                  <KanbanSquare size={24} className="text-legal-bronze" />
                  Kanban de Atendimentos
                </h3>
                <p className="text-slate-500 text-sm font-medium mt-1">Organize conversas processuais arrastando entre as etapas.</p>
              </div>
            </div>
            <div className="flex-1 overflow-x-auto overflow-y-hidden p-6 flex items-start gap-6 custom-scrollbar">
              {/* Coluna Sem Tag (Caixa de Entrada) */}
              <div
                className="w-80 shrink-0 flex flex-col max-h-full"
                onDragOver={handleDragOver}
                onDrop={(e) => handleDrop(e, null)}
              >
                <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-slate-300"></span>
                    <h4 className="font-bold text-sm text-slate-800 dark:text-white">Sem Etiqueta</h4>
                  </div>
                  <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-[10px] px-2 py-0.5 rounded-full">
                    {currentConversations.filter(c => !chatTagRelations[c.id] || chatTagRelations[c.id].length === 0).length}
                  </span>
                </div>
                <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-4 min-h-[300px]">
                  {currentConversations.filter(c => !chatTagRelations[c.id] || chatTagRelations[c.id].length === 0).map(chat => (
                    <div
                      key={chat.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, chat.id)}
                      onClick={() => { setSelectedChat(chat); setChatViewMode('list'); }}
                      className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-legal-bronze transition-all group"
                    >
                      <div className="flex items-center gap-3 mb-3">
                        <img src={chat.avatar} alt="" className="w-8 h-8 rounded-xl" />
                        <div className="flex-1 min-w-0">
                          <h5 className="font-black text-xs text-slate-800 dark:text-white truncate">{chat.contactName}</h5>
                          <p className="text-[9px] font-bold text-slate-400">{chat.timestamp}</p>
                        </div>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 italic">"{chat.lastMessage}"</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Colunas por Tag */}
              {tags.map(tag => {
                const chatsInTag = currentConversations.filter(c => chatTagRelations[c.id]?.includes(tag.id));
                return (
                  <div
                    key={tag.id}
                    className="w-80 shrink-0 flex flex-col max-h-full"
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, tag.id)}
                  >
                    <div className="flex items-center justify-between mb-4 bg-white dark:bg-slate-800 p-3 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm" style={{ borderTop: `4px solid ${tag.color}` }}>
                      <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: tag.color }}></span>
                        <h4 className="font-bold text-sm text-slate-800 dark:text-white">{tag.label}</h4>
                      </div>
                      <span className="bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-[10px] px-2 py-0.5 rounded-full">
                        {chatsInTag.length}
                      </span>
                    </div>
                    <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar pb-4 min-h-[300px]">
                      {chatsInTag.map(chat => (
                        <div
                          key={chat.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, chat.id)}
                          onClick={() => { setSelectedChat(chat); setChatViewMode('list'); }}
                          className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm cursor-grab active:cursor-grabbing hover:border-legal-bronze transition-all group"
                        >
                          <div className="flex items-center gap-3 mb-3">
                            <img src={chat.avatar} alt="" className="w-8 h-8 rounded-xl" />
                            <div className="flex-1 min-w-0">
                              <h5 className="font-black text-xs text-slate-800 dark:text-white truncate">{chat.contactName}</h5>
                              <p className="text-[9px] font-bold text-slate-400">{chat.timestamp}</p>
                            </div>
                            {chat.unreadCount > 0 && <span className="bg-legal-bronze text-white text-[9px] font-black px-1.5 py-0.5 rounded-full">{chat.unreadCount}</span>}
                          </div>
                          <p className="text-xs text-slate-500 line-clamp-2 italic mb-3">"{chat.lastMessage}"</p>
                          <div className="flex justify-end gap-1">
                            <span className="text-[8px] font-black uppercase px-2 py-0.5 rounded text-white" style={{ backgroundColor: tag.color }}>{tag.label}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center p-10 text-center space-y-6">
            <MessageCircle size={64} className="text-slate-200" />
            <div>
              <h3 className="text-xl font-black text-legal-navy dark:text-white">Selecione uma conversa</h3>
              <p className="text-slate-500 text-sm">Gerencie seus atendimentos de forma organizada.</p>
            </div>
          </div>
        )}
      </div>

      {/* MODAL: TRANSFERÊNCIA DE ATENDIMENTO */}
      {isTransferModalOpen && (
        <div className="fixed inset-0 z-[260] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsTransferModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
            {/* Header */}
            <div className="bg-gradient-to-r from-indigo-700 to-indigo-500 p-6 text-white relative shrink-0">
              <button onClick={() => setIsTransferModalOpen(false)} className="absolute top-4 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={22} />
              </button>
              <div className="flex items-center gap-4 mb-5">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shadow-lg">
                  <ArrowRightLeft size={26} />
                </div>
                <div>
                  <h3 className="text-xl font-bold">Transferir Atendimento</h3>
                  <p className="text-white/70 text-[10px] font-bold uppercase tracking-widest">
                    {selectedChat?.contactName}
                  </p>
                </div>
              </div>
              {/* Breadcrumb steps */}
              <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest">
                <span className={`px-3 py-1.5 rounded-full transition-all ${transferStep === 'department' ? 'bg-white text-indigo-700 shadow' : 'bg-white/20 text-white/60'
                  }`}>1. Departamento</span>
                <ChevronRight size={12} className="text-white/40" />
                <span className={`px-3 py-1.5 rounded-full transition-all ${transferStep === 'agent' ? 'bg-white text-indigo-700 shadow' : 'bg-white/20 text-white/60'
                  }`}>2. Responsável</span>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4 custom-scrollbar">

              {/* STEP 1: Selecionar Departamento */}
              {transferStep === 'department' && (
                <div className="animate-in slide-in-from-left duration-300 space-y-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Selecione o departamento de destino:</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {DEPARTMENTS.map(dept => {
                      const onlineCount = dept.agents.filter(a => a.status === 'online').length;
                      return (
                        <button
                          key={dept.id}
                          onClick={() => { setTransferSelectedDept(dept); setTransferStep('agent'); }}
                          className="p-5 rounded-2xl border-2 text-left hover:shadow-lg transition-all group relative overflow-hidden"
                          style={{ borderColor: `${dept.color}40`, backgroundColor: dept.bgColor }}
                        >
                          <div
                            className="absolute right-0 top-0 w-24 h-24 rounded-full opacity-10 -translate-y-6 translate-x-6 group-hover:opacity-20 transition-opacity"
                            style={{ backgroundColor: dept.color }}
                          />
                          <div className="flex items-center gap-3 mb-3">
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center shadow-sm" style={{ backgroundColor: dept.color }}>
                              <Building2 size={20} className="text-white" />
                            </div>
                            <div>
                              <h4 className="font-black text-slate-800 dark:text-white text-sm">{dept.name}</h4>
                              <p className="text-[10px] font-bold" style={{ color: dept.color }}>
                                {onlineCount} agente{onlineCount !== 1 ? 's' : ''} online
                              </p>
                            </div>
                          </div>
                          <div className="flex -space-x-2">
                            {dept.agents.slice(0, 3).map(a => (
                              <img
                                key={a.id}
                                src={a.avatar}
                                alt={a.name}
                                title={`${a.name} (${a.status})`}
                                className="w-7 h-7 rounded-full border-2 border-white"
                              />
                            ))}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* STEP 2: Selecionar Agente */}
              {transferStep === 'agent' && transferSelectedDept && (
                <div className="animate-in slide-in-from-right duration-300 space-y-4">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setTransferStep('department')}
                      className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg transition-all"
                    >
                      <ArrowLeft size={16} />
                    </button>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      Agentes disponíveis em <span className="font-black" style={{ color: transferSelectedDept.color }}>{transferSelectedDept.name}</span>:
                    </p>
                  </div>

                  <div className="space-y-2">
                    {transferSelectedDept.agents.map(agent => {
                      const statusConfig = {
                        online: { label: 'Online', dot: 'bg-emerald-500', text: 'text-emerald-600' },
                        busy: { label: 'Ocupado', dot: 'bg-amber-500', text: 'text-amber-600' },
                        offline: { label: 'Offline', dot: 'bg-slate-300', text: 'text-slate-400' },
                      }[agent.status];
                      const isOffline = agent.status === 'offline';
                      return (
                        <button
                          key={agent.id}
                          onClick={() => !isOffline && handleConfirmTransfer(agent)}
                          disabled={isOffline}
                          className={`w-full p-4 rounded-2xl border flex items-center gap-4 transition-all text-left ${isOffline
                            ? 'opacity-50 cursor-not-allowed bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700'
                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-indigo-300 hover:shadow-md hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10'
                            }`}
                        >
                          <div className="relative shrink-0">
                            <img src={agent.avatar} alt={agent.name} className="w-12 h-12 rounded-2xl object-cover" />
                            <div className={`absolute -bottom-1 -right-1 w-4 h-4 ${statusConfig.dot} border-2 border-white dark:border-slate-800 rounded-full`} />
                          </div>
                          <div className="flex-1">
                            <h4 className="font-black text-sm text-slate-800 dark:text-white">{agent.name}</h4>
                            <p className={`text-[10px] font-bold uppercase ${statusConfig.text}`}>{statusConfig.label}</p>
                          </div>
                          {!isOffline && (
                            <div
                              className="px-4 py-2 rounded-xl text-[10px] font-black uppercase text-white flex items-center gap-1.5 shrink-0"
                              style={{ backgroundColor: transferSelectedDept.color }}
                            >
                              <ArrowRightLeft size={12} />
                              Transferir
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>

                  {/* Nota opcional */}
                  <div className="space-y-1 pt-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nota para o responsável (opcional)</label>
                    <textarea
                      placeholder="Ex: Cliente aguarda retorno sobre processo de indenização..."
                      className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 outline-none dark:text-white resize-none h-20"
                      value={transferNote}
                      onChange={e => setTransferNote(e.target.value)}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: NOVA AÇÃO (+) - MULTI TAB */}
      {isNewActionModalOpen && (
        <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsNewActionModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col">
            <div className="bg-legal-navy p-6 text-white relative shrink-0">
              <button onClick={() => setIsNewActionModalOpen(false)} className="absolute top-4 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
              <div className="flex items-center gap-4 mb-6">
                <div className="w-12 h-12 bg-legal-bronze rounded-xl flex items-center justify-center shadow-lg"><Plus size={28} /></div>
                <div>
                  <h3 className="text-xl font-bold">Gestão de Contatos & Chat</h3>
                  <p className="text-white/60 text-[10px] font-bold uppercase tracking-widest">Inicie interações ou gerencie sua base</p>
                </div>
              </div>

              <div className="flex gap-2 p-1 bg-white/10 rounded-2xl">
                <button
                  onClick={() => setNewActionTab('chat')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newActionTab === 'chat' ? 'bg-white text-legal-navy' : 'text-white/60'}`}
                >
                  <MessageSquareText size={14} /> Iniciar Chat
                </button>
                <button
                  onClick={() => setNewActionTab('contact')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newActionTab === 'contact' ? 'bg-white text-legal-navy' : 'text-white/60'}`}
                >
                  <UserPlus size={14} /> Novo Contato
                </button>
                <button
                  onClick={() => setNewActionTab('import')}
                  className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${newActionTab === 'import' ? 'bg-white text-legal-navy' : 'text-white/60'}`}
                >
                  <FileSpreadsheet size={14} /> Importar/Exportar
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-8 bg-white dark:bg-slate-900 custom-scrollbar">
              {/* TAB: NOVO CHAT */}
              {newActionTab === 'chat' && (
                <form onSubmit={handleCreateNewChat} className="space-y-6 animate-in slide-in-from-left duration-300">
                  <div className="space-y-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Canal de Atendimento</label>
                      <div className="flex p-1 bg-slate-50 dark:bg-slate-800 rounded-2xl">
                        <button
                          type="button"
                          onClick={() => setNewChatForm({ ...newChatForm, type: 'external' })}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${newChatForm.type === 'external' ? 'bg-white dark:bg-slate-700 text-legal-navy dark:text-white shadow-sm' : 'text-slate-400'}`}
                        >
                          <MessageCircle size={14} /> WhatsApp
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewChatForm({ ...newChatForm, type: 'internal' })}
                          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-[10px] font-black uppercase transition-all ${newChatForm.type === 'internal' ? 'bg-legal-bronze text-white shadow-sm' : 'text-slate-400'}`}
                        >
                          <Users size={14} /> Equipe
                        </button>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Selecionar Contato</label>
                      <select
                        required
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 outline-none dark:text-white"
                        value={newChatForm.contactId}
                        onChange={(e) => setNewChatForm({ ...newChatForm, contactId: e.target.value })}
                      >
                        <option value="">Selecione um contato...</option>
                        {contacts.map(c => <option key={c.id} value={c.id}>{c.name} ({c.phone})</option>)}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Mensagem Inicial</label>
                      <textarea
                        placeholder="Olá, como posso ajudar hoje?"
                        className="w-full px-5 py-3.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-legal-navy/5 outline-none dark:text-white resize-none h-24"
                        value={newChatForm.initialMessage}
                        onChange={(e) => setNewChatForm({ ...newChatForm, initialMessage: e.target.value })}
                      />
                    </div>
                  </div>

                  <button type="submit" className="w-full py-4 bg-legal-navy text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2">
                    <MessageSquareText size={18} /> Abrir Conversa
                  </button>
                </form>
              )}

              {/* TAB: NOVO CONTATO */}
              {newActionTab === 'contact' && (
                <form onSubmit={handleCreateContact} className="space-y-4 animate-in slide-in-from-right duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome Completo</label>
                      <input required type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" value={newContactForm.name} onChange={e => setNewContactForm({ ...newContactForm, name: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Telefone (WhatsApp)</label>
                      <input required type="text" placeholder="+55 (11) 9..." className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" value={newContactForm.phone} onChange={e => setNewContactForm({ ...newContactForm, phone: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">E-mail</label>
                      <input type="email" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" value={newContactForm.email} onChange={e => setNewContactForm({ ...newContactForm, email: e.target.value })} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Empresa / Grupo</label>
                      <input type="text" className="w-full px-5 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold dark:text-white" value={newContactForm.company} onChange={e => setNewContactForm({ ...newContactForm, company: e.target.value })} />
                    </div>
                  </div>
                  <button type="submit" className="w-full mt-4 py-4 bg-legal-bronze text-white rounded-2xl font-bold shadow-xl flex items-center justify-center gap-2 hover:brightness-110">
                    <Save size={18} /> Salvar Contato
                  </button>
                </form>
              )}

              {/* TAB: IMPORT/EXPORT */}
              {newActionTab === 'import' && (
                <div className="space-y-8 animate-in zoom-in-95 duration-300">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4 hover:border-legal-navy transition-all group cursor-pointer" onClick={handleImportFile}>
                      <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform"><UploadCloud size={32} className="text-legal-navy" /></div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Importar Lista</h4>
                        <p className="text-xs text-slate-400">Arraste um CSV ou clique para subir sua base de clientes.</p>
                      </div>
                    </div>

                    <div className="p-8 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-center space-y-4 hover:border-legal-bronze transition-all group cursor-pointer" onClick={handleExportCSV}>
                      <div className="w-16 h-16 bg-white dark:bg-slate-700 rounded-2xl flex items-center justify-center mx-auto shadow-sm group-hover:scale-110 transition-transform"><Download size={32} className="text-legal-bronze" /></div>
                      <div>
                        <h4 className="font-bold text-slate-900 dark:text-white">Exportar Contatos</h4>
                        <p className="text-xs text-slate-400">Baixe todos os contatos em formato CSV compatível com Excel.</p>
                      </div>
                    </div>
                  </div>

                  <div className="p-6 bg-amber-50 dark:bg-amber-900/20 rounded-2xl border border-amber-100 dark:border-amber-800 flex items-start gap-4">
                    <AlertCircle className="text-amber-600 shrink-0" size={20} />
                    <p className="text-[10px] text-amber-700 dark:text-amber-300 font-bold uppercase leading-relaxed">Nota: A importação deve seguir o modelo padrão LexHub. Nomes, telefones com DDI (+55) e e-mails são campos essenciais para o funcionamento dos Agentes de IA.</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GESTÃO DE ETIQUETAS */}
      {isTagsModalOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsTagsModalOpen(false)}></div>
          <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-lg overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[85vh]">
            <div className="bg-legal-navy p-8 text-white relative flex-shrink-0">
              <button onClick={() => setIsTagsModalOpen(false)} className="absolute top-6 right-6 p-2 hover:bg-white/10 rounded-full transition-colors">
                <X size={24} />
              </button>
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg"><Tag size={32} /></div>
                <div>
                  <h3 className="text-2xl font-bold">Gerenciar Etiquetas</h3>
                  <p className="text-white/60 text-xs font-bold uppercase tracking-widest">Organização por Categorias</p>
                </div>
              </div>
            </div>

            <div className="p-8 flex-1 overflow-y-auto space-y-8 custom-scrollbar">
              <form onSubmit={handleCreateTag} className="p-6 bg-slate-50 dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 space-y-4">
                <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">{editingTagId ? 'Editar Etiqueta' : 'Nova Etiqueta'}</h4>
                <div className="space-y-3">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Nome da Etiqueta</label>
                    <input
                      required
                      type="text"
                      placeholder="Ex: Urgente, Documentação..."
                      className="w-full px-5 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-bold focus:ring-4 focus:ring-legal-navy/5 outline-none dark:text-white"
                      value={newTagForm.label}
                      onChange={(e) => setNewTagForm({ ...newTagForm, label: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest ml-1">Cor de Identificação</label>
                    <div className="flex flex-wrap gap-2">
                      {TAG_COLORS.map(color => (
                        <button
                          key={color}
                          type="button"
                          onClick={() => setNewTagForm({ ...newTagForm, color })}
                          className={`w-8 h-8 rounded-full border-4 transition-all ${newTagForm.color === color ? 'border-slate-900 scale-110 shadow-lg' : 'border-transparent'}`}
                          style={{ backgroundColor: color }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button type="submit" className="flex-1 py-3 bg-legal-navy text-white rounded-xl font-bold text-xs shadow-lg hover:brightness-110 transition-all uppercase tracking-widest">
                    {editingTagId ? 'Salvar Alteração' : 'Criar Etiqueta'}
                  </button>
                  {editingTagId && (
                    <button
                      type="button"
                      onClick={() => { setEditingTagId(null); setNewTagForm({ label: '', color: TAG_COLORS[2] }); }}
                      className="px-4 py-3 bg-white dark:bg-slate-700 text-slate-400 rounded-xl font-bold text-xs border border-slate-200 dark:border-slate-600 transition-all uppercase tracking-widest"
                    >
                      Cancelar
                    </button>
                  )}
                </div>
              </form>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Etiquetas Cadastradas</h4>
                <div className="grid grid-cols-1 gap-3">
                  {tags.map(tag => (
                    <div key={tag.id} className="p-4 bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 rounded-2xl flex items-center justify-between group hover:shadow-md transition-all">
                      <div className="flex items-center gap-3">
                        <div className="w-4 h-4 rounded-full shadow-inner" style={{ backgroundColor: tag.color }} />
                        <span className="font-bold text-sm text-slate-700 dark:text-slate-300">{tag.label}</span>
                      </div>
                      <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => { setEditingTagId(tag.id); setNewTagForm({ label: tag.label, color: tag.color }); }}
                          className="p-2 text-slate-400 hover:text-legal-navy transition-all"
                        >
                          <Edit3 size={16} />
                        </button>
                        <button
                          onClick={() => deleteTag(tag.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 transition-all"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: RESPOSTAS RÁPIDAS */}
      {
        isQuickReplyModalOpen && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-md animate-in fade-in" onClick={() => setIsQuickReplyModalOpen(false)}></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-2xl w-full max-w-2xl overflow-hidden animate-in zoom-in-95 flex flex-col max-h-[90vh]">
              <div className="bg-legal-navy p-8 text-white relative flex-shrink-0">
                <button onClick={() => setIsQuickReplyModalOpen(false)} className="absolute top-8 right-8 p-2 hover:bg-white/10 rounded-full transition-colors">
                  <X size={24} />
                </button>
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 bg-legal-bronze rounded-2xl flex items-center justify-center shadow-lg">
                    <Zap size={32} />
                  </div>
                  <div>
                    <h3 className="text-2xl font-bold">Respostas Rápidas</h3>
                    <p className="text-white/60 text-sm tracking-tight uppercase font-bold">Atalhos de Atendimento</p>
                  </div>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                <div className={`p-6 rounded-[2rem] border space-y-4 transition-all bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700`}>
                  <h4 className="text-sm font-black text-legal-navy dark:text-white uppercase flex items-center gap-2">
                    {editingQRId ? <Edit3 size={16} className="text-amber-600" /> : <Plus size={16} />}
                    {editingQRId ? 'Editando Atalho' : 'Novo Atalho'}
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="md:col-span-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Comando (barra)</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">/</span>
                        <input type="text" placeholder="ola" className="w-full pl-8 pr-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-bold outline-none dark:text-white" value={newQR.command} onChange={(e) => setNewQR({ ...newQR, command: e.target.value.toLowerCase() })} />
                      </div>
                    </div>
                    <div className="md:col-span-2">
                      <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Texto da Resposta</label>
                      <textarea placeholder="Digite o texto que substituirá o atalho..." className="w-full px-4 py-3.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-sm font-medium outline-none resize-none h-20 dark:text-white" value={newQR.text} onChange={(e) => setNewQR({ ...newQR, text: e.target.value })} />
                    </div>
                  </div>
                  <button onClick={handleSaveQuickReply} disabled={!newQR.command || !newQR.text} className={`w-full py-3.5 text-white rounded-xl font-bold text-sm shadow-xl bg-legal-navy hover:brightness-110 disabled:opacity-50`}>
                    {editingQRId ? 'Salvar Alterações' : 'Criar Resposta Rápida'}
                  </button>
                </div>

                <div className="space-y-4">
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 dark:border-slate-800 pb-2">Seus Atalhos</h4>
                  <div className="grid grid-cols-1 gap-3">
                    {quickReplies.map(qr => (
                      <div key={qr.id} className="p-4 bg-white dark:bg-slate-800 border rounded-2xl flex items-center justify-between group hover:shadow-lg transition-all border-slate-100 dark:border-slate-700">
                        <div className="flex-1 min-w-0 pr-4">
                          <span className="text-xs font-black text-legal-bronze uppercase block mb-1">/{qr.command}</span>
                          <p className="text-sm text-slate-600 dark:text-slate-400 truncate">{qr.text}</p>
                        </div>
                        <div className="flex items-center gap-2">
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
    </div>
  );
};
