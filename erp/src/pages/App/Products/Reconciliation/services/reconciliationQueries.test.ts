import { beforeEach, describe, expect, it, vi } from 'vitest';
const mocks = vi.hoisted(() => ({ from: vi.fn(), responses: [] as any[] }));
vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: { from: mocks.from } }));
vi.mock('@/pages/utils/technicalValuesService', () => ({ isWeightCharacteristicName: (name: string) => name === 'Peso' }));
import { fetchRequiredCategoryAttributes, fetchProductsForReconciliation } from './reconciliationQueries';
beforeEach(() => {
  vi.clearAllMocks(); mocks.responses = [];
  mocks.from.mockImplementation(() => {
    const builder: any = { then(resolve: any, reject: any) { return Promise.resolve(mocks.responses.shift() ?? { data: [], count: 0, error: null }).then(resolve, reject); } };
    for (const method of ['select', 'eq', 'is', 'or', 'in', 'order', 'range']) builder[method] = () => builder;
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
});
