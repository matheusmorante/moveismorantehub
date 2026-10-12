import { describe, expect, it, vi } from 'vitest';
import {
  buildCustomerOrderMatchFilter,
  calculateCustomerOrderCounts,
  fetchPaginatedRows,
} from './customerOrderCounts';

describe('customer order counts', () => {
  it('builds a customer-scoped filter that includes active orders and name-only legacy matches', () => {
    expect(
      buildCustomerOrderMatchFilter([{ id: 'customer-1', fullName: 'Cliente Teste' }])
    ).toBe(
      'and(or(deleted.is.null,deleted.eq.false),or(customer_id.in.(customer-1),customer_name.ilike."Cliente Teste"))'
    );
  });

  it('paginates with ordered, non-overlapping ranges until the final short page', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [1, 2], error: null })
      .mockResolvedValueOnce({ data: [3], error: null });

    await expect(fetchPaginatedRows(fetchPage, 2)).resolves.toEqual([1, 2, 3]);
    expect(fetchPage).toHaveBeenNthCalledWith(1, 0, 1);
    expect(fetchPage).toHaveBeenNthCalledWith(2, 2, 3);
  });

  it('returns no partial count result when a page fails', async () => {
    const fetchPage = vi
      .fn()
      .mockResolvedValueOnce({ data: [1, 2], error: null })
      .mockResolvedValueOnce({ data: null, error: new Error('query failed') });

    await expect(fetchPaginatedRows(fetchPage, 2)).resolves.toBeNull();
  });

  it('prefers customer ID and falls back to case-insensitive name matching', () => {
    const counts = calculateCustomerOrderCounts(
      [
        { id: 'customer-1', fullName: 'Cliente Teste' },
        { id: 'customer-2', fullName: 'Cliente Teste' },
      ],
      [
        { id: 'order-1', customer_id: 'customer-1', customer_name: 'Cliente Teste' },
        { id: 'order-2', customer_id: null, customer_name: ' cliente teste ' },
        { id: 'order-3', customer_id: 'removed-customer', customer_name: 'Cliente Teste' },
      ]
    );

    expect(counts).toEqual({ 'customer-1': 1, 'customer-2': 2 });
  });
});
