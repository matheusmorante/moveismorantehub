import { createHash } from 'node:crypto';
import type { CatalogChange, MetaProduct } from './graph.js';
import { UUID, type DesiredCatalog, type VerifiedItem } from './source.js';

const OWNER_PREFIX = 'morantehub:v1:';
export const ownershipLabel = (productId: string) => OWNER_PREFIX + productId.toLowerCase();

export function ownerOf(product: MetaProduct, verified: ReadonlyMap<string, VerifiedItem>): string | undefined {
  const label = product.custom_label_4;
  if (typeof label === 'string' && label.startsWith(OWNER_PREFIX)) {
    const parentId = label.slice(OWNER_PREFIX.length);
    if (UUID.test(parentId)) return parentId.toLowerCase();
  }
  const link = verified.get(product.retailer_id);
  return link?.meta_item_id === product.id ? link.product_id : undefined;
}

const normalized = (value: unknown): string => String(value ?? '').replace(/\r\n/g, '\n').trim();

function priceInCents(value: unknown): number | null {
  const number = normalized(value).replace(/[A-Z$\s]/gi, '');
  if (!number) return null;
  const decimal = /[.,]\d{2}$/.test(number)
    ? number.slice(0, -3).replace(/[.,]/g, '') + '.' + number.slice(-2)
    : number.replace(/,/g, '.');
  const amount = Number(decimal);
  return Number.isFinite(amount) ? Math.round(amount * 100) : null;
}

function normalizeImages(value: unknown): string[] {
  return (Array.isArray(value) ? value : normalized(value).split(','))
    .map((url) => {
      const text = normalized(url);
      try {
        return decodeURI(text);
      } catch {
        return text;
      }
    }).filter(Boolean);
}

const compareFields = {
  title: 'name',
  description: 'description',
  condition: 'condition',
  availability: 'availability',
  brand: 'brand',
  link: 'url',
  product_type: 'product_type',
  item_group_id: 'retailer_product_group_id',
  custom_label_0: 'custom_label_0',
  custom_label_1: 'custom_label_1',
  custom_label_2: 'custom_label_2',
  custom_label_3: 'custom_label_3',
  custom_label_4: 'custom_label_4',
  custom_number_4: 'custom_number_4',
  color: 'color',
  size: 'size',
  material: 'material',
  gender: 'gender',
  quantity_to_sell_on_facebook: 'quantity_to_sell_on_facebook',
} as const;

const clearableFields = [
  'sale_price', 'additional_image_link', 'custom_label_2', 'custom_label_3', 'color', 'size', 'material',
] as const;

export function matchesMetaProduct(data: Record<string, unknown>, remote: MetaProduct): boolean {
  const regular = priceInCents(remote.price);
  const sale = priceInCents(remote.sale_price);
  return regular === priceInCents(data.price)
    && (sale === regular || sale === 0 ? null : sale) === priceInCents(data.sale_price)
    && (normalized(remote.currency).toUpperCase() || (/BRL|R\$/i.test(normalized(remote.price)) ? 'BRL' : '')) === 'BRL'
    && (normalized(remote.visibility).toLowerCase() || 'published') === data.visibility
    && Object.entries(compareFields).every(([field, remoteField]) =>
      normalized(data[field]) === normalized(remote[remoteField]))
    && normalizeImages(data.image_link)[0] === normalizeImages(remote.image_url)[0]
    && JSON.stringify(normalizeImages(data.additional_image_link))
      === JSON.stringify(normalizeImages(remote.additional_image_urls));
}

function withOwnership(data: Record<string, unknown>, productId: string): Record<string, unknown> {
  // A Graph API não expõe internal_label no ProductItem. A assinatura registra as campanhas enviadas.
  const labels = normalized(data.internal_label);
  const campaignRevision = createHash('sha256').update(labels).digest().readUInt32BE(0) % 2_147_483_646 + 1;
  return {
    ...data,
    visibility: 'published',
    custom_label_4: ownershipLabel(productId),
    custom_number_4: campaignRevision,
  };
}

interface ChangePlan {
  changes: CatalogChange[];
  errors: Map<string, string>;
  unchanged: number;
}

export function planCatalogChanges(
  desired: DesiredCatalog,
  remote: MetaProduct[],
  verified: ReadonlyMap<string, VerifiedItem>,
  { scope, completeSnapshot = false }: { scope?: ReadonlySet<string>; completeSnapshot?: boolean } = {},
): ChangePlan {
  const result: ChangePlan = { changes: [], errors: new Map(desired.blocked), unchanged: 0 };
  const current = new Map<string, MetaProduct>();
  for (const item of remote) {
    const existing = current.get(item.retailer_id);
    if (existing && existing.id !== item.id) {
      result.errors.set(item.retailer_id, 'Identificador duplicado no catálogo da Meta.');
    }
    current.set(item.retailer_id, item);
  }

  for (const [retailerId, { productId, request }] of desired.items) {
    if (result.errors.has(retailerId)) continue;
    const item = current.get(retailerId);
    const owner = item ? ownerOf(item, verified) : undefined;
    const data = withOwnership(request.data, productId);
    if (!item) {
      result.changes.push({ method: 'CREATE', retailer_id: retailerId, data });
    } else if (!owner || (owner !== productId && !completeSnapshot)) {
      result.errors.set(retailerId, 'Identificador ocupado por um item cuja origem no ERP não foi comprovada.');
    } else if (matchesMetaProduct(data, item)) {
      result.unchanged++;
    } else {
      const cleared = Object.fromEntries(clearableFields.map((field) => [field, data[field] ?? '']));
      result.changes.push({ method: 'UPDATE', retailer_id: retailerId, data: { ...data, ...cleared } });
    }
  }

  for (const [retailerId, item] of current) {
    if (desired.items.has(retailerId) || result.errors.has(retailerId)) continue;
    const owner = ownerOf(item, verified);
    if (!owner || (scope && !scope.has(owner))) continue;
    result.changes.push({ method: 'DELETE', retailer_id: retailerId, data: { id: retailerId } });
  }
  return result;
}
