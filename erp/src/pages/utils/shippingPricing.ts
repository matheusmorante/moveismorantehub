export const FREIGHT_PER_KM = 2;

export const calculateFreightByDistance = (distanceKm: number): number =>
    Math.round(Math.max(0, distanceKm) * FREIGHT_PER_KM * 100) / 100;
