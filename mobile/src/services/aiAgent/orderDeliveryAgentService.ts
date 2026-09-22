import { supabase } from '../supabaseClient';
import { isAssemblyInternalType, isAssemblyOutsideType } from '../../utils/aiSummaryHelper';

export type MobileOperationKind =
  | 'todas'
  | 'venda'
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
const normalizeText = (value: unknown): string => String(value ?? '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const asRecord = (value: unknown): Record<string, any> => value && typeof value === 'object' && !Array.isArray(value)
  ? value as Record<string, any>
  : {};

let handlingOptionsCache: any[] | null = null;
let handlingOptionsCacheExpiresAt = 0;

async function getHandlingOptions(): Promise<any[]> {
  if (handlingOptionsCache && Date.now() < handlingOptionsCacheExpiresAt) return handlingOptionsCache;
  const { data, error } = await supabase.from('settings').select('data').limit(1).maybeSingle();
  if (error) throw error;
  const settings = asRecord(data?.data ?? data);
  handlingOptionsCache = [
    ...(Array.isArray(settings.deliveryHandlingOptions) ? settings.deliveryHandlingOptions : []),
    ...(Array.isArray(settings.pickupHandlingOptions) ? settings.pickupHandlingOptions : []),
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
  const labels = [row.handling_type, data.handlingType, data.handling, data.deliveryType, shipping.handlingType, shipping.handling]
    .filter(Boolean).map(String);
  const itemHandling = Array.isArray(data.items) ? data.items : (Array.isArray(row.items) ? row.items : []);
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
  const items = Array.isArray(data.items) ? data.items : (Array.isArray(row.items) ? row.items : []);
  const orderData = data;
  const orderHandling = String(row.handling_type || orderData.handlingType || orderData.handling || '');
  const hasInternal = items.length
    ? items.some((item: any) => {
        const handling = String(item?.handlingType || item?.handling || '');
        return handling ? isAssemblyInternalType(handling, options) : isAssemblyInternalType(orderHandling, options);
      })
    : labels.some(label => isAssemblyInternalType(label, options));
  const hasOutside = items.length
    ? items.some((item: any) => {
        const handling = String(item?.handlingType || item?.handling || '');
        return handling ? isAssemblyOutsideType(handling, options) : isAssemblyOutsideType(orderHandling, options);
      })
    : labels.some(label => isAssemblyOutsideType(label, options));
  return [hasInternal ? 'depósito/loja' : null, hasOutside ? 'externa/no endereço' : null].filter(Boolean) as string[];
}

function matchesStatus(row: Record<string, any>, requested?: string): boolean {
  if (!requested?.trim()) return true;
  const target = normalizeText(requested);
  const aliases: Record<string, string[]> = {
    agendado: ['scheduled', 'agendado'], agendada: ['scheduled', 'agendado'],
    concluido: ['fulfilled', 'concluido', 'atendido', 'entregue', 'finalizado'],
    entregue: ['fulfilled', 'concluido', 'atendido', 'entregue', 'finalizado'],
    cancelado: ['cancelled', 'canceled', 'cancelado', 'cancelada', 'estornado'],
    rascunho: ['draft', 'rascunho'], pendente: ['pending', 'pendente'],
  };
  const requestedTerms = aliases[target] || [target];
  const values = [row.status, row.delivery_status, getOrderData(row).deliveryStatus].map(normalizeText);
  return values.some(value => value && requestedTerms.some(term => value.includes(term)));
}

function matchesKind(row: Record<string, any>, kind: MobileOperationKind, assemblyKinds: string[]): boolean {
  const orderKind = getOperationKind(row);
  const method = normalizeText(row.delivery_method || getOrderData(row).shipping?.deliveryMethod || getOrderData(row).deliveryMethod);
  const isPickup = method.includes('retirada') || method.includes('pickup');
  if (kind === 'todas') return true;
  if (kind === 'venda') return ['sale', 'venda'].includes(orderKind);
  if (kind === 'assistencia') return ['assistance', 'assistencia'].includes(orderKind);
  if (kind === 'devolucao') return ['return', 'devolucao'].includes(orderKind);
  if (kind === 'montagem') {
    const data = getOrderData(row);
    const shipping = asRecord(data.shipping);
    const scheduling = asRecord(shipping.scheduling || data.schedule || data.scheduling);
    const date = getScheduleDate(row);
    const pending = Boolean(row.pending_scheduling || scheduling.pendingScheduling || scheduling.notInformed);
    return assemblyKinds.length > 0 && Boolean(date) && !pending;
  }
  if (kind === 'retirada') return !['assistance', 'assistencia', 'return', 'devolucao'].includes(orderKind) && isPickup;
  if (kind === 'entrega') return ['sale', 'venda'].includes(orderKind) && !isPickup;
  return false;
}

function toOperationSummary(row: Record<string, any>, assemblyKinds: string[]) {
  const data = getOrderData(row);
  const customer = asRecord(data.customerData);
  const shipping = asRecord(data.shipping);
  const scheduling = asRecord(shipping.scheduling || data.schedule || data.scheduling);
  const kind = getOperationKind(row);
  const kindLabels: Record<string, string> = {
    sale: 'pedido de venda', assistance: 'assistência', return: 'devolução',
  };
  return {
    id: String(row.id),
    codigo: String(row.order_number ?? data.orderIndex ?? data.order_index ?? ''),
    tipo: kindLabels[kind] || kind,
    status: String(row.status ?? data.status ?? 'pending'),
    cliente: String(row.customer_name || customer.fullName || ''),
    valorTotal: Number(row.total_value ?? row.total_amount ?? data.paymentsSummary?.totalOrderValue ?? 0),
    agendamento: {
      data: getScheduleDate(row),
      inicio: row.schedule_start_time || scheduling.startTime || scheduling.time || null,
      fim: row.schedule_end_time || scheduling.endTime || null,
      pendente: Boolean(row.pending_scheduling || scheduling.pendingScheduling || scheduling.notInformed),
    },
    entrega: {
      modalidade: row.delivery_method || shipping.deliveryMethod || data.deliveryMethod || null,
      status: row.delivery_status || data.deliveryStatus || null,
    },
    montagens: assemblyKinds,
    produtos: (Array.isArray(data.items) ? data.items : Array.isArray(row.items) ? row.items : []).map((item: any) => ({
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
  if (!isDate(input.dataInicio) || !isDate(input.dataFim)) throw new Error('As datas da operação devem estar no formato AAAA-MM-DD.');
  if (input.dataInicio && input.dataFim && input.dataInicio > input.dataFim) throw new Error('A data inicial não pode ser posterior à data final.');
  const selectedLimit = normalizeLimit(input.limite);
  const candidateLimit = kind === 'montagem' || kind === 'todas' || input.status ? 300 : Math.max(selectedLimit * 4, 40);
  let query = supabase.from('orders')
    .select('id, order_number, order_index, status, order_type, customer_name, total_amount, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, delivery_status, deleted, order_data, items')
    .or('deleted.is.null,deleted.eq.false')
    .order(input.dataInicio || input.dataFim ? 'scheduled_date' : 'updated_at', { ascending: Boolean(input.dataInicio || input.dataFim) })
    .limit(candidateLimit);

  const databaseKind = kind === 'venda' ? 'sale' : kind === 'assistencia' ? 'assistance' : kind === 'devolucao' ? 'return' : null;
  if (databaseKind) {
    const legacyKind = kind === 'venda' ? 'venda' : kind === 'assistencia' ? 'assistência' : 'devolução';
    query = query.or(`order_type.eq.${databaseKind},order_data->>orderType.eq.${databaseKind},order_data->>order_type.eq.${databaseKind},order_data->>orderType.eq.${legacyKind},order_data->>order_type.eq.${legacyKind}`);
  }
  if (input.dataInicio) query = query.gte('scheduled_date', input.dataInicio);
  if (input.dataFim) query = query.lte('scheduled_date', input.dataFim);
  if (input.termo?.trim()) {
    const term = input.termo.trim().replace(/[,%()]/g, '');
    if (term) query = query.or(`customer_name.ilike.%${term}%,order_number.ilike.%${term}%`);
  }

  const { data, error } = await query;
  if (error) throw error;

  const options = kind === 'montagem' || kind === 'todas'
    ? await getHandlingOptions().catch(error => {
        console.warn('[MobileAgent] Configurações de montagem indisponíveis; usando os padrões de manuseio.', error);
        return [];
      })
    : [];
  const results = (data || []).map((row: Record<string, any>) => {
    const assemblies = getAssemblyKinds(row, options);
    return { row, assemblies };
  }).filter(({ row, assemblies }: { row: Record<string, any>; assemblies: string[] }) =>
    matchesKind(row, kind, assemblies) && matchesStatus(row, input.status) && (
      Boolean(input.status?.trim()) || !['draft', 'rascunho', 'cancelled', 'canceled', 'cancelado', 'cancelada'].includes(normalizeText(row.status))
    )
  );

  return results.slice(0, selectedLimit).map(({ row, assemblies }: { row: Record<string, any>; assemblies: string[] }) =>
    toOperationSummary(row, assemblies)
  );
}

export async function getOrderDeliveryDetails(orderId: string): Promise<Record<string, unknown> | null> {
  const { data: row, error } = await supabase.from('orders')
    .select('id, order_number, order_index, status, order_type, customer_name, total_amount, created_at, updated_at, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, delivery_status, order_data, items')
    .eq('id', orderId)
    .or('deleted.is.null,deleted.eq.false')
    .maybeSingle();
  if (error) throw error;
  if (!row) return null;

  const data = asRecord(row.order_data);
  const customer = asRecord(data.customerData);
  const shipping = asRecord(data.shipping);
  const scheduling = asRecord(shipping.scheduling || data.schedule || data.scheduling);
  return {
    id: String(row.id),
    codigo: String(row.order_number ?? data.orderIndex ?? data.order_index ?? ''),
    tipo: getOperationKind(row),
    status: row.status || data.status || 'pending',
    cliente: {
      nome: row.customer_name || customer.fullName || '',
      telefone: customer.phone || customer.phoneNumber || null,
      endereco: customer.fullAddress || customer.address || null,
    },
    valorTotal: Number(row.total_amount ?? data.paymentsSummary?.totalOrderValue ?? 0),
    dataPedido: row.created_at || data.createdAt || data.date || null,
    agendamento: {
      data: row.scheduled_date || scheduling.date || data.scheduledDate || null,
      inicio: row.scheduled_start_time || scheduling.startTime || scheduling.time || null,
      fim: row.scheduled_end_time || scheduling.endTime || null,
      pendente: Boolean(scheduling.pendingScheduling || scheduling.notInformed || data.pendingScheduling),
    },
    entrega: {
      modalidade: row.delivery_method || shipping.deliveryMethod || data.deliveryMethod || null,
      status: row.delivery_status || data.deliveryStatus || null,
      observacoes: data.deliveryObservations || data.observations || null,
    },
    itens: Array.isArray(data.items) ? data.items : Array.isArray(row.items) ? row.items : [],
    itensAssistencia: Array.isArray(data.assistanceItems) ? data.assistanceItems : [],
    pagamentos: data.paymentsSummary || data.payments || [],
    observacoes: data.observations || data.notes || null,
    devolucao: getOperationKind(row) === 'return' ? {
      motivo: data.returnReason || data.reason || null,
      estoqueProcessado: data.returnStockProcessed ?? null,
      pedidoVinculado: data.linkedOrderId || data.returnOrderId || null,
    } : null,
  };
}
