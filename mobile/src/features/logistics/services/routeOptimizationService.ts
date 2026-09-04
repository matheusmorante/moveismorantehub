import { DeliveryRouteItem } from '../hooks/useDeliveryRoute';
import { supabase } from '../../../services/supabaseClient';

export interface OptimizationResult {
  hasImprovement: boolean;
  optimizedItems: DeliveryRouteItem[];
  savedKm: number;
  savedMinutes: number;
  originalKm: number;
  optimizedKm: number;
}

// Distância Haversine entre dois pontos geográficos em KM
function haversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371; // Raio da Terra em km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  // Fator de rota urbana de ~1.3x da linha reta
  return R * c * 1.3;
}

/**
 * Otimiza a sequência das entregas pendentes com base no depósito/origem.
 * Preserva entregas já concluídas no início da lista.
 */
export function calculateOptimizedRoute(
  items: DeliveryRouteItem[],
  startCoords: { latitude: number; longitude: number }
): OptimizationResult {
  const completed = items.filter((i) => i.status === 'completed');
  const pending = items.filter((i) => i.status !== 'completed');

  if (pending.length <= 1) {
    return {
      hasImprovement: false,
      optimizedItems: items,
      savedKm: 0,
      savedMinutes: 0,
      originalKm: 0,
      optimizedKm: 0,
    };
  }

  // 1. Calcula distância da ordem original
  let originalKm = 0;
  let prevPt = startCoords;
  pending.forEach((item) => {
    if (item.coords) {
      originalKm += haversineDistanceKm(prevPt.latitude, prevPt.longitude, item.coords.latitude, item.coords.longitude);
      prevPt = item.coords;
    }
  });

  // 2. Algoritmo do Vizinho Mais Próximo (Nearest Neighbor) a partir da origem
  const remaining = [...pending];
  const optimizedPending: DeliveryRouteItem[] = [];
  let currentPt = startCoords;

  while (remaining.length > 0) {
    let nearestIdx = 0;
    let minDist = Infinity;

    for (let i = 0; i < remaining.length; i++) {
      const target = remaining[i];
      if (!target.coords) {
        // Se não tiver coordenadas, deixa para o fim
        nearestIdx = i;
        break;
      }
      const d = haversineDistanceKm(currentPt.latitude, currentPt.longitude, target.coords.latitude, target.coords.longitude);
      if (d < minDist) {
        minDist = d;
        nearestIdx = i;
      }
    }

    const [chosen] = remaining.splice(nearestIdx, 1);
    optimizedPending.push(chosen);
    if (chosen.coords) {
      currentPt = chosen.coords;
    }
  }

  // 3. Calcula distância da rota otimizada
  let optimizedKm = 0;
  prevPt = startCoords;
  optimizedPending.forEach((item) => {
    if (item.coords) {
      optimizedKm += haversineDistanceKm(prevPt.latitude, prevPt.longitude, item.coords.latitude, item.coords.longitude);
      prevPt = item.coords;
    }
  });

  const savedKm = Math.max(0, Number((originalKm - optimizedKm).toFixed(1)));
  // Estimativa de velocidade média urbana de 30 km/h -> 2 min por km
  const savedMinutes = Math.max(0, Math.round(savedKm * 2));
  const hasImprovement = savedKm >= 1.5;

  // Recombina concluídas + pendentes otimizadas com sequência reindexada
  const finalItems = [...completed, ...optimizedPending].map((item, idx) => ({
    ...item,
    sequence: idx + 1,
  }));

  return {
    hasImprovement,
    optimizedItems: finalItems,
    savedKm,
    savedMinutes,
    originalKm: Number(originalKm.toFixed(1)),
    optimizedKm: Number(optimizedKm.toFixed(1)),
  };
}

/**
 * Persiste a nova ordem de sequência nos pedidos no Supabase
 */
export async function applyOptimizedSequence(optimizedItems: DeliveryRouteItem[]): Promise<boolean> {
  try {
    const promises = optimizedItems.map(async (item, idx) => {
      const order = item.order;
      const orderData = order.order_data || {};
      const updatedOrderData = {
        ...orderData,
        routeSequence: idx + 1,
      };

      return supabase
        .from('orders')
        .update({
          order_data: updatedOrderData,
          updated_at: new Date().toISOString(),
        })
        .eq('id', item.id);
    });

    await Promise.all(promises);
    return true;
  } catch (error) {
    console.error('[RouteOptimization] Falha ao persistir nova ordem do roteiro:', error);
    return false;
  }
}
