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
  renderProductImagesPromptSection,
  ABSOLUTE_FIDELITY_RULE,
} from './postProductImageResolver';
import {
  resolveOfficialAssets,
  renderOfficialAssetsPromptSection,
} from './postOfficialAssetResolver';
import {
  OFFICIAL_ASSET_MASTER_RULE,
  normalizeOfficialAssetUrl,
} from './postOfficialAssetConstants';
import {
  GLOBAL_ART_DIRECTION_SECTION,
  VISUAL_GROUNDING_MANDATORY_RULE,
  DIRECT_WORKFLOW_FORMAT_INSTRUCTION,
} from './postArtDirectionGuidelines';

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

  // Filtrar referências visuais para NÃO duplicar arquivos que já sejam o asset oficial do modelo
  const resources: PostFileResource[] = (model.referenceFiles || [])
    .filter(ref => {
      const normalizedRefUrl = normalizeOfficialAssetUrl(ref.fileUrl);
      if (normalizedGeneratedUrl && (normalizedRefUrl === normalizedGeneratedUrl || ref.fileUrl === model.generatedAssetUrl)) {
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
  if (normalizedGeneratedUrl) {
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
  const filteredModels = activeModels.filter(model => {
    if (model.elementType === 'BADGE') {
      if (!oppId) return false;
      return model.opportunityId === oppId;
    }
    return true;
  });

  const elements: PostElementSpec[] = filteredModels.map(buildElementSpec);

  // Adicionar elemento estrutural OPEN_VIEW se houver foto aberta selecionada
  if (context?.hasOpenView && !elements.some(e => e.elementType === 'OPEN_VIEW')) {
    elements.push({
      elementType: 'OPEN_VIEW',
      prompt:
        'Quando houver fotografia oficial do produto aberto, apresente-a em um card visual secundário e discreto, quando houver espaço suficiente. A fotografia deve permanecer real, limpa e sem reconstrução pela IA. REGRA OBRIGATÓRIA: NÃO adicione rótulos, tags ou balões na foto interna como "material de qualidade", "amplo espaço interno", "design moderno" ou slogans como "mais organização para o seu dia". Ela serve exclusivamente para mostrar de forma visual e limpa a divisão interna e funcionalidade do móvel.',
      resources: [],
    });
  }

  // Adicionar elemento estrutural VARIATION_GALLERY se houver mais de uma variação
  if (context?.hasVariations && !elements.some(e => e.elementType === 'VARIATION_GALLERY')) {
    elements.push({
      elementType: 'VARIATION_GALLERY',
      prompt:
        'Apresente de maneira compacta as opções reais de OUTRAS variações (cores complementares) utilizando a fotografia de cada variação. REGRA OBRIGATÓRIA: A Variação 1 (cor principal já em destaque no anúncio) NUNCA deve ser incluída na galeria secundária de cores. Apresente apenas as outras cores disponíveis, sem duplicar a cor principal. Cada miniatura deve corresponder à sua fotografia real. Não gerar artificialmente novas cores ou acabamentos.',
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
  const hasVariations = Boolean(resolvedImages?.variations && resolvedImages.variations.length > 1);

  const campaignSpec = buildCampaignSpec(params.campaign, params.activeModels, {
    opportunityId: oppId,
    hasOpenView,
    hasVariations,
  });

  const officialAssets = resolveOfficialAssets({
    product: params.product,
    activeModels: params.activeModels,
  });

  const configHash = await computeConfigHash({
    campaign: campaignSpec,
    globalRules: params.globalRules,
    productImages: resolvedImages,
    officialAssets,
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
      price: params.product?.price ?? params.product?.unitPrice,
      oldPrice: params.product?.oldPrice ?? params.product?.promoPrice,
    },
    productImages: resolvedImages,
    officialAssets,
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
  const hasVariations = Boolean(resolvedImages?.variations && resolvedImages.variations.length > 1);

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

  const configHash = await computeConfigHash({
    campaigns: campaignSpecs,
    globalRules: params.globalRules,
    productImages: resolvedImages,
    officialAssets,
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
      price: params.product?.price ?? params.product?.unitPrice,
      oldPrice: params.product?.oldPrice ?? params.product?.promoPrice,
    },
    productImages: resolvedImages,
    officialAssets,
    campaigns: campaignSpecs,
    formats: OFFICIAL_FORMATS,
    globalRules: params.globalRules,
    masterInstruction: MASTER_INSTRUCTION,
    generatedAt: new Date().toISOString(),
    configurationVersion: configHash,
  };
}

// ---------------------------------------------------------------------------
// renderSpecificationAsPrompt — texto legível para a IA
// ---------------------------------------------------------------------------

const SEP = '='.repeat(50);

function renderResources(resources: PostFileResource[]): string {
  if (!resources.length) return '';
  return resources.map(r => {
    const tag = r.role === 'OFFICIAL_ASSET' ? '[ASSET OFICIAL]' : '[REFERÊNCIA VISUAL]';
    return `${tag} ${r.name}\n  URL: ${r.url}${r.description ? `\n  Descrição: ${r.description}` : ''}`;
  }).join('\n');
}

function renderCampaignSection(campaign: PostCampaignSpec): string {
  const lines: string[] = [
    SEP,
    `CAMPANHA: ${campaign.name}`,
    SEP,
  ];
  if (campaign.description) lines.push(`Descrição: ${campaign.description}`);
  if (campaign.instructions) lines.push(`\nInstruções gerais:\n${campaign.instructions}`);

  for (const el of campaign.elements) {
    lines.push('');
    if (el.elementType === 'POST_REFERENCE') {
      lines.push(`--- ELEMENTO: POST_REFERENCE (POST DE EXEMPLO / REFERÊNCIA VISUAL DE SUCESSO) ---`);
      lines.push(
        'INSTRUÇÃO OBRIGATÓRIA DE COMPOSIÇÃO: O arquivo de referência anexado representa um post real aprovado que funcionou perfeitamente. ' +
        'Utilize este post de exemplo como guia estrito para: formato dos containers, disposição dos cards, estilo da tipografia, hierarquia do bloco de preço e contraste. ' +
        'Altere exclusivamente o produto e a ambientação de fundo do móvel para o novo item, preservando fielmente a estrutura visual dos containers e textos que deram certo.'
      );
    } else {
      lines.push(`--- ELEMENTO: ${el.elementType} ---`);
    }
    if (el.prompt) lines.push(`Prompt:\n${el.prompt}`);
    if (el.instructions) lines.push(`Instruções adicionais:\n${el.instructions}`);
    const res = renderResources(el.resources);
    if (res) lines.push(`Recursos:\n${res}`);
  }

  return lines.join('\n');
}

/** Renderiza uma especificação de campanha única como texto para o Prompt Preview. */
export function renderSpecificationAsPrompt(spec: PostCreationSpecification): string {
  const lines: string[] = [
    SEP,
    `MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POST`,
    SEP,
    '',
    VISUAL_GROUNDING_MANDATORY_RULE,
    '',
    ABSOLUTE_FIDELITY_RULE,
    '',
    `PRODUTO`,
    '',
    `Página oficial do produto:`,
    spec.product.catalogUrl,
    '',
    `Consulte esta página para obter as informações públicas reais do produto.`,
    `Ela é a fonte factual de verdade para: nome, variação, características,`,
    `fotos, preço, condições comerciais e oportunidade disponíveis publicamente.`,
    `Não invente informações ausentes.`,
    '',
  ];

  if (spec.productImages) {
    lines.push(renderProductImagesPromptSection(spec.productImages));
    lines.push('');
  }

  if (spec.officialAssets) {
    lines.push(renderOfficialAssetsPromptSection(spec.officialAssets));
    lines.push('');
  }

  lines.push(GLOBAL_ART_DIRECTION_SECTION);
  lines.push('');

  lines.push(renderCampaignSection(spec.campaign));
  lines.push('');
  lines.push(SEP);
  lines.push('FORMATOS');
  lines.push(SEP);
  lines.push(...spec.formats.map(f => `${f.name.toUpperCase()}\n${f.aspectRatio}\n${f.referenceSize}\n`));
  lines.push(DIRECT_WORKFLOW_FORMAT_INSTRUCTION);
  lines.push('');
  lines.push(SEP);
  lines.push('REGRAS FINAIS');
  lines.push(SEP);
  lines.push(`- Preserve fielmente o produto e sua variação;`);
  lines.push(`- As fotos oficiais fornecidas em IMAGENS OFICIAIS DO PRODUTO são a fonte visual de verdade;`);
  lines.push(`- Use somente fatos verificáveis na página do produto;`);
  lines.push(`- Não invente preço, desconto, parcelamento, oportunidade ou características;`);
  lines.push(`- Referências visuais definem direção visual — não copie literalmente;`);
  lines.push(`- Assets oficiais (logo, selos) são arquivos gráficos prontos: NUNCA redesenhe, recrie ou estilize;`);
  lines.push(`- Se a IA não puder inserir o asset fielmente, deixe o espaço reservado em vez de inventar uma marca;`);
  lines.push(`- Direção de arte profissional ao redor do móvel: crie ambientação comercial elegante, iluminação publicitária com sombras reais e bloco de preço destacado;`);
  lines.push(`- Separar conceitos: Fidelidade do Produto (estritamente fiel às fotos reais) vs. Direção de Arte (rica, sofisticada e profissional, sem aspecto de catálogo simplista ou fundo chapado);`);
  lines.push(`- Galeria secundária de cores: apresente EXCLUSIVAMENTE as DEMAIS variações/cores, NUNCA duplicando a Variação 1 (a cor principal já é o móvel em destaque no post);`);
  lines.push(`- Slogans e rótulos proibidos: NUNCA invente slogans da empresa/loja (a logo da Móveis Morante já carrega a identidade oficial) nem insira slogans no canto inferior direito. NUNCA insira rótulos ou tags na foto de visão interna como "material de qualidade", "amplo espaço interno" ou "design moderno";`);
  lines.push(`- Slogans autorizados: permitidos apenas 2 destaques do produto (um abaixo do título do produto e outro ao lado do móvel em estilo caligráfico com traçado amarelo);`);
  lines.push(`- Proibição de elementos extras: NUNCA adicione caixas, selos, textos ou elementos gráficos adicionais que não tenham sido solicitados;`);
  lines.push(`- Respeite o formato solicitado (aspecto e dimensões);`);
  lines.push(`- Componha todos os elementos como uma única peça coerente;`);
  lines.push(`- Não trate cada elemento como arte independente.`);
  lines.push('');
  lines.push(`Versão da configuração: ${spec.configurationVersion}`);
  lines.push(`Gerado em: ${spec.generatedAt}`);

  return lines.join('\n');
}

/** Renderiza especificação de compartilhamento (todas as campanhas) como texto. */
export function renderShareSpecificationAsPrompt(spec: PostShareSpecification): string {
  const lines: string[] = [
    SEP,
    `MÓVEIS MORANTE — INSTRUÇÕES DE CRIAÇÃO DE POSTS (TODAS AS CAMPANHAS)`,
    SEP,
    '',
    VISUAL_GROUNDING_MANDATORY_RULE,
    '',
    ABSOLUTE_FIDELITY_RULE,
    '',
    spec.masterInstruction,
    '',
    `PRODUTO`,
    '',
    `Página oficial do produto:`,
    spec.product.catalogUrl,
    '',
  ];

  if (spec.productImages) {
    lines.push(renderProductImagesPromptSection(spec.productImages));
    lines.push('');
  }

  if (spec.officialAssets) {
    lines.push(renderOfficialAssetsPromptSection(spec.officialAssets));
    lines.push('');
  }

  lines.push(GLOBAL_ART_DIRECTION_SECTION);
  lines.push('');

  lines.push(...spec.campaigns.map(renderCampaignSection));
  lines.push('');
  lines.push(SEP);
  lines.push('FORMATOS');
  lines.push(SEP);
  lines.push(...spec.formats.map(f => `${f.name.toUpperCase()}\n${f.aspectRatio}\n${f.referenceSize}\n`));
  lines.push(DIRECT_WORKFLOW_FORMAT_INSTRUCTION);
  lines.push('');
  lines.push(SEP);
  lines.push('REGRAS FINAIS');
  lines.push(SEP);
  lines.push(`- Preserve fielmente o produto e sua variação;`);
  lines.push(`- As fotos oficiais fornecidas em IMAGENS OFICIAIS DO PRODUTO são a fonte visual de verdade;`);
  lines.push(`- Use somente fatos verificáveis na página do produto;`);
  lines.push(`- Não invente preço, desconto, parcelamento, oportunidade ou características;`);
  lines.push(`- Referências visuais definem direção visual — não copie literalmente;`);
  lines.push(`- Assets oficiais (logo, selos) são arquivos gráficos prontos: NUNCA redesenhe, recrie ou estilize;`);
  lines.push(`- Se a IA não puder inserir o asset fielmente, deixe o espaço reservado em vez de inventar uma marca;`);
  lines.push(`- Direção de arte profissional ao redor do móvel: crie ambientação comercial elegante, iluminação publicitária com sombras reais e bloco de preço destacado;`);
  lines.push(`- Separar conceitos: Fidelidade do Produto (estritamente fiel às fotos reais) vs. Direção de Arte (rica, sofisticada e profissional, sem aspecto de catálogo simplista ou fundo chapado);`);
  lines.push(`- Respeite o formato solicitado (aspecto e dimensões);`);
  lines.push(`- Componha todos os elementos como uma única peça coerente.`);
  lines.push('');
  lines.push(`Versão da configuração: ${spec.configurationVersion}`);
  lines.push(`Gerado em: ${spec.generatedAt}`);

  return lines.join('\n');
}
