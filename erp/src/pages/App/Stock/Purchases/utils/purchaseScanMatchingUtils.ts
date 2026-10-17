import Purchase, { PurchaseItem } from '../../../../types/purchase.type';
import Product, { Variation } from '../../../../types/product.type';

/**
 * Localiza um item do pedido de compra correspondente aos códigos lidos (código, referência do fornecedor, ID ou SKU/código de barras da variação).
 */
export function matchScannedPurchaseItem(
  candidates: readonly string[],
  products: readonly Product[],
  purchase: Purchase
): PurchaseItem | null {
  if (candidates.length === 0) return null;

  // 1. Tenta localizar por produto simples
  const product = products.find(
    (p) =>
      candidates.includes((p.code || '').trim().toLowerCase()) ||
      candidates.includes((p.supplierRef || '').trim().toLowerCase()) ||
      candidates.includes(String(p.id).trim().toLowerCase())
  );

  if (product) {
    const purchaseItem = purchase.items.find(
      (i) => i.productId === product.id && !i.variationId
    );
    if (purchaseItem) {
      return purchaseItem;
    }
  }

  // 2. Tenta localizar por variação
  for (const p of products) {
    if (p.hasVariations && p.variations) {
      const variation = p.variations.find(
        (v: Variation) =>
          candidates.includes((v.sku || '').trim().toLowerCase()) ||
          candidates.includes(((v as any).barcode || '').trim().toLowerCase()) ||
          candidates.includes(String(v.id).trim().toLowerCase())
      );
      if (variation) {
        const purchaseItem = purchase.items.find(
          (i) => i.productId === p.id && i.variationId === variation.id
        );
        if (purchaseItem) {
          return purchaseItem;
        }
      }
    }
  }

  return null;
}
