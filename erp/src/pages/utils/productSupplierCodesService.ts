import { supabase } from './supabaseConfig';

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
        .select('product_id, product_variation_id, supplier_id, supplier_product_code, supplier_description, confirmed_by_user')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .in('supplier_product_code', codes);

    if (error) throw error;

    // A referência do fornecedor continua guardando a variação original. Para
    // novos recebimentos e movimentações, porém, usamos a canônica quando a
    // original já foi mesclada. Assim o histórico não é reescrito.
    const resolvedRows = await Promise.all((data || []).map(async (row) => {
        let productVariationId = row.product_variation_id || undefined;

        if (productVariationId) {
            const { data: canonicalVariationId, error: resolutionError } = await supabase.rpc(
                'resolve_canonical_variation_id',
                { p_variation_id: productVariationId },
            );

            if (resolutionError) throw resolutionError;
            productVariationId = canonicalVariationId || productVariationId;

            const { data: canonicalVariation, error: variationError } = await supabase
                .from('product_variations')
                .select('product_id')
                .eq('id', productVariationId)
                .single();
            if (variationError) throw variationError;

            // O item operacional deve sempre trazer o pai real da variação
            // canônica; nunca o pai legado da referência de fornecedor.
            if (canonicalVariation?.product_id) {
                row.product_id = canonicalVariation.product_id;
            }
        }

        return [
            normalizeSupplierProductCode(row.supplier_product_code),
            {
                productId: row.product_id,
                productVariationId,
                supplierId: row.supplier_id,
                supplierProductCode: row.supplier_product_code,
                supplierDescription: row.supplier_description || undefined,
                normalizedDescription: row.normalized_description || undefined,
                confirmedByUser: row.confirmed_by_user !== false,
            } satisfies ProductSupplierCode,
        ] as const;
    }));

    return new Map(resolvedRows);
};

export const saveProductSupplierCode = async (reference: ProductSupplierCode): Promise<void> => {
    if (!reference.supplierId || !reference.productId || !reference.supplierProductCode.trim()) return;

    let productId = reference.productId;
    let productVariationId = reference.productVariationId || null;

    if (productVariationId) {
        const { data: canonicalVariationId, error: resolutionError } = await supabase.rpc(
            'resolve_canonical_variation_id',
            { p_variation_id: productVariationId },
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

    const { error } = await supabase.from('product_supplier_codes').upsert({
        product_id: productId,
        product_variation_id: productVariationId,
        supplier_id: reference.supplierId,
        supplier_product_code: normalizeSupplierProductCode(reference.supplierProductCode),
        supplier_description: reference.supplierDescription || null,
        confirmed_by_user: reference.confirmedByUser !== false,
        confirmed_at: reference.confirmedByUser === false ? null : new Date().toISOString(),
        is_active: true,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'supplier_id,supplier_product_code' });

    if (error) throw error;
};

export const fetchSupplierCodesForProduct = async (
    productId: string,
    productVariationId?: string
): Promise<ProductSupplierCode[]> => {
    if (!productId) return [];

    let query = supabase
        .from('product_supplier_codes')
        .select('product_id, product_variation_id, supplier_id, supplier_product_code, supplier_description, confirmed_by_user')
        .eq('product_id', productId)
        .eq('is_active', true);

    if (productVariationId) {
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
        confirmedByUser: row.confirmed_by_user !== false,
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

