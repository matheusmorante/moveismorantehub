import { AiGateway } from '@/services/aiGateway/AiGateway';
import { PostTemplate } from '../types/postTemplate';
import { postGenerationGuidelines } from './postGenerationGuidelines';
import {
  ANTI_HALLUCINATION_COMMERCIAL_RULES,
  assertNoUnresolvedPlaceholders,
  interpolateTemplatePrompt,
  resolveOpportunityRules,
} from './postModelPromptBuilder';
import {
  resolveModelAssets,
  SemanticProductImages,
  validateGenerationPreFlight,
} from './postModelAssetResolver';

export interface GeneratePostPreviewParams {
  model: PostTemplate;
  product: {
    name: string;
    price: string;
    oldPrice?: string;
    installmentValue?: string;
    mainImageUrl: string;
    category?: string;
    description?: string;
  };
  productId: string;
  format: string;
  images?: SemanticProductImages;
  opportunity?: string;
}

export interface GenerationPreviewResult {
  imageUrl: string;
  debugContext: {
    productName: string;
    productPrice: string;
    productOldPrice?: string;
    opportunityName?: string;
    resolvedOpportunity: string;
    format: string;
    hasPrimaryImage: boolean;
    hasSecondaryImage: boolean;
    variationImagesCount: number;
    hasPrimaryVisualReference: boolean;
    hasLogoAsset: boolean;
    hasOpportunityAsset: boolean;
    hasInstallmentAsset: boolean;
    finalPrompt: string;
  };
}

async function imageToGenerativePart(url: string) {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Não foi possível carregar o arquivo de referência: ${url}`);
  }
  const blob = await response.blob();
  const base64Data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const res = String(reader.result);
      const commaIdx = res.indexOf(',');
      resolve(commaIdx >= 0 ? res.slice(commaIdx + 1) : res);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

  return {
    inlineData: {
      mimeType: blob.type || 'image/png',
      data: base64Data,
    },
  };
}

export function assemblePreviewPrompt(params: {
  template: PostTemplate;
  product: GeneratePostPreviewParams['product'];
  format: string;
  opportunityName?: string;
  images: SemanticProductImages;
  assets: ReturnType<typeof resolveModelAssets>;
}): string {
  const { template, product, format, opportunityName, images } = params;

  // 1. Resolução da Oportunidade Exclusiva
  const oppRules = resolveOpportunityRules(opportunityName);

  // 2. Interpolação dos placeholders do prompt do modelo com dados reais
  const interpolatedPrompt = interpolateTemplatePrompt(template.imagePrompt, {
    name: product.name,
    price: product.price,
    oldPrice: product.oldPrice || '',
    installment: product.installmentValue || 'Em até 10x sem juros',
    opportunity: oppRules.allowedTerms[0] || 'SEM OPORTUNIDADE',
    category: product.category || '',
    description: product.description || '',
    aspectRatio: format,
  });

  // 3. Validação estrita: PROIBIDO enviar placeholders {{...}}
  assertNoUnresolvedPlaceholders(interpolatedPrompt);

  const guidelines = postGenerationGuidelines.get();

  // 4. Estruturação dos dados reais do produto
  const structuredProductData = `
DADOS REAIS DO PRODUTO (USE ESTRITAMENTE ESTES DADOS):
- Nome Oficial: "${product.name}"
- Preço Promocional Atual: ${product.price}
${product.oldPrice ? `- Preço Anterior De Risco: ${product.oldPrice}` : '- Sem preço anterior cadastrado.'}
- Condição de Parcelamento: ${product.installmentValue || 'Em até 10x sem juros'}
- Formato do Post: ${format}
- Diretriz de Oportunidade: ${oppRules.instruction}
`.trim();

  // 5. Regras semânticas para as imagens
  const secondaryImageDirective = images.secondary
    ? 'SECONDARY_IMAGE is required and must be visibly present. Do not omit or cover it. If space is tight, scale down secondary elements before removing SECONDARY_IMAGE.'
    : 'No secondary image supplied. Redistribute space cleanly without empty placeholders.';

  const variationsDirective =
    images.variations.length > 0
      ? `CONTAINER DE VARIAÇÕES (OBRIGATÓRIO):
Existem ${images.variations.length} imagens de variações extras fornecidas (VARIATION_IMAGES).
Você DEVE colocá-las em um container visual próprio, dedicado e elegante, contendo:
- Borda branca fina;
- Cantos arredondados;
- Sem textos, sem nomes e sem legendas dentro do container;
- Tamanho secundário em relação ao produto principal;
- Nunca misture estas imagens com a PRIMARY_IMAGE ou SECONDARY_IMAGE.`
      : 'Sem variações adicionais. Não crie nenhum container vazio, redistribua o espaço da composição harmonicamente.';

  return [
    'OBJETIVO PRINCIPAL: Crie a ARTE FINAL profissional e pronta para publicação de um anúncio promocional de varejo para Instagram.',
    'A composição deve ser fiel à estética, layout e tipografia da referência visual principal oficial anexada.',
    guidelines.content,
    ANTI_HALLUCINATION_COMMERCIAL_RULES,
    structuredProductData,
    secondaryImageDirective,
    variationsDirective,
    'INSTRUÇÕES ESPECÍFICAS DO MODELO:',
    interpolatedPrompt,
  ]
    .filter(Boolean)
    .join('\n\n');
}

export async function generatePostModelPreview(
  params: GeneratePostPreviewParams
): Promise<GenerationPreviewResult> {
  const images: SemanticProductImages = params.images || {
    primary: params.product.mainImageUrl,
    variations: [],
  };

  const assets = resolveModelAssets(params.model, params.opportunity);

  // Montagem do prompt final
  const finalPrompt = assemblePreviewPrompt({
    template: params.model,
    product: params.product,
    format: params.format,
    opportunityName: params.opportunity,
    images,
    assets,
  });

  // Validação Pre-Flight obrigatória
  const preFlight = validateGenerationPreFlight({
    productName: params.product.name,
    primaryImage: images.primary,
    template: params.model,
    format: params.format,
    finalPrompt,
    primaryVisualReference: assets.primaryVisualReference,
  });

  if (!preFlight.valid) {
    throw new Error(preFlight.errors.join(' '));
  }

  const oppRules = resolveOpportunityRules(params.opportunity);

  const debugContext: GenerationPreviewResult['debugContext'] = {
    productName: params.product.name,
    productPrice: params.product.price,
    productOldPrice: params.product.oldPrice,
    opportunityName: params.opportunity,
    resolvedOpportunity: oppRules.normalized,
    format: params.format,
    hasPrimaryImage: !!images.primary,
    hasSecondaryImage: !!images.secondary,
    variationImagesCount: images.variations.length,
    hasPrimaryVisualReference: !!assets.primaryVisualReference,
    hasLogoAsset: !!assets.logoAsset,
    hasOpportunityAsset: !!assets.opportunityAsset,
    hasInstallmentAsset: !!assets.installmentAsset,
    finalPrompt,
  };

  // MONTAGEM MULTIMODAL ESTRITA NA ORDEM ESPECIFICADA (1 A 10):
  // 1. prompt geral
  // 2. dados reais do produto (incorporados no texto principal)
  // 3. PRIMARY_IMAGE
  // 4. SECONDARY_IMAGE
  // 5. VARIATION_IMAGES
  // 6. referência visual principal
  // 7. logo
  // 8. selo da oportunidade
  // 9. asset de parcelamento
  // 10. demais referências
  const parts: any[] = [];

  // 1 & 2: Prompt geral e dados reais
  parts.push({ text: finalPrompt });

  // 3: PRIMARY_IMAGE
  parts.push({
    text: 'PRIMARY_IMAGE: Imagem principal do produto. Deve receber o maior destaque visual na composição.',
  });
  parts.push(await imageToGenerativePart(images.primary));

  // 4: SECONDARY_IMAGE
  if (images.secondary) {
    parts.push({
      text: 'SECONDARY_IMAGE: Segunda imagem da primeira variação. OBRIGATÓRIA e visivelmente presente, próxima à principal.',
    });
    parts.push(await imageToGenerativePart(images.secondary));
  }

  // 5: VARIATION_IMAGES
  for (let i = 0; i < images.variations.length; i++) {
    parts.push({
      text: `VARIATION_IMAGE_${i + 1}: Foto de variação adicional. Renderize exclusivamente dentro do container de variações com borda branca e cantos arredondados, sem texto.`,
    });
    parts.push(await imageToGenerativePart(images.variations[i]));
  }

  // 6: Referência visual principal
  if (assets.primaryVisualReference) {
    parts.push({
      text: 'VISUAL_REFERENCE_PRIMARY: Layout, aesthetic, typography and composition master reference. Replicate this retail visual standard faithfully.',
    });
    parts.push(await imageToGenerativePart(assets.primaryVisualReference.fileUrl));
  }

  // 7: Logo oficial
  if (assets.logoAsset) {
    parts.push({
      text: 'LOGO_OFFICIAL: Logo oficial da Móveis Morante. Posicione no topo esquerdo conforme a referência. Não redesenhe a marca.',
    });
    parts.push(await imageToGenerativePart(assets.logoAsset.fileUrl));
  }

  // 8: Selo da oportunidade
  if (assets.opportunityAsset) {
    parts.push({
      text: 'OPPORTUNITY_BADGE: Selo oficial da oportunidade selecionada. Posicione no topo direito.',
    });
    parts.push(await imageToGenerativePart(assets.opportunityAsset.fileUrl));
  }

  // 9: Asset de parcelamento
  if (assets.installmentAsset) {
    parts.push({
      text: 'INSTALLMENT_OFFICIAL_ASSET: Asset oficial de parcelamento com bandeiras de cartões (EM ATÉ 10X SEM JUROS). Use este asset ou replique exatamente os elementos de pagamento.',
    });
    parts.push(await imageToGenerativePart(assets.installmentAsset.fileUrl));
  }

  // 10: Demais referências
  for (const extraAsset of assets.additionalAssets) {
    parts.push({
      text: `ADDITIONAL_ASSET (${extraAsset.name}): ${extraAsset.description || ''}`,
    });
    parts.push(await imageToGenerativePart(extraAsset.fileUrl));
  }

  const result = await AiGateway.requestImage({
    operation: 'marketing_post_preview',
    payload: [{ parts }],
  });

  if (!result.success || !result.data) {
    throw new Error(result.userFriendlyMessage || 'Falha ao gerar arte do post com IA.');
  }

  return {
    imageUrl: result.data,
    debugContext,
  };
}
