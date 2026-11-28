import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn(), responses: [] as any[], queries: [] as any[] }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from, rpc: mocks.rpc } }));
import { applySupplierBatch, applyCategoryBatch, applyNcmBatch, applyAttributeBatch, saveSingleProductReconciliation } from './reconciliationMutations';
beforeEach(() => {
  vi.clearAllMocks(); mocks.responses = []; mocks.queries = []; vi.spyOn(console, 'error').mockImplementation(() => {}); vi.spyOn(console, 'warn').mockImplementation(() => {});
  mocks.rpc.mockImplementation(() => Promise.resolve(mocks.responses.shift() ?? { data: 1, error: null }));
  mocks.from.mockImplementation((table) => {
    const query = { table, calls: [] as any[] }; mocks.queries.push(query);
    const builder: any = { then(resolve: (value: unknown) => unknown, reject: (cause: unknown) => unknown) { return Promise.resolve(mocks.responses.shift() ?? { data: [{ id: 'p1' }], error: null, count: null }).then(resolve, reject); } };
    for (const name of ['select', 'update', 'insert', 'delete', 'eq', 'in', 'is', 'single']) builder[name] = (...args: unknown[]) => { query.calls.push([name, ...args]); return builder; };
    return builder;
  });
});
const writes = () => mocks.queries.filter((query) => query.calls.some(([name]: string[]) => ['update', 'insert', 'delete'].includes(name)));
describe('contratos e confirmação das mutações de reconciliação', () => {
  it('bloqueia NCM inválido antes de consultar ou gravar', async () => {
    expect((await applyNcmBatch(['p1'], '9403')).success).toBe(false); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('bloqueia IDs repetidos após normalizar a seleção', async () => {
    expect((await applySupplierBatch(['p1', ' p1 '], 'fornecedor')).success).toBe(false); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('bloqueia preço negativo antes de qualquer atualização parcial', async () => {
    expect((await saveSingleProductReconciliation({ id: 'p1', price: -1 })).success).toBe(false); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('respeita preservação de fornecedor e conta somente registros retornados', async () => {
    mocks.responses.push({ data: [], error: null, count: null }); expect(await applySupplierBatch([' p1 '], ' fornecedor ', false)).toMatchObject({ success: true, updated: 0 });
    expect(mocks.queries[0].calls).toContainEqual(['is', 'main_supplier_id', null]); expect(mocks.queries[0].calls).toContainEqual(['update', { main_supplier_id: 'fornecedor', supplier_id: 'fornecedor' }]);
  });
  it('não confirma categoria quando a operação atômica falha', async () => {
    mocks.responses.push({ data: null, error: { message: 'Falha no vínculo' } });
    expect((await applyCategoryBatch(['p1'], 'categoria')).success).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('apply_product_reconciliation_category_batch', {
      p_product_ids: ['p1'], p_category_id: 'categoria',
    });
    expect(mocks.from).not.toHaveBeenCalled();
  });
  it('não confirma o NCM quando a operação atômica falha', async () => {
    mocks.responses.push({ data: null, error: { message: 'Os dados fiscais atuais precisam de revisão antes de alterar o NCM.' } });
    expect((await applyNcmBatch(['p1'], '94035000')).success).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(1); expect(writes()).toHaveLength(0);
  });
  it('normaliza NCM e preserva os demais campos fiscais', async () => {
    mocks.responses.push({ data: 1, error: null }); expect((await applyNcmBatch([' p1 '], '9403.50.00')).success).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledWith('apply_product_reconciliation_ncm_batch', { p_product_ids: ['p1'], p_ncm: '94035000' });
  });
  it('não confirma nem deixa parte do lote sob responsabilidade do cliente quando a RPC falha', async () => {
    mocks.responses.push({ data: null, error: { message: 'Falha de escrita' } });
    expect((await applyNcmBatch(['p1', 'p2'], '94035000')).success).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledTimes(1); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('não confirma o lote quando a operação atômica de atributos falha', async () => {
    mocks.responses.push({ data: null, error: { message: 'Falha nas variações' } });
    expect((await applyAttributeBatch(['p1'], ' Cor ', ' Azul ')).success).toBe(false);
    expect(mocks.rpc).toHaveBeenCalledWith('apply_product_reconciliation_attribute_batch', {
      p_product_ids: ['p1'], p_name: 'Cor', p_value: 'Azul',
    });
    expect(writes()).toHaveLength(0);
  });
  it('não aceita uma confirmação de atributos com formato inválido', async () => {
    mocks.responses.push({ data: [{ id: 'v1', attributes: 'JSON inválido' }], error: null });
    expect((await applyAttributeBatch(['p1'], 'Cor', 'Azul')).success).toBe(false);
    expect(mocks.from).not.toHaveBeenCalled();
    expect(writes()).toHaveLength(0);
  });
  it('restringe a atualização da variação ao produto de origem', async () => {
    expect((await saveSingleProductReconciliation({ id: 'p1' }, [{ id: 'v1', price: 10 }])).success).toBe(true);
    expect(writes()[0].calls).toContainEqual(['eq', 'product_id', 'p1']);
  });
  it('preserva os demais campos fiscais ao salvar o NCM pelo card', async () => {
    mocks.responses.push(
      { data: { fiscal: { csosn: '102', cest: '123' } }, error: null },
      { data: [{ id: 'p1' }], error: null },
    );
    expect((await saveSingleProductReconciliation({ id: 'p1', ncm: '9403.50.00' })).success).toBe(true);
    expect(mocks.queries[0].calls).toContainEqual(['select', 'fiscal']);
    expect(writes()[0].calls).toContainEqual(['update', {
      fiscal: { csosn: '102', cest: '123', ncm: '94035000' },
    }]);
  });
  it('não confirma produto inexistente ou sem permissão', async () => {
    mocks.responses.push({ data: [], error: null }); expect((await saveSingleProductReconciliation({ id: 'p1', price: 10 })).success).toBe(false);
  });
});
