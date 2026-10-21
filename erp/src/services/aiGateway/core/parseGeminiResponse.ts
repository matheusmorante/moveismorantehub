import { AiCategory } from '../types/aiGatewayTypes';

function describeEmptyResponse(json: any): string {
  const candidates = Array.isArray(json?.candidates) ? json.candidates : [];
  const diagnostics = {
    promptBlockReason: json?.promptFeedback?.blockReason || null,
    promptSafetyRatings: (json?.promptFeedback?.safetyRatings || []).map((rating: any) => ({
      category: rating?.category || null,
      probability: rating?.probability || null,
    })),
    candidateCount: candidates.length,
    candidates: candidates.map((candidate: any) => {
      const parts = Array.isArray(candidate?.content?.parts) ? candidate.content.parts : [];
      return {
        finishReason: candidate?.finishReason || null,
        safetyRatings: (candidate?.safetyRatings || []).map((rating: any) => ({
          category: rating?.category || null,
          probability: rating?.probability || null,
        })),
        parts: parts.map((part: any) => ({
          hasText: typeof part?.text === 'string' && Boolean(part.text.trim()),
          thought: Boolean(part?.thought),
          types: Object.keys(part && typeof part === 'object' ? part : {}).filter(
            (key) => key !== 'text'
          ),
        })),
      };
    }),
    usage: {
      promptTokens: json?.usageMetadata?.promptTokenCount ?? null,
      candidateTokens: json?.usageMetadata?.candidatesTokenCount ?? null,
      totalTokens: json?.usageMetadata?.totalTokenCount ?? null,
    },
  };

  return JSON.stringify(diagnostics);
}

export function parseGeminiResponse(json: any, category: AiCategory): any {
  if (json?.embedding?.values && Array.isArray(json.embedding.values)) {
    return json.embedding.values;
  }
  const candidates = Array.isArray(json?.candidates) ? json.candidates : [];
  if (category === 'IMAGE') {
    const image = candidates
      .flatMap((candidate: any) => candidate?.content?.parts || [])
      .find(
        (part: any) => !part.thought && part.inlineData?.mimeType?.startsWith('image/')
      )?.inlineData;
    if (!image?.data) throw new Error('Gemini não retornou uma imagem.');
    return `data:${image.mimeType};base64,${image.data}`;
  }
  const text = candidates
    .flatMap((candidate: any) => candidate?.content?.parts || [])
    .filter((part: any) => part.text && !part.thought)
    .map((part: any) => part.text)
    .join('\n');
  if (!text) {
    const error = new Error(
      `Gemini retornou uma resposta sem texto utilizável. Diagnóstico: ${describeEmptyResponse(json)}`
    );
    error.name = 'GeminiEmptyResponseError';
    throw error;
  }
  return text;
}
