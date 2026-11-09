import { supabase } from '../supabaseClient';
import { isIdentifiedTestArtifact } from '../../../../shared-utils/testArtifactPolicy';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../../utils/aiSummaryHelper';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import {
  getActiveAgentPermissionContext,
  hasAgentActionPermission,
  isPermissionContextEnforced,
} from '../../../../shared-utils/agentPermissionGuard';

export type MobileOperationKind =
  | 'todas'
  | 'venda'
  | 'orcamento'
  | 'entrega'
  | 'retirada'
  | 'assistencia'
  | 'devolucao'
  | 'montagem';

export interface OrderDeliverySearchInput {
  termo?: string;
  dataInicio?: string;
  dataFim?: string;
  status?: string;
  tipo?: MobileOperationKind;
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

let handlingOptionsCache: any[] | null = null;
let handlingOptionsCacheExpiresAt = 0;

async function getHandlingOptions(): Promise<any[]> {
  if (handlingOptionsCache && Date.now() < handlingOptionsCacheExpiresAt)
    return handlingOptionsCache;
  const { data, error } = await supabase
    .from('settings')
    .select('delivery:data->deliveryHandlingOptions,pickup:data->pickupHandlingOptions')
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  const settings = asRecord(data);
  handlingOptionsCache = [
    ...(Array.isArray(settings.delivery) ? settings.delivery : []),
    ...(Array.isArray(settings.pickup) ? settings.pickup : []),
  ];
  handlingOptionsCacheExpiresAt = Date.now() + 5 * 60 * 1000;
  return handlingOptionsCache;
}

function getOrderData(row: Record<string, any>): Record<string, any> {
  return asRecord(row.order_data);
}

function getOperationKind(row: Record<string, any>): string {
  const data = getOrderData(row);
  return normalizeText(data.orderType || data.order_type || row.order_type || 'sale');
}

function getScheduleDate(row: Record<string, any>): string | null {
  const data = getOrderData(row);
  const shipping = asRecord(data.shipping);
  const schedule = asRecord(shipping.scheduling || data.schedule || data.scheduling);
  const date = row.scheduled_date || schedule.date || schedule.startDate || data.scheduledDate;
  return date ? String(date).slice(0, 10) : null;
}

function getHandlingLabels(row: Record<string, any>): string[] {
  const data = getOrderData(row);
  const shipping = asRecord(data.shipping);
  const labels = [
    row.handling_type,
    data.handlingType,
    data.handling,
    data.deliveryType,
    shipping.handlingType,
    shipping.handling,
  ]
    .filter(Boolean)
    .map(String);
  const itemHandling = Array.isArray(data.items)
    ? data.items
    : Array.isArray(row.items)
      ? row.items
      : [];
  for (const item of itemHandling) {
    const handling = asRecord(item);
    const label = handling.handlingType || handling.handling;
    if (label) labels.push(String(label));
  }
  return [...new Set(labels)];
}

function getAssemblyKinds(row: Record<string, any>, options: any[]): string[] {
  const labels = getHandlingLabels(row);
  const data = getOrderData(row);
  const items = Array.isArray(data.items) ? data.items : Array.isArray(row.items) ? row.items : [];
  const orderData = data;
  const orderHandling = String(
    row.handling_type || orderData.handlingType || orderData.handling || ''
  );
  const hasInternal = items.length
    ? items.some((item: any) => {
        const handling = String(item?.handlingType || item?.handling || '');
        return handling
          ? isAssemblyInternalType(handling, options)
          : isAssemblyInternalType(orderHandling, options);
      })
    : labels.some((label) => isAssemblyInternalType(label, options));
  const hasOutside = items.length
    ? items.some((item: any) => {
        const handling = String(item?.handlingType || item?.handling || '');
        return handling
          ? isAssemblyOutsideType(handling, options)
          : isAssemblyOutsideType(orderHandling, options);
      })
    : labels.some((label) => isAssemblyOutsideType(label, options));
  return [hasInternal ? 'depósito/loja' : null, hasOutside ? 'externa/no endereço' : null].filter(
    Boolean
  ) as string[];
}

function toOperationSummary(row: Record<string, any>, assemblyKinds: string[]) {
  const data = getOrderData(row);
  const customer = asRecord(data.customerData);
  const shipping = asRecord(data.shipping);
  const scheduling = asRecord(shipping.scheduling || data.schedule || data.scheduling);
  const kind = getOperationKind(row);
  const kindLabels: Record<string, string> = {
    sale: 'pedido de venda',
    budget: 'orçamento',
    orcamento: 'orçamento',
    assistance: 'assistência',
    return: 'devolução',
  };
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
      data: getScheduleDate(row),
      inicio: row.schedule_start_time || scheduling.startTime || scheduling.time || null,
      fim: row.schedule_end_time || scheduling.endTime || null,
      pendente: Boolean(
        row.pending_scheduling || scheduling.pendingScheduling || scheduling.notInformed
      ),
    },
    entrega: {
      modalidade: row.delivery_method || shipping.deliveryMethod || data.deliveryMethod || null,
      status: row.delivery_status || data.deliveryStatus || null,
    },
    montagens: assemblyKinds,
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

export async function searchOrdersAndDeliveries(input: OrderDeliverySearchInput) {
  return searchOperations(input);
}

export async function searchOperations(input: OrderDeliverySearchInput) {
  const kind = input.tipo || 'todas';
  const isDate = (value?: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isDate(input.dataInicio) || !isDate(input.dataFim))
    throw new Error('As datas da operação devem estar no formato AAAA-MM-DD.');
  if (input.dataInicio && input.dataFim && input.dataInicio > input.dataFim)
    throw new Error('A data inicial não pode ser posterior à data final.');
  const selectedLimit = normalizeLimit(input.limite);
  const selected = await withAbortTimeout(
    supabase.rpc('search_order_operation_ids', {
      p_filters: input,
      p_limit: selectedLimit,
    }),
    'assistente:pesquisar-operacoes',
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
    'assistente:resultados-da-pesquisa',
    15_000
  );
  if (error) throw error;
  const options =
    kind === 'montagem' || kind === 'todas' ? await getHandlingOptions().catch(() => []) : [];
  const byId = new Map((data || []).map((row: any) => [String(row.id), row]));
  return ids.flatMap((id: string) => {
    const row: any = byId.get(id);
    return row ? [toOperationSummary(row, getAssemblyKinds(row, options))] : [];
  });
}

export async function getOrderDeliveryDetails(
  orderId: string
): Promise<Record<string, unknown> | null> {
  const cleanTarget = orderId.trim().replace(/^#/, '');
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
  const kind = getOperationKind(row);

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
