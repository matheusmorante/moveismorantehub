import { supabase } from './supabaseConfig';
import { isValidUuid } from './uuidUtils';

export type ProductSupplierCode = {
  productId: string;
  productVariationId?: string;
  supplierId: string;
  supplierProductCode: string;
  supplierDescription?: string;
  normalizedDescription?: string;
  confirmedByUser?: boolean;
};

const normalizeSupplierProductCode = (value: string) => value.trim().toLocaleUpperCase('pt-BR');

export const findProductSupplierCodes = async (supplierId: string, supplierCodes: string[]) => {
  const codes = [...new Set(supplierCodes.map(normalizeSupplierProductCode).filter(Boolean))];
  if (!supplierId || !codes.length) return new Map<string, ProductSupplierCode>();

  const { data, error } = await supabase
    .from('product_supplier_codes')
    .select(
      'product_id, product_variation_id, supplier_id, supplier_product_code, supplier_description'
    )
    .eq('supplier_id', supplierId)
    .eq('is_active', true)
    .in('supplier_product_code', codes);

  if (error) throw error;

  // A referência do fornecedor continua guardando a variação original. Para
  // novos recebimentos e movimentações, porém, usamos a canônica quando a
  // original já foi fundida. Assim o histórico não é reescrito.
  const rows = data || [];
  const originalVariationIds = [
    ...new Set(
      rows
        .map((row) => row.product_variation_id)
        .filter((id): id is string => Boolean(id && isValidUuid(id)))
    ),
  ];
  const canonicalVariationByOriginal = new Map<string, string>();

  await Promise.all(
    originalVariationIds.map(async (originalVariationId) => {
      const { data: canonicalVariationId, error: resolutionError } = await supabase.rpc(
        'resolve_canonical_variation_id',
        { p_variation_id: originalVariationId }
      );

      if (resolutionError) throw resolutionError;
      canonicalVariationByOriginal.set(
        originalVariationId,
        canonicalVariationId || originalVariationId
      );
    })
  );

  const canonicalVariationIds = [...new Set(canonicalVariationByOriginal.values())];
  const productIdByCanonicalVariation = new Map<string, string>();

  if (canonicalVariationIds.length) {
    const { data: canonicalVariations, error: variationsError } = await supabase
      .from('product_variations')
      .select('id, product_id')
      .in('id', canonicalVariationIds);

    if (variationsError) throw variationsError;

    for (const variation of canonicalVariations || []) {
      if (variation.product_id) {
        productIdByCanonicalVariation.set(variation.id, variation.product_id);
      }
    }

    // Preserve o erro anterior do .single() se uma variação sumir ou ficar
    // inacessível entre a resolução e a leitura em lote.
    const missingVariationIds = canonicalVariationIds.filter(
      (id) => !productIdByCanonicalVariation.has(id)
    );
    await Promise.all(
      missingVariationIds.map(async (id) => {
        const { error: variationError } = await supabase
          .from('product_variations')
          .select('product_id')
          .eq('id', id)
          .single();
        if (variationError) throw variationError;
      })
    );
  }

  const resolvedRows = rows.map((row) => {
    const originalVariationId =
      row.product_variation_id && isValidUuid(row.product_variation_id)
        ? row.product_variation_id
        : undefined;
    const productVariationId = originalVariationId
      ? canonicalVariationByOriginal.get(originalVariationId) || originalVariationId
      : undefined;
    const canonicalProductId = productVariationId
      ? productIdByCanonicalVariation.get(productVariationId)
      : undefined;

    // O item operacional deve sempre trazer o pai real da variação
    // canônica; nunca o pai legado da referência de fornecedor.
    return [
      normalizeSupplierProductCode(row.supplier_product_code),
      {
        productId: canonicalProductId || row.product_id,
        productVariationId,
        supplierId: row.supplier_id,
        supplierProductCode: row.supplier_product_code,
        supplierDescription: row.supplier_description || undefined,
        confirmedByUser: true,
      } satisfies ProductSupplierCode,
    ] as const;
  });

  return new Map(resolvedRows);
};

export const saveProductSupplierCode = async (reference: ProductSupplierCode): Promise<void> => {
  if (!reference.supplierId || !reference.productId || !reference.supplierProductCode.trim())
    return;

  let productId = reference.productId;
  let productVariationId =
    reference.productVariationId && isValidUuid(reference.productVariationId)
      ? reference.productVariationId
      : null;

  if (productVariationId) {
    const { data: canonicalVariationId, error: resolutionError } = await supabase.rpc(
      'resolve_canonical_variation_id',
      { p_variation_id: productVariationId }
    );
    if (resolutionError) throw resolutionError;
    productVariationId = canonicalVariationId || productVariationId;

    const { data: canonicalVariation, error: variationError } = await supabase
      .from('product_variations')
      .select('product_id')
      .eq('id', productVariationId)
      .single();
    if (variationError) throw variationError;
    productId = canonicalVariation?.product_id || productId;
  }

  const { error } = await supabase.from('product_supplier_codes').upsert(
    {
      product_id: productId,
      product_variation_id: productVariationId,
      supplier_id: reference.supplierId,
      supplier_product_code: normalizeSupplierProductCode(reference.supplierProductCode),
      supplier_description: reference.supplierDescription || null,
      is_active: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'supplier_id,supplier_product_code' }
  );

  if (error) throw error;
};

export const fetchSupplierCodesForProduct = async (
  productId: string,
  productVariationId?: string
): Promise<ProductSupplierCode[]> => {
  if (!productId) return [];

  let query = supabase
    .from('product_supplier_codes')
    .select(
      'product_id, product_variation_id, supplier_id, supplier_product_code, supplier_description'
    )
    .eq('product_id', productId)
    .eq('is_active', true);

  if (productVariationId && isValidUuid(productVariationId)) {
    query = query.eq('product_variation_id', productVariationId);
  }

  const { data, error } = await query;
  if (error) throw error;

  return (data || []).map((row) => ({
    productId: row.product_id,
    productVariationId: row.product_variation_id || undefined,
    supplierId: row.supplier_id,
    supplierProductCode: row.supplier_product_code,
    supplierDescription: row.supplier_description || undefined,
    confirmedByUser: true,
  }));
};

export const deleteProductSupplierCode = async (
  supplierId: string,
  supplierProductCode: string
): Promise<void> => {
  if (!supplierId || !supplierProductCode.trim()) return;

  const { error } = await supabase
    .from('product_supplier_codes')
    .delete()
    .eq('supplier_id', supplierId)
    .eq('supplier_product_code', normalizeSupplierProductCode(supplierProductCode));

  if (error) throw error;
};
