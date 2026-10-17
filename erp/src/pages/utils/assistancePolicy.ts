import Order from '../types/order.type';
import { getGoodsCirculationState } from './nfe/cancellationEligibility';

/**
 * Determina se um pedido é elegível para gerar assistência técnica vinculada.
 * Somente pedidos de venda ou showroom com status atendido (entregue/retirado/concluído)
 * podem gerar uma assistência vinculada.
 */
export const canGenerateAssistance = (order: Order | null | undefined): boolean => {
  if (!order) return false;
  const type = order.orderType || 'sale';
  if (type !== 'sale' && type !== 'showroom') return false;

  const status = String(order.status || '').trim().toLowerCase();
  return (
    ['fulfilled', 'delivered', 'atendido', 'entregue', 'retirado'].includes(status) ||
    getGoodsCirculationState(order) === 'completed'
  );
};
