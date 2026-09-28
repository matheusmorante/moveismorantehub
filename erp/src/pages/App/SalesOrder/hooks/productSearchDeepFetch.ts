import { getFullProduct } from '@/pages/utils/productService';
import { getCompositionById } from '@/pages/utils/compositionService';
import Product, { Variation } from '@/pages/types/product.type';

export interface SelectableCatalogItem {
  p: Product;
  v?: Variation;
  key: string;
  isComposition?: boolean;
  shallowRow?: any;
}

/**
 * Realiza o deep fetch sob demanda (on click) do produto ou composição selecionado.
 * Garante que o payload entregue ao onSelect possua exatamente o contrato profundo
 * legado (variations, images, categories, items da composição e campos fiscais completos).
 */
export async function fetchSelectableDeep(
  item: SelectableCatalogItem
): Promise<{ product: Product; variation?: Variation }> {
  const shallowRow = item.shallowRow;

  // Fallback caso o item já seja um objeto completo ou não possua shallowRow
  if (!shallowRow) {
    return { product: item.p, variation: item.v };
  }

  const isComp = shallowRow.entity_type?.startsWith('composition');
  const hasVar = shallowRow.entity_type?.includes('variation');

  if (isComp) {
    const comp = await getCompositionById(shallowRow.composition_id);
    let v = undefined;
    if (hasVar) {
      v = (comp.variations || []).find(
        (varItem: any) => varItem.id === shallowRow.composition_variation_id
      );
    }
    const p: any = {
      ...comp,
      isComposition: true,
      description: comp.name,
      unitPrice: comp.manual_price || comp.calculated_price || 0,
      code: comp.sku || 'COMP',
      category: 'Composição',
    };
    return { product: p as Product, variation: v as unknown as Variation };
  } else {
    const prod = await getFullProduct(shallowRow.product_id);
    if (!prod) {
      return { product: item.p, variation: item.v };
    }
    let v: Variation | undefined = undefined;
    if (hasVar) {
      v = (prod.variations || []).find((varItem: any) => varItem.id === shallowRow.variation_id);
    }
    return { product: prod, variation: v };
  }
}
