import { supabase } from '../../supabaseClient';

export const searchInboundInvoiceSuppliers = async (searchTerm: string) => {
  const term = searchTerm.trim();
  if (term.length < 2) return [];
  const { data, error } = await supabase
    .from('people')
    .select('id, full_name, cpf_cnpj')
    .or('person_type.ilike.suppliers,person_type.ilike.supplier')
    .ilike('full_name', `%${term}%`)
    .limit(20);
  if (error) throw error;
  return data || [];
};

export const searchInboundInvoiceProducts = async (searchTerm: string) => {
  const term = searchTerm.trim();
  if (term.length < 2) return [];

  const [productsResult, variationsResult] = await Promise.all([
    supabase
      .from('products')
      .select('id, name, code, unit_price')
      .eq('deleted', false)
      .eq('active', true)
      .not('is_draft', 'is', true)
      .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
      .limit(10),
    supabase
      .from('product_variations')
      .select('id, product_id, name, sku, price, use_parent_price')
      .eq('active', true)
      .or(`name.ilike.%${term}%,sku.ilike.%${term}%`)
      .limit(10),
  ]);
  if (productsResult.error) throw productsResult.error;
  if (variationsResult.error) throw variationsResult.error;

  const matchingParentIds = [
    ...new Set((productsResult.data || []).map((product: any) => String(product.id))),
  ];
  const parentVariationsResult = matchingParentIds.length
    ? await supabase
        .from('product_variations')
        .select('id, product_id, name, sku, price, use_parent_price, active')
        .eq('active', true)
        .in('product_id', matchingParentIds)
        .limit(50)
    : { data: [], error: null };
  if (parentVariationsResult.error) throw parentVariationsResult.error;

  const variationById = new Map<string, any>();
  [...(variationsResult.data || []), ...(parentVariationsResult.data || [])].forEach(
    (variation: any) => {
      variationById.set(String(variation.id), variation);
    }
  );
  const variations = [...variationById.values()];
  const parentById = new Map<string, any>(
    (productsResult.data || []).map((parent: any) => [String(parent.id), parent])
  );
  const parentIds = [...new Set(variations.map((variation: any) => String(variation.product_id)))];
  const missingParentIds = parentIds.filter((parentId) => !parentById.has(parentId));
  const { data: parents, error: parentsError } = missingParentIds.length
    ? await supabase
        .from('products')
        .select('id, name, code, unit_price')
        .eq('deleted', false)
        .eq('active', true)
        .not('is_draft', 'is', true)
        .in('id', missingParentIds)
    : { data: [], error: null };
  if (parentsError) throw parentsError;

  (parents || []).forEach((parent: any) => parentById.set(String(parent.id), parent));
  return variations
    .flatMap((variation: any) => {
      const parent = parentById.get(String(variation.product_id));
      if (!parent) return [];
      return [
        {
          id: String(variation.id),
          productId: String(variation.product_id),
          variationId: String(variation.id),
          name: variation.name || parent.name,
          sku: variation.sku || parent.code || '',
          sellingPrice: Number(
            variation.use_parent_price ? parent.unit_price || 0 : variation.price || 0
          ),
        },
      ];
    })
    .slice(0, 20);
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

export const searchInboundInvoiceProductParents = async (searchTerm: string) => {
  const term = searchTerm.trim();
  if (term.length < 2) return [];
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, code, unit_price, cost_price, category, category_id, description, main_supplier_id, supplier_id, supplier_ids, has_variations, active, deleted, is_draft, product_variations(id, name, sku, price, cost_price, stock, status, active, attributes, images, combo_items, item_type)'
    )
    .eq('deleted', false)
    .eq('active', true)
    .not('is_draft', 'is', true)
    .or(`name.ilike.%${term}%,code.ilike.%${term}%`)
    .order('name')
    .limit(20);
  if (error) throw error;
  return data || [];
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
