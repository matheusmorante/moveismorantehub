import { reconciliationQueryFormSchema } from './reconciliationFormSchemas';

import {
  ReconciliationProductItem,
  ReconciliationFilterState,
  ReconciliationSummary,
  RequiredCategoryAttribute,
  ReconciliationBatchSelectionItem,
} from './productReconciliationTypes';
import { detectProductPendencies, calculateReconciliationSummary } from './productReconciliation';
import {
  createProductVariationSearchTooBroadError,
  PRODUCT_VARIATION_SEARCH_MATCH_LIMIT,
} from './productListSearch';

const applyProductReconciliationSqlFilters = (
  query: any,
  filters: ReconciliationFilterState,
  variationSkuParentIds: readonly string[] = []
) => {
  query = query.eq('item_type', 'product').eq('is_variation', false).eq('deleted', false);
  if (filters.supplierId) {
    query = query.or(
      `main_supplier_id.eq.${filters.supplierId},supplier_id.eq.${filters.supplierId},supplier_ids.cs.{"${filters.supplierId}"}`
    );
  }
  if (filters.categoryId) query = query.eq('category_id', filters.categoryId);
  if (filters.search) {
    const safe = filters.search.replace(/"/g, '').trim();
    if (safe) {
      const search = `%${safe}%`;
      const searchConditions = [`name.ilike."${search}"`, `code.ilike."${search}"`];
      if (variationSkuParentIds.length > 0) {
        searchConditions.push(`id.in.(${variationSkuParentIds.join(',')})`);
      }
      query = query.or(searchConditions.join(','));
    }
  }
  if (filters.pendencyType === 'supplier') query = query.is('main_supplier_id', null).is('supplier_id', null);
  else if (filters.pendencyType === 'category') query = query.is('category_id', null);
  return query.order('name', { ascending: true });
};

const fetchVariationSkuParentIds = async (client: any, search?: string): Promise<string[]> => {
  const safeSearch = search?.replace(/"/g, '').trim();
  if (!safeSearch) return [];

  const { data, error } = await client
    .from('product_variations')
    .select('product_id')
    .ilike('sku', `%${safeSearch}%`)
    .limit(PRODUCT_VARIATION_SEARCH_MATCH_LIMIT + 1);

  if (error) throw error;
  if (!Array.isArray(data)) return [];
  if (data.length > PRODUCT_VARIATION_SEARCH_MATCH_LIMIT) {
    throw createProductVariationSearchTooBroadError();
  }

  return Array.from(new Set(data.map((variation: any) => variation?.product_id).filter(Boolean)));
};

const matchesProductReconciliationFilters = (
  pendencies: ReconciliationProductItem['pendencies'],
  filters: ReconciliationFilterState
) => {
  if (filters.pendencyType && filters.pendencyType !== 'all') {
    if (filters.pendencyType === 'attributes') {
      if (!pendencies.some((pendency) => pendency.type === 'category_attribute' || pendency.type === 'incomplete_attribute')) return false;
    } else if (!pendencies.some((pendency) => pendency.type === filters.pendencyType)) {
      return false;
    }
  }
  return !filters.onlyCritical || pendencies.some((pendency) => pendency.isCritical);
};

const mapReconciliationVariation = (variation: any): ReconciliationProductItem['variations'][number] => {
  let attributes = variation.attributes;
  if (typeof attributes === 'string') {
    try {
      attributes = JSON.parse(attributes);
    } catch {
      throw new Error('Os atributos da variação ' + variation.id + ' possuem JSON inválido. Revise o cadastro antes de editar.');
    }
  }
  if (attributes == null) attributes = [];
  if (!Array.isArray(attributes)) throw new Error('Os atributos da variação precisam de revisão antes de editar.');
  return {
    id: variation.id,
    sku: variation.sku || '',
    name: variation.name || '',
    price: variation.price ? Number(variation.price) : undefined,
    useParentPrice: variation.use_parent_price !== false,
    active: variation.active !== false,
    attributes: attributes.map((attribute: any) => ({
      ...attribute,
      name: attribute.name || attribute.attribute_name || attribute.key || '',
      value: String(attribute.value ?? attribute.option ?? ''),
      showName: attribute.showName ?? true,
    })),
  };
};

/**
 * Busca todos os atributos que foram configurados como obrigatórios por categoria
 */
export async function fetchRequiredCategoryAttributesWithClient(client: any, isWeightCharacteristicName: (name: string) => boolean): Promise<RequiredCategoryAttribute[]> {
  const { data, error } = await client.from('category_attributes').select('category_id, attribute_id, is_required, attributes (id, name, data_type, unit)').eq('is_required', true);
  if (error) throw error;
  return (data || []).flatMap((row: any) => {
    const attribute = Array.isArray(row.attributes) ? row.attributes[0] : row.attributes;
    if (isWeightCharacteristicName(attribute?.name || '')) return [];
    return [{ categoryId: row.category_id, attributeId: row.attribute_id, isRequired: Boolean(row.is_required),
      attribute: attribute ? { id: attribute.id, name: attribute.name, data_type: attribute.data_type || 'list', unit: attribute.unit || undefined } : undefined }];
  });
}

/**
 * Consulta de produtos para conciliação com filtros dinâmicos e paginação.
 */
export async function fetchProductsForReconciliationWithClient(
  client: any,
  isWeightCharacteristicName: (name: string) => boolean,
  page: number = 1,
  pageSize: number = 15,
  filters: ReconciliationFilterState = {}
): Promise<{
  data: ReconciliationProductItem[];
  count: number;
  summary: ReconciliationSummary;
}> {
  const values = reconciliationQueryFormSchema.parse({ page, pageSize, filters });
  page = values.page; pageSize = values.pageSize; filters = values.filters;
  const requiredCategoryAttrs = await fetchRequiredCategoryAttributesWithClient(client, isWeightCharacteristicName);
  const variationSkuParentIds = await fetchVariationSkuParentIds(client, filters.search);

  let query = client.from('products').select(
    `
            id,
            code,
            name,
            description,
            category,
            category_id,
            main_supplier_id,
            supplier_id,
            supplier_ids,
            price,
            fiscal,
            product_categories (
                category_id,
                categories ( id, name )
            ),
            product_variations (
                id,
                sku,
                name,
                price,
                use_parent_price,
                attributes,
                active,
                status
            )
        `,
    { count: 'exact' }
  );

  query = applyProductReconciliationSqlFilters(query, filters, variationSkuParentIds);

  // Se houver filtro específico de fornecedor/categoria que o banco já filtra 100%,
  // podemos usar a paginação direta no banco.
  // Para filtros mais abrangentes (que dependem de atributos de variações/NCM JSONB),
  // buscamos uma janela ampla ou processamos de forma eficiente.
  const from = (page - 1) * pageSize;
  const to = from + pageSize * 3 - 1; // Busca janela com folga para filtrar pendências

  query = query.range(from, to);

  const { data: rawData, error, count: rawCount } = await query;
  if (error) throw error;

  const rawProducts = (rawData as any[]) || [];

  // Carregar fornecedores associados
  const supplierIds = new Set<string>();
  rawProducts.forEach((p) => {
    if (p.main_supplier_id) supplierIds.add(p.main_supplier_id);
    if (p.supplier_id) supplierIds.add(p.supplier_id);
  });

  const peopleMap = new Map<string, { fullName: string; tradeName?: string }>();
  if (supplierIds.size > 0) {
    const { data: peopleData, error: peopleError } = await client
      .from('people')
      .select('id, full_name, social_name, nickname')
      .in('id', Array.from(supplierIds));

    if (peopleError) throw peopleError;
    if (peopleData) {
      peopleData.forEach((p: any) => {
        peopleMap.set(p.id, {
          fullName: p.nickname || p.full_name || '',
          tradeName: p.social_name || '',
        });
      });
    }
  }

  // Processar produtos e detectar pendências
  const processedProducts: ReconciliationProductItem[] = rawProducts.map((raw) => {
    const effectiveSupplierId = raw.main_supplier_id || raw.supplier_id;
    const people = effectiveSupplierId ? peopleMap.get(effectiveSupplierId) : null;

    const categoryNames: string[] = (raw.product_categories || [])
      .map((pc: any) => pc.categories?.name)
      .filter(Boolean);

    const categoryIds: string[] = (raw.product_categories || [])
      .map((pc: any) => pc.category_id)
      .filter(Boolean);

    if (raw.category_id && !categoryIds.includes(raw.category_id)) {
      categoryIds.push(raw.category_id);
    }

    const variations: ReconciliationProductItem['variations'] = (raw.product_variations || []).map(mapReconciliationVariation);

    const productBase = {
      id: raw.id,
      code: raw.code,
      sku: raw.sku || raw.code,
      name: raw.name || raw.description || '',
      category: raw.category || (categoryNames.length > 0 ? categoryNames.join(' | ') : ''),
      categoryId: raw.category_id,
      categoryIds,
      mainSupplierId: raw.main_supplier_id,
      supplierId: raw.supplier_id,
      supplierIds: raw.supplier_ids || [],
      people,
      price: raw.price ? Number(raw.price) : undefined,
      fiscal: raw.fiscal || {},
      variations,
    };

    const { pendencies, variationsWithPendencies, hasParentPendencies, hasVariationPendencies } =
      detectProductPendencies(productBase, requiredCategoryAttrs);

    return {
      ...productBase,
      variations: variations.map((v) => {
        const withP = variationsWithPendencies.find((vp) => vp.id === v.id);
        return withP ? { ...v, pendencies: withP.pendencies } : v;
      }),
      pendencies,
      hasParentPendencies,
      hasVariationPendencies,
    };
  });

  // Filtrar apenas produtos que de fato possuem pendências
  const pendingProducts = processedProducts.filter(
    (product) => product.pendencies.length > 0 && matchesProductReconciliationFilters(product.pendencies, filters)
  );

  // Calcula o resumo sobre todos os produtos pendentes encontrados
  const summary = calculateReconciliationSummary(pendingProducts);

  // Aplica a fatia da página solicitada
  const paginatedProducts = pendingProducts.slice(0, pageSize);
  const totalCount =
    rawCount !== null ? Math.max(pendingProducts.length, rawCount) : pendingProducts.length;

  return {
    data: paginatedProducts,
    count: totalCount,
    summary,
  };
}

/** Resolves the complete filtered selection without treating a paginated window as the whole result. */
export async function fetchProductReconciliationSelectionWithClient(
  client: any,
  isWeightCharacteristicName: (name: string) => boolean,
  filters: ReconciliationFilterState = {}
): Promise<ReconciliationBatchSelectionItem[]> {
  const values = reconciliationQueryFormSchema.parse({ page: 1, pageSize: 15, filters });
  const selectedFilters = values.filters;
  const requiredCategoryAttrs = await fetchRequiredCategoryAttributesWithClient(client, isWeightCharacteristicName);
  const variationSkuParentIds = await fetchVariationSkuParentIds(client, selectedFilters.search);
  const chunkSize = 500;
  const selectedProducts: ReconciliationBatchSelectionItem[] = [];
  const select = `
    id,
    name,
    category_id,
    main_supplier_id,
    supplier_id,
    supplier_ids,
    price,
    fiscal,
    product_categories ( category_id ),
    product_variations ( id, sku, name, price, use_parent_price, attributes, active, status )
  `;

  for (let offset = 0; ; offset += chunkSize) {
    const query = applyProductReconciliationSqlFilters(
      client.from('products').select(select, { count: 'exact' }),
      selectedFilters,
      variationSkuParentIds
    );
    const { data, error } = await query
      .order('id', { ascending: true })
      .range(offset, offset + chunkSize - 1);
    if (error) throw error;
    if (!Array.isArray(data) || data.length === 0) break;

    data.forEach((raw: any) => {
      const categoryIds = Array.from(new Set([
        ...(raw.product_categories || []).map((link: any) => link.category_id).filter(Boolean),
        ...(raw.category_id ? [raw.category_id] : []),
      ]));
      const productBase = {
        id: raw.id,
        name: raw.name || '',
        categoryId: raw.category_id || undefined,
        categoryIds,
        mainSupplierId: raw.main_supplier_id || undefined,
        supplierId: raw.supplier_id || undefined,
        supplierIds: raw.supplier_ids || [],
        price: raw.price ? Number(raw.price) : undefined,
        fiscal: raw.fiscal || {},
        variations: (raw.product_variations || []).map(mapReconciliationVariation),
      };
      const detected = detectProductPendencies(productBase, requiredCategoryAttrs);
      if (!detected.pendencies.length || !matchesProductReconciliationFilters(detected.pendencies, selectedFilters)) return;
      selectedProducts.push({ id: raw.id, categoryId: raw.category_id || undefined, pendencies: detected.pendencies });
    });

    if (data.length < chunkSize) break;
  }

  return selectedProducts;
}
