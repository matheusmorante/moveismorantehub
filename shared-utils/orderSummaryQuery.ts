import { withAbortTimeout } from './withAbortTimeout';

export const ORDER_SUMMARY_COLUMNS = '__orderSummary';

type SummaryClient = { rpc: (name: string, args: any) => PromiseLike<{ data: any; error: any }> };

export async function fetchOrderSummaries(client: SummaryClient, ids: string[], signal?: AbortSignal): Promise<any[]> {
  if (!ids.length) return [];
  const { data, error } = await withAbortTimeout(client.rpc('read_order_summaries', { p_ids: ids }),
    'pedidos:resumos', 15_000, signal);
  if (error) throw error;
  const selected = new Set(ids);
  if (!Array.isArray(data) || data.length > selected.size || data.some((row) => !selected.has(row?.id) || row?.__orderSummary !== true)) {
    throw new Error('A consulta retornou resumos de pedidos inválidos.');
  }
  return data;
}

export const isOrderSummary = (order: any): boolean => Boolean(order?.__orderSummary || order?.order_data?.__orderSummary);
