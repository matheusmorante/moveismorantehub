import { isIdentifiedTestArtifact } from './testArtifactPolicy';

export interface AgentOrderItemInput {
  codigoOuSku?: string;
  nome?: string;
  descricao?: string;
  quantidade?: number;
  precoUnitario?: number;
  descontoUnitario?: number;
  manuseio?: string;
  tipoAcao?: 'venda' | 'troca' | 'assistencia' | 'devolucao';
}

export interface AgentAssistanceItemInput {
  descricao: string;
  quantidade?: number;
  pedidoOriginalId?: string;
}

export interface AgentOrderPaymentInput {
  metodo?: string;
  method?: string;
  valor?: number;
  value?: number;
  parcelas?: number;
  installments?: number;
  dataVencimento?: string;
  date?: string;
  status?: string;
}

export interface CreateAgentOrderOperationInput {
  tipoOperacao: 'venda' | 'orcamento' | 'assistencia' | 'devolucao';
  clienteNome: string;
  clienteId?: string;
  clienteTelefone?: string;
  clienteCpfCnpj?: string;
  clienteEmail?: string;
  clienteEndereco?: string;
  vendedorNome?: string;
  status?: string;
  modalidadeEntrega?: 'delivery' | 'pickup' | 'entrega' | 'retirada' | string;
  dataAgendamento?: string;
  horarioInicio?: string;
  horarioFim?: string;
  horarioAgendamento?: string;
  itens?: AgentOrderItemInput[];
  itensAssistencia?: AgentAssistanceItemInput[];
  descricaoAssistencia?: string;
  pedidoVinculadoIdOuNumero?: string;
  pedidoOrigemId?: string;
  motivoDevolucao?: string;
  valorFrete?: number;
  desconto?: number;
  descontoGeral?: number;
  descontoTotal?: number;
  formaPagamento?: string;
  parcelas?: number;
  pagamentos?: AgentOrderPaymentInput[];
  observacoes?: string;
}

export interface UpdateAgentOrderOperationInput extends Partial<CreateAgentOrderOperationInput> {
  operacaoId?: string;
  pedidoId?: string;
}

export const normalizeDeliveryMethod = (raw?: string): 'delivery' | 'pickup' => {
  if (!raw) return 'delivery';
  const clean = raw.trim().toLowerCase();
  if (
    clean === 'retirada' ||
    clean === 'pickup' ||
    clean === 'loja' ||
    clean === 'balcao' ||
    clean === 'balcão'
  ) {
    return 'pickup';
  }
  return 'delivery';
};

export const parseScheduleTimes = (
  horarioAgendamento?: string,
  explicitInicio?: string,
  explicitFim?: string
): { startTime: string | null; endTime: string | null } => {
  if (explicitInicio) {
    return { startTime: explicitInicio, endTime: explicitFim || null };
  }
  if (!horarioAgendamento?.trim()) {
    return { startTime: null, endTime: null };
  }
  const clean = horarioAgendamento.trim();
  if (/manh[aã]/i.test(clean)) {
    return { startTime: '08:00', endTime: '12:00' };
  }
  if (/tarde/i.test(clean)) {
    return { startTime: '13:00', endTime: '18:00' };
  }
  const rangeMatch = clean.match(/(\d{1,2}(?::\d{2})?)\s*(?:-|às|as|ate|até)\s*(\d{1,2}(?::\d{2})?)/i);
  if (rangeMatch) {
    const formatTime = (t: string) => (t.includes(':') ? t : `${t.padStart(2, '0')}:00`);
    return { startTime: formatTime(rangeMatch[1]), endTime: formatTime(rangeMatch[2]) };
  }
  const singleMatch = clean.match(/(\d{1,2}(?::\d{2})?)/);
  if (singleMatch) {
    const t = singleMatch[1];
    return { startTime: t.includes(':') ? t : `${t.padStart(2, '0')}:00`, endTime: null };
  }
  return { startTime: clean, endTime: null };
};

export const OPERATION_TYPE_TO_DB: Record<string, 'sale' | 'budget' | 'assistance' | 'return'> = {
  venda: 'sale',
  sale: 'sale',
  orcamento: 'budget',
  orçamento: 'budget',
  budget: 'budget',
  assistencia: 'assistance',
  assistência: 'assistance',
  assistance: 'assistance',
  devolucao: 'return',
  devolução: 'return',
  return: 'return',
};

export const DB_TO_OPERATION_LABEL: Record<string, string> = {
  sale: 'pedido de venda',
  budget: 'orçamento',
  assistance: 'assistência',
  return: 'devolução',
};

export const STATUS_ALIASES: Record<string, string> = {
  rascunho: 'draft',
  draft: 'draft',
  agendado: 'scheduled',
  agendada: 'scheduled',
  scheduled: 'scheduled',
  atendido: 'fulfilled',
  concluido: 'fulfilled',
  concluído: 'fulfilled',
  entregue: 'fulfilled',
  fulfilled: 'fulfilled',
  cancelar: 'cancelled',
  cancela: 'cancelled',
  cancelamento: 'cancelled',
  cancelado: 'cancelled',
  cancelada: 'cancelled',
  cancelled: 'cancelled',
  canceled: 'cancelled',
  orcado: 'quoted',
  orçado: 'quoted',
  cotado: 'quoted',
  quoted: 'quoted',
};

export const generateUuid = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
  });
};

export const normalizeStatus = (
  rawStatus: string | undefined,
  dbOrderType: 'sale' | 'budget' | 'assistance' | 'return',
  hasScheduleDate: boolean
): string => {
  if (rawStatus) {
    const mapped = STATUS_ALIASES[rawStatus.trim().toLowerCase()] || rawStatus.trim().toLowerCase();
    if (mapped === 'quoted' && dbOrderType !== 'budget') {
      return 'draft';
    }
    return mapped;
  }
  if (dbOrderType === 'budget') return 'quoted';
  if (hasScheduleDate) return 'scheduled';
  return 'draft';
};

export async function resolveNextOrderCode(supabase: any): Promise<string> {
  try {
    if (typeof supabase.rpc === 'function') {
      const { data, error } = await supabase.rpc('get_next_order_index');
      if (!error && data !== null && data !== undefined) {
        return String(data);
      }
    }
  } catch {
    // Fallback
  }
  return String(Math.floor(100000 + Math.random() * 900000));
}

export async function resolveOrderItems(
  supabase: any,
  rawItems: AgentOrderItemInput[] = [],
  defaultHandling?: string
) {
  const resolvedItems: any[] = [];
  for (const item of rawItems) {
    const quantity = Math.max(1, Number(item.quantidade ?? 1) || 1);
    let unitPrice = Number(item.precoUnitario ?? 0) || 0;
    const unitDiscount = Math.max(0, Number(item.descontoUnitario ?? 0) || 0);
    let productId: string | undefined;
    let variationId: string | undefined;
    let code = item.codigoOuSku?.trim() || '';
    let sku = item.codigoOuSku?.trim() || '';
    let description = item.nome?.trim() || item.descricao?.trim() || 'Item do pedido';
    let costPrice = 0;

    if (code && typeof supabase?.from === 'function') {
      try {
        const { data: prod } = await supabase
          .from('products')
          .select('id, code, sku, name, unit_price, price, cost_price, product_variations(*)')
          .eq('deleted', false)
          .or(`code.eq.${code},sku.eq.${code}`)
          .maybeSingle();

        if (prod) {
          productId = prod.id;
          code = prod.code || code;
          sku = prod.sku || code;
          description = item.nome?.trim() || item.descricao?.trim() || prod.name || description;
          if (!item.precoUnitario) {
            unitPrice = Number(prod.unit_price ?? prod.price ?? 0) || 0;
          }
          costPrice = Number(prod.cost_price ?? 0) || 0;
          if (Array.isArray(prod.product_variations) && prod.product_variations.length > 0) {
            const firstVar = prod.product_variations[0];
            variationId = firstVar.id;
            sku = firstVar.sku || sku;
          }
        }
      } catch {
        // Ignora falha de lookup complementar
      }
    }

    const totalPrice = Math.max(0, (unitPrice - unitDiscount) * quantity);
    resolvedItems.push({
      ...(productId ? { productId } : {}),
      ...(variationId ? { variationId } : {}),
      code,
      sku,
      name: description,
      description,
      quantity,
      unitPrice,
      discountType: 'fixed',
      discountValue: unitDiscount,
      unitDiscount,
      totalPrice,
      unitCost: costPrice,
      totalCost: costPrice * quantity,
      handlingType:
        item.manuseio ||
        (item.tipoAcao === 'troca' ? 'Troca' : defaultHandling) ||
        'Entrega Padrão',
    });
  }
  return resolvedItems;
}

export const ORDER_ROW_COLUMNS =
  'id, order_number, order_index, order_type, status, customer_name, customer_id, seller_name, total_amount, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, order_data, items, linked_order_id, return_order_id, deleted';

export async function findOrderRowByIdOrNumber(supabase: any, idOrNumber: string) {
  const clean = idOrNumber.trim().replace(/^#/, '');
  if (!clean) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  if (isUuid) {
    const { data, error } = await supabase
      .from('orders')
      .select(ORDER_ROW_COLUMNS)
      .eq('id', clean)
      .maybeSingle();
    if (error) throw error;
    if (data && !isIdentifiedTestArtifact(data)) return data;
  }

  const numericCode = Number(clean);
  const filterExpr = Number.isFinite(numericCode)
    ? `order_number.eq.${clean},order_index.eq.${numericCode}`
    : `order_number.eq.${clean}`;

  const { data, error } = await supabase
    .from('orders')
    .select(ORDER_ROW_COLUMNS)
    .or('deleted.is.null,deleted.eq.false')
    .or(filterExpr)
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data || isIdentifiedTestArtifact(data)) return null;
  return data;
}
