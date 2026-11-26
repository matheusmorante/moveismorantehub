import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import type CustomerData from '@/pages/types/customerData.type';
import type FullAddress from '@/pages/types/fullAddress.type';
import type { ValidationErrors } from '@/pages/utils/sales/validations';
import {
  DELIVERY_NOTICE_OPTIONS,
  syncServiceToolNotices,
} from '../components/steps/logisticsNoticeRules';
import { summarizeOptionText } from './agendamento/AlternativesAccordion';
import { normalizeSingleOperationMethod } from './normalizeSingleOperationMethod';
import { normalizeOperationFreight } from './operationFreight';

export type Schedule = Shipping['scheduling'];
export type Appointment = NonNullable<Shipping['scheduling']['appointments']>[number];
export type ScheduleWithAppointments = Schedule & { appointments?: Appointment[] };
export type OperationStep = 'method' | 'items' | 'address' | 'schedule' | 'notices';

export const stripAppointments = (scheduling: ScheduleWithAppointments): Schedule => {
  const { appointments: _appointments, ...schedule } = scheduling;
  return schedule;
};

export const blankSchedule = (): Schedule => ({
  date: '', endDate: '', dateType: 'fixed', time: '', startTime: '', endTime: '', type: 'fixed',
  alternatives: [],
});

export const formatFreight = (value: number) => `R$ ${(Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

export const hasCompleteAddress = (address?: FullAddress) => Boolean(
  address?.street?.trim() && address.number?.trim() && address.city?.trim()
);

export const hasRoutableAddress = (address?: FullAddress) => Boolean(
  address && (
    address.street?.trim() || address.neighborhood?.trim() || address.city?.trim() || address.cep?.trim() ||
    address.mapsUrl?.trim() || address.googleMapsUrl?.trim() || address.mapsLink?.trim() || address.placeId?.trim() ||
    (Array.isArray(address.coords) && address.coords.length === 2)
  )
);

export const getAppointments = (shipping: Shipping, items: Item[], isNewSale = false): Appointment[] => {
  const normalizedShipping = isNewSale ? shipping : normalizeSingleOperationMethod(shipping);
  const schedule = normalizedShipping.scheduling as ScheduleWithAppointments;
  const appointments: Appointment[] = schedule.appointments?.length ? schedule.appointments : [{
    id: 'principal',
    deliveryMethod: isNewSale ? undefined : normalizedShipping.deliveryMethod,
    itemIds: items.map((item) => item.orderItemId!),
    itemQuantities: Object.fromEntries(items.map((item) => [item.orderItemId!, item.quantity])),
    ...(isNewSale ? {
      itemHandlings: Object.fromEntries(items
        .filter((item) => item.itemType !== 'service' && !item.isComboItem)
        .map((item) => [item.orderItemId!, { handlingType: '', assemblyResponsible: '' }]))
    } : {}),
    notices: {
      ...(normalizedShipping.callBeforeDelivery === undefined ? {} : { callBeforeDelivery: normalizedShipping.callBeforeDelivery }),
      ...(normalizedShipping.bringCardMachine === undefined ? {} : { bringCardMachine: normalizedShipping.bringCardMachine }),
      ...(normalizedShipping.callOnArrival === undefined ? {} : { callOnArrival: normalizedShipping.callOnArrival }),
    },
    scheduling: stripAppointments(schedule),
  }];
  const hasLegacyCustomAddress = !isNewSale && normalizedShipping.useCustomerAddress === false && Boolean(normalizedShipping.deliveryAddress);
  return normalizeOperationFreight(
    appointments,
    normalizedShipping.deliveryMethod,
    normalizedShipping.value,
    normalizedShipping.distance,
  ).map((appointment) => ({
    ...appointment,
    useCustomerAddress: appointment.useCustomerAddress ?? !hasLegacyCustomAddress,
    ...(!appointment.deliveryAddress && hasLegacyCustomAddress ? { deliveryAddress: normalizedShipping.deliveryAddress } : {}),
  }));
};

export const syncServiceToolNoticesForAppointments = (appointments: Appointment[], items: Item[]) => {
  let changed = false;
  const nextAppointments = appointments.map((appointment) => {
    const operationItemIds = new Set(appointment.itemIds || []);
    const serviceNames = items
      .filter((item) => item.itemType === 'service' && item.orderItemId && operationItemIds.has(item.orderItemId))
      .map((item) => item.description.trim());
    const synced = syncServiceToolNotices(appointment.notices?.instructions, serviceNames);
    if (!synced.changed) return appointment;

    changed = true;
    const notices = { ...appointment.notices };
    if (synced.nextInstructions) notices.instructions = synced.nextInstructions;
    else delete notices.instructions;
    return { ...appointment, notices };
  });

  return { appointments: nextAppointments, changed };
};

export const getAppointmentItemQuantity = (entry: Appointment, item: Item) =>
  entry.itemIds.includes(item.orderItemId!)
    ? entry.itemQuantities?.[item.orderItemId!] ?? item.quantity
    : 0;

export const getAvailableItemQuantityForAppointment = (
  entries: Appointment[],
  appointmentId: string,
  item: Item,
) =>
  Math.max(0, Math.floor(item.quantity - entries.reduce((sum, entry) =>
    entry.id === appointmentId ? sum : sum + getAppointmentItemQuantity(entry, item), 0)));

export const getQuantitiesForSelectedItems = (entry: Appointment, selectableItems: Item[]) => {
  const quantities = { ...entry.itemQuantities };
  for (const item of selectableItems) {
    const id = item.orderItemId!;
    if (entry.itemIds.includes(id) && quantities[id] === undefined) quantities[id] = item.quantity;
  }
  return quantities;
};

export const getHandlingsForSelectedItems = (
  entry: Appointment,
  selectableItems: Item[],
): NonNullable<Appointment['itemHandlings']> => {
  if (entry.itemHandlings) return { ...entry.itemHandlings };
  return Object.fromEntries(selectableItems.filter((item) => entry.itemIds.includes(item.orderItemId!))
    .map((item) => [item.orderItemId!, {
      handlingType: item.handlingType || '',
      assemblyResponsible: item.assemblyResponsible || '',
    }]));
};

export const getAppointmentDisplayState = ({
  appointment,
  index,
  shipping,
  customerData,
  errors,
  schedulingValidationErrors,
  isNewSaleFlow,
  isSale,
  cardMachineRequired,
}: {
  appointment: Appointment;
  index: number;
  shipping: Shipping;
  customerData?: CustomerData;
  errors: ValidationErrors;
  schedulingValidationErrors: ValidationErrors;
  isNewSaleFlow: boolean;
  isSale: boolean;
  cardMachineRequired: boolean;
}) => {
  const prefix = `shipping_appointment_${appointment.id}_`;
  const isPickup = appointment.deliveryMethod === 'pickup' ||
    (!appointment.deliveryMethod && !isNewSaleFlow && shipping.deliveryMethod === 'pickup');
  const isDelivery = appointment.deliveryMethod === 'delivery' ||
    (!appointment.deliveryMethod && !isNewSaleFlow && shipping.deliveryMethod === 'delivery');
  const useCustomerAddress = appointment.useCustomerAddress !== false;
  const operationAddress = useCustomerAddress ? customerData?.fullAddress : appointment.deliveryAddress;
  const addressRequired = isDelivery &&
    !(useCustomerAddress && (shipping.noAddress || customerData?.noAddress));
  const missingOperationAddress = addressRequired && !hasCompleteAddress(operationAddress);
  const isImmediatePickup = isPickup && Boolean(appointment.scheduling.immediatePickup);
  const isPendingScheduling = Boolean(appointment.scheduling.pendingScheduling && !isImmediatePickup);
  const missingDeliveryDistance = isDelivery && !(useCustomerAddress && (shipping.noAddress || customerData?.noAddress)) &&
    (!Number.isFinite(appointment.distance) || (appointment.distance ?? 0) <= 0);
  const hasPendingFields = missingOperationAddress || missingDeliveryDistance ||
    (isSale && isDelivery && DELIVERY_NOTICE_OPTIONS.some((option) =>
      appointment.notices?.[option.field] === undefined &&
      !(option.field === 'bringCardMachine' && cardMachineRequired)
    )) ||
    Object.keys(schedulingValidationErrors).some((key) => key.startsWith(prefix)) ||
    (index === 0 && Object.keys(schedulingValidationErrors).some((key) =>
      key === 'shipping_date' || key === 'shipping_time' || key.startsWith('shipping_alternative_')
    ));
  const hasError = Object.keys(errors).some((key) => key.startsWith(prefix)) ||
    (index === 0 && Object.keys(errors).some((key) =>
      key === 'shipping_date' || key === 'shipping_time' || key.startsWith('shipping_alternative_')
    ));
  const appointmentError = Object.entries(errors).find(([key]) => key.startsWith(prefix))?.[1] ||
    (index === 0
      ? errors['shipping_date'] || errors['shipping_time'] ||
        Object.entries(errors).find(([key]) => key.startsWith('shipping_alternative_'))?.[1]
      : undefined);
  const baseSummaryParts = [
    summarizeOptionText(appointment.scheduling),
    ...(isDelivery ? [`Frete ${formatFreight(Number(appointment.freightValue) || 0)}`] : []),
  ];
  const displayMethod = appointment.deliveryMethod || (!isNewSaleFlow ? shipping.deliveryMethod : undefined);

  return {
    prefix,
    isPickup,
    isDelivery,
    useCustomerAddress,
    operationAddress,
    isImmediatePickup,
    isPendingScheduling,
    hasPendingFields,
    hasError,
    appointmentError,
    displayMethod,
    desktopScheduleSummary: baseSummaryParts.join(' · '),
    mobileScheduleSummary: [
      ...baseSummaryParts,
      `${appointment.itemIds.length} ${appointment.itemIds.length === 1 ? 'item' : 'itens'}`,
    ].join(' · '),
  };
};
