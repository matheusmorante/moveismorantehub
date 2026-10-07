import { supabase } from '../../../services/supabaseClient';

interface ProductVariationCandidate {
  id: string;
  name: string | null;
  sku: string | null;
  price: number | null;
  unit_price: number | null;
  stock?: number | null;
  active: boolean | null;
  status: string | null;
}

interface ProductCandidate {
  id: string;
  name: string;
  code: string | null;
  price: number | null;
  unit_price: number | null;
  stock: number | null;
  status: string | null;
  item_type: string | null;
  is_combo: boolean | null;
  supplier_id: string | null;
  main_supplier_id: string | null;
  supplier_ids: string[] | null;
  product_variations: ProductVariationCandidate[] | null;
}

export interface MobileProductCompositionCandidate extends ProductCandidate {
  variationId?: string;
  variationName?: string | null;
  variationSku?: string | null;
  variationPrice?: number | null;
  variationStock?: number | null;
}

export const searchMobileProductCompositionCandidates = async (
  searchTerm: string,
  supplierId?: string
): Promise<MobileProductCompositionCandidate[]> => {
  const term = `%${searchTerm.toLowerCase()}%`;
  const { data, error } = await supabase
    .from('products')
    .select(
      'id, name, code, price, unit_price, status, item_type, is_combo, supplier_id, main_supplier_id, supplier_ids, product_variations(id, name, sku, price, unit_price, stock, active, status)'
    )
    .neq('item_type', 'composition')
    .neq('item_type', 'combo')
    .or('is_combo.is.null,is_combo.eq.false')
    .or(`name.ilike.${term},code.ilike.${term}`)
    // Filtra fornecedor localmente e busca uma janela maior antes do limite visual.
    .limit(30);

  if (error) throw error;

  const candidates = (data || []) as unknown as ProductCandidate[];
  return candidates
    .filter((product) => {
      if (!supplierId) return true;
      const supplierIds = Array.isArray(product.supplier_ids) ? product.supplier_ids : [];
      return (
        product.supplier_id === supplierId ||
        product.main_supplier_id === supplierId ||
        supplierIds.includes(supplierId)
      );
    })
    .flatMap((product) => {
      const variations = (product.product_variations || []).filter(
        (variation) => variation.active !== false && variation.status !== 'merged'
      );
      return variations.length > 0
        ? variations.map((variation) => ({
            ...product,
            variationId: variation.id,
            variationName: variation.name,
            variationSku: variation.sku,
            variationPrice: variation.price ?? variation.unit_price,
            variationStock: variation.stock,
          }))
        : [product];
    })
    .slice(0, 5);
};
