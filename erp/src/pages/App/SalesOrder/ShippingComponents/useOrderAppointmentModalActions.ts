import type React from 'react';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import type CustomerData from '@/pages/types/customerData.type';
import type FullAddress from '@/pages/types/fullAddress.type';
import type { ValidationErrors } from '@/pages/utils/validations';
import { getShippingRouteUrl } from '@/pages/utils/maps';
import { calculateFreightByDistance } from '@/pages/utils/shippingPricing';
import { getSaoPauloDayInfo } from '../../../../../../shared-utils/commercialOrderRules';
import type { SchedulingSessionMemory } from './Agendamento';
import type { AppointmentHandlingValue } from './AppointmentHandling';
import {
  type Appointment,
  type OperationStep,
  type Schedule,
  getAvailableItemQuantityForAppointment,
  getHandlingsForSelectedItems,
  getQuantitiesForSelectedItems,
} from './orderAppointmentsNormalization';

export interface UseOrderAppointmentModalParams {
  appointment: Appointment;
  index: number;
  appointments: Appointment[];
  shipping: Shipping;
  selectableItems: Item[];
  customerData?: CustomerData;
  errors: ValidationErrors;
  routeUrl?: string;
  isNewSaleFlow: boolean;
  isSale: boolean;
  requestedStep: OperationStep;
  schedulingMemory: React.MutableRefObject<SchedulingSessionMemory | null>;
  onClearMemory: () => void;
  updateAppointments: (
    update: (current: Appointment[]) => Appointment[],
    options?: { autoCalculateValue?: boolean; clearRoute?: boolean },
  ) => void;
  autoCalculateAppointmentDistance: (
    appointmentId: string,
    address?: FullAddress,
    silentSuccess?: boolean,
  ) => void;
}

export function formatScheduleTime(scheduling: Schedule): string {
  if (scheduling.type === 'fixed') return scheduling.startTime || '';
  return scheduling.startTime && scheduling.endTime
    ? `${scheduling.startTime} às ${scheduling.endTime}`
    : '';
}

export function hasConfiguredAddress(address?: FullAddress): boolean {
  return Boolean(
    address &&
      (address.street?.trim() ||
        address.city?.trim() ||
        address.mapsUrl ||
        address.googleMapsUrl ||
        address.mapsLink ||
        address.placeId ||
        address.coords),
  );
}

export function useOrderAppointmentModalActions({
  appointment,
  index,
  appointments,
  shipping,
  selectableItems,
  customerData,
  errors,
  routeUrl,
  isNewSaleFlow,
  isSale,
  requestedStep,
  schedulingMemory,
  onClearMemory,
  updateAppointments,
  autoCalculateAppointmentDistance,
}: UseOrderAppointmentModalParams) {
  const prefix = `shipping_appointment_${appointment.id}_`;
  const isPickup =
    appointment.deliveryMethod === 'pickup' ||
    (!appointment.deliveryMethod && !isNewSaleFlow && shipping.deliveryMethod === 'pickup');
  const isDelivery =
    appointment.deliveryMethod === 'delivery' ||
    (!appointment.deliveryMethod && !isNewSaleFlow && shipping.deliveryMethod === 'delivery');

  const operationSteps: { id: OperationStep; label: string }[] = [
    { id: 'method', label: 'Modalidade' },
    { id: 'items', label: 'Itens' },
    ...(isDelivery ? [{ id: 'address' as const, label: 'Endereço e frete' }] : []),
    { id: 'schedule', label: 'Agendamento' },
    ...(isSale && (isDelivery || isPickup) ? [{ id: 'notices' as const, label: 'Avisos' }] : []),
  ];
  const matchedStepIndex = operationSteps.findIndex((step) => step.id === requestedStep);
  const activeStepIndex = matchedStepIndex >= 0 ? matchedStepIndex : 0;
  const activeStep = operationSteps[activeStepIndex].id;
  const previousStep = operationSteps[activeStepIndex - 1];
  const nextStep = operationSteps[activeStepIndex + 1];

  const operationAddress: FullAddress | undefined =
    appointment.useCustomerAddress === false ? appointment.deliveryAddress : customerData?.fullAddress;
  const operationDestinationCoords =
    appointment.destinationCoords ||
    (appointments.length === 1 ? shipping.destinationCoords : undefined) ||
    operationAddress?.coords;
  const operationRouteGeoJSON =
    appointment.routeGeoJSON ?? (appointments.length === 1 ? shipping.routeGeoJSON : undefined);
  const operationAddressError = Object.entries(errors).find(([key]) =>
    key.startsWith(`${prefix}address_`),
  )?.[1];
  const hasOperationAddress = hasConfiguredAddress(operationAddress);
  const operationRouteUrl =
    hasOperationAddress && operationAddress
      ? getShippingRouteUrl(operationAddress)
      : appointment.useCustomerAddress === false
        ? undefined
        : routeUrl;

  const deliveryMethodError = errors[`${prefix}deliveryMethod`];
  const itemsError = errors[`${prefix}items`];
  const appointmentErrors: ValidationErrors = {};
  for (const [key, value] of Object.entries(errors)) {
    if (!key.startsWith(prefix)) continue;
    const suffix = key.slice(prefix.length);
    if (suffix === 'date' || suffix === 'time') appointmentErrors[`shipping_${suffix}`] = value;
    else if (suffix === 'distance') appointmentErrors.shipping_distance = value;
    else if (suffix.startsWith('alternative_')) appointmentErrors[`shipping_${suffix}`] = value;
  }
  if (index === 0) Object.assign(appointmentErrors, errors);

  const isImmediatePickup = isPickup && Boolean(appointment.scheduling.immediatePickup);
  const isPendingScheduling = Boolean(appointment.scheduling.pendingScheduling && !isImmediatePickup);

  const updateCurrentAppointment = (
    transform: (entry: Appointment, current: Appointment[]) => Appointment,
    options?: { autoCalculateValue?: boolean; clearRoute?: boolean },
  ) => {
    updateAppointments(
      (current) =>
        current.map((entry) =>
          entry.id === appointment.id ? transform(entry, current) : entry,
        ),
      options,
    );
  };

  const updateAppointmentSchedule = (fields: Partial<Schedule>) => {
    updateCurrentAppointment((entry) => {
      const scheduling = { ...entry.scheduling, ...fields };
      scheduling.time = formatScheduleTime(scheduling);
      return { ...entry, scheduling };
    });
  };

  const toggleOperationItem = (item: Item, checked: boolean) => {
    updateCurrentAppointment((entry, current) => {
      const itemId = item.orderItemId!;
      const itemQuantities = getQuantitiesForSelectedItems(entry, selectableItems);
      const remaining = getAvailableItemQuantityForAppointment(current, appointment.id, item);
      if (checked && remaining < 1) return entry;
      if (checked) itemQuantities[itemId] = remaining;
      else delete itemQuantities[itemId];
      const itemHandlings = getHandlingsForSelectedItems(entry, selectableItems);
      if (checked) itemHandlings[itemId] = { handlingType: '', assemblyResponsible: '' };
      else delete itemHandlings[itemId];
      return {
        ...entry,
        itemIds: checked
          ? [...entry.itemIds, itemId]
          : entry.itemIds.filter((id) => id !== itemId),
        itemQuantities,
        itemHandlings,
      };
    });
  };

  const changeOperationItemQuantity = (item: Item, value: number) => {
    if (!Number.isFinite(value)) return;
    const itemId = item.orderItemId!;
    updateCurrentAppointment((entry, current) => {
      const remaining = getAvailableItemQuantityForAppointment(current, appointment.id, item);
      if (remaining < 1) return entry;
      return {
        ...entry,
        itemQuantities: {
          ...getQuantitiesForSelectedItems(entry, selectableItems),
          [itemId]: Math.min(remaining, Math.max(1, value)),
        },
      };
    });
  };

  const changeOperationItemHandling = (item: Item, value: AppointmentHandlingValue) => {
    const itemId = item.orderItemId!;
    updateCurrentAppointment((entry) => ({
      ...entry,
      itemHandlings: {
        ...getHandlingsForSelectedItems(entry, selectableItems),
        [itemId]: value,
      },
    }));
  };

  const handleSelectScheduleMode = (scheduleMode: 'scheduled' | 'pending' | 'immediate') => {
    // The selected date/time cache belongs to the active schedule mode.
    // Clear it before changing modes so a previous custom time cannot be
    // shown after the scheduling values themselves have been reset.
    schedulingMemory.current = null;

    if (scheduleMode === 'scheduled') {
      updateAppointmentSchedule({
        immediatePickup: false,
        pendingScheduling: false,
        notInformed: false,
        ...(isImmediatePickup || appointment.scheduling.immediatePickup
          ? { date: '', endDate: '', startTime: '', endTime: '' }
          : {}),
      });
      return;
    }

    if (scheduleMode === 'pending') {
      updateAppointmentSchedule({
        immediatePickup: false,
        pendingScheduling: true,
        notInformed: false,
        date: '',
        endDate: '',
        startTime: '',
        endTime: '',
      });
      return;
    }

    if (!isPickup) return;
    const date = getSaoPauloDayInfo(0).isoDate;
    const now = new Date();
    const time = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
    updateAppointmentSchedule({
      pendingScheduling: false,
      immediatePickup: true,
      notInformed: false,
      date,
      endDate: '',
      dateType: 'fixed',
      type: 'fixed',
      startTime: time,
      endTime: '',
    });
  };

  const handleSelectDeliveryMethod = (method: 'delivery' | 'pickup') => {
    onClearMemory();
    const selectedAddress =
      appointment.useCustomerAddress === false
        ? appointment.deliveryAddress
        : customerData?.fullAddress;
    const distanceIsMissing =
      !Number.isFinite(appointment.distance) || (appointment.distance ?? 0) <= 0;

    updateCurrentAppointment(
      (entry) => {
        if (entry.deliveryMethod === method) return entry;
        const itemHandlings = getHandlingsForSelectedItems(entry, selectableItems);
        for (const itemId of entry.itemIds) {
          itemHandlings[itemId] = { handlingType: '', assemblyResponsible: '' };
        }
        const scheduling =
          method === 'delivery' &&
          (entry.scheduling.immediatePickup || entry.scheduling.notInformed)
            ? {
                ...entry.scheduling,
                immediatePickup: false,
                notInformed: false,
                date: '',
                endDate: '',
                time: '',
                startTime: '',
                endTime: '',
              }
            : entry.scheduling;
        return {
          ...entry,
          deliveryMethod: method,
          itemHandlings,
          scheduling,
          ...(method === 'pickup'
            ? { durationMinutes: undefined, destinationCoords: undefined, routeGeoJSON: undefined }
            : {}),
        };
      },
      { clearRoute: method === 'pickup' },
    );

    if (
      method === 'delivery' &&
      distanceIsMissing &&
      !(appointment.useCustomerAddress !== false && (shipping.noAddress || customerData?.noAddress))
    ) {
      autoCalculateAppointmentDistance(appointment.id, selectedAddress);
    }
  };

  const handleUseCustomerAddress = (useCustomerAddress: boolean) => {
    const selectedAddress = useCustomerAddress
      ? customerData?.fullAddress
      : appointment.deliveryAddress;
    updateCurrentAppointment(
      (entry) => ({
        ...entry,
        useCustomerAddress,
        distance: undefined,
        durationMinutes: undefined,
        destinationCoords: undefined,
        routeGeoJSON: undefined,
      }),
      { clearRoute: true },
    );
    autoCalculateAppointmentDistance(appointment.id, selectedAddress);
  };

  const handleSaveAddress = (deliveryAddress: FullAddress) => {
    updateCurrentAppointment(
      (entry) => ({
        ...entry,
        useCustomerAddress: false,
        deliveryAddress,
        distance: undefined,
        durationMinutes: undefined,
        destinationCoords: undefined,
        routeGeoJSON: undefined,
      }),
      { clearRoute: true },
    );
    autoCalculateAppointmentDistance(appointment.id, deliveryAddress);
  };

  const handleRemoveAddress = () => {
    updateCurrentAppointment(
      (entry) => ({
        ...entry,
        deliveryAddress: undefined,
        distance: undefined,
        durationMinutes: undefined,
        destinationCoords: undefined,
        routeGeoJSON: undefined,
      }),
      { clearRoute: true },
    );
  };

  const handleChangeFreightValue = (value: number) => {
    updateCurrentAppointment(
      (entry) => ({ ...entry, freightValue: value }),
      { autoCalculateValue: false },
    );
  };

  const handleChangeFreightDistance = (rawValue: string) => {
    const parsedDistance = Number.parseFloat(rawValue.replace(',', '.'));
    const distance = Number.isFinite(parsedDistance) && parsedDistance >= 0 ? parsedDistance : undefined;
    updateCurrentAppointment(
      (entry) => ({
        ...entry,
        distance,
        ...(distance === undefined ? {} : { freightValue: calculateFreightByDistance(distance) }),
      }),
      { autoCalculateValue: true },
    );
  };

  const handleChangeScheduling = (key: keyof Schedule, value: unknown) => {
    updateCurrentAppointment((entry) => {
      const next = { ...entry.scheduling, [key]: value } as Schedule;
      next.time = formatScheduleTime(next);
      return { ...entry, scheduling: next };
    });
  };

  const handleChangeNotices = (changes: Partial<Appointment['notices']>) => {
    updateCurrentAppointment((entry) => ({
      ...entry,
      notices: { ...entry.notices, ...changes },
    }));
  };

  return {
    prefix,
    isPickup,
    isDelivery,
    operationSteps,
    activeStepIndex,
    activeStep,
    previousStep,
    nextStep,
    operationAddress,
    operationDestinationCoords,
    operationRouteGeoJSON,
    operationAddressError,
    hasOperationAddress,
    operationRouteUrl,
    deliveryMethodError,
    itemsError,
    appointmentErrors,
    isImmediatePickup,
    isPendingScheduling,
    toggleOperationItem,
    changeOperationItemQuantity,
    changeOperationItemHandling,
    handleSelectScheduleMode,
    handleSelectDeliveryMethod,
    handleUseCustomerAddress,
    handleSaveAddress,
    handleRemoveAddress,
    handleChangeFreightValue,
    handleChangeFreightDistance,
    handleChangeScheduling,
    handleChangeNotices,
  };
}
