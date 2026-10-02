import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchReceipts } from './stockReceiptsService';

let mockResult = { data: [] as any[] | null, error: null as any };

const builderMock: any = {
  select: vi.fn(() => builderMock),
  order: vi.fn(() => builderMock),
  range: vi.fn(() => Promise.resolve(mockResult)),
};

vi.mock('../supabaseClient', () => ({
  supabase: {
    from: vi.fn(() => builderMock),
  },
}));

describe('mobile stockReceiptsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockResult = { data: [], error: null };
  });

  it('deve buscar recebimentos paginados com cálculo correto de range', async () => {
    mockResult = {
      data: [
        {
          id: '11111111-2222-3333-4444-555555555555',
          supplier_name: 'Madeireira Paraná',
          total_value: 1250,
          received_at: '2026-10-01T10:00:00Z',
          goods_receipt_items: [
            { id: 'item-1', description: 'Tábua 3m', quantity: 10, unit_cost: 125 },
          ],
        },
      ],
      error: null,
    };

    const receipts = await fetchReceipts(0);

    expect(builderMock.range).toHaveBeenCalledWith(0, 14); // 0 * 15 até 0 + 15 - 1
    expect(receipts).toHaveLength(1);
    expect(receipts[0].supplierName).toBe('Madeireira Paraná');
    expect(receipts[0].totalValue).toBe(1250);
    expect(receipts[0].items).toHaveLength(1);
    expect(receipts[0].items[0].description).toBe('Tábua 3m');
  });

  it('deve calcular offset da segunda página (page = 1) corretamente', async () => {
    await fetchReceipts(1);
    expect(builderMock.range).toHaveBeenCalledWith(15, 29);
  });

  it('deve tratar erro na consulta retornando array vazio sem lançar exceção', async () => {
    mockResult = {
      data: null,
      error: new Error('Erro de conexão no mobile'),
    };

    const receipts = await fetchReceipts(0);
    expect(receipts).toEqual([]);
  });

  it('deve aplicar defaults para supplierName e totalValue quando vierem nulos do banco', async () => {
    mockResult = {
      data: [
        {
          id: '22222222-3333-4444-5555-666666666666',
          supplier_name: null,
          total_value: null,
          goods_receipt_items: null,
        },
      ],
      error: null,
    };

    const receipts = await fetchReceipts(0);
    expect(receipts[0].supplierName).toBe('Fornecedor');
    expect(receipts[0].totalValue).toBe(0);
    expect(receipts[0].items).toEqual([]);
  });
});
