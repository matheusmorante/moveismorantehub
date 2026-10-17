'use client';

import { useEffect } from 'react';

/**
 * Hook para rastreamento analítico de visualizações de produtos no catálogo digital.
 * Registra uma visualização por sessão por produto, gerando identificador de visitante anônimo.
 */
export function useProductViewTracking(productId: string | number | undefined) {
  useEffect(() => {
    if (!productId) return;

    const analyticsKey = `product-viewed:${productId}`;
    if (sessionStorage.getItem(analyticsKey)) return;
    sessionStorage.setItem(analyticsKey, '1');

    let visitorId = localStorage.getItem('morante_visitor_id');
    if (!visitorId) {
      visitorId = crypto.randomUUID
        ? crypto.randomUUID()
        : Math.random().toString(36).substring(2) + Date.now().toString(36);
      localStorage.setItem('morante_visitor_id', visitorId);
    }

    fetch('/api/analytics/track', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        product_id: productId,
        visitor_id: visitorId,
        referer: typeof document !== 'undefined' ? document.referrer || 'Tráfego Direto' : 'Tráfego Direto',
      }),
    }).catch((err) => console.error('Erro no track de visualização:', err));
  }, [productId]);
}
