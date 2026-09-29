import type { Item } from '../types/items.type';
import type Order from '../types/order.type';
import { getNonStockOrigin } from './saleInventoryRules';

/** A devolução reentra pelo CMV materializado na venda, nunca pelo custo atual do produto. */
export const getReturnUnitCost = (item: Item) => item.unitCost;

export const shouldCreateReturnEntry = (item: Item, alreadyExists: boolean) =>
  Boolean(item.productId?.trim()) && !item.isTemporaryProduct && !getNonStockOrigin(item) && !alreadyExists;

export const canProcessReturnStock = (order: Order) =>
  order.orderType === 'return' && order.status === 'fulfilled';

/**
 * A data da movimentação de entrada de estoque da devolução deve ser a mesma data em que a devolução foi cadastrada.
 */
export const getReturnInventoryDate = (
  order: Order,
  historical: boolean = false,
  now = new Date()
) => order.date || (historical ? order.date : undefined) || now.toISOString();
