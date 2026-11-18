'use client';

import { useEffect } from 'react';
import { trackCatalogEvent } from '@/features/analytics/trackCatalogEvent';

/**
 * Hook para rastreamento analítico de visualizações de produtos no catálogo digital.
 * Registra uma visualização por sessão por produto, gerando identificador de visitante anônimo.
 */
export function useProductViewTracking(productId: string | number | undefined) {
  useEffect(() => {
    if (!productId) return;

    const analyticsKey = `product-viewed:${productId}`;
    try {
      if (sessionStorage.getItem(analyticsKey)) return;
      sessionStorage.setItem(analyticsKey, '1');
    } catch {
      return;
    }

    void trackCatalogEvent('product_view', productId);
  }, [productId]);
}
