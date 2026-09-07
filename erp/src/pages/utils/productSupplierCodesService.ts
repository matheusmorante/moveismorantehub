import { supabase } from './supabaseConfig';

export type ProductSupplierCode = {
    productId: string;
    productVariationId?: string;
    supplierId: string;
    supplierProductCode: string;
    supplierDescription?: string;
};

const normalizeSupplierProductCode = (value: string) => value.trim().toLocaleUpperCase('pt-BR');

export const findProductSupplierCodes = async (supplierId: string, supplierCodes: string[]) => {
    const codes = [...new Set(supplierCodes.map(normalizeSupplierProductCode).filter(Boolean))];
    if (!supplierId || !codes.length) return new Map<string, ProductSupplierCode>();

    const { data, error } = await supabase
        .from('product_supplier_codes')
        .select('product_id, product_variation_id, supplier_id, supplier_product_code, supplier_description')
        .eq('supplier_id', supplierId)
        .eq('is_active', true)
        .in('supplier_product_code', codes);

    if (error) throw error;

    return new Map((data || []).map((row) => [
        normalizeSupplierProductCode(row.supplier_product_code),
        {
            productId: row.product_id,
            productVariationId: row.product_variation_id || undefined,
            supplierId: row.supplier_id,
            supplierProductCode: row.supplier_product_code,
            supplierDescription: row.supplier_description || undefined,
        },
    ]));
};

export const saveProductSupplierCode = async (reference: ProductSupplierCode): Promise<void> => {
    if (!reference.supplierId || !reference.productId || !reference.supplierProductCode.trim()) return;

    const { error } = await supabase.from('product_supplier_codes').upsert({
        product_id: reference.productId,
        product_variation_id: reference.productVariationId || null,
        supplier_id: reference.supplierId,
        supplier_product_code: normalizeSupplierProductCode(reference.supplierProductCode),
        supplier_description: reference.supplierDescription || null,
        is_active: true,
        updated_at: new Date().toISOString(),
    }, { onConflict: 'supplier_id,supplier_product_code' });

    if (error) throw error;
};
