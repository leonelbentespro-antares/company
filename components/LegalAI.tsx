
import React, { useState } from 'react';
import {
  BrainCircuit,
  Send,
  Loader2,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  ArrowRightCircle
} from 'lucide-react';
import { analyzeLegalDocument } from '../services/geminiService.ts';

export const LegalAI: React.FC = () => {
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);

  const handleAnalyze = async () => {
    if (!text.trim()) return;
    setLoading(true);
    try {
      const result = await analyzeLegalDocument(text);
      setAnalysis(result);

      // Feedback imediato que a rotina foi pro background (Não trava o Front)
      if (result.subjects && result.subjects[0].includes("Assíncrono")) {
        // Aqui seria ideal disparar um toast. Vamos assumir que a refatoração do App.tsx cobre a notificação.
        setLoading(false);
        setText(''); // Limpa pra próxima petição
      }
    } catch (err) {
      console.error(err);
      alert("Falha na análise. Verifique se o API Gateway (Background) está online.");
    } finally {
      // Sempre soltamos o loader pq a resposta definitiva virá por WebSocket 
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-20">
      {/* Header Padronizado - Fundo claro com texto Azul Escuro */}
      <div className="bg-white border border-slate-200 p-8 rounded-[2.5rem] shadow-sm">
        <div className="flex items-center gap-4 mb-6">
          <div className="p-3 bg-legal-navy/5 rounded-2xl border border-legal-navy/10">
            <BrainCircuit size={32} className="text-legal-bronze" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-legal-navy">Assistente Jurídico de IA</h2>
            <p className="text-slate-500 font-medium text-sm lg:text-base">Análise documental avançada com tecnologia Gemini 3.</p>
          </div>
        </div>

        <div className="space-y-4">
          <label className="block text-[10px] font-bold text-legal-navy uppercase tracking-widest ml-1">Documento para Análise</label>
          <textarea
            className="w-full h-48 p-5 bg-slate-50 border border-slate-200 rounded-3xl text-legal-navy placeholder-slate-400 focus:outline-none focus:ring-4 focus:ring-legal-navy/5 focus:border-legal-navy/20 transition-all font-medium text-base shadow-inner"
            placeholder="Cole aqui o conteúdo da petição, contrato ou documento jurídico..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <div className="flex justify-end">
            <button
              onClick={handleAnalyze}
              disabled={loading || !text.trim()}
              className="flex items-center gap-3 px-8 py-4 bg-legal-navy text-white rounded-2xl font-bold hover:bg-opacity-95 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl shadow-legal-navy/20"
            >
              {loading ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
              {loading ? 'Processando...' : 'Iniciar Análise Inteligente'}
            </button>
          </div>
        </div>
      </div>

      {analysis && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in slide-in-from-top-4 duration-500">
          {/* Assuntos Principais */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-legal-navy mb-6 flex items-center gap-2">
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="text-blue-600" size={20} />
              </div>
              Assuntos Principais
            </h3>
            <ul className="space-y-3">
              {analysis.subjects.map((s: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-legal-navy text-sm font-bold bg-slate-50 p-4 rounded-2xl border border-slate-100">
                  <CheckCircle2 size={18} className="text-emerald-600 mt-0.5 shrink-0" />
                  {s}
                </li>
              ))}
            </ul>
          </div>

          {/* Riscos Identificados */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-legal-navy mb-6 flex items-center gap-2">
              <div className="p-2 bg-rose-50 rounded-lg">
                <AlertTriangle className="text-rose-600" size={20} />
              </div>
              Riscos Identificados
            </h3>
            <ul className="space-y-3">
              {analysis.risks.map((r: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-legal-navy text-sm font-bold bg-rose-50/30 p-4 rounded-2xl border border-rose-100/50">
                  <div className="w-2 h-2 rounded-full bg-rose-600 mt-2 shrink-0" />
                  {r}
                </li>
              ))}
            </ul>
          </div>

          {/* Prazos e Datas Chave */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-legal-navy mb-6 flex items-center gap-2">
              <div className="p-2 bg-amber-50 rounded-lg">
                <Calendar className="text-amber-600" size={20} />
              </div>
              Prazos e Datas Chave
            </h3>
            <ul className="space-y-3">
              {analysis.deadlines.map((d: string, i: number) => (
                <li key={i} className="flex items-center gap-3 text-legal-navy text-sm font-extrabold bg-amber-50/50 p-4 rounded-2xl border border-amber-100/50">
                  <span className="px-2 py-1 bg-amber-600 text-white rounded-md text-[10px] uppercase tracking-tighter">Prazo</span>
                  {d}
                </li>
              ))}
            </ul>
          </div>

          {/* Próximos Passos */}
          <div className="bg-white p-8 rounded-[2rem] border border-slate-200 shadow-sm">
            <h3 className="text-lg font-bold text-legal-navy mb-6 flex items-center gap-2">
              <div className="p-2 bg-indigo-50 rounded-lg">
                <ArrowRightCircle className="text-indigo-600" size={20} />
              </div>
              Próximos Passos Sugeridos
            </h3>
            <ul className="space-y-3">
              {analysis.nextSteps.map((n: string, i: number) => (
                <li key={i} className="flex items-start gap-3 text-legal-navy text-sm font-extrabold bg-indigo-50/20 p-5 rounded-2xl border border-indigo-100/50 shadow-sm">
                  <div className="bg-indigo-600 text-white p-1 rounded-md shrink-0">
                    <CheckCircle2 size={16} />
                  </div>
                  {n}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
};
