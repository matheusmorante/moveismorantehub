import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: 'div',
  Text: 'span',
  TouchableOpacity: ({ testID: _testID, onPress, children, ...props }: any) =>
    React.createElement('button', { ...props, onClick: onPress }, children),
  StyleSheet: { create: (styles: unknown) => styles },
}));

vi.mock('react-native-svg', () => ({
  default: 'svg',
  Svg: 'svg',
  Path: 'path',
  Circle: 'circle',
  Rect: 'rect',
}));

vi.mock('lucide-react-native', () => ({
  ChevronDown: () => null,
  ChevronUp: () => null,
  MapPin: () => null,
  Clock: () => null,
  Play: () => null,
  Eye: () => null,
  Truck: () => null,
}));

vi.mock('../../../../components/shared/MobileDrill', () => ({
  MobileDrill: () => null,
}));

vi.mock('../../../../utils/aiSummaryHelper', () => ({
  isAssemblyInternalType: () => false,
  isAssemblyOutsideType: () => false,
}));

import { ScheduleCard } from '../ScheduleCard';
import { DeliveryRouteItem } from '../../../hooks/useDeliveryRoute';

describe('ScheduleCard - Botões de Ação no Cronograma', () => {
  const deliveryItem: DeliveryRouteItem = {
    id: 'del-1',
    orderId: 'ord-1',
    customerName: 'Cliente Teste',
    status: 'pending',
    periodLabel: '08:00 - 12:00',
    activityType: 'delivery',
    activityLabel: 'ENTREGA',
    activityColor: '#16a34a',
    activityBackgroundColor: '#dcfce7',
    itemsCount: 3,
    order: {
      id: 'ord-1',
      order_data: {
        customerData: { fullName: 'Cliente Teste' },
        shipping: { deliveryMethod: 'delivery' },
      },
    },
  };

  const assemblyItem: DeliveryRouteItem = {
    ...deliveryItem,
    id: 'ass-1',
    activityType: 'assembly',
    activityLabel: 'MONTAGEM',
    activityColor: '#d97706',
    activityBackgroundColor: '#fef3c7',
  };

  it('exibe a ação única para abrir o fluxo em atividades de entrega', () => {
    const html = renderToStaticMarkup(
      <ScheduleCard
        item={deliveryItem}
        onStartDelivery={vi.fn()}
        onViewOrder={vi.fn()}
        onOpenDeliveryFlow={vi.fn()}
      />
    );

    expect(html).toContain('ABRIR FLUXO DE ENTREGA');
  });

  it('exibe apenas "ABRIR ATIVIDADE" quando não for atividade de entrega', () => {
    const html = renderToStaticMarkup(
      <ScheduleCard
        item={assemblyItem}
        onStartDelivery={vi.fn()}
        onViewOrder={vi.fn()}
        onOpenDeliveryFlow={vi.fn()}
      />
    );

    expect(html).toContain('ABRIR ATIVIDADE');
    expect(html).not.toContain('ABRIR FLUXO DE ENTREGA');
  });

  it('renderiza "ABRIR FLUXO DE ENTREGA" se onOpenDeliveryFlow for omitido', () => {
    const html = renderToStaticMarkup(
      <ScheduleCard
        item={deliveryItem}
        onStartDelivery={vi.fn()}
        onViewOrder={vi.fn()}
      />
    );

    expect(html).toContain('ABRIR FLUXO DE ENTREGA');
  });
});
