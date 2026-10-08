import { supabase } from '@/pages/utils/supabaseConfig';
import type {
  DraftPayload,
  OperationDraftTransmissionResult,
  ReviewData,
  ReviewedLine,
  ReturnFiscalEligibility,
  ReturnOrderOption,
} from '../types/fiscalOperationDraft.types';

type FiscalApiMethod = 'GET' | 'POST' | 'PUT';
type FiscalApiParser<Result> = (payload: Record<string, unknown>) => Result;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNullableString(value: unknown): value is string | null {
  return value === null || typeof value === 'string';
}

function isNullableNumber(value: unknown): value is number | null {
  return value === null || (typeof value === 'number' && Number.isFinite(value));
}

function isFiscalReturnMethod(value: unknown): value is 'CLIENT_DELIVERED' | 'COMPANY_PICKUP' {
  return value === 'CLIENT_DELIVERED' || value === 'COMPANY_PICKUP';
}

function isReturnOperationContext(value: unknown): boolean {
  return (
    isRecord(value) &&
    typeof value.issuerUf === 'string' &&
    typeof value.recipientUf === 'string' &&
    ['internal', 'interstate', 'foreign'].includes(String(value.scope)) &&
    isFiscalReturnMethod(value.returnMethod) &&
    ['taxpayer', 'non_taxpayer'].includes(String(value.recipientFiscalStatus)) &&
    typeof value.isFinalConsumer === 'boolean' &&
    typeof value.taxRegime === 'string'
  );
}

function isReviewData(value: unknown): value is Partial<ReviewData> {
  if (!isRecord(value)) return false;

  const stringKeys: Array<keyof ReviewData> = [
    'nature_of_operation',
    'reason',
    'recipient_xml',
    'totals_xml',
    'transport_xml',
    'payment_xml',
    'period_adjustment_text',
  ];
  const booleanKeys: Array<keyof ReviewData> = [
    'item_taxes_confirmed',
    'totals_confirmed',
    'apportionment_review_confirmed',
  ];

  return (
    stringKeys.every((key) => value[key] === undefined || typeof value[key] === 'string') &&
    booleanKeys.every((key) => value[key] === undefined || typeof value[key] === 'boolean')
  );
}

function isDraftPayload(value: unknown): value is DraftPayload {
  if (!isRecord(value) || !isRecord(value.draft) || !isRecord(value.source)) return false;
  const { draft, source } = value;
  if (
    typeof draft.id !== 'string' ||
    !['estorno', 'return'].includes(String(draft.operation_kind)) ||
    typeof draft.status !== 'string' ||
    (draft.environment !== 1 && draft.environment !== 2) ||
    typeof draft.original_access_key !== 'string' ||
    (draft.reason !== undefined && !isNullableString(draft.reason)) ||
    (draft.nature_of_operation !== undefined && !isNullableString(draft.nature_of_operation)) ||
    (draft.review_data !== undefined &&
      draft.review_data !== null &&
      !isReviewData(draft.review_data)) ||
    (draft.operation_kind === 'return' &&
      (!isRecord(value.returnOrder) ||
        typeof value.returnOrder.id !== 'string' ||
        !(value.returnOrder.orderIndex === null ||
          (typeof value.returnOrder.orderIndex === 'number' && Number.isFinite(value.returnOrder.orderIndex))) ||
        !isFiscalReturnMethod(value.returnOrder.returnMethod) ||
        !isReturnOperationContext(value.returnOrder.operationContext) ||
        (isRecord(value.returnOrder.operationContext) &&
          value.returnOrder.operationContext.returnMethod !== value.returnOrder.returnMethod))) ||
    typeof source.id !== 'string' ||
    !isNullableString(source.order_id) ||
    (source.modelo !== '55' && source.modelo !== '65') ||
    (source.ambiente !== 1 && source.ambiente !== 2) ||
    typeof source.numero_nfe !== 'number' ||
    typeof source.serie !== 'string' ||
    typeof source.chave_acesso !== 'string' ||
    !Array.isArray(value.lines) ||
    !isRecord(value.reviewTemplate) ||
    (value.lastSefazResult !== undefined &&
      value.lastSefazResult !== null &&
      (!isRecord(value.lastSefazResult) ||
        typeof value.lastSefazResult.cStat !== 'string' ||
        typeof value.lastSefazResult.xMotivo !== 'string'))
  ) {
    return false;
  }

  const validLines = value.lines.every(
    (line) =>
      isRecord(line) &&
      typeof line.id === 'string' &&
      typeof line.fiscal_item_number === 'number' &&
      typeof line.quantity === 'number' &&
      typeof line.gross_value === 'number' &&
      typeof line.discount_value === 'number' &&
      typeof line.originalDescription === 'string' &&
      typeof line.originalProductCode === 'string' &&
      typeof line.originalQuantity === 'number' &&
      typeof line.originalGrossValue === 'number' &&
      typeof line.originalDiscountValue === 'number' &&
      typeof line.originalProductXml === 'string' &&
      typeof line.originalTaxesXml === 'string' &&
      isNullableString(line.suggestedCfop) &&
      (line.allowedCfops === undefined ||
        (Array.isArray(line.allowedCfops) &&
          line.allowedCfops.every(
            (option) =>
              isRecord(option) &&
              typeof option.value === 'string' &&
              typeof option.label === 'string'
          ))) &&
      (line.originalItemNumber === undefined || typeof line.originalItemNumber === 'number') &&
      (line.reviewed_cfop === undefined || isNullableString(line.reviewed_cfop)) &&
      (line.reviewed_product_xml === undefined ||
        isNullableString(line.reviewed_product_xml)) &&
      (line.reviewed_taxes_xml === undefined || isNullableString(line.reviewed_taxes_xml))
  );
  const template = value.reviewTemplate;

  return (
    validLines &&
    ['recipient_xml', 'totals_xml', 'transport_xml', 'payment_xml'].every(
      (key) => typeof template[key] === 'string'
    )
  );
}

async function requestFiscalApi<Result>(
  path: string,
  method: FiscalApiMethod,
  body: Record<string, unknown> | undefined,
  parse: FiscalApiParser<Result>
): Promise<Result> {
  const { data, error } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (error || !token) {
    throw new Error('Faça login novamente para continuar a operação fiscal.');
  }

  const response = await fetch(path, {
    method,
    headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
    ...(body ? { body: JSON.stringify(body) } : {}),
  });
  const payload: unknown = await response.json();
  if (!isRecord(payload)) throw new Error('Resposta inválida da operação fiscal.');

  const isRecoverable = payload.pending === true || payload.retryAllowed === true;
  if (!response.ok && !isRecoverable) {
    throw new Error(
      typeof payload.error === 'string' ? payload.error : 'Falha na operação fiscal.'
    );
  }
  return parse(payload);
}

function parseDraftPayload(payload: Record<string, unknown>): DraftPayload {
  if (!isDraftPayload(payload)) throw new Error('Rascunho fiscal retornou dados inválidos.');
  return payload;
}

function parseDraftId(payload: Record<string, unknown>): { draftId: string } {
  if (typeof payload.draftId !== 'string' || !payload.draftId) {
    throw new Error('A operação fiscal não retornou o identificador do rascunho.');
  }
  return { draftId: payload.draftId };
}

function parseReviewResult(payload: Record<string, unknown>): { status: string } {
  if (typeof payload.status !== 'string') {
    throw new Error('A revisão fiscal não retornou o estado do rascunho.');
  }
  return { status: payload.status };
}

function parseTransmissionResult(
  payload: Record<string, unknown>
): OperationDraftTransmissionResult {
  const booleanKeys = ['retryAllowed', 'pending', 'success', 'reconciliationRequired'] as const;
  const stringKeys = ['error', 'protocolNumber', 'xMotivo'] as const;
  if (
    booleanKeys.some((key) => payload[key] !== undefined && typeof payload[key] !== 'boolean') ||
    stringKeys.some((key) => payload[key] !== undefined && typeof payload[key] !== 'string')
  ) {
    throw new Error('A resposta da transmissão fiscal possui formato inválido.');
  }
  return {
    retryAllowed: typeof payload.retryAllowed === 'boolean' ? payload.retryAllowed : undefined,
    pending: typeof payload.pending === 'boolean' ? payload.pending : undefined,
    success: typeof payload.success === 'boolean' ? payload.success : undefined,
    error: typeof payload.error === 'string' ? payload.error : undefined,
    reconciliationRequired:
      typeof payload.reconciliationRequired === 'boolean'
        ? payload.reconciliationRequired
        : undefined,
    protocolNumber: typeof payload.protocolNumber === 'string' ? payload.protocolNumber : undefined,
    xMotivo: typeof payload.xMotivo === 'string' ? payload.xMotivo : undefined,
  };
}

export async function loadFiscalOperationDraft(draftId: string): Promise<DraftPayload> {
  const path = '/api/nfe/operation-drafts?id=' + encodeURIComponent(draftId);
  return requestFiscalApi(path, 'GET', undefined, parseDraftPayload);
}

function parseReturnFiscalEligibility(payload: Record<string, unknown>): ReturnFiscalEligibility {
  if (
    typeof payload.eligible !== 'boolean' ||
    typeof payload.returnOrderId !== 'string' ||
    typeof payload.hasAuthorizedOriginal !== 'boolean' ||
    !(payload.reason === null || typeof payload.reason === 'string') ||
    !Array.isArray(payload.sources)
  ) {
    throw new Error('A elegibilidade fiscal da devolução retornou dados inválidos.');
  }
  const sources = payload.sources.map((candidate) => {
    if (!isRecord(candidate) || !isRecord(candidate.source) && candidate.source !== null) {
      throw new Error('A elegibilidade fiscal retornou uma NF-e original inválida.');
    }
    const state = String(candidate.state);
    if (
      !['ready', 'draft', 'rejected', 'pending', 'authorized', 'cancelled', 'blocked'].includes(state) ||
      !(candidate.blockReason === null || typeof candidate.blockReason === 'string') ||
      !(candidate.draftId === null || typeof candidate.draftId === 'string') ||
      !(candidate.returnDocumentId === null || typeof candidate.returnDocumentId === 'string') ||
      !Array.isArray(candidate.allocatedItems)
    ) {
      throw new Error('A elegibilidade fiscal retornou um estado inválido.');
    }
    const source = candidate.source;
    if (
      source &&
      (typeof source.id !== 'string' ||
        !(source.order_id === null || typeof source.order_id === 'string') ||
        (source.modelo !== '55' && source.modelo !== '65') ||
        (source.ambiente !== 1 && source.ambiente !== 2) ||
        typeof source.numero_nfe !== 'number' ||
        typeof source.serie !== 'string' ||
        typeof source.chave_acesso !== 'string')
    ) {
      throw new Error('A elegibilidade fiscal retornou dados inconsistentes da NF-e original.');
    }
    const allocatedItems = candidate.allocatedItems.map((item) => {
      if (
        !isRecord(item) ||
        typeof item.returnItemIndex !== 'number' ||
        typeof item.originalItemNumber !== 'number' ||
        typeof item.quantity !== 'number' ||
        typeof item.productCode !== 'string'
      ) {
        throw new Error('A elegibilidade fiscal retornou alocação de itens inválida.');
      }
      return {
        returnItemIndex: item.returnItemIndex,
        originalItemNumber: item.originalItemNumber,
        quantity: item.quantity,
        productCode: item.productCode,
      };
    });
    return {
      source: source as ReturnFiscalEligibility['sources'][number]['source'],
      state: state as ReturnFiscalEligibility['sources'][number]['state'],
      blockReason: candidate.blockReason as string | null,
      draftId: candidate.draftId as string | null,
      returnDocumentId: candidate.returnDocumentId as string | null,
      allocatedItems,
    };
  });
  return {
    eligible: payload.eligible,
    returnOrderId: payload.returnOrderId,
    returnOrderIndex: isNullableNumber(payload.returnOrderIndex) ? payload.returnOrderIndex : undefined,
    linkedSaleOrderId:
      typeof payload.linkedSaleOrderId === 'string' ? payload.linkedSaleOrderId : undefined,
    hasAuthorizedOriginal: payload.hasAuthorizedOriginal,
    reason: payload.reason as string | null,
    sources,
  };
}

export async function fetchReturnFiscalEligibility(
  returnOrderId: string
): Promise<ReturnFiscalEligibility> {
  const path = '/api/nfe/return-fiscal-eligibility?returnOrderId=' + encodeURIComponent(returnOrderId);
  return requestFiscalApi(path, 'GET', undefined, parseReturnFiscalEligibility);
}

export async function createFiscalOperationDraft(
  input: Record<string, unknown>
): Promise<{ draftId: string }> {
  return requestFiscalApi('/api/nfe/operation-drafts', 'POST', input, parseDraftId);
}

export async function saveFiscalOperationDraftReview(input: {
  draftId: string;
  reviewData: ReviewData;
  lines: ReviewedLine[];
}): Promise<{ status: string }> {
  return requestFiscalApi('/api/nfe/operation-drafts', 'PUT', input, parseReviewResult);
}

export async function transmitFiscalOperationDraft(input: {
  draftId: string;
  productionConfirmed: boolean;
}): Promise<OperationDraftTransmissionResult> {
  return requestFiscalApi(
    '/api/nfe/transmit-operation-draft',
    'POST',
    input,
    parseTransmissionResult
  );
}

export async function fetchLinkedReturnOrders(
  sourceOrderId: string | null
): Promise<ReturnOrderOption[]> {
  if (!sourceOrderId) return [];

  const { data, error } = await supabase
    .from('orders')
    .select('id,order_index,linked_order_id,order_data')
    .eq('order_type', 'return')
    .eq('status', 'fulfilled')
    .order('created_at', { ascending: false })
    .limit(200);
  if (error) throw error;

  return (data || [])
    .filter((row) => {
      const orderData = isRecord(row.order_data) ? row.order_data : {};
      return String(row.linked_order_id || orderData.linkedOrderId || '') === sourceOrderId;
    })
    .map((row) => ({
      id: String(row.id),
      order_index: isNullableNumber(row.order_index) ? row.order_index : null,
      linked_order_id: isNullableString(row.linked_order_id) ? row.linked_order_id : null,
      order_data: isRecord(row.order_data) ? row.order_data : null,
    }));
}
