import { describe, expect, it } from 'vitest';
import { calculateOptimizedDeliveryRoute } from './calculateOptimizedDeliveryRoute';
import type { DeliveryRouteItem } from '../hooks/useDeliveryRoute';

const item = (id: string, latitude: number, longitude: number, status: DeliveryRouteItem['status'] = 'pending'): DeliveryRouteItem => ({
  id,
  order: { order_data: {} },
  customerName: id,
  fullAddress: 'Curitiba',
  itemsCount: 1,
  sequence: 1,
  status,
  coords: { latitude, longitude },
  hasValidCoords: true,
  isCurrent: false,
  isNext: false,
  periodLabel: 'COMERCIAL',
  isFixedTime: false,
});

describe('calculateOptimizedDeliveryRoute', () => {
  it('mantém concluídas antes e reindexa a sugestão de rota', () => {
    const completed = item('done', -25.35, -49.16, 'completed');
    const far = item('far', -25.45, -49.26);
    const near = item('near', -25.36, -49.17);

    const result = calculateOptimizedDeliveryRoute([completed, far, near], { latitude: -25.352, longitude: -49.169 });

    expect(result.optimizedItems.map(routeItem => routeItem.id)).toEqual(['done', 'near', 'far']);
    expect(result.optimizedItems.map(routeItem => routeItem.sequence)).toEqual([1, 2, 3]);
    expect(result.savedKm).toBeGreaterThan(0);
  });

  it('não propõe alteração para um único item pendente', () => {
    const pending = item('pending', -25.36, -49.17);
    expect(calculateOptimizedDeliveryRoute([pending], { latitude: -25.352, longitude: -49.169 })).toMatchObject({
      hasImprovement: false,
      optimizedItems: [pending],
    });
  });
});
