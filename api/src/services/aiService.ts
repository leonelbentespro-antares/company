import { GoogleGenAI, Type } from '@google/genai';
import type { FunctionDeclaration } from '@google/genai';
import { OpenAI } from 'openai';
import Anthropic from '@anthropic-ai/sdk';
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
                    return await handleToolExecution(call.name, args, 'DEFAULT_TENANT_ID'); // tenantId precisa vir do contexto
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
                return await handleToolExecution(call.name, call.args, apiKey === DEFAULT_GEMINI_KEY ? 'global' : 'custom'); // tenantId viria pela chave
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
async function handleToolExecution(name: string, args: any, tenantId: string) {
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
        try {
            const { JusticeIntegrationService } = await import('./justiceIntegrationService.js');
            const { data: integration } = await supabase
                .from('integrations')
                .select('settings')
                .eq('tenant_id', tenantId)
                .eq('provider', 'pdpj')
                .single();

            if (integration?.settings?.apiKey) {
                const data = await JusticeIntegrationService.consultDatajud(args.search_term, integration.settings.apiKey);
                const lastMov = data.result?.[0]?.movimentacoes?.[0]?.descricao || 'Sem movimentações recentes.';
                return `Consulta Judicial Realizada: O processo ${args.search_term} teve como última movimentação: "${lastMov}".`;
            }
            
            return `Consultando sistema para o termo: ${args?.search_term}... (Integração PDPJ não configurada para busca externa)`;
        } catch (err) {
            console.error('[AI Tool Error] consult_process:', err);
            return `Desculpe, tive um problema ao acessar o tribunal: ${args?.search_term}.`;
        }
    }
    
    return "Ação executada com sucesso.";
}

/**
 * Geração Pesada de Documentos (Petições, Contratos)
 * Identifica a chave cadastrada pelo Tenant nas Integrações.
 */
export async function generateDocumentComGenAI(documentType: string, context: Record<string, any>) {
    const tenantId = context.tenantId;

    try {
        const { data: integrations } = await supabase
            .from('integrations')
            .select('provider, settings')
            .eq('tenant_id', tenantId)
            .in('provider', ['openai', 'anthropic', 'xai', 'meta', 'google'])
            .eq('settings->>enabled', 'true');

        const openaiInt = integrations?.find(i => i.provider === 'openai');
        const anthropicInt = integrations?.find(i => i.provider === 'anthropic');
        const xaiInt = integrations?.find(i => i.provider === 'xai');
        const metaInt = integrations?.find(i => i.provider === 'meta');
        const googleInt = integrations?.find(i => i.provider === 'google');

        const prompt = `Você é um Advogado Sênior. Redija: ${documentType}. Contexto: ${JSON.stringify(context, null, 2)}`;

        // Priority 1: OpenAI
        if (openaiInt?.settings?.apiKey) {
           const openai = new OpenAI({ apiKey: openaiInt.settings.apiKey });
           const response = await openai.chat.completions.create({
               model: "gpt-4-turbo-preview",
               messages: [{ role: "user", content: prompt }]
           });
           return response.choices[0]?.message?.content || "Erro na geração pela OpenAI.";
        }

        // Priority 2: Anthropic (Claude)
        if (anthropicInt?.settings?.apiKey) {
            const anthropic = new Anthropic({ apiKey: anthropicInt.settings.apiKey });
            const response = await anthropic.messages.create({
                model: 'claude-3-5-sonnet-20241022',
                max_tokens: 4096,
                messages: [{ role: 'user', content: prompt }]
            });
            const firstContent = response.content[0];
            if (firstContent && firstContent.type === 'text') {
                return firstContent.text;
            }
            return "Erro na geração pela Anthropic.";
        }

        // Priority 3: xAI (Grok)
        if (xaiInt?.settings?.apiKey) {
           const openai = new OpenAI({ 
               apiKey: xaiInt.settings.apiKey, 
               baseURL: 'https://api.x.ai/v1' 
           });
           const response = await openai.chat.completions.create({
               model: "grok-beta",
               messages: [{ role: "user", content: prompt }]
           });
           return response.choices[0]?.message?.content || "Erro na geração pela xAI.";
        }

        // Priority 4: Meta (Llama via Groq)
        if (metaInt?.settings?.apiKey) {
           const openai = new OpenAI({ 
               apiKey: metaInt.settings.apiKey, 
               baseURL: 'https://api.groq.com/openai/v1' 
           });
           const response = await openai.chat.completions.create({
               model: "llama-3.3-70b-versatile",
               messages: [{ role: "user", content: prompt }]
           });
           return response.choices[0]?.message?.content || "Erro na geração pela Meta (Groq).";
        }

        // Priority 5: Google (Gemini)
        if (googleInt?.settings?.apiKey) {
            const genAI = new GoogleGenAI({ apiKey: googleInt.settings.apiKey });
            const response = await genAI.models.generateContent({
                model: 'gemini-2.0-flash',
                contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            return response.text || "Erro na geração pela Google.";
        }

        throw new Error("ERR_NO_API_KEY: Nenhuma chave de IA foi configurada. Por favor, adicione uma chave nas Integrações.");

    } catch (error) {
         console.error('[AI Service Document] Error:', error);
         throw error;
    }
}
