/**
 * postSpecificationBuilder — Única fonte de verdade para montar
 * a especificação de criação de posts para IA externas.
 *
 * INVARIANTE: Preview do ERP, botão "Copiar Prompt", página pública e JSON
 * derivam TODOS de buildCampaignSpec / buildSingleSpecification / buildShareSpecification
 * e passam por renderSpecificationAsPrompt / renderShareSpecificationAsPrompt.
 *
 * ZERO chamadas de IA. 100% local e determinístico.
 */

import {
  PostCampaignSpec,
  PostCreationSpecification,
  PostElementSpec,
  PostFileResource,
  PostShareSpecification,
  OFFICIAL_FORMATS,
} from '../types/postSpecification';
import { ElementModel, PostCampaign } from '../types/postCreator';
import {
  resolveProductImages,
} from './postProductImageResolver';
import {
  resolveOfficialAssets,
  resolveConfiguredBadgeAssetUrl,
} from './postOfficialAssetResolver';
import {
  normalizeConfiguredAssetUrl,
  normalizeOfficialAssetUrl,
} from './postOfficialAssetConstants';
import { resolvePostBenefits } from './postBenefitsResolver';
import { resolvePostProductLiteralData } from './postProductLiteralDataResolver';
export { renderShareSpecificationAsPrompt, renderSpecificationAsPrompt } from './postSpecificationPromptRenderer';

// ---------------------------------------------------------------------------
// Constantes de marca
// ---------------------------------------------------------------------------

const BRAND_NAME = 'Móveis Morante';
const CATALOG_BASE_URL = 'https://www.moveismorante.com.br';

/** URL pública do produto no catálogo digital, preservando a variação selecionada. */
export function buildProductCatalogUrl(slug: string, variationId?: string | null): string {
  const base = `${CATALOG_BASE_URL}/produto/${slug}`;
  return variationId ? `${base}?var=${variationId}` : base;
}
// ---------------------------------------------------------------------------
// Instrução mestre (prompt de abertura do link público)
// ---------------------------------------------------------------------------

const MASTER_INSTRUCTION = `Você está recebendo a especificação oficial de criação de posts da Móveis Morante.

A página do produto indicada em PRODUCT_CATALOG_URL é a fonte factual de verdade para informações públicas do produto. Consulte essa página antes de criar a arte.

A seção CAMPAIGNS contém as campanhas disponíveis. O usuário informará qual campanha e formato deseja.

Para a campanha escolhida:
1. Siga as instruções gerais;
2. Siga os prompts dos elementos aplicáveis;
3. Examine as imagens com papel REFERENCE (ensinam direção visual, não copie literalmente);
4. Preserve fielmente os arquivos com papel OFFICIAL_ASSET (logo, selos oficiais). OFFICIAL_ASSET não é inspiração visual: é um arquivo gráfico pronto que deve ser inserido fielmente, sem redesenhar nem recriar por aproximação;
5. Utilize as fotos reais do produto disponíveis na seção IMAGENS OFICIAIS DO PRODUTO;
6. Preserve fielmente a variação indicada na URL;
7. Não invente informações comerciais (preço, desconto, parcelamento, oportunidade);
8. Não utilize texto de uma imagem de referência como fato do produto;
9. Respeite exatamente o formato solicitado (aspecto e dimensões);
10. Componha uma única peça publicitária coerente — não trate cada elemento como arte independente.

Se uma informação factual necessária não estiver disponível na página do produto ou nas imagens oficiais, não a invente.`;

// ---------------------------------------------------------------------------
// Hash de configuração
// ---------------------------------------------------------------------------

/** Hash SHA-256 simplificado em hex. Identifica versão da configuração. */
export async function computeConfigHash(data: unknown): Promise<string> {
  try {
    const text = JSON.stringify(data);
    const buffer = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 16);
  } catch {
    // Fallback determinístico sem crypto.subtle
    return String(JSON.stringify(data).length) + '_' + Date.now().toString(36);
  }
}

// ---------------------------------------------------------------------------
// Builder de um elemento
// ---------------------------------------------------------------------------

function buildElementSpec(model: ElementModel): PostElementSpec {
  const normalizedGeneratedUrl = model.generatedAssetUrl
    ? normalizeOfficialAssetUrl(model.generatedAssetUrl)
    : undefined;
  const centralizedBadgeUrl = model.elementType === 'BADGE'
    ? resolveConfiguredBadgeAssetUrl(model)
    : null;

  // Filtrar referências visuais para NÃO duplicar arquivos que já sejam o asset oficial do modelo
  const resources: PostFileResource[] = (model.referenceFiles || [])
    .filter(ref => {
      const normalizedRefUrl = model.elementType === 'BADGE'
        ? normalizeConfiguredAssetUrl(ref.fileUrl)
        : normalizeOfficialAssetUrl(ref.fileUrl);
      if (
        (normalizedGeneratedUrl && (normalizedRefUrl === normalizedGeneratedUrl || ref.fileUrl === model.generatedAssetUrl)) ||
        (centralizedBadgeUrl && normalizedRefUrl === centralizedBadgeUrl)
      ) {
        return false;
      }
      return true;
    })
    .map(ref => ({
      role: (ref as any).role ?? 'REFERENCE',
      elementType: model.elementType,
      name: ref.name,
      url: normalizeOfficialAssetUrl(ref.fileUrl),
      mimeType: ref.mimeType,
      description: (ref as any).description,
    }));

  // Asset oficial do próprio modelo (ex: logo, badge)
  // O asset de BADGE é centralizado em officialAssets.badge para existir uma única vez no prompt/ZIP.
  if (normalizedGeneratedUrl && model.elementType !== 'BADGE') {
    resources.push({
      role: 'OFFICIAL_ASSET',
      elementType: model.elementType,
      name: model.name,
      url: normalizedGeneratedUrl,
      mimeType: 'image/png',
    });
  }

  return {
    elementType: model.elementType,
    prompt: model.prompt,
    resources,
  };
}

// ---------------------------------------------------------------------------
// buildCampaignSpec — constrói a especificação de uma campanha
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// buildCampaignSpec — constrói a especificação de uma campanha
// ---------------------------------------------------------------------------

export function buildCampaignSpec(
  campaign: PostCampaign,
  activeModels: ElementModel[],
  context?: {
    opportunityId?: string | null;
    hasOpenView?: boolean;
    hasVariations?: boolean;
  },
): PostCampaignSpec {
  const oppId = context?.opportunityId || null;

  // Filtragem estrita de BADGE:
  // Se o produto NÃO possui oportunidade (oppId == null), NENHUM modelo de BADGE é incluído.
  // Se possui oportunidade, SOMENTE o modelo vinculado exatamente a essa oportunidade é incluído.
  const nonBadgeModels = activeModels.filter(model => model.elementType !== 'BADGE');
  const applicableBadge = oppId
    ? activeModels.find(model => model.elementType === 'BADGE' && model.opportunityId === oppId)
    : undefined;
  const filteredModels = applicableBadge
    ? [...nonBadgeModels, applicableBadge]
    : nonBadgeModels;

  const elements: PostElementSpec[] = filteredModels.map(buildElementSpec);

  // OPEN_VIEW é mantido como identificador técnico legado; na interface e no prompt é "imagem secundária".
  if (context?.hasOpenView && !elements.some(e => e.elementType === 'OPEN_VIEW')) {
    elements.push({
      elementType: 'OPEN_VIEW',
      prompt:
        'Use a imagem secundária da Variação 1 como complemento visual flutuante e bem posicionado, quando houver espaço suficiente. Ela pode mostrar o móvel aberto, outro ângulo, um detalhe ou o espaço interno; mostrar o móvel aberto não é obrigatório. Preserve a fotografia real, sem reconstrução pela IA e SEM borda. Não adicione textos, setas, rótulos, tags ou balões sobre ou ao redor dessa imagem.',
      resources: [],
    });
  }

  // Adicionar elemento estrutural VARIATION_GALLERY se houver mais de uma variação
  if (context?.hasVariations && !elements.some(e => e.elementType === 'VARIATION_GALLERY')) {
    elements.push({
      elementType: 'VARIATION_GALLERY',
      prompt:
        'Apresente de maneira compacta as opções reais das OUTRAS variações (cores complementares) utilizando a fotografia de cada variação. A Variação 1 já aparece nas imagens principal e secundária e NUNCA deve ser repetida nesta galeria. Somente as imagens das variações adicionais recebem borda branca; a imagem principal e a imagem secundária não recebem borda. Cada miniatura deve corresponder à fotografia real, sem gerar artificialmente novas cores ou acabamentos.',
      resources: [],
    });
  }

  return {
    id: campaign.id,
    name: campaign.name,
    description: campaign.description,
    instructions: campaign.instructions ?? campaign.generalGuidelines,
    elements,
  };
}

// ---------------------------------------------------------------------------
// buildSingleSpecification — 1 campanha (Prompt Preview no ERP)
// ---------------------------------------------------------------------------

export async function buildSingleSpecification(params: {
  productCatalogUrl: string;
  campaign: PostCampaign;
  activeModels: ElementModel[];
  elementModels?: ElementModel[];
  globalRules: string;
  product?: any;
  selectedVariationId?: string;
  manualOverrides?: {
    primaryUrl?: string;
    openViewUrl?: string | null;
    variationUrls?: Record<string, string>;
  } | null;
}): Promise<PostCreationSpecification> {
  const resolvedImages = params.product
    ? resolveProductImages({
        product: params.product,
        selectedVariationId: params.selectedVariationId,
        manualOverrides: params.manualOverrides,
      }).productImages
    : undefined;

  const oppId = params.product?.opportunity_id ?? params.product?.opportunityId ?? null;
  const hasOpenView = Boolean(resolvedImages?.openView?.url);
  const hasVariations = Boolean(resolvedImages?.variations && resolvedImages.variations.length > 0);

  const campaignSpec = buildCampaignSpec(params.campaign, params.activeModels, {
    opportunityId: oppId,
    hasOpenView,
    hasVariations,
  });

  const officialAssets = resolveOfficialAssets({
    product: params.product,
    activeModels: params.activeModels,
    elementModels: params.elementModels,
  });
  const benefits = resolvePostBenefits({ product: params.product, activeModels: params.activeModels });
  const productLiteralData = resolvePostProductLiteralData(params.product, params.selectedVariationId);

  const configHash = await computeConfigHash({
    campaign: campaignSpec,
    globalRules: params.globalRules,
    productImages: resolvedImages,
    officialAssets,
    benefits,
    productLiteralFields: productLiteralData.fields,
    opportunityId: oppId,
  });

  return {
    schemaVersion: '1.0',
    purpose: 'AI_POST_CREATION_INSTRUCTIONS',
    brand: { name: BRAND_NAME },
    product: {
      catalogUrl: params.productCatalogUrl,
      id: params.product?.id,
      name: params.product?.name,
      price: productLiteralData.currentPrice,
      oldPrice: productLiteralData.previousPrice,
      installmentText: productLiteralData.installmentText,
    },
    productLiteralFields: productLiteralData.fields,
    productImages: resolvedImages,
    officialAssets,
    benefits,
    campaign: campaignSpec,
    formats: OFFICIAL_FORMATS,
    globalRules: params.globalRules,
    generatedAt: new Date().toISOString(),
    configurationVersion: configHash,
  };
}
// ---------------------------------------------------------------------------
// buildShareSpecification — todas as campanhas (link público)
// ---------------------------------------------------------------------------

export async function buildShareSpecification(params: {
  productCatalogUrl: string;
  campaigns: Array<{ campaign: PostCampaign; activeModels: ElementModel[] }>;
  globalRules: string;
  product?: any;
  selectedVariationId?: string;
  manualOverrides?: {
    primaryUrl?: string;
    openViewUrl?: string | null;
    variationUrls?: Record<string, string>;
  } | null;
}): Promise<PostShareSpecification> {
  const resolvedImages = params.product
    ? resolveProductImages({
        product: params.product,
        selectedVariationId: params.selectedVariationId,
        manualOverrides: params.manualOverrides,
      }).productImages
    : undefined;

  const oppId = params.product?.opportunity_id ?? params.product?.opportunityId ?? null;
  const hasOpenView = Boolean(resolvedImages?.openView?.url);
  const hasVariations = Boolean(resolvedImages?.variations && resolvedImages.variations.length > 0);

  const campaignSpecs = params.campaigns.map(({ campaign, activeModels }) =>
    buildCampaignSpec(campaign, activeModels, {
      opportunityId: oppId,
      hasOpenView,
      hasVariations,
    }),
  );

  const allActiveModels = params.campaigns.flatMap(c => c.activeModels);
  const officialAssets = resolveOfficialAssets({
    product: params.product,
    activeModels: allActiveModels,
  });
  const benefits = resolvePostBenefits({ product: params.product, activeModels: allActiveModels });
  const productLiteralData = resolvePostProductLiteralData(params.product, params.selectedVariationId);

  const configHash = await computeConfigHash({
    campaigns: campaignSpecs,
    globalRules: params.globalRules,
    productImages: resolvedImages,
    officialAssets,
    benefits,
    productLiteralFields: productLiteralData.fields,
    opportunityId: oppId,
  });

  return {
    schemaVersion: '1.0',
    purpose: 'AI_POST_CREATION_INSTRUCTIONS',
    brand: { name: BRAND_NAME },
    product: {
      catalogUrl: params.productCatalogUrl,
      id: params.product?.id,
      name: params.product?.name,
      price: productLiteralData.currentPrice,
      oldPrice: productLiteralData.previousPrice,
      installmentText: productLiteralData.installmentText,
    },
    productLiteralFields: productLiteralData.fields,
    productImages: resolvedImages,
    officialAssets,
    benefits,
    campaigns: campaignSpecs,
    formats: OFFICIAL_FORMATS,
    globalRules: params.globalRules,
    masterInstruction: MASTER_INSTRUCTION,
    generatedAt: new Date().toISOString(),
    configurationVersion: configHash,
  };
}

