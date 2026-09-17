import Order from '../types/order.type';

/**
 * Valida se uma transição de status de pedido é permitida pelas regras de negócio.
 * 
 * Regras Canônicas:
 * 1. Um pedido já cadastrado (ex: 'scheduled', 'fulfilled') não pode voltar para 'draft'.
 * 2. Um pedido 'cancelled' não pode ter seu status alterado para nenhum outro status.
 * 3. Pedidos em 'draft' podem avançar para 'scheduled' ou 'fulfilled' (conforme agendamento/retirada).
 * 4. Pedidos 'scheduled' podem transicionar para 'fulfilled' (atendido) ou 'cancelled' (cancelado).
 * 5. Pedidos 'fulfilled' podem ser desfeitos para 'scheduled' (caso precise reagendar/desfazer entrega).
 */
export const validateOrderStatusTransition = (
  currentStatus?: Order['status'],
  newStatus?: Order['status']
): { allowed: boolean; reason?: string } => {
  if (!newStatus || currentStatus === newStatus) {
    return { allowed: true };
  }

  // Regra 1: Não pode reverter para rascunho se já foi efetivado
  if (newStatus === 'draft' && currentStatus && currentStatus !== 'draft') {
    return {
      allowed: false,
      reason: 'Um pedido já cadastrado não pode voltar para rascunho.',
    };
  }

  // Regra 2: Pedido cancelado é terminal (imutável)
  if (currentStatus === 'cancelled' && newStatus !== 'cancelled') {
    return {
      allowed: false,
      reason: 'Um pedido cancelado não pode ter o status alterado. Duplique o pedido para criar uma nova venda.',
    };
  }

  return { allowed: true };
};

/**
 * Determina se um pedido pode ser cancelado diretamente.
 * Vendas agendadas podem ser canceladas;
 * Vendas já atendidas ('fulfilled') devem passar pelo fluxo de devolução/estorno de estoque.
 */
export const canCancelOrderDirectly = (order: {
  status?: Order['status'];
  orderType?: string;
}): boolean => {
  if (!order.status || order.status === 'cancelled' || order.status === 'draft') {
    return false;
  }
  if (order.status === 'fulfilled') {
    return false;
  }
  return order.status === 'scheduled';
};

/**
 * Determina se um pedido pode ter a efetivação (fulfillment) desfeita.
 */
export const canUndoFulfillment = (order: {
  status?: Order['status'];
  orderType?: string;
}): boolean => {
  return order.status === 'fulfilled';
};
