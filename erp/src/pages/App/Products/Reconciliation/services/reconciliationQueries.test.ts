import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), responses: [] as any[], queries: [] as any[] }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/pages/utils/technicalValuesService', () => ({ isWeightCharacteristicName: (name: string) => name === 'Peso' }));
import {
  fetchRequiredCategoryAttributes,
  fetchProductsForReconciliation,
  fetchProductReconciliationSelection,
} from './reconciliationQueries';
beforeEach(() => {
  vi.clearAllMocks(); mocks.responses = []; mocks.queries = [];
  mocks.from.mockImplementation((table: string) => {
    const query = { table, operations: [] as any[] };
    mocks.queries.push(query);
    const builder: any = { then(resolve: any, reject: any) { return Promise.resolve(mocks.responses.shift() ?? { data: [], count: 0, error: null }).then(resolve, reject); } };
    for (const method of ['select', 'eq', 'is', 'ilike', 'limit', 'or', 'in', 'order', 'range']) {
      builder[method] = (...args: any[]) => { query.operations.push([method, ...args]); return builder; };
    }
    return builder;
  });
});
describe('consulta dos formulários de reconciliação', () => {
  it('valida filtros e paginação antes de consultar', async () => {
    await expect(fetchProductsForReconciliation(0, 15, {})).rejects.toBeTruthy(); expect(mocks.from).not.toHaveBeenCalled();
  });
  it('não transforma erro de configuração em ausência de atributos obrigatórios', async () => {
    mocks.responses.push({ data: null, error: { message: 'Atributos indisponíveis' } }); await expect(fetchRequiredCategoryAttributes()).rejects.toMatchObject({ message: 'Atributos indisponíveis' });
  });
  it('preserva a referência de atributo quando a relação é retornada como lista', async () => {
    mocks.responses.push({ data: [{ category_id: 'c1', attribute_id: 'a1', is_required: true, attributes: [{ id: 'a1', name: 'Quantidade', data_type: 'integer' }] }], error: null });
    expect(await fetchRequiredCategoryAttributes()).toEqual([expect.objectContaining({ attribute: expect.objectContaining({ id: 'a1', name: 'Quantidade', data_type: 'integer' }) })]);
  });
  it('não converte JSON inválido de atributos em lista vazia editável', async () => {
    mocks.responses.push({ data: [], error: null }, { data: [{ id: 'p1', name: 'Produto', product_variations: [{ id: 'v1', attributes: 'JSON inválido' }] }], count: 1, error: null });
    await expect(fetchProductsForReconciliation()).rejects.toBeTruthy();
  });
  it('preserva metadados e valor zero dos atributos no formulário', async () => {
    mocks.responses.push({ data: [], error: null }, { data: [{ id: 'p1', name: 'Produto', product_variations: [{ id: 'v1', attributes: [{ name: 'Quantidade', value: 0, showName: false, legacyOrigin: 'importação' }] }] }], count: 1, error: null });
    const result = await fetchProductsForReconciliation(); expect(result.data[0].variations[0].attributes).toEqual([expect.objectContaining({ name: 'Quantidade', value: '0', showName: false, legacyOrigin: 'importação' })]);
  });
  it('mostra falha na leitura de fornecedores em vez de montar cadastro incompleto', async () => {
    mocks.responses.push({ data: [], error: null }, { data: [{ id: 'p1', name: 'Produto', main_supplier_id: 's1' }], count: 1, error: null }, { data: null, error: { message: 'Fornecedores indisponíveis' } });
    await expect(fetchProductsForReconciliation()).rejects.toMatchObject({ message: 'Fornecedores indisponíveis' });
  });
  it('inclui o produto pai quando o SKU pesquisado pertence a uma variação', async () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    mocks.responses.push(
      { data: [], error: null },
      { data: [{ product_id: productId }], error: null },
      { data: [], count: 0, error: null }
    );

    await fetchProductsForReconciliation(1, 15, { search: 'SKU-RED-02' });

    expect(mocks.queries.find((query: any) => query.table === 'product_variations')?.operations)
      .toEqual(expect.arrayContaining([
        ['ilike', 'sku', '%SKU-RED-02%'],
        ['limit', expect.any(Number)],
      ]));
    expect(mocks.queries.find((query: any) => query.table === 'products')?.operations)
      .toContainEqual(['or', `name.ilike."%SKU-RED-02%",code.ilike."%SKU-RED-02%",id.in.(${productId})`]);
  });
  it('aplica a busca por SKU de variação também à seleção de todos filtrados', async () => {
    const productId = '22222222-2222-4222-8222-222222222222';
    mocks.responses.push(
      { data: [], error: null },
      { data: [{ product_id: productId }], error: null },
      { data: [], error: null }
    );

    await expect(fetchProductReconciliationSelection({ search: 'SKU-BLUE-04' })).resolves.toEqual([]);

    expect(mocks.queries.find((query: any) => query.table === 'products')?.operations)
      .toContainEqual(['or', `name.ilike."%SKU-BLUE-04%",code.ilike."%SKU-BLUE-04%",id.in.(${productId})`]);
  });
  it('interrompe a consulta por SKU quando o termo corresponde a mais variações que o limite seguro', async () => {
    mocks.responses.push(
      { data: [], error: null },
      { data: Array.from({ length: 101 }, (_, index) => ({ product_id: `parent-${index}` })), error: null }
    );

    await expect(fetchProductsForReconciliation(1, 15, { search: '12' }))
      .rejects.toMatchObject({ name: 'ProductVariationSearchTooBroadError' });
    expect(mocks.queries.some((query: any) => query.table === 'products')).toBe(false);
  });
});
