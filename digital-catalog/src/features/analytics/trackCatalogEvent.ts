export type CatalogAnalyticsEvent = 'catalog_visit' | 'product_view' | 'product_click';

function getVisitorId() {
  try {
    const key = 'morante_visitor_id';
    let visitorId = window.localStorage.getItem(key);
    if (!visitorId) {
      visitorId = globalThis.crypto?.randomUUID?.()
        ?? `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
      window.localStorage.setItem(key, visitorId);
    }
    return visitorId;
  } catch {
    return null;
  }
}

export function trackCatalogEvent(
  eventType: CatalogAnalyticsEvent,
  productId?: string | number,
) {
  if (typeof window === 'undefined') return Promise.resolve(null);
  const visitorId = getVisitorId();
  if (!visitorId) return Promise.resolve(null);

  return fetch('/api/analytics/track', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    keepalive: true,
    body: JSON.stringify({
      event_type: eventType,
      product_id: productId ?? null,
      visitor_id: visitorId,
      referer: document.referrer || 'Tráfego Direto',
    }),
  }).catch(() => null);
}
