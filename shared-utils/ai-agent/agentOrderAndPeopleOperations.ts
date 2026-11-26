import {
  AgentOrderItemInput,
  AgentAssistanceItemInput,
  AgentOrderPaymentInput,
  CreateAgentOrderOperationInput,
  UpdateAgentOrderOperationInput,
  normalizeDeliveryMethod,
  parseScheduleTimes,
  OPERATION_TYPE_TO_DB,
  DB_TO_OPERATION_LABEL,
  STATUS_ALIASES,
  generateUuid,
  normalizeStatus,
  resolveNextOrderCode,
  resolveOrderItems,
  ORDER_ROW_COLUMNS,
  findOrderRowByIdOrNumber,
  findLinkedOrderReferenceByIdOrNumber,
  normalizeAgentOrderIdentifier,
} from './agentOrderHelpers';
import {
  UpsertAgentCustomerInput,
  upsertCustomerForAgent,
  searchCustomersForAgent,
  searchCollaboratorsForAgent,
} from './agentPeopleOperations';
import {
  buildAgentAssistanceItems,
  buildAgentOrderPayments,
  updateOrderOperationForAgent,
} from './agentOrderUpdateOperation';

export type {
  AgentOrderItemInput,
  AgentAssistanceItemInput,
  AgentOrderPaymentInput,
  CreateAgentOrderOperationInput,
  UpdateAgentOrderOperationInput,
  UpsertAgentCustomerInput,
};

export {
  normalizeDeliveryMethod,
  parseScheduleTimes,
  OPERATION_TYPE_TO_DB,
  DB_TO_OPERATION_LABEL,
  STATUS_ALIASES,
  generateUuid,
  normalizeStatus,
  resolveNextOrderCode,
  resolveOrderItems,
  ORDER_ROW_COLUMNS,
  findOrderRowByIdOrNumber,
  normalizeAgentOrderIdentifier,
  upsertCustomerForAgent,
  searchCustomersForAgent,
  searchCollaboratorsForAgent,
  updateOrderOperationForAgent,
};

export async function createOrderOperationForAgent(
  supabase: any,
  input: CreateAgentOrderOperationInput
) {
  const rawType = String(input.tipoOperacao || 'venda').trim().toLowerCase();
  const dbOrderType = OPERATION_TYPE_TO_DB[rawType];
  if (!dbOrderType) {
    throw new Error(
      'Tipo de operação inválido. Use "venda", "orcamento", "assistencia" ou "devolucao".'
    );
  }

  const customerName = input.clienteNome?.trim();
  if (!customerName) {
    throw new Error('O nome do cliente é obrigatório para criar a operação.');
  }

  if (input.dataAgendamento && !/^\d{4}-\d{2}-\d{2}$/.test(input.dataAgendamento)) {
    throw new Error('A data de agendamento deve estar no formato AAAA-MM-DD.');
  }

  const resolvedStatus = normalizeStatus(
    input.status,
    dbOrderType,
    Boolean(input.dataAgendamento)
  );
  const deliveryMethod = normalizeDeliveryMethod(input.modalidadeEntrega);
  const { startTime: schedStart, endTime: schedEnd } = parseScheduleTimes(
    input.horarioAgendamento,
    input.horarioInicio,
    input.horarioFim
  );
  const items = await resolveOrderItems(supabase, input.itens || []);
  const itemsSubtotal = items.reduce(
    (acc, it) => acc + Number(it.unitPrice || 0) * Number(it.quantity || 1),
    0
  );
  const itemsDiscount = items.reduce(
    (acc, it) => acc + Number(it.unitDiscount || 0) * Number(it.quantity || 1),
    0
  );
  const generalDiscount = Math.max(
    0,
    Number(input.descontoTotal ?? input.descontoGeral ?? input.desconto ?? 0) || 0
  );
  const totalDiscount = itemsDiscount + generalDiscount;
  const shippingValue = Math.max(0, Number(input.valorFrete ?? 0) || 0);
  const totalOrderValue = Math.max(0, itemsSubtotal - totalDiscount + shippingValue);
  const totalCost = items.reduce((acc, it) => acc + Number(it.totalCost || 0), 0);

  const linkedParam = input.pedidoOrigemId?.trim() || input.pedidoVinculadoIdOuNumero?.trim();
  let linkedOrderId: string | null = null;
  if (linkedParam) {
    const linked = await findLinkedOrderReferenceByIdOrNumber(supabase, linkedParam);
    linkedOrderId = linked?.id || linkedParam;
  }

  const orderCode = await resolveNextOrderCode(supabase);
  const orderId = generateUuid();
  const nowIso = new Date().toISOString();

  const payments = buildAgentOrderPayments(input, totalOrderValue, [], nowIso);
  const assistanceItems = buildAgentAssistanceItems(input.itensAssistencia || [], linkedOrderId);

  const orderData: Record<string, any> = {
    orderIndex: orderCode,
    orderNumber: orderCode,
    orderType: dbOrderType,
    status: resolvedStatus,
    date: nowIso,
    seller: input.vendedorNome?.trim() || 'Operador',
    customerData: {
      ...(input.clienteId ? { id: input.clienteId } : {}),
      fullName: customerName,
      phone: input.clienteTelefone?.trim() || '',
      cpfCnpj: input.clienteCpfCnpj?.trim() || '',
      email: input.clienteEmail?.trim() || '',
      fullAddress: input.clienteEndereco
        ? { street: input.clienteEndereco, formattedAddress: input.clienteEndereco }
        : {},
    },
    items,
    assistanceItems,
    assistanceDescription: input.descricaoAssistencia?.trim() || undefined,
    returnReason: input.motivoDevolucao?.trim() || undefined,
    linkedOrderId: linkedOrderId || undefined,
    returnOrderId: dbOrderType === 'return' ? linkedOrderId || undefined : undefined,
    itemsSummary: {
      totalQuantity: items.reduce((acc, it) => acc + Number(it.quantity || 1), 0),
      itemsSubtotal,
      totalFixedDiscount: totalDiscount,
      itemsTotalValue: Math.max(0, itemsSubtotal - totalDiscount),
      totalItemsCost: totalCost,
    },
    shipping: {
      deliveryMethod,
      value: shippingValue,
      scheduling: {
        date: input.dataAgendamento || '',
        startTime: schedStart || '',
        endTime: schedEnd || '',
        time: schedStart || '',
        type: schedEnd ? 'range' : 'fixed',
        pendingScheduling: !input.dataAgendamento,
        notInformed: !input.dataAgendamento,
      },
    },
    payments,
    paymentsSummary: {
      totalOrderValue,
      totalPaid: 0,
      remainingBalance: totalOrderValue,
    },
    observations: input.observacoes?.trim() || '',
    deleted: false,
  };

  const persistencePayload = {
    order_data: orderData,
    items,
    order_number: String(orderCode),
    order_index: Number(orderCode) || null,
    order_type: dbOrderType,
    status: resolvedStatus,
    customer_id: input.clienteId || null,
    customer_name: customerName,
    seller_name: input.vendedorNome?.trim() || 'Operador',
    total_amount: totalOrderValue,
    scheduled_date: input.dataAgendamento || null,
    scheduled_start_time: schedStart || null,
    scheduled_end_time: schedEnd || null,
    delivery_method: deliveryMethod,
    items_subtotal: itemsSubtotal,
    total_discount: totalDiscount,
    total_cost: totalCost,
    deleted: false,
    linked_order_id: linkedOrderId,
    return_order_id: dbOrderType === 'return' ? linkedOrderId : null,
    updated_at: nowIso,
  };

  let persistedId = orderId;
  let persistedCode = String(orderCode);

  if (typeof supabase.rpc === 'function') {
    const { data: rpcData, error: rpcError } = await supabase.rpc(
      'create_order_with_inventory_transaction',
      {
        p_order_id: orderId,
        p_order_payload: persistencePayload,
        p_items: items,
        p_payments: payments,
      }
    );
    if (rpcError) throw rpcError;
    if (rpcData?.id) persistedId = String(rpcData.id);
    if (rpcData?.order_number || rpcData?.order_index) {
      persistedCode = String(rpcData.order_number ?? rpcData.order_index);
    }
  } else {
    const { data: insData, error: insError } = await supabase
      .from('orders')
      .insert([{ id: orderId, ...persistencePayload }])
      .select('id')
      .single();
    if (insError) throw insError;
    if (insData?.id) persistedId = String(insData.id);
  }

  return {
    id: persistedId,
    codigo: persistedCode,
    tipo: DB_TO_OPERATION_LABEL[dbOrderType] || dbOrderType,
    status: resolvedStatus,
    cliente: customerName,
    valorTotal: totalOrderValue,
    agendamento: {
      data: input.dataAgendamento || null,
      inicio: input.horarioInicio || null,
      fim: input.horarioFim || null,
    },
    quantidadeItens: items.length,
    observacoes: orderData.observations || null,
  };
}
