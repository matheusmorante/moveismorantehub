import { beforeEach, describe, expect, it, vi } from 'vitest';

const { supabaseMock } = vi.hoisted(() => ({
  supabaseMock: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

vi.mock('../../../services/supabaseClient', () => ({ supabase: supabaseMock }));

import {
  checkMobileAttributeUsage,
  createMobileAttributeWithOptions,
  deleteMobileAttribute,
} from './mobileAttributeService';

describe('mobile attribute service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('creates a list through the single transactional RPC', async () => {
    supabaseMock.rpc.mockResolvedValue({ data: 'attribute-id', error: null });

    const id = await createMobileAttributeWithOptions(' Cor ', 'list', '', ['Azul', 'Preto']);

    expect(id).toBe('attribute-id');
    expect(supabaseMock.rpc).toHaveBeenCalledWith('create_mobile_product_attribute_with_values', {
      p_name: 'Cor',
      p_data_type: 'list',
      p_unit: null,
      p_values: ['Azul', 'Preto'],
    });
  });

  it('propagates RPC failure without creating the attribute through a fallback', async () => {
    const error = new Error('rollback');
    supabaseMock.rpc.mockResolvedValue({ data: null, error });

    await expect(createMobileAttributeWithOptions('Cor', 'list', '', ['Azul'])).rejects.toBe(error);
    expect(supabaseMock.from).not.toHaveBeenCalled();
  });

  it('checks option use through the ERP JSON attribute key', async () => {
    const queryResult = Promise.resolve({ count: 1, error: null });
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnValue(queryResult),
      not: vi.fn().mockReturnValue(queryResult),
    };
    supabaseMock.from.mockReturnValue(query);

    await expect(checkMobileAttributeUsage('Cor', 'Azul')).resolves.toBe(true);

    expect(supabaseMock.from).toHaveBeenCalledWith('product_variations');
    expect(query.select).toHaveBeenCalledWith('id', { count: 'exact', head: true });
    expect(query.eq).toHaveBeenCalledWith('attributes->>Cor', 'Azul');
  });

  it('fails closed when usage cannot be checked', async () => {
    const error = new Error('consulta negada');
    const query = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockRejectedValue(error),
      not: vi.fn().mockRejectedValue(error),
    };
    supabaseMock.from.mockReturnValue(query);

    await expect(checkMobileAttributeUsage('Cor', 'Azul')).rejects.toBe(error);
  });

  it('deletes the parent once and lets foreign keys remove dependent rows atomically', async () => {
    const query = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockResolvedValue({ error: null }),
    };
    supabaseMock.from.mockReturnValue(query);

    await deleteMobileAttribute('attribute-id');

    expect(supabaseMock.from).toHaveBeenCalledWith('attributes');
    expect(query.delete).toHaveBeenCalledTimes(1);
    expect(query.eq).toHaveBeenCalledWith('id', 'attribute-id');
  });
});
