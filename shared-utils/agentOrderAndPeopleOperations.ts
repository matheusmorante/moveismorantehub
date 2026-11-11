import { normalizeFinancialPaymentMethod } from './agentFinancialOperations';
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
  normalizeAgentOrderIdentifier,
} from './agentOrderHelpers';
import {
  UpsertAgentCustomerInput,
  upsertCustomerForAgent,
  searchCustomersForAgent,
  searchCollaboratorsForAgent,
} from './agentPeopleOperations';

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
    const linked = await findOrderRowByIdOrNumber(supabase, linkedParam);
    linkedOrderId = linked?.id || linkedParam;
  }

  const orderCode = await resolveNextOrderCode(supabase);
  const orderId = generateUuid();
  const nowIso = new Date().toISOString();

  let payments: any[] = [];
  if (Array.isArray(input.pagamentos) && input.pagamentos.length > 0) {
    payments = input.pagamentos.map((p) => {
      const val = Number(p.valor ?? p.value ?? 0);
      return {
        id: generateUuid(),
        method: normalizeFinancialPaymentMethod(p.metodo || p.method || 'PIX'),
        value: val > 0 ? val : totalOrderValue,
        installments: Math.max(1, Number(p.parcelas ?? p.installments ?? 1) || 1),
        date: p.dataVencimento || p.date || nowIso.slice(0, 10),
        status: p.status || 'pending',
      };
    });
  } else if (input.formaPagamento) {
    payments = [
      {
        id: generateUuid(),
        method: normalizeFinancialPaymentMethod(input.formaPagamento),
        value: totalOrderValue,
        installments: Math.max(1, Number(input.parcelas ?? 1) || 1),
        date: nowIso.slice(0, 10),
        status: 'pending',
      },
    ];
  }

  const assistanceItems = (input.itensAssistencia || []).map((a) => ({
    id: generateUuid(),
    description: a.descricao,
    quantity: Math.max(1, Number(a.quantidade ?? 1) || 1),
    originalOrderId: a.pedidoOriginalId || linkedOrderId || undefined,
  }));

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

export async function updateOrderOperationForAgent(
  supabase: any,
  input: UpdateAgentOrderOperationInput
) {
  const target = (input.operacaoId || input.pedidoId || '').trim();
  if (!target) {
    throw new Error('É obrigatório informar o ID ou número do pedido/operação para editar.');
  }

  const currentRow = await findOrderRowByIdOrNumber(supabase, target);
  if (!currentRow) {
    throw new Error(`Nenhum pedido ou operação encontrado para "${target}".`);
  }

  const orderId = String(currentRow.id);
  const currentData: Record<string, any> =
    currentRow.order_data && typeof currentRow.order_data === 'object'
      ? { ...currentRow.order_data }
      : {};

  const currentType = String(
    currentData.orderType || currentRow.order_type || 'sale'
  ).toLowerCase() as 'sale' | 'budget' | 'assistance' | 'return';
  const nextType = input.tipoOperacao
    ? OPERATION_TYPE_TO_DB[input.tipoOperacao.trim().toLowerCase()] || currentType
    : currentType;

  if (input.dataAgendamento && !/^\d{4}-\d{2}-\d{2}$/.test(input.dataAgendamento)) {
    throw new Error('A data de agendamento deve estar no formato AAAA-MM-DD.');
  }

  const nextScheduleDate =
    input.dataAgendamento !== undefined
      ? input.dataAgendamento
      : currentRow.scheduled_date || currentData.shipping?.scheduling?.date || null;

  const nextStatus = input.status
    ? normalizeStatus(input.status, nextType, Boolean(nextScheduleDate))
    : String(currentRow.status || currentData.status || 'draft');

  if (nextStatus === 'cancelled' && currentRow.status !== 'cancelled') {
    if (typeof supabase?.from === 'function') {
      const { data: activeDocs, error: docError } = await supabase
        .from('nfe_documents')
        .select('id, numero_nfe, serie, modelo, status, chave_acesso')
        .or(`order_id.eq.${orderId},order_id.eq.${currentRow.order_number}`)
        .in('status', ['autorizada', 'homologada', 'processando'])
        .limit(1);

      if (!docError && activeDocs && activeDocs.length > 0) {
        const doc = activeDocs[0];
        throw new Error(
          `O pedido #${currentRow.order_number ?? orderId} possui NF-e modelo ${doc.modelo || '55'} autorizada (Nº ${doc.numero_nfe || 'S/N'}, Chave: ${doc.chave_acesso || doc.id}). ` +
          `Para cancelar este pedido, é obrigatório realizar o cancelamento fiscal ou estorno da NF-e no módulo Fiscal/Vendas antes do cancelamento comercial.`
        );
      }
    }
  }

  const nextCustomerName =
    input.clienteNome?.trim() ||
    currentRow.customer_name ||
    currentData.customerData?.fullName ||
    'Cliente';

  const nextCustomerData = {
    ...(currentData.customerData || {}),
    fullName: nextCustomerName,
    ...(input.clienteTelefone !== undefined ? { phone: input.clienteTelefone.trim() } : {}),
    ...(input.clienteCpfCnpj !== undefined ? { cpfCnpj: input.clienteCpfCnpj.trim() } : {}),
    ...(input.clienteEmail !== undefined ? { email: input.clienteEmail.trim() } : {}),
    ...(input.clienteEndereco !== undefined
      ? {
          fullAddress: {
            ...(currentData.customerData?.fullAddress || {}),
            street: input.clienteEndereco,
            formattedAddress: input.clienteEndereco,
          },
        }
      : {}),
  };

  const nextItems = input.itens
    ? await resolveOrderItems(supabase, input.itens)
    : Array.isArray(currentData.items)
      ? currentData.items
      : Array.isArray(currentRow.items)
        ? currentRow.items
        : [];

  const itemsSubtotal = nextItems.reduce(
    (acc: number, it: any) => acc + Number(it.unitPrice ?? it.price ?? 0) * Number(it.quantity ?? 1),
    0
  );
  const itemsDiscount = nextItems.reduce(
    (acc: number, it: any) => acc + Number(it.unitDiscount ?? 0) * Number(it.quantity ?? 1),
    0
  );
  const rawDiscount =
    input.descontoTotal !== undefined
      ? input.descontoTotal
      : input.descontoGeral !== undefined
        ? input.descontoGeral
        : input.desconto;
  const generalDiscount =
    rawDiscount !== undefined
      ? Math.max(0, Number(rawDiscount) || 0)
      : Math.max(0, Number(currentData.itemsSummary?.totalFixedDiscount || 0) - itemsDiscount);
  const totalDiscount = itemsDiscount + generalDiscount;
  const shippingValue =
    input.valorFrete !== undefined
      ? Math.max(0, Number(input.valorFrete) || 0)
      : Number(currentData.shipping?.value ?? 0) || 0;
  const totalOrderValue =
    input.itens !== undefined ||
    input.valorFrete !== undefined ||
    rawDiscount !== undefined
      ? Math.max(0, itemsSubtotal - totalDiscount + shippingValue)
      : Number(currentRow.total_amount ?? currentData.paymentsSummary?.totalOrderValue ?? 0);

  const nextDeliveryMethod =
    input.modalidadeEntrega !== undefined
      ? normalizeDeliveryMethod(input.modalidadeEntrega)
      : currentRow.delivery_method || currentData.shipping?.deliveryMethod || 'delivery';

  const parsedUpdateTimes = parseScheduleTimes(
    input.horarioAgendamento,
    input.horarioInicio,
    input.horarioFim
  );
  const nextStartTime =
    parsedUpdateTimes.startTime !== null
      ? parsedUpdateTimes.startTime
      : currentRow.scheduled_start_time || currentData.shipping?.scheduling?.startTime || null;
  const nextEndTime =
    parsedUpdateTimes.endTime !== null
      ? parsedUpdateTimes.endTime
      : currentRow.scheduled_end_time || currentData.shipping?.scheduling?.endTime || null;

  let nextPayments = Array.isArray(currentData.payments) ? currentData.payments : [];
  if (Array.isArray(input.pagamentos) && input.pagamentos.length > 0) {
    nextPayments = input.pagamentos.map((p) => {
      const val = Number(p.valor ?? p.value ?? 0);
      return {
        id: generateUuid(),
        method: normalizeFinancialPaymentMethod(p.metodo || p.method || 'PIX'),
        value: val > 0 ? val : totalOrderValue,
        installments: Math.max(1, Number(p.parcelas ?? p.installments ?? 1) || 1),
        date: p.dataVencimento || p.date || new Date().toISOString().slice(0, 10),
        status: p.status || 'pending',
      };
    });
  } else if (input.formaPagamento) {
    nextPayments = [
      {
        id: generateUuid(),
        method: normalizeFinancialPaymentMethod(input.formaPagamento),
        value: totalOrderValue,
        installments: Math.max(1, Number(input.parcelas ?? 1) || 1),
        date: new Date().toISOString().slice(0, 10),
        status: 'pending',
      },
    ];
  }

  const nextOrderData: Record<string, any> = {
    ...currentData,
    orderType: nextType,
    status: nextStatus,
    customerData: nextCustomerData,
    ...(input.vendedorNome !== undefined ? { seller: input.vendedorNome.trim() } : {}),
    items: nextItems,
    ...(input.itensAssistencia !== undefined
      ? {
          assistanceItems: input.itensAssistencia.map((a) => ({
            id: generateUuid(),
            description: a.descricao,
            quantity: Math.max(1, Number(a.quantidade ?? 1) || 1),
            originalOrderId: a.pedidoOriginalId,
          })),
        }
      : {}),
    ...(input.descricaoAssistencia !== undefined
      ? { assistanceDescription: input.descricaoAssistencia.trim() }
      : {}),
    ...(input.motivoDevolucao !== undefined
      ? { returnReason: input.motivoDevolucao.trim() }
      : {}),
    ...(input.observacoes !== undefined ? { observations: input.observacoes.trim() } : {}),
    shipping: {
      ...(currentData.shipping || {}),
      deliveryMethod: nextDeliveryMethod,
      value: shippingValue,
      scheduling: {
        ...(currentData.shipping?.scheduling || {}),
        date: nextScheduleDate || '',
        startTime: nextStartTime || '',
        endTime: nextEndTime || '',
        time: nextStartTime || '',
        pendingScheduling: !nextScheduleDate,
        notInformed: !nextScheduleDate,
      },
    },
    itemsSummary: {
      ...(currentData.itemsSummary || {}),
      itemsSubtotal,
      totalFixedDiscount: totalDiscount,
      itemsTotalValue: Math.max(0, itemsSubtotal - totalDiscount),
    },
    payments: nextPayments,
    paymentsSummary: {
      ...(currentData.paymentsSummary || {}),
      totalOrderValue,
    },
  };

  const nowIso = new Date().toISOString();
  const updatePayload = {
    order_data: nextOrderData,
    items: nextItems,
    order_number: String(currentRow.order_number ?? currentData.orderIndex ?? ''),
    order_index: currentRow.order_index ?? (Number(currentRow.order_number) || null),
    order_type: nextType,
    status: nextStatus,
    customer_id: currentRow.customer_id || nextCustomerData.id || null,
    customer_name: nextCustomerName,
    seller_name: input.vendedorNome?.trim() || currentRow.seller_name || currentData.seller || null,
    total_amount: totalOrderValue,
    scheduled_date: nextScheduleDate || null,
    scheduled_start_time: nextStartTime || null,
    scheduled_end_time: nextEndTime || null,
    delivery_method: nextDeliveryMethod,
    items_subtotal: itemsSubtotal,
    total_discount: totalDiscount,
    updated_at: nowIso,
  };

  if (typeof supabase.rpc === 'function') {
    const { error: rpcError } = await supabase.rpc('create_order_with_inventory_transaction', {
      p_order_id: orderId,
      p_order_payload: updatePayload,
      p_items: nextItems,
      p_payments: nextPayments,
      p_is_update: true,
    });
    if (rpcError) throw rpcError;
  } else {
    const { error: updError } = await supabase
      .from('orders')
      .update(updatePayload)
      .eq('id', orderId);
    if (updError) throw updError;
  }

  return {
    id: orderId,
    codigo: String(currentRow.order_number ?? currentData.orderIndex ?? ''),
    tipo: DB_TO_OPERATION_LABEL[nextType] || nextType,
    status: nextStatus,
    cliente: nextCustomerName,
    valorTotal: totalOrderValue,
    agendamento: {
      data: nextScheduleDate || null,
      inicio: nextStartTime || null,
      fim: nextEndTime || null,
    },
    quantidadeItens: nextItems.length,
    observacoes: nextOrderData.observations || null,
  };
}
