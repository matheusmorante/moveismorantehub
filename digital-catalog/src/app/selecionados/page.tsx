'use client';

import { use, useMemo } from 'react';
import { SelectedCatalogPage, type SelectedCatalogRequest } from '@/features/selected-catalog';

type SearchValue = string | string[] | undefined;
interface PageProps {
  searchParams: Promise<Record<string, SearchValue>>;
}

const firstValue = (value: SearchValue) => Array.isArray(value) ? value[0] || '' : value || '';
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export default function SelectedCatalogRoute({ searchParams }: PageProps) {
  const params = use(searchParams);
  const rawItems = firstValue(params.i);
  const rawCategoryId = firstValue(params.c);
  const categoryId = UUID_PATTERN.test(rawCategoryId) ? rawCategoryId : '';
  const search = firstValue(params.q).trim().slice(0, 100);
  const brand = firstValue(params.b).trim().slice(0, 120);
  const hidePrices = firstValue(params.preco) === 'oculto';
  const allProducts = firstValue(params.a) === '1';
  const excludedRaw = firstValue(params.ep);
  const excludedProductIds = excludedRaw.split(',').filter(Boolean).slice(0, 100);
  const request = useMemo<SelectedCatalogRequest>(() => ({
    itemTokens: rawItems ? rawItems.split(',').slice(0, 50) : [],
    categoryId,
    search,
    brand,
    hidePrices,
    allProducts,
    excludedProductIds,
  }), [rawItems, categoryId, search, brand, hidePrices, allProducts, excludedRaw]);
  return <SelectedCatalogPage request={request} />;
}
