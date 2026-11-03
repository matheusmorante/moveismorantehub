import { supabase } from '../../supabaseClient';
import { buildPostgrestAccentInsensitiveOrFilter } from '../../../../../shared-utils/searchText';
import { buildProductSearchTerms } from '../../../../../shared-utils/productListSearch';
import {
  inboundInvoiceCatalogSearchFormSchema,
  inboundInvoiceProductParentSearchFormSchema,
  inboundInvoiceProductSearchFormSchema,
  INBOUND_INVOICE_SEARCH_RESULT_LIMIT,
} from '../../../../../shared-utils/inboundProductLinkFormSchemas';
import { fetchMobileProductsPage } from '../../../features/products/services/mobileProductFetchService';

export const searchInboundInvoiceSuppliers = async (searchTerm: string) => {
  const { query: term } = inboundInvoiceCatalogSearchFormSchema.parse({ query: searchTerm });
  const { data, error } = await supabase
    .from('people')
    .select('id, full_name, social_name, nickname, cpf_cnpj')
    .or('deleted.eq.false,deleted.is.null')
    .or('person_type.ilike.suppliers,person_type.ilike.supplier')
    .or(buildPostgrestAccentInsensitiveOrFilter(
      ['full_name', 'social_name', 'nickname', 'cpf_cnpj'],
      term
    ))
    .order('full_name', { ascending: true })
    .limit(INBOUND_INVOICE_SEARCH_RESULT_LIMIT);
  if (error) throw error;
  return (data || []).slice(0, INBOUND_INVOICE_SEARCH_RESULT_LIMIT);
};

export const searchInboundInvoiceProducts = async (
  searchTerm: string,
  supplierId: string,
  excludedLinks: Array<{ productId: string; variationId?: string }> = [],
  itemType?: 'composition'
) => {
  const values = inboundInvoiceProductSearchFormSchema.parse({
    query: searchTerm,
    supplierId,
    excludedLinks,
    itemType,
  });
  const excluded = new Set(
    values.excludedLinks.map((link) => `${link.productId}:${link.variationId || ''}`)
  );
  const result = await fetchMobileProductsPage(
    1,
    INBOUND_INVOICE_SEARCH_RESULT_LIMIT + excluded.size,
    {
      search: values.query,
      supplierId: values.supplierId,
      statusFilter: 'active',
      itemType: values.itemType,
      includeMerged: false,
      throwOnError: true,
    }
  );
  const searchWords = buildProductSearchTerms(values.query).wordTerms;
  const normalize = (value: string) => value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLocaleLowerCase('pt-BR');

  return result.data.flatMap((parent: any) => {
    const variations = Array.isArray(parent.allVariations)
      ? parent.allVariations
      : Array.isArray(parent.variations)
        ? parent.variations
        : [];
    return variations.flatMap((variation: any) => {
      const productId = String(parent.id || '');
      const variationId = String(variation.id || '');
      if (
        !productId ||
        !variationId ||
        variation.active === false ||
        variation.isMerged ||
        variation.mergedToVariationId ||
        excluded.has(`${productId}:${variationId}`)
      ) return [];

      const name = String(variation.name || parent.name || '');
      const sku = String(variation.sku || parent.code || '');
      const normalizedName = normalize(name);
      const normalizedSku = normalize(sku);
      const matches = searchWords.every(({ value, alternative }) => {
        const terms = [value, alternative].filter(Boolean) as string[];
        return terms.some((word) =>
          normalizedName.includes(normalize(word)) || normalizedSku.includes(normalize(word))
        );
      });
      if (!matches) return [];

      return [{
        id: variationId,
        productId,
        variationId,
        name,
        sku,
        sellingPrice: Number(variation.unitPrice ?? variation.price ?? parent.unitPrice ?? 0),
      }];
    });
  })
    .sort((left: any, right: any) =>
      left.name.localeCompare(right.name, 'pt-BR', { sensitivity: 'base' }) ||
      left.sku.localeCompare(right.sku, 'pt-BR', { sensitivity: 'base' })
    )
    .slice(0, INBOUND_INVOICE_SEARCH_RESULT_LIMIT);
};

export const getInboundInvoiceProductById = async (
  productId: string,
  preferredVariationName?: string
) => {
  const { data: product, error: productError } = await supabase
    .from('products')
    .select(
      'id, name, code, unit_price, product_variations(id, product_id, name, sku, price, use_parent_price)'
    )
    .eq('id', productId)
    .single();
  if (productError) throw productError;
  const variations = Array.isArray(product.product_variations) ? product.product_variations : [];
  const variation = preferredVariationName
    ? variations.find(
        (candidate: any) => String(candidate.name || '').trim() === preferredVariationName.trim()
      ) || variations[variations.length - 1]
    : variations[0];
  return {
    id: String(variation?.id || product.id),
    productId: String(product.id),
    variationId: variation?.id ? String(variation.id) : undefined,
    name: variation?.name || product.name,
    sku: variation?.sku || product.code || '',
    sellingPrice:
      Number(
        variation?.use_parent_price ? product.unit_price : (variation?.price ?? product.unit_price)
      ) || 0,
  };
};

export const fetchInboundInvoiceProductDetails = async (
  links: Array<{ productId?: string; variationId?: string }>
) => {
  const normalizedLinks = links.filter((link) => link.productId || link.variationId);
  const storedVariationIds = [
    ...new Set(
      normalizedLinks
        .map((link) => link.variationId)
        .filter(Boolean)
        .map(String)
    ),
  ];
  const canonicalEntries = await Promise.all(
    storedVariationIds.map(async (variationId) => {
      const { data, error } = await supabase.rpc('resolve_canonical_variation_id', {
        p_variation_id: variationId,
      });
      if (error) throw error;
      return [variationId, String(data || variationId)] as const;
    })
  );
  const canonicalByStoredId = new Map(canonicalEntries);
  const canonicalVariationIds = [...new Set(canonicalEntries.map(([, id]) => id))];
  const { data: variations, error: variationsError } = canonicalVariationIds.length
    ? await supabase
        .from('product_variations')
      .select('id, product_id, name, sku, price, use_parent_price')
        .in('id', canonicalVariationIds)
    : { data: [], error: null };
  if (variationsError) throw variationsError;
  const variationById = new Map<string, any>(
    (variations || []).map((variation: any) => [String(variation.id), variation])
  );
  const parentIds = [
    ...new Set([
      ...normalizedLinks
        .map((link) => link.productId)
        .filter(Boolean)
        .map(String),
      ...(variations || []).map((variation: any) => String(variation.product_id)),
    ]),
  ];
  const { data: parents, error: parentsError } = parentIds.length
    ? await supabase.from('products').select('id, name, code, unit_price').in('id', parentIds)
    : { data: [], error: null };
  if (parentsError) throw parentsError;
  const parentById = new Map<string, any>(
    (parents || []).map((parent: any) => [String(parent.id), parent])
  );
  const result = new Map<string, any>();
  normalizedLinks.forEach((link) => {
    const variationId = link.variationId
      ? canonicalByStoredId.get(String(link.variationId)) || String(link.variationId)
      : undefined;
    const variation = variationById.get(variationId || '');
    const productId = String(variation?.product_id || link.productId || '');
    const parent = parentById.get(productId);
    if (!productId || !parent) return;
    const details = {
      productId,
      variationId: variation?.id ? String(variation.id) : undefined,
      name: variation?.name || parent.name || 'Produto vinculado',
      sku: variation?.sku || parent.code || '',
      sellingPrice:
        Number(
          variation?.use_parent_price ? parent.unit_price : (variation?.price ?? parent.unit_price)
        ) || 0,
    };
    result.set(`${productId}:${details.variationId || ''}`, details);
    result.set(`${String(link.productId || productId)}:${String(link.variationId || '')}`, details);
  });
  return result;
};

export const searchInboundInvoiceProductParents = async (searchTerm: string, supplierId: string) => {
  const { query: term, supplierId: ownerId } = inboundInvoiceProductParentSearchFormSchema.parse({
    query: searchTerm,
    supplierId,
  });
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, code, unit_price, cost_price, category, category_id, description, main_supplier_id, supplier_id, supplier_ids, has_variations, active, deleted, is_draft, product_variations(id, name, sku, price, cost_price, stock, status, active, attributes, images, combo_items, item_type)'
    )
    .eq('deleted', false)
    .eq('active', true)
    .not('is_draft', 'is', true)
    .filter('status', 'isdistinct', 'draft')
    .or(`supplier_id.eq.${ownerId},main_supplier_id.eq.${ownerId},supplier_ids.cs.{"${ownerId}"}`)
    .or(buildPostgrestAccentInsensitiveOrFilter(['name', 'code'], term))
    .order('name')
    .limit(INBOUND_INVOICE_SEARCH_RESULT_LIMIT);
  if (error) throw error;
  return data || [];
};

export const fetchInboundInvoiceProductForEdit = async (productId: string) => {
  const normalizedId = String(productId || '').trim();
  if (!normalizedId) throw new Error('Selecione um produto válido para editar.');
  const { data, error } = await supabase
    .from('products')
    .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
    .eq('id', normalizedId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;

  const variations = Array.isArray(data.product_variations) ? data.product_variations : [];
  const relationalImages = Array.isArray(data.product_images)
    ? [...data.product_images]
        .sort((left: any, right: any) => Number(Boolean(right.is_main)) - Number(Boolean(left.is_main)))
        .map((image: any) => image.image_url)
        .filter(Boolean)
    : [];
  return {
    ...data,
    allVariations: variations,
    variations,
    images: Array.isArray(data.images) && data.images.length ? data.images : relationalImages,
  };
};

export const fetchInboundInvoiceSupplierCatalog = async (supplierId: string) => {
  if (!supplierId) return [];
  const pageSize = 100;
  const rows: any[] = [];
  for (let from = 0; ; from += pageSize) {
    const { data, error } = await supabase
      .from('products')
      .select(
        'id, name, description, code, unit_price, product_variations(id, product_id, name, sku, price, use_parent_price, active)'
      )
      .eq('deleted', false)
      .eq('active', true)
      .not('is_draft', 'is', true)
      .or(
        `supplier_id.eq.${supplierId},main_supplier_id.eq.${supplierId},supplier_ids.cs.{"${supplierId}"}`
      )
      .order('id')
      .range(from, from + pageSize - 1);
    if (error) throw error;
    rows.push(...(data || []));
    if (!data || data.length < pageSize) break;
  }
  return rows.flatMap((parent: any) => {
    const variations = parent.product_variations || [];
    if (variations.length)
      return variations.map((variation: any) => ({
        id: String(variation.id),
        productId: String(parent.id),
        variationId: String(variation.id),
        name: String(variation.name || parent.name),
        comparisonName:
          `${String(parent.name || parent.description || '')} ${String(variation.name || '')}`.trim(),
        sku: variation.sku || parent.code || '',
        sellingPrice:
          Number(
            variation.use_parent_price ? parent.unit_price : (variation.price ?? parent.unit_price)
          ) || 0,
      }));
    return [
      {
        id: String(parent.id),
        productId: String(parent.id),
        name: String(parent.name || parent.description || ''),
        comparisonName: String(parent.name || parent.description || ''),
        sku: parent.code || '',
        sellingPrice: Number(parent.unit_price) || 0,
      },
    ];
  });
};
