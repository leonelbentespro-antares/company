import { GoogleGenAI, Type } from "@google/genai";

export async function analyzeLegalDocument(documentText: string) {
  // Ensure process.env.API_KEY is safely accessed. 
  // We initialize inside the function as per guidelines to always use fresh configuration.
  if (typeof process === 'undefined' || !process.env || !process.env.API_KEY) {
    throw new Error("A chave API (process.env.API_KEY) não está configurada corretamente.");
  }

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `Analise o seguinte texto jurídico e forneça um resumo estruturado em JSON com os seguintes campos: 
      1. subjects (lista de strings): Assuntos principais. 
      2. risks (lista de strings): Riscos potenciais. 
      3. deadlines (lista de strings): Prazos mencionados. 
      4. nextSteps (lista de strings): Próximos passos práticos.
      
      Texto do documento: ${documentText}`,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            subjects: { type: Type.ARRAY, items: { type: Type.STRING } },
            risks: { type: Type.ARRAY, items: { type: Type.STRING } },
            deadlines: { type: Type.ARRAY, items: { type: Type.STRING } },
            nextSteps: { type: Type.ARRAY, items: { type: Type.STRING } },
          },
          required: ["subjects", "risks", "deadlines", "nextSteps"]
        }
      }
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Não foi possível obter uma resposta do assistente de IA.");
    }

    return JSON.parse(textOutput);
  } catch (error) {
    console.error("Gemini Analysis Error:", error);
    throw error;
  }
}