// import { GoogleGenAI, Type } from "@google/genai";
// ↑ Removido: O Frontend não deve mais instanciar SDKs de inteligência artificial ou importar tokens localmente.

import { supabase } from './supabaseClient.ts';

export async function analyzeLegalDocument(documentText: string) {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    // Agora o Frontend atua apenas como cliente enviando o dispatch para o API Gateway
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    
    const response = await fetch(`${apiUrl}/api/documents/generate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}` 
        },
        body: JSON.stringify({
            // type pode ser 'RESUMO_PROCESSO', 'PETICAO_INICIAL', 'CONTRATO', 'PARECER'
            type: 'PARECER',
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