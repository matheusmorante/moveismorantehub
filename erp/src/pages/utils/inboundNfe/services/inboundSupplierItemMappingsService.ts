import { normalizeInboundSupplierProductCode, type GlobalInboundSupplierItemMapping } from '../../../../../../shared-utils/inboundInvoiceMappingState';
import { supabase } from '../../supabaseConfig';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

export type InboundSupplierItemMappingComponent = {
  productId: string;
  variationId?: string;
  quantityMultiplier: number;
};

export type SaveInboundSupplierItemMapping = {
  supplierId: string;
  supplierProductCode: string;
  linkMode: GlobalInboundSupplierItemMapping['link_mode'];
  productId?: string;
  variationId?: string;
  components?: InboundSupplierItemMappingComponent[];
  supplierDescription?: string;
};

export const findInboundSupplierItemMappings = async (
  supplierId: string,
  supplierCodes: string[]
): Promise<Map<string, GlobalInboundSupplierItemMapping>> => {
  const codes = [...new Set(supplierCodes.map(normalizeInboundSupplierProductCode).filter(Boolean))];
  if (!supplierId || codes.length === 0) return new Map();

  const result = await withTimeout(
    (supabase as any).rpc('find_inbound_supplier_item_mappings', {
      p_keys: codes.map((supplier_product_code) => ({
        supplier_id: supplierId,
        supplier_product_code,
      })),
    }),
    15_000,
    null,
    'entrada:consultar-vinculos-globais'
  );
  if (!result) throw new Error('A consulta de vínculos globais da NF-e excedeu o prazo.');
  const { data, error } = result;
  if (error) throw error;

  return new Map(
    ((data || []) as GlobalInboundSupplierItemMapping[]).map((mapping) => [
      normalizeInboundSupplierProductCode(mapping.supplier_product_code),
      mapping,
    ])
  );
};

export const saveInboundSupplierItemMapping = async (
  mapping: SaveInboundSupplierItemMapping
) => {
  const supplierId = mapping.supplierId.trim();
  const supplierProductCode = normalizeInboundSupplierProductCode(mapping.supplierProductCode);
  if (!supplierId || !supplierProductCode) {
    throw new Error('Fornecedor e código completo são obrigatórios para salvar o vínculo global.');
  }

  const components = (mapping.components || []).map((component) => ({
    productId: component.productId,
    variationId: component.variationId || null,
    quantityMultiplier: Number(component.quantityMultiplier),
  }));
  const result = await withTimeout(
    (supabase as any).rpc('save_inbound_supplier_item_mapping', {
      p_supplier_id: supplierId,
      p_supplier_product_code: supplierProductCode,
      p_link_mode: mapping.linkMode,
      p_product_id: mapping.linkMode === 'single' ? mapping.productId || null : null,
      p_variation_id: mapping.linkMode === 'single' ? mapping.variationId || null : null,
      p_components: mapping.linkMode === 'composition' ? components : [],
      p_supplier_description: mapping.supplierDescription?.trim() || null,
    }),
    20_000,
    null,
    'entrada:salvar-vinculo-global'
  );
  if (!result) throw new Error('A gravação do vínculo global excedeu o prazo. Consulte novamente antes de repetir.');
  const { data, error } = result;
  if (error) throw error;
  if (!data?.id || data.supplier_id !== supplierId || data.supplier_product_code !== supplierProductCode || data.link_mode !== mapping.linkMode) {
    throw new Error('A gravação do vínculo global não foi confirmada pelo servidor.');
  }
  return data;
};
