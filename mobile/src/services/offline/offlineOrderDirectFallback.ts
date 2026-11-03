import { supabase } from '../supabaseClient';
import type { ConflictReasonCode, SyncQueueItem } from './offlineTypes';

export type RpcResult = {
  success: boolean;
  reason?: ConflictReasonCode;
  server_state?: Record<string, unknown>;
  server_version?: number;
};

export const sendOrderDirectFallback = async (item: SyncQueueItem): Promise<RpcResult> => {
  const { data: currentOrder, error: readError } = await supabase
    .from('orders')
    .select('id, status, order_data')
    .eq('id', item.entityId)
    .maybeSingle();
  if (readError) throw readError;
  if (!currentOrder) {
    return { success: false, reason: 'ENTITY_NOT_FOUND' };
  }

  const currentData =
    currentOrder.order_data && typeof currentOrder.order_data === 'object'
      ? (currentOrder.order_data as Record<string, unknown>)
      : {};
  const serverVersion = Number(
    (currentOrder as any).version ?? currentData.syncVersion ?? item.expectedVersion
  );

  if (currentData.lastSyncEventId === item.idempotencyKey) {
    return {
      success: true,
      server_version: serverVersion,
      server_state: currentOrder as Record<string, unknown>,
    };
  }

  if (serverVersion > item.expectedVersion) {
    return {
      success: false,
      reason: 'VERSION_CONFLICT',
      server_version: serverVersion,
      server_state: currentOrder as Record<string, unknown>,
    };
  }

  const currentStatus = String(currentOrder.status || '').toLowerCase();
  if (['cancelled', 'cancelado'].includes(currentStatus)) {
    return {
      success: false,
      reason: 'ORDER_CANCELLED',
      server_version: serverVersion,
      server_state: currentOrder as Record<string, unknown>,
    };
  }

  const eventType = String((item.payload as any)?.event_type || '');
  if (
    ['fulfilled', 'atendido', 'completed'].includes(currentStatus) &&
    eventType !== 'DELIVERY_FINISH' &&
    eventType !== 'DELIVERY_STEP_BACK' &&
    eventType !== 'DELIVERY_CANCEL'
  ) {
    return {
      success: false,
      reason: 'ORDER_ALREADY_COMPLETED',
      server_version: serverVersion,
      server_state: currentOrder as Record<string, unknown>,
    };
  }

  const patch =
    (item.payload as any)?.order_data_patch &&
    typeof (item.payload as any).order_data_patch === 'object'
      ? ((item.payload as any).order_data_patch as Record<string, unknown>)
      : {};

  const nextVersion = serverVersion + 1;
  const mergedOrderData: Record<string, unknown> = {
    ...currentData,
    ...patch,
    syncVersion: nextVersion,
  };
  for (const [key, val] of Object.entries(patch)) {
    if (val === null) {
      delete mergedOrderData[key];
    }
  }

  const nextStatus =
    typeof patch.status === 'string' && patch.status.trim()
      ? patch.status
      : currentOrder.status;

  const { error: updateError } = await supabase
    .from('orders')
    .update({
      order_data: mergedOrderData,
      status: nextStatus,
      delivery_status: (mergedOrderData.deliveryStatus as string | undefined) ?? null,
    })
    .eq('id', item.entityId);
  if (updateError) throw updateError;

  const finalState = {
    ...currentOrder,
    version: nextVersion,
    status: nextStatus,
    order_data: mergedOrderData,
  } as Record<string, unknown>;

  return {
    success: true,
    server_version: nextVersion,
    server_state: finalState,
  };
};
