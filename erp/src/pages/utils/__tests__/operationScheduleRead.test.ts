import { afterEach, describe, expect, it, vi } from 'vitest';
import { expandOrderAppointments, getOrderOperationLabel } from '../../../../../shared-utils/orderAppointmentOccurrences';
import { buildDeliveryRouteItems } from '../../../../../mobile/src/features/logistics/domain/deliveryRouteBuilder';
import { getAssemblyTasks } from '../../../../../mobile/src/features/assemblies/assemblyTasks';
import { getOrderAssemblyTasks } from '../../App/Logistics/hooks/assemblyListHelpers';
import { groupOrdersByDate } from '../../../../../mobile/src/utils/orderUtils';
import type { AppSettings } from '../settingsService';

const date = '2026-11-15';
const schedule = { date, startTime: '13:00', time: '13:00', type: 'fixed' };
const order = {
  id: 'order-a',
  order_index: 533,
  status: 'scheduled',
  order_type: 'sale',
  pending_scheduling: true,
  pendingScheduling: true,
  order_data: {
    pendingScheduling: true,
    items: [{ orderItemId: 'line-a', description: 'Produto', quantity: 3 }],
    shipping: {
      deliveryMethod: 'pickup',
      deliveryType: 'Retirada',
      scheduling: {
        ...schedule,
        appointments: [
          { id: 'one', deliveryMethod: 'delivery', itemIds: ['line-a'], itemQuantities: { 'line-a': 1 }, itemHandlings: { 'line-a': { handlingType: 'Sem montagem' } }, scheduling: schedule },
          { id: 'two', deliveryMethod: 'pickup', itemIds: ['line-a'], itemQuantities: { 'line-a': 1 }, itemHandlings: { 'line-a': { handlingType: 'Montagem no depósito' } }, scheduling: { ...schedule, immediatePickup: true } },
          { id: 'three', deliveryMethod: 'delivery', itemIds: ['line-a'], itemQuantities: { 'line-a': 1 }, itemHandlings: { 'line-a': { handlingType: 'Montagem fora' } }, scheduling: schedule },
        ],
      },
    },
  },
};

describe('operações do pedido na agenda e no cronograma', () => {
  afterEach(() => vi.useRealTimers());

  it('mantém o mesmo código e identifica cada operação com seus itens e modalidade', () => {
    const rows = expandOrderAppointments(order);
    expect(rows.map((row) => row.id)).toEqual(['order-a', 'order-a', 'order-a']);
    expect(rows.map(getOrderOperationLabel)).toEqual(['Operação 1/3', 'Operação 2/3', 'Operação 3/3']);
    expect(rows.map((row) => row.order_data.items[0].quantity)).toEqual([1, 1, 1]);
    expect(rows[0].order_data.shipping.deliveryMethod).toBe('delivery');
    expect(rows[0].order_data.shipping).not.toHaveProperty('deliveryType');
    expect(rows[0].order_data).not.toHaveProperty('pendingScheduling');
    expect(rows[0]).not.toHaveProperty('pending_scheduling');
    expect(rows[0]).not.toHaveProperty('pendingScheduling');
  });

  it('projeta endereço, frete e distância próprios de cada operação', () => {
    const orderWithOperationAddresses = {
      ...order,
      order_data: {
        ...order.order_data,
        customerData: {
          fullName: 'Cliente',
          fullAddress: {
            street: 'Rua do Cliente', number: '10', city: 'Colombo',
            mapsUrl: 'https://maps.example/customer', coords: [-49.2, -25.4],
          },
        },
        shipping: {
          deliveryMethod: 'delivery',
          useCustomerAddress: false,
          deliveryAddress: { street: 'Endereço antigo', number: '1', city: 'Colombo' },
          value: 99,
          distance: 99,
          durationMinutes: 80,
          mapsUrl: 'https://maps.example/stale-order-route',
          destinationCoords: [-50, -26],
          scheduling: {
            ...schedule,
            appointments: [
              {
                id: 'custom', deliveryMethod: 'delivery', itemIds: ['line-a'],
                itemQuantities: { 'line-a': 1 }, useCustomerAddress: false,
                deliveryAddress: {
                  street: 'Rua da Operação', number: '20', city: 'Curitiba',
                  mapsUrl: 'https://maps.example/custom-operation', coords: [-49.3, -25.5],
                },
                freightValue: 20, distance: 2, scheduling: schedule,
              },
              {
                id: 'customer', deliveryMethod: 'delivery', itemIds: ['line-a'],
                itemQuantities: { 'line-a': 1 }, useCustomerAddress: true,
                freightValue: 30, distance: 3, scheduling: schedule,
              },
              {
                id: 'pickup', deliveryMethod: 'pickup', itemIds: ['line-a'],
                itemQuantities: { 'line-a': 1 }, useCustomerAddress: true,
                freightValue: 77, distance: 7,
                scheduling: { ...schedule, immediatePickup: true },
              },
            ],
          },
        },
      },
    };

    const rows = expandOrderAppointments(orderWithOperationAddresses);
    expect(rows.map((row) => row.order_data.shipping)).toMatchObject([
      {
        useCustomerAddress: false,
        deliveryAddress: { street: 'Rua da Operação', number: '20', city: 'Curitiba' },
        destinationCoords: [-49.3, -25.5], value: 20, distance: 2,
      },
      {
        useCustomerAddress: true,
        destinationCoords: [-49.2, -25.4], value: 30, distance: 3,
      },
      { useCustomerAddress: true, value: 0 },
    ]);
    expect(rows[1].order_data.shipping).not.toHaveProperty('deliveryAddress');
    expect(rows[2].order_data.shipping).not.toHaveProperty('distance');
    expect(rows[0].order_data.shipping).not.toHaveProperty('durationMinutes');
    expect(rows[0].order_data.shipping).not.toHaveProperty('mapsUrl');

    const route = buildDeliveryRouteItems(rows, 'today', date);
    expect(route.map(({ fullAddress, mapsUrl, distanceKm }) => ({ fullAddress, mapsUrl, distanceKm }))).toEqual([
      {
        fullAddress: 'Rua da Operação, 20, Curitiba',
        mapsUrl: 'https://maps.example/custom-operation',
        distanceKm: 2,
      },
      {
        fullAddress: 'Rua do Cliente, 10, Colombo',
        mapsUrl: 'https://maps.example/customer',
        distanceKm: 3,
      },
    ]);
  });

  it('mantém frete e distância legados na primeira operação de entrega', () => {
    const legacyShipping = {
      value: 45,
      distance: 4.5,
      deliveryMethod: 'delivery',
      useCustomerAddress: false,
      deliveryAddress: {
        street: 'Endereço legado', number: '30', city: 'Colombo',
        mapsUrl: 'https://maps.example/legacy-address', coords: [-49.1, -25.3],
      },
      mapsUrl: 'https://maps.example/legacy-route',
      destinationCoords: [-49.1, -25.3],
      scheduling: {
        ...schedule,
        appointments: [
          { id: 'delivery', deliveryMethod: 'delivery', itemIds: ['line-a'], scheduling: schedule },
          { id: 'pickup', deliveryMethod: 'pickup', itemIds: ['line-a'], scheduling: schedule },
          { id: 'delivery-next', deliveryMethod: 'delivery', itemIds: ['line-a'], scheduling: schedule },
        ],
      },
    };
    const rows = expandOrderAppointments({
      ...order,
      order_data: { ...order.order_data, shipping: legacyShipping },
    });

    expect(rows.map((row) => row.order_data.shipping.value)).toEqual([45, 0, 0]);
    expect(rows.map((row) => row.order_data.shipping.distance)).toEqual([4.5, undefined, undefined]);
    expect(rows[0].order_data.shipping).toMatchObject({
      useCustomerAddress: false,
      deliveryAddress: { street: 'Endereço legado', mapsUrl: 'https://maps.example/legacy-address' },
      mapsUrl: 'https://maps.example/legacy-route',
      destinationCoords: [-49.1, -25.3],
    });
  });

  it('mostra o andamento de cada operação sem herdar o da outra', () => {
    const partiallyDelivered = {
      ...order,
      delivery_status: 'in_progress',
      deliveryResponsibleId: 'outro-responsavel',
      order_data: {
        ...order.order_data,
        deliveryStatus: 'in_progress',
        deliveryStartedAt: '2026-11-15T12:00:00Z',
        deliveryOperations: {
          one: { deliveryStatus: 'completed', deliveryFinishedAt: '2026-11-15T12:30:00Z' },
          three: { deliveryStatus: 'in_progress', deliveryStartedAt: '2026-11-15T12:45:00Z' },
        },
      },
    };
    const rows = expandOrderAppointments(partiallyDelivered);
    expect(rows.map((row) => row.delivery_status)).toEqual(['completed', null, 'in_progress']);
    expect(rows[1].order_data).not.toHaveProperty('deliveryStartedAt');
    expect(rows[1]).not.toHaveProperty('deliveryResponsibleId');
    expect((rows[0].order_data as Record<string, unknown>).deliveryFinishedAt).toBe('2026-11-15T12:30:00Z');
    expect(buildDeliveryRouteItems(rows, 'today', date).map((item) => item.status))
      .toEqual(['completed', 'in_progress']);
    expect(partiallyDelivered.order_data.deliveryStatus).toBe('in_progress');
    const normalized = { ...partiallyDelivered, ...partiallyDelivered.order_data, order_data: undefined };
    expect(expandOrderAppointments(normalized).map((row) => row.deliveryStatus))
      .toEqual(['completed', null, 'in_progress']);
  });

  it('ordena separadamente as entregas do mesmo pedido', () => {
    const scheduled = { ...order, order_data: { ...order.order_data, routeSequence: 99,
      routeSequencesByOperation: { one: 2, three: 1 } } };
    expect(buildDeliveryRouteItems(expandOrderAppointments(scheduled), 'today', date).map((row) => row.id))
      .toEqual(['order-a-appointment-three', 'order-a-appointment-one']);
  });

  it('mostra entregas separadas no cronograma e exclui retirada imediata e agendada', () => {
    const rows = expandOrderAppointments(order);
    const scheduledPickup: any = { ...(rows[1] as any), scheduleAppointment: { ...(rows[1] as any).scheduleAppointment, key: 'pickup-scheduled' }, order_data: { ...rows[1].order_data, shipping: { ...rows[1].order_data.shipping, scheduling: schedule } } };
    const legacyPickup = { ...scheduledPickup, scheduleAppointment: { ...scheduledPickup.scheduleAppointment, key: 'pickup-legacy' }, order_data: { ...scheduledPickup.order_data, shipping: { ...scheduledPickup.order_data.shipping, deliveryMethod: 'retirada' } } };
    const route = buildDeliveryRouteItems([...rows, scheduledPickup, legacyPickup], 'today', date);
    expect(route.map((item) => item.id)).toEqual(['order-a-appointment-one', 'order-a-appointment-three']);
    expect(route.map((item) => item.orderIndex)).toEqual(['000533', '000533']);
  });

  it('mostra apenas a montagem de cada operação e conserva as quantidades', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00'));
    const tasks = getAssemblyTasks([order]);
    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.isOutside)).toEqual([false, true]);
    expect(tasks.map((task) => getOrderOperationLabel(task.order))).toEqual(['Operação 2/3', 'Operação 3/3']);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(2);
    expect(tasks.map((task) => task.item.quantity)).toEqual([1, 1]);
  });

  it('mantém a retirada imediata no dia correspondente mesmo em dados legados sem horário informado', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00'));
    const rows = expandOrderAppointments(order);
    const pickup = {
      ...rows[1],
      order_data: { ...rows[1].order_data, shipping: { ...rows[1].order_data.shipping,
        scheduling: { ...schedule, immediatePickup: true, notInformed: true } } },
    };
    const pending = {
      ...rows[0],
      order_data: { ...rows[0].order_data, shipping: { ...rows[0].order_data.shipping,
        scheduling: { pendingScheduling: true } } },
    };
    const groups = groupOrdersByDate([pickup, pending]);
    expect(groups.find((group) => group.dateKey === date)?.orders).toEqual([pickup]);
    expect(groups.find((group) => group.dateKey === 'sem_data')?.orders).toEqual([pending]);
  });

  it('não envia rascunhos para o cronograma de entregas nem para montagens', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-11-15T10:00:00'));
    const draft = { ...order, status: 'draft' };
    expect(expandOrderAppointments(draft)).toHaveLength(3);
    expect(buildDeliveryRouteItems(expandOrderAppointments(draft), 'today', date)).toEqual([]);
    expect(getAssemblyTasks([draft])).toEqual([]);
  });

  it('separa também as montagens no ERP por operação', () => {
    const tasks = getOrderAssemblyTasks([order], {} as AppSettings);
    expect(tasks).toHaveLength(2);
    expect(tasks.map((task) => task.isOutside)).toEqual([false, true]);
    expect(tasks.map((task) => task.subtitle)).toEqual([
      'PEDIDO #000533 · Operação 2/3',
      'PEDIDO #000533 · Operação 3/3',
    ]);
    expect(new Set(tasks.map((task) => task.id)).size).toBe(2);
  });

  it('não mostra rótulo de operação quando existe apenas uma', () => {
    const single = { ...order, order_data: { ...order.order_data, shipping: { ...order.order_data.shipping, scheduling: { ...schedule, appointments: [order.order_data.shipping.scheduling.appointments[0]] } } } };
    expect(getOrderOperationLabel(expandOrderAppointments(single)[0])).toBeUndefined();
  });
});
