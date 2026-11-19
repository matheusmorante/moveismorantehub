import React from 'react';
import Product, { Variation } from '../pages/types/product.type';
import { fetchProductsPage } from '../pages/utils/productService';
import { getSelectedProductDisplayName } from '../pages/utils/productVariationDefaults';
import { buildAccentInsensitiveRegex } from '../pages/utils/textUtils';
import { supabase } from '@/pages/utils/supabaseConfig';

export type SuggestionItem = {
  product: Product;
  variation?: Variation;
};

export type ProductAutocompleteExcludedLink = {
  readonly productId: string;
  readonly variationId?: string;
};

export const getVariationDisplayName = (product: Product, variation?: Variation) => {
  return getSelectedProductDisplayName(product, variation);
};

export const fetchAllProductSearchResults = async (
  search: string,
  supplierId?: string,
  includeDeactivated = false,
  maxResults = 25,
  itemType?: 'composition',
  includeTrashEligibility = true,
  filterCombosOnServer = false,
  compactComponentProjection = false,
  compactSalesOrderProjection = false,
  includeCompositions = false,
) => {
  const trimmed = search.trim();
  if (!trimmed) return [];

  const result = await fetchProductsPage(1, maxResults, {
    search: trimmed,
    activeOnly: includeDeactivated ? undefined : true,
    isDraft: false,
    supplierId,
    itemType,
    excludeCombos: filterCombosOnServer,
  }, {
    throwOnError: true,
    includeTrashEligibility,
    includeTotal: false,
    searchVariationsAsEmbed: true,
    productProjection: compactComponentProjection
      ? 'componentAutocomplete'
      : compactSalesOrderProjection
        ? 'salesOrderAutocomplete'
        : undefined,
    includeCompositions,
  });
  if (!result || !Array.isArray(result.data)) throw new Error('A busca de produtos não foi confirmada.');
  return result.data;
};

export const fetchCompositionAutocompleteResults = async (search: string): Promise<Product[]> => {
  const trimmed = search.trim();
  if (trimmed.length < 3) return [];

  const { data, error } = await supabase.rpc('search_catalog_with_campaign_prices', {
    p_query: trimmed,
    p_limit: 15,
  });
  if (error) throw error;

  return ((data || []) as any[])
    .filter((row) => row.entity_type?.startsWith('composition') && row.composition_id)
    .map((row): Product => {
      const hasVariation = row.entity_type.includes('variation');
      const id = String(row.composition_id);
      const variationId = hasVariation ? String(row.composition_variation_id || '') : '';
      const variation: Variation | undefined = hasVariation
        ? {
            id: variationId,
            name: row.variation_name || row.parent_name || '',
            sku: row.sku || '',
            stock: 0,
            unitPrice: Number(row.unit_price || 0),
            promoPrice: row.product_promo_price == null ? undefined : Number(row.product_promo_price),
            costPrice: Number(row.cost_price || 0),
            active: true,
            attributes: [],
          }
        : undefined;
      const key = `${id}:${variationId || 'base'}`;

      return {
        id,
        name: row.parent_name || row.display_name || '',
        title: row.parent_name || row.display_name || '',
        description: row.parent_name || row.display_name || '',
        code: row.code || row.sku || '',
        sku: row.sku || row.code || '',
        unitPrice: Number(row.unit_price || 0),
        promoPrice: row.product_promo_price == null ? undefined : Number(row.product_promo_price),
        costPrice: Number(row.cost_price || 0),
        stock: 0,
        unit: 'UN',
        active: true,
        itemType: 'composition',
        isComposition: true,
        isCombo: true,
        variations: variation ? [variation] : [],
        autocompleteSearchRow: row,
        autocompleteSearchKey: key,
      } as Product;
    });
};

export const normalizeProductSearch = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

export const normalizeProductSearchSeparators = (value: string) =>
  normalizeProductSearch(value)
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

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
