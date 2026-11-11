import { supabase } from '../supabaseClient';
import { isIdentifiedTestArtifact } from '../../../../shared-utils/testArtifactPolicy';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../../utils/aiSummaryHelper';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import {
  getActiveAgentPermissionContext,
  hasAgentActionPermission,
  isPermissionContextEnforced,
  type AgentPermissionContext,
} from '../../../../shared-utils/agentPermissionGuard';
import {
  canAgentViewOperationRow,
  getAgentOperationSearchTypes,
  type AgentOperationSearchType,
} from '../../../../shared-utils/agentOperationPermissions';
import { normalizeAgentOrderIdentifier } from '../../../../shared-utils/agentOrderAndPeopleOperations';

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

function toOperationSummary(
  row: Record<string, any>,
  assemblyKinds: string[],
  options: { redactFinancials?: boolean } = {}
) {
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
    valorTotal: options.redactFinancials
      ? undefined
      : Number(row.total_value ?? row.total_amount ?? data.paymentsSummary?.totalOrderValue ?? 0),
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

export async function searchOrdersAndDeliveries(
  input: OrderDeliverySearchInput,
  permissionContext?: AgentPermissionContext | null
) {
  return searchOperations(input, permissionContext);
}

export async function searchOperations(
  input: OrderDeliverySearchInput,
  permissionContext: AgentPermissionContext | null = getActiveAgentPermissionContext()
) {
  const kind = input.tipo || 'todas';
  const isDate = (value?: string) => !value || /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (!isDate(input.dataInicio) || !isDate(input.dataFim))
    throw new Error('As datas da operação devem estar no formato AAAA-MM-DD.');
  if (input.dataInicio && input.dataFim && input.dataInicio > input.dataFim)
    throw new Error('A data inicial não pode ser posterior à data final.');
  const selectedLimit = normalizeLimit(input.limite);
  const searchTypes = getAgentOperationSearchTypes(kind, permissionContext);
  if (searchTypes.length === 0)
    throw new Error('Seu perfil não tem permissão para consultar este tipo de operação.');
  const selections = await Promise.all(
    searchTypes.map(async (tipo) => {
      const selected = await withAbortTimeout(
        supabase.rpc('search_order_operation_ids', {
          p_filters: { ...input, tipo },
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
      return { tipo, ids: ids as string[] };
    })
  );
  const ids: string[] = [];
  const filtersById = new Map<string, Set<AgentOperationSearchType>>();
  for (let index = 0; ids.length < selectedLimit; index += 1) {
    let added = false;
    for (const selection of selections) {
      const id = selection.ids[index];
      if (!id) continue;
      const filters = filtersById.get(id) || new Set<AgentOperationSearchType>();
      filters.add(selection.tipo);
      filtersById.set(id, filters);
      if (!ids.includes(id)) {
        ids.push(id);
        added = true;
      }
      if (ids.length >= selectedLimit) break;
    }
    if (!added) break;
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
  const options = searchTypes.includes('montagem')
    ? await getHandlingOptions().catch(() => [])
    : [];
  const byId = new Map((data || []).map((row: any) => [String(row.id), row]));
  return ids.flatMap((id: string) => {
    const row: any = byId.get(id);
    if (!row) return [];
    const rowKind = getOperationKind(row);
    const deliveryMethod = String(
      row.delivery_method || getOrderData(row).shipping?.deliveryMethod || getOrderData(row).deliveryMethod || ''
    );
    const matchingFilter = Array.from(filtersById.get(id) || []).find((filter) => {
      if (filter === 'todas') return canAgentViewOperationRow(rowKind, permissionContext);
      if (filter === 'venda') return ['sale', 'venda'].includes(rowKind);
      if (filter === 'orcamento') return ['budget', 'orcamento'].includes(rowKind);
      if (filter === 'assistencia') return ['assistance', 'assistencia'].includes(rowKind);
      if (filter === 'devolucao') return ['return', 'devolucao'].includes(rowKind);
      if (filter === 'entrega' || filter === 'retirada' || filter === 'montagem') {
        return canAgentViewOperationRow(rowKind, permissionContext, {
          logisticsFilter: filter,
          deliveryMethod,
        });
      }
      return false;
    });
    if (!matchingFilter || !canAgentViewOperationRow(rowKind, permissionContext, {
      logisticsFilter:
        matchingFilter === 'entrega' || matchingFilter === 'retirada' || matchingFilter === 'montagem'
          ? matchingFilter
          : undefined,
      deliveryMethod,
    })) return [];

    const redactFinancials =
      isPermissionContextEnforced(permissionContext) &&
      !hasAgentActionPermission('viewOrders', permissionContext) &&
      !hasAgentActionPermission('createEditOrders', permissionContext);
    return [toOperationSummary(row, getAssemblyKinds(row, options), { redactFinancials })];
  });
}

export async function getOrderDeliveryDetails(
  orderId: string,
  options: { logisticsScoped?: boolean } = {},
  permissionContext: AgentPermissionContext | null = getActiveAgentPermissionContext()
): Promise<Record<string, unknown> | null> {
  const cleanTarget = normalizeAgentOrderIdentifier(orderId);
  if (!cleanTarget) throw new Error('Informe um ID ou número de operação completo e válido.');
  const initialResult = await supabase
    .from('orders')
    .select(
      'id, order_number, order_index, status, order_type, customer_name, total_amount, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, delivery_status, order_data, items'
    )
    .eq('id', cleanTarget)
    .or('deleted.is.null,deleted.eq.false')
    .maybeSingle();
  let row = initialResult.data;
  if (initialResult.error) throw initialResult.error;

  if (!row && cleanTarget && !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(cleanTarget)) {
    const num = /^\d+$/.test(cleanTarget) ? Number(cleanTarget) : null;
    const expr = num !== null && Number.isSafeInteger(num)
      ? `order_number.eq.${cleanTarget},order_index.eq.${num}`
      : `order_number.eq.${cleanTarget}`;
    const fallback = await supabase
      .from('orders')
      .select(
        'id, order_number, order_index, status, order_type, customer_name, total_amount, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, delivery_status, order_data, items'
      )
      .or('deleted.is.null,deleted.eq.false')
      .or(expr)
      .maybeSingle();
    if (fallback.error) throw fallback.error;
    row = fallback.data;
  }

  if (!row || isIdentifiedTestArtifact(row)) return null;

  const data = asRecord(row.order_data);
  const customer = asRecord(data.customerData);
  const shipping = asRecord(data.shipping);
  const scheduling = asRecord(shipping.scheduling || data.schedule || data.scheduling);
  const kind = getOperationKind(row);

  const permCtx = permissionContext;
  const deliveryMethod = String(
    row.delivery_method || getOrderData(row).shipping?.deliveryMethod || getOrderData(row).deliveryMethod || ''
  );
  const logisticsFilter = options.logisticsScoped
    ? /pickup|retirada/i.test(deliveryMethod)
      ? 'retirada'
      : 'entrega'
    : undefined;
  if (!canAgentViewOperationRow(kind, permCtx, { logisticsFilter, deliveryMethod })) {
    throw new Error('Seu perfil de acesso não tem permissão para visualizar esta operação.');
  }

  const isLogisticsOnly =
    isPermissionContextEnforced(permCtx) &&
    !hasAgentActionPermission('viewOrders', permCtx) &&
    !hasAgentActionPermission('createEditOrders', permCtx) &&
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
  const rawItems = Array.isArray(data.items) ? data.items : Array.isArray(row.items) ? row.items : [];
  const visibleItems = rawItems.map((item: any) => isLogisticsOnly
    ? {
        nome: item?.name || item?.productName || item?.product_title || item?.description || '',
        quantidade: item?.quantity ?? item?.qty ?? null,
        manuseio: item?.handlingType || item?.handling || null,
      }
    : item
  );

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
      observacoes: data.deliveryObservations || (isLogisticsOnly ? null : data.observations) || null,
    },
    itens: visibleItems,
    itensAssistencia: Array.isArray(data.assistanceItems) ? data.assistanceItems : [],
    pagamentos,
    observacoes: isLogisticsOnly ? null : data.observations || data.notes || null,
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
