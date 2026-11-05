import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ rpc: vi.fn(), from: vi.fn(), select: vi.fn(), in: vi.fn() }));
vi.mock('../supabaseClient', () => ({ supabase: { rpc: mocks.rpc, from: mocks.from } }));
import { searchOperations } from './orderDeliveryAgentService';

describe('consulta de pedidos do assistente', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.from.mockReturnValue({ select: mocks.select });
    mocks.select.mockReturnValue({ in: mocks.in });
  });
  it('envia todos os critérios antes do limite e busca somente os pedidos escolhidos', async () => {
    mocks.rpc.mockResolvedValue({ data: { ids: ['a'] }, error: null });
    mocks.in.mockResolvedValue({ data: [{ id: 'a', order_number: '10', status: 'scheduled', order_type: 'sale', order_data: {} }], error: null });
    const input = { tipo: 'venda' as const, status: 'agendado', termo: 'ana florenca', dataInicio: '2026-11-01', limite: 5 };
    const results = await searchOperations(input);
    expect(mocks.rpc).toHaveBeenCalledWith('search_order_operation_ids', { p_filters: input, p_limit: 5 });
    expect(mocks.in).toHaveBeenCalledWith('id', ['a']);
    expect(results).toHaveLength(1);
  });
  it('não carrega candidatos em uma resposta vazia ou em falha', async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { ids: [] }, error: null });
    expect(await searchOperations({ tipo: 'venda' })).toEqual([]);
    expect(mocks.from).not.toHaveBeenCalled();
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error('falha') });
    await expect(searchOperations({ tipo: 'venda' })).rejects.toThrow('falha');
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('recusa datas inválidas antes de consultar o servidor', async () => {
    await expect(searchOperations({ dataInicio: '04/11/2026' })).rejects.toThrow('AAAA-MM-DD');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
