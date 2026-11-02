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

export async function prepareIdentificationLabelProductsForReceipt(
  receiptId: string
): Promise<IdentificationLabelProduct[]> {
  const id = receiptId.trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error('O identificador do recebimento é inválido.');
  }

  const response = await withTimeout(
    supabase
      .from('goods_receipts')
      .select('id, status, is_draft, items, goods_receipt_items(item_index, product_id, variation_id, quantity, item_snapshot)')
      .eq('id', id)
      .maybeSingle(),
    10000,
    null,
    'etiquetas:carregar-recebimento'
  );
  if (!response) throw new Error('A consulta do recebimento para as etiquetas excedeu o prazo.');
  if (response.error) throw new Error('Não foi possível carregar o recebimento para as etiquetas.');
  if (!response.data) throw new Error('O recebimento não foi encontrado ou você não tem acesso a ele.');
  if (response.data.status !== 'received' || response.data.is_draft === true) {
    throw new Error('As etiquetas ficam disponíveis somente para recebimentos concluídos.');
  }

  const persistedItems = response.data.goods_receipt_items;
  const items = Array.isArray(persistedItems) && persistedItems.length > 0
    ? [...persistedItems].sort((left: any, right: any) => Number(left.item_index || 0) - Number(right.item_index || 0))
    : Array.isArray(response.data.items) ? response.data.items : [];
  const references = items.map((item: Record<string, any>) => {
    const snapshot = item.item_snapshot && typeof item.item_snapshot === 'object'
      ? item.item_snapshot
      : {};
    return {
      productId: String(item.product_id || snapshot.productId || item.productId || ''),
      variationId: String(item.variation_id || snapshot.variationId || item.variationId || '') || undefined,
      quantity: Number(item.quantity ?? snapshot.quantity),
    };
  });
  return prepareIdentificationLabelProducts(references);
}

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
        'id, name, description, code, unit_price, cost_price, promo_price, stock, active, deleted_at, has_variations, category, unit, images, variations:product_variations(id, name, description, sku, price, promo_price, stock, image_url, active)'
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
