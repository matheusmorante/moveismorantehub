import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { findPendingFiscalEmission } from '../nfeEmissionRequestState';

const mocks = vi.hoisted(() => ({ from: vi.fn() }));
vi.mock('../../supabaseConfig', () => ({ supabase: { from: mocks.from } }));

const pending = (environment: 1 | 2) => ({
  id: 'pending-document', order_id: 'owned-order', ambiente: environment,
  document_type: 'outbound', status: 'pendente', emission_request_id: 'original-request',
  chave_acesso: '4'.repeat(44), numero_nfe: 654, serie: '1', modelo: '65',
});

function query(result: unknown) {
  const builder = {
    select: vi.fn().mockReturnThis(), eq: vi.fn().mockReturnThis(),
    in: vi.fn().mockReturnThis(), limit: vi.fn().mockReturnThis(),
    then: (resolve: (value: unknown) => unknown) => Promise.resolve(result).then(resolve),
  };
  mocks.from.mockReturnValue(builder);
  return builder;
}

beforeEach(() => vi.resetAllMocks());
afterEach(() => vi.useRealTimers());

describe('restauração de tentativa fiscal pendente', () => {
  it.each([1, 2] as const)('recupera somente a saída do pedido e ambiente %s', async environment => {
    const builder = query({ data: [pending(environment)], error: null });
    await expect(findPendingFiscalEmission('owned-order', environment)).resolves.toMatchObject({
      documentId: 'pending-document', orderId: 'owned-order', environment,
      emissionRequestId: 'original-request', nfeNumber: 654, model: '65',
    });
    expect(mocks.from).toHaveBeenCalledWith('nfe_documents');
    expect(builder.eq.mock.calls).toEqual([
      ['order_id', 'owned-order'], ['ambiente', environment], ['document_type', 'outbound'],
    ]);
    expect(builder.in).toHaveBeenCalledWith('status', ['pendente', 'processando']);
    expect(builder.limit).toHaveBeenCalledWith(2);
  });

  it('libera uma intenção nova somente após consulta sem pendência', async () => {
    query({ data: [], error: null });
    await expect(findPendingFiscalEmission('owned-order', 2)).resolves.toBeNull();
  });

  it('não escolhe uma identidade quando há duas pendências', async () => {
    query({ data: [pending(2), { ...pending(2), id: 'other-document' }], error: null });
    await expect(findPendingFiscalEmission('owned-order', 2)).rejects.toThrow('mais de uma');
  });

  it.each([
    { order_id: 'another-order' }, { ambiente: 1 }, { document_type: 'return' },
  ])('recusa identidade fora do contexto %j', async override => {
    query({ data: [{ ...pending(2), ...override }], error: null });
    await expect(findPendingFiscalEmission('owned-order', 2)).rejects.toThrow();
  });

  it('mantém bloqueio após erro de leitura', async () => {
    query({ data: null, error: { message: 'unavailable' } });
    await expect(findPendingFiscalEmission('owned-order', 2)).rejects.toThrow('conferir');
  });

  it('encerra a espera e falha fechado quando a consulta não responde', async () => {
    vi.useFakeTimers();
    query(new Promise(() => {}));
    const result = findPendingFiscalEmission('owned-order', 2).catch(error => error);
    await vi.advanceTimersByTimeAsync(10_000);
    expect(await result).toBeInstanceOf(Error);
  });
});
