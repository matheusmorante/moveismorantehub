import Order from '../types/order.type';
import { getGoodsCirculationState } from './nfe/cancellationEligibility';

export const canGenerateReturn = (order: Order): boolean =>
  (order.orderType || 'sale') === 'sale' && getGoodsCirculationState(order) === 'completed';
