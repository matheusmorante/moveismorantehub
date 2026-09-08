import type { DeliveryRouteItem } from '../hooks/useDeliveryRoute';

export interface OptimizationResult {
  hasImprovement: boolean;
  optimizedItems: DeliveryRouteItem[];
  savedKm: number;
  savedMinutes: number;
  originalKm: number;
  optimizedKm: number;
}

type Coordinates = { latitude: number; longitude: number };

const calculateDistanceKm = (from: Coordinates, to: Coordinates): number => {
  const radiusKm = 6371;
  const latitudeDelta = ((to.latitude - from.latitude) * Math.PI) / 180;
  const longitudeDelta = ((to.longitude - from.longitude) * Math.PI) / 180;
  const a = Math.sin(latitudeDelta / 2) ** 2
    + Math.cos((from.latitude * Math.PI) / 180) * Math.cos((to.latitude * Math.PI) / 180) * Math.sin(longitudeDelta / 2) ** 2;
  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)) * 1.3;
};

const calculateRouteDistance = (items: DeliveryRouteItem[], origin: Coordinates): number => {
  let totalKm = 0;
  let previous = origin;
  for (const item of items) {
    if (!item.coords) continue;
    totalKm += calculateDistanceKm(previous, item.coords);
    previous = item.coords;
  }
  return totalKm;
};

const sortByNearestNeighbor = (items: DeliveryRouteItem[], origin: Coordinates): DeliveryRouteItem[] => {
  const remaining = [...items];
  const result: DeliveryRouteItem[] = [];
  let current = origin;

  while (remaining.length > 0) {
    let selectedIndex = remaining.findIndex(item => !item.coords);
    if (selectedIndex < 0) {
      selectedIndex = 0;
      let shortestDistance = Infinity;
      for (let index = 0; index < remaining.length; index++) {
        const candidate = remaining[index];
        if (!candidate.coords) continue;
        const distance = calculateDistanceKm(current, candidate.coords);
        if (distance < shortestDistance) {
          shortestDistance = distance;
          selectedIndex = index;
        }
      }
    }
    const [selected] = remaining.splice(selectedIndex, 1);
    result.push(selected);
    if (selected.coords) current = selected.coords;
  }

  return result;
};

/** Calcula uma sugestão de sequência em memória, sem persistir nem alterar pedidos. */
export const calculateOptimizedDeliveryRoute = (items: DeliveryRouteItem[], origin: Coordinates): OptimizationResult => {
  const completed = items.filter(item => item.status === 'completed');
  const pending = items.filter(item => item.status !== 'completed');
  if (pending.length <= 1) {
    return { hasImprovement: false, optimizedItems: items, savedKm: 0, savedMinutes: 0, originalKm: 0, optimizedKm: 0 };
  }

  const originalKm = calculateRouteDistance(pending, origin);
  const optimizedPending = sortByNearestNeighbor(pending, origin);
  const optimizedKm = calculateRouteDistance(optimizedPending, origin);
  const savedKm = Math.max(0, Number((originalKm - optimizedKm).toFixed(1)));

  return {
    hasImprovement: savedKm >= 1.5,
    optimizedItems: [...completed, ...optimizedPending].map((item, index) => ({ ...item, sequence: index + 1 })),
    savedKm,
    savedMinutes: Math.max(0, Math.round(savedKm * 2)),
    originalKm: Number(originalKm.toFixed(1)),
    optimizedKm: Number(optimizedKm.toFixed(1)),
  };
};
