import { AiCategory } from '../types/aiGatewayTypes';

export function parseGeminiResponse(json: any, category: AiCategory): string {
  const parts = json.candidates?.[0]?.content?.parts || [];
  if (category === 'IMAGE') {
    const image = parts.find((part: any) => !part.thought && part.inlineData?.mimeType?.startsWith('image/'))?.inlineData;
    if (!image?.data) throw new Error('Gemini não retornou uma imagem.');
    return `data:${image.mimeType};base64,${image.data}`;
  }
  const text = parts.filter((part: any) => part.text && !part.thought).map((part: any) => part.text).join('\n');
  if (!text) throw new Error('Gemini retornou uma resposta vazia.');
  return text;
}
