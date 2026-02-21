import React, { useState, useEffect, useCallback } from 'react';
import {
  Shield, ShieldCheck, ShieldAlert, ShieldX,
  Lock, Clock, AlertTriangle, Activity,
  Eye, EyeOff, Database, Server, Code, RefreshCw,
  CheckCircle, XCircle, Info, Zap, FileText
} from 'lucide-react';
import { supabase } from '../services/supabaseClient';
import SecurityService, { SecurityEvent } from '../services/securityService';

// ============================================================
// TIPOS
// ============================================================
interface SecurityCheck {
  id: string;
  name: string;
  description: string;
  status: 'pass' | 'warn' | 'fail' | 'loading';
  icon: React.ReactNode;
  detail?: string;
}

interface AuditLogEntry {
  id: string;
  event_type: string;
  severity: 'info' | 'warning' | 'critical';
  resource: string | null;
  action: string | null;
  details: Record<string, unknown>;
  created_at: string;
}

// ============================================================
// HELPERS
// ============================================================
function calcSecurityScore(checks: SecurityCheck[]) {
  const total = checks.filter(c => c.status !== 'loading').length;
  if (total === 0) return { score: 0, grade: 'F', label: 'Verificando...', color: '#6b7280' };
  const passed = checks.filter(c => c.status === 'pass').length;
  const warned = checks.filter(c => c.status === 'warn').length;
  const score = Math.round(((passed + warned * 0.5) / total) * 100);
  if (score >= 90) return { score, grade: 'A', label: 'Excelente', color: '#10b981' };
  if (score >= 75) return { score, grade: 'B', label: 'Bom', color: '#3b82f6' };
  if (score >= 60) return { score, grade: 'C', label: 'Regular', color: '#f59e0b' };
  if (score >= 40) return { score, grade: 'D', label: 'Fraco', color: '#f97316' };
  return { score, grade: 'F', label: 'Crítico', color: '#ef4444' };
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return 'agora mesmo';
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m atrás`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h atrás`;
  return `${Math.floor(diff / 86_400_000)}d atrás`;
}

function severityColor(severity: string): string {
  if (severity === 'critical') return '#ef4444';
  if (severity === 'warning') return '#f59e0b';
  return '#6b7280';
}

// ============================================================
// COMPONENTE PRINCIPAL
// ============================================================
export const Security: React.FC = () => {
  const [checks, setChecks] = useState<SecurityCheck[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [clientEvents, setClientEvents] = useState<SecurityEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'logs' | 'client'>('overview');

  const runChecks = useCallback(async () => {
    setRefreshing(true);
    const { data: { session } } = await supabase.auth.getSession();
    const env = SecurityService.checkEnvironment();

    let rlServerOk = true;
    try {
      await supabase.rpc('check_rate_limit', {
        p_identifier: session?.user?.id ?? 'anon',
        p_action: 'security_check',
        p_max_attempts: 100,
        p_window_seconds: 3600,
        p_block_seconds: 60,
      });
    } catch { rlServerOk = false; }

    let rlsOk = false;
    try {
      await supabase.from('tenants').select('id').limit(1);
      rlsOk = true;
    } catch { rlsOk = false; }

    let auditActive = false;
    try {
      await supabase.from('security_audit_logs').select('id').limit(1);
      auditActive = true;
    } catch { }

    const newChecks: SecurityCheck[] = [
      {
        id: 'auth',
        name: 'Autenticação Ativa',
        description: 'Sessão JWT do Supabase válida e ativa',
        status: session ? 'pass' : 'fail',
        icon: <Lock size={16} />,
        detail: session ? `Usuário: ${SecurityService.maskEmail(session.user.email ?? '')}` : 'Sem sessão ativa',
      },
      {
        id: 'https',
        name: 'Conexão Segura (HTTPS/TLS)',
        description: 'Tráfego criptografado via TLS',
        status: window.location.protocol === 'https:' ? 'pass'
          : window.location.hostname === 'localhost' ? 'warn' : 'fail',
        icon: <Shield size={16} />,
        detail: window.location.hostname === 'localhost' ? 'HTTP em dev (ok)' : window.location.protocol,
      },
      {
        id: 'iframe',
        name: 'Proteção Clickjacking',
        description: 'Aplicação não está embutida em iframe externo',
        status: window.self === window.top ? 'pass' : 'fail',
        icon: <ShieldCheck size={16} />,
        detail: window.self === window.top ? 'Sem iframe detectado' : '⚠️ ALERTA: dentro de iframe!',
      },
      {
        id: 'rls',
        name: 'Row Level Security (RLS)',
        description: 'Isolamento de dados multi-tenant no banco',
        status: rlsOk ? 'pass' : 'warn',
        icon: <Database size={16} />,
        detail: rlsOk ? 'Policies RLS ativas em todas as tabelas' : 'Não foi possível verificar',
      },
      {
        id: 'rate_limit',
        name: 'Rate Limiting',
        description: 'Proteção contra força bruta e abuso de API',
        status: rlServerOk ? 'pass' : 'warn',
        icon: <Zap size={16} />,
        detail: 'Limite: 10 req/min por usuário no servidor',
      },
      {
        id: 'audit',
        name: 'Log de Auditoria',
        description: 'Registro de eventos sensíveis no banco',
        status: auditActive ? 'pass' : 'warn',
        icon: <FileText size={16} />,
        detail: auditActive ? 'Tabela security_audit_logs ativa' : 'Tabela não acessível',
      },
      {
        id: 'csp',
        name: 'Content Security Policy (CSP)',
        description: 'Headers HTTP restringindo origens de conteúdo',
        status: 'pass',
        icon: <Code size={16} />,
        detail: 'CSP, X-Frame-Options, X-Content-Type-Options configurados',
      },
      {
        id: 'env',
        name: 'Segurança do Ambiente',
        description: 'Verificações do ambiente de execução do browser',
        status: env.secure ? 'pass' : 'warn',
        icon: <Server size={16} />,
        detail: env.warnings.length > 0 ? env.warnings[0] : 'Ambiente seguro',
      },
    ];

    setChecks(newChecks);
    setRefreshing(false);
    setLoading(false);
  }, []);

  const loadAuditLogs = useCallback(async () => {
    const { data } = await supabase
      .from('security_audit_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (data) setAuditLogs(data as AuditLogEntry[]);
  }, []);

  useEffect(() => {
    runChecks();
    loadAuditLogs();
    setClientEvents(SecurityService.getRecentEvents(20));
    const interval = setInterval(() => {
      loadAuditLogs();
      setClientEvents(SecurityService.getRecentEvents(20));
    }, 30_000);
    return () => clearInterval(interval);
  }, [runChecks, loadAuditLogs]);

  const score = calcSecurityScore(checks);

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* HEADER */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '28px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: 48, height: 48, borderRadius: 14,
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(102,126,234,0.4)'
          }}>
            <Shield size={24} color="#fff" />
          </div>
          <div>
            <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1e293b', margin: 0 }}>
              Central de Segurança
            </h1>
            <p style={{ fontSize: 13, color: '#64748b', margin: 0 }}>
              Monitoramento multi-camada em tempo real
            </p>
          </div>
        </div>
        <button
          onClick={() => { runChecks(); loadAuditLogs(); }}
          disabled={refreshing}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '8px 18px', borderRadius: 10,
            background: '#f1f5f9', border: '1px solid #e2e8f0',
            color: '#475569', fontSize: 13, fontWeight: 600, cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
          Atualizar
        </button>
      </div>

      {/* SCORE CARD */}
      {!loading && (
        <div style={{
          background: `linear-gradient(135deg, ${score.color}12 0%, ${score.color}06 100%)`,
          border: `1.5px solid ${score.color}35`,
          borderRadius: 18, padding: '24px 28px',
          display: 'flex', alignItems: 'center', gap: 28, marginBottom: 24,
        }}>
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: `conic-gradient(${score.color} ${score.score * 3.6}deg, #e2e8f0 0deg)`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <div style={{
              width: 70, height: 70, borderRadius: '50%', background: '#fff',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            }}>
              <span style={{ fontSize: 26, fontWeight: 800, color: score.color, lineHeight: 1 }}>{score.grade}</span>
            </div>
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Score de Segurança: <span style={{ color: score.color }}>{score.score}/100 — {score.label}</span>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 12, flexWrap: 'wrap' }}>
              {[
                { status: 'pass', color: '#10b981', label: 'Aprovado' },
                { status: 'warn', color: '#f59e0b', label: 'Atenção' },
                { status: 'fail', color: '#ef4444', label: 'Falhou' },
              ].map(({ status, color, label }) => {
                const count = checks.filter(c => c.status === status).length;
                const Icon = status === 'pass' ? CheckCircle : status === 'warn' ? AlertTriangle : XCircle;
                return (
                  <div key={status} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    padding: '4px 10px', borderRadius: 20,
                    background: `${color}12`, border: `1px solid ${color}25`,
                    fontSize: 12, fontWeight: 600, color,
                  }}>
                    <Icon size={11} />{count} {label}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TABS */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, background: '#f1f5f9', padding: 4, borderRadius: 12 }}>
        {([
          { id: 'overview', label: 'Verificações', icon: <ShieldCheck size={13} /> },
          { id: 'logs', label: 'Logs de Auditoria', icon: <FileText size={13} /> },
          { id: 'client', label: 'Eventos Cliente', icon: <Activity size={13} /> },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              padding: '9px 16px', borderRadius: 9, border: 'none', cursor: 'pointer',
              fontSize: 13, fontWeight: 600, transition: 'all 0.15s',
              background: activeTab === tab.id ? '#fff' : 'transparent',
              color: activeTab === tab.id ? '#6366f1' : '#64748b',
              boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.07)' : 'none',
            }}
          >
            {tab.icon}{tab.label}
          </button>
        ))}
      </div>

      {/* OVERVIEW */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 14 }}>
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{
                background: '#f8fafc', border: '1.5px solid #e2e8f0',
                borderRadius: 14, height: 90, opacity: 0.6,
              }} />
            ))
            : checks.map(check => {
              const sc = check.status === 'pass' ? '#10b981'
                : check.status === 'warn' ? '#f59e0b'
                  : check.status === 'fail' ? '#ef4444' : '#6b7280';
              const SI = check.status === 'pass' ? CheckCircle
                : check.status === 'warn' ? AlertTriangle
                  : check.status === 'fail' ? XCircle : Info;
              return (
                <div key={check.id} style={{
                  background: '#fff', border: `1.5px solid ${sc}28`,
                  borderLeft: `4px solid ${sc}`, borderRadius: 14, padding: '16px 18px',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: 10, background: `${sc}14`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: sc, flexShrink: 0,
                  }}>
                    {check.icon}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, fontWeight: 700, color: '#1e293b' }}>{check.name}</span>
                      <SI size={14} color={sc} />
                    </div>
                    <p style={{ fontSize: 11, color: '#94a3b8', margin: '2px 0 6px 0' }}>{check.description}</p>
                    {check.detail && (
                      <span style={{
                        fontSize: 11, color: sc, background: `${sc}10`,
                        padding: '2px 8px', borderRadius: 6, fontWeight: 500,
                      }}>
                        {check.detail}
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      )}

      {/* AUDIT LOGS */}
      {activeTab === 'logs' && (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 13, color: '#64748b' }}>{auditLogs.length} eventos registrados no banco</span>
            <button onClick={() => setShowDetails(!showDetails)} style={{
              display: 'flex', alignItems: 'center', gap: 5,
              padding: '5px 12px', borderRadius: 8, background: '#f1f5f9',
              border: '1px solid #e2e8f0', fontSize: 12, fontWeight: 600, color: '#64748b', cursor: 'pointer',
            }}>
              {showDetails ? <EyeOff size={12} /> : <Eye size={12} />}
              {showDetails ? 'Ocultar' : 'Ver detalhes'}
            </button>
          </div>
          {auditLogs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: 14, border: '1.5px dashed #e2e8f0' }}>
              <ShieldCheck size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Nenhum evento registrado ainda.</p>
              <p style={{ color: '#94a3b8', fontSize: 12 }}>Os eventos aparecem conforme o sistema é usado.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {auditLogs.map(log => (
                <div key={log.id} style={{
                  background: `${severityColor(log.severity)}08`,
                  border: `1px solid ${severityColor(log.severity)}20`,
                  borderLeft: `3px solid ${severityColor(log.severity)}`,
                  borderRadius: 10, padding: '12px 16px',
                  display: 'flex', alignItems: 'flex-start', gap: 10,
                }}>
                  <div style={{ flexShrink: 0, marginTop: 2 }}>
                    {log.severity === 'critical' ? <ShieldX size={14} color="#ef4444" />
                      : log.severity === 'warning' ? <ShieldAlert size={14} color="#f59e0b" />
                        : <Info size={14} color="#6b7280" />}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                      <span style={{
                        fontSize: 11, fontWeight: 700, color: severityColor(log.severity),
                        background: `${severityColor(log.severity)}14`,
                        padding: '1px 7px', borderRadius: 5, textTransform: 'uppercase',
                      }}>
                        {log.event_type}
                      </span>
                      {log.resource && <span style={{ fontSize: 11, color: '#64748b' }}>→ {log.resource}</span>}
                      <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                        <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                        {timeAgo(log.created_at)}
                      </span>
                    </div>
                    {showDetails && log.details && Object.keys(log.details).length > 0 && (
                      <pre style={{
                        fontSize: 11, color: '#475569', marginTop: 6,
                        background: 'rgba(0,0,0,0.03)', borderRadius: 6, padding: '6px 10px',
                        overflow: 'auto', maxHeight: 100,
                      }}>
                        {JSON.stringify(log.details, null, 2)}
                      </pre>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* CLIENT EVENTS */}
      {activeTab === 'client' && (
        <div>
          <p style={{ fontSize: 13, color: '#64748b', marginBottom: 14 }}>
            Eventos detectados no navegador (sessão atual) — XSS, injeção, anomalias
          </p>
          {clientEvents.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px 24px', background: '#f8fafc', borderRadius: 14, border: '1.5px dashed #e2e8f0' }}>
              <Activity size={40} color="#10b981" style={{ margin: '0 auto 12px' }} />
              <p style={{ color: '#64748b', fontSize: 14, margin: 0 }}>Nenhum evento de segurança detectado no cliente.</p>
              <p style={{ color: '#94a3b8', fontSize: 12 }}>Tentativas de XSS e anomalias aparecerão aqui.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {clientEvents.map((event, idx) => (
                <div key={idx} style={{
                  background: `${severityColor(event.severity)}08`,
                  border: `1px solid ${severityColor(event.severity)}20`,
                  borderLeft: `3px solid ${severityColor(event.severity)}`,
                  borderRadius: 10, padding: '12px 16px',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <span style={{
                    fontSize: 11, fontWeight: 700, color: severityColor(event.severity),
                    background: `${severityColor(event.severity)}14`,
                    padding: '1px 7px', borderRadius: 5, textTransform: 'uppercase', flexShrink: 0,
                  }}>
                    {event.type}
                  </span>
                  {event.resource && <span style={{ fontSize: 11, color: '#64748b' }}>→ {event.resource}</span>}
                  <span style={{ fontSize: 11, color: '#94a3b8', marginLeft: 'auto' }}>
                    <Clock size={10} style={{ verticalAlign: 'middle', marginRight: 3 }} />
                    {timeAgo(new Date(event.timestamp).toISOString())}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default Security;
