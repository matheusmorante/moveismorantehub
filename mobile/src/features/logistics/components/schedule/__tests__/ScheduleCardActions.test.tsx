import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  Animated: {
    Value: vi.fn(function () {
      return { interpolate: vi.fn(() => ({})) };
    }),
  },
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

describe('ScheduleCard - cartões compactos do cronograma', () => {
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
    activityType: 'assistance',
    activityLabel: 'ASSISTÊNCIA',
    activityColor: '#d97706',
    activityBackgroundColor: '#fef3c7',
  };

  it('mostra o fluxo como etapa e situação, sem botão nem etiqueta ENTREGA', () => {
    const html = renderToStaticMarkup(
      <ScheduleCard
        item={deliveryItem}
        onViewOrder={vi.fn()}
      />
    );

    expect(html).not.toContain('Preparação');
    expect(html).toContain('Agendada');
    expect(html).not.toContain('ENTREGA');
    expect(html).not.toContain('Iniciar fluxo de entrega');
  });

  it('mantém o tipo de assistência sem botão de ação', () => {
    const html = renderToStaticMarkup(
      <ScheduleCard
        item={assemblyItem}
        onViewOrder={vi.fn()}
      />
    );

    expect(html).toContain('ASSISTÊNCIA');
    expect(html).not.toContain('Abrir atividade');
  });

  it('mostra a etapa atual de uma entrega em rota sem repetir um botão', () => {
    const html = renderToStaticMarkup(
      <ScheduleCard
        item={{ ...deliveryItem, status: 'in_progress' }}
        onViewOrder={vi.fn()}
      />
    );

    expect(html).toContain('Em rota');
    expect(html).not.toContain('Iniciar fluxo de entrega');
  });
});
