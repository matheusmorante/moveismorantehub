import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getSettings } = vi.hoisted(() => ({
    getSettings: vi.fn(),
}));

vi.mock('./settingsService', () => ({ getSettings }));

import { calculateFreightByDistance } from '../shippingPricing';

describe('calculateFreightByDistance', () => {
    beforeEach(() => {
        getSettings.mockReset();
    });

    it('uses the configured freight rate per kilometer', () => {
        getSettings.mockReturnValue({ freightPerKm: 2 });

        expect(calculateFreightByDistance(12.5)).toBe(25);
    });

    it('respects a zero rate and does not silently apply the fallback', () => {
        getSettings.mockReturnValue({ freightPerKm: 0 });

        expect(calculateFreightByDistance(12.5)).toBe(0);
    });

    it('clamps negative distances to zero', () => {
        getSettings.mockReturnValue({ freightPerKm: 2 });

        expect(calculateFreightByDistance(-4)).toBe(0);
    });
});
