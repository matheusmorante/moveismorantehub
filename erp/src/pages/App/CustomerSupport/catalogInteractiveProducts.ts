import type { WhatsAppMessage } from './types';

export interface CatalogInteractiveProductCard {
  retailerId: string;
  name: string;
  imageUrl: string | null;
  salesPrice: number | null;
  promoPrice: number | null;
  currencyCode?: string;
  variationId?: string;
}

const asRecord = (value: unknown): Record<string, any> | null =>
  value && typeof value === 'object' && !Array.isArray(value)
    ? value as Record<string, any>
    : null;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

export function getCatalogProductSnapshot(message: WhatsAppMessage): CatalogInteractiveProductCard | null {
  if (message.messageType !== 'interactive') return null;
  const payload = asRecord(message.rawPayload);
  const interactive = asRecord(payload?.interactive);
  const product = asRecord(interactive?.product) || asRecord(payload?.product);
  if (!product) return null;

  const rawId = [product.product_retailer_id, product.retailer_id, product.retailerId,
    interactive?.type === 'product' ? interactive.id : undefined]
    .find((value) => typeof value === 'string' && value.trim());
  let retailerId = typeof rawId === 'string' ? rawId.trim() : '';
  let variationId: string | undefined;
  if (typeof product.url === 'string') {
    try {
      const url = new URL(product.url);
      const id = url.searchParams.get('var');
      if (['moveismorante.com.br', 'www.moveismorante.com.br'].includes(url.hostname.toLowerCase())
        && url.pathname.startsWith('/produto/') && id && UUID_PATTERN.test(id)) {
        variationId = id;
        if (!retailerId) retailerId = `variation:${id}`;
      }
    } catch {
      // A mensagem ainda pode exibir os dados que vieram no próprio produto.
    }
  }

  const amount = (value: unknown): number | null => {
    if (value === null || value === undefined || value === '') return null;
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed > 0 ? parsed / 1000 : null;
  };
  const currency = typeof product.currency_code === 'string' ? product.currency_code.toUpperCase() : '';
  const currencyCode = /^[A-Z]{3}$/u.test(currency) ? currency : undefined;
  return {
    retailerId,
    name: String(product.title || product.name || 'Produto do catálogo').trim(),
    imageUrl: null,
    salesPrice: currencyCode ? amount(product.price_amount) : null,
    promoPrice: currencyCode ? amount(product.sale_price_amount) : null,
    currencyCode,
    variationId,
  };
}

export function getCatalogRetailerIds(message: WhatsAppMessage): string[] {
  if (message.messageType !== 'interactive') return [];
  const payload = asRecord(message.rawPayload);
  if (!payload) return [];

  const ids: string[] = [];
  const addId = (value: unknown) => {
    if (typeof value === 'string' && value.trim()) ids.push(value.trim());
  };
  const addItems = (value: unknown) => {
    if (!Array.isArray(value)) return;
    value.forEach((item) => {
      if (typeof item === 'string') {
        addId(item);
        return;
      }
      const record = asRecord(item);
      addId(record?.product_retailer_id ?? record?.retailer_id ?? record?.retailerId);
    });
  };

  addItems(payload.catalog_products);
  addItems(payload.catalog_items);
  addItems(payload.nativeCatalogProducts);
  addItems(payload.product_items);
  addItems(payload.products);
  addItems(payload.catalog_retailer_ids);
  addId(payload.product_retailer_id);
  addItems(asRecord(payload.order)?.product_items);

  const interactive = asRecord(payload.interactive);
  const action = asRecord(interactive?.action) || asRecord(payload.action);
  addId(action?.product_retailer_id);
  addId(interactive?.product_retailer_id);
  addItems(action?.product_items);
  addItems(interactive?.product_items);
  if (Array.isArray(action?.sections)) {
    action.sections.forEach((section: unknown) => addItems(asRecord(section)?.product_items));
  }

  const product = asRecord(payload.product);
  addId(product?.product_retailer_id ?? product?.retailer_id);
  addId(getCatalogProductSnapshot(message)?.retailerId);

  return Array.from(new Set(ids));
}

export function getCatalogProductCardIds(message: WhatsAppMessage): string[] {
  if (message.messageType !== 'interactive') return [];
  const emoji = typeof message.rawPayload?.reaction?.emoji === 'string'
    ? message.rawPayload.reaction.emoji
    : message.textContent?.match(/^Reação (.+) a uma mensagem$/u)?.[1] || '';
  if (message.rawPayload?.provider_message_type === 'reaction' || emoji || message.textContent === 'Reação removida de uma mensagem') {
    return [];
  }

  const ids = getCatalogRetailerIds(message);
  return ids.length ? ids : getCatalogProductSnapshot(message) ? [`snapshot:${message.id}`] : [];
}

export function getCatalogProductNameHints(message: WhatsAppMessage): Map<string, string> {
  const payload = asRecord(message.rawPayload);
  const products = payload?.catalog_products || payload?.nativeCatalogProducts;
  const names = new Map<string, string>();
  if (!Array.isArray(products)) return names;

  products.forEach((entry: unknown) => {
    const product = asRecord(entry);
    const retailerId = typeof product?.retailer_id === 'string'
      ? product.retailer_id.trim()
      : typeof product?.retailerId === 'string'
        ? product.retailerId.trim()
        : '';
    const name = typeof product?.name === 'string' ? product.name.trim() : '';
    if (retailerId && name) names.set(retailerId, name);
  });
  return names;
}

export function getCatalogMessageCaption(message: WhatsAppMessage): string {
  const payload = asRecord(message.rawPayload);
  const interactive = asRecord(payload?.interactive);
  const bodyText = typeof asRecord(interactive?.body)?.text === 'string'
    ? String(asRecord(interactive?.body)?.text).trim()
    : '';
  if (bodyText) return bodyText;

  const text = String(message.textContent || '').trim()
    .replace(/^🔘\s*Resposta interativa\s*/iu, '')
    .trim();
  if (!text) return '';
  return text
    .split(/\n\s*\n/u)
    .filter((line) => !/^\s*(?:🛍️\s*)?(?:Produto do catálogo\b|Lista nativa com \d+ produtos:)/iu.test(line))
    .join('\n\n')
    .trim();
}

export function collectCatalogRetailerIds(messages: readonly WhatsAppMessage[]): string[] {
  const ids: string[] = [];
  messages.forEach((message) => {
    ids.push(...getCatalogRetailerIds(message));
    const variationId = getCatalogProductSnapshot(message)?.variationId;
    if (variationId) ids.push(`variation:${variationId}`);
  });
  return Array.from(new Set(ids));
}
