import type { AiCategory } from '../types/aiGatewayTypes';

export type OpenAiRequestKind = 'responses' | 'embeddings';

export interface BuiltOpenAiRequest {
  kind: OpenAiRequestKind;
  requestBody: Record<string, unknown>;
}

function toResponsesInput(payload: unknown): Array<Record<string, unknown>> {
  if (typeof payload === 'string') {
    return [{ role: 'user', content: [{ type: 'input_text', text: payload }] }];
  }

  const entries = Array.isArray(payload) ? payload : [payload];
  return entries.map((entry: any) => {
    const role = entry?.role === 'model' || entry?.role === 'assistant' ? 'assistant' : 'user';
    const parts = Array.isArray(entry?.parts) ? entry.parts : [];
    const content = parts.flatMap((part: any) => {
      if (typeof part?.text === 'string') return [{ type: 'input_text', text: part.text }];
      const image = part?.inlineData || part?.inline_data;
      if (image && typeof image.data === 'string') {
        const mimeType = typeof image.mimeType === 'string' ? image.mimeType : 'image/png';
        return [{ type: 'input_image', image_url: `data:${mimeType};base64,${image.data}` }];
      }
      return [];
    });
    return { role, content };
  });
}

export function buildOpenAiPayload(options: {
  category: AiCategory;
  model: string;
  imageModel?: string;
  payload: unknown;
  operation: string;
  jsonMode?: boolean;
  thinkingBudget?: 'low' | 'medium' | 'high';
  tools?: unknown[];
}): BuiltOpenAiRequest {
  const { category, model, imageModel = 'gpt-image-2', payload, operation, jsonMode, thinkingBudget, tools = [] } = options;
  const isEmbedding = model.includes('embedding') || operation.includes('embedding');
  if (isEmbedding) {
    return {
      kind: 'embeddings',
      requestBody: {
        model: 'text-embedding-3-small',
        input: typeof payload === 'string' ? payload : JSON.stringify(payload),
      },
    };
  }

  const input = toResponsesInput(payload);
  const responseTools: Array<Record<string, unknown>> = [];
  if (tools.some((tool: any) => tool?.googleSearch || tool?.google_search)) {
    responseTools.push({ type: 'web_search' });
  }
  if (category === 'IMAGE') {
    responseTools.push({ type: 'image_generation', model: imageModel, quality: 'medium', size: 'auto' });
  }

  return {
    kind: 'responses',
    requestBody: {
      model,
      input,
      ...(responseTools.length ? { tools: responseTools } : {}),
      ...(category === 'IMAGE' ? { tool_choice: { type: 'image_generation' } } : {}),
      ...(jsonMode ? { text: { format: { type: 'json_object' } } } : {}),
      ...(thinkingBudget ? { reasoning: { effort: thinkingBudget } } : {}),
      max_output_tokens: 2048,
    },
  };
}
