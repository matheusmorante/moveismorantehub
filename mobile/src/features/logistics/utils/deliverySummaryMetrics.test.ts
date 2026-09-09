import { describe, it, expect } from 'vitest';
import { calculateDeliverySummaryMetrics } from './deliverySummaryMetrics';

describe('calculateDeliverySummaryMetrics - Resumo de Entregas Hoje vs Dias Seguintes', () => {
  const referenceToday = '2026-09-06';

  const mockOrders = [
    // Pedido de Hoje (2026-09-06)
    {
      id: 'order-today-1',
      customer_name: 'Marcos Silveira',
      status: 'scheduled',
      order_data: {
        customerData: { fullName: 'Marcos Silveira' },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: {
            date: '2026-09-06',
            time: '08:00 às 12:00',
          },
        },
        items: [{ description: 'Sofá Retrátil', quantity: 1 }],
      },
    },
    // Pedidos de Amanhã (2026-09-07) - Caso real do usuário
    {
      id: 'order-tomorrow-1',
      customer_name: 'Vania Santos',
      status: 'scheduled',
      order_data: {
        customerData: { fullName: 'Vania Santos' },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: {
            date: '2026-09-07',
            time: '09:00 às 12:00', // Manhã
          },
        },
        items: [
          { description: 'Mesa Jantar', quantity: 1 },
          { description: 'Cadeira Estofada', quantity: 4 },
        ],
      },
    },
    {
      id: 'order-tomorrow-2',
      customer_name: 'Aryel Felipe',
      status: 'scheduled',
      order_data: {
        customerData: { fullName: 'Aryel Felipe' },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: {
            date: '2026-09-07',
            time: '09:00 às 12:00', // Manhã
          },
        },
        items: [{ description: 'Guarda-Roupa', quantity: 1 }],
      },
    },
    {
      id: 'order-tomorrow-3',
      customer_name: 'Cauã Murilo Rodrigues',
      status: 'scheduled',
      order_data: {
        customerData: { fullName: 'Cauã Murilo Rodrigues' },
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: {
            date: '2026-09-07',
            time: '13:00 às 18:00', // Tarde
          },
        },
        items: [
          { description: 'Cama Box', quantity: 1 },
          { description: 'Colchão Molas', quantity: 1 },
          { description: 'Travesseiro', quantity: 2 },
        ],
      },
    },
    // Pedido cancelado (deve ser ignorado)
    {
      id: 'order-cancelled',
      customer_name: 'Cliente Cancelado',
      status: 'cancelled',
      order_data: {
        shipping: {
          deliveryMethod: 'delivery',
          scheduling: { date: '2026-09-07', time: '09:00' },
        },
      },
    },
    // Pedido de retirada na loja (deve ser ignorado)
    {
      id: 'order-pickup',
      customer_name: 'Cliente Retirada',
      status: 'scheduled',
      order_data: {
        shipping: {
          deliveryMethod: 'pickup',
          scheduling: { date: '2026-09-07', time: '10:00' },
        },
      },
    },
  ];

  it('calcula corretamente as métricas de HOJE', () => {
    const metrics = calculateDeliverySummaryMetrics(mockOrders, 'today', referenceToday);
    expect(metrics.totalCount).toBe(1);
    expect(metrics.morningCount).toBe(1);
    expect(metrics.afternoonCount).toBe(0);
    expect(metrics.morningClients[0]).toContain('Marcos Silveira');
  });

  it('calcula corretamente as métricas dos DIAS SEGUINTES sem zerar', () => {
    const metrics = calculateDeliverySummaryMetrics(mockOrders, 'next_days', referenceToday);

    // Deve encontrar exatamente os 3 pedidos ativos de amanhã (Vania, Aryel, Cauã)
    expect(metrics.totalCount).toBe(3);

    // 2 pela manhã (Vania Santos e Aryel Felipe às 09:00)
    expect(metrics.morningCount).toBe(2);

    // 1 à tarde (Cauã Murilo às 13:00)
    expect(metrics.afternoonCount).toBe(1);

    // Valida nomes e itens
    expect(metrics.morningClients.some((c) => c.includes('Vania Santos'))).toBe(true);
    expect(metrics.morningClients.some((c) => c.includes('Aryel Felipe'))).toBe(true);
    expect(metrics.afternoonClients.some((c) => c.includes('Cauã Murilo'))).toBe(true);
  });

  it('inclui assistência e devolução no resumo operacional com o tipo correto', () => {
    const operationOrders = [
      ...mockOrders.slice(0, 1),
      {
        id: 'assistance-today', customer_name: 'Cliente Assistência', status: 'scheduled',
        order_data: { orderType: 'assistance', customerData: { fullName: 'Cliente Assistência' }, shipping: { scheduling: { date: referenceToday, time: '14:00' } }, assistanceItems: [] },
      },
      {
        id: 'return-today', customer_name: 'Cliente Devolução', status: 'scheduled',
        order_data: { orderType: 'return', customerData: { fullName: 'Cliente Devolução' }, shipping: { deliveryMethod: 'pickup', scheduling: { date: referenceToday, time: '09:00' } }, items: [] },
      },
    ];

    const metrics = calculateDeliverySummaryMetrics(operationOrders, 'today', referenceToday);
    expect(metrics.totalCount).toBe(3);
    expect(metrics.defaultSummaryText).toContain('Assistência: Cliente Assistência');
    expect(metrics.defaultSummaryText).toContain('Devolução: Cliente Devolução');
  });
});
