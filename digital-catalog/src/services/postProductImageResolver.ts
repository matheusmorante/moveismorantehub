/**
 * postProductImageResolver.ts (digital-catalog)
 *
 * Resolução semântica e determinística de imagens para o Prompt Estruturado de IA.
 * Regras:
 * 1. PRIMARY_IMAGE: 1ª foto da variação principal.
 * 2. OPEN_VIEW: 2ª foto da variação principal (se existir e for distinta).
 * 3. VARIATIONS: 1ª foto de cada variação cadastrada.
 * 4. URLs normalizadas para HTTPS absoluto.
 * 5. Regra de Fidelidade Absoluta.
 */

export interface PostImageItemSpec {
  url: string;
  variationId: string;
  variationName: string;
  sourceRole: 'PRIMARY' | 'OPEN_VIEW' | 'VARIATION_PRIMARY';
}

export interface PostProductImagesSpec {
  primary: PostImageItemSpec | null;
  openView?: PostImageItemSpec | null;
  primaryVariation?: {
    id: string;
    name: string;
  } | null;
  variations?: Array<{
    variationId: string;
    variationName: string;
    url: string;
  }>;
}

export interface PostProductImagesValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export const ABSOLUTE_FIDELITY_RULE = `AS IMAGENS DO PRODUTO FORNECIDAS ABAIXO SÃO A FONTE VISUAL DE VERDADE.

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

export const OFFICIAL_MORANTE_LOGO_URL = 'https://www.moveismorante.com.br/logo-morante.png';

export const OFFICIAL_QUEIMA_BADGE_URL =
  'https://hkoxhourxwlddgsfdgws.supabase.co/storage/v1/object/public/products/marketing/seals/9d8bedae-b366-4f8c-ac49-74b85b882bde-1787790409290.png';

export const OFFICIAL_ASSET_MASTER_RULE = `OFFICIAL_ASSET não é inspiração visual.
É um arquivo gráfico oficial que deve ser utilizado fielmente.
Não gere uma versão semelhante.
Não redesenhe.
Não recrie por aproximação.
Se a ferramenta de geração não conseguir incorporar o asset com fidelidade,
não substitua por uma versão inventada. É preferível deixar reservado o espaço do que inventar uma nova marca ou selo.`;

export const OFFICIAL_LOGO_STRICT_INSTRUCTIONS = `LOGO OFICIAL DA MÓVEIS MORANTE

Arquivo:
${OFFICIAL_MORANTE_LOGO_URL}

REGRA OBRIGATÓRIA:
Utilize o arquivo oficial fornecido.

NÃO:
- redesenhar;
- recriar;
- reinterpretar;
- trocar tipografia;
- alterar símbolo;
- alterar proporções;
- alterar cores;
- inventar slogan;
- gerar uma marca "parecida";
- substituir por uma versão estilizada.

O logo deve ser tratado como um asset gráfico pronto.
Se a IA/ferramenta utilizada não conseguir inserir o asset fielmente, é preferível deixar reservado o espaço do logo do que inventar uma nova marca.`;

export function buildOfficialBadgeStrictInstructions(badgeUrl: string, opportunityName = 'Oportunidade'): string {
  return `SELO OFICIAL (${opportunityName.toUpperCase()}):
${badgeUrl}

REGRA:
Utilizar o arquivo oficial fornecido sem recriação.

NÃO:
- refazer o texto;
- refazer as chamas;
- alterar cores;
- mudar tipografia;
- trocar formato;
- aproximar visualmente;
- gerar uma versão semelhante.

O selo é um asset gráfico pronto e só deve ser utilizado quando a oportunidade for aplicável.`;
}

export function toAbsoluteHttpsUrl(rawUrl?: string | null): string | null {
  if (!rawUrl || typeof rawUrl !== 'string') return null;
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;

  if (trimmed.startsWith('https://')) return trimmed;
  if (trimmed.startsWith('http://')) return trimmed.replace(/^http:\/\//, 'https://');
  if (trimmed.startsWith('//')) return `https:${trimmed}`;
  if (trimmed.startsWith('/')) return `https://www.moveismorante.com.br${trimmed}`;
  return `https://${trimmed}`;
}

function extractImageStrings(rawImages: any): string[] {
  if (!rawImages) return [];
  if (Array.isArray(rawImages)) {
    const list: string[] = [];
    for (const item of rawImages) {
      if (typeof item === 'string') {
        const url = toAbsoluteHttpsUrl(item);
        if (url) list.push(url);
      } else if (item && typeof item === 'object') {
        const candidate = item.image_url || item.url || item.src;
        if (typeof candidate === 'string') {
          const url = toAbsoluteHttpsUrl(candidate);
          if (url) list.push(url);
        }
      }
    }
    return Array.from(new Set(list));
  }
  return [];
}

export function resolveProductImages(params: {
  product: any;
  selectedVariationId?: string | null;
}): { productImages: PostProductImagesSpec; validation: PostProductImagesValidation } {
  const { product, selectedVariationId } = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  const rawVariations = product?.product_variations || product?.variations || [];
  const rawProductImages = product?.product_images || product?.images || [];

  const fallbackImages = extractImageStrings(rawProductImages);

  let primaryVarObj: any = null;
  if (Array.isArray(rawVariations) && rawVariations.length > 0) {
    if (selectedVariationId) {
      primaryVarObj = rawVariations.find((v: any) => v.id === selectedVariationId) || rawVariations[0];
    } else {
      primaryVarObj = rawVariations[0];
    }
  }

  const primaryVarId = primaryVarObj?.id || selectedVariationId || product?.id || 'default';
  const primaryVarName = primaryVarObj?.name || primaryVarObj?.variation_name || product?.name || 'Padrão';

  let primaryVarImages: string[] = [];
  if (primaryVarObj) {
    primaryVarImages = extractImageStrings(
      primaryVarObj.images || primaryVarObj.product_images || primaryVarObj.photos
    );
  }

  if (primaryVarImages.length === 0 && fallbackImages.length > 0) {
    primaryVarImages = [...fallbackImages];
  }

  let primaryImageSpec: PostImageItemSpec | null = null;
  if (primaryVarImages.length > 0) {
    primaryImageSpec = {
      url: primaryVarImages[0],
      variationId: primaryVarId,
      variationName: primaryVarName,
      sourceRole: 'PRIMARY',
    };
  } else {
    errors.push(`Produto "${product?.name || product?.id}" não possui foto principal (PRIMARY_IMAGE).`);
  }

  let openViewSpec: PostImageItemSpec | null = null;
  if (primaryVarImages.length > 1) {
    const secondUrl = primaryVarImages[1];
    if (secondUrl !== primaryVarImages[0]) {
      openViewSpec = {
        url: secondUrl,
        variationId: primaryVarId,
        variationName: primaryVarName,
        sourceRole: 'OPEN_VIEW',
      };
    }
  }

  const variationSpecs: Array<{ variationId: string; variationName: string; url: string }> = [];
  if (Array.isArray(rawVariations) && rawVariations.length > 0) {
    for (const v of rawVariations) {
      const vId = v.id || v.variation_id;
      const vName = v.name || v.variation_name || 'Variação';
      const vImages = extractImageStrings(v.images || v.product_images || v.photos);

      if (vImages.length > 0) {
        variationSpecs.push({
          variationId: vId,
          variationName: vName,
          url: vImages[0],
        });
      } else if (vId === primaryVarId && primaryImageSpec) {
        variationSpecs.push({
          variationId: vId,
          variationName: vName,
          url: primaryImageSpec.url,
        });
      }
    }
  }

  const resultSpec: PostProductImagesSpec = {
    primary: primaryImageSpec,
    openView: openViewSpec,
    primaryVariation: {
      id: primaryVarId,
      name: primaryVarName,
    },
    variations: variationSpecs,
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

export function renderProductImagesPromptSection(
  productImages?: PostProductImagesSpec | null
): string {
  if (!productImages) return '';

  const sep = '='.repeat(50);
  const subSep = '-'.repeat(50);
  const lines: string[] = [
    sep,
    'IMAGENS OFICIAIS DO PRODUTO',
    sep,
    'Estas imagens são a FONTE VISUAL DE VERDADE.',
    'Não substitua o produto por outro semelhante.',
    '',
  ];

  if (productImages.primaryVariation?.name) {
    lines.push('VARIAÇÃO PRINCIPAL');
    lines.push(`Nome: ${productImages.primaryVariation.name}`);
    lines.push('');
  }

  if (productImages.primary?.url) {
    lines.push('IMAGEM PRINCIPAL');
    lines.push(productImages.primary.url);
    lines.push('');
    lines.push('Esta é a imagem prioritária para representar o produto.');
    lines.push('');
  }

  if (productImages.openView?.url) {
    lines.push(subSep);
    lines.push('');
    lines.push('PRODUTO ABERTO / VISÃO COMPLEMENTAR');
    lines.push('');
    lines.push(productImages.openView.url);
    lines.push('');
    lines.push('Use esta fotografia para compreender a estrutura real, interior,');
    lines.push('divisões e características do produto.');
    lines.push('Quando a campanha solicitar, ela também pode aparecer como pequeno');
    lines.push('card secundário na composição.');
    lines.push('');
  }

  if (productImages.variations && productImages.variations.length > 0) {
    lines.push(subSep);
    lines.push('');
    lines.push('VARIAÇÕES DISPONÍVEIS');
    lines.push('');
    for (const v of productImages.variations) {
      lines.push(v.variationName);
      lines.push(v.url);
      lines.push('');
    }
    lines.push('Cada imagem acima pertence à respectiva variação.');
    lines.push('NÃO misture:');
    lines.push('- cores;');
    lines.push('- acabamento;');
    lines.push('- portas;');
    lines.push('- puxadores;');
    lines.push('- estrutura;');
    lines.push('- detalhes');
    lines.push('entre variações diferentes.');
    lines.push('');
  }

  lines.push(sep);
  lines.push('FIDELIDADE VISUAL OBRIGATÓRIA');
  lines.push(sep);
  lines.push('A imagem PRIMARY e as imagens complementares são a fonte visual de verdade do móvel.');
  lines.push('A IA pode criar:');
  lines.push('- ambiente;');
  lines.push('- decoração;');
  lines.push('- iluminação;');
  lines.push('- composição publicitária.');
  lines.push('A IA NÃO pode criar outro móvel.');
  lines.push('Preservar exatamente as características visuais observáveis nas fotografias oficiais.');

  return lines.join('\n');
}
