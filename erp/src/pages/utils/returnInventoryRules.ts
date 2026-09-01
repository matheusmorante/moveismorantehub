import type { Item } from '../types/items.type';
import type Order from '../types/order.type';

/** A devolução reentra pelo CMV materializado na venda, nunca pelo custo atual do produto. */
export const getReturnUnitCost = (item: Item) => item.unitCost;

export const shouldCreateReturnEntry = (item: Item, alreadyExists: boolean) =>
  Boolean(item.productId?.trim()) && !item.isTemporaryProduct && !alreadyExists;

export const canProcessReturnStock = (order: Order) =>
  order.orderType === 'return' && order.status === 'fulfilled';

export const getReturnInventoryDate = (order: Order, historical: boolean, now = new Date()) =>
  historical && order.date ? order.date : now.toISOString();
