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
  mergeMobileVariationIntoCanonical,
  mobileVariationAttributesConflict,
  moveMobileVariationToFamily,
  toMobileVariationAttributes,
} from './mobileProductVariationActionsService';

const sourceVariationId = '123e4567-e89b-42d3-a456-426614174000';
const targetVariationId = '123e4567-e89b-42d3-a456-426614174001';
const targetParentId = '123e4567-e89b-42d3-a456-426614174002';

let query: any;

describe('mobileProductVariationActionsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    query = {
      select: vi.fn(() => query),
      update: vi.fn(() => query),
      eq: vi.fn().mockResolvedValue({ data: [], error: null }),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    mocks.from.mockReturnValue(query);
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

  it('move a variação pela RPC e mantém a relação de fotos do produto pai sincronizada', async () => {
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
