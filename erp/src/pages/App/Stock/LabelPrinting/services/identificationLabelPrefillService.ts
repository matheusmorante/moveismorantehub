import type Product from '@/pages/types/product.type';
import { supabase } from '@/pages/utils/supabaseConfig';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import { processProductData } from '../utils/processLabelProductData';

export interface IdentificationLabelReference {
  productId: string;
  variationId?: string;
  quantity: number;
}

export type IdentificationLabelProduct = Product & { id: string; labelQty: number };

/** Loads current catalog data for linked stock products, never invoice line descriptions. */
export async function prepareIdentificationLabelProducts(
  references: readonly IdentificationLabelReference[]
): Promise<IdentificationLabelProduct[]> {
  const grouped = new Map<string, IdentificationLabelReference>();
  for (const reference of references) {
    const productId = reference.productId?.trim();
    const quantity = Number(reference.quantity);
    if (
      !productId ||
      !Number.isFinite(quantity) ||
      quantity <= 0 ||
      !Number.isInteger(quantity)
    ) {
      throw new Error(
        'Confira o produto vinculado e a quantidade inteira antes de imprimir as etiquetas.'
      );
    }
    const variationId = reference.variationId?.trim() || undefined;
    const key = `${productId}:${variationId || ''}`;
    const current = grouped.get(key);
    grouped.set(key, {
      productId,
      variationId,
      quantity: quantity + (current?.quantity || 0),
    });
  }

  const requested = [...grouped.values()];
  if (!requested.length) throw new Error('Este registro não tem produtos para etiquetar.');

  const productIds = [...new Set(requested.map(({ productId }) => productId))];
  const response = await withTimeout(
    supabase
      .from('products')
      .select(
        'id, name, description, code, sku, unit_price, cost_price, promo_price, stock, active, deleted_at, has_variations, category, unit, images, variations:product_variations(id, name, description, sku, price, promo_price, stock, image_url, active)'
      )
      .is('deleted_at', null)
      .in('id', productIds),
    10000,
    null,
    'etiquetas:carregar-produtos-vinculados'
  );

  if (!response) throw new Error('A consulta dos produtos para etiqueta excedeu o prazo.');
  if (response.error) throw new Error('Não foi possível carregar os produtos vinculados para as etiquetas.');

  // A simple product also has one physical variation, which the reference may identify directly.
  const products = processProductData((response.data || []).map((product) => ({
    ...product,
    hasVariations: Array.isArray(product.variations) && product.variations.length > 0,
  }))) as Array<Product & { variationId?: string }>;
  return requested.map(({ productId, variationId, quantity }) => {
    const product = variationId
      ? products.find(
          (candidate) =>
            candidate.isVariation &&
            candidate.variationId === variationId &&
            candidate.parentId === productId
        )
      : products.find((candidate) => candidate.id === productId && !candidate.isVariation);
    if (!product) {
      throw new Error('Um dos produtos ou variações vinculados não está mais disponível no cadastro.');
    }
    if (!product.id) {
      throw new Error('Não foi possível identificar o cadastro do produto para a etiqueta.');
    }
    return { ...product, id: product.id, labelQty: quantity };
  });
}
