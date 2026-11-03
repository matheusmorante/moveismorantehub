import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import { supabase } from '../../../services/supabaseClient';
import {
  buildProductParentSearchFilter,
  buildProductSearchTerms,
  buildProductVariationSearchFilter,
  createProductVariationSearchTooBroadError,
  isProductVariationSearchTooBroadError,
  PRODUCT_VARIATION_SEARCH_MATCH_LIMIT,
} from '../../../../../shared-utils/productListSearch';
import {
  PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER,
  PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER,
} from '../../../../../shared-utils/productListTypeFilters';
import { PRODUCT_LIST_DRAFT_FILTER } from '../../../../../shared-utils/productListDraftFilters';
import { fetchProductListCategoryFilter } from '../../../../../shared-utils/productListCategoryFilters';
import { NON_TEST_PRODUCT_ARTIFACT_FILTER } from '../../../../../shared-utils/testArtifactQueries';
import { getMobileProductListCategoryIds } from '../domain/mobileProductListPresentation';
import { applyMobileCompositionAvailability } from './mobileProductCompositionAvailability';
import { mapMobileProductSummaries } from './mobileProductSummaryMapper';
import { mapMobileProductRow } from './mobileProductRowMapper';

export interface MobileProductFilterOptions {
  productId?: string;
  search?: string;
  category?: string;
  statusFilter?: 'all' | 'active' | 'disabled' | 'draft';
  catalogStatus?: 'all' | 'published' | 'hidden';
  includeDeactivated?: boolean;
  includeMerged?: boolean;
  showTrash?: boolean;
  showTestProducts?: boolean;
  summaryOnly?: boolean;
  supplierId?: string;
  itemType?: 'standard' | 'composition';
  generalType?: 'all' | 'product' | 'service';
  canViewCompositions?: boolean;
  throwOnError?: boolean;
}

const MOBILE_PRODUCT_LIST_COLUMNS =
  '*, product_variations(*), product_categories(category_id), product_images(image_url, is_main)';
const MOBILE_PRODUCT_SUMMARY_COLUMNS =
  'id, name, title, description, code, sku, category_id, category, brand, condition, unit_price, price, promo_price, cost_price, stock, unit, active, status, deleted, item_type, is_draft, observations, technical_specs, combo_items, product_categories(category_id), product_variations(*)';

const applyMobileTrashEligibility = async (products: any[], showTrash = false) => {
  const productIds = products
    .filter((product) => !showTrash && !product.isDraft && product.id)
    .map((product) => String(product.id))
    .filter((id) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));
  if (!productIds.length) {
    return products.map((product) => ({
      ...product,
      can_trash: false,
      trash_block_reason: product.isDraft ? 'Rascunhos devem ser descartados diretamente' : null,
    }));
  }

  const lookup = await withAbortTimeout(
    supabase.rpc('get_products_trash_eligibility', { p_product_ids: productIds }),
    'mobile:elegibilidade-lixeira'
  ).then((result) => ({ result })).catch(() => null);
  if (!lookup || lookup.result.error || !Array.isArray(lookup.result.data)) {
    console.warn('[MobileProductService] Não foi possível confirmar a elegibilidade da lixeira.');
    return products.map((product) => ({
      ...product,
      can_trash: false,
      trash_block_reason: product.isDraft
        ? 'Rascunhos devem ser descartados diretamente'
        : 'Não foi possível confirmar a elegibilidade para a lixeira.',
    }));
  }

  const eligibility = new Map<string, { can_trash: boolean; trash_block_reason: string | null }>();
  lookup.result.data.forEach((item: any) => {
    if (item.product_id) {
      eligibility.set(String(item.product_id), {
        can_trash: Boolean(item.can_trash),
        trash_block_reason: item.trash_block_reason || null,
      });
    }
  });
  return products.map((product) => {
    const result = eligibility.get(String(product.id));
    return {
      ...product,
      can_trash: result?.can_trash === true,
      trash_block_reason: result?.trash_block_reason ||
        (product.isDraft ? 'Rascunhos devem ser descartados diretamente' : 'Validando elegibilidade...'),
    };
  });
};

export const fetchMobileProductsPage = async (
  page: number,
  pageSize: number,
  options?: MobileProductFilterOptions
): Promise<{ data: any[]; total: number }> => {
  try {
    const from = (page - 1) * pageSize;
    const to = from + pageSize - 1;

    let query = supabase
      .from('products')
      .select(options?.summaryOnly ? MOBILE_PRODUCT_SUMMARY_COLUMNS : MOBILE_PRODUCT_LIST_COLUMNS, {
        count: 'exact',
      });

    if (!options?.showTestProducts) {
      query = query.or(NON_TEST_PRODUCT_ARTIFACT_FILTER);
    }

    if (options?.productId) query = query.eq('id', options.productId);

    if (options?.showTrash) {
      query = query
        .eq('deleted', true)
        .not('is_draft', 'is', true)
        .filter('status', 'isdistinct', 'draft');
    } else {
      query = query.eq('deleted', false);
    }

    const includeCompositionsInStandardMode =
      options?.itemType === 'standard' &&
      options.canViewCompositions === true &&
      (options.generalType === 'all' || options.generalType === 'product');

    if (options?.itemType === 'composition') {
      query = query.eq('item_type', 'composition');
    } else if (options?.itemType === 'standard' && !includeCompositionsInStandardMode) {
      // Preserva produtos legados com item_type nulo, como o filtro do ERP.
      query = query.filter('item_type', 'isdistinct', 'composition');
    }

    if (options?.generalType === 'product') {
      query = includeCompositionsInStandardMode
        ? query.or(PRODUCT_LIST_PRODUCT_ITEM_TYPE_FILTER)
        : query.or(PRODUCT_LIST_PRODUCT_AND_LEGACY_ITEM_TYPE_FILTER);
    } else if (options?.generalType === 'service') {
      query = query.eq('item_type', 'service');
    }

    if (options?.supplierId) {
      const supplierId = options.supplierId.trim();
      if (/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(supplierId)) {
        query = query.or(
          `supplier_id.eq.${supplierId},main_supplier_id.eq.${supplierId},supplier_ids.cs.{"${supplierId}"}`
        );
      }
    }

    const status = options?.statusFilter || 'all';
    if (!options?.showTrash && status === 'draft') {
      query = query.or(PRODUCT_LIST_DRAFT_FILTER);
    } else if (!options?.showTrash && status === 'active') {
      query = query
        .not('is_draft', 'is', true)
        .filter('status', 'isdistinct', 'draft')
        .eq('active', true);
    } else if (!options?.showTrash && status === 'disabled') {
      query = query
        .not('is_draft', 'is', true)
        .filter('status', 'isdistinct', 'draft')
        .eq('active', false);
    } else if (!options?.showTrash && options?.includeDeactivated === false) {
      // Rascunhos seguem acessíveis para conclusão do cadastro; somente os
      // produtos de fato desativados ficam ocultos na visão padrão.
      query = query.or('active.eq.true,is_draft.eq.true,status.eq.draft');
    }

    if (options?.catalogStatus && options.catalogStatus !== 'all') {
      query = query.eq('status', options.catalogStatus);
    }

    if (options?.category) {
      // Mantém registros antigos pelo campo products.category e também consulta
      // a coluna direta e a relação normalizada product_categories.
      query = query.or(await fetchProductListCategoryFilter(supabase, options.category));
    }

    const searchTerms = buildProductSearchTerms(options?.search || '');
    if (searchTerms.searchTerms.length > 0) {
      let matchedParentIds: string[] = [];

      try {
        const { data: matchedVars, error: variationsError } = await withAbortTimeout(
          supabase
            .from('product_variations')
            .select('product_id')
            .or(buildProductVariationSearchFilter(searchTerms.searchTerms))
            .limit(PRODUCT_VARIATION_SEARCH_MATCH_LIMIT + 1),
          'mobile:variation-search',
        );
        if (variationsError && options?.throwOnError) throw variationsError;
        if (variationsError)
          console.warn('[MobileProductService] Erro ao buscar variações filhas:', variationsError);

        if ((matchedVars?.length ?? 0) > PRODUCT_VARIATION_SEARCH_MATCH_LIMIT)
          throw createProductVariationSearchTooBroadError();

        if (matchedVars && matchedVars.length > 0) {
          matchedParentIds = Array.from(
            new Set(matchedVars.map((v: any) => v.product_id).filter(Boolean))
          );
        }
      } catch (e) {
        if (options?.throwOnError || isProductVariationSearchTooBroadError(e)) throw e;
        console.warn('[MobileProductService] Erro ao buscar variações filhas:', e);
      }

      // Mantém o contrato ERP: nome/código do pai e nome/SKU das variações; descrição não participa.
      query = query.or(buildProductParentSearchFilter(searchTerms, matchedParentIds));
    }

    query = query.order('created_at', { ascending: false }).range(from, to);

    const { data, count, error } = await withAbortTimeout(query, 'mobile:product-list');
    if (error) {
      if (options?.throwOnError) throw error;
      console.warn('[MobileProductService] Erro ao buscar produtos:', error);
      return { data: [], total: 0 };
    }

    const visibleData = options?.showTestProducts
      ? (data || [])
      : (data || []).filter((product: any) => !isTestProduct(product));
    // Like the ERP, preserve the server's exact count; local row filtering must
    // not make the total depend on which paginated slice happened to contain a test artifact.
    const total = count ?? 0;
    const categoryIds = Array.from(
      new Set(
        visibleData.flatMap((product: any) => getMobileProductListCategoryIds(product))
      )
    );
    const categoryNames = new Map<string, string>();
    if (categoryIds.length > 0) {
      try {
        const { data: categoryRows, error: categoryError } = await withAbortTimeout(
          supabase.from('categories').select('id, name').in('id', categoryIds),
          'mobile:category-names',
        );
        if (categoryError) throw categoryError;
        (categoryRows || []).forEach((category: any) => {
          categoryNames.set(String(category.id), category.name);
        });
      } catch {
        // O nome da categoria é enriquecimento; mantenha as linhas da consulta principal.
        console.warn(
          '[MobileProductService] Falha ao carregar nomes de categorias; usando fallback.'
        );
      }
    }

    if (options?.summaryOnly) {
      const summaries = mapMobileProductSummaries(
        visibleData,
        categoryNames,
        options?.includeMerged === true
      );

      const withCompositionAvailability = await applyMobileCompositionAvailability(summaries);
      return {
        data: await applyMobileTrashEligibility(withCompositionAvailability, options?.showTrash),
        total,
      };
    }

    const formatted = visibleData.map((p: any, productIndex: number) =>
      mapMobileProductRow(p, productIndex, categoryNames, options?.includeMerged === true)
    );

    const filteredFormatted =
      options?.includeMerged === true
        ? formatted
        : formatted.filter((prod: any) => !prod.isMerged);

    const withCompositionAvailability = await applyMobileCompositionAvailability(filteredFormatted);
    return {
      data: await applyMobileTrashEligibility(withCompositionAvailability, options?.showTrash),
      total,
    };
  } catch (err) {
    if (options?.throwOnError || isProductVariationSearchTooBroadError(err)) throw err;
    console.error('[MobileProductService] Exceção ao buscar produtos:', err);
    return { data: [], total: 0 };
  }
};
