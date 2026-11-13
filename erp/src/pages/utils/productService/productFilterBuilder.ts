import { supabase } from '@/pages/utils/supabaseConfig';
import {
  buildProductParentSearchFilter,
  buildProductSearchTerms,
  buildProductVariationSearchFilter,
  createProductVariationSearchTooBroadError,
  PRODUCT_VARIATION_SEARCH_MATCH_LIMIT,
} from '../../../../../shared-utils/productListSearch';
import {
  PRODUCT_LIST_NON_COMBO_FLAG_FILTER,
  PRODUCT_LIST_NON_COMBO_ITEM_TYPE_FILTER,
  PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER,
} from '../../../../../shared-utils/productListTypeFilters';
import { PRODUCT_LIST_DRAFT_FILTER } from '../../../../../shared-utils/productListDraftFilters';
import { fetchProductListCategoryFilter } from '../../../../../shared-utils/productListCategoryFilters';
import { NON_TEST_PRODUCT_ARTIFACT_FILTER } from '../../../../../shared-utils/testArtifactQueries';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
export interface ProductQueryFilterOptions {
  showTrash?: boolean;
  search?: string;
  category?: string;
  categoryIds?: string[];
  brand?: string;
  activeOnly?: boolean;
  status?: string;
  isDraft?: boolean;
  includeDeactivated?: boolean;
  supplierId?: string;
  itemType?: string;
  excludeItemType?: string;
  excludeCombos?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  excludeTestProducts?: boolean;
  searchVariationsAsEmbed?: boolean;
}

export interface ProductPaginationOptions {
  orderColumn: string;
  ascending: boolean;
  from: number;
  to: number;
}

/**
 * Aplica os filtros e ordenação na query Supabase do catálogo de produtos e executa a busca
 */
export const applyProductFiltersAndSort = async (
  query: any,
  options?: ProductQueryFilterOptions,
  pagination?: ProductPaginationOptions
): Promise<any> => {
  let q = query;
  if (options?.showTrash) {
    q = q
      .eq('deleted', true)
      .not('is_draft', 'is', true)
      .filter('status', 'isdistinct', 'draft');
  } else {
    q = q.eq('deleted', false);
  }

  if (options?.itemType) {
    q = q.eq('item_type', options.itemType);
  }

  if (options?.excludeItemType) {
    // Registros legados sem item_type são produtos comuns; o operador neq os excluiria por NULL.
    q = q.filter('item_type', 'isdistinct', options.excludeItemType);
  }

  if (options?.excludeCombos) {
    q = q
      .or(PRODUCT_LIST_NON_COMBO_FLAG_FILTER)
      .or(PRODUCT_LIST_NON_COMBO_ITEM_TYPE_FILTER);
  }

  // Filtro de rascunhos do ERP
  if (options?.isDraft === true) {
    q = q.or(PRODUCT_LIST_DRAFT_FILTER);
  } else if (options?.isDraft === false) {
    q = q
      .not('is_draft', 'is', true)
      .filter('status', 'isdistinct', 'draft');
  }

  if (!options?.showTrash) {
    if (options?.activeOnly === false) {
      q = q.eq('active', false);
    } else if (options?.activeOnly === true) {
      q = q.eq('active', true);
    } else if (options?.includeDeactivated === false && !options?.search) {
      // Apenas oculta desativados se explicitamente solicitado e não houver busca ativa
      q = q.or('active.eq.true,is_draft.eq.true');
    }
  }

  // Filtro de busca textual — busca pelo nome do produto (name) na tabela de produtos e variações utilizando índices GIN trigram
  if (options?.search) {
    const { searchTerms, wordTerms } = buildProductSearchTerms(options.search);
    if (searchTerms.length > 0) {

      // Specific searches can use the compact index lookup. When many variations
      // match, filter through the relationship before pagination instead of truncating IDs.
      const { data: matchedVariations, error: variationSearchError } = await withAbortTimeout(
          supabase
            .from('product_variations')
            .select('product_id')
            .or(buildProductVariationSearchFilter(searchTerms))
            .limit(PRODUCT_VARIATION_SEARCH_MATCH_LIMIT + 1),
          'products:variation-search',
        );
      if (variationSearchError) throw variationSearchError;
      if ((matchedVariations?.length ?? 0) > PRODUCT_VARIATION_SEARCH_MATCH_LIMIT) {
        if (!options.searchVariationsAsEmbed) throw createProductVariationSearchTooBroadError();
        q = q.or(buildProductVariationSearchFilter(searchTerms), { referencedTable: 'search_variations' });
        q = q.or(`${buildProductParentSearchFilter({ searchTerms, wordTerms })},search_variations.not.is.null`);
      } else {
        const variationParentIds: string[] = Array.from(
          new Set((matchedVariations || []).map((v) => v.product_id).filter(Boolean))
        );
        q = q.or(buildProductParentSearchFilter({ searchTerms, wordTerms }, variationParentIds));
      }
    }
  }

  // Filtro de categoria
  if (options?.categoryIds?.length) {
    const categoryFilters = await Promise.all(
      Array.from(new Set(options.categoryIds.filter(Boolean))).map((categoryId) =>
        fetchProductListCategoryFilter(supabase, categoryId)
      )
    );
    q = q.or(categoryFilters.join(','));
  } else if (options?.category && options.category !== 'Serviços' && options.category !== 'Produtos') {
    q = q.or(await fetchProductListCategoryFilter(supabase, options.category));
  } else if (options?.category === 'Serviços') {
    q = q.eq('item_type', 'service');
  } else if (options?.category === 'Produtos') {
    q = q.or(PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER);
  }

  // Filtro por status do catálogo digital (ex: 'published', 'hidden')
  if (options?.status) {
    q = q.eq('status', options.status);
  }

  // Filtro por fornecedor
  if (options?.supplierId) {
    q = q.or(
      `supplier_id.eq.${options.supplierId},main_supplier_id.eq.${options.supplierId},supplier_ids.cs.{"${options.supplierId}"}`
    );
  }

  if (options?.brand) {
    q = q.eq('brand', options.brand);
  }

  if (options?.excludeTestProducts) {
    q = q.or(NON_TEST_PRODUCT_ARTIFACT_FILTER);
  }

  if (pagination) {
    q = q.order(pagination.orderColumn, {
      ascending: pagination.ascending,
      ...(pagination.orderColumn === 'updated_at' ? { nullsFirst: false } : {}),
    });
    if (pagination.orderColumn === 'updated_at') {
      q = q.order('created_at', { ascending: false, nullsFirst: false });
      q = q.order('id', { ascending: true });
    }
    q = q.range(pagination.from, pagination.to);
  }

  return await withAbortTimeout(q, 'products:page');
};
