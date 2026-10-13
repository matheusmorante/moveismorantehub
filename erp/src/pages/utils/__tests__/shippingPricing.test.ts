import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettings, supabaseFrom } = vi.hoisted(() => ({
  getSettings: vi.fn(),
  supabaseFrom: vi.fn(),
}));

vi.mock('../supabaseConfig', () => ({ supabase: { from: supabaseFrom } }));
vi.mock('../settingsService', () => ({ getSettings }));

import { calculateFreightByDistance, FREIGHT_PER_KM, FREE_FREIGHT_MAX_DISTANCE_KM } from '../shippingPricing';

describe('calculateFreightByDistance', () => {
  beforeEach(() => {
    getSettings.mockReset();
  });

  it('retorna frete 0 para distâncias a menos de 5 km', () => {
    getSettings.mockReturnValue({ freightPerKm: 2 });

    expect(calculateFreightByDistance(0)).toBe(0);
    expect(calculateFreightByDistance(2.5)).toBe(0);
    expect(calculateFreightByDistance(4.9)).toBe(0);
    expect(calculateFreightByDistance(4.99)).toBe(0);
  });

  it('calcula o frete como 2x a distância para distâncias a partir de 5 km', () => {
    getSettings.mockReturnValue({ freightPerKm: 2 });

    expect(calculateFreightByDistance(5)).toBe(10);
    expect(calculateFreightByDistance(6)).toBe(12);
    expect(calculateFreightByDistance(10)).toBe(20);
    expect(calculateFreightByDistance(12.5)).toBe(25);
  });

  it('utiliza a taxa configurada quando maior que zero para distâncias a partir de 5 km', () => {
    getSettings.mockReturnValue({ freightPerKm: 3 });

    expect(calculateFreightByDistance(10)).toBe(30);
  });

  it('aplica o padrão de 2x a distância quando a taxa configurada for 0 ou inválida', () => {
    getSettings.mockReturnValue({ freightPerKm: 0 });

    expect(calculateFreightByDistance(10)).toBe(20);
  });

  it('trata distâncias negativas como zero e retorna frete 0', () => {
    getSettings.mockReturnValue({ freightPerKm: 2 });

    expect(calculateFreightByDistance(-4)).toBe(0);
  });
});
