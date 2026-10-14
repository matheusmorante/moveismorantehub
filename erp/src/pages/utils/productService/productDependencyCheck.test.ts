import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  checkProductHasMoves,
  checkProductIsUnreferenced,
  checkProductIsUsed,
  checkProductLinkedToSales,
  checkVariationIsUsed,
  physicalDeleteProduct,
  physicalDeleteVariation,
} from './productDependencyCheck';

const mockDb = vi.hoisted(() => ({ from: vi.fn(), rpc: vi.fn() }));

vi.mock('@/pages/utils/supabaseConfig', () => ({ supabase: mockDb }));
vi.mock('./productLocalCache', () => ({
  getLocalProducts: vi.fn(() => []),
  saveLocalProducts: vi.fn(),
  notifySubscribers: vi.fn(),
}));
vi.mock('./productMutationService', () => ({ updateProduct: vi.fn() }));

const queryResult = (result: { data: unknown[] | null; error: unknown | null }) => {
  const query: any = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    filter: vi.fn(() => query),
    limit: vi.fn(() => query),
    then: (resolve: (value: typeof result) => unknown) => Promise.resolve(result).then(resolve),
  };
  return query;
};

describe('checkProductLinkedToSales', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
  });

  it('retorna o pedido quando encontra o produto em order_items', async () => {
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'order_items') {
        return queryResult({ data: [{ id: 'item-1', order_id: 'order-1' }], error: null });
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(checkProductLinkedToSales('produto-1')).resolves.toBe('order-1');
  });

  it('retorna ausência somente após consultar a fonte normalizada', async () => {
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'order_items') {
        return queryResult({ data: [], error: null });
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(checkProductLinkedToSales('produto-1')).resolves.toBeNull();
    expect(mockDb.from).toHaveBeenCalledTimes(1);
    expect(mockDb.from).toHaveBeenCalledWith('order_items');
  });

  it('falha fechada quando a verificação de vínculo apresenta erro', async () => {
    mockDb.from.mockImplementation(() => {
      throw new Error('indisponível');
    });

    await expect(checkProductLinkedToSales('produto-1')).rejects.toThrow('indisponível');
  });

  it('verifica movimentação e pedidos somente nas fontes normalizadas', async () => {
    const productId = '11111111-1111-4111-8111-111111111111';
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'order_items') {
        return queryResult({ data: [{ id: 'item-1' }], error: null });
      }
      if (table === 'inventory_moves') {
        return queryResult({ data: [], error: null });
      }
      throw new Error(`Tabela inesperada: ${table}`);
    });

    await expect(checkProductHasMoves(productId)).resolves.toBe(true);
    expect(mockDb.from).not.toHaveBeenCalledWith('orders');
  });

  it('considera produto usado por order_items sem consultar JSONB legado', async () => {
    const productId = '22222222-2222-4222-8222-222222222222';
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'order_items') {
        return queryResult({ data: [{ id: 'item-1' }], error: null });
      }
      return queryResult({ data: [], error: null });
    });

    await expect(checkProductIsUsed(productId)).resolves.toBe(true);
    expect(mockDb.from).not.toHaveBeenCalledWith('orders');
  });

  it('considera variação usada por order_items sem consultar JSONB legado', async () => {
    const variationId = '33333333-3333-4333-8333-333333333333';
    mockDb.from.mockImplementation((table: string) => {
      if (table === 'order_items') {
        return queryResult({ data: [{ id: 'item-1' }], error: null });
      }
      return queryResult({ data: [], error: null });
    });

    await expect(checkVariationIsUsed(variationId)).resolves.toBe(true);
    expect(mockDb.from).not.toHaveBeenCalledWith('orders');
  });
});

describe('physicalDeleteVariation', () => {
  beforeEach(() => {
    mockDb.from.mockReset();
    mockDb.rpc.mockReset();
  });

  it('bloqueia a exclusão da última variação sem excluir o produto pai', async () => {
    mockDb.rpc.mockResolvedValue({
      data: {
        success: false,
        code: 'last_variation',
        message: 'Todo produto precisa manter ao menos uma variação.',
      },
      error: null,
    });

    const result = await physicalDeleteVariation(
      '55555555-5555-4555-8555-555555555555',
      '44444444-4444-4444-8444-444444444444'
    );

    expect(result).toMatchObject({ success: false });
    expect(result.message).toContain('ao menos uma variação');
    expect(mockDb.from).not.toHaveBeenCalledWith('products');
  });

  it('verifica ausência de vínculos e exclui produto sem referências via RPC', async () => {
    const productId = '66666666-6666-4666-8666-666666666666';
    mockDb.rpc.mockResolvedValueOnce({ data: true, error: null }).mockResolvedValueOnce({
      data: { success: true, code: 'product_deleted', message: 'Produto excluído com sucesso.' },
      error: null,
    });

    await expect(checkProductIsUnreferenced(productId)).resolves.toBe(true);
    await expect(physicalDeleteProduct(productId)).resolves.toEqual({
      success: true,
      message: 'Produto excluído com sucesso.',
    });
    expect(mockDb.rpc).toHaveBeenNthCalledWith(1, 'product_is_unreferenced', {
      p_product_id: productId,
    });
    expect(mockDb.rpc).toHaveBeenNthCalledWith(2, 'delete_unreferenced_product', {
      p_product_id: productId,
    });
  });

  it('moveProductToTrash chama move_product_to_trash via RPC e retorna sucesso', async () => {
    const productId = '77777777-7777-4777-8777-777777777777';
    mockDb.rpc.mockResolvedValueOnce({
      data: { success: true, code: 'moved_to_trash', message: 'Produto movido para a lixeira.' },
      error: null,
    });

    const { moveProductToTrash } = await import('./productDependencyCheck');
    const result = await moveProductToTrash(productId);

    expect(mockDb.rpc).toHaveBeenCalledWith('move_product_to_trash', {
      p_product_id: productId,
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Produto movido para a lixeira.');
  });

  it('moveProductToTrash retorna erro quando RPC acusa impedimento', async () => {
    const productId = '88888888-8888-4888-8888-888888888888';
    mockDb.rpc.mockResolvedValueOnce({
      data: {
        success: false,
        code: 'product_in_use',
        message: 'Produto possui vendas vinculadas',
      },
      error: null,
    });

    const { moveProductToTrash } = await import('./productDependencyCheck');
    const result = await moveProductToTrash(productId);

    expect(result.success).toBe(false);
    expect(result.message).toBe('Produto possui vendas vinculadas');
  });

  it('restoreProductFromTrash chama restore_product_from_trash via RPC e restaura com sucesso', async () => {
    const productId = '99999999-9999-4999-8999-999999999999';
    mockDb.rpc.mockResolvedValueOnce({
      data: {
        success: true,
        code: 'restored_from_trash',
        message: 'Produto restaurado da lixeira.',
      },
      error: null,
    });

    const { restoreProductFromTrash } = await import('./productDependencyCheck');
    const result = await restoreProductFromTrash(productId);

    expect(mockDb.rpc).toHaveBeenCalledWith('restore_product_from_trash', {
      p_product_id: productId,
    });
    expect(result.success).toBe(true);
    expect(result.message).toBe('Produto restaurado da lixeira.');
  });
});
