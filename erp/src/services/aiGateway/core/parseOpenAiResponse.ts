import type { AiCategory } from '../types/aiGatewayTypes';
import type { OpenAiRequestKind } from './openAiPayloadBuilder';

export function parseOpenAiResponse(
  json: any,
  category: AiCategory,
  kind: OpenAiRequestKind
): any {
  const emptyResponse = () => {
    const error = new Error('A OpenAI retornou uma resposta sem conteúdo utilizável.');
    error.name = 'OpenAiEmptyResponseError';
    return error;
  };

  if (kind === 'embeddings') {
    const embedding = json?.data?.[0]?.embedding;
    if (!Array.isArray(embedding)) throw emptyResponse();
    return embedding;
  }

  if (category === 'IMAGE') {
    const result = json?.output?.find((item: any) => item?.type === 'image_generation_call')?.result;
    if (typeof result !== 'string' || !result)
      throw emptyResponse();
    return `data:image/png;base64,${result}`;
  }

  const outputText = json?.output_text;
  if (typeof outputText === 'string' && outputText.trim()) return outputText;
  const text = (json?.output || [])
    .filter((item: any) => item?.type === 'message')
    .flatMap((item: any) => item?.content || [])
    .filter((item: any) => item?.type === 'output_text' && typeof item.text === 'string')
    .map((item: any) => item.text)
    .join('\n');
  if (text.trim()) return text;
  throw emptyResponse();
}
