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
