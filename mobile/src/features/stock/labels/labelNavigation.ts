export type MobileLabelCategory = 'identificacao' | 'precos';

export interface MobileLabelRequest {
  category: MobileLabelCategory;
  productId?: string;
  variationId?: string;
  fillSheet?: boolean;
  receiptId?: string;
}

export function buildMobileLabelsUrl(baseUrl: string, request: MobileLabelRequest): string {
  const url = new URL('/mobile/etiquetas', baseUrl);
  url.searchParams.set('cat', request.category);
  if (request.productId) {
    url.searchParams.set('productId', request.productId);
    url.searchParams.set('autoAddProduct', 'true');
  }
  if (request.variationId) url.searchParams.set('variationId', request.variationId);
  if (request.fillSheet) url.searchParams.set('fillSheet', '1');
  if (request.receiptId) url.searchParams.set('receiptId', request.receiptId);
  return url.toString();
}

export function isTrustedMobileLabelsUrl(url: string, baseUrl: string): boolean {
  try {
    const current = new URL(url);
    const base = new URL(baseUrl);
    const safeProtocol = current.protocol === 'https:' ||
      (current.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(current.hostname));
    return safeProtocol && current.origin === base.origin && current.pathname === '/mobile/etiquetas' &&
      !['auth_email', 'user_id', 'auth_role'].some((key) => current.searchParams.has(key));
  } catch {
    return false;
  }
}
