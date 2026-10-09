import { describe, expect, it, vi } from 'vitest';
import { excludeTestOrders, NON_TEST_ORDER_FILTER } from '../../../../../shared-utils/testArtifactQueries';

describe('filtro de testes aplicado no servidor', () => {
  it('usa os campos JSON existentes e preserva pedidos com JSON/flags ausentes', () => {
    const query = { or: vi.fn().mockReturnThis() };
    expect(excludeTestOrders(query)).toBe(query);
    expect(query.or).toHaveBeenCalledWith(NON_TEST_ORDER_FILTER);
    expect(NON_TEST_ORDER_FILTER).toContain('order_data.is.null');
    expect(NON_TEST_ORDER_FILTER).toContain('order_data->>is_test.neq.true');
    expect(NON_TEST_ORDER_FILTER).not.toContain('test_run_id');
  });
  it('filtra a relação de pedidos antes de agregar os itens', () => {
    const query = { or: vi.fn().mockReturnThis() };
    excludeTestOrders(query, 'orders');
    expect(query.or).toHaveBeenCalledWith(NON_TEST_ORDER_FILTER, { referencedTable: 'orders' });
  });
});
