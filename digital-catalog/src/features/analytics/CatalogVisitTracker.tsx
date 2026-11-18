'use client';

import { useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { trackCatalogEvent } from './trackCatalogEvent';

function isCatalogBrowsePage(pathname: string) {
  return pathname === '/' || pathname === '/selecionados' || pathname.startsWith('/categorias/');
}

export function CatalogVisitTracker() {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname || !isCatalogBrowsePage(pathname)) return;

    const key = `catalog-visit:${pathname}`;
    try {
      if (window.sessionStorage.getItem(key)) return;
      window.sessionStorage.setItem(key, '1');
    } catch {
      return;
    }

    void trackCatalogEvent('catalog_visit');
  }, [pathname]);

  return null;
}
