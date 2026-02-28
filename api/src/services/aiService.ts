import { GoogleGenAI, Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import { supabaseAdmin } from '../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '' });

// Tool definitions for Function Calling ported from frontend
export const MANAGE_CONVERSATION_TOOL: FunctionDeclaration = {
    name: "manage_conversation",
    description: "Função para executar ações na conversa atual baseada na intenção do usuário.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            action: {
                type: Type.STRING,
                enum: ["reply", "handover", "tag"],
                description: "A ação a ser tomada. 'reply' para responder texto, 'handover' para transferir para humano, 'tag' para etiquetar cliente."
            },
            message_content: {
                type: Type.STRING,
                description: "O texto da resposta a ser enviada ao usuário (obrigatório se action='reply')."
            },
            tag_name: {
                type: Type.STRING,
                description: "Nome da tag (ex: 'Lead Quente', 'Reclamação') se action='tag'."
            },
            handover_reason: {
                type: Type.STRING,
                description: "Motivo da transferência para humano (obrigatório se action='handover')."
            }
        },
        required: ["action"]
    }
};

export const CONSULT_PROCESS_TOOL: FunctionDeclaration = {
    name: "consult_process",
    description: "Consulta o status atual de um processo jurídico pelo número ou nome do cliente.",
    parameters: {
        type: Type.OBJECT,
        properties: {
            search_term: {
                type: Type.STRING,
                description: "Número do processo (ex: 5001234...) ou nome do cliente."
            }
        },
        required: ["search_term"]
    }
};

export const ALL_TOOLS: FunctionDeclaration[] = [ MANAGE_CONVERSATION_TOOL, CONSULT_PROCESS_TOOL ];

/**
 * Chama o modelo Gemini para processar a mensagem do usuário com RAG local.
 */
export async function getAIResponse(userMessage: string, tenantContext: any) {
    try {
        console.log(`[AI Service] Gerando resposta para mensagem: "${userMessage.substring(0,20)}..."`);
        
        // Simulação de busca RAG e instrução do sistema (pode vir do banco depois, via tenantContext.agent_id)
        const systemPrompt = `Você é um advogado assistente virtual do escritório Jurídico LexHub. 
        Responda de forma educada, precisa e cordial usando o tool manage_conversation para disparar respostas.`;

        // Chamamos a API Gemini 2.5
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: userMessage }] }
            ],
            config: {
                systemInstruction: systemPrompt,
                tools: [{ functionDeclarations: ALL_TOOLS }]
            }
        });

        // Verificando se o Gemini invocou alguma Function (Tool Call)
        const toolCalls = response.functionCalls;
        
        if (toolCalls && toolCalls.length > 0) {
            const call = toolCalls[0];
            if (call) {
                console.log(`[AI Service] Modelo invocou a função: ${call.name} com args:`, call.args);
                
                if (call.name === 'manage_conversation') {
                    const args = call.args as any;
                    if (args?.action === 'reply' && args?.message_content) {
                        return args.message_content;
                    } else if (args?.action === 'handover') {
                        return `[TRANSFERÊNCIA] Motivo: ${args?.handover_reason || 'Solicitado pelo usuário'}`;
                    } else if (args?.action === 'tag') {
                        return `[TAG APLICADA] Tag: ${args?.tag_name}`;
                    }
                } else if (call.name === 'consult_process') {
                   const args = call.args as any;
                   return `Consultando sistema para o termo: ${args?.search_term}...`;
                }
            }
        }

        // Fallback caso não use tool
        return response.text || "Desculpe, não consegui processar sua solicitação no momento.";
        
    } catch (error) {
        console.error('[AI Service] Erro ao chamar GenAI SDK:', error);
        throw error;
    }
}

/**
 * Chama o Gemini para geração pesada de documentos (Petições, Contratos, etc) em Background
 */
export async function generateDocumentComGenAI(documentType: string, context: Record<string, any>) {
    try {
        console.log(`[AI Service] Gerando Documento longo tipo: ${documentType}`);
        
        const systemPrompt = `Você é um Assistente Jurídico Sênior (LexHub AI). Sua função é redigir o documento: ${documentType}.
        Contexto Fornecido pelo Advogado:
        ${JSON.stringify(context, null, 2)}
        
        Gere um documento formal, utilizando linguagem jurídica adequada e formatação markdown.`;

        // Aqui poderíamos usar um modelo ainda mais "lento/potente" se necessário (gemini-1.5-pro)
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                { role: 'user', parts: [{ text: `Por favor, elabore o documento ${documentType} com base no contexto informado.` }] }
            ],
            config: {
                systemInstruction: systemPrompt,
            }
        });

        return response.text || "Erro na geração: resposta vazia do LLM.";
    } catch (error) {
         console.error('[AI Service Document] Erro ao gerar documento longo:', error);
         throw error;
    }
}
