import { describe, expect, it } from 'vitest';
import {
  requiresGlobalOrderFiltering,
  selectFilteredOrderHistoryPage,
} from './useOrderHistoryFilters';

describe('order history global filters', () => {
  it('scans globally when the list uses filters or sorting that run on the client', () => {
    expect(
      requiresGlobalOrderFiltering({
        multiSort: [{ key: 'date', order: 'desc' }],
        valueRange: { min: 0, max: 1000000 },
      })
    ).toBe(false);
    expect(requiresGlobalOrderFiltering({ valueRange: { min: 50, max: 500 } })).toBe(false);
    expect(requiresGlobalOrderFiltering({ productName: 'mesa' })).toBe(true);
    expect(requiresGlobalOrderFiltering({ customerName: 'Joao' })).toBe(true);
    expect(requiresGlobalOrderFiltering({ multiSort: [{ key: 'customer', order: 'asc' }] })).toBe(
      true
    );
  });

  it('filters, sorts and paginates the whole candidate set before slicing', () => {
    const orders = Array.from({ length: 30 }, (_, index) => ({
      id: `order-${index + 1}`,
      date: `2026-10-${String(index + 1).padStart(2, '0')}`,
      status: 'scheduled',
      orderType: 'sale',
      deleted: false,
      seller: 'Vendedor',
      assistanceDescription: '',
      items: [{ description: index % 3 === 0 ? 'Mesa sintética' : 'Cadeira sintética' }],
      paymentsSummary: { totalOrderValue: 100 },
    })) as any[];

    const page = selectFilteredOrderHistoryPage(
      orders,
      {
        productName: 'mesa',
        valueRange: { min: 0, max: 1000000 },
        multiSort: [{ key: 'date', order: 'desc' }],
      },
      2,
      4
    );

    expect(page.total).toBe(10);
    expect(page.orders.map((order) => order.id)).toEqual([
      'order-16',
      'order-13',
      'order-10',
      'order-7',
    ]);
  });
});
