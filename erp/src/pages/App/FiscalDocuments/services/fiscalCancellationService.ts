import { supabase } from '@/pages/utils/supabaseConfig';
import { mapOrderFromDatabase } from '@/pages/utils/orderMapper';
import { updateOrder } from '@/pages/utils/orderMutationService';
import { processOrderCancellationFiscalEffects } from '@/pages/utils/nfe/nfeService';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';
import { parseNfeApiResponse } from '@/pages/utils/nfe/parseNfeApiResponse';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

export interface ExecuteCancellationParams {
  document: NfeDocumentRecord;
  reason?: string;
  isCancelEvent: boolean;
  productionConfirmed: boolean;
}

export interface CancellationExecutionResult {
  action: string;
  commercialCommitted: boolean;
  error?: string;
  results?: Array<{ documentId: string; environment?: number; action: string; error?: string }>;
  protocolNumber?: string;
  cStat?: string;
  protocolDate?: string;
  xMotivo?: string;
  reconciliationRequired?: boolean;
  draftId?: string | null;
}

export async function executeFiscalCancellation({
  document,
  reason,
  isCancelEvent,
  productionConfirmed,
}: ExecuteCancellationParams): Promise<CancellationExecutionResult> {
  if (['return', 'estorno'].includes(String(document.document_type))) {
    if (document.modelo !== '55' || !isCancelEvent) {
      throw new Error('Este documento exige cancelamento fiscal próprio de NF-e modelo 55.');
    }
    if (document.ambiente === 1 && !productionConfirmed) throw new Error('Confirme explicitamente o cancelamento fiscal em Produção.');
    const auth = await withTimeout(supabase.auth.getSession(), 15_000,
      { data: { session: null }, error: null }, 'cancelamento-fiscal:sessao');
    if (auth.error || !auth.data.session?.access_token) throw new Error('Faça login novamente para cancelar o documento fiscal.');
    const reconcile = (): CancellationExecutionResult => ({ action: 'reconcile', commercialCommitted: false,
      reconciliationRequired: true, error: 'O cancelamento fiscal não foi confirmado. Consulte a SEFAZ antes de nova ação.' });
    let response: Response | null;
    let result: { success?: boolean; pending?: boolean; error?: string; cStat?: string; protocolNumber?: string;
      protocolDate?: string; xMotivo?: string; reconciliationRequired?: boolean };
    try {
      response = await withTimeout<Response | null>(fetch('/api/nfe/cancel', {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${auth.data.session.access_token}` },
        body: JSON.stringify({ documentId: document.id, reason: reason?.trim(), productionConfirmed }),
        signal: AbortSignal.timeout(75_000),
      }), 80_000, null, 'cancelamento-fiscal:evento');
      if (!response) return reconcile();
      result = await parseNfeApiResponse(response, 'Não foi possível confirmar o cancelamento fiscal.');
    } catch { return reconcile(); }
    if (!result || typeof result !== 'object') return reconcile();
    if (result.pending || (result.reconciliationRequired && result.success !== true)) return reconcile();
    if (!response.ok || (result.success !== true && result.error)) throw new Error(result.error || 'Cancelamento fiscal não confirmado pela SEFAZ.');
    if (result.success !== true || !['135', '155'].includes(String(result.cStat)) || !/^\d{15}$/.test(String(result.protocolNumber || ''))) return reconcile();
    return { action: 'cancel', commercialCommitted: false, cStat: result.cStat,
      protocolNumber: result.protocolNumber, protocolDate: result.protocolDate, xMotivo: result.xMotivo,
      reconciliationRequired: result.reconciliationRequired === true };
  }
  if (!document.order_id) {
    throw new Error('Documento fiscal sem pedido vinculado.');
  }

  const { data: orderRow, error: orderError } = await supabase
    .from('orders')
    .select('*')
    .eq('id', document.order_id)
    .maybeSingle();

  if (orderError || !orderRow) {
    throw new Error('Não foi possível carregar o pedido de origem.');
  }

  const order = mapOrderFromDatabase(orderRow);
  const orderStatus = String(order.status || '').toLowerCase();

  if (!['cancelled', 'cancelado'].includes(orderStatus)) {
    await updateOrder(order.id!, { status: 'cancelled' }, order);
  }

  let result;
  try {
    result = await processOrderCancellationFiscalEffects(
      document.order_id,
      String(order.orderIndex || order.orderNumber || document.numero_nfe),
      {
        reason: isCancelEvent && reason ? reason.trim() : undefined,
        productionConfirmed,
        // A ação iniciada em uma linha fiscal trata esta NF específica. As demais
        // notas autorizadas do pedido permanecem disponíveis para revisão própria.
        documentId: document.id,
      }
    );
  } catch (error) {
    return {
      action: 'failed',
      commercialCommitted: true,
      error: error instanceof Error ? error.message : 'Falha na tentativa de cancelamento fiscal.',
    };
  }

  return {
    ...result,
    commercialCommitted: true,
  };
}
