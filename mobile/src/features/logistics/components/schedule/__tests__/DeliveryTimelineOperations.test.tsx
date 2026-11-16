import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

vi.mock('react-native', () => ({
  View: 'div', Text: 'span', TouchableOpacity: 'button', ScrollView: 'div', RefreshControl: 'div',
  StyleSheet: { create: (styles: unknown) => styles },
}));
vi.mock('../../../../../services/supabaseClient', () => ({ supabase: {} }));
vi.mock('../ScheduleCard', () => ({ ScheduleCard: ({ item }: any) => <div>Entrega {item.orderIndex}</div> }));
vi.mock('../../../../assemblies/components/AssemblyOrderCard', () => ({
  AssemblyOrderCard: ({ order, item }: any) => <div>Montagem {order.scheduleAppointment.index}/{order.scheduleAppointment.total}: {item.description}</div>,
}));
vi.mock('../deliveryTimelineMarker', () => ({ getDeliveryTimelineMarker: () => ({ color: '#000' }) }));

import { DeliveryTimelineView } from '../DeliveryTimelineView';

describe('cronograma de operações', () => {
  it('exibe a entrega e a montagem da retirada em cartões separados', () => {
    const delivery = {
      id: 'delivery-one', orderIndex: '000533', customerName: 'Cliente', periodLabel: '09:00',
      order: { shipping: { scheduling: { date: '2099-01-01', time: '09:00', type: 'fixed' } } },
    } as any;
    const assembly = {
      id: 'assembly-two', isOutside: false, scheduledTime: '10:00', item: { description: 'Mesa' },
      order: { scheduleAppointment: { index: 2, total: 2 }, shipping: { scheduling: { date: '2099-01-01', time: '10:00', type: 'fixed' } } },
    } as any;
    const html = renderToStaticMarkup(
      <DeliveryTimelineView items={[delivery]} assemblyTasks={[assembly]} refreshing={false} onRefresh={vi.fn()} onViewOrder={vi.fn()} handlingOptions={[]} />
    );
    expect(html).toContain('Entrega 000533');
    expect(html).toContain('Montagem 2/2: Mesa');
  });
});
