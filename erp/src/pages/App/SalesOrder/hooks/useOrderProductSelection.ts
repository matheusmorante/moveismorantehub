import { useCallback } from 'react';
import Item from '@/pages/types/items.type';
import {
  createFiscalItemSnapshot,
  hasFiscalItemSnapshot,
} from '../../../../../../shared-utils/orderItemFiscalSnapshot';
import { getSelectedProductPricing } from '@/pages/utils/productPricing';
import { getSelectedProductDisplayName } from '@/pages/utils/productVariationDefaults';
import { getProductKind } from '@/pages/utils/productKindRules';

const selectedStockOrigin = (
  product: any,
  variation?: any,
  chosenOrigin?: Item['condition']
): Item['condition'] => {
  const kind = getProductKind(product);
  if (kind === 'salvado') return 'salvado';
  if (kind === 'usado') return 'usado';
  if (chosenOrigin === 'salvado' || chosenOrigin === 'usado') return chosenOrigin;
  if (variation?.condition === 'salvado' || variation?.condition === 'usado')
    return variation.condition;
  if (product.condition === 'salvado' || product.condition === 'usado') return product.condition;
  return 'novo';
};

export function useOrderProductSelection(
  items: Item[],
  setItems: React.Dispatch<React.SetStateAction<Item[]>>
) {
  const handleSelectProduct = useCallback(
    (index: number, product: any, variation?: any) => {
      if (product.isComposition || product.itemType === 'composition') {
        // Mantém linhas comerciais por componente e associa a fotografia do produto composto.
        const compositionItems =
          variation?.items || product.items || product.variations?.[0]?.items;

        if (!compositionItems || compositionItems.length === 0) {
          console.warn('Composição sem itens reais vinculados.');
          return;
        }

        setItems((currentItems) => {
          const newItems = [...currentItems];
          const chosenOrigin = currentItems[index]?.condition;
          const requestedQuantity = Math.max(1, Math.floor(Number(currentItems[index]?.quantity) || 1));
          const compositionSnapshot = {
            groupId: crypto.randomUUID(),
            productId: String(product.id),
            variationId: variation?.id ? String(variation.id) : undefined,
            description: getSelectedProductDisplayName(product, variation),
            code: variation?.sku || product.code || product.sku || '',
            orderedQuantity: requestedQuantity,
            componentCount: compositionItems.length,
          };
          const explodedItems = compositionItems.map((compItem: any, componentIndex: number) => {
            const realProduct = compItem.product;
            const realVariation = compItem.variation;
            const condition = selectedStockOrigin(realProduct, realVariation, chosenOrigin);
            const movesStock = condition === 'novo';

            const quantityPerComposition = Number(compItem.quantity ?? 1);
            const pricing = getSelectedProductPricing(realProduct, realVariation);
            const selectedCost = realVariation
              ? (realVariation.costPrice ?? realProduct.costPrice ?? 0)
              : (realProduct.costPrice ?? 0);

            let resolvedCode = realVariation ? realVariation.sku : realProduct.code;
            if (!resolvedCode || resolvedCode === '000000') resolvedCode = realProduct.sku || '';

            // Aqui definimos o unitPrice usando uma regra de 3 ou apenas 0 se a composição tiver preço fixo manual?
            // Para rastreabilidade contábil, é melhor usar o preço real da peça.
            // O cliente disse "expandiremos a composição em suas partes componentes originais para que o pedido deduza os estoques perfeitamente das peças individuais sem violar a rastreabilidade fiscal e contábil."
            // Como não pediram rateio de preço agora, vamos usar o preço real. Se a composição era mais barata, o usuário aplica desconto no pedido.

            return {
              ...createFiscalItemSnapshot(
                {
                  id: crypto.randomUUID(),
                  orderItemId: crypto.randomUUID(),
                  productId: movesStock ? realProduct.id : undefined,
                  variationId: movesStock ? realVariation?.id : undefined,
                  isTemporaryProduct: !movesStock,
                  code: resolvedCode || '',
                  description: getSelectedProductDisplayName(realProduct, realVariation),
                  unitPrice: pricing.unitPrice,
                  unitDiscount: pricing.unitDiscount,
                  discountType: pricing.discountType,
                  quantity: quantityPerComposition * requestedQuantity,
                  total: Math.max(
                    0,
                    (pricing.unitPrice - (pricing.unitDiscount || 0)) *
                      quantityPerComposition *
                      requestedQuantity
                  ),
                  costPrice: Number(selectedCost) || 0,
                  handlingType: '',
                  condition,
                },
                realProduct,
                realVariation,
                { preserveExisting: false }
              ),
              compositionGroup: {
                ...compositionSnapshot,
                quantityPerComposition,
                componentIndex,
              },
            };
          });

          // Substitui a linha vazia (index) pelos itens explodidos
          newItems.splice(index, 1, ...explodedItems);

          return newItems;
        });

        return;
      }

      // Fluxo normal para produto simples
      const pricing = getSelectedProductPricing(product, variation);

      const selectedCost = variation
        ? (variation.costPrice ?? product.costPrice ?? 0)
        : (product.costPrice ?? 0);

      let resolvedCode = '';
      if (variation) {
        resolvedCode = variation.sku || '';
      }
      if (!resolvedCode) {
        resolvedCode = product.code && product.code !== '000000' ? product.code : product.sku || '';
      }

      const fullDescription = getSelectedProductDisplayName(product, variation);

      setItems((currentItems) =>
        currentItems.map((item, i) => {
          if (i === index) {
            const condition = selectedStockOrigin(product, variation, item.condition);
            const movesStock = condition === 'novo';
            const selectedItem = {
              ...item,
              productId: movesStock ? product.id : undefined,
              variationId: movesStock ? variation?.id : undefined,
              isTemporaryProduct: !movesStock,
              code: resolvedCode,
              description: fullDescription,
              unitPrice: pricing.unitPrice,
              unitDiscount: pricing.unitDiscount,
              discountType: pricing.discountType,
              costPrice: Number(selectedCost) || 0,
              handlingType: '',
              condition,
            };
            const sameProduct =
              (item.fiscalSnapshotProductId || item.productId) === String(product.id || '') &&
              (item.fiscalSnapshotVariationId || item.variationId || undefined) ===
                (variation?.id ? String(variation.id) : undefined);
            if (sameProduct && hasFiscalItemSnapshot(item)) {
              return {
                ...selectedItem,
                fiscalSnapshotVersion: 1 as const,
                fiscalSnapshotProductId: item.fiscalSnapshotProductId || String(product.id || ''),
                ...(variation?.id
                  ? {
                      fiscalSnapshotVariationId:
                        item.fiscalSnapshotVariationId || String(variation.id),
                    }
                  : {}),
                fiscal: item.fiscal,
              };
            }
            return createFiscalItemSnapshot(selectedItem, product, variation, {
              preserveExisting: false,
            });
          }
          return item;
        })
      );
    },
    [setItems]
  );

  const handleItemChange = useCallback(
    (index: number, field: keyof Item, value: any) => {
      setItems((currentItems) =>
        currentItems.map((item, i) => {
          if (i === index) {
            const updated = { ...item, [field]: value } as Item & { total?: number };
            if (field === 'unitPrice' || field === 'quantity' || field === 'unitDiscount') {
              const price = field === 'unitPrice' ? Number(value) : item.unitPrice || 0;
              const qty = field === 'quantity' ? Number(value) : item.quantity || 1;
              const disc = field === 'unitDiscount' ? Number(value) : item.unitDiscount || 0;
              updated.total = Math.max(0, (price - disc) * qty);
            }
            return updated;
          }
          return item;
        })
      );
    },
    [setItems]
  );

  return {
    handleSelectProduct,
    handleItemChange,
  };
}
