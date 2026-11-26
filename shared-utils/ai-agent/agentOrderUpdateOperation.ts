import { normalizeFinancialPaymentMethod } from './agentFinancialOperations';
import {
  type AgentAssistanceItemInput,
  type AgentOrderPaymentInput,
  type UpdateAgentOrderOperationInput,
  normalizeDeliveryMethod,
  parseScheduleTimes,
  OPERATION_TYPE_TO_DB,
  DB_TO_OPERATION_LABEL,
  generateUuid,
  normalizeStatus,
  resolveOrderItems,
  findOrderRowForUpdateByIdOrNumber,
} from './agentOrderHelpers';

/** Normaliza lista de pagamentos ou pagamento único informados para criação/edição de operações pelo agente. */
export function buildAgentOrderPayments(
  params: {
    pagamentos?: AgentOrderPaymentInput[];
    formaPagamento?: string;
    parcelas?: number;
  },
  totalOrderValue: number,
  fallbackPayments: any[] = [],
  nowIso: string = new Date().toISOString()
): any[] {
  if (Array.isArray(params.pagamentos) && params.pagamentos.length > 0) {
    return params.pagamentos.map((p) => {
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
  }
  if (params.formaPagamento) {
    return [
      {
        id: generateUuid(),
        method: normalizeFinancialPaymentMethod(params.formaPagamento),
        value: totalOrderValue,
        installments: Math.max(1, Number(params.parcelas ?? 1) || 1),
        date: nowIso.slice(0, 10),
        status: 'pending',
      },
    ];
  }
  return fallbackPayments;
}

/** Mapeia itens de assistência informados ao formato persistido no pedido. */
export function buildAgentAssistanceItems(
  items: AgentAssistanceItemInput[],
  fallbackLinkedOrderId?: string | null
) {
  return items.map((a) => ({
    id: generateUuid(),
    description: a.descricao,
    quantity: Math.max(1, Number(a.quantidade ?? 1) || 1),
    originalOrderId: a.pedidoOriginalId || fallbackLinkedOrderId || undefined,
  }));
}

export async function updateOrderOperationForAgent(
  supabase: any,
  input: UpdateAgentOrderOperationInput
) {
  const target = (input.operacaoId || input.pedidoId || '').trim();
  if (!target) {
    throw new Error('É obrigatório informar o ID ou número do pedido/operação para editar.');
  }

  const currentRow = await findOrderRowForUpdateByIdOrNumber(supabase, target);
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

  const nowIso = new Date().toISOString();
  const existingPayments = Array.isArray(currentData.payments) ? currentData.payments : [];
  const nextPayments = buildAgentOrderPayments(input, totalOrderValue, existingPayments, nowIso);

  const nextOrderData: Record<string, any> = {
    ...currentData,
    orderType: nextType,
    status: nextStatus,
    customerData: nextCustomerData,
    ...(input.vendedorNome !== undefined ? { seller: input.vendedorNome.trim() } : {}),
    items: nextItems,
    ...(input.itensAssistencia !== undefined
      ? { assistanceItems: buildAgentAssistanceItems(input.itensAssistencia) }
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
