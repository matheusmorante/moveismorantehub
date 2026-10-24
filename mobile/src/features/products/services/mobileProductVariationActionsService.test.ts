import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  from: vi.fn(),
  rpc: vi.fn(),
}));

vi.mock('../../../services/supabaseClient', () => ({
  supabase: {
    from: mocks.from,
    rpc: mocks.rpc,
  },
}));

vi.mock('../../../../../shared-utils/productText', () => ({
  toTitleCase: (value: string) => value,
}));

import {
  checkMobileVariationAttributeConflict,
  countMobileParentVariations,
  ensureMobileAttributeValue,
  fetchMobileVariationFamilies,
  mergeMobileVariationIntoCanonical,
  mobileVariationAttributesConflict,
  moveMobileVariationToFamily,
  toMobileVariationAttributes,
} from './mobileProductVariationActionsService';
import { canAddVariationFamilyAttribute } from '../../../../../shared-utils/variationFamilyFormSchemas';

const sourceVariationId = '123e4567-e89b-42d3-a456-426614174000';
const targetVariationId = '123e4567-e89b-42d3-a456-426614174001';
const targetParentId = '123e4567-e89b-42d3-a456-426614174002';

let query: any;
let queryResult: any;
let currentTable = '';
let tableResults: Map<string, any[]>;

const queueResults = (table: string, ...results: any[]) => tableResults.set(table, results);

describe('mobileProductVariationActionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    currentTable = '';
    tableResults = new Map();
    queryResult = { data: [], error: null, count: 0 };
    query = {
      select: vi.fn(() => query),
      single: vi.fn(() => query),
      maybeSingle: vi.fn(() => query),
      update: vi.fn(() => query),
      eq: vi.fn(() => query),
      filter: vi.fn(() => query),
      limit: vi.fn(() => query),
      not: vi.fn(() => query),
      neq: vi.fn(() => query),
      order: vi.fn(() => query),
      range: vi.fn(() => query),
      insert: vi.fn(() => query),
      then: (resolve: (value: any) => unknown, reject: (reason: unknown) => unknown) => {
        const queued = tableResults.get(currentTable);
        const result = queued?.length ? queued.shift() : queryResult;
        return Promise.resolve(result).then(resolve, reject);
      },
    };
    mocks.from.mockImplementation((table: string) => {
      currentTable = table;
      return query;
    });
  });

  it('compartilha a regra do ERP: somente uma variação sem atributos pode receber a primeira linha', () => {
    expect(canAddVariationFamilyAttribute([])).toBe(true);
    expect(canAddVariationFamilyAttribute([{ name: 'Cor', value: 'Azul' }])).toBe(false);
  });

  it('normaliza atributos guardados como objeto ou JSON sem perder showName', () => {
    expect(toMobileVariationAttributes('{"Cor":{"value":"Preto","showName":false}}')).toEqual([
      { name: 'Cor', value: 'Preto', showName: false },
    ]);
    expect(toMobileVariationAttributes([{ key: 'Tamanho', val: 'M' }])).toEqual([
      { name: 'Tamanho', value: 'M', showName: undefined },
    ]);
  });

  it('detecta combinações iguais sem depender da ordem ou caixa dos atributos', () => {
    expect(
      mobileVariationAttributesConflict(
        [
          { name: 'Cor', value: 'Preto' },
          { name: 'Tamanho', value: 'Casal' },
        ],
        [
          { name: 'tamanho', value: 'casal' },
          { name: 'cor', value: 'preto' },
        ]
      )
    ).toBe(true);
    expect(
      mobileVariationAttributesConflict(
        [{ name: 'Cor', value: 'Preto' }],
        [{ name: 'Cor', value: 'Branco' }]
      )
    ).toBe(false);
  });

  it('carrega todos os produtos pai em páginas ordenadas e valida seus contratos', async () => {
    const makeFamily = (index: number) => ({
      id: `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`,
      name: `Produto ${index}`,
      description: null,
      code: `COD-${index}`,
    });
    query.range.mockImplementation((from: number) => {
      queryResult = {
        data: from === 0 ? Array.from({ length: 1000 }, (_, index) => makeFamily(index + 1)) : [makeFamily(1001)],
        error: null,
      };
      return query;
    });

    const families = await fetchMobileVariationFamilies();

    expect(families).toHaveLength(1001);
    expect(query.order).toHaveBeenNthCalledWith(1, 'name', { ascending: true });
    expect(query.order).toHaveBeenNthCalledWith(2, 'id', { ascending: true });
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('continua a validação de conflitos além da primeira página', async () => {
    query.range.mockImplementation((from: number) => {
      queryResult = {
        data: from === 0
          ? Array.from({ length: 1000 }, (_, index) => ({
              id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
              attributes: [{ name: 'Cor', value: 'Branco' }],
            }))
          : [{ id: targetVariationId, attributes: [{ name: 'cor', value: 'preto' }] }],
        error: null,
      };
      return query;
    });

    await expect(
      checkMobileVariationAttributeConflict(sourceVariationId, targetParentId, [
        { name: 'Cor', value: 'Preto' },
      ])
    ).resolves.toBe(true);
    expect(query.range).toHaveBeenNthCalledWith(1, 0, 999);
    expect(query.range).toHaveBeenNthCalledWith(2, 1000, 1999);
  });

  it('não trata falha de contagem do pai como se a origem tivesse outras variações', async () => {
    queryResult = { data: null, error: { message: 'network error' }, count: null };

    await expect(countMobileParentVariations(targetParentId)).rejects.toThrow(
      'confirmar as variações do produto de origem'
    );
  });

  it('normaliza e confirma a criação de atributos sem tratar metacaracteres como curingas', async () => {
    queueResults('attributes',
      { data: [], error: null },
      { data: { id: targetParentId, name: 'Cor (Acabamento)' }, error: null }
    );
    queueResults('attribute_values',
      { data: [], error: null },
      { data: { value: 'Preto Fosco' }, error: null }
    );

    await expect(ensureMobileAttributeValue('Cor (Acabamento)', 'Preto Fosco')).resolves.toEqual({
      name: 'Cor (Acabamento)',
      value: 'Preto Fosco',
    });
    expect(query.filter).toHaveBeenCalledWith('name', 'imatch', '^Cor \\(Acabamento\\)$');
    expect(query.filter).toHaveBeenCalledWith('value', 'imatch', '^Preto Fosco$');
    expect(query.insert).toHaveBeenNthCalledWith(1, { name: 'Cor (Acabamento)', active: true });
    expect(query.insert).toHaveBeenNthCalledWith(2, { attribute_id: targetParentId, value: 'Preto Fosco' });
  });

  it('move a variação pela RPC e mantém a relação de fotos do produto pai sincronizada', async () => {
    queueResults('product_variations',
      { data: { id: sourceVariationId, product_id: targetVariationId }, error: null },
      { data: {
          id: sourceVariationId,
          product_id: targetParentId,
          sku: 'PAI-03',
          name: 'Produto Preto',
          attributes: [{ name: 'Cor', value: 'Preto' }],
          image_url: null,
          images: ['https://images.example/item.jpg'],
        }, error: null }
    );
    queueResults('products', { data: { id: targetVariationId, deleted: true }, error: null });
    queueResults('product_images',
      { data: [], error: null },
      { data: [{ product_id: targetParentId, image_url: 'https://images.example/item.jpg' }], error: null }
    );
    mocks.rpc.mockResolvedValueOnce({
      data: { newSku: 'PAI-03', sourceParentRemoved: true },
      error: null,
    });

    await expect(
      moveMobileVariationToFamily(
        sourceVariationId,
        targetParentId,
        [{ name: 'Cor', value: 'Preto' }],
        'Produto Preto',
        ['https://images.example/item.jpg'],
        targetVariationId
      )
    ).resolves.toEqual({ newSku: 'PAI-03', sourceParentRemoved: true });

    expect(mocks.rpc).toHaveBeenCalledWith('move_variation_to_parent', {
      p_variation_id: sourceVariationId,
      p_target_parent_id: targetParentId,
      p_attributes: [{ name: 'Cor', value: 'Preto' }],
      p_name: 'Produto Preto',
      p_images: ['https://images.example/item.jpg'],
      p_source_parent_id: targetVariationId,
    });
    expect(mocks.from).toHaveBeenCalledWith('product_images');
    expect(query.insert).toHaveBeenCalledWith([
      { product_id: targetParentId, image_url: 'https://images.example/item.jpg', is_main: false },
    ]);
  });

  it('recusa identidade legada antes de chamar a RPC de movimentação', async () => {
    await expect(
      moveMobileVariationToFamily(
        'produto_legacy',
        targetParentId,
        [{ name: 'Cor', value: 'Preto' }],
        'Produto Preto',
        []
      )
    ).rejects.toThrow('UUID válido');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('rejeita RPC de erro transitório como resultado incerto', async () => {
    queueResults('product_variations', {
      data: { id: sourceVariationId, product_id: targetVariationId }, error: null,
    });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '08006', message: 'connection failure' },
      status: 503,
    });

    await expect(moveMobileVariationToFamily(
      sourceVariationId,
      targetParentId,
      [{ name: 'Cor', value: 'Preto' }],
      'Produto Preto',
      [],
      targetVariationId
    )).rejects.toMatchObject({ uncertain: true });
  });

  it('permite nova tentativa quando a RPC retorna rejeição determinística confirmada', async () => {
    queueResults('product_variations', {
      data: { id: sourceVariationId, product_id: targetVariationId }, error: null,
    });
    mocks.rpc.mockResolvedValueOnce({
      data: null,
      error: { code: '23514', message: 'invalid target' },
      status: 400,
    });

    await expect(moveMobileVariationToFamily(
      sourceVariationId,
      targetParentId,
      [{ name: 'Cor', value: 'Preto' }],
      'Produto Preto',
      [],
      targetVariationId
    )).rejects.toThrow('Confira os dados, o destino e as permissões');
  });

  it('bloqueia antes da RPC quando o pai de origem mudou desde a revisão', async () => {
    queueResults('product_variations', {
      data: { id: sourceVariationId, product_id: targetParentId }, error: null,
    });

    await expect(moveMobileVariationToFamily(
      sourceVariationId,
      targetParentId,
      [{ name: 'Cor', value: 'Preto' }],
      'Produto Preto',
      [],
      targetVariationId
    )).rejects.toThrow('mudou de produto pai');
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it('trava nova tentativa quando ACK foi aceito pela RPC, mas faltam dados de confirmação', async () => {
    queueResults('product_variations',
      { data: { id: sourceVariationId, product_id: targetVariationId }, error: null },
      { data: {
          id: sourceVariationId,
          product_id: targetParentId,
          sku: 'PAI-03',
          name: 'Produto Preto',
          attributes: [{ name: 'Cor', value: 'Preto' }],
          image_url: null,
          images: [],
        }, error: null }
    );
    mocks.rpc.mockResolvedValueOnce({ data: { newSku: 'PAI-03' }, error: null });

    await expect(moveMobileVariationToFamily(
      sourceVariationId,
      targetParentId,
      [{ name: 'Cor', value: 'Preto' }],
      'Produto Preto',
      [],
      targetVariationId
    )).rejects.toMatchObject({ uncertain: true });
  });

  it('marca como incerto quando a RPC confirma o movimento sem retorno válido', async () => {
    queueResults('product_variations', {
      data: { id: sourceVariationId, product_id: targetVariationId }, error: null,
    });
    mocks.rpc.mockResolvedValueOnce({ data: null, error: null });

    await expect(moveMobileVariationToFamily(
      sourceVariationId,
      targetParentId,
      [{ name: 'Cor', value: 'Preto' }],
      'Produto Preto',
      [],
      targetVariationId
    )).rejects.toMatchObject({ uncertain: true });
    expect(mocks.from).toHaveBeenCalledTimes(1);
  });

  it('marca como incerto se a leitura de volta perder a opção showName do atributo', async () => {
    queueResults('product_variations',
      { data: { id: sourceVariationId, product_id: targetVariationId }, error: null },
      { data: {
          id: sourceVariationId,
          product_id: targetParentId,
          sku: 'PAI-03',
          name: 'Produto Preto',
          attributes: [{ name: 'Cor', value: 'Preto', showName: true }],
          image_url: null,
          images: [],
        }, error: null }
    );
    mocks.rpc.mockResolvedValueOnce({
      data: { newSku: 'PAI-03', sourceParentRemoved: false }, error: null,
    });

    await expect(moveMobileVariationToFamily(
      sourceVariationId,
      targetParentId,
      [{ name: 'Cor', value: 'Preto', showName: false }],
      'Produto Preto',
      [],
      targetVariationId
    )).rejects.toMatchObject({ uncertain: true });
  });

  it('marca o movimento como incerto se a gravação complementar de fotos não for confirmada', async () => {
    queueResults('product_variations',
      { data: { id: sourceVariationId, product_id: targetVariationId }, error: null },
      { data: {
          id: sourceVariationId,
          product_id: targetParentId,
          sku: 'PAI-03',
          name: 'Produto Preto',
          attributes: [{ name: 'Cor', value: 'Preto' }],
          image_url: null,
          images: ['https://images.example/item.jpg'],
        }, error: null }
    );
    queueResults('product_images',
      { data: [], error: null },
      { data: null, error: { code: '08006', message: 'connection failure' }, status: 503 }
    );
    mocks.rpc.mockResolvedValueOnce({
      data: { newSku: 'PAI-03', sourceParentRemoved: false }, error: null,
    });

    await expect(moveMobileVariationToFamily(
      sourceVariationId,
      targetParentId,
      [{ name: 'Cor', value: 'Preto' }],
      'Produto Preto',
      ['https://images.example/item.jpg'],
      targetVariationId
    )).rejects.toMatchObject({ uncertain: true });
  });

  it('mescla pelo contrato transacional do ERP e retorna os fornecedores transferidos', async () => {
    mocks.rpc.mockResolvedValueOnce({
      data: { transferredSupplierIds: ['supplier-1'], canonicalSupplierIds: ['supplier-1'] },
      error: null,
    });

    await expect(
      mergeMobileVariationIntoCanonical(sourceVariationId, targetVariationId)
    ).resolves.toEqual({
      transferredSupplierIds: ['supplier-1'],
      canonicalSupplierIds: ['supplier-1'],
    });
    expect(mocks.rpc).toHaveBeenCalledWith('merge_product_variation_into_canonical', {
      p_non_canonical_variation_id: sourceVariationId,
      p_canonical_variation_id: targetVariationId,
    });
    expect(query.update).toHaveBeenCalledWith({ active: false, status: 'hidden' });
    expect(query.eq).toHaveBeenCalledWith('id', sourceVariationId);
  });
});
