type OrderPresentationInput = {
  status?: string | null;
  orderType?: string | null;
  order_type?: string | null;
  deliveryMethod?: string | null;
  delivery_method?: string | null;
  shipping?: { deliveryMethod?: string | null } | null;
  returnMethod?: string | null;
  order_data?: {
    orderType?: string | null;
    order_type?: string | null;
    deliveryMethod?: string | null;
    delivery_method?: string | null;
    shipping?: { deliveryMethod?: string | null } | null;
    returnMethod?: string | null;
  } | null;
};

export type FulfillmentLabels = {
  status: string;
  preFulfillmentStatus: string;
  confirmAction: string;
  correctionAction: string;
  confirmationQuestion: string;
  successMessage: string;
};

const resolveMethod = (order: OrderPresentationInput): 'delivery' | 'pickup' | undefined => {
  const rawMethod =
    order.shipping?.deliveryMethod ||
    order.deliveryMethod ||
    order.delivery_method ||
    order.order_data?.shipping?.deliveryMethod ||
    order.order_data?.deliveryMethod ||
    order.order_data?.delivery_method;
  const method = String(rawMethod || '')
    .trim()
    .toLocaleLowerCase('pt-BR');
  if (['pickup', 'retirada', 'retirar', 'pick-up'].includes(method)) return 'pickup';
  if (['delivery', 'entrega', 'deliver'].includes(method)) return 'delivery';
  return undefined;
};

const isSalesOrder = (order: OrderPresentationInput) => {
  const type = String(
    order.orderType ||
      order.order_type ||
      order.order_data?.orderType ||
      order.order_data?.order_type ||
      'sale'
  ).toLocaleLowerCase('pt-BR');
  return ![
    'return',
    'devolução',
    'devolucao',
    'assistance',
    'assistência',
    'assistencia',
    'budget',
    'orçamento',
    'orcamento',
  ].includes(type);
};

const isReturnOrder = (order: OrderPresentationInput) => {
  const type = String(
    order.orderType ||
      order.order_type ||
      order.order_data?.orderType ||
      order.order_data?.order_type ||
      ''
  ).toLowerCase();
  return ['return', 'devolução', 'devolucao'].includes(type);
};

const resolveReturnMethod = (
  order: OrderPresentationInput
): 'store_delivery' | 'store_collection' | undefined => {
  const explicit = String(order.returnMethod || order.order_data?.returnMethod || '').toLowerCase();
  if (explicit === 'store_delivery' || explicit === 'store_collection') return explicit;
  // Compatibilidade com registros anteriores: fulfillment imediato representava entrega na loja;
  // devoluções agendadas eram criadas somente para coleta no endereço.
  if (String(order.status || '').toLowerCase() === 'scheduled') return 'store_collection';
  if (['fulfilled', 'atendido'].includes(String(order.status || '').toLowerCase()))
    return 'store_delivery';
  return undefined;
};

export const getFulfillmentLabels = (
  order: OrderPresentationInput,
  fallbackStatus = 'Atendido'
): FulfillmentLabels => {
  if (isReturnOrder(order)) {
    const returnMethod = resolveReturnMethod(order);
    const isCollection = returnMethod === 'store_collection';
    return {
      status: isCollection
        ? 'Coletada'
        : returnMethod === 'store_delivery'
          ? 'Recebida'
          : fallbackStatus,
      preFulfillmentStatus: isCollection ? 'Aguardando coleta' : 'Aguardando recebimento',
      confirmAction: isCollection ? 'Confirmar coleta' : 'Confirmar recebimento',
      correctionAction: isCollection ? 'Corrigir coleta' : 'Corrigir recebimento',
      confirmationQuestion: isCollection
        ? 'A mercadoria já foi coletada?'
        : 'A mercadoria já foi recebida na loja?',
      successMessage: isCollection
        ? 'Devolução coletada com sucesso.'
        : 'Devolução recebida com sucesso.',
    };
  }
  if (!isSalesOrder(order)) {
    return {
      status: fallbackStatus,
      preFulfillmentStatus: 'Agendado',
      confirmAction: 'Marcar como atendido',
      correctionAction: 'Desfazer atendimento',
      confirmationQuestion: 'O pedido já foi atendido?',
      successMessage: 'Pedido atendido com sucesso.',
    };
  }

  const method = resolveMethod(order);
  if (method === 'pickup') {
    return {
      status: 'Retirado',
      preFulfillmentStatus: 'Aguardando retirada',
      confirmAction: 'Confirmar retirada',
      correctionAction: 'Corrigir retirada',
      confirmationQuestion: 'A retirada já foi confirmada?',
      successMessage: 'Pedido retirado com sucesso.',
    };
  }
  if (method === 'delivery') {
    return {
      status: 'Entregue',
      preFulfillmentStatus: 'Agendado',
      confirmAction: 'Confirmar entrega',
      correctionAction: 'Corrigir entrega',
      confirmationQuestion: 'A entrega já foi confirmada?',
      successMessage: 'Pedido entregue com sucesso.',
    };
  }
  return {
    status: fallbackStatus,
    preFulfillmentStatus: 'Agendado',
    confirmAction: 'Marcar como atendido',
    correctionAction: 'Desfazer atendimento',
    confirmationQuestion: 'O pedido já foi atendido?',
    successMessage: 'Pedido atendido com sucesso.',
  };
};

export const getOrderStatusLabel = (
  order: OrderPresentationInput,
  fallbackStatus = 'Atendido'
): string => {
  const status = String(order.status || '')
    .trim()
    .toLocaleLowerCase('pt-BR');
  if (isReturnOrder(order)) {
    if (status === 'scheduled') return 'Aguardando coleta';
    if (['fulfilled', 'atendido', 'delivered', 'entregue', 'retirado'].includes(status)) {
      return getFulfillmentLabels(order, fallbackStatus).status;
    }
  }
  if (status === 'scheduled' && isSalesOrder(order) && resolveMethod(order) === 'pickup') {
    return 'Aguardando retirada';
  }
  if (!['fulfilled', 'atendido', 'delivered', 'entregue', 'retirado'].includes(status)) {
    return fallbackStatus;
  }
  return getFulfillmentLabels(order, fallbackStatus).status;
};
