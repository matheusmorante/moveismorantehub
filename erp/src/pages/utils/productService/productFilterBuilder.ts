import { supabase } from '@/pages/utils/supabaseConfig';
import {
  buildProductSearchTerms,
  createProductVariationSearchTooBroadError,
  PRODUCT_VARIATION_SEARCH_MATCH_LIMIT,
} from '../../../../../shared-utils/productListSearch';
import { PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER } from '../../../../../shared-utils/productListTypeFilters';
import { PRODUCT_LIST_DRAFT_FILTER } from '../../../../../shared-utils/productListDraftFilters';
import { fetchProductListCategoryFilter } from '../../../../../shared-utils/productListCategoryFilters';
const NON_TEST_PRODUCT_ARTIFACT_FILTER = [
  'and(',
  'or(technical_specs->>is_test.is.null,technical_specs->>is_test.neq.true),',
  'or(technical_specs->>isTest.is.null,technical_specs->>isTest.neq.true),',
  'or(technical_specs->testArtifact->>is_test.is.null,technical_specs->testArtifact->>is_test.neq.true),',
  'or(technical_specs->testArtifact->>isTest.is.null,technical_specs->testArtifact->>isTest.neq.true)',
  ')',
].join('');

export interface ProductQueryFilterOptions {
  showTrash?: boolean;
  search?: string;
  category?: string;
  activeOnly?: boolean;
  status?: string;
  isDraft?: boolean;
  includeDeactivated?: boolean;
  supplierId?: string;
  itemType?: string;
  excludeItemType?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  excludeTestProducts?: boolean;
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
  if (options?.showTrash && options.isDraft !== true) {
    q = q
      .or('active.eq.false,deleted.eq.true')
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

  // Filtro de rascunhos do ERP
  if (options?.isDraft === true) {
    q = q.or(PRODUCT_LIST_DRAFT_FILTER);
  } else if (options?.isDraft === false) {
    q = q
      .not('is_draft', 'is', true)
      .filter('status', 'isdistinct', 'draft');
  }

  if (options?.activeOnly === false) {
    q = q.eq('active', false);
  } else if (options?.activeOnly === true) {
    q = q.eq('active', true);
  } else if (options?.includeDeactivated === false && !options?.search) {
    // Apenas oculta desativados se explicitamente solicitado e não houver busca ativa
    q = q.or('active.eq.true,is_draft.eq.true');
  }

  // Filtro de busca textual — busca pelo nome do produto (name) na tabela de produtos e variações utilizando índices GIN trigram
  if (options?.search) {
    const { searchTerms, wordTerms } = buildProductSearchTerms(options.search);
    if (searchTerms.length > 0) {

      // 1. Buscar variações pelo campo 'name' na tabela product_variations (aproveita idx_product_variations_name_trgm)
      let variationParentIds: string[] = [];
      const varOrList = searchTerms.map((t) => `name.ilike.%${t}%`);
      const { data: matchedVariations, error: variationSearchError } = await supabase
        .from('product_variations')
        .select('product_id')
        .or(varOrList.join(','))
        .limit(PRODUCT_VARIATION_SEARCH_MATCH_LIMIT + 1);
      if (variationSearchError) throw variationSearchError;
      if ((matchedVariations?.length ?? 0) > PRODUCT_VARIATION_SEARCH_MATCH_LIMIT)
        throw createProductVariationSearchTooBroadError();

      if (matchedVariations && matchedVariations.length > 0) {
        variationParentIds = Array.from(
          new Set(matchedVariations.map((v) => v.product_id).filter(Boolean))
        );
      }

      // 2. Montar filtro or com o campo name dos produtos e os IDs de variações (aproveita idx_products_name_trgm)
      const orConditions: string[] = [];
      searchTerms.forEach((t) => {
        orConditions.push(`name.ilike.%${t}%`);
      });

      // Adicionar condição AND palavra por palavra para tolerar ordem ou palavras adicionais
      if (wordTerms.length > 0) {
        const andConditionsList = wordTerms.map(({ value, alternative }) =>
          alternative
            ? `or(name.ilike.%${value}%,name.ilike.%${alternative}%)`
            : `name.ilike.%${value}%`
        );
        orConditions.push(`and(${andConditionsList.join(',')})`);
      }

      if (variationParentIds.length > 0) {
        variationParentIds.forEach((id) => {
          orConditions.push(`id.eq.${id}`);
        });
      }

      q = q.or(orConditions.join(','));
    }
  }

  // Filtro de categoria
  if (options?.category && options.category !== 'Serviços' && options.category !== 'Produtos') {
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

  if (options?.excludeTestProducts) {
    q = q.or(NON_TEST_PRODUCT_ARTIFACT_FILTER);
  }

  if (pagination) {
    q = q
      .order(pagination.orderColumn, { ascending: pagination.ascending })
      .range(pagination.from, pagination.to);
  }

  return await q;
};
