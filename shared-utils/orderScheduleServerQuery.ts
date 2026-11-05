import { withAbortTimeout } from './withAbortTimeout';
import { fetchOrderSummaries, ORDER_SUMMARY_COLUMNS } from './orderSummaryQuery';

export type OrderScheduleScope = 'erp_schedule' | 'logistics' | 'route' | 'agenda' | 'assembly_web' | 'assembly_mobile';
type ScheduleClient = { rpc: (name: string, args: any) => PromiseLike<{ data: any; error: any }>; from: (name: string) => any };

export async function fetchOrderScheduleIds(
  client: ScheduleClient, scope: OrderScheduleScope, filters: Record<string, unknown>,
  page = 1, pageSize = 100, signal?: AbortSignal,
): Promise<{ ids: string[]; total: number; counts: Record<string, number> }> {
  const { data, error } = await withAbortTimeout(client.rpc('list_order_schedule_ids', {
    p_scope: scope, p_filters: filters, p_page: page, p_page_size: pageSize,
  }), 'pedidos:escopo-da-agenda', 15_000, signal);
  if (error) throw error;
  if (!data || !Array.isArray(data.ids) || data.ids.length > pageSize ||
      data.ids.some((id: unknown) => typeof id !== 'string' || !id) ||
      !Number.isSafeInteger(data.total) || data.total < 0) {
    throw new Error('A consulta da agenda retornou uma resposta inválida.');
  }
  return { ids: data.ids, total: data.total, counts: data.counts || {} };
}

/** Agenda/cronograma exibem todos os resultados do escopo; os lotes são só transporte. */
export async function fetchOrderScheduleRows<T extends { id: string } = any>(
  client: ScheduleClient, scope: OrderScheduleScope, filters: Record<string, unknown>,
  columns: string, signal?: AbortSignal, onCounts?: (counts: Record<string, number>) => void,
): Promise<T[]> {
  const rows: T[] = [];
  const seen = new Set<string>();
  for (let page = 1; ; page += 1) {
    if (signal?.aborted) throw new Error('Consulta cancelada.');
    const selected = await fetchOrderScheduleIds(client, scope, filters, page, 100, signal);
    if (page === 1) onCounts?.(selected.counts);
    if (!selected.ids.length) break;
    if (selected.ids.some((id) => seen.has(id))) throw new Error('A agenda mudou durante o carregamento. Atualize a consulta.');
    selected.ids.forEach((id) => seen.add(id));
    const { data, error } = columns === ORDER_SUMMARY_COLUMNS
      ? { data: await fetchOrderSummaries(client, selected.ids, signal) as T[], error: null }
      : await withAbortTimeout<{ data: T[] | null; error: unknown }>(
      client.from('orders').select(columns).in('id', selected.ids),
      'pedidos:resultados-da-agenda', 15_000, signal,
    );
    if (error) throw error;
    const byId = new Map<string, T>((data || []).map((row: T) => [String(row.id), row]));
    for (const id of selected.ids) { const row = byId.get(id); if (row) rows.push(row); }
    if (seen.size >= selected.total || selected.ids.length < 100) break;
  }
  return rows;
}
