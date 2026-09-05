import type Order from '../types/order.type';
import type { Item } from '../types/items.type';

export const isTemporarySaleItem = (item?: Item) =>
  Boolean(item && (!item.productId?.trim() || item.isTemporaryProduct));

export const hasTemporarySaleItem = (order: Order) =>
  (order.items || []).some(isTemporarySaleItem);

export const isTemporarySaleItemReconciliation = (previous?: Item, current?: Item) =>
  isTemporarySaleItem(previous) && Boolean(current?.productId?.trim()) && !current?.isTemporaryProduct;

export const canMaintainSaleStock = (order: Order) =>
  order.orderType === 'sale' && ['scheduled', 'fulfilled'].includes(order.status || '');

export const shouldProcessSaleStock = (
  order: Order,
  automaticStatuses: string[] = [],
  force = false,
) => order.orderType === 'sale'
  && (!order.stockProcessed || force)
  && (force || automaticStatuses.includes(order.status || ''));

export const canCreateSaleExitForItem = (order: Order, item: Item, hasEffectiveExit: boolean) =>
  canMaintainSaleStock(order) && !isTemporarySaleItem(item) && !hasEffectiveExit;

/** Verifica se um item de venda é elegível para movimentação física no estoque. */
export const isStockEligibleSaleItem = (item?: Item): boolean =>
  Boolean(item && item.productId?.trim() && !item.isTemporaryProduct && item.itemType !== 'service');

/**
 * Verifica se apenas alguns itens do pedido tiveram movimentação de saída gerada (parcial).
 * Ocorre quando há movimentação processada, mas nem todos os itens do pedido geraram saída
 * (ex: pedido com itens temporários ou de serviço misturados com produtos cadastrados,
 * ou saída gerada para apenas parte dos itens).
 */
export const isPartialSaleStockMovement = (
  order: Order,
  movedProductIds?: Set<string> | string[],
): boolean => {
  if (order.status === 'cancelled' || order.stockReversed || order.returnStockReversed) {
    return false;
  }

  const hasMovement = order.orderType === 'return'
    ? Boolean(order.returnStockProcessed)
    : Boolean(order.stockProcessed);

  if (!hasMovement) return false;

  if (order.orderType === 'return') {
    return order.returnKind === 'partial';
  }

  const items = order.items || [];
  if (items.length === 0) return false;

  const eligibleItems = items.filter(isStockEligibleSaleItem);
  const hasIneligibleItem = items.some(it => !isStockEligibleSaleItem(it));

  // Se o pedido possui itens não elegíveis (temporários sem cadastro ou serviços),
  // e pelo menos um item gerou saída, a saída é parcial.
  if (hasIneligibleItem && eligibleItems.length > 0) {
    return true;
  }

  // Se tem apenas 1 item e ele não é elegível (ex: temporário), mas o pedido foi marcado com saída:
  if (items.length === 1 && hasIneligibleItem) {
    return true;
  }

  // Se foram informados os produtos que de fato tiveram saída registrada no banco
  if (movedProductIds) {
    const movedSet = Array.isArray(movedProductIds) ? new Set(movedProductIds.map(String)) : movedProductIds;

    // Se há registro de movimentações no banco
    if (movedSet.size > 0) {
      // Verifica se todos os itens elegíveis foram movimentados
      const allEligibleMoved = eligibleItems.length > 0 && eligibleItems.every(it => movedSet.has(String(it.productId)));
      if (allEligibleMoved && !hasIneligibleItem) {
        return false; // Saída 100% completa! Não é parcial!
      }
      return true; // Nem todos os itens foram movimentados -> Parcial!
    }
  }

  // Se todos os itens são elegíveis para estoque e não há itens sem cadastro:
  if (eligibleItems.length === items.length && eligibleItems.length > 0) {
    return false; // Saída completa!
  }

  return Boolean(order.isPartialStockProcessed);
};
