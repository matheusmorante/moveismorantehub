import { withAbortTimeout } from './withAbortTimeout';

type RpcResponse = { data: unknown; error: unknown };
type RpcClient = {
  rpc: (name: string, args: Record<string, unknown>) => PromiseLike<RpcResponse>;
};

export type ServerOrderPage = { ids: string[]; total: number; totalAmount: number };

/** The server filters and sorts the complete authorized set before returning IDs. */
export async function fetchServerOrderPage(
  client: RpcClient,
  options: {
    filters: Record<string, unknown>;
    page: number;
    pageSize: number;
    mode: 'erp' | 'mobile';
    signal?: AbortSignal;
  },
): Promise<ServerOrderPage> {
  const page = Math.max(1, Math.trunc(options.page) || 1);
  const pageSize = Math.min(15, Math.max(1, Math.trunc(options.pageSize) || 15));
  const result = await withAbortTimeout(client.rpc('list_order_page_ids', {
    p_filters: options.filters,
    p_page: page,
    p_page_size: pageSize,
    p_mode: options.mode,
  }), 'pedidos:filtros-servidor', 15_000, options.signal);
  if (result.error) throw result.error;

  const data = result.data as Partial<ServerOrderPage> | null;
  if (!data || !Array.isArray(data.ids) || data.ids.length > pageSize ||
      data.ids.some((id) => typeof id !== 'string' || !id) ||
      new Set(data.ids).size !== data.ids.length ||
      !Number.isSafeInteger(data.total) || Number(data.total) < 0 ||
      !Number.isFinite(Number(data.totalAmount))) {
    throw new Error('A consulta de pedidos retornou uma página inválida.');
  }
  return { ids: data.ids, total: Number(data.total), totalAmount: Number(data.totalAmount) };
}
