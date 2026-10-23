export interface MetaCatalogProductSource {
  id: string;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  whatsapp_description?: string | null;
  status?: string | null;
  active?: boolean | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
  opportunity_id?: string | null;
  sales_price?: number | null;
  unit_price?: number | null;
  price?: number | string | null;
  promo_price?: number | string | null;
  stock?: number | null;
  images?: string[] | null;
  brand?: string | null;
  group_name?: string | null;
  sku?: string | null;
  code?: string | null;
  is_draft?: boolean | null;
  slug?: string | null;
  is_salvado?: boolean | null;
  product_kind?: string | null;
  material?: string | null;
  condition?: string | null;
  product_categories?: Array<{
    categories?: { name?: string | null; type?: string | null } | null;
  }> | null;
}

export interface MetaCatalogVariationSource {
  id: string;
  product_id: string;
  status?: string | null;
  active?: boolean | null;
  name?: string | null;
  color?: string | null;
  size?: string | null;
  sku?: string | null;
  code?: string | null;
  image_url?: string | null;
  sales_price?: number | null;
  price?: number | string | null;
  promo_price?: number | string | null;
  stock?: number | null;
  attributes?: unknown;
  use_parent_price?: boolean | null;
  use_parent_promo_price?: boolean | null;
  use_parent_name?: boolean | null;
  use_parent_description?: boolean | null;
}

export interface MetaCatalogOpportunitySource {
  id: string;
  name?: string | null;
  observations?: string | null;
}

export interface MetaCatalogItem {
  id: string;
  code: string;
  name: string;
  description: string;
  sales_price: number;
  promo_price?: number | null;
  opportunityName?: string | null;
  stock?: number | null;
  active: true;
  status: 'published';
  isPublished: true;
  images: string[];
  brand: string;
  group_name?: string | null;
  productType?: string;
  condition?: string;
  is_salvado?: boolean;
  material?: string;
  color?: string;
  size?: string;
  slug?: string;
  url?: string;
  isVariation?: boolean;
  productId?: string;
}

export const META_CATALOG_GLOBAL_PREFIX = `🚚📦 Entrega rápida (1 a 5 dias úteis) para Curitiba e Região, consulte conosco a disponibilidade e o valor do frete

💳 Pagamento parcelado nas bandeiras VISA, MASTER, MASTERCARD, MAESTRO, HIPERCARD, ELO, em até 10x sem juros no cartão de crédito

🚨⚠️ Aceitamos Senff com juros.

✅ À vista tem desconto no pix, débito ou dinheiro!


✅ Sem taxa de frete para endereços próximos.


✅ Montagem Incluída para a retirada ou entrega.


✅ Atendimento Via WhatsApp

https://wa.me/5541997493547


🛒 VEJA MAIS DOS NOSSOS PRODUTOS CLICANDO NO LINK ABAIXO:

https://moveismorante.com.br

___________________________________

Móveis Morante

▶ CNPJ: 44.512 248/0001-07

🕒 Aberto: Seg a Sex ( 9h às 18h ) e Sab ( 9h às 17h )

🗺📍Rua Cascavel, 306, Guaraituba, Colombo - PR

____________________________________`;

/**
 * Resolve a taxonomia do produto para a Meta: "Ambiente > Categoria"
 */
export function resolveProductType(product: {
  product_categories?: Array<{
    categories?: { name?: string | null; type?: string | null } | null;
  }> | null;
  group_name?: string | null;
  groupName?: string | null;
}): string {
  const relations = product.product_categories || [];

  const parentCategories = relations
    .map((pc) => pc.categories)
    .filter((cat): cat is { name: string; type: string } => Boolean(cat && cat.type === 'category'))
    .map((cat) => cat.name)
    .filter(Boolean);

  const environments = relations
    .map((pc) => pc.categories)
    .filter((cat): cat is { name: string; type: string } => Boolean(cat && cat.type === 'environment'))
    .map((cat) => cat.name)
    .filter(Boolean);

  if (environments.length > 0 && parentCategories.length > 0) {
    return `${environments[0]} > ${parentCategories[0]}`;
  }
  if (parentCategories.length > 0) {
    return String(parentCategories[0]);
  }
  if (environments.length > 0) {
    return String(environments[0]);
  }

  const group = product.groupName || product.group_name;
  if (group && group !== 'Furniture') {
    return group;
  }

  return 'Móveis';
}

/**
 * Detecta se uma string é um slug em vez de um SKU canônico.
 */
export function isSlugSku(val: string | null | undefined): boolean {
  if (!val) return false;
  const s = String(val).trim();
  if (s === '01-7bdb15') return true;
  if (/^[a-z0-9]+(-[a-z0-9]+){2,}$/.test(s) && /[a-z]/.test(s)) {
    if (!/^(sku|default|cod)-/i.test(s)) {
      return true;
    }
  }
  return false;
}

/**
 * Extrai atributos de Cor e Tamanho da variação.
 */
export function extractVariationAttributes(attributes: unknown): { color: string; size: string } {
  let color = '';
  let size = '';

  if (Array.isArray(attributes)) {
    const corAttr = attributes.find(
      (a: any) =>
        a &&
        (a.name?.toLowerCase() === 'cor' ||
          a.key?.toLowerCase() === 'cor' ||
          a.attribute_name?.toLowerCase() === 'cor')
    );
    if (corAttr) color = String(corAttr.value || corAttr.option || '').trim();

    const tamAttr = attributes.find(
      (a: any) =>
        a &&
        (a.name?.toLowerCase() === 'tamanho' ||
          a.key?.toLowerCase() === 'tamanho' ||
          a.attribute_name?.toLowerCase() === 'tamanho')
    );
    if (tamAttr) size = String(tamAttr.value || tamAttr.option || '').trim();
  } else if (attributes && typeof attributes === 'object') {
    const record = attributes as Record<string, unknown>;
    color = String(record.Cor || record.cor || '').trim();
    size = String(record.Tamanho || record.tamanho || '').trim();
  }

  return { color, size };
}

/**
 * Constrói a descrição combinando prefixo comercial, aviso de oportunidade e texto base.
 */
export function buildDescription(
  parentTitle: string,
  baseDescription: string | null | undefined,
  opportunity?: MetaCatalogOpportunitySource | null
): string {
  const parts: string[] = [META_CATALOG_GLOBAL_PREFIX];

  if (opportunity?.observations) {
    const oppLabel = opportunity.name ? ` (${opportunity.name})` : '';
    parts.push(`***Aviso Importante${oppLabel}: ${opportunity.observations}***`);
  }

  const content = baseDescription || parentTitle;
  if (content) parts.push(content);

  return parts.join('\n\n');
}

/**
 * Constrói a lista final de itens do catálogo Meta a partir dos produtos e variações elegíveis.
 */
export function buildMetaCatalogItems(
  products: readonly MetaCatalogProductSource[],
  variations: readonly MetaCatalogVariationSource[],
  opportunities: readonly MetaCatalogOpportunitySource[]
): MetaCatalogItem[] {
  const oppMap = new Map<string, MetaCatalogOpportunitySource>();
  opportunities.forEach((opportunity) => {
    oppMap.set(opportunity.id, opportunity);
  });

  const allItems: MetaCatalogItem[] = [];

  for (const parent of products) {
    if (
      parent.deleted ||
      parent.deleted_at !== null ||
      parent.status !== 'published' ||
      parent.is_draft
    ) {
      continue;
    }

    // Exclui produtos desativados (active: false), exceto salvados que têm active: false por definição
    const isSalvado = parent.is_salvado === true || parent.product_kind === 'salvado';
    if (!isSalvado && parent.active === false) {
      continue;
    }

    const isParentPublished = parent.status === 'published';
    const parentVariations = variations.filter(
      (variation) =>
        variation.product_id === parent.id &&
        variation.status !== 'hidden' &&
        variation.status !== 'draft' &&
        (isSalvado || variation.active !== false) &&
        (variation.status === 'published' || (!variation.status && isParentPublished))
    );
    const hasPublishedVars = parentVariations.some((v) => v.status === 'published');

    if (!isParentPublished && !hasPublishedVars) {
      continue;
    }

    const parentTitle =
      parent.name ||
      parent.title ||
      (parent.description ? parent.description.split('\n')[0] : 'Produto Morante');

    const opportunity = parent.opportunity_id ? oppMap.get(parent.opportunity_id) : null;
    const baseDescription = parent.whatsapp_description || parent.description || parentTitle;
    const fullDescription = buildDescription(parentTitle, baseDescription, opportunity);
    const productType = resolveProductType(parent);
    const parentCondition =
      parent.condition === 'usado' || parent.condition === 'used'
        ? 'used'
        : parent.is_salvado
          ? 'refurbished'
          : 'new';
    const parentSlug = parent.slug || parent.id;

    if (parentVariations.length > 0) {
      for (const variation of parentVariations) {
        const { color: attrColor, size: attrSize } = extractVariationAttributes(variation.attributes);
        const color = variation.color || attrColor || '';
        const size = variation.size || attrSize || '';

        const fallbackVariationTitle = [color, size].filter(Boolean).join(' / ');
        const variationTitle =
          String(variation.name || '').trim() ||
          (fallbackVariationTitle ? `${parentTitle} - ${fallbackVariationTitle}` : parentTitle);

        let variationImages: string[] = [];
        if (variation.image_url) {
          variationImages = String(variation.image_url)
            .split(',')
            .map((image) => image.trim())
            .filter(Boolean);
        }
        if (
          variationImages.length === 0 &&
          Array.isArray(parent.images) &&
          parent.images.length > 0
        ) {
          variationImages = parent.images;
        }

        const hasVarSpecificPrice = Boolean(variation.sales_price || variation.price);
        const isParentPrice =
          variation.use_parent_price === true ||
          (!hasVarSpecificPrice && variation.use_parent_price !== false);
        const rawVarPrice = isParentPrice
          ? parent.sales_price || parent.unit_price || parent.price || 0
          : variation.sales_price || variation.price || parent.sales_price || parent.price || 0;

        const hasVarSpecificPromo = Boolean(variation.promo_price);
        const isParentPromo =
          variation.use_parent_promo_price === true ||
          (!hasVarSpecificPromo && variation.use_parent_promo_price !== false);
        const rawVarPromo = isParentPromo
          ? parent.promo_price
          : variation.promo_price || parent.promo_price;

        let varPrice = Number(rawVarPrice || 0);
        const varPromo = Number(rawVarPromo || 0);
        if (varPrice <= 0 && varPromo > 0) {
          varPrice = varPromo;
        }

        const varLink = `https://moveismorante.com.br/produto/${parentSlug}?var=${variation.id}`;

        const rawVarSku = String(variation.sku || variation.code || '').trim();
        const varSku =
          (!isSlugSku(rawVarSku) && rawVarSku ? rawVarSku : '') ||
          (parent.code
            ? `${parent.code}-${String(parentVariations.indexOf(variation) + 1).padStart(2, '0')}`
            : variation.id);

        allItems.push({
          id: variation.id,
          code: varSku,
          name: variationTitle,
          description: fullDescription,
          sales_price: varPrice,
          promo_price: varPromo > 0 && varPromo < varPrice ? varPromo : undefined,
          opportunityName: opportunity?.name || undefined,
          stock: variation.stock !== undefined ? variation.stock : parent.stock,
          active: true,
          status: 'published',
          isPublished: true,
          images: variationImages,
          brand: parent.brand || 'Móveis Morante',
          group_name: parent.group_name,
          productType,
          condition: parentCondition,
          is_salvado: Boolean(parent.is_salvado),
          material: parent.material || undefined,
          color: color || undefined,
          size: size || undefined,
          slug: parentSlug,
          url: varLink,
          isVariation: true,
          productId: parent.id,
        });
      }
    } else {
      let parentPrice = Number(
        parent.sales_price || parent.unit_price || parent.price || 0
      );
      const parentPromo = Number(parent.promo_price || 0);
      if (parentPrice <= 0 && parentPromo > 0) {
        parentPrice = parentPromo;
      }

      const prodLink = `https://moveismorante.com.br/produto/${parentSlug}`;
      const rawParentCode = String(parent.code || '').trim();
      const rawParentSku = String(parent.sku || '').trim();
      const parentSku =
        (!isSlugSku(rawParentCode) && rawParentCode ? rawParentCode : '') ||
        (!isSlugSku(rawParentSku) && rawParentSku ? rawParentSku : '') ||
        parent.id;

      allItems.push({
        id: parent.id,
        code: parentSku,
        name: parentTitle,
        description: fullDescription,
        sales_price: parentPrice,
        promo_price: parentPromo > 0 && parentPromo < parentPrice ? parentPromo : undefined,
        opportunityName: opportunity?.name || undefined,
        stock: parent.stock,
        active: true,
        status: 'published',
        isPublished: true,
        images: Array.isArray(parent.images) ? parent.images : [],
        brand: parent.brand || 'Móveis Morante',
        group_name: parent.group_name,
        productType,
        condition: parentCondition,
        is_salvado: Boolean(parent.is_salvado),
        material: parent.material || undefined,
        slug: parentSlug,
        url: prodLink,
        isVariation: false,
      });
    }
  }

  return allItems;
}
