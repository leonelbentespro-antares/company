import type { FunctionDeclaration } from '@google/genai';
export declare const MANAGE_CONVERSATION_TOOL: FunctionDeclaration;
export declare const CONSULT_PROCESS_TOOL: FunctionDeclaration;
export declare const ALL_TOOLS: FunctionDeclaration[];
/**
 * Chama o modelo Gemini para processar a mensagem do usuário com RAG local.
 */
export declare function getAIResponse(userMessage: string, tenantContext: any): Promise<any>;
/**
 * Chama o Gemini para geração pesada de documentos (Petições, Contratos, etc) em Background
 */
export declare function generateDocumentComGenAI(documentType: string, context: Record<string, any>): Promise<string>;
//# sourceMappingURL=aiService.d.ts.map