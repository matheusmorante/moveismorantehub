import { restoreProductDraftSnapshot } from '../../../../../shared-utils/productDraftSnapshot';
import { isTestProduct } from '../../../../../shared-utils/isTestProduct';
import { calculateCompositionAvailability } from '../../../../../shared-utils/compositionMath';
import { resolveProductUnitPrice } from '../../../../../shared-utils/productUnitPrice';
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
import { parseVariationImages } from '../../../../../shared-utils/productVariationImages';
import { toTitleCase } from '../../../../../shared-utils/productText';
import { parseProductVariationAttributes } from '../../../../../shared-utils/productVariationAttributes';
import { resolveProductVariationSku } from '../../../../../shared-utils/productVariationSku';
import { getMobileProductVariationRecords } from '../domain/mobileProductVariationVisibility';
import { resolveMobileProductHasVariations } from '../domain/mobileProductVariationMode';
import { parseLocalizedNumber } from '../domain/productNumbers';
import {
  getMobileProductListCategoryIds,
  getMobileProductListCategoryLabel,
} from '../domain/mobileProductListPresentation';

export interface MobileProductFilterOptions {
  productId?: string;
  search?: string;
  category?: string;
  statusFilter?: 'all' | 'active' | 'disabled' | 'draft';
  catalogStatus?: 'all' | 'published' | 'hidden';
  includeDeactivated?: boolean;
  excludeDraftsDuringSearch?: boolean;
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

const mapMobileVariationAttributes = (rawAttributes: unknown) =>
  parseProductVariationAttributes(rawAttributes, { preserveStructuredShowName: true }).map(
    (attribute) => ({
      ...attribute,
      name: toTitleCase(attribute.name),
      value: toTitleCase(attribute.value),
    })
  );

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

const applyMobileCompositionAvailability = async (products: any[]) => {
  const compositions = products.filter((product) => product.itemType === 'composition');
  if (!compositions.length) return products;

  const unavailable = () =>
    products.map((product) =>
      product.itemType === 'composition'
        ? {
            ...product,
            stock: 0,
            variations: product.variations?.map((variation: any) => ({ ...variation, stock: 0 })),
            allVariations: product.allVariations?.map((variation: any) => ({ ...variation, stock: 0 })),
          }
        : product
    );
  const componentIds = Array.from(
    new Set(
      compositions
        .flatMap((product) => [
          ...(product.comboItems || []),
          ...(product.variations || []).flatMap((variation: any) => variation.comboItems || []),
        ])
        .map((item: any) => String(item.productId || item.product_id || '').trim())
        .filter(Boolean)
    )
  );
  if (!componentIds.length) return unavailable();

  const lookup = await withAbortTimeout(
    supabase
      .from('products')
      .select('id, stock, product_variations(id, stock)')
      .in('id', componentIds),
    'mobile:saldo-produtos-compostos'
  ).then((result) => ({ result })).catch(() => null);
  if (!lookup || lookup.result.error) {
    console.warn('[MobileProductService] Não foi possível consultar o estoque atual dos componentes.');
    return unavailable();
  }

  const currentComponents = new Map<string, { stock: number; variations: Map<string, number> }>();
  for (const row of lookup.result.data || []) {
    currentComponents.set(String(row.id), {
      stock: Number(row.stock) || 0,
      variations: new Map(
        (row.product_variations || []).map((variation: any) => [
          String(variation.id),
          Number(variation.stock) || 0,
        ])
      ),
    });
  }

  const availabilityFor = (items: any[] | undefined): number => {
    if (!items?.length) return 0;
    const requirements = new Map<string, { currentStock: number; quantityNeeded: number }>();
    for (const item of items) {
      const productId = String(item.productId || item.product_id || '');
      const variationId = item.variationId || item.variation_id;
      const component = currentComponents.get(productId);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return 0;
      const currentStock = variationId
        ? component?.variations.get(String(variationId)) ?? 0
        : component?.stock ?? 0;
      const key = `${productId}:${variationId || ''}`;
      const existing = requirements.get(key);
      requirements.set(key, {
        currentStock,
        quantityNeeded: (existing?.quantityNeeded || 0) + quantity,
      });
    }
    return calculateCompositionAvailability(Array.from(requirements.values()));
  };

  return products.map((product) => {
    if (product.itemType !== 'composition') return product;
    const rootItems = product.comboItems || [];
    const hasVariationComposition = (product.variations || []).some(
      (variation: any) => Boolean(variation.comboItems?.length)
    );
    const variations = product.variations?.map((variation: any) => ({
      ...variation,
      stock: availabilityFor(variation.comboItems?.length ? variation.comboItems : rootItems),
    }));
    const stock = hasVariationComposition
      ? (variations || []).reduce((total: number, variation: any) => total + (Number(variation.stock) || 0), 0)
      : availabilityFor(rootItems);
    const variationStocks = new Map(
      (variations || []).map((variation: any) => [String(variation.id || variation.sku), variation.stock])
    );
    return {
      ...product,
      stock,
      variations,
      allVariations: product.allVariations?.map((variation: any) => ({
        ...variation,
        stock: variationStocks.get(String(variation.id || variation.sku)) ?? variation.stock,
      })),
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
    } else if (!options?.showTrash && options?.excludeDraftsDuringSearch) {
      query = query
        .not('is_draft', 'is', true)
        .filter('status', 'isdistinct', 'draft');
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
      const summaries = visibleData
        .filter((product: any) => {
          if (options?.includeMerged === true) return true;
          const rawVars = getMobileProductVariationRecords(product, true);
          const isMerged =
            rawVars.length > 0 &&
            rawVars.every((v: any) => Boolean(v.merged_to_variation_id || v.mergedToVariationId));
          return !isMerged;
        })
        .map((product: any, productIndex: number) => {
          const parentCode =
            product.sku || product.code || String(productIndex + 1).padStart(6, '0');
          let variations = getMobileProductVariationRecords(
            product,
            options?.includeMerged === true
          )
            .map((variation: any, variationIndex: number) => ({
              id: variation.id,
              sku: resolveProductVariationSku(variation.sku, parentCode, variationIndex),
              active: variation.active !== false,
              stock: Number(variation.stock ?? 0),
              comboItems: Array.isArray(variation.combo_items) ? variation.combo_items : [],
            }));

        if (
          variations.length === 0 &&
          (product.product_variations || []).length === 0 &&
          (!product.item_type || product.item_type === 'product')
        ) {
          variations = [{
            id: `virtual-${String(product.id || parentCode)}`,
            sku: `${parentCode}-01`,
            active: Boolean(product.active),
            stock: Number(product.stock ?? 0),
            comboItems: [],
          }];
        }

        const isDraft = Boolean(product.is_draft || product.status === 'draft');
        const activeVariationCount = variations.filter(
          (variation: any) => variation.active !== false
        ).length;
        return {
          id: product.id,
          code: product.code,
          name: product.name,
          description: product.description,
          category: getMobileProductListCategoryLabel(product, categoryNames),
          brand: product.brand,
          condition: product.condition,
          price: product.price,
          unitPrice: resolveProductUnitPrice(product),
          promoPrice: Number(product.promo_price ?? 0),
          costPrice: Number(product.cost_price ?? 0),
          stock: Number(product.stock ?? 0),
          unit: product.unit,
          active: isDraft
            ? false
            : variations.length > 0
              ? activeVariationCount > 0
              : Boolean(product.active),
          status: product.status,
          itemType: product.item_type || 'product',
          isDraft,
          deleted: Boolean(product.deleted),
          comboItems: Array.isArray(product.combo_items) ? product.combo_items : [],
          variations,
          allVariations: variations.map((variation: any) => ({
            id: variation.id,
            sku: variation.sku,
            stock: variation.stock,
          })),
        };
      });

      const withCompositionAvailability = await applyMobileCompositionAvailability(summaries);
      return {
        data: await applyMobileTrashEligibility(withCompositionAvailability, options?.showTrash),
        total,
      };
    }

    const formatted = visibleData.map((p: any, productIndex: number) => {
      const parentCode = p.sku || p.code || String(productIndex + 1).padStart(6, '0');
      const orderedImageRows = Array.isArray(p.product_images)
        ? [...p.product_images].sort(
            (a: any, b: any) => Number(Boolean(b.is_main)) - Number(Boolean(a.is_main))
          )
        : [];
      const relationImages = orderedImageRows.map((image: any) => image.image_url).filter(Boolean);
      const productImages =
        relationImages.length > 0
          ? relationImages
          : parseVariationImages(undefined, p.images);

      const storedVariations = p.product_variations || [];
      const productVariationRecords = getMobileProductVariationRecords(p, true);
      const variationDetailsById = new Map<string, any>(
        (Array.isArray(p.technical_specs?.variationDetails)
          ? p.technical_specs.variationDetails
          : [])
          .filter((variation: any) => variation?.id)
          .map((variation: any): [string, any] => [String(variation.id), variation])
      );
      const visibleStoredVariations = getMobileProductVariationRecords(
        p,
        options?.includeMerged === true
      );
      const isParentMerged =
        productVariationRecords.length > 0 &&
        productVariationRecords.every((v: any) => Boolean(v.merged_to_variation_id || v.mergedToVariationId));

      let allVars: any[] = visibleStoredVariations.map((v: any, vIdx: number) => {
          const {
            discountPercent: _legacyDiscountPercent,
            discountFixed: _legacyDiscountFixed,
            ...details
          } = variationDetailsById.get(String(v.id)) || {};
          const varImages = parseVariationImages(v.image_url, v.images);

          const resolvedSku = resolveProductVariationSku(v.sku, parentCode, vIdx);

          const syncUnitPrice = v.use_parent_price !== false;
          const syncPromoPrice = v.use_parent_promo_price !== false;
          const syncDescription = v.use_parent_description !== false;
          const syncWidth = details.syncWidth ?? v.use_parent_dimensions !== false;
          const syncHeight = details.syncHeight ?? v.use_parent_dimensions !== false;
          const syncDepth = details.syncDepth ?? v.use_parent_dimensions !== false;
          const syncWeight = details.syncWeight ?? v.use_parent_dimensions !== false;
          const syncCostPrice = details.syncCostPrice !== false;
          const syncFiscal = details.syncFiscal !== false;
          const syncIpi = details.syncIpi !== false;
          const syncFreight = details.syncFreight !== false;
          const variationPrice = syncUnitPrice
            ? resolveProductUnitPrice(p)
            : Number(v.price ?? 0);
          const variationPromoPrice = syncPromoPrice
            ? p.promo_price === null || p.promo_price === undefined
              ? undefined
              : Number(p.promo_price)
            : v.promo_price === null || v.promo_price === undefined
              ? undefined
              : Number(v.promo_price);

          return {
            ...details,
            ...v,
            sku: resolvedSku,
            name: visibleStoredVariations.length <= 1 && v.use_parent_name === true ? p.name : v.name || p.name,
            stock: Number(v.stock ?? 0),
            price: variationPrice,
            promo_price: variationPromoPrice,
            unitPrice: variationPrice,
            promoPrice: variationPromoPrice,
            costPrice: syncCostPrice
              ? Number(p.cost_price ?? 0)
              : Number(v.cost_price ?? details.costPrice ?? 0),
            condition: details.syncCondition === false ? details.condition || p.condition || 'novo' : p.condition || 'novo',
            description: syncDescription ? p.description || '' : v.description || details.description || '',
            fiscal: syncFiscal ? p.fiscal : details.fiscal,
            ipiPercent: syncIpi ? Number(p.ipi_percent ?? 0) : Number(details.ipiPercent ?? 0),
            freightCost: syncFreight ? Number(p.freight_cost ?? 0) : Number(details.freightCost ?? 0),
            freightType: syncFreight ? p.freight_type || 'fixed' : details.freightType || 'fixed',
            syncUnitPrice,
            syncPromoPrice,
            syncCostPrice,
            syncDescription,
            syncName: details.syncName ?? v.use_parent_name !== false,
            syncCondition: details.syncCondition !== false,
            syncFiscal,
            syncIpi,
            syncFreight,
            syncWidth,
            syncHeight,
            syncDepth,
            syncWeight,
            width: syncWidth ? Number(p.width || 0) : v.width ? Number(v.width) : details.width,
            height: syncHeight ? Number(p.height || 0) : v.height ? Number(v.height) : details.height,
            depth: syncDepth ? Number(p.depth || 0) : v.depth ? Number(v.depth) : details.depth,
            weight: syncWeight ? Number(p.weight || 0) : Number(details.weight || 0),
            status: v.status || p.status || 'published',
            active: v.active !== false,
            images: varImages,
            comboItems: Array.isArray(v.combo_items) ? v.combo_items : [],
            attributes: mapMobileVariationAttributes(v.attributes),
            isMerged: Boolean(v.merged_to_variation_id || v.mergedToVariationId),
            mergedToVariationId: v.merged_to_variation_id || v.mergedToVariationId || null,
          };
        });

      // LÓGICA OFICIAL DO ERP (productService.ts):
      // Todo produto do tipo 'product' que não possui variações na tabela product_variations
      // gera a variação padrão filha com o código parentCode-01 e as fotos/preços do produto!
      const isProductItem = !p.item_type || p.item_type === 'product';
      if (storedVariations.length === 0 && allVars.length === 0 && isProductItem) {
        allVars = [
          {
            id: `${p.id}_${parentCode}-01`,
            isVirtual: true,
            sku: `${parentCode}-01`,
            name: p.name || 'Padrão',
            stock: Number(p.stock ?? 0),
            price: resolveProductUnitPrice(p),
            promo_price:
              p.promo_price !== null && p.promo_price !== undefined
                ? Number(p.promo_price)
                : undefined,
            cost_price: Number(p.cost_price ?? 0),
            active: Boolean(p.active),
            status: p.status || 'published',
            attributes: {},
            images: [],
          },
        ];
      }

      const activeVariationsCount = allVars.filter(
        (variation: any) => variation.active !== false
      ).length;
      const totalVariationsCount = allVars.length || 1;
      const parentActive = allVars.length > 0 ? activeVariationsCount > 0 : Boolean(p.active);
      const isParent = isProductItem || Boolean(p.has_variations || allVars.length > 0);

      const baseProduct = {
        ...p,
        category: getMobileProductListCategoryLabel(
          p,
          categoryNames,
          p.category || p.category_name || ''
        ),
        allVariations: allVars,
        images: productImages,
        comboItems: Array.isArray(p.combo_items) ? p.combo_items : [],
        variableTechnicalFields: Array.isArray(p.technical_specs?.variableTechnicalFields)
          ? p.technical_specs.variableTechnicalFields
          : undefined,
        unitPrice: resolveProductUnitPrice(p),
        promoPrice: Number(p.promo_price ?? 0),
        costPrice: Number(p.cost_price ?? 0),
        stock: Number(p.stock ?? 0),
        active: parentActive,
        activeVariationsCount,
        totalVariationsCount,
        isParent,
        isCombo: Boolean(p.is_combo),
        itemType: p.item_type || 'product',
        isDraft: Boolean(p.is_draft || p.status === 'draft'),
        variations: allVars,
        technicalSpecs: p.technical_specs || {},
        mainSupplierId: p.main_supplier_id || p.supplier_id || null,
        supplierId: p.supplier_id || p.main_supplier_id || null,
        supplierIds: Array.isArray(p.supplier_ids)
          ? p.supplier_ids
          : p.supplier_id
            ? [p.supplier_id]
            : p.main_supplier_id
              ? [p.main_supplier_id]
              : [],
      };
      const restoredProduct = restoreProductDraftSnapshot(baseProduct);
      const restoredVariations = Array.isArray(restoredProduct.variations)
        ? restoredProduct.variations.map((variation: any, variationIndex: number) => {
            const fallbackSku = `${parentCode}-${String(variationIndex + 1).padStart(2, '0')}`;
            const price = parseLocalizedNumber(
              variation.price ??
                variation.unit_price ??
                variation.unitPrice ??
                restoredProduct.unitPrice ??
                resolveProductUnitPrice(p)
            );
            const promoPrice = variation.promo_price ?? variation.promoPrice;
            return {
              ...variation,
              sku: variation.sku || fallbackSku,
              price,
              unitPrice: parseLocalizedNumber(variation.unitPrice ?? price),
              promo_price: promoPrice,
              promoPrice:
                promoPrice === null || promoPrice === undefined
                  ? undefined
                  : parseLocalizedNumber(promoPrice),
              stock: parseLocalizedNumber(variation.stock ?? 0),
              active: variation.active !== false,
              status: variation.status || restoredProduct.status || 'published',
              images: Array.isArray(variation.images) ? variation.images : [],
            };
          })
        : [];
      const normalizedRestoredVariations = !restoredProduct.isDraft && restoredVariations.length === 1
        ? [{ ...restoredVariations[0], images: [...productImages] }]
        : restoredVariations;
      const restoredActiveVariationsCount = normalizedRestoredVariations.filter(
        (variation: any) => variation.active !== false
      ).length;
      const itemType = restoredProduct.itemType || p.item_type || 'product';
      const isDraft = Boolean(restoredProduct.isDraft || p.is_draft || p.status === 'draft');
      const hasVariations = resolveMobileProductHasVariations({
        itemType,
        isDraft,
        hasVariations: restoredProduct.hasVariations ?? p.has_variations,
        variations: normalizedRestoredVariations,
      });

      return {
        ...restoredProduct,
        deleted: Boolean(restoredProduct.deleted ?? p.deleted),
        allVariations: normalizedRestoredVariations,
        variations: normalizedRestoredVariations,
        hasVariations,
        comboItems: Array.isArray(restoredProduct.comboItems)
          ? restoredProduct.comboItems
          : Array.isArray(p.combo_items)
            ? p.combo_items
            : [],
        variableTechnicalFields:
          restoredProduct.variableTechnicalFields ?? baseProduct.variableTechnicalFields,
        unitPrice: parseLocalizedNumber(restoredProduct.unitPrice ?? resolveProductUnitPrice(p)),
        promoPrice: parseLocalizedNumber(restoredProduct.promoPrice ?? p.promo_price ?? 0),
        costPrice: parseLocalizedNumber(restoredProduct.costPrice ?? p.cost_price ?? 0),
        stock: parseLocalizedNumber(restoredProduct.stock ?? p.stock ?? 0),
        active: restoredProduct.isDraft
          ? false
          : normalizedRestoredVariations.length > 0
            ? restoredActiveVariationsCount > 0
            : Boolean(p.active),
        activeVariationsCount: restoredActiveVariationsCount,
        totalVariationsCount: normalizedRestoredVariations.length || 1,
        isParent: Boolean(
          restoredProduct.isParent || isProductItem || hasVariations
        ),
        itemType,
        isDraft,
        isMerged: isParentMerged,
        hasAnyMergedVariation: storedVariations.some((v: any) =>
          Boolean(v.merged_to_variation_id || v.mergedToVariationId)
        ),
        mainSupplierId:
          restoredProduct.mainSupplierId || p.main_supplier_id || p.supplier_id || null,
        supplierId: restoredProduct.supplierId || p.supplier_id || p.main_supplier_id || null,
        supplierIds: restoredProduct.supplierIds || baseProduct.supplierIds,
      };
    });

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
