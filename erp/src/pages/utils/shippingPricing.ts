import { getSettings } from './settingsService';

export const FREIGHT_PER_KM = 2;

export const calculateFreightByDistance = (distanceKm: number): number => {
    const configuredRate = Number(getSettings().freightPerKm);
    const ratePerKm = Number.isFinite(configuredRate) && configuredRate >= 0
        ? configuredRate
        : FREIGHT_PER_KM;

    return Math.round(Math.max(0, distanceKm) * ratePerKm * 100) / 100;
};
