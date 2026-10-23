import { META_CATALOG_GLOBAL_PREFIX, resolveProductType } from './metaCatalogPayload';

export const META_CATALOG_BATCH_LIMIT = 50;

export interface MetaCatalogBatchSource {
  id: string;
  code?: string | null;
  sku?: string | null;
  name?: string | null;
  title?: string | null;
  description?: string | null;
  whatsappDescription?: string | null;
  whatsapp_description?: string | null;
  status?: string | null;
  hidden?: boolean | null;
  deleted?: boolean | null;
  deleted_at?: string | null;
  sales_price?: number | string | null;
  salesPrice?: number | string | null;
  price?: number | string | null;
  unitPrice?: number | string | null;
  unit_price?: number | string | null;
  promoPrice?: number | string | null;
  promo_price?: number | string | null;
  productType?: string | null;
  groupName?: string | null;
  group_name?: string | null;
  opportunityName?: string | null;
  opportunity_name?: string | null;
  opportunities?: { name?: string | null } | null;
  condition?: string | null;
  is_salvado?: boolean | null;
  url?: string | null;
  slug?: string | null;
  stock?: number | null;
  images?: unknown[] | null;
  image_url?: string | null;
  brand?: string | null;
  product_categories?: Array<{
    categories?: { name?: string | null; type?: string | null } | null;
  }> | null;
  color?: string | null;
  size?: string | null;
  material?: string | null;
}

export interface MetaCatalogBatchRequest {
  method: 'DELETE' | 'UPDATE';
  retailer_id: string;
  data: Record<string, unknown>;
}

export interface MetaCatalogBatchPayload {
  item_type: 'PRODUCT_ITEM';
  requests: MetaCatalogBatchRequest[];
}
const SUPABASE_STORAGE_PATTERN =
  /https:\/\/.*?\.supabase\.co\/storage\/v1\/object\/public\/products\/(.*)/i;
const R2_BASE_URL = 'https://pub-389127050a434f568c29dc66bdce2567.r2.dev';
export const META_CATALOG_FALLBACK_IMAGE_URL = 'https://moveismorante.com.br/logo.png';

export const formatMetaCatalogDecimalPrice = (value: unknown): string => {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (Number.isNaN(number)) return '';
  return number.toFixed(2).replace('.', ',');
};

export const sanitizeMetaCatalogImageUrl = (
  urlValue: string,
  fallback = META_CATALOG_FALLBACK_IMAGE_URL
): string => {
  if (!urlValue) return fallback;
  let url = String(urlValue).trim().split('?')[0];

  if (SUPABASE_STORAGE_PATTERN.test(url)) {
    const match = url.match(SUPABASE_STORAGE_PATTERN);
    if (match?.[1]) {
      const fileName = match[1].split('/').pop();
      if (fileName) url = `${R2_BASE_URL}/${fileName}`;
    }
  }

  if (!url.startsWith('http://') && !url.startsWith('https://')) url = `https://${url}`;
  return encodeURI(url);
};

/** Constrói o payload já validado pelo proxy seguro `/api/meta-graph`. */
export const buildMetaCatalogBatchPayload = (
  products: readonly MetaCatalogBatchSource[]
): MetaCatalogBatchPayload => {
  if (products.length < 1 || products.length > META_CATALOG_BATCH_LIMIT) {
    throw new Error(`Cada lote Meta deve conter entre 1 e ${META_CATALOG_BATCH_LIMIT} itens.`);
  }

  const requests = products.map((product): MetaCatalogBatchRequest => {
    const isHidden = product.status === 'hidden' || product.hidden === true;
    const isDeleted =
      product.deleted === true ||
      (product.deleted_at !== undefined && product.deleted_at !== null);
    const retailerId = String(product.code || product.sku || product.id);

    if (isHidden || isDeleted || product.status === 'draft') {
      return { method: 'DELETE', retailer_id: retailerId, data: { id: retailerId } };
    }

    const cleanTitle =
      product.name ||
      product.title ||
      (product.description ? String(product.description).split('\n')[0] : 'Produto Morante');
    const baseDescription =
      product.whatsappDescription ||
      product.whatsapp_description ||
      product.description ||
      cleanTitle;
    const cleanDescription = `${META_CATALOG_GLOBAL_PREFIX}\n\n${baseDescription}`;
    const rawPrice =
      product.sales_price ??
      product.salesPrice ??
      product.price ??
      product.unitPrice ??
      product.unit_price ??
      0;
    let itemPrice = Number(rawPrice);
    const promoPrice = (product.promo_price ?? product.promoPrice)
      ? Number(product.promo_price ?? product.promoPrice)
      : 0;
    if (itemPrice <= 0 && promoPrice > 0) itemPrice = promoPrice;
    const hasPromo = promoPrice > 0 && promoPrice < itemPrice;
    const currentPrice = hasPromo ? promoPrice : itemPrice;
    const oldPriceFormatted = hasPromo ? formatMetaCatalogDecimalPrice(itemPrice) : undefined;
    const opportunityName =
      product.opportunityName || product.opportunity_name || product.opportunities?.name || '';
    const productType =
      product.productType ||
      (product.groupName && product.groupName !== 'Furniture' ? product.groupName : undefined) ||
      (product.group_name && product.group_name !== 'Furniture' ? product.group_name : undefined) ||
      resolveProductType(product);
    const condition =
      product.condition === 'used' || product.condition === 'usado'
        ? 'used'
        : product.is_salvado || product.condition === 'refurbished'
          ? 'refurbished'
          : 'new';
    const productLink =
      product.url ||
      (product.slug
        ? `https://moveismorante.com.br/produto/${product.slug}`
        : `https://moveismorante.com.br/produto/${product.id}`);
    const quantityToSell =
      product.stock !== null && product.stock !== undefined
        ? Math.max(0, Number(product.stock))
        : 1;

    const imageUrls: string[] = [];
    if (Array.isArray(product.images) && product.images.length > 0) {
      product.images.forEach((image: unknown) => {
        if (!image) return;
        String(image)
          .split(',')
          .forEach((value) => {
            const trimmed = value.trim();
            if (trimmed && !imageUrls.includes(trimmed)) imageUrls.push(trimmed);
          });
      });
    } else if (product.image_url) {
      String(product.image_url)
        .split(',')
        .forEach((value) => {
          const trimmed = value.trim();
          if (trimmed && !imageUrls.includes(trimmed)) imageUrls.push(trimmed);
        });
    }

    const sanitizedImages = imageUrls
      .map((url) => sanitizeMetaCatalogImageUrl(url, ''))
      .filter(Boolean);
    const mainImageUrl = sanitizedImages[0] || '';
    const additionalImageUrls = sanitizedImages.length > 1 ? sanitizedImages.slice(1, 10) : [];

    if (itemPrice <= 0 || !mainImageUrl) {
      return { method: 'DELETE', retailer_id: retailerId, data: { id: retailerId } };
    }

    return {
      method: 'UPDATE',
      retailer_id: retailerId,
      data: {
        id: retailerId,
        title: cleanTitle,
        description: cleanDescription,
        price: `${itemPrice.toFixed(2)} BRL`,
        sale_price: hasPromo ? `${promoPrice.toFixed(2)} BRL` : undefined,
        condition,
        availability: 'in stock',
        image_link: mainImageUrl,
        additional_image_link: additionalImageUrls.join(',') || undefined,
        brand: product.brand || 'Móveis Morante',
        link: productLink,
        product_type: productType,
        item_group_id: '',
        custom_label_0: productType,
        custom_label_1: formatMetaCatalogDecimalPrice(currentPrice),
        custom_label_2: oldPriceFormatted,
        custom_label_3: opportunityName || undefined,
        color: product.color || undefined,
        size: product.size || undefined,
        material: product.material || undefined,
        gender: 'unisex',
        identifier_exists: 'no',
        quantity_to_sell_on_facebook: quantityToSell,
      },
    };
  });

  return { item_type: 'PRODUCT_ITEM', requests };
};
