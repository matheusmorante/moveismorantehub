import { supabase } from '@/pages/utils/supabaseConfig';
import { isIdentifiedTestArtifact } from '../../../../shared-utils/testArtifactPolicy';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import {
  createOrderOperationForAgent,
  updateOrderOperationForAgent,
  upsertCustomerForAgent,
  searchCustomersForAgent,
  searchCollaboratorsForAgent,
  type CreateAgentOrderOperationInput,
  type UpdateAgentOrderOperationInput,
  type UpsertAgentCustomerInput,
} from '../../../../shared-utils/agentOrderAndPeopleOperations';
import {
  getActiveAgentPermissionContext,
  hasAgentActionPermission,
  isPermissionContextEnforced,
} from '../../../../shared-utils/agentPermissionGuard';
import type { ToolExecutionResponse } from './geminiAgentTypes';

export type ErpOperationKind =
  | 'todas'
  | 'venda'
  | 'orcamento'
  | 'entrega'
  | 'retirada'
  | 'assistencia'
  | 'devolucao'
  | 'montagem';

export interface ErpOrderOperationSearchInput {
  termo?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  tipo?: ErpOperationKind;
  limite?: number;
}

const normalizeLimit = (value?: number): number => {
  const parsed = Number(value ?? 10);
  return Number.isFinite(parsed) ? Math.min(Math.max(Math.floor(parsed), 1), 20) : 10;
};

const normalizeText = (value: unknown): string =>
  String(value ?? '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

const asRecord = (value: unknown): Record<string, any> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, any>) : {};

function toErpOperationSummary(row: Record<string, any>) {
  const data = asRecord(row.order_data);
  const customer = asRecord(data.customerData);
  const shipping = asRecord(data.shipping);
  const scheduling = asRecord(shipping.scheduling || data.schedule || data.scheduling);
  const kind = normalizeText(data.orderType || data.order_type || row.order_type || 'sale');
  const kindLabels: Record<string, string> = {
    sale: 'pedido de venda',
    budget: 'orçamento',
    orcamento: 'orçamento',
    assistance: 'assistência',
    return: 'devolução',
  };
  const rawDate = row.scheduled_date || scheduling.date || scheduling.startDate || data.scheduledDate;
  return {
    id: String(row.id),
    codigo: String(row.order_number ?? data.orderIndex ?? data.order_index ?? ''),
    tipo: kindLabels[kind] || kind,
    status: String(row.status ?? data.status ?? 'pending'),
    cliente: String(row.customer_name || customer.fullName || ''),
    valorTotal: Number(
      row.total_value ?? row.total_amount ?? data.paymentsSummary?.totalOrderValue ?? 0
    ),
    agendamento: {
      data: rawDate ? String(rawDate).slice(0, 10) : null,
      inicio: row.scheduled_start_time || scheduling.startTime || scheduling.time || null,
      fim: row.scheduled_end_time || scheduling.endTime || null,
      pendente: Boolean(
        row.pending_scheduling || scheduling.pendingScheduling || scheduling.notInformed
      ),
    },
    entrega: {
      modalidade: row.delivery_method || shipping.deliveryMethod || data.deliveryMethod || null,
      status: row.delivery_status || data.deliveryStatus || null,
    },
    produtos: (Array.isArray(data.items)
      ? data.items
      : Array.isArray(row.items)
        ? row.items
        : []
    ).map((item: any) => ({
      nome: item?.name || item?.productName || item?.description || '',
      quantidade: item?.quantity ?? item?.qty ?? null,
      manuseio: item?.handlingType || item?.handling || null,
    })),
  };
}

export async function searchErpOperations(input: ErpOrderOperationSearchInput) {
  const isDate = (value?: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isDate(input.dataInicio) || !isDate(input.dataFim)) {
    throw new Error('As datas da operação devem estar no formato AAAA-MM-DD.');
  }
  if (input.dataInicio && input.dataFim && input.dataInicio > input.dataFim) {
    throw new Error('A data inicial não pode ser posterior à data final.');
  }
  const selectedLimit = normalizeLimit(input.limite);
  const selected = await withAbortTimeout(
    supabase.rpc('search_order_operation_ids', {
      p_filters: input,
      p_limit: selectedLimit,
    }),
    'assistente-erp:pesquisar-operacoes',
    15_000
  );
  if (selected.error) throw selected.error;
  const ids = selected.data?.ids;
  if (
    !Array.isArray(ids) ||
    ids.length > selectedLimit ||
    ids.some((id: unknown) => typeof id !== 'string')
  ) {
    throw new Error('A consulta de operações retornou resultados inválidos.');
  }
  if (!ids.length) return [];
  const { data, error } = await withAbortTimeout(
    supabase
      .from('orders')
      .select(
        'id,order_number,order_index,status,order_type,customer_name,total_amount,created_at,updated_at,scheduled_date,scheduled_start_time,scheduled_end_time,delivery_method,delivery_status,deleted,order_data,items'
      )
      .in('id', ids),
    'assistente-erp:resultados-da-pesquisa',
    15_000
  );
  if (error) throw error;
  const byId = new Map((data || []).map((row: any) => [String(row.id), row]));
  return ids.flatMap((id: string) => {
    const row: any = byId.get(id);
    return row ? [toErpOperationSummary(row)] : [];
  });
}

export async function getErpOperationDetails(
  orderIdOrNumber: string
): Promise<Record<string, unknown> | null> {
  const cleanTarget = orderIdOrNumber.trim().replace(/^#/, '');
  let { data: row, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, order_index, status, order_type, customer_name, total_amount, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, delivery_status, order_data, items'
    )
    .eq('id', cleanTarget)
    .or('deleted.is.null,deleted.eq.false')
    .maybeSingle();
  if (error) throw error;

  if (!row && cleanTarget && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(cleanTarget)) {
    const num = Number(cleanTarget);
    const expr = Number.isFinite(num)
      ? `order_number.eq.${cleanTarget},order_index.eq.${num}`
      : `order_number.eq.${cleanTarget}`;
    const fallback = await supabase
      .from('orders')
      .select(
        'id, order_number, order_index, status, order_type, customer_name, total_amount, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, delivery_status, order_data, items'
      )
      .or('deleted.is.null,deleted.eq.false')
      .or(expr)
      .limit(1)
      .maybeSingle();
    if (!fallback.error && fallback.data) {
      row = fallback.data;
    }
  }

  if (!row || isIdentifiedTestArtifact(row)) return null;

  const data = asRecord(row.order_data);
  const customer = asRecord(data.customerData);
  const shipping = asRecord(data.shipping);
  const scheduling = asRecord(shipping.scheduling || data.schedule || data.scheduling);
  const kind = normalizeText(data.orderType || data.order_type || row.order_type || 'sale');

  const permCtx = getActiveAgentPermissionContext();
  if (isPermissionContextEnforced(permCtx)) {
    if (
      kind === 'budget' &&
      !hasAgentActionPermission('viewBudgets', permCtx) &&
      !hasAgentActionPermission('createEditOrders', permCtx) &&
      !hasAgentActionPermission('viewOrders', permCtx)
    ) {
      throw new Error('Seu perfil de acesso não tem permissão para visualizar detalhes de orçamentos.');
    }
    if (
      kind === 'return' &&
      !hasAgentActionPermission('viewReturns', permCtx) &&
      !hasAgentActionPermission('createEditOrders', permCtx) &&
      !hasAgentActionPermission('viewOrders', permCtx)
    ) {
      throw new Error('Seu perfil de acesso não tem permissão para visualizar detalhes de devoluções.');
    }
    if (
      kind === 'assistance' &&
      !hasAgentActionPermission('viewAssistanceOrders', permCtx) &&
      !hasAgentActionPermission('createEditOrders', permCtx) &&
      !hasAgentActionPermission('viewOrders', permCtx)
    ) {
      throw new Error('Seu perfil de acesso não tem permissão para visualizar detalhes de assistências técnicas.');
    }
  }

  const isLogisticsOnly =
    isPermissionContextEnforced(permCtx) &&
    !hasAgentActionPermission('viewOrders', permCtx) &&
    !hasAgentActionPermission('createEditOrders', permCtx) &&
    !hasAgentActionPermission('viewFinancials', permCtx) &&
    (hasAgentActionPermission('startDelivery', permCtx) ||
      hasAgentActionPermission('viewAssemblyList', permCtx) ||
      hasAgentActionPermission('viewDeliverySchedule', permCtx));

  if (isLogisticsOnly) {
    const deliveryMethod = row.delivery_method || shipping.deliveryMethod || data.deliveryMethod || 'delivery';
    const isPickup = deliveryMethod === 'pickup' || deliveryMethod === 'retirada';
    if (kind === 'budget' || isPickup) {
      throw new Error(
        'Este pedido não possui rota de entrega ou montagem vinculada ao seu escopo de entregador.'
      );
    }
  }

  const valorTotal = isLogisticsOnly
    ? undefined
    : Number(row.total_amount ?? data.paymentsSummary?.totalOrderValue ?? 0);
  const pagamentos = isLogisticsOnly ? undefined : data.paymentsSummary || data.payments || [];

  return {
    id: String(row.id),
    codigo: String(row.order_number ?? data.orderIndex ?? data.order_index ?? ''),
    tipo: kind,
    status: row.status || data.status || 'pending',
    cliente: {
      nome: row.customer_name || customer.fullName || '',
      telefone: customer.phone || customer.phoneNumber || null,
      endereco: customer.fullAddress || customer.address || null,
    },
    valorTotal,
    dataPedido: row.created_at || data.createdAt || data.date || null,
    agendamento: {
      data: row.scheduled_date || scheduling.date || data.scheduledDate || null,
      inicio: row.scheduled_start_time || scheduling.startTime || scheduling.time || null,
      fim: row.scheduled_end_time || scheduling.endTime || null,
      pendente: Boolean(
        scheduling.pendingScheduling || scheduling.notInformed || data.pendingScheduling
      ),
    },
    entrega: {
      modalidade: row.delivery_method || shipping.deliveryMethod || data.deliveryMethod || null,
      status: row.delivery_status || data.deliveryStatus || null,
      observacoes: data.deliveryObservations || data.observations || null,
    },
    itens: Array.isArray(data.items) ? data.items : Array.isArray(row.items) ? row.items : [],
    itensAssistencia: Array.isArray(data.assistanceItems) ? data.assistanceItems : [],
    pagamentos,
    observacoes: data.observations || data.notes || null,
    devolucao:
      kind === 'return'
        ? {
            motivo: data.returnReason || data.reason || null,
            estoqueProcessado: data.returnStockProcessed ?? null,
            pedidoVinculado: data.linkedOrderId || data.returnOrderId || null,
          }
        : null,
  };
}

export const orderAndPeopleAgentTools = {
  async buscarOperacoes(args: ErpOrderOperationSearchInput): Promise<ToolExecutionResponse> {
    try {
      const operations = await searchErpOperations(args);
      return {
        success: true,
        data: operations,
        message: `${operations.length} operação(ões) encontrada(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'OPERATIONS_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar operações.',
      };
    }
  },

  async obterDetalhesOperacao(args: { operacaoId: string }): Promise<ToolExecutionResponse> {
    if (!args?.operacaoId?.trim()) {
      return {
        success: false,
        code: 'INVALID_OPERATION_ID',
        error: 'É necessário informar o ID ou número da operação.',
      };
    }
    try {
      const operation = await getErpOperationDetails(args.operacaoId);
      if (!operation) {
        return {
          success: false,
          code: 'OPERATION_NOT_FOUND',
          error: 'Operação não encontrada.',
        };
      }
      return {
        success: true,
        data: operation,
        message: 'Detalhes da operação carregados.',
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'OPERATION_DETAILS_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar detalhes da operação.',
      };
    }
  },

  async buscarPedidosEntregas(
    args: Omit<ErpOrderOperationSearchInput, 'tipo'>
  ): Promise<ToolExecutionResponse> {
    try {
      const orders = await searchErpOperations({ ...args, tipo: 'entrega' });
      return {
        success: true,
        data: orders,
        message: `${orders.length} pedido(s) ou entrega(s) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_DELIVERY_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar pedidos e entregas.',
      };
    }
  },

  async obterDetalhesPedidoEntrega(args: { pedidoId: string }): Promise<ToolExecutionResponse> {
    if (!args?.pedidoId?.trim()) {
      return {
        success: false,
        code: 'INVALID_ORDER_ID',
        error: 'É necessário informar um ID ou número de pedido válido.',
      };
    }
    try {
      const order = await getErpOperationDetails(args.pedidoId);
      if (!order) {
        return {
          success: false,
          code: 'ORDER_NOT_FOUND',
          error: 'Pedido não encontrado.',
        };
      }
      return {
        success: true,
        data: order,
        message: 'Dados completos do pedido e da entrega encontrados.',
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_DELIVERY_DETAILS_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao carregar os detalhes do pedido.',
      };
    }
  },

  async criarPedidoOperacao(args: CreateAgentOrderOperationInput): Promise<ToolExecutionResponse> {
    try {
      const created = await createOrderOperationForAgent(supabase, args);
      return {
        success: true,
        data: created,
        message: `${created.tipo.charAt(0).toUpperCase() + created.tipo.slice(1)} #${created.codigo} criado(a) com sucesso para ${created.cliente}.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_OPERATION_CREATE_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao criar pedido/operação.',
      };
    }
  },

  async editarPedidoOperacao(args: UpdateAgentOrderOperationInput): Promise<ToolExecutionResponse> {
    try {
      const updated = await updateOrderOperationForAgent(supabase, args);
      return {
        success: true,
        data: updated,
        message: `${updated.tipo.charAt(0).toUpperCase() + updated.tipo.slice(1)} #${updated.codigo} atualizado(a) com sucesso.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'ORDER_OPERATION_UPDATE_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao atualizar pedido/operação.',
      };
    }
  },

  async buscarClientes(args: { termo: string; limite?: number }): Promise<ToolExecutionResponse> {
    if (!args?.termo || args.termo.trim().length < 2) {
      return {
        success: false,
        code: 'CUSTOMER_SEARCH_TERM_REQUIRED',
        error: 'Informe pelo menos dois caracteres do nome, telefone ou e-mail do cliente.',
      };
    }
    try {
      const customers = await searchCustomersForAgent(supabase, args);
      return {
        success: true,
        data: customers,
        message: `${customers.length} cliente(s) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'CUSTOMER_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar clientes.',
      };
    }
  },

  async criarOuEditarCliente(args: UpsertAgentCustomerInput): Promise<ToolExecutionResponse> {
    try {
      const customer = await upsertCustomerForAgent(supabase, args);
      return {
        success: true,
        data: customer,
        message: `Cliente "${customer.nome}" ${customer.acao} com sucesso.`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'CUSTOMER_UPSERT_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao criar ou atualizar cliente.',
      };
    }
  },

  async buscarColaboradores(args: {
    termo: string;
    limite?: number;
  }): Promise<ToolExecutionResponse> {
    if (!args?.termo || args.termo.trim().length < 2) {
      return {
        success: false,
        code: 'COLLABORATOR_SEARCH_TERM_REQUIRED',
        error: 'Informe pelo menos dois caracteres do nome, e-mail ou cargo do colaborador.',
      };
    }
    try {
      const collaborators = await searchCollaboratorsForAgent(supabase, args);
      return {
        success: true,
        data: collaborators,
        message: `${collaborators.length} colaborador(es) encontrado(s).`,
      };
    } catch (error: unknown) {
      return {
        success: false,
        code: 'COLLABORATOR_SEARCH_ERROR',
        error: error instanceof Error ? error.message : 'Falha ao consultar colaboradores.',
      };
    }
  },
};
