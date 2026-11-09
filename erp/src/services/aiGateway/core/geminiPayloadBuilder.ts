import type { AiCategory } from '../types/aiGatewayTypes';

export interface GeminiPayloadOptions {
  category: AiCategory;
  model: string;
  payload: any;
  operation: string;
  thinkingBudget?: 'low' | 'medium' | 'high';
  jsonMode?: boolean;
  tools?: any[];
}

export interface BuiltGeminiRequest {
  action: 'embedContent' | 'generateContent';
  requestBody: Record<string, any>;
}

/**
 * Constrói o corpo da requisição e determina a ação (generateContent ou embedContent)
 * conforme o modelo, categoria, modo JSON e ferramentas.
 */
export function buildGeminiPayload(options: GeminiPayloadOptions): BuiltGeminiRequest {
  const { category, model, payload, operation, thinkingBudget, jsonMode, tools } = options;

  const isEmbedding = model.includes('embedding') || operation.includes('embedding');
  const action = isEmbedding ? 'embedContent' : 'generateContent';

  if (isEmbedding) {
    return {
      action,
      requestBody: {
        content: {
          parts: [{ text: typeof payload === 'string' ? payload : JSON.stringify(payload) }],
        },
      },
    };
  }

  const contents = typeof payload === 'string' ? [{ parts: [{ text: payload }] }] : payload;
  const generationConfig: Record<string, any> = {};

  if (category === 'IMAGE') {
    generationConfig.responseModalities = ['TEXT', 'IMAGE'];
  } else {
    // A API do Google Gemini não aceita responseMimeType: 'application/json' quando tools
    // ativas (como googleSearch) estão habilitadas, retornando HTTP 400 INVALID_ARGUMENT.
    if (jsonMode && (!tools || tools.length === 0)) {
      generationConfig.responseMimeType = 'application/json';
    }
    if (thinkingBudget) {
      generationConfig.thinkingConfig = {
        thinkingBudget:
          thinkingBudget === 'low' ? 1024 : thinkingBudget === 'medium' ? 2048 : 4096,
      };
    }
  }

  return {
    action,
    requestBody: {
      contents,
      ...(Object.keys(generationConfig).length > 0 ? { generationConfig } : {}),
      ...(tools && tools.length > 0 ? { tools } : {}),
    },
  };
}
