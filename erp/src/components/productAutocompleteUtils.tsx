import React from 'react';
import Product, { Variation } from '../pages/types/product.type';
import { fetchProductsPage } from '../pages/utils/productService';
import { getSelectedProductDisplayName } from '../pages/utils/productVariationDefaults';
import { buildAccentInsensitiveRegex } from '../pages/utils/textUtils';

export type SuggestionItem = {
  product: Product;
  variation?: Variation;
};

export const getVariationDisplayName = (product: Product, variation?: Variation) => {
  return getSelectedProductDisplayName(product, variation);
};

export const fetchAllProductSearchResults = async (
  search: string,
  supplierId?: string,
  includeDeactivated = false,
  maxResults = 25
) => {
  const trimmed = search.trim();
  if (!trimmed) return [];

  const result = await fetchProductsPage(1, maxResults, {
    search: trimmed,
    activeOnly: includeDeactivated ? undefined : true,
    isDraft: false,
    supplierId,
  });

  return result.data || [];
};

export const normalizeProductSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const renderHighlightedProductText = (text: string, query: string) => {
  const words = query.trim().split(/\s+/).filter(Boolean);
  if (!words.length) return <span>{text}</span>;

  const regexPatterns = words.map((w) => buildAccentInsensitiveRegex(w)).filter(Boolean);
  if (!regexPatterns.length) return <span>{text}</span>;

  const expression = new RegExp(`(${regexPatterns.join('|')})`, 'gi');
  return (
    <span>
      {text.split(expression).map((part, index) =>
        expression.test(part) ? (
          <span
            key={index}
            className="bg-yellow-200 dark:bg-yellow-900/50 text-yellow-900 dark:text-yellow-200 rounded-sm px-0.5"
          >
            {part}
          </span>
        ) : (
          <span key={index}>{part}</span>
        )
      )}
    </span>
  );
};
