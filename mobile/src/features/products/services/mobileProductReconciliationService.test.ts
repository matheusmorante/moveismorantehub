import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ from: vi.fn(), responses: [] as any[], queries: [] as any[] }));

vi.mock('../../../services/supabaseClient', () => ({ supabase: { from: mocks.from } }));
vi.mock('../domain/productCharacteristics', () => ({
  isWeightCharacteristicName: (name: string) => name === 'Peso',
}));

import {
  fetchMobileProductReconciliation,
  applyMobileProductReconciliationBatch,
  fetchMobileProductReconciliationSelection,
  saveMobileProductReconciliation,
  saveMobileReconciliationAttributeValue,
  searchMobileReconciliationSuppliers,
} from './mobileProductReconciliationService';

beforeEach(() => {
  vi.clearAllMocks();
  mocks.responses = [];
  mocks.queries = [];
  mocks.from.mockImplementation((table) => {
    const query = { table, calls: [] as any[] };
    mocks.queries.push(query);
    const builder: any = {
      then(resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) {
        return Promise.resolve(mocks.responses.shift() ?? { data: [], count: 0, error: null }).then(resolve, reject);
      },
    };
    for (const method of ['select', 'eq', 'is', 'or', 'in', 'order', 'range', 'limit', 'insert', 'update', 'delete', 'ilike', 'maybeSingle', 'single']) {
      builder[method] = (...args: unknown[]) => { query.calls.push([method, ...args]); return builder; };
    }
    return builder;
  });
});

describe('consulta mobile de conciliação de produtos', () => {
  it('reutiliza a consulta compartilhada com o cliente Supabase mobile', async () => {
    mocks.responses.push(
      { data: [], error: null },
      {
        data: [{ id: 'product-1', code: 'P-1', name: 'Produto', product_variations: [] }],
        count: 1,
        error: null,
      }
    );

    const result = await fetchMobileProductReconciliation();

    expect(mocks.from.mock.calls.map(([table]) => table)).toEqual(['category_attributes', 'products']);
    expect(result.data[0]).toMatchObject({ id: 'product-1', name: 'Produto' });
    expect(result.summary.totalPendingProducts).toBe(1);
  });

  it('resolve a seleção de todo o filtro em blocos e inclui pendências após a primeira página', async () => {
    const validProducts = Array.from({ length: 500 }, (_, index) => ({
      id: `product-${index}`,
      name: `Produto ${index}`,
      main_supplier_id: 'supplier-1',
      supplier_id: 'supplier-1',
      category_id: 'category-1',
      price: 25,
      fiscal: { ncm: '94035000' },
      product_categories: [{ category_id: 'category-1' }],
      product_variations: [],
    }));
    mocks.responses.push(
      { data: [], error: null },
      { data: validProducts, count: 501, error: null },
      {
        data: [{
          id: 'product-500',
          name: 'Produto pendente',
          main_supplier_id: 'supplier-1',
          supplier_id: 'supplier-1',
          category_id: 'category-1',
          price: 25,
          fiscal: {},
          product_categories: [{ category_id: 'category-1' }],
          product_variations: [],
        }],
        count: 501,
        error: null,
      },
    );

    await expect(fetchMobileProductReconciliationSelection({ pendencyType: 'ncm' })).resolves.toEqual([
      expect.objectContaining({ id: 'product-500', categoryId: 'category-1' }),
    ]);
    expect(mocks.queries.filter(({ table }) => table === 'products')).toHaveLength(2);
    expect(mocks.queries[1].calls).toContainEqual(['order', 'id', { ascending: true }]);
    expect(mocks.queries[1].calls).toContainEqual(['range', 0, 499]);
    expect(mocks.queries[2].calls).toContainEqual(['order', 'id', { ascending: true }]);
    expect(mocks.queries[2].calls).toContainEqual(['range', 500, 999]);
  });

  it('reutiliza a busca ERP de fornecedores e mapeia razão/fantasia', async () => {
    mocks.responses.push({
      data: [{ id: 'supplier-1', full_name: 'Fornecedor', social_name: 'Fantasia', nickname: null, cpf_cnpj: '123' }],
      error: null,
    });

    await expect(searchMobileReconciliationSuppliers(' Fornecedor ')).resolves.toEqual([
      { id: 'supplier-1', fullName: 'Fornecedor', tradeName: 'Fantasia', cpfCnpj: '123' },
    ]);
    expect(mocks.queries[0].table).toBe('people');
    expect(mocks.queries[0].calls).toContainEqual(['eq', 'deleted', false]);
    expect(mocks.queries[0].calls).toContainEqual(['limit', 20]);
  });

  it('salva pai e variação usando o contrato compartilhado de reconciliação', async () => {
    mocks.responses.push(
      { data: null, error: null },
      { data: null, error: null },
      { data: { fiscal: { csosn: '102' } }, error: null },
      { data: [{ id: 'product-1' }], error: null },
      { data: [{ id: 'variation-1' }], error: null },
    );

    const result = await saveMobileProductReconciliation(
      { id: 'product-1', mainSupplierId: 'supplier-1', categoryId: 'category-1', ncm: '9403.50.00', price: 25 },
      [{ id: 'variation-1', price: 30, attributes: [{ name: 'Cor', value: 'Azul', showName: true }] }]
    );

    expect(result).toEqual({ success: true });
    expect(mocks.queries.map(({ table }) => table)).toEqual([
      'product_categories', 'product_categories', 'products', 'products', 'product_variations',
    ]);
    expect(mocks.queries[3].calls).toContainEqual(['update', {
      main_supplier_id: 'supplier-1', supplier_id: 'supplier-1', category_id: 'category-1',
      price: 25, fiscal: { csosn: '102', ncm: '94035000' },
    }]);
    expect(mocks.queries[4].calls).toContainEqual(['eq', 'product_id', 'product-1']);
    expect(mocks.queries[4].calls).toContainEqual(['update', {
      price: 30, attributes: [{ name: 'Cor', value: 'Azul', showName: true }],
    }]);
  });

  it('reutiliza um valor existente de atributo sem inserir duplicata', async () => {
    mocks.responses.push({ data: { id: 'value-1', attribute_id: 'attribute-1', value: 'Azul' }, error: null });

    await expect(saveMobileReconciliationAttributeValue('attribute-1', ' Azul ')).resolves.toEqual({
      id: 'value-1', attribute_id: 'attribute-1', value: 'Azul',
    });
    expect(mocks.queries).toHaveLength(1);
    expect(mocks.queries[0].calls).toContainEqual(['ilike', 'value', 'Azul']);
  });

  it('cadastra e confirma um valor novo no atributo existente', async () => {
    mocks.responses.push(
      { data: null, error: null },
      { data: { id: 'value-2', attribute_id: 'attribute-1', value: 'Azul Royal' }, error: null },
    );

    await expect(saveMobileReconciliationAttributeValue('attribute-1', ' Azul Royal ')).resolves.toEqual({
      id: 'value-2', attribute_id: 'attribute-1', value: 'Azul Royal',
    });
    expect(mocks.queries[1].calls).toContainEqual(['insert', { attribute_id: 'attribute-1', value: 'Azul Royal' }]);
  });

  it('bloqueia cadastro inválido antes de consultar o Supabase', async () => {
    await expect(saveMobileReconciliationAttributeValue(' ', ' ')).rejects.toThrow('Selecione o atributo.');
    expect(mocks.from).not.toHaveBeenCalled();
  });
});

describe('operações em lote da conciliação mobile', () => {
  it('reutiliza o contrato do ERP para aplicar fornecedor sem substituir vínculos existentes', async () => {
    mocks.responses.push({ data: [{ id: 'product-1' }], error: null });

    await expect(applyMobileProductReconciliationBatch({
      operation: 'supplier',
      productIds: ['product-1'],
      supplierId: 'supplier-1',
      replaceExisting: false,
    })).resolves.toMatchObject({ success: true, updated: 1 });
    expect(mocks.queries[0].calls).toContainEqual(['update', { main_supplier_id: 'supplier-1', supplier_id: 'supplier-1' }]);
    expect(mocks.queries[0].calls).toContainEqual(['is', 'main_supplier_id', null]);
  });

  it('aplica categoria, substitui os vínculos N:N e só confirma seleção completa', async () => {
    mocks.responses.push(
      { data: [{ id: 'product-1' }, { id: 'product-2' }], error: null },
      { data: null, error: null },
      { data: null, error: null },
    );

    await expect(applyMobileProductReconciliationBatch({
      operation: 'category',
      productIds: ['product-1', 'product-2'],
      categoryId: 'category-1',
    })).resolves.toMatchObject({ success: true, updated: 2 });
    expect(mocks.queries.map(({ table }) => table)).toEqual(['products', 'product_categories', 'product_categories']);
    expect(mocks.queries[2].calls).toContainEqual(['insert', [
      { product_id: 'product-1', category_id: 'category-1' },
      { product_id: 'product-2', category_id: 'category-1' },
    ]]);
  });

  it('atualiza somente o NCM e preserva os demais campos fiscais em lote', async () => {
    mocks.responses.push(
      { data: { fiscal: { csosn: '102', cest: '123' } }, error: null },
      { data: [{ id: 'product-1' }], error: null },
    );

    await expect(applyMobileProductReconciliationBatch({
      operation: 'ncm',
      productIds: ['product-1'],
      ncm: '9403.50.00',
    })).resolves.toMatchObject({ success: true, updated: 1 });
    expect(mocks.queries[1].calls).toContainEqual(['update', {
      fiscal: { csosn: '102', cest: '123', ncm: '94035000' },
    }]);
  });

  it('preenche o atributo de lista nas variações selecionadas sem remover metadados', async () => {
    mocks.responses.push(
      { data: [{ id: 'variation-1', product_id: 'product-1', attributes: [{ name: 'Cor', value: '', showName: false, origin: 'erp' }] }], error: null },
      { data: [{ id: 'variation-1' }], error: null },
    );

    await expect(applyMobileProductReconciliationBatch({
      operation: 'attribute',
      productIds: ['product-1'],
      name: 'Cor',
      value: 'Azul',
    })).resolves.toMatchObject({ success: true, updated: 1 });
    expect(mocks.queries[1].calls).toContainEqual(['update', {
      attributes: [{ name: 'Cor', value: 'Azul', showName: false, origin: 'erp' }],
    }]);
  });
});
