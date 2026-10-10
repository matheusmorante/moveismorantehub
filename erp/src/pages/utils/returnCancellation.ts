import Order from '../types/order.type';

export const buildCancelledReturn = (order: Order): Partial<Order> => {
  if (order.orderType !== 'return') {
    throw new Error('O pedido informado não é uma devolução.');
  }
  if (order.status === 'cancelled') {
    throw new Error('Esta devolução já foi cancelada.');
  }
  if (order.status === 'fulfilled' || order.returnStockProcessed) {
    throw new Error(
      'A confirmação física desta devolução já foi registrada. Preserve o retorno e trate somente o documento fiscal vinculado.'
    );
  }

  return {
    status: 'cancelled',
    returnStockProcessed: false,
    returnStockReversed: false,
  };
};
