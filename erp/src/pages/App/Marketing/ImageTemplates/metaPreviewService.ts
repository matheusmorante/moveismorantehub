import { metaHttpClient } from '@/pages/utils/metaService/metaHttpClient';
import { CATALOG_FIELDS, parseCatalogPrice, type TemplatePreviewProduct } from '../../../../../../shared-utils/catalogImageTemplate';

export interface PreviewOption { id: string; name: string; retailer_id?: string }
export interface PreviewPage { rows: PreviewOption[]; nextCursor: string | null }
export type PreviewCatalog = 'ads' | 'whatsapp';

async function readPreview<T>(operation: string, payload: Record<string, unknown>, signal: AbortSignal): Promise<T> {
  const response = await metaHttpClient.request(operation, payload, signal);
  const data = await response.json().catch(() => null);
  if (!response.ok || !data) throw new Error(typeof data?.error === 'string' ? data.error : 'Não foi possível carregar a prévia da Meta.');
  return data as T;
}

export const listPreviewSets = (target: PreviewCatalog, after: string | undefined, signal: AbortSignal) =>
  readPreview<PreviewPage>('list_image_template_sets', { target, after }, signal);

export const listPreviewProducts = (target: PreviewCatalog, setId: string | undefined, after: string | undefined, signal: AbortSignal) =>
  readPreview<PreviewPage>('list_image_template_products', { target, after, setId }, signal);

const clean = (value: unknown) => typeof value === 'string' && value.trim() ? value.trim() : undefined;
const imageUrl = (value: unknown) => {
  if (typeof value !== 'string') return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
};

export function mapPreviewProduct(row: Record<string, unknown>, now = Date.now()): TemplatePreviewProduct {
  const price = parseCatalogPrice(row.price);
  const sale = parseCatalogPrice(row.sale_price);
  const start = clean(row.sale_price_start_date);
  const end = clean(row.sale_price_end_date);
  const salePrice = sale !== null && price !== null && sale > 0 && sale < price
    && (!start || Date.parse(start) <= now) && (!end || Date.parse(end) >= now) ? sale : undefined;
  const hasDiscount = salePrice !== undefined && price !== null && price > salePrice;
  const discountValue = hasDiscount ? Math.max(0, Math.round((price - salePrice + Number.EPSILON) * 100) / 100) : undefined;
  const discountPercent = hasDiscount && price > 0 ? Math.max(0, Math.round(((price - salePrice) / price) * 100)) : undefined;
  const discount = discountPercent !== undefined ? `${discountPercent}%` : undefined;
  const fields: TemplatePreviewProduct['fields'] = {
    name: clean(row.name), brand: clean(row.brand), description: clean(row.description),
    retailerId: clean(row.retailer_id), availability: clean(row.availability),
    category: clean(row.product_type), productType: clean(row.product_type),
    price: hasDiscount ? price ?? undefined : undefined, promoPrice: salePrice, salePrice, currentPrice: salePrice ?? price ?? undefined,
    discount, discountPercent, discountValue,
    color: clean(row.color),
    stockOrigin: clean(row.condition) === 'refurbished' ? 'Salvados' : 'Convencional',
  };
  for (const field of Object.keys(CATALOG_FIELDS) as (keyof typeof CATALOG_FIELDS)[]) {
    if (field.startsWith('custom_label_')) fields[field] = clean(row[field]);
  }
  return {
    id: String(row.id), currency: /^[A-Z]{3}$/.test(String(row.currency)) ? String(row.currency) : 'BRL', fields,
    images: [imageUrl(row.image_url), ...(Array.isArray(row.additional_image_urls) ? row.additional_image_urls.slice(0, 3).map(imageUrl) : [])],
  };
}

export async function readPreviewProduct(target: PreviewCatalog, productId: string, signal: AbortSignal) {
  return mapPreviewProduct(await readPreview<Record<string, unknown>>('read_image_template_product', { target, productId }, signal));
}
