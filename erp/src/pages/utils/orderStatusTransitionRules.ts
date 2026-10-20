import Order from '../types/order.type';
import {
  getGoodsCirculationState,
  hasGoodsCirculated,
  hasExplicitGoodsCirculationEvidence,
  type OrderCirculationState,
} from './nfe/cancellationEligibility';

type OrderStatusTransitionContext = OrderCirculationState & {
  orderType?: string | null;
  order_data?: (NonNullable<OrderCirculationState['order_data']> & {
    orderType?: string | null;
  }) | null;
};

const resolveOrderType = (order?: OrderStatusTransitionContext): string | undefined =>
  order?.orderType || order?.order_data?.orderType || undefined;

/**
 * Verifica se há circulação física impeditiva para corrigir/desfazer o atendimento (retornar para 'scheduled').
 *
 * Fatos que impedem a reversão simples:
 * 1. Entrega física concluída ('delivered', 'entregue', 'retirado', 'deliveryFinishedAt', 'pickupConfirmedAt').
 * 2. Carga ativamente em trânsito/em rota ('in_transit', 'out_for_delivery', 'em_rota', 'em_transito', 'em_entrega').
 *
 * Situações de insucesso de entrega ou tentativa não atendida ('unattended', 'unattendedAt', etc.)
 * NÃO impedem a correção da entrega, permitindo que o operador retorne o pedido para 'scheduled'
 * para corrigir dados, reagendar ou redisponibilizar para nova rota.
 */
export const hasBlockingCirculationForUndoFulfillment = (
  order: OrderCirculationState | null | undefined
): boolean => {
  const data = order?.order_data || {};
  const shipping = data.shipping || order?.shipping || {};
  const deliveryStatus = String(
    order?.delivery_status || order?.deliveryStatus || data.deliveryStatus || shipping.deliveryStatus || ''
  ).trim().toLowerCase();

  // 1. Entrega ou retirada confirmada/concluída
  if (['delivered', 'entregue', 'retirado'].includes(deliveryStatus)) {
    return true;
  }
  const deliveryFinished =
    shipping.deliveryFinishedAt ||
    order?.delivery_finished_at ||
    order?.deliveryFinishedAt ||
    data.deliveryFinishedAt;
  const pickupConfirmed =
    shipping.pickupConfirmedAt || order?.pickupConfirmedAt || data.pickupConfirmedAt;
  if (deliveryFinished || pickupConfirmed) {
    return true;
  }

  // 2. Carga ativamente em rota / em trânsito
  const activeTransitStatuses = new Set([
    'in_transit',
    'in-transit',
    'out_for_delivery',
    'out-for-delivery',
    'em_transito',
    'em_rota',
    'em rota',
    'em_entrega',
    'em entrega',
  ]);
  if (activeTransitStatuses.has(deliveryStatus)) {
    return true;
  }

  return false;
};

/**
 * Valida se uma transição de status de pedido é permitida pelas regras de negócio.
 *
 * Regras Canônicas:
 * 1. Um pedido já cadastrado (ex: 'scheduled', 'fulfilled') não pode voltar para 'draft'.
 * 2. Um pedido 'cancelled' não pode ter seu status alterado para nenhum outro status.
 * 3. Pedidos em 'draft' podem avançar para 'quoted' (orçamento), 'scheduled' ou 'fulfilled'.
 * 4. Um 'quoted' permanece orçamento; gerar venda cria um pedido separado.
 * 5. Pedidos 'scheduled' podem transicionar para 'fulfilled' (atendido) ou 'cancelled' (cancelado).
 * 6. 'fulfilled' pode voltar para 'scheduled' pela ação explícita de correção de atendimento;
 *    o fluxo continua respeitando qualquer evidência física registrada na venda.
 */
export const validateOrderStatusTransition = (
  currentStatus?: Order['status'],
  newStatus?: Order['status'],
  currentOrder?: OrderStatusTransitionContext
): { allowed: boolean; reason?: string } => {
  if (!newStatus) {
    return { allowed: true };
  }

  if (newStatus === 'quoted' && resolveOrderType(currentOrder) !== 'budget') {
    return {
      allowed: false,
      reason: 'Somente orçamentos podem usar o status “Orçamento cadastrado”.',
    };
  }

  if (currentStatus === 'quoted' && newStatus !== 'quoted') {
    return {
      allowed: false,
      reason:
        'Um orçamento cadastrado não pode avançar para status de venda. Gere uma venda a partir do orçamento.',
    };
  }

  if (currentStatus === newStatus) return { allowed: true };

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
      reason:
        'Um pedido cancelado não pode ter o status alterado. Duplique o pedido para criar uma nova venda.',
    };
  }

  if (
    currentStatus === 'fulfilled' &&
    newStatus === 'scheduled' &&
    hasBlockingCirculationForUndoFulfillment(currentOrder)
  ) {
    return {
      allowed: false,
      reason:
        'Não é possível corrigir o atendimento depois de registrada a entrega, retirada ou saída da mercadoria.',
    };
  }

  if (newStatus === 'cancelled' && getGoodsCirculationState({ ...currentOrder, status: currentStatus }) === 'completed') {
    return {
      allowed: false,
      reason:
        'Pedido entregue ou retirado teve circulação da mercadoria. Registre uma devolução comercial para reverter a operação.',
    };
  }

  if (
    newStatus === 'cancelled' &&
    getGoodsCirculationState({ ...currentOrder, status: currentStatus }) === 'in_progress'
  ) {
    return {
      allowed: false,
      reason:
        'A entrega ou retirada ainda não foi confirmada nem reconciliada. Conclua ou regularize a rota antes de cancelar o pedido.',
    };
  }

  return { allowed: true };
};

/**
 * Determina se um pedido pode ser cancelado diretamente.
 * Vendas agendadas podem ser canceladas;
 * Vendas já atendidas ('fulfilled') devem passar pelo fluxo de devolução/estorno de estoque.
 */
export const canCancelOrderDirectly = (
  order: OrderCirculationState & {
    status?: Order['status'];
    orderType?: string;
  }
): boolean => {
  if (!order.status || order.status === 'cancelled' || order.status === 'draft') {
    return false;
  }
  if (hasGoodsCirculated(order)) {
    return false;
  }
  if (getGoodsCirculationState(order) === 'in_progress') return false;
  return order.status === 'scheduled';
};

/**
 * Só pedidos atendidos que não sejam devoluções podem usar a correção explícita do status.
 * A ação corrige o status sem criar efeitos fiscais ou de estoque.
 */
export const canUndoFulfillment = (order: OrderCirculationState & {
  status?: Order['status'];
  orderType?: string;
}): boolean => {
  if (order.status !== 'fulfilled') return false;
  if ((order.orderType || 'sale') === 'return') return false;
  return !hasBlockingCirculationForUndoFulfillment(order);
};
