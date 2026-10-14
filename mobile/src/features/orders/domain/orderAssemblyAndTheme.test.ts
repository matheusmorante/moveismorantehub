import { describe, expect, it } from 'vitest';
import {
  getOrderAssemblyFlags,
  isHandlingDepot,
  isHandlingOutside,
  isPaidTrafficOrder,
} from './orderAssemblyRules';
import {
  getStatusConfig,
  resolveHeaderColors,
} from '../components/card/orderCardTheme';

describe('orderAssemblyRules', () => {
  const handlingOptions = [
    { label: 'Montagem no Depósito', includeInAssemblySchedule: true, isAssemblyOutside: false },
    { label: 'Montador Externo', includeInAssemblySchedule: false, isAssemblyOutside: true },
    { label: 'Sem Montagem', includeInAssemblySchedule: false, isAssemblyOutside: false },
  ];

  it('detects depot assembly correctly', () => {
    expect(isHandlingDepot('Montagem no Depósito', handlingOptions)).toBe(true);
    expect(isHandlingDepot('deposito', [])).toBe(true);
    expect(isHandlingDepot('loja', [])).toBe(true);
    expect(isHandlingDepot('Sem Montagem', handlingOptions)).toBe(false);
    expect(isHandlingDepot('apenas entrega', [])).toBe(false);
  });

  it('detects outside assembly correctly', () => {
    expect(isHandlingOutside('Montador Externo', handlingOptions)).toBe(true);
    expect(isHandlingOutside('montagem fora', [])).toBe(true);
    expect(isHandlingOutside('montagem no local', [])).toBe(true);
    expect(isHandlingOutside('Sem Montagem', handlingOptions)).toBe(false);
    expect(isHandlingOutside('apenas entrega', [])).toBe(false);
  });

  it('returns false for returns orders', () => {
    const returnOrder = {
      orderType: 'return',
      order_data: {
        handlingType: 'montagem fora',
        items: [{ handling: 'montagem fora' }],
      },
    };
    const flags = getOrderAssemblyFlags(returnOrder, handlingOptions);
    expect(flags.hasAssemblyDepot).toBe(false);
    expect(flags.hasAssemblyOutside).toBe(false);
  });

  it('detects assembly from order items or header', () => {
    const outsideOrder = {
      orderType: 'sale',
      order_data: {
        handlingType: 'sem montagem',
        items: [{ handlingType: 'montagem na entrega' }],
      },
    };
    const flags = getOrderAssemblyFlags(outsideOrder, handlingOptions);
    expect(flags.hasAssemblyOutside).toBe(true);
    expect(flags.hasAssemblyDepot).toBe(false);
  });

  it('detects paid traffic from order marketing origin', () => {
    expect(isPaidTrafficOrder({ marketingOrigin: 'Facebook Ads' })).toBe(true);
    expect(isPaidTrafficOrder({ order_data: { marketingOrigin: 'paid' } })).toBe(true);
    expect(
      isPaidTrafficOrder({
        order_data: { customerData: { marketingOrigin: 'Instagram Ads' } },
      })
    ).toBe(true);
    expect(isPaidTrafficOrder({ marketingOrigin: 'Organico' })).toBe(false);
    expect(isPaidTrafficOrder({})).toBe(false);
  });
});

describe('orderCardTheme', () => {
  it('resolves correct status configs', () => {
    expect(getStatusConfig('draft').icon).toBe('draft');
    expect(getStatusConfig('scheduled').icon).toBe('scheduled');
    expect(getStatusConfig('agendado').icon).toBe('scheduled');
    expect(getStatusConfig('fulfilled').icon).toBe('fulfilled');
    expect(getStatusConfig('entregue').icon).toBe('fulfilled');
    expect(getStatusConfig('cancelled').icon).toBe('cancelled');
    expect(getStatusConfig('cancelado').icon).toBe('cancelled');
  });

  it('resolves header colors with ERP parity', () => {
    // Cancelled
    const cancelledColors = resolveHeaderColors({
      dark: false,
      cancelled: true,
      isDraft: false,
      isBudget: false,
      isReturn: false,
      isAssistance: false,
      pickup: false,
    });
    expect(cancelledColors.headerBg).toBe('#fee2e2');

    // Pickup
    const pickupColors = resolveHeaderColors({
      dark: false,
      cancelled: false,
      isDraft: false,
      isBudget: false,
      isReturn: false,
      isAssistance: false,
      pickup: true,
    });
    expect(pickupColors.headerBg).toBe('#e9d5ff'); // Purple-200

    // Standard Delivery (Emerald-200)
    const deliveryColors = resolveHeaderColors({
      dark: false,
      cancelled: false,
      isDraft: false,
      isBudget: false,
      isReturn: false,
      isAssistance: false,
      pickup: false,
    });
    expect(deliveryColors.headerBg).toBe('#a7f3d0'); // Emerald-200
  });
});
