import { supabase } from './supabaseConfig';
import { isValidUuid } from './uuidUtils';
import { withTimeout } from '../../../../shared-utils/withTimeout';
import {
  findInboundSupplierItemMappings,
  saveInboundSupplierItemMapping,
} from './inboundNfe/services/inboundSupplierItemMappingsService';

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
  const mappings = await findInboundSupplierItemMappings(supplierId, codes);
  return new Map(
    [...mappings.entries()]
      .filter(([, mapping]) => mapping.link_mode === 'single' && Boolean(mapping.product_id))
      .map(([code, mapping]) => [
        code,
        {
          productId: String(mapping.product_id),
          productVariationId: mapping.variation_id || undefined,
          supplierId,
          supplierProductCode: mapping.supplier_product_code || code,
          supplierDescription: mapping.supplier_description || undefined,
          confirmedByUser: true,
        } satisfies ProductSupplierCode,
      ])
  );
};

export const saveProductSupplierCode = async (reference: ProductSupplierCode): Promise<void> => {
  if (!reference.supplierId || !reference.productId || !reference.supplierProductCode.trim())
    return;
  if (!isValidUuid(reference.productId)) throw new Error('O produto do vínculo não possui um identificador válido.');
  if (reference.productVariationId && !isValidUuid(reference.productVariationId)) throw new Error('A variação do vínculo não possui um identificador válido.');
  await saveInboundSupplierItemMapping({
    supplierId: reference.supplierId,
    supplierProductCode: reference.supplierProductCode,
    linkMode: 'single',
    productId: reference.productId,
    variationId: reference.productVariationId,
    supplierDescription: reference.supplierDescription,
  });
};

export const fetchSupplierCodesForProduct = async (
  productId: string,
  productVariationId?: string
): Promise<ProductSupplierCode[]> => {
  if (!productId) return [];

  let query = (supabase as any)
    .from('inbound_supplier_item_mappings')
    .select(
      'product_id, variation_id, supplier_id, supplier_product_code, supplier_description'
    )
    .eq('product_id', productId)
    .eq('link_mode', 'single');

  if (productVariationId && isValidUuid(productVariationId)) {
    query = query.eq('variation_id', productVariationId);
  }

  const result = await withTimeout(query, 15_000, null, 'entrada:consultar-codigos-globais');
  if (!result) throw new Error('A consulta de códigos globais do fornecedor excedeu o prazo.');
  const { data, error } = result;
  if (error) throw error;

  return (data || []).map((row) => ({
    productId: row.product_id,
    productVariationId: row.variation_id || undefined,
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
  await saveInboundSupplierItemMapping({
    supplierId,
    supplierProductCode: normalizeSupplierProductCode(supplierProductCode),
    linkMode: 'unlinked',
  });
};
