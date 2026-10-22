import { getFullProduct } from '@/pages/utils/productService';
import { getCompositionById } from '@/pages/utils/compositionService';
import Product, { Variation } from '@/pages/types/product.type';

const hydrateProductComposition = async (
  product: Product,
  requestedVariation?: Variation
): Promise<{ product: Product; variation?: Variation }> => {
  let variation = requestedVariation;
  if (!variation && product.variations?.length === 1) variation = product.variations[0];

  const compositionItems = variation?.comboItems?.length
    ? variation.comboItems
    : product.comboItems || [];

  if (variation && !variation.comboItems?.length && !product.comboItems?.length) {
    throw new Error('A variação deste produto composto não possui produtos componentes.');
  }
  if (!compositionItems.length) {
    throw new Error('Este produto composto ainda não possui produtos componentes.');
  }

  const resolvedItems = await Promise.all(
    compositionItems.map(async (item) => {
      const component = await getFullProduct(item.productId);
      if (!component) throw new Error('Um produto componente não foi encontrado.');
      if (component.itemType === 'composition' || component.isCombo) {
        throw new Error('Uma composição não pode conter outra composição como componente.');
      }

      const componentVariation = item.variationId
        ? component.variations?.find((candidate) => candidate.id === item.variationId)
        : undefined;
      if (item.variationId && !componentVariation) {
        throw new Error('Uma variação de produto componente não foi encontrada.');
      }

      return {
        ...item,
        product: component,
        variation: componentVariation,
      };
    })
  );

  return {
    product: { ...product, isComposition: true, items: resolvedItems } as Product,
    variation: variation
      ? ({ ...variation, items: resolvedItems } as Variation)
      : undefined,
  };
};

export interface SelectableCatalogItem {
  p: Product;
  v?: Variation;
  key: string;
  isComposition?: boolean;
  shallowRow?: any;
}

/**
 * Realiza o deep fetch sob demanda (on click) do produto ou composição selecionado.
 * Garante que o payload entregue ao onSelect possua os dados profundos do catálogo e,
 * para produtos compostos, os produtos e variações componentes atuais.
 */
export async function fetchSelectableDeep(
  item: SelectableCatalogItem
): Promise<{ product: Product; variation?: Variation }> {
  const shallowRow = item.shallowRow;

  // O item pode já estar completo quando o chamador não veio da busca rasa.
  if (!shallowRow) {
    if (item.p.itemType === 'composition') {
      const product = item.p.id ? await getFullProduct(item.p.id) : item.p;
      if (!product) throw new Error('O produto composto não foi encontrado.');
      return hydrateProductComposition(product, item.v);
    }
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
      throw new Error('O produto selecionado não foi encontrado.');
    }
    let v: Variation | undefined = undefined;
    if (hasVar) {
      v = (prod.variations || []).find((varItem: any) => varItem.id === shallowRow.variation_id);
      if (!v) throw new Error('A variação selecionada não foi encontrada.');
    }
    if (prod.itemType === 'composition') return hydrateProductComposition(prod, v);
    return { product: prod, variation: v };
  }
}
