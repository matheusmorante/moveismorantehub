import type Order from '../types/order.type';
import type { Item } from '../types/items.type';

export const getNonStockOrigin = (item?: Item): 'salvado' | 'usado' | null =>
  item?.condition === 'salvado' || item?.condition === 'usado' ? item.condition : null;

export const removeNonStockItemLinks = (order: Order): Order => {
  if (order.orderType !== 'sale' && order.orderType !== 'return') return order;
  const items = order.items || [];
  if (
    !items.some(
      (item) =>
        getNonStockOrigin(item) && (item.productId || item.variationId || !item.isTemporaryProduct)
    )
  ) {
    return order;
  }
  return {
    ...order,
    items: items.map((item) =>
      getNonStockOrigin(item)
        ? { ...item, productId: undefined, variationId: undefined, isTemporaryProduct: true }
        : item
    ),
  };
};

export const isTemporarySaleItem = (item?: Item) =>
  Boolean(item && (!item.productId?.trim() || item.isTemporaryProduct || getNonStockOrigin(item)));

export const hasTemporarySaleItem = (order: Order) => (order.items || []).some(isTemporarySaleItem);

export const isTemporarySaleItemReconciliation = (previous?: Item, current?: Item) =>
  isTemporarySaleItem(previous) &&
  Boolean(current?.productId?.trim()) &&
  !current?.isTemporaryProduct &&
  !getNonStockOrigin(current);

export const canMaintainSaleStock = (order: Order) =>
  order.orderType === 'sale' && ['scheduled', 'fulfilled'].includes(order.status || '');

export const shouldProcessSaleStock = (
  order: Order,
  automaticStatuses: string[] = [],
  force = false
) =>
  order.orderType === 'sale' &&
  (!order.stockProcessed || force) &&
  (force || automaticStatuses.includes(order.status || ''));

export const canCreateSaleExitForItem = (order: Order, item: Item, hasEffectiveExit: boolean) =>
  canMaintainSaleStock(order) && !isTemporarySaleItem(item) && !hasEffectiveExit;

/**
 * A data da movimentação de saída de estoque da venda deve ser a mesma data em que o pedido foi cadastrado.
 */
export const getSaleInventoryDate = (order: Order, historical: boolean = false, now = new Date()) =>
  order.date || (historical ? order.date : undefined) || now.toISOString();

/** Verifica se um item de venda é elegível para movimentação física no estoque. */
export const isStockEligibleSaleItem = (item?: Item): item is Item & { productId: string } =>
  Boolean(
    item &&
      item.productId?.trim() &&
      !item.isTemporaryProduct &&
      !getNonStockOrigin(item) &&
      item.itemType !== 'service'
  );

/** Itens que participam da conferência de movimentação física do estoque. */
const isConventionalStockItem = (item?: Item): item is Item =>
  Boolean(item && !getNonStockOrigin(item) && item.itemType !== 'service');

/**
 * Verifica se apenas alguns produtos convencionais tiveram movimentação efetiva.
 * Itens usados, salvados e serviços não participam da conferência; produto convencional
 * sem cadastro conta como pendente quando ao menos outro produto convencional foi movido.
 */
export const isPartialSaleStockMovement = (
  order: Order,
  movedProductIds?: Set<string> | string[]
): boolean => {
  if (order.status === 'cancelled' || order.stockReversed || order.returnStockReversed) {
    return false;
  }

  const hasMovement =
    order.orderType === 'return'
      ? Boolean(order.returnStockProcessed)
      : Boolean(order.stockProcessed);

  if (!hasMovement) return false;

  const items = order.items || [];
  if (items.length === 0) return false;

  const conventionalItems = items.filter(isConventionalStockItem);
  if (conventionalItems.length === 0) return false;

  // IDs informados representam os produtos com movimentação efetiva no banco.
  if (movedProductIds) {
    const movedSet = Array.isArray(movedProductIds)
      ? new Set(movedProductIds.map(String))
      : movedProductIds;
    const movedConventionalItems = conventionalItems.filter(
      (item) =>
        Boolean(item.productId?.trim()) &&
        !item.isTemporaryProduct &&
        movedSet.has(String(item.productId))
    );
    return (
      movedConventionalItems.length > 0 &&
      movedConventionalItems.length < conventionalItems.length
    );
  }

  return Boolean(order.isPartialStockProcessed);
};
