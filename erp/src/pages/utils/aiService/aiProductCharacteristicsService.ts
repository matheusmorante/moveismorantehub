import { AiGateway } from '@/services/aiGateway/AiGateway';
import { CHARACTERISTICS_AI_LIMITS } from '@/services/aiGateway/config/aiLimitsConfig';
import {
  ProductAiCharacteristicsContext,
  ProductAiDescriptiveTextContext,
  ProductAiSuggestedCharacteristics,
  productAiSuggestedCharacteristicsSchema,
} from '../../../../../shared-utils/productAiFormSchemas';

import {
  buildCharacteristicsPrompt,
  buildDescriptiveTextPrompt,
} from './aiProductCharacteristicsPrompts';

export { buildCharacteristicsPrompt, buildDescriptiveTextPrompt };

/**
 * Utilitário para converter URLs de imagens em inlineData (Base64) com timeout seguro
 */
export async function convertImageUrlsToInlineData(
  urls: string[],
  maxImages = 3,
  timeoutMs = 6000
): Promise<Array<{ inlineData: { mimeType: string; data: string } }>> {
  const targetUrls = (urls || [])
    .filter((url) => typeof url === 'string' && url.startsWith('http'))
    .slice(0, maxImages);

  const imageParts = await Promise.all(
    targetUrls.map(async (url) => {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), timeoutMs);
        const res = await fetch(url, { signal: controller.signal });
        clearTimeout(timer);

        if (!res.ok) return null;
        const blob = await res.blob();

        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = String(reader.result || '');
            const data = result.split(',')[1] || '';
            resolve(data);
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });

        if (!base64) return null;
        return {
          inlineData: {
            mimeType: blob.type || 'image/jpeg',
            data: base64,
          },
        };
      } catch {
        return null;
      }
    })
  );

  return imageParts.filter(Boolean) as Array<{
    inlineData: { mimeType: string; data: string };
  }>;
}

/**
 * Sanitiza e analisa a resposta JSON recebida da IA
 */
export function cleanAndParseCharacteristicsJson(rawResponse: string): any {
  let cleaned = rawResponse.trim();
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  } else {
    const firstBrace = cleaned.indexOf('{');
    const lastBrace = cleaned.lastIndexOf('}');
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1).trim();
    }
  }

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    console.error('[cleanAndParseCharacteristicsJson] Falha ao fazer parse de JSON:', err, rawResponse);
    throw new Error('A resposta da IA não veio em formato JSON válido. Tente novamente.');
  }
}

/**
 * Normaliza os valores técnicos sugeridos contra os atributos cadastrados no banco
 */
export function normalizeSuggestedTechnicalValues(
  rawTechnical: Record<string, any>,
  availableAttributes: ProductAiCharacteristicsContext['availableAttributes'] = []
): Record<string, any> {
  const normalized: Record<string, any> = {};

  const availableAttrsMap = new Map<
    string,
    { id: string; name: string; dataType?: string; options?: string[] }
  >();
  availableAttributes.forEach((attr) => {
    availableAttrsMap.set(attr.name.toLowerCase().trim(), attr);
  });

  for (const [key, rawValue] of Object.entries(rawTechnical || {})) {
    if (rawValue === null || rawValue === undefined || rawValue === '') continue;

    const attr = availableAttrsMap.get(key.toLowerCase().trim());
    const canonicalKey = attr ? attr.name : key;

    if (attr && attr.options && attr.options.length > 0) {
      if (Array.isArray(rawValue)) {
        const matchedOptions = rawValue
          .map((item) => {
            const strItem = String(item).trim().toLowerCase();
            return attr.options?.find((opt) => opt.toLowerCase().trim() === strItem) || null;
          })
          .filter(Boolean) as string[];

        if (matchedOptions.length > 0) {
          normalized[canonicalKey] = matchedOptions;
        }
      } else {
        const strVal = String(rawValue).trim().toLowerCase();
        const matchedOption = attr.options.find((opt) => opt.toLowerCase().trim() === strVal);

        if (matchedOption) {
          normalized[canonicalKey] = matchedOption;
        } else {
          // Busca parcial se não houver correspondência exata
          const partialMatch = attr.options.find((opt) =>
            strVal.includes(opt.toLowerCase().trim())
          );
          normalized[canonicalKey] = partialMatch || String(rawValue);
        }
      }
    } else {
      normalized[canonicalKey] = rawValue;
    }
  }

  return normalized;
}

/**
 * Serviço especializado em extração de características técnicas com Gemini 3.5 Flash-Lite,
 * Grounding de busca na web e análise visual de fotos.
 */
export const aiProductCharacteristicsService = {
  async extractProductCharacteristicsWithAI(
    context: ProductAiCharacteristicsContext
  ): Promise<ProductAiSuggestedCharacteristics> {
    // 1. Converter fotos válidas com timeout
    const imageParts = await convertImageUrlsToInlineData(context.images || [], 3, 6000);

    // 2. Construir prompt contextualizado
    const prompt = buildCharacteristicsPrompt(context);

    // 3. Montar payload multimodal
    const payload = [
      {
        role: 'user',
        parts: [{ text: prompt }, ...imageParts],
      },
    ];

    // 4. Disparar via AiGateway com Gemini 3.5 Flash-Lite e Google Search Tool
    const result = await AiGateway.requestText({
      operation: CHARACTERISTICS_AI_LIMITS.operation,
      moduleSource: 'characteristics_ai',
      model: CHARACTERISTICS_AI_LIMITS.model,
      payload,
      tools: [{ googleSearch: {} }],
      jsonMode: false,
    });

    if (!result.success || !result.data) {
      throw new Error(
        result.userFriendlyMessage ||
          result.errorMessage ||
          'Falha ao processar características com IA.'
      );
    }

    // 5. Sanitizar e fazer parse do JSON
    const parsedJson = cleanAndParseCharacteristicsJson(result.data);

    // 6. Validar com schema Zod
    const validated = productAiSuggestedCharacteristicsSchema.safeParse(parsedJson);
    let resolvedData: ProductAiSuggestedCharacteristics;

    if (validated.success) {
      resolvedData = validated.data;
    } else {
      console.warn('[extractProductCharacteristicsWithAI] Validação Zod com avisos:', validated.error);
      if (parsedJson && typeof parsedJson === 'object') {
        const candidateTechnical =
          parsedJson.technicalValues && typeof parsedJson.technicalValues === 'object'
            ? parsedJson.technicalValues
            : parsedJson;
        if (Object.keys(candidateTechnical).length > 0) {
          resolvedData = {
            technicalValues: candidateTechnical,
            identifiedProduct: parsedJson.identifiedProduct,
            itemConfidence: parsedJson.itemConfidence,
            height: parsedJson.height,
            width: parsedJson.width,
            depth: parsedJson.depth,
            weight: parsedJson.weight,
            reasoning: typeof parsedJson.reasoning === 'string' ? parsedJson.reasoning : 'Características extraídas com sucesso.',
            sources: parsedJson.sources,
          };
        } else {
          throw new Error('A estrutura de características retornada pela IA é inválida.');
        }
      } else {
        throw new Error('A estrutura de características retornada pela IA é inválida.');
      }
    }

    // 7. Normalizar chaves e valores contra o banco
    const normalizedTechnical = normalizeSuggestedTechnicalValues(
      resolvedData.technicalValues || {},
      context.availableAttributes
    );

    // 8. Normalizar confiança por item (se não vier, default é 'alta')
    const itemConfidence: Record<string, 'alta' | 'media' | 'baixa'> = {
      ...(resolvedData.itemConfidence || {}),
    };
    Object.keys(normalizedTechnical).forEach((key) => {
      if (!itemConfidence[key]) {
        itemConfidence[key] = 'alta';
      }
    });

    const identifiedProduct = resolvedData.identifiedProduct || {
      name: context.productName,
      brand: context.brand,
      model: context.model,
      confidence: 'alta' as const,
      sources: resolvedData.sources || [],
      divergences: '',
    };

    return {
      ...resolvedData,
      identifiedProduct,
      itemConfidence,
      technicalValues: normalizedTechnical,
    };
  },

  async extractFromDescriptiveTextWithAI(
    context: ProductAiDescriptiveTextContext
  ): Promise<ProductAiSuggestedCharacteristics> {
    const prompt = buildDescriptiveTextPrompt(context);

    const payload = [
      {
        role: 'user',
        parts: [{ text: prompt }],
      },
    ];

    const result = await AiGateway.requestText({
      operation: CHARACTERISTICS_AI_LIMITS.operation,
      moduleSource: 'characteristics_ai',
      model: CHARACTERISTICS_AI_LIMITS.model,
      payload,
      jsonMode: true,
    });

    if (!result.success || !result.data) {
      throw new Error(
        result.userFriendlyMessage ||
          result.errorMessage ||
          'Falha ao processar texto descritivo com IA.'
      );
    }

    const parsedJson = cleanAndParseCharacteristicsJson(result.data);
    const validated = productAiSuggestedCharacteristicsSchema.safeParse(parsedJson);
    let resolvedData: ProductAiSuggestedCharacteristics;

    if (validated.success) {
      resolvedData = validated.data;
    } else {
      console.warn('[extractFromDescriptiveTextWithAI] Validação Zod com avisos:', validated.error);
      if (parsedJson && typeof parsedJson === 'object') {
        const candidateTechnical =
          parsedJson.technicalValues && typeof parsedJson.technicalValues === 'object'
            ? parsedJson.technicalValues
            : parsedJson;
        if (Object.keys(candidateTechnical).length > 0) {
          resolvedData = {
            technicalValues: candidateTechnical,
            identifiedProduct: parsedJson.identifiedProduct,
            itemConfidence: parsedJson.itemConfidence,
            height: parsedJson.height,
            width: parsedJson.width,
            depth: parsedJson.depth,
            weight: parsedJson.weight,
            reasoning: typeof parsedJson.reasoning === 'string' ? parsedJson.reasoning : 'Características extraídas com sucesso a partir do texto descritivo.',
            sources: parsedJson.sources,
          };
        } else {
          throw new Error('A estrutura retornada pela IA é inválida.');
        }
      } else {
        throw new Error('A estrutura retornada pela IA é inválida.');
      }
    }

    const normalizedTechnical = normalizeSuggestedTechnicalValues(
      resolvedData.technicalValues || {},
      context.availableAttributes
    );

    const itemConfidence: Record<string, 'alta' | 'media' | 'baixa'> = {
      ...(resolvedData.itemConfidence || {}),
    };
    Object.keys(normalizedTechnical).forEach((key) => {
      if (!itemConfidence[key]) {
        itemConfidence[key] = 'alta';
      }
    });

    const identifiedProduct = resolvedData.identifiedProduct || {
      name: context.currentName || '',
      brand: context.currentBrand || '',
      model: context.currentModel || '',
      confidence: 'alta' as const,
      sources: [],
      divergences: '',
    };

    return {
      ...resolvedData,
      identifiedProduct,
      itemConfidence,
      technicalValues: normalizedTechnical,
    };
  },
};
