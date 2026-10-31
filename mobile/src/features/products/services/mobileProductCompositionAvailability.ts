import { calculateCompositionAvailability } from '../../../../../shared-utils/compositionMath';
import { withAbortTimeout } from '../../../../../shared-utils/withAbortTimeout';
import { supabase } from '../../../services/supabaseClient';

export const applyMobileCompositionAvailability = async (products: any[]) => {
  const compositions = products.filter((product) => product.itemType === 'composition');
  if (!compositions.length) return products;

  const unavailable = () =>
    products.map((product) =>
      product.itemType === 'composition'
        ? {
            ...product,
            stock: 0,
            variations: product.variations?.map((variation: any) => ({ ...variation, stock: 0 })),
            allVariations: product.allVariations?.map((variation: any) => ({ ...variation, stock: 0 })),
          }
        : product
    );
  const componentIds = Array.from(
    new Set(
      compositions
        .flatMap((product) => [
          ...(product.comboItems || []),
          ...(product.variations || []).flatMap((variation: any) => variation.comboItems || []),
        ])
        .map((item: any) => String(item.productId || item.product_id || '').trim())
        .filter(Boolean)
    )
  );
  if (!componentIds.length) return unavailable();

  const lookup = await withAbortTimeout(
    supabase
      .from('products')
      .select('id, stock, product_variations(id, stock)')
      .in('id', componentIds),
    'mobile:saldo-produtos-compostos'
  ).then((result) => ({ result })).catch(() => null);
  if (!lookup || lookup.result.error) {
    console.warn('[MobileProductService] Não foi possível consultar o estoque atual dos componentes.');
    return unavailable();
  }

  const currentComponents = new Map<string, { stock: number; variations: Map<string, number> }>();
  for (const row of lookup.result.data || []) {
    currentComponents.set(String(row.id), {
      stock: Number(row.stock) || 0,
      variations: new Map(
        (row.product_variations || []).map((variation: any) => [
          String(variation.id),
          Number(variation.stock) || 0,
        ])
      ),
    });
  }

  const availabilityFor = (items: any[] | undefined): number => {
    if (!items?.length) return 0;
    const requirements = new Map<string, { currentStock: number; quantityNeeded: number }>();
    for (const item of items) {
      const productId = String(item.productId || item.product_id || '');
      const variationId = item.variationId || item.variation_id;
      const component = currentComponents.get(productId);
      const quantity = Number(item.quantity);
      if (!Number.isFinite(quantity) || quantity <= 0) return 0;
      const currentStock = variationId
        ? component?.variations.get(String(variationId)) ?? 0
        : component?.stock ?? 0;
      const key = `${productId}:${variationId || ''}`;
      const existing = requirements.get(key);
      requirements.set(key, {
        currentStock,
        quantityNeeded: (existing?.quantityNeeded || 0) + quantity,
      });
    }
    return calculateCompositionAvailability(Array.from(requirements.values()));
  };

  return products.map((product) => {
    if (product.itemType !== 'composition') return product;
    const rootItems = product.comboItems || [];
    const hasVariationComposition = (product.variations || []).some(
      (variation: any) => Boolean(variation.comboItems?.length)
    );
    const variations = product.variations?.map((variation: any) => ({
      ...variation,
      stock: availabilityFor(variation.comboItems?.length ? variation.comboItems : rootItems),
    }));
    const stock = hasVariationComposition
      ? (variations || []).reduce((total: number, variation: any) => total + (Number(variation.stock) || 0), 0)
      : availabilityFor(rootItems);
    const variationStocks = new Map(
      (variations || []).map((variation: any) => [String(variation.id || variation.sku), variation.stock])
    );
    return {
      ...product,
      stock,
      variations,
      allVariations: product.allVariations?.map((variation: any) => ({
        ...variation,
        stock: variationStocks.get(String(variation.id || variation.sku)) ?? variation.stock,
      })),
    };
  });
};
