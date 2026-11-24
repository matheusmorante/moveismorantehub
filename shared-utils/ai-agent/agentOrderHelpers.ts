import { isIdentifiedTestArtifact } from '../testArtifactPolicy';

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

const ORDER_ITEM_PRODUCT_COLUMNS =
  'id, code, sku, name, unit_price, price, cost_price, product_variations(id,sku)';
const ORDER_ITEM_PRODUCT_BATCH_SIZE = 25;
const ORDER_ITEM_PRODUCT_BATCH_RESULT_LIMIT = 100;

const canBatchOrderItemCode = (value: string) =>
  /^[a-z\d_-]+$/i.test(value) && !/^(null|true|false)$/i.test(value);

async function findProductForOrderItem(supabase: any, code: string) {
  try {
    const { data } = await supabase
      .from('products')
      .select(ORDER_ITEM_PRODUCT_COLUMNS)
      .eq('deleted', false)
      .or(`code.eq.${code},sku.eq.${code}`)
      .maybeSingle();
    return data || null;
  } catch {
    return null;
  }
}

async function findProductsForOrderItemsInBatches(
  supabase: any,
  codes: string[]
): Promise<Map<string, any | null>> {
  const productsByCode = new Map<string, any | null>();

  for (let offset = 0; offset < codes.length; offset += ORDER_ITEM_PRODUCT_BATCH_SIZE) {
    const batchCodes = codes.slice(offset, offset + ORDER_ITEM_PRODUCT_BATCH_SIZE);
    const fallbackToIndividualLookups = async () => {
      for (const code of batchCodes) {
        productsByCode.set(code, await findProductForOrderItem(supabase, code));
      }
    };

    let rows: any[];
    try {
      const filterValues = batchCodes.join(',');
      const { data, error } = await supabase
        .from('products')
        .select(ORDER_ITEM_PRODUCT_COLUMNS)
        .eq('deleted', false)
        .or(`code.in.(${filterValues}),sku.in.(${filterValues})`)
        .limit(ORDER_ITEM_PRODUCT_BATCH_RESULT_LIMIT);

      if (error || !Array.isArray(data)) {
        await fallbackToIndividualLookups();
        continue;
      }

      // A full page might hide additional matches and make an ambiguous code look unique.
      if (data.length >= ORDER_ITEM_PRODUCT_BATCH_RESULT_LIMIT) {
        await fallbackToIndividualLookups();
        continue;
      }

      rows = data;
    } catch {
      await fallbackToIndividualLookups();
      continue;
    }

    const matchesByCode = new Map<string, Map<unknown, any>>(
      batchCodes.map((code) => [code, new Map<unknown, any>()])
    );

    for (const product of rows) {
      const matchingCodes = new Set([product?.code, product?.sku]);
      for (const value of matchingCodes) {
        const matches = typeof value === 'string' ? matchesByCode.get(value) : undefined;
        if (matches) matches.set(product?.id ?? product, product);
      }
    }

    for (const code of batchCodes) {
      const matches = Array.from(matchesByCode.get(code)?.values() || []);
      if (matches.length !== 1) {
        productsByCode.set(code, null);
        continue;
      }

      const product = matches[0];
      if (Array.isArray(product.product_variations) && product.product_variations.length > 1) {
        // The legacy path uses the first variation, but its relation has no explicit order.
        productsByCode.set(code, await findProductForOrderItem(supabase, code));
      } else {
        productsByCode.set(code, product);
      }
    }
  }

  return productsByCode;
}

export async function resolveOrderItems(
  supabase: any,
  rawItems: AgentOrderItemInput[] = [],
  defaultHandling?: string
) {
  const resolvedItems: any[] = [];
  const identifiedCodes = rawItems
    .map((item) => item.codigoOuSku?.trim() || '')
    .filter(Boolean);
  const batchedCodes = identifiedCodes.length >= 3 && typeof supabase?.from === 'function'
    ? Array.from(new Set(identifiedCodes.filter(canBatchOrderItemCode)))
    : [];
  const batchedProducts = batchedCodes.length > 0
    ? await findProductsForOrderItemsInBatches(supabase, batchedCodes)
    : new Map<string, any | null>();

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
      const prod = batchedProducts.has(code)
        ? batchedProducts.get(code)
        : await findProductForOrderItem(supabase, code);

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
const ORDER_LINK_REFERENCE_COLUMNS = 'id, order_data';
const ORDER_EDIT_ROW_COLUMNS =
  'id, order_data, order_type, status, customer_name, total_amount, scheduled_date, scheduled_start_time, scheduled_end_time, delivery_method, order_number, order_index, customer_id, seller_name, items';

export const normalizeAgentOrderIdentifier = (value: string): string | null => {
  const clean = value.trim().replace(/^#/, '');
  return /^[a-z\d_-]{1,64}$/i.test(clean) ? clean : null;
};

async function findOrderRowByIdOrNumberWithProjection(
  supabase: any,
  idOrNumber: string,
  columns: string,
) {
  const clean = normalizeAgentOrderIdentifier(idOrNumber);
  if (!clean) return null;

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(clean);
  if (isUuid) {
    const { data, error } = await supabase
      .from('orders')
      .select(columns)
      .eq('id', clean)
      .or('deleted.is.null,deleted.eq.false')
      .maybeSingle();
    if (error) throw error;
    if (data && !isIdentifiedTestArtifact(data)) return data;
    return null;
  }

  const numericCode = /^\d+$/.test(clean) ? Number(clean) : null;
  const filterExpr = numericCode !== null && Number.isSafeInteger(numericCode)
    ? `order_number.eq.${clean},order_index.eq.${numericCode}`
    : `order_number.eq.${clean}`;

  const { data, error } = await supabase
    .from('orders')
    .select(columns)
    .or('deleted.is.null,deleted.eq.false')
    .or(filterExpr)
    .maybeSingle();
  if (error) throw error;
  if (!data || isIdentifiedTestArtifact(data)) return null;
  return data;
}

export async function findOrderRowByIdOrNumber(supabase: any, idOrNumber: string) {
  return findOrderRowByIdOrNumberWithProjection(supabase, idOrNumber, ORDER_ROW_COLUMNS);
}

export async function findOrderRowForUpdateByIdOrNumber(supabase: any, idOrNumber: string) {
  return findOrderRowByIdOrNumberWithProjection(supabase, idOrNumber, ORDER_EDIT_ROW_COLUMNS);
}

export async function findLinkedOrderReferenceByIdOrNumber(supabase: any, idOrNumber: string) {
  const row = await findOrderRowByIdOrNumberWithProjection(
    supabase,
    idOrNumber,
    ORDER_LINK_REFERENCE_COLUMNS,
  );
  return row ? { id: row.id } : null;
}
