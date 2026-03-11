import { GoogleGenAI, Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import { OpenAI } from 'openai';
import { supabaseAdmin as supabase } from '../config/supabase.js';
import dotenv from 'dotenv';
dotenv.config();

// Chave Global Fallback (Google Gemini)
const DEFAULT_GEMINI_KEY = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || '';

// ============================================================
// TOOL DEFINITIONS (Function Calling)
// ============================================================

// Formato Gemini (Google GenAI SDK)
export const MANAGE_CONVERSATION_TOOL_GEMINI: FunctionDeclaration = {
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

export const CONSULT_PROCESS_TOOL_GEMINI: FunctionDeclaration = {
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

// Formato OpenAI (ChatGPT)
const OPENAI_TOOLS: any[] = [
    {
        type: "function",
        function: {
            name: "manage_conversation",
            description: "Ações na conversa: reply, handover ou tag.",
            parameters: {
                type: "object",
                properties: {
                    action: { type: "string", enum: ["reply", "handover", "tag"] },
                    message_content: { type: "string" },
                    tag_name: { type: "string" },
                    handover_reason: { type: "string" }
                },
                required: ["action"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "consult_process",
            description: "Consulta processos jurídicos.",
            parameters: {
                type: "object",
                properties: {
                    search_term: { type: "string" }
                },
                required: ["search_term"]
            }
        }
    }
];

/**
 * Ponto de entrada unificado para IA.
 * Identifica o provedor e a chave configurada para o Tenant.
 */
export async function getAIResponse(userMessage: string, tenantContext: any) {
    const { tenantId } = tenantContext;
    console.log(`[AI Service] Processando mensagem para o tenant: ${tenantId}`);

    try {
        // 1. Buscar integrações ativas do Tenant
        const { data: integrations } = await supabase
            .from('integrations')
            .select('*')
            .eq('tenant_id', tenantId)
            .eq('settings->>enabled', 'true');

        const openaiInt = integrations?.find(i => i.provider === 'openai');
        const googleInt = integrations?.find(i => i.provider === 'google');

        // PRIORIDADE: OpenAI (se tiver chave) -> Google Custom -> Google Global (Fallback)
        if (openaiInt?.settings?.apiKey) {
            console.log(`[AI Service] Usando OpenAI (Chave Customizada)`);
            return await getOpenAIResponse(userMessage, openaiInt.settings.apiKey);
        } 
        
        if (googleInt?.settings?.apiKey) {
            console.log(`[AI Service] Usando Gemini (Chave Customizada: ${googleInt.settings.apiKey.substring(0, 5)}...)`);
            return await getGeminiResponse(userMessage, googleInt.settings.apiKey);
        }

        console.log(`[AI Service] Usando Gemini (Chave Global Fallback)`);
        return await getGeminiResponse(userMessage, DEFAULT_GEMINI_KEY);

    } catch (error) {
        console.error('[AI Service Global Error]:', error);
        return "Desculpe, nosso assistente jurídico está indisponível no momento.";
    }
}

/**
 * Implementação da Resposta via OpenAI (ChatGPT)
 */
async function getOpenAIResponse(userMessage: string, apiKey: string) {
    const openai = new OpenAI({ apiKey });
    
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4-turbo-preview", // Ou "gpt-3.5-turbo"
            messages: [
                { role: "system", content: "Você é um assistente jurídico sênior da LexHub. Use as ferramentas disponibilizadas para responder." },
                { role: "user", content: userMessage }
            ],
            tools: OPENAI_TOOLS,
            tool_choice: "auto"
        });

        const msg = response.choices?.[0]?.message;
        if (!msg) return "Erro: Sem resposta do provedor de IA.";

        if (msg.tool_calls && msg.tool_calls.length > 0) {
            const toolCall = msg.tool_calls[0] as any;
            if (toolCall && toolCall.type === 'function') {
                const call = toolCall.function;
                if (call && call.name) {
                    const args = JSON.parse(call.arguments || '{}');
                    return handleToolExecution(call.name, args);
                }
            }
        }

        return msg.content || "Não consegui gerar uma resposta.";
    } catch (err) {
        console.error('[AI Service OpenAI Error]:', err);
        throw err;
    }
}

/**
 * Implementação da Resposta via Google Gemini
 */
async function getGeminiResponse(userMessage: string, apiKey: string) {
    const genAI = new GoogleGenAI({ apiKey });

    try {
        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: userMessage }] }],
            config: {
                systemInstruction: "Você é um assistente jurídico do escritório LexHub. Use as ferramentas disponibilizadas para responder adequadamente.",
                tools: [{ functionDeclarations: [MANAGE_CONVERSATION_TOOL_GEMINI, CONSULT_PROCESS_TOOL_GEMINI] }]
            }
        });

        const toolCalls = response.functionCalls;
        if (toolCalls && toolCalls.length > 0) {
            const call = toolCalls[0];
            if (call && call.name) {
                return handleToolExecution(call.name, call.args);
            }
        }

        return response.text || "Sem resposta do Gemini.";
    } catch (err) {
        console.error('[AI Service Gemini Error]:', err);
        throw err;
    }
}

/**
 * Lógica comum de execução de ferramentas (Tools)
 */
function handleToolExecution(name: string, args: any) {
    console.log(`[AI Tools] Executando: ${name}`, args);
    
    if (name === 'manage_conversation') {
        if (args?.action === 'reply' && args?.message_content) {
            return args.message_content;
        } else if (args?.action === 'handover') {
            return `[TRANSFERÊNCIA] Motivo: ${args?.handover_reason || 'Solicitado pelo usuário'}`;
        } else if (args?.action === 'tag') {
            return `[TAG APLICADA] Tag: ${args?.tag_name}`;
        }
    } else if (name === 'consult_process') {
        return `Consultando sistema para o termo: ${args?.search_term}...`;
    }
    
    return "Ação executada com sucesso.";
}

/**
 * Geração Pesada de Documentos (Petições, Contratos)
 * Prioriza chaves dos tenants também.
 */
export async function generateDocumentComGenAI(documentType: string, context: Record<string, any>) {
    const tenantId = context.tenantId;
    
    try {
        // Tenta pegar chave do Gemini do tenant (OpenAI gera formato diferente, manter GenAI para documentos por enquanto)
        const { data: googleInt } = await supabase
            .from('integrations')
            .select('settings')
            .eq('tenant_id', tenantId)
            .eq('provider', 'google')
            .eq('settings->>enabled', 'true')
            .single();

        const key = googleInt?.settings?.apiKey || DEFAULT_GEMINI_KEY;
        const genAI = new GoogleGenAI({ apiKey: key });

        const prompt = `Você é um Advogado Sênior. Redija: ${documentType}. Contexto: ${JSON.stringify(context, null, 2)}`;
        
        const response = await genAI.models.generateContent({
            model: 'gemini-2.0-flash',
            contents: [{ role: 'user', parts: [{ text: prompt }] }]
        });
        return response.text || "Erro na geração.";
    } catch (error) {
         console.error('[AI Service Document] Error:', error);
         throw error;
    }
}
