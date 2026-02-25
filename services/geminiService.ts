// import { GoogleGenAI, Type } from "@google/genai";
// ↑ Removido: O Frontend não deve mais instanciar SDKs de inteligência artificial ou importar tokens localmente.

export async function analyzeLegalDocument(documentText: string) {
  try {
    // Agora o Frontend atua apenas como cliente enviando o dispatch para o API Gateway
    const response = await fetch('http://localhost:3001/api/documents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            tenantId: 'tenant-atual', // Em produção, usar contexto de sessão real
            userId: 'user-id',
            type: 'ANALYZE_DOCUMENT',
            context: { text: documentText }
        })
    });

    if (!response.ok) {
        throw new Error('Falha ao requerer geração de documento na Fila.');
    }

    const { jobId } = await response.json();
    console.log(`Documento enviado pra fila. Job ID: ${jobId}`);
    
    // Retornamos um placeholder pendente pois a arquitetura EDA é assíncrona.
    // Na Fase de UI (Implementado no App.tsx via Supabase Realtime), um toast exibirá a notificação "concluído".
    return {
      subjects: ["Em Processamento Assíncrono..."],
      risks: ["Análise enfileirada, aguardando conclusão."],
      deadlines: ["Geração Realtime pendente."],
      nextSteps: ["Aguarde aviso de conclusão na UI."]
    };
    
  } catch (error) {
    console.error("Gateway API Error:", error);
    throw error;
  }
}