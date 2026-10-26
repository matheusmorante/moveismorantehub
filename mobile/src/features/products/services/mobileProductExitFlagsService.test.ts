import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({ supabaseMock: { from: vi.fn() } }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import { fetchMobileProductExitFlags } from './mobileProductExitFlagsService';

const createQuery = (response: unknown) => {
  const query: Record<string, any> = {};
  for (const method of ['select', 'in', 'not']) query[method] = vi.fn(() => query);
  query.abortSignal = vi.fn(() => Promise.resolve(response));
  return query;
};

describe('fetchMobileProductExitFlags', () => {
  beforeEach(() => vi.clearAllMocks());
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('busca saídas de venda somente para as variações solicitadas e preserva o alias legado', async () => {
    const query = createQuery({
      data: [
        { variation_id: 'variation-1' },
        { variation_id: 'variation-2' },
        { variation_id: 'outside-page' },
        { variation_id: null },
      ],
      error: null,
    });
    supabaseMock.from.mockReturnValue(query);

    await expect(fetchMobileProductExitFlags([
      'variation-1', 'variation-1', 'variation-2', ' ',
    ])).resolves.toEqual(new Set(['variation-1', 'variation-2']));

    expect(supabaseMock.from).toHaveBeenCalledOnce();
    expect(supabaseMock.from).toHaveBeenCalledWith('inventory_moves');
    expect(query.select).toHaveBeenCalledWith('variation_id');
    expect(query.in).toHaveBeenNthCalledWith(1, 'variation_id', ['variation-1', 'variation-2']);
    expect(query.in).toHaveBeenNthCalledWith(2, 'type', ['exit', 'withdrawal']);
    expect(query.not).toHaveBeenNthCalledWith(1, 'order_id', 'is', null);
    expect(query.not).toHaveBeenNthCalledWith(2, 'variation_id', 'is', null);
  });

  it('divide listas grandes em lotes de 100 IDs', async () => {
    const queries = [
      createQuery({ data: [{ variation_id: 'variation-0' }], error: null }),
      createQuery({ data: [{ variation_id: 'variation-100' }], error: null }),
    ];
    supabaseMock.from.mockImplementation(() => queries.shift());
    const ids = Array.from({ length: 101 }, (_, index) => `variation-${index}`);

    await expect(fetchMobileProductExitFlags(ids)).resolves.toEqual(
      new Set(['variation-0', 'variation-100'])
    );

    expect(supabaseMock.from).toHaveBeenCalledTimes(2);
  });

  it('evita consultar quando a página não tem variações com UUID', async () => {
    await expect(fetchMobileProductExitFlags([' ', ''])).resolves.toEqual(new Set());
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('aborta a leitura secundária após 10 segundos sem bloquear a lista', async () => {
    vi.useFakeTimers();
    let receivedSignal: AbortSignal | undefined;
    const query = createQuery({ data: [], error: null });
    query.abortSignal.mockImplementation((signal: AbortSignal) => {
      receivedSignal = signal;
      return new Promise(() => undefined);
    });
    supabaseMock.from.mockReturnValue(query);

    const request = fetchMobileProductExitFlags(['variation-1']);
    const assertion = expect(request).rejects.toThrow('limite de 10000 ms');
    await vi.advanceTimersByTimeAsync(10_000);
    await assertion;

    expect(receivedSignal?.aborted).toBe(true);
  });

  it('propaga falha da leitura para o hook manter o indicador vazio sem afetar a lista', async () => {
    const queryError = new Error('Falha ao consultar inventory_moves');
    supabaseMock.from.mockReturnValue(createQuery({ data: null, error: queryError }));

    await expect(fetchMobileProductExitFlags(['variation-1'])).rejects.toBe(queryError);
  });
});
