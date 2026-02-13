import { GoogleGenAI, Type } from "@google/genai";
import { MonthData, DetectedTable } from "../types";

// Fase 1: Detetar tabelas no documento
export async function detectTablesInFile(base64Data: string, mimeType: string, fileName: string): Promise<Partial<DetectedTable>[]> {
  /* Fix: Create instance right before API call to ensure latest key usage */
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  /* Fix: Use gemini-3-pro-preview for complex vision and structure analysis tasks */
  const model = 'gemini-3-pro-preview';
  
  const prompt = `
    Analise este documento (${fileName}).
    Identifique todas as tabelas de registo de horas ou calendários de trabalho presentes.
    Para cada tabela encontrada, forneça:
    1. Uma breve descrição (ex: "Tabela de Janeiro", "Registo de Horas Extras").
    2. Se for uma imagem ou PDF visual, as coordenadas da caixa delimitadora [ymin, xmin, ymax, xmax] em valores de 0 a 1000.
    
    Retorne um JSON com uma lista de objetos 'tables'.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: base64Data.split(',')[1], mimeType: mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  boundingBox: { 
                    type: Type.ARRAY, 
                    items: { type: Type.NUMBER },
                    description: "[ymin, xmin, ymax, xmax]"
                  }
                },
                required: ['description']
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{"tables": []}');
    return result.tables.map((t: any) => ({
      id: crypto.randomUUID(),
      fileName,
      description: t.description,
      boundingBox: t.boundingBox,
      previewUrl: base64Data,
      mimeType: mimeType
    }));
  } catch (error: any) {
    console.error("Erro na deteção de tabelas:", error);
    /* Fix: Handle 'Requested entity was not found' by prompting user for key selection as per guidelines */
    if (error.message?.includes("Requested entity was not found")) {
      if (window.aistudio) {
        window.aistudio.openSelectKey();
      } else {
        window.location.reload();
      }
    }
    return [];
  }
}

// Fase 2: Extrair dados de uma tabela específica (crop)
export async function extractDataFromCrop(table: DetectedTable): Promise<MonthData | null> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const model = 'gemini-3-pro-preview';
  
  const prompt = `
    Extraia os dados da tabela descrita como "${table.description}" neste documento.
    Precisamos do Ano, Mês e uma lista de dias com horas trabalhadas e o tipo de trabalho.
    Tipos válidos: 'Normal', 'Suplementar', 'Noturno', 'Descanso Obrigatório', 'Descanso Complementar', 'Feriado'.
  `;

  try {
    const response = await ai.models.generateContent({
      model,
      contents: {
        parts: [
          { inlineData: { data: table.previewUrl.split(',')[1], mimeType: table.mimeType === 'application/pdf' ? 'application/pdf' : 'image/jpeg' } },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            year: { type: Type.INTEGER },
            month: { type: Type.INTEGER },
            days: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  day: { type: Type.INTEGER },
                  hours: { type: Type.NUMBER },
                  type: { type: Type.STRING }
                },
                required: ['day', 'hours', 'type']
              }
            }
          }
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    return {
      id: crypto.randomUUID(),
      year: result.year || new Date().getFullYear(),
      month: result.month || new Date().getMonth() + 1,
      days: result.days.map((d: any) => ({
        ...d,
        id: crypto.randomUUID()
      }))
    };
  } catch (error: any) {
    console.error("Erro na extração final:", error);
    if (error.message?.includes("Requested entity was not found")) {
      if (window.aistudio) {
        window.aistudio.openSelectKey();
      } else {
        window.location.reload();
      }
    }
    return null;
  }
}
