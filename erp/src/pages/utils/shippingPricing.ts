import { getSettings } from './settingsService';

export const FREIGHT_PER_KM = 2;
export const FREE_FREIGHT_MAX_DISTANCE_KM = 5;

export const calculateFreightByDistance = (distanceKm: number): number => {
  const safeDistance = Math.max(0, Number(distanceKm) || 0);

  // Distâncias a menos de 5 km têm valor de frete 0
  if (safeDistance < FREE_FREIGHT_MAX_DISTANCE_KM) {
    return 0;
  }

  const configuredRate = Number(getSettings().freightPerKm);
  const ratePerKm =
    Number.isFinite(configuredRate) && configuredRate > 0 ? configuredRate : FREIGHT_PER_KM;

  return Math.round(safeDistance * ratePerKm * 100) / 100;
};
