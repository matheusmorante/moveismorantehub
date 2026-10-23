import { beforeEach, describe, expect, it, vi } from 'vitest';
import { supabase } from '../../../services/supabaseClient';
import { fetchActiveMobileProductSuppliers } from './mobileSupplierService';

vi.mock('../../../services/supabaseClient', () => ({ supabase: { from: vi.fn() } }));

describe('fetchActiveMobileProductSuppliers', () => {
  const query = {
    select: vi.fn(),
    in: vi.fn(),
    eq: vi.fn(),
    order: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    query.select.mockReturnValue(query);
    query.in.mockReturnValue(query);
    query.eq.mockReturnValue(query);
  });

  it('consulta social_name para manter a busca de fornecedores equivalente ao ERP', async () => {
    const supplier = {
      id: 'supplier-1',
      full_name: '',
      social_name: 'Razão alternativa',
      nickname: 'Apelido',
      stock_origins: ['normal'],
      default_ipi_percent: 0,
      default_freight_cost: 0,
      default_freight_type: 'none',
    };
    query.order.mockResolvedValue({ data: [supplier], error: null });
    vi.mocked(supabase.from).mockReturnValue(query as never);

    await expect(fetchActiveMobileProductSuppliers()).resolves.toEqual([supplier]);
    expect(query.select).toHaveBeenCalledWith(
      expect.stringContaining('social_name')
    );
  });
});
