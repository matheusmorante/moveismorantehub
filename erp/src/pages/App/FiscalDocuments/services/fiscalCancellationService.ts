import { supabase } from '@/pages/utils/supabaseConfig';
import { mapOrderFromDatabase } from '@/pages/utils/orderMapper';
import { updateOrder } from '@/pages/utils/orderMutationService';
import { processOrderCancellationFiscalEffects } from '@/pages/utils/nfe/nfeService';
import type { NfeDocumentRecord } from '../types/fiscalDocuments.types';

export interface ExecuteCancellationParams {
  document: NfeDocumentRecord;
  reason?: string;
  isCancelEvent: boolean;
  productionConfirmed: boolean;
}

export interface CancellationExecutionResult {
  action: string;
  commercialCommitted: boolean;
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

  const result = await processOrderCancellationFiscalEffects(
    document.order_id,
    String(order.orderIndex || order.orderNumber || document.numero_nfe),
    {
      reason: isCancelEvent && reason ? reason.trim() : undefined,
      productionConfirmed,
    }
  );

  return {
    ...result,
    commercialCommitted: true,
  };
}
