
// ==================== AI FUNCTION CALLING DEFINITIONS ====================

export type AIActionType = 'reply' | 'handover' | 'tag' | 'consult_process';

export interface AIToolParameter {
    type: string;
    enum?: string[];
    description: string;
}

export interface AIToolDefinition {
    name: string;
    description: string;
    parameters: {
        type: 'object';
        properties: Record<string, AIToolParameter>;
        required: string[];
    };
}

export const MANAGE_CONVERSATION_TOOL: AIToolDefinition = {
    name: "manage_conversation",
    description: "Função para executar ações na conversa atual baseada na intenção do usuário.",
    parameters: {
        type: "object",
        properties: {
            action: {
                type: "string",
                enum: ["reply", "handover", "tag"],
                description: "A ação a ser tomada. 'reply' para responder texto, 'handover' para transferir para humano, 'tag' para etiquetar cliente."
            },
            message_content: {
                type: "string",
                description: "O texto da resposta a ser enviada ao usuário (obrigatório se action='reply')."
            },
            tag_name: {
                type: "string",
                description: "Nome da tag (ex: 'Lead Quente', 'Reclamação') se action='tag'."
            },
            handover_reason: {
                type: "string",
                description: "Motivo da transferência para humano (obrigatório se action='handover')."
            }
        },
        required: ["action"]
    }
};

export const CONSULT_PROCESS_TOOL: AIToolDefinition = {
    name: "consult_process",
    description: "Consulta o status atual de um processo jurídico pelo número ou nome do cliente.",
    parameters: {
        type: "object",
        properties: {
            search_term: {
                type: "string",
                description: "Número do processo (ex: 5001234...) ou nome do cliente."
            }
        },
        required: ["search_term"]
    }
};

export const ALL_TOOLS = [
    MANAGE_CONVERSATION_TOOL,
    CONSULT_PROCESS_TOOL
];
