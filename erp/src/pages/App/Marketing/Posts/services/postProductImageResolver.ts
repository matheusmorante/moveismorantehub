import {
  PostProductImagesSpec,
  PostProductImagesValidation,
  ProductImageReference,
  ProductVariationImageReference,
} from '../types/postSpecification';
import { extractPostProductImageUrls } from './postProductImageUrls';

const DEFAULT_BASE_URL = 'https://www.moveismorante.com.br';

const FORBIDDEN_PATTERNS = [
  /\/banners?\//i,
  /\/logos?\//i,
  /\/badges?\//i,
  /\/opportunities?\//i,
  /\/selos?\//i,
  /\/icons?\//i,
  /placeholder/i,
  /queima-salvados/i,
  /logo-morante/i,
];

export interface ResolveProductImagesInput {
  product?: {
    id?: string;
    name?: string;
    images?: string[];
    photos?: any[];
    variations?: Array<{
      id?: string;
      name?: string;
      title?: string;
      images?: string[];
      active?: boolean;
      attributes?: Record<string, string>;
    }>;
  } | null;
  selectedVariationId?: string;
  catalogBaseUrl?: string;
  /**
   * Sobrescritas manuais persistidas (seleção feita pelo usuário na UI)
   */
  manualOverrides?: {
    primaryUrl?: string;
    openViewUrl?: string | null;
    variationUrls?: Record<string, string>;
  } | null;
}

export function toAbsoluteHttpsUrl(rawUrl: string, baseUrl = DEFAULT_BASE_URL): string {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  const trimmed = rawUrl.trim();
  if (!trimmed) return '';

  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'https://');
  if (trimmed.startsWith('//')) return `https:${trimmed}`;

  const cleanBase = baseUrl.replace(/\/+$/, '');
  const cleanPath = trimmed.startsWith('/') ? trimmed : `/${trimmed}`;
  return `${cleanBase}${cleanPath}`;
}

export function isForbiddenProductImageUrl(url: string): boolean {
  if (!url) return true;
  return FORBIDDEN_PATTERNS.some(pattern => pattern.test(url));
}

export function extractVariationName(
  v: { name?: string; title?: string; attributes?: Record<string, string> },
  index: number
): string {
  if (v.name?.trim()) return v.name.trim();
  if (v.title?.trim()) return v.title.trim();
  if (v.attributes && Object.keys(v.attributes).length > 0) {
    return Object.values(v.attributes).filter(Boolean).join(' - ');
  }
  return `Variação ${index + 1}`;
}

export function resolveProductImages(
  input: ResolveProductImagesInput
): {
  productImages: PostProductImagesSpec;
  validation: PostProductImagesValidation;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const baseUrl = input.catalogBaseUrl || DEFAULT_BASE_URL;
  const overrides = input.manualOverrides;

  const product = input.product;
  if (!product) {
    return {
      productImages: { primary: null, openView: null, variations: [], primaryVariation: null },
      validation: { valid: false, errors: ['Produto não fornecido para resolução de imagens.'], warnings: [] },
    };
  }

  // Resolver variações ativas (suportando product.variations e product.product_variations)
  const rawVariationsList = Array.isArray(product.variations)
    ? product.variations
    : Array.isArray((product as any).product_variations)
    ? (product as any).product_variations
    : [];

  const rawVariations = rawVariationsList.filter((v: any) => v.active !== false);

  const variationsList: Array<{ id: string; name: string; images: string[] }> = [];

  if (rawVariations.length > 0) {
    rawVariations.forEach((v: any, idx: number) => {
      const id = v.id || `var-${idx}`;
      const name = extractVariationName(v, idx);
      const rawImgs = [
        ...extractPostProductImageUrls(v.images),
        ...extractPostProductImageUrls(v.image_url),
        ...extractPostProductImageUrls(v.photos),
      ];
      const validUrls = rawImgs
        .map(u => toAbsoluteHttpsUrl(u, baseUrl))
        .filter(u => Boolean(u) && !isForbiddenProductImageUrl(u));
      variationsList.push({ id, name, images: validUrls });
    });
  } else {
    // Produto sem array de variações: a variação principal é o próprio produto
    const id = product.id || 'main';
    const name = product.name?.trim() || 'Principal';
    const rawImgs = [
      ...extractPostProductImageUrls(product.images),
      ...extractPostProductImageUrls((product as any).image_url),
      ...extractPostProductImageUrls(product.photos),
      ...extractPostProductImageUrls((product as any).product_images),
    ];
    const validUrls = rawImgs
      .map(u => toAbsoluteHttpsUrl(u, baseUrl))
      .filter(u => Boolean(u) && !isForbiddenProductImageUrl(u));
    variationsList.push({ id, name, images: validUrls });
  }

  // Identificar variação primária
  let primaryVar = variationsList[0];
  if (input.selectedVariationId) {
    const found = variationsList.find(v => v.id === input.selectedVariationId);
    if (found) primaryVar = found;
  }

  // 1. Resolver PRIMARY (seleção manual tem precedência absoluta)
  let primaryRef: ProductImageReference | null = null;
  const manualPrimaryUrl = overrides?.primaryUrl
    ? toAbsoluteHttpsUrl(overrides.primaryUrl, baseUrl)
    : undefined;

  if (manualPrimaryUrl && !isForbiddenProductImageUrl(manualPrimaryUrl)) {
    primaryRef = {
      url: manualPrimaryUrl,
      role: 'PRIMARY',
      variationId: primaryVar?.id,
      variationName: primaryVar?.name || product.name,
      description: `Foto principal selecionada manualmente para ${primaryVar?.name || product.name}`,
    };
  } else if (primaryVar && primaryVar.images.length > 0) {
    primaryRef = {
      url: primaryVar.images[0],
      role: 'PRIMARY',
      variationId: primaryVar.id,
      variationName: primaryVar.name,
      description: `Foto principal da variação ${primaryVar.name}`,
    };
  } else if (Array.isArray(product.images) && product.images.length > 0) {
    const fallbackUrl = toAbsoluteHttpsUrl(product.images[0], baseUrl);
    if (fallbackUrl && !isForbiddenProductImageUrl(fallbackUrl)) {
      primaryRef = {
        url: fallbackUrl,
        role: 'PRIMARY',
        variationId: primaryVar?.id,
        variationName: primaryVar?.name || product.name,
        description: 'Foto principal do produto',
      };
    }
  }

  // 2. Resolver OPEN_VIEW (seleção manual tem precedência absoluta)
  let openViewRef: ProductImageReference | null = null;
  if (overrides?.openViewUrl !== undefined) {
    if (overrides.openViewUrl) {
      const manualOpenUrl = toAbsoluteHttpsUrl(overrides.openViewUrl, baseUrl);
      if (manualOpenUrl && !isForbiddenProductImageUrl(manualOpenUrl)) {
        openViewRef = {
          url: manualOpenUrl,
          role: 'OPEN_VIEW',
          variationId: primaryVar?.id,
          variationName: primaryVar?.name || product.name,
          description: `Imagem secundária selecionada manualmente (${primaryVar?.name || product.name})`,
        };
      }
    }
    // se overrides.openViewUrl === null ou '', o usuário optou por não ter OPEN_VIEW
  } else if (primaryVar && primaryVar.images.length > 1) {
    const openUrl = primaryVar.images[1];
    if (openUrl && openUrl !== primaryRef?.url) {
      openViewRef = {
        url: openUrl,
        role: 'OPEN_VIEW',
        variationId: primaryVar.id,
        variationName: primaryVar.name,
        description: `Imagem secundária da variação principal (${primaryVar.name})`,
      };
    }
  }

  // 3. Galeria de Demais Variações: Primeira foto de CADA UMA DAS OUTRAS variações
  // A 1ª variação (variação principal) já está representada em PRIMARY (foto 1) e OPEN_VIEW (foto 2).
  // Portanto, a lista de variações complementares deve conter apenas a 2ª, 3ª, etc. variações.
  const additionalVariations = variationsList.filter(v => v.id !== primaryVar?.id);
  const variationImages: ProductVariationImageReference[] = [];
  const seenUrls = new Set<string>();

  for (const v of additionalVariations) {
    const manualVarUrl = overrides?.variationUrls?.[v.id]
      ? toAbsoluteHttpsUrl(overrides.variationUrls[v.id], baseUrl)
      : undefined;

    const chosenUrl = (manualVarUrl && !isForbiddenProductImageUrl(manualVarUrl))
      ? manualVarUrl
      : (v.images.length > 0 ? v.images[0] : null);

    if (chosenUrl) {
      variationImages.push({
        variationId: v.id,
        variationName: v.name,
        url: chosenUrl,
        role: 'VARIATION_PRIMARY',
      });
      if (seenUrls.has(chosenUrl) && additionalVariations.length > 1) {
        warnings.push(`A foto da variação "${v.name}" repete uma URL já utilizada.`);
      }
      seenUrls.add(chosenUrl);
    } else {
      warnings.push(`A variação "${v.name}" não possui nenhuma foto cadastrada.`);
    }
  }

  // Validação
  if (!primaryRef) {
    errors.push('O produto selecionado não possui foto principal cadastrada.');
  } else if (!primaryRef.url.startsWith('https://')) {
    errors.push('A URL da foto principal não é HTTPS válida.');
  }

  if (!openViewRef) {
    warnings.push('Nenhuma imagem secundária (Foto 2) cadastrada na variação principal.');
  }

  const resultSpec: PostProductImagesSpec = {
    primary: primaryRef,
    openView: openViewRef,
    variations: variationImages,
    primaryVariation: primaryVar ? { id: primaryVar.id, name: primaryVar.name } : null,
  };

  return {
    productImages: resultSpec,
    validation: {
      valid: errors.length === 0,
      errors,
      warnings,
    },
  };
}

export const ABSOLUTE_FIDELITY_RULE = `AS IMAGENS DO PRODUTO FORNECIDAS ABAIXO SÃO A FONTE VISUAL DE VERDADE.
As imagens devem ser efetivamente anexadas/utilizadas como referências visuais na chamada de geração, e não apenas analisadas anteriormente.

Não crie um móvel semelhante.
Não redesenhe o produto.
Não substitua por outro modelo.
Não altere número de portas.
Não altere gavetas.
Não altere pés.
Não altere puxadores.
Não altere espelhos.
Não altere ripados.
Não altere proporções.
Não altere estrutura.
Não combine características de variações diferentes.

A ambientação pode ser criada pela IA.
O PRODUTO NÃO.`;

export function renderProductImagesPromptSection(
  productImages?: PostProductImagesSpec | null,
  options: { localFilesOnly?: boolean } = {},
): string {
  if (!productImages) return '';

  /** Retorna a referência da imagem: arquivo local no ZIP ou URL apenas no preview comum. */
  function imageRef(
    ref: { file?: string | null; url: string } | null | undefined,
  ): { label: 'Arquivo' | 'URL'; value: string } | null {
    if (!ref) return null;
    if (ref.file) return { label: 'Arquivo', value: ref.file };
    return options.localFilesOnly || !ref.url ? null : { label: 'URL', value: ref.url };
  }

  const sep = '='.repeat(50);
  const subSep = '-'.repeat(50);
  const lines: string[] = [
    sep,
    'IMAGENS OFICIAIS DO PRODUTO',
    sep,
    'Estas imagens foram enviadas junto com este prompt.',
    'Elas são a FONTE VISUAL DE VERDADE do produto.',
    'Identifique cada imagem pelo nome do arquivo indicado abaixo.',
    'NÃO substitua o produto por outro semelhante.',
    '',
  ];

  if (productImages.primaryVariation?.name) {
    lines.push('VARIAÇÃO PRINCIPAL');
    lines.push(`Nome: ${productImages.primaryVariation.name}`);
    lines.push('');
  }

  const primaryRef = imageRef(productImages.primary);
  if (primaryRef) {
    lines.push('IMAGEM PRINCIPAL');
    lines.push(`${primaryRef.label}: \`${primaryRef.value}\``);
    lines.push('');
    lines.push('Esta é a imagem prioritária para representar o produto na arte.');
    lines.push('O produto desta foto é o protagonista absoluto da composição.');
    lines.push('A imagem principal NÃO recebe borda branca.');
    lines.push('');
  }

  const secondaryRef = imageRef(productImages.openView);
  if (secondaryRef) {
    lines.push(subSep);
    lines.push('');
    lines.push('IMAGEM SECUNDÁRIA (Segunda foto da variação principal)');
    lines.push('');
    lines.push(`${secondaryRef.label}: \`${secondaryRef.value}\``);
    lines.push('');
    lines.push('Use esta fotografia como referência complementar do produto.');
    lines.push('Ela pode ser o móvel aberto, em ângulo diferente, detalhe ou espaço interno.');
    lines.push('Quando presente na composição, deve aparecer flutuando, sem borda e de forma limpa.');
    lines.push('NÃO sobreponha textos, setas ou rótulos como "material de qualidade",');
    lines.push('"amplo espaço interno", "design moderno" ou "mais organização para o seu dia".');
    lines.push('');
  }

  if (productImages.variations && productImages.variations.length > 0) {
    lines.push(subSep);
    lines.push('');
    lines.push('VARIAÇÕES DISPONÍVEIS (DEMAIS OPÇÕES DE CORES)');
    lines.push('');
    lines.push('REGRA OBRIGATÓRIA DA GALERIA DE CORES / VARIAÇÕES:');
    lines.push(`- O móvel principal em destaque no post já é a Variação 1 (${productImages.primaryVariation?.name || 'Cor Principal'}).`);
    lines.push('- Na galeria secundária ("Disponível nas Cores"), apresente EXCLUSIVAMENTE as DEMAIS variações listadas abaixo.');
    lines.push('- É ESTRITAMENTE PROIBIDO incluir a Variação 1 (cor principal) na galeria secundária de cores.');
    lines.push('- Aplique borda branca SOMENTE nas miniaturas destas variações adicionais.');
    lines.push('- Não aplique borda branca à imagem principal nem à imagem secundária.');
    lines.push('');
    for (const v of productImages.variations) {
      const vRef = v.file
        ? { label: 'Arquivo', value: v.file }
        : (!options.localFilesOnly && v.url ? { label: 'URL', value: v.url } : null);
      if (!vRef) continue;
      lines.push(`**Variação: ${v.variationName}**`);
      lines.push(`- Atributo (Cor / Acabamento): "${v.variationName}"`);
      lines.push(`- Reconhecimento visual: identifique a foto correspondente observando o móvel com cor/acabamento "${v.variationName}".`);
      lines.push(`- ${vRef.label}: \`${vRef.value}\``);
      lines.push('');
    }
    lines.push('Cada imagem/arquivo acima pertence à respectiva variação indicada pelo atributo de cor/acabamento.');
    lines.push('NÃO misture cores, acabamento, portas, puxadores ou estrutura entre variações diferentes.');
    lines.push('');
  } else {
    lines.push(subSep);
    lines.push('');
    lines.push('PRODUTO DE COR ÚNICA (SEM OUTRAS VARIAÇÕES DISPONÍVEIS)');
    lines.push('');
    lines.push('REGRA MANDATÓRIA:');
    lines.push('- Este produto NÃO possui outras cores disponíveis e nenhuma outra fotografia de variação foi enviada.');
    lines.push('- É ESTRITAMENTE PROIBIDO criar galeria de cores, miniaturas adicionais ou escrever "DISPONÍVEL NAS CORES".');
    lines.push('- É ESTRITAMENTE PROIBIDO inventar variações 2 ou 3 fictícias na arte ou no texto.');
    lines.push('- A composição deve exibir EXCLUSIVAMENTE a fotografia da Variação 1 (e a secundária flutuante, se enviada).');
    lines.push('');
  }

  lines.push(sep);
  lines.push('FIDELIDADE VISUAL OBRIGATÓRIA');
  lines.push(sep);
  lines.push('A IMAGEM PRINCIPAL e as imagens complementares são a fonte visual de verdade do móvel.');
  lines.push('A IA pode criar: ambiente, decoração, iluminação e composição publicitária.');
  lines.push('A IA NÃO pode criar outro móvel.');
  lines.push('Preservar exatamente as características visuais observáveis nas fotografias oficiais.');

  return lines.join('\n');
}
