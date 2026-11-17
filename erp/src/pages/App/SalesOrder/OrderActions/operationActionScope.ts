import type Order from '@/pages/types/order.type';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import { formatDate, stringifyFullAddressWithObservation } from '@/pages/utils/formatters';

export type OrderAppointment = NonNullable<Shipping['scheduling']['appointments']>[number];

export interface OrderOperationEntry {
  id: string;
  index: number;
  appointment: OrderAppointment;
}

export const getOrderOperations = (order: Order): OrderOperationEntry[] => {
  const appointments = order.shipping?.scheduling?.appointments || [];
  if (appointments.length > 0) {
    return appointments.map((appointment, index) => ({
      id: appointment.id || `operation-${index + 1}`,
      index,
      appointment,
    }));
  }

  const itemIds = (order.items || [])
    .map((item) => item.orderItemId)
    .filter((id): id is string => Boolean(id));
  const appointment = {
    id: 'legacy-operation',
    itemIds,
    itemQuantities: Object.fromEntries(
      (order.items || []).flatMap((item) =>
        item.orderItemId ? [[item.orderItemId, item.quantity] as const] : []
      )
    ),
    deliveryMethod: order.shipping?.deliveryMethod,
    useCustomerAddress: order.shipping?.useCustomerAddress,
    deliveryAddress: order.shipping?.deliveryAddress,
    freightValue: order.shipping?.value,
    distance: order.shipping?.distance,
    notices: {
      callBeforeDelivery: order.shipping?.callBeforeDelivery,
      bringCardMachine: order.shipping?.bringCardMachine,
      callOnArrival: order.shipping?.callOnArrival,
    },
    scheduling: order.shipping?.scheduling,
  } as OrderAppointment;

  return [{ id: appointment.id, index: 0, appointment }];
};

export const operationActionStateKey = (operationId: string, actionKey: string) =>
  `operation:${encodeURIComponent(operationId)}:${actionKey}`;

export const getOperationActionClicked = (
  clickedButtons: Record<string, boolean | undefined>,
  operationId: string,
  actionKey: string,
  isSingleOperation: boolean
) =>
  Boolean(
    clickedButtons[operationActionStateKey(operationId, actionKey)] ||
      (isSingleOperation && clickedButtons[actionKey])
  );

export const getOperationActionStale = (
  staleButtons: Record<string, boolean | undefined> | undefined,
  operationId: string,
  actionKey: string,
  isSingleOperation: boolean
) =>
  Boolean(
    staleButtons?.[operationActionStateKey(operationId, actionKey)] ||
      (isSingleOperation && staleButtons?.[actionKey])
  );

export const createOrderForOperation = (
  order: Order,
  entry: OrderOperationEntry,
  operationCount: number
): Order => {
  const { appointment } = entry;
  const deliveryMethod = appointment.deliveryMethod ?? order.shipping?.deliveryMethod ?? 'delivery';
  const useCustomerAddress = appointment.useCustomerAddress ??
    (entry.index === 0 ? order.shipping?.useCustomerAddress !== false : true);
  const deliveryAddress = appointment.deliveryAddress ??
    (entry.index === 0 && order.shipping?.useCustomerAddress === false
      ? order.shipping?.deliveryAddress
      : undefined);
  const itemIds = new Set(appointment.itemIds || []);
  const operationItems = (order.items || []).flatMap((item): Item[] => {
    const itemId = item.orderItemId;
    if (!itemId || !itemIds.has(itemId)) return [];
    const handling = appointment.itemHandlings?.[itemId];
    return [{
      ...item,
      quantity: appointment.itemQuantities?.[itemId] ?? item.quantity,
      ...(handling
        ? {
            handlingType: handling.handlingType,
            assemblyResponsible: handling.assemblyResponsible ?? item.assemblyResponsible,
          }
        : {}),
    }];
  });
  const freightValue = appointment.freightValue ?? (entry.index === 0 ? order.shipping?.value : 0) ?? 0;
  const distance = appointment.distance ?? (entry.index === 0 ? order.shipping?.distance : undefined);
  const notices = appointment.notices;

  return {
    ...order,
    items: operationItems,
    shipping: {
      ...order.shipping,
      deliveryMethod,
      value: freightValue,
      distance,
      durationMinutes: appointment.durationMinutes ??
        (entry.index === 0 ? order.shipping?.durationMinutes : undefined),
      useCustomerAddress,
      deliveryAddress,
      callBeforeDelivery: notices?.callBeforeDelivery ??
        (entry.index === 0 ? order.shipping?.callBeforeDelivery : undefined),
      bringCardMachine: notices?.bringCardMachine ??
        (entry.index === 0 ? order.shipping?.bringCardMachine : undefined),
      callOnArrival: notices?.callOnArrival ??
        (entry.index === 0 ? order.shipping?.callOnArrival : undefined),
      scheduling: {
        ...appointment.scheduling,
        appointments: [appointment],
      },
    },
    operationContext: {
      appointmentId: entry.id,
      operationNumber: entry.index + 1,
      operationCount,
    },
  };
};

export const getOperationScheduleLabel = (entry: OrderOperationEntry, fallbackMethod?: string) => {
  const schedule = entry.appointment.scheduling;
  const deliveryMethod = entry.appointment.deliveryMethod ?? fallbackMethod;
  if (schedule.immediatePickup && deliveryMethod === 'pickup') return 'Retirada imediata';
  if (schedule.pendingScheduling) return 'Agendamento pendente';
  if (schedule.notInformed) return 'Programação não informada';

  const date = schedule.dateType === 'range' && schedule.endDate
    ? `${formatDate(schedule.date)} a ${formatDate(schedule.endDate)}`
    : schedule.date
      ? formatDate(schedule.date)
      : 'Data não definida';
  const time = schedule.type === 'range' && schedule.startTime && schedule.endTime
    ? `${schedule.startTime} às ${schedule.endTime}`
    : schedule.startTime || schedule.time || 'Horário não definido';
  return `${date} · ${time}`;
};

const normalizeAddress = (address: unknown) =>
  stringifyFullAddressWithObservation(address)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
    .replace(/[^a-z0-9]/g, '');

export const getOperationAddressLabel = (order: Order) => {
  const shipping = order.shipping;
  if (shipping?.deliveryMethod !== 'delivery') return 'Retirada em loja';
  if (shipping.noAddress) return 'Endereço não informado';

  const customerAddress = order.customerData?.fullAddress;
  const operationAddress = shipping.useCustomerAddress === false
    ? shipping.deliveryAddress
    : customerAddress;
  const addressText = stringifyFullAddressWithObservation(operationAddress);
  const sameAsCustomer = shipping.useCustomerAddress !== false || Boolean(
    addressText && normalizeAddress(operationAddress) === normalizeAddress(customerAddress)
  );
  return sameAsCustomer ? 'No mesmo endereço do cliente' : addressText || 'Endereço não informado';
};
