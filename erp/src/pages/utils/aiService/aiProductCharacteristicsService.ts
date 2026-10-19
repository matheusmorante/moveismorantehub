import { AiGateway } from '@/services/aiGateway/AiGateway';
import { CHARACTERISTICS_AI_LIMITS } from '@/services/aiGateway/config/aiLimitsConfig';
import {
  ProductAiCharacteristicsContext,
  ProductAiDescriptiveTextContext,
  ProductAiSuggestedCharacteristics,
  productAiSuggestedCharacteristicsSchema,
} from '../../../../../shared-utils/productAiFormSchemas';

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
 * Constrói o prompt para extração técnica com diretrizes de busca e visão
 */
export function buildCharacteristicsPrompt(context: ProductAiCharacteristicsContext): string {
  const brand = context.brand || 'Não informada';
  const model = context.model || 'Não informado';
  const category = context.categoryName || 'Não informada';
  const attributesPrompt = (context.availableAttributes || [])
    .map((attr) => {
      const optionsText =
        attr.options && attr.options.length > 0
          ? ` (Opções válidas: ${attr.options.join(', ')})`
          : '';
      return `- "${attr.name}" [Tipo: ${attr.dataType || 'text'}]${optionsText}`;
    })
    .join('\n');

  return `Você é um especialista em catálogo, ficha técnica e engenharia de móveis residenciais no Brasil.
Sua missão é pesquisar na internet e identificar com máximo rigor técnico e evidências reais as características do produto abaixo.

══════════════════════════════════════════════════════════════════
IDENTIFICAÇÃO DO PRODUTO:
- Nome do Produto: ${context.productName}
- Marca / Fabricante: ${brand}
- Modelo / Linha: ${model}
- Categoria do Produto: ${category}
- Descrição Atual: ${context.description || 'Não informada'}
- Informações Adicionais Fornecidas: ${context.additionalInfo || 'Nenhuma'}
══════════════════════════════════════════════════════════════════

DIRETRIZES DE PESQUISA E ANÁLISE (OBRIGATÓRIAS):
1. PESQUISA NA WEB:
   - Utilize a ferramenta Google Search para pesquisar a ficha técnica deste móvel.
   - O nome do produto é o único dado de identificação obrigatório. Use marca, linha/modelo, categoria, descrição e fotos como referências adicionais somente quando estiverem disponíveis.
   - Priorize o site oficial da marca "${brand}" quando a marca estiver informada; sem marca, pesquise pelo nome e demais dados disponíveis.
   - Procure fichas técnicas e manuais oficiais do modelo "${model}" quando houver modelo informado; sem modelo, identifique o produto usando as outras referências disponíveis.
   - Se o site do fabricante não possuir todas as informações, consulte fontes secundárias confiáveis (grandes marketplaces, lojas especializadas).
   - Verifique a correspondência entre o nome e cada referência opcional que estiver preenchida. Não trate campos vazios como critérios de pesquisa.
   - Se marca ou modelo não estiverem informados e não puderem ser confirmados por fontes confiáveis ou pelas fotos, omita esses dados identificados em vez de inventá-los.
   - Identifique possíveis versões e variações do produto.
   - Jamais misture características de modelos semelhantes. Não considere produtos semelhantes como correspondência exata sem evidência sólida.
   - Se houver divergências relevantes entre as fontes consultadas (ex: medidas divergentes ou material divergente), detalhe no campo "divergences".

2. ANÁLISE DE IMAGEM: Se houver fotos fornecidas, inspecione-as atentamente:
   - Tipo(s) de puxador: diferencie com rigor puxador "Cava" (usinagem/fenda no próprio MDF), perfil "Passante" (perfil de alumínio contínuo na borda), perfil "Perfilado" (pequena aba de sobrepor pontual), "Alça", etc. Se portas inferiores forem cava e superiores forem passante ou perfilado, inclua AMBOS na lista.
   - Quantidade e tipo de portas (ex: 2 portas, 3 portas, 4 portas, bater, basculante, correr).
   - Gavetas e corrediças (ex: telescópica, metálica).
   - Material da estrutura (ex: 100% MDF, MDP/MDF, Madeira Maciça).
   - Acabamentos e vidros (se houver).

3. DIMENSÕES: Se encontrar as dimensões exatas na ficha técnica ou fotos (Altura, Largura, Profundidade em cm, Peso em kg), extraia-as em números.

4. CONFIANÇA (NÃO inventar percentuais arbitrários):
   - Avalie a confiança geral na identificação do produto: "alta", "media" ou "baixa".
   - Avalie a confiança de CADA característica individual: "alta", "media" ou "baixa".
   - Se uma característica não tiver evidência confiável, marque com confiança "baixa".

CARACTERÍSTICAS DA CATEGORIA A SEREM PREENCHIDAS:
${attributesPrompt || 'Preencha as características comuns para esta categoria de móvel.'}

FORMATO OBRIGATÓRIO DE RESPOSTA (JSON PURO):
Retorne APENAS um objeto JSON no seguinte formato:
{
  "identifiedProduct": {
    "name": "Nome oficial identificado do produto",
    "brand": "Marca identificada ou string vazia se não confirmada",
    "model": "Modelo ou linha identificados ou string vazia se não confirmados",
    "confidence": "alta",
    "sources": [
      { "title": "Site Oficial ou Fonte", "uri": "https://..." }
    ],
    "divergences": "Divergências encontradas entre fontes, se houver, ou string vazia"
  },
  "technicalValues": {
    "Nome Exato da Característica": "Valor identificado ou array de valores se for múltipla escolha"
  },
  "itemConfidence": {
    "Nome Exato da Característica": "alta"
  },
  "height": 0,
  "width": 0,
  "depth": 0,
  "weight": 0,
  "reasoning": "Breve justificativa técnica das características identificadas (fontes e observações nas fotos)"
}`;
}

/**
 * Constrói o prompt para extração a partir de texto livre / ficha técnica do fornecedor
 */
export function buildDescriptiveTextPrompt(context: ProductAiDescriptiveTextContext): string {
  const attributesPrompt = (context.availableAttributes || [])
    .map((attr) => {
      const optionsText =
        attr.options && attr.options.length > 0
          ? ` (Opções válidas: ${attr.options.join(', ')})`
          : '';
      return `- "${attr.name}" [Tipo: ${attr.dataType || 'text'}]${optionsText}`;
    })
    .join('\n');

  return `Você é um especialista em catálogo, ficha técnica e engenharia de móveis residenciais no Brasil.
Sua missão é analisar minuciosamente o TEXTO DESCRITIVO / FICHA TÉCNICA fornecido e extrair de forma estruturada e precisa todas as informações do produto para autopreenchimento de cadastro no ERP.

══════════════════════════════════════════════════════════════════
TEXTO DESCRITIVO / FICHA TÉCNICA FORNECIDA:
${context.descriptiveText}

INFORMAÇÕES ADICIONAIS FORNECIDAS:
${context.additionalInfo || 'Nenhuma'}

DADOS JÁ PREENCHIDOS NO SISTEMA (SE HOUVER):
- Nome Atual: ${context.currentName || 'Vazio'}
- Marca Atual: ${context.currentBrand || 'Vazia'}
- Modelo Atual: ${context.currentModel || 'Vazio'}
- Categoria do Produto: ${context.categoryName || 'Não informada'}
══════════════════════════════════════════════════════════════════

DIRETRIZES DE EXTRAÇÃO:
1. IDENTIFICAÇÃO DO PRODUTO:
   - Extraia o Nome Comercial do Produto completo e atraente.
   - Identifique a Marca / Fabricante se mencionada no texto (ou preserve a atual se fizer sentido).
   - Identifique o Modelo / Linha se mencionado.
2. DESCRIÇÃO:
   - Redija uma descrição limpa, organizada e vendedora com base no texto fornecido.
3. DIMENSÕES:
   - Extraia Altura, Largura e Profundidade em cm (apenas números). Se houver peso em kg, extraia.
4. CARACTERÍSTICAS TÉCNICAS:
   - Mapeie rigorosamente as características encontradas para os atributos abaixo (quando disponíveis):
${attributesPrompt || 'Preencha as características comuns para este móvel (ex: Cor, Material da Estrutura, Tipo de Porta, etc.).'}
5. NÍVEIS DE CONFIANÇA:
   - Classifique cada item identificado com confiança: "alta", "media" ou "baixa".

FORMATO OBRIGATÓRIO DE RESPOSTA (JSON PURO):
Retorne APENAS um objeto JSON no seguinte formato:
{
  "identifiedProduct": {
    "name": "Nome oficial identificado",
    "brand": "Marca identificada",
    "model": "Modelo identificado",
    "confidence": "alta",
    "sources": [],
    "divergences": ""
  },
  "technicalValues": {
    "Nome Exato da Característica": "Valor identificado ou array de valores se for múltipla escolha"
  },
  "itemConfidence": {
    "Nome Exato da Característica": "alta"
  },
  "height": 0,
  "width": 0,
  "depth": 0,
  "weight": 0,
  "description": "Texto descritivo formatado e otimizado",
  "reasoning": "Resumo das informações extraídas a partir do texto fornecido"
}`;
}

/**
 * Sanitiza e analisa a resposta JSON recebida da IA
 */
export function cleanAndParseCharacteristicsJson(rawResponse: string): any {
  const cleaned = rawResponse
    .trim()
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/\s*```$/, '');

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
 * Serviço especializado em extração de características técnicas com Gemini 2.5 Flash,
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

    // 4. Disparar via AiGateway com Gemini 2.5 Flash e Google Search Tool
    const result = await AiGateway.requestText({
      operation: CHARACTERISTICS_AI_LIMITS.operation,
      moduleSource: 'characteristics_ai',
      model: CHARACTERISTICS_AI_LIMITS.model,
      payload,
      tools: [{ googleSearch: {} }],
      jsonMode: true,
      thinkingBudget: 'low',
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
    if (!validated.success) {
      if (parsedJson && typeof parsedJson === 'object' && !parsedJson.technicalValues) {
        return {
          technicalValues: parsedJson,
          reasoning: 'Características extraídas com sucesso.',
        };
      }
      throw new Error('A estrutura de características retornada pela IA é inválida.');
    }

    // 7. Normalizar chaves e valores contra o banco
    const normalizedTechnical = normalizeSuggestedTechnicalValues(
      validated.data.technicalValues || {},
      context.availableAttributes
    );

    // 8. Normalizar confiança por item (se não vier, default é 'alta')
    const itemConfidence: Record<string, 'alta' | 'media' | 'baixa'> = {
      ...(validated.data.itemConfidence || {}),
    };
    Object.keys(normalizedTechnical).forEach((key) => {
      if (!itemConfidence[key]) {
        itemConfidence[key] = 'alta';
      }
    });

    const identifiedProduct = validated.data.identifiedProduct || {
      name: context.productName,
      brand: context.brand,
      model: context.model,
      confidence: 'alta' as const,
      sources: validated.data.sources || [],
      divergences: '',
    };

    return {
      ...validated.data,
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
      thinkingBudget: 'low',
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
    if (!validated.success) {
      if (parsedJson && typeof parsedJson === 'object' && !parsedJson.technicalValues) {
        return {
          technicalValues: parsedJson,
          reasoning: 'Características extraídas com sucesso a partir do texto descritivo.',
        };
      }
      throw new Error('A estrutura retornada pela IA é inválida.');
    }

    const normalizedTechnical = normalizeSuggestedTechnicalValues(
      validated.data.technicalValues || {},
      context.availableAttributes
    );

    const itemConfidence: Record<string, 'alta' | 'media' | 'baixa'> = {
      ...(validated.data.itemConfidence || {}),
    };
    Object.keys(normalizedTechnical).forEach((key) => {
      if (!itemConfidence[key]) {
        itemConfidence[key] = 'alta';
      }
    });

    const identifiedProduct = validated.data.identifiedProduct || {
      name: context.currentName || '',
      brand: context.currentBrand || '',
      model: context.currentModel || '',
      confidence: 'alta' as const,
      sources: [],
      divergences: '',
    };

    return {
      ...validated.data,
      identifiedProduct,
      itemConfidence,
      technicalValues: normalizedTechnical,
    };
  },
};
