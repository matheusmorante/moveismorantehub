import { describe, it, expect } from 'vitest';

export type DeliveryPeriodFilter = 'today' | 'next_days';

export interface DeliverySummaryMetrics {
  filteredOrders: any[];
  totalCount: number;
  morningCount: number;
  afternoonCount: number;
  morningClients: string[];
  afternoonClients: string[];
  defaultSummaryText: string;
}

export function calculateDeliverySummaryMetrics(
  orders: any[] = [],
  periodFilter: DeliveryPeriodFilter = 'today',
  referenceDateStr: string = '2026-09-06'
): DeliverySummaryMetrics {
  const todayStr = referenceDateStr;

  const filteredOrders = (orders || []).filter(order => {
    const oData = order.order_data || {};
    const dDate = order.delivery_date || order.scheduled_date || order.shipping?.scheduledDate || oData.shipping?.scheduledDate || '';
    if (!dDate) return periodFilter === 'today';
    if (periodFilter === 'today') {
      return dDate.startsWith(todayStr) || dDate === todayStr;
    } else {
      return !dDate.startsWith(todayStr) && dDate > todayStr;
    }
  });

  let morningCount = 0;
  let afternoonCount = 0;
  const morningClients: string[] = [];
  const afternoonClients: string[] = [];

  filteredOrders.forEach(order => {
    const oData = order.order_data || {};
    const customer = oData.customerData || oData.customer || {};
    const clientName = (order.customer_name || order.client_name || order.shipping?.customerName || customer.name || customer.fullName || 'Cliente').split(' ')[0];
    const rawItems = order.items || order.order_items || oData.items || [];
    const itemsCount = Array.isArray(rawItems) && rawItems.length > 0 ? rawItems.length : 1;

    const period = (order.shipping?.period || order.shipping?.scheduling?.time || oData.shipping?.scheduling?.period || oData.shipping?.period || '').toLowerCase();
    if (period.includes('manhã') || period.includes('manha')) {
      morningCount++;
      morningClients.push(`${clientName} (${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'})`);
    } else if (period.includes('tarde')) {
      afternoonCount++;
      afternoonClients.push(`${clientName} (${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'})`);
    } else {
      if (morningCount <= afternoonCount) {
        morningCount++;
        morningClients.push(`${clientName} (${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'})`);
      } else {
        afternoonCount++;
        afternoonClients.push(`${clientName} (${itemsCount} ${itemsCount === 1 ? 'item' : 'itens'})`);
      }
    }
  });

  const totalCount = filteredOrders.length;

  let defaultSummaryText = '';
  if (totalCount === 0) {
    defaultSummaryText = periodFilter === 'today'
      ? 'Nenhuma entrega programada para o dia de hoje.'
      : 'Nenhuma entrega agendada para os próximos dias.';
  } else {
    const morningPart = morningClients.length > 0
      ? `Manhã: entregas para ${morningClients.join(', ')}.`
      : 'Manhã: sem entregas.';
    const afternoonPart = afternoonClients.length > 0
      ? `Tarde: entregas para ${afternoonClients.join(', ')}.`
      : '';
    defaultSummaryText = `${morningPart} ${afternoonPart}`.trim();
  }

  return {
    filteredOrders,
    totalCount,
    morningCount,
    afternoonCount,
    morningClients,
    afternoonClients,
    defaultSummaryText,
  };
}

export const TWELVE_HOURS_MS = 12 * 60 * 60 * 1000;

export function hasDeliveryExceeded12Hours(order: any, nowMs: number = Date.now()): boolean {
  if (!order) return false;
  const data = order.order_data || order;
  const status = String(order.status || data.status || '').toLowerCase();

  if (status === 'fulfilled' || status === 'atendido' || status === 'cancelled' || status === 'cancelado') {
    return false;
  }

  const deliveryStatus = data.deliveryStatus;
  if (deliveryStatus === 'completed' || deliveryStatus === 'fulfilled') {
    return false;
  }

  const startedAt = data.deliveryStartedAt || data.delivery_started_at || order.delivery_started_at;
  if (!startedAt) return false;

  const startedTime = new Date(startedAt).getTime();
  if (isNaN(startedTime)) return false;

  const elapsed = nowMs - startedTime;
  return elapsed >= TWELVE_HOURS_MS;
}

export function autoFulfillOrderIfExceeded12HoursMock(order: any, nowIso: string = new Date().toISOString()): boolean {
  if (!hasDeliveryExceeded12Hours(order, new Date(nowIso).getTime())) return false;

  const data = order.order_data || order;

  const payload = {
    status: 'fulfilled',
    deliveryStatus: 'completed',
    deliveryFinishedAt: data.deliveryFinishedAt || nowIso,
    autoFulfilledAfter12h: true,
    autoFulfilledAt: nowIso,
  };

  const updatedData = {
    ...data,
    ...payload,
  };

  order.status = 'fulfilled';
  order.order_data = updatedData;
  return true;
}

describe('Testes de Interface e Negócio: Resumo de Entregas, Contadores e Auto-Atendimento 12h', () => {
  const TODAY = '2026-09-06';
  const TOMORROW = '2026-09-07';

  it('1. Deve exibir contadores zerados e texto correto quando não houver entregas hoje', () => {
    const metrics = calculateDeliverySummaryMetrics([], 'today', TODAY);
    expect(metrics.totalCount).toBe(0);
    expect(metrics.morningCount).toBe(0);
    expect(metrics.afternoonCount).toBe(0);
    expect(metrics.morningClients).toHaveLength(0);
    expect(metrics.afternoonClients).toHaveLength(0);
    expect(metrics.defaultSummaryText).toBe('Nenhuma entrega programada para o dia de hoje.');
  });

  it('2. Deve exibir contadores zerados e texto correto quando não houver entregas para os próximos dias', () => {
    const metrics = calculateDeliverySummaryMetrics([], 'next_days', TODAY);
    expect(metrics.totalCount).toBe(0);
    expect(metrics.defaultSummaryText).toBe('Nenhuma entrega agendada para os próximos dias.');
  });

  it('3. Deve computar corretamente contadores e texto para entregas no turno da Manhã', () => {
    const mockOrders = [
      {
        id: 'ord-1',
        customer_name: 'Carlos Alberto Ferreira',
        scheduled_date: TODAY,
        shipping: { period: 'Manhã' },
        items: [{ id: 'it-1', description: 'Guarda-Roupa Casal' }, { id: 'it-2', description: 'Cômoda' }],
      },
      {
        id: 'ord-2',
        customer_name: 'Ana Paula Santos',
        scheduled_date: TODAY,
        shipping: { period: 'Manhã' },
        items: [{ id: 'it-3', description: 'Mesa de Jantar' }],
      },
    ];

    const metrics = calculateDeliverySummaryMetrics(mockOrders, 'today', TODAY);
    expect(metrics.totalCount).toBe(2);
    expect(metrics.morningCount).toBe(2);
    expect(metrics.afternoonCount).toBe(0);
    expect(metrics.morningClients).toEqual(['Carlos (2 itens)', 'Ana (1 item)']);
    expect(metrics.defaultSummaryText).toBe('Manhã: entregas para Carlos (2 itens), Ana (1 item).');
  });

  it('4. Deve computar corretamente contadores e texto para entregas no turno da Tarde', () => {
    const mockOrders = [
      {
        id: 'ord-3',
        customer_name: 'Marcos Vinicius',
        scheduled_date: TODAY,
        shipping: { period: 'Tarde' },
        items: [{ id: 'it-4', description: 'Sofá Retrátil' }],
      },
    ];

    const metrics = calculateDeliverySummaryMetrics(mockOrders, 'today', TODAY);
    expect(metrics.totalCount).toBe(1);
    expect(metrics.morningCount).toBe(0);
    expect(metrics.afternoonCount).toBe(1);
    expect(metrics.afternoonClients).toEqual(['Marcos (1 item)']);
    expect(metrics.defaultSummaryText).toBe('Manhã: sem entregas. Tarde: entregas para Marcos (1 item).');
  });

  it('5. Deve distribuir e formatar corretamente ambos os turnos (Manhã e Tarde)', () => {
    const mockOrders = [
      {
        id: 'ord-1',
        customer_name: 'Beatriz Lima',
        scheduled_date: TODAY,
        shipping: { period: 'Manhã' },
        items: [{ id: 'it-1' }],
      },
      {
        id: 'ord-2',
        customer_name: 'Rodrigo Souza',
        scheduled_date: TODAY,
        shipping: { period: 'Tarde' },
        items: [{ id: 'it-2' }, { id: 'it-3' }, { id: 'it-4' }],
      },
    ];

    const metrics = calculateDeliverySummaryMetrics(mockOrders, 'today', TODAY);
    expect(metrics.totalCount).toBe(2);
    expect(metrics.morningCount).toBe(1);
    expect(metrics.afternoonCount).toBe(1);
    expect(metrics.defaultSummaryText).toBe('Manhã: entregas para Beatriz (1 item). Tarde: entregas para Rodrigo (3 itens).');
  });

  it('6. Deve distribuir de forma balanceada entregas sem turno explícito', () => {
    const mockOrders = [
      { id: 'ord-1', customer_name: 'Cliente Um', scheduled_date: TODAY, shipping: {} },
      { id: 'ord-2', customer_name: 'Cliente Dois', scheduled_date: TODAY, shipping: {} },
      { id: 'ord-3', customer_name: 'Cliente Três', scheduled_date: TODAY, shipping: {} },
    ];

    const metrics = calculateDeliverySummaryMetrics(mockOrders, 'today', TODAY);
    expect(metrics.totalCount).toBe(3);
    expect(metrics.morningCount).toBe(2);
    expect(metrics.afternoonCount).toBe(1);
  });

  it('7. Deve filtrar estritamente entre o dia de Hoje e Dias Seguintes', () => {
    const mockOrders = [
      { id: 'ord-today', customer_name: 'Hoje Silva', scheduled_date: TODAY },
      { id: 'ord-tomorrow', customer_name: 'Amanhã Costa', scheduled_date: TOMORROW },
    ];

    const todayMetrics = calculateDeliverySummaryMetrics(mockOrders, 'today', TODAY);
    expect(todayMetrics.totalCount).toBe(1);
    expect(todayMetrics.filteredOrders[0].id).toBe('ord-today');

    const nextDaysMetrics = calculateDeliverySummaryMetrics(mockOrders, 'next_days', TODAY);
    expect(nextDaysMetrics.totalCount).toBe(1);
    expect(nextDaysMetrics.filteredOrders[0].id).toBe('ord-tomorrow');
  });

  it('8. Validação da regra de 12 Horas: pedido com menos de 12 horas permanece em andamento', () => {
    const now = new Date('2026-09-06T14:00:00.000Z').getTime();
    const fourHoursAgo = new Date(now - 4 * 60 * 60 * 1000).toISOString();

    const orderInProgress = {
      id: 'ord-123',
      status: 'scheduled',
      order_data: {
        deliveryStatus: 'in_progress',
        deliveryStartedAt: fourHoursAgo,
      },
    };

    expect(hasDeliveryExceeded12Hours(orderInProgress, now)).toBe(false);
    const fulfilled = autoFulfillOrderIfExceeded12HoursMock(orderInProgress, new Date(now).toISOString());
    expect(fulfilled).toBe(false);
    expect(orderInProgress.status).toBe('scheduled');
  });

  it('9. Validação da regra de 12 Horas: pedido com mais de 12 horas é automaticamente ATENDIDO', () => {
    const now = new Date('2026-09-06T20:00:00.000Z').getTime();
    const thirteenHoursAgo = new Date(now - 13 * 60 * 60 * 1000).toISOString();

    const orderStuck = {
      id: 'ord-999',
      status: 'scheduled',
      order_data: {
        deliveryStatus: 'in_progress',
        deliveryStartedAt: thirteenHoursAgo,
      },
    };

    expect(hasDeliveryExceeded12Hours(orderStuck, now)).toBe(true);
    const fulfilled = autoFulfillOrderIfExceeded12HoursMock(orderStuck, new Date(now).toISOString());
    expect(fulfilled).toBe(true);
    expect(orderStuck.status).toBe('fulfilled');
    expect(orderStuck.order_data.deliveryStatus).toBe('completed');
    expect(orderStuck.order_data.autoFulfilledAfter12h).toBe(true);
    expect(orderStuck.order_data.deliveryFinishedAt).toBeDefined();
  });

  it('10. Pedidos já atendidos ou cancelados não disparam auto-atendimento de 12 horas', () => {
    const now = new Date('2026-09-06T20:00:00.000Z').getTime();
    const sixteenHoursAgo = new Date(now - 16 * 60 * 60 * 1000).toISOString();

    const alreadyFulfilledOrder = {
      id: 'ord-already-done',
      status: 'fulfilled',
      order_data: {
        deliveryStatus: 'completed',
        deliveryStartedAt: sixteenHoursAgo,
      },
    };

    expect(hasDeliveryExceeded12Hours(alreadyFulfilledOrder, now)).toBe(false);

    const cancelledOrder = {
      id: 'ord-cancelled',
      status: 'cancelled',
      order_data: {
        deliveryStatus: 'in_progress',
        deliveryStartedAt: sixteenHoursAgo,
      },
    };

    expect(hasDeliveryExceeded12Hours(cancelledOrder, now)).toBe(false);
  });
});
