import { describe, expect, it } from 'vitest';
import { orderShowsPhysicalCirculation } from '../cancellationEligibility';

describe('orderShowsPhysicalCirculation', () => {
  it('blocks NF-e cancellation for a fulfilled sale even when delivery metadata is missing', () => {
    expect(orderShowsPhysicalCirculation({ status: 'fulfilled' })).toBe(true);
  });

  it('allows the pre-delivery scenario while a sale is still scheduled', () => {
    expect(orderShowsPhysicalCirculation({ status: 'scheduled' })).toBe(false);
  });

  it('blocks cancellation after a delivery status or event confirms circulation', () => {
    expect(
      orderShowsPhysicalCirculation(
        { status: 'scheduled', delivery_status: 'in_transit' },
      )
    ).toBe(true);
    expect(
      orderShowsPhysicalCirculation(
        { status: 'scheduled', order_data: { shipping: { deliveryFinishedAt: '2026-09-30' } } },
      )
    ).toBe(true);
  });

  it('blocks cancellation when delivery status confirms circulation', () => {
    expect(
      orderShowsPhysicalCirculation({ status: 'scheduled', delivery_status: 'entregue' })
    ).toBe(true);
  });
});
