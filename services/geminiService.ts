
import { GoogleGenAI, Type } from "@google/genai";
import { MonthData, DetectedTable } from "../types";

function getAIClient() {
  // Tentar obter chave do localStorage primeiro (BYOK)
  const localKey = localStorage.getItem('LABORCALC_USER_KEY');
  const apiKey = localKey || process.env.API_KEY;
  
  if (!apiKey || apiKey === "undefined" || apiKey === "") {
    throw new Error("API_KEY_MISSING");
  }
  return new GoogleGenAI({ apiKey });
}

export async function detectTablesInFile(base64Data: string, mimeType: string, fileName: string): Promise<Partial<DetectedTable>[]> {
  try {
    const ai = getAIClient();
    const model = 'gemini-3-pro-preview';
    
    const prompt = `
      INSTRUÇÕES CRÍTICAS PARA ANÁLISE DE DOCUMENTO JURÍDICO/LABORAL:
      Documento: ${fileName}

      1. EXECUTE UM SCAN COMPLETO: Este documento pode ter muitas páginas. Analise TODAS as páginas do início ao fim.
      2. FILTRAGEM SELETIVA: Ignore índices, tabelas de honorários, tabelas de artigos de lei ou cronogramas processuais.
      3. FOCO EXCLUSIVO: Identifique APENAS tabelas que contenham registos de:
         - Horas de trabalho diárias.
         - Trabalho suplementar / Horas extraordinárias.
         - Escalas de serviço.
         - Picagens de ponto.
      4. LOCALIZAÇÃO: Para cada tabela, identifique o número da página e a descrição do contexto (ex: "Tabela de horas extras em factos provados", "Mapa de assiduidade Jan/2022").
      5. COORDENADAS: Se possível, indique a boundingBox [ymin, xmin, ymax, xmax] (0-1000).

      Não omita tabelas que apareçam no final do documento ou em secções de "factos não provados" se estas contiverem dados numéricos de horas.
    `;

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
        thinkingConfig: { thinkingBudget: 4000 },
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            tables: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  pageNumber: { type: Type.INTEGER },
                  boundingBox: { 
                    type: Type.ARRAY, 
                    items: { type: Type.NUMBER },
                    description: "[ymin, xmin, ymax, xmax]"
                  }
                },
                required: ['description', 'pageNumber']
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
      pageNumber: t.pageNumber,
      previewUrl: base64Data,
      mimeType: mimeType
    }));
  } catch (error: any) {
    console.error("Erro na deteção de tabelas:", error);
    if (error.message === "API_KEY_MISSING") {
      throw new Error("A chave API do Gemini não foi configurada corretamente. Por favor, insira a sua chave nas definições.");
    }
    return [];
  }
}

export async function extractDataFromCrop(table: DetectedTable): Promise<MonthData | null> {
  try {
    const ai = getAIClient();
    const model = 'gemini-3-pro-preview';
    
    const prompt = `
      Analise a tabela na página ${table.pageNumber} descrita como "${table.description}".
      Extraia rigorosamente os dias do mês e as horas trabalhadas.
      Se a tabela for de "Trabalho Suplementar", classifique automaticamente os dias como 'Suplementar'.
      
      Retorne o Ano, Mês e a lista de dias.
    `;

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
        thinkingConfig: { thinkingBudget: 2000 },
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
      pageNumber: table.pageNumber,
      days: (result.days || []).map((d: any) => ({
        ...d,
        id: crypto.randomUUID()
      }))
    };
  } catch (error: any) {
    console.error("Erro na extração final:", error);
    return null;
  }
}
