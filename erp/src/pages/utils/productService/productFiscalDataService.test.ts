import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '@/pages/utils/supabaseConfig';
import {
  clearFiscalDataMemoryCache,
  getProductsFiscalData,
} from './productFiscalDataService';

vi.mock('@/pages/utils/supabaseConfig', () => ({
  supabase: {
    from: vi.fn(),
  },
}));

describe('productFiscalDataService', () => {
  beforeEach(() => {
    clearFiscalDataMemoryCache();
    vi.clearAllMocks();
  });

  it('retorna mapa vazio quando nenhum ID válido for informado', async () => {
    const result = await getProductsFiscalData([]);
    expect(result.size).toBe(0);
    expect(supabase.from).not.toHaveBeenCalled();
  });

  it('deduplica IDs e busca produtos em lote em uma única consulta ao Supabase', async () => {
    const p1 = '11111111-1111-4111-8111-111111111111';
    const p2 = '22222222-2222-4222-8222-222222222222';

    const mockIn = vi.fn().mockResolvedValue({
      data: [
        { id: p1, fiscal: { ncm: '94036000', cfop: '5102', cst: '102', origem: '0' } },
        { id: p2, fiscal: { ncm: '94035000', cfop: '5405', cst: '500', origem: '0' } },
      ],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    // Passamos p1 duplicado e strings inválidas
    const result = await getProductsFiscalData([p1, p2, p1, 'invalid-non-uuid']);

    expect(supabase.from).toHaveBeenCalledTimes(1);
    expect(supabase.from).toHaveBeenCalledWith('products');
    expect(mockSelect).toHaveBeenCalledWith('id, fiscal');
    expect(mockIn).toHaveBeenCalledWith('id', [p1, p2]);

    expect(result.size).toBe(2);
    expect(result.get(p1)).toEqual({
      id: p1,
      ncm: '94036000',
      cest: undefined,
      cfop: '5102',
      cst: '102',
      origem: '0',
    });
    expect(result.get(p2)).toEqual({
      id: p2,
      ncm: '94035000',
      cest: undefined,
      cfop: '5405',
      cst: '500',
      origem: '0',
    });
  });

  it('utiliza cache em memória para chamadas subsequentes sem bater no Supabase (0ms)', async () => {
    const p1 = '33333333-3333-4333-8333-333333333333';

    const mockIn = vi.fn().mockResolvedValue({
      data: [{ id: p1, fiscal: { ncm: '94031000' } }],
      error: null,
    });
    const mockSelect = vi.fn().mockReturnValue({ in: mockIn });
    vi.mocked(supabase.from).mockReturnValue({ select: mockSelect } as any);

    // Primeira chamada: consulta banco
    const firstResult = await getProductsFiscalData([p1]);
    expect(firstResult.get(p1)?.ncm).toBe('94031000');
    expect(supabase.from).toHaveBeenCalledTimes(1);

    // Segunda chamada para o mesmo produto: resolve do cache (0 consultas adicionais)
    const secondResult = await getProductsFiscalData([p1]);
    expect(secondResult.get(p1)?.ncm).toBe('94031000');
    expect(supabase.from).toHaveBeenCalledTimes(1);
  });
});
