import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchOrderSummaries } from '../../../../../shared-utils/orderSummaryQuery';
import { createMeasuredSupabaseFetch } from '../../../../../shared-utils/supabaseReadMetrics';
import { reconcileCartQuote } from '../../../../../digital-catalog/src/features/products/cart-quote';

afterEach(() => { delete (globalThis as any).__MORANTEHUB_READ_METRICS__; });

describe('contratos de leitura compacta', () => {
  it('não permite que respostas estranhas à página sejam usadas como resumos', async () => {
    const rpc = vi.fn().mockResolvedValueOnce({ data: [{ id: 'other', __orderSummary: true }], error: null })
      .mockResolvedValueOnce({ data: [{ id: 'selected' }], error: null });
    await expect(fetchOrderSummaries({ rpc }, ['selected'])).rejects.toThrow('inválidos');
    await expect(fetchOrderSummaries({ rpc }, ['selected'])).rejects.toThrow('inválidos');
    expect(rpc).toHaveBeenCalledWith('read_order_summaries', { p_ids: ['selected'] });
  });
  it('usa o preço atual e preserva consultas de interesse mesmo quando o estoque precisa ser confirmado', () => {
    const items = [{ id: 'item', name: 'Mesa', image: '', price: 99, quantity: 2 }];
    expect(reconcileCartQuote(items, [{ id: 'item', price: '120.50', stock: 1 }]))
      .toEqual([{ ...items[0], price: 120.5, stock: 1 }]);
    expect(() => reconcileCartQuote(items, [])).toThrow('não está mais disponível');
    expect(items[0].price).toBe(99);
  });
  it('mede bytes por plataforma e versão sem guardar dados, filtros ou credenciais', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response('[{"name":"privado"}]', { status: 200 }));
    const measured = createMeasuredSupabaseFetch('app', '1:beta', fetcher);
    const response = await measured('https://example.supabase.co/rest/v1/orders?customer_name=segredo', { headers: { Authorization: 'credencial' } });
    expect(await response.json()).toEqual([{ name: 'privado' }]);
    await vi.waitFor(() => expect((globalThis as any).__MORANTEHUB_READ_METRICS__['app:1:beta:table/orders'].measuredResponses).toBe(1));
    const stored = JSON.stringify((globalThis as any).__MORANTEHUB_READ_METRICS__);
    expect(stored).not.toMatch(/privado|segredo|credencial|Authorization/);
    expect((globalThis as any).__MORANTEHUB_READ_METRICS__['app:1:beta:table/orders'].responseBytes).toBe(new TextEncoder().encode('[{"name":"privado"}]').length);
  });
  it('mantém falhas da rede e não mede endpoints de autenticação', async () => {
    const failure = new Error('offline');
    const measured = createMeasuredSupabaseFetch('catalog', 'dev', vi.fn().mockRejectedValue(failure));
    await expect(measured('https://example.supabase.co/auth/v1/token')).rejects.toBe(failure);
    expect((globalThis as any).__MORANTEHUB_READ_METRICS__).toBeUndefined();
    await expect(measured('https://example.supabase.co/rest/v1/rpc/catalog_cart_quote')).rejects.toBe(failure);
    expect((globalThis as any).__MORANTEHUB_READ_METRICS__['catalog:dev:rpc/catalog_cart_quote']).toMatchObject({ requests: 1, failedRequests: 1 });
  });
});
