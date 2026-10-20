import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ getSettings: vi.fn() }));

vi.mock('../settingsService', () => ({ getSettings: mocks.getSettings }));
vi.mock('../pushNotificationService', () => ({ dispatchAppNotification: vi.fn() }));

import { getOrderAssemblyKinds } from '../orderEventNotificationService';

const orderWithHandling = (handlingType: string) => ({
  orderType: 'sale',
  items: [{ handlingType }],
}) as any;

describe('getOrderAssemblyKinds', () => {
  beforeEach(() => {
    mocks.getSettings.mockReturnValue({ deliveryHandlingOptions: [], pickupHandlingOptions: [] });
  });

  it('respects an explicit no-assembly option instead of matching the word "montagem"', () => {
    mocks.getSettings.mockReturnValue({
      deliveryHandlingOptions: [{
        label: 'Item não necessita de montagem',
        includeInAssemblySchedule: false,
        isAssemblyOutside: false,
      }],
      pickupHandlingOptions: [],
    });

    expect(getOrderAssemblyKinds(orderWithHandling('Item não necessita de montagem'))).toEqual([]);
  });

  it('preserves configured depot and outside assembly classifications', () => {
    mocks.getSettings.mockReturnValue({
      deliveryHandlingOptions: [
        { label: 'Na caixa > Montagem no depósito > Entregue montado', includeInAssemblySchedule: true },
        { label: 'Na caixa > Montagem no local da entrega', isAssemblyOutside: true },
      ],
      pickupHandlingOptions: [],
    });

    expect(getOrderAssemblyKinds(orderWithHandling('Na caixa > Montagem no depósito > Entregue montado'))).toEqual(['depot']);
    expect(getOrderAssemblyKinds(orderWithHandling('Na caixa > Montagem no local da entrega'))).toEqual(['outside']);
  });
});
