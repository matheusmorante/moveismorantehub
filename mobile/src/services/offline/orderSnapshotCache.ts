import { supabase } from '../supabaseClient';
import { OrderRepository } from '../../repositories/OrderRepository';
import { connectivityService } from './connectivityService';
import { withAbortTimeout } from '../../../../shared-utils/withAbortTimeout';
import { isOrderSummary } from '../../../../shared-utils/orderSummaryQuery';
import { isIdentifiedTestArtifact } from '../../../../shared-utils/testArtifactPolicy';

/** Offline operations need complete snapshots; transfer only missing/changed versions. */
let snapshotQueue: Promise<void> = Promise.resolve();
export function refreshOfflineOrderSnapshots(rows: any[], signal?: AbortSignal) {
  const request = snapshotQueue.then(() => refreshSnapshots(rows, signal));
  snapshotQueue = request.catch(() => {});
  return request;
}

async function refreshSnapshots(rows: any[], signal?: AbortSignal) {
  if (signal?.aborted) return;
  if (!connectivityService.connected || !rows.length) return;
  const localById = new Map((await OrderRepository.list()).map((local) => [local.id, local]));
  const missing = rows.filter((row) => {
    if (!row?.id || isIdentifiedTestArtifact(row)) return false;
    const local = localById.get(row.id);
    if (local?.isPendingLocal) return false;
    return !local || isOrderSummary(local.orderData) || !row.updated_at || local.updatedAt !== row.updated_at || (row.version != null && local.version !== row.version);
  });
  for (let offset = 0; offset < missing.length; offset += 100) {
    const ids = missing.slice(offset, offset + 100).map((row) => row.id);
    if (signal?.aborted) return;
    const { data, error } = await withAbortTimeout(supabase.from('orders').select('*').in('id', ids), 'app:atualizar-snapshots-offline', 15_000, signal);
    if (error) throw error;
    if (signal?.aborted) return;
    for (const row of data || []) {
      if (isOrderSummary(row) || isIdentifiedTestArtifact(row)) continue;
      await OrderRepository.saveLocal({
        id: row.id, status: row.status, orderType: row.order_type, customerName: row.customer_name,
        totalAmount: row.total_amount, orderData: row.order_data || {}, version: row.version ?? 1,
        updatedAt: row.updated_at || row.created_at, syncedAt: new Date().toISOString(), isPendingLocal: false,
      }, { preservePending: true });
    }
  }
}
