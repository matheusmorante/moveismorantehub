import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Pencil, Plus, Store, Trash2, Truck, X } from 'lucide-react';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import type CustomerData from '@/pages/types/customerData.type';
import type FullAddress from '@/pages/types/fullAddress.type';
import type { ValidationErrors } from '@/pages/utils/validations';
import { getShippingRouteUrl } from '@/pages/utils/maps';
import { calculateFreightByDistance } from '@/pages/utils/shippingPricing';
import type { DistanceCalculationOptions } from '../hooks/useOrderDistanceCalculator';
import Agendamento, { type SchedulingSessionMemory } from './Agendamento';
import { AppointmentItemsTable } from './AppointmentItemsTable';
import type { AppointmentHandlingValue } from './AppointmentHandling';
import FreteDistancia from './FreteDistancia';
import MapRoute from './MapRoute';
import { AppointmentAddressDialog } from './AppointmentAddressDialog';
import { AppointmentNotices } from './AppointmentNotices';
import { summarizeOptionText } from './agendamento/AlternativesAccordion';
import { getOperationsFreightTotal, getPrimaryOperationDistance, normalizeOperationFreight } from './operationFreight';
import { validateShippingScheduling } from '../../../../../../shared-utils/commercialShippingRules';
import { getSaoPauloDayInfo } from '../../../../../../shared-utils/commercialOrderRules';
import {
  DELIVERY_NOTICE_OPTIONS,
  syncServiceToolNotices,
} from '../components/steps/logisticsNoticeRules';
import { normalizeSingleOperationMethod } from './normalizeSingleOperationMethod';

type Schedule = Shipping['scheduling'];
type Appointment = NonNullable<Shipping['scheduling']['appointments']>[number];
type ScheduleWithAppointments = Schedule & { appointments?: Appointment[] };
type OperationStep = 'method' | 'items' | 'address' | 'schedule' | 'notices';

interface Props {
  shipping: Shipping;
  setShipping: React.Dispatch<React.SetStateAction<Shipping>>;
  items: Item[];
  customerData?: CustomerData;
  errors: ValidationErrors;
  routeUrl?: string;
  isCalculatingDistance?: boolean;
  onAutoCalculateDistance?: (customAddress?: unknown, options?: DistanceCalculationOptions) => Promise<void>;
  sessionMemoryRef?: React.MutableRefObject<SchedulingSessionMemory | null>;
  isNewSale?: boolean;
  isSale?: boolean;
  cardMachineRequired?: boolean;
}

const stripAppointments = (scheduling: ScheduleWithAppointments): Schedule => {
  const { appointments: _appointments, ...schedule } = scheduling;
  return schedule;
};

const blankSchedule = (): Schedule => ({
  date: '', endDate: '', dateType: 'fixed', time: '', startTime: '', endTime: '', type: 'fixed',
  alternatives: [],
});

const formatFreight = (value: number) => `R$ ${(Number.isFinite(value) ? value : 0).toLocaleString('pt-BR', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
})}`;

const hasCompleteAddress = (address?: FullAddress) => Boolean(
  address?.street?.trim() && address.number?.trim() && address.city?.trim()
);

const hasRoutableAddress = (address?: FullAddress) => Boolean(
  address && (
    address.street?.trim() || address.neighborhood?.trim() || address.city?.trim() || address.cep?.trim() ||
    address.mapsUrl?.trim() || address.googleMapsUrl?.trim() || address.mapsLink?.trim() || address.placeId?.trim() ||
    (Array.isArray(address.coords) && address.coords.length === 2)
  )
);

const getAppointments = (shipping: Shipping, items: Item[], isNewSale = false): Appointment[] => {
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

const syncServiceToolNoticesForAppointments = (appointments: Appointment[], items: Item[]) => {
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

export const OrderAppointments: React.FC<Props> = ({
  shipping, setShipping, items, customerData, errors, routeUrl, isCalculatingDistance, onAutoCalculateDistance,
  sessionMemoryRef, isNewSale = false, isSale = false, cardMachineRequired = false,
}) => {
  const [isNewSaleFlow] = useState(isNewSale);
  const [activeAppointmentModal, setActiveAppointmentModal] = useState<{
    id: string;
    mode: 'add' | 'edit';
  } | null>(null);
  const [activeOperationSteps, setActiveOperationSteps] = useState<Record<string, OperationStep>>({});
  const memoryRefs = useRef<Record<string, React.MutableRefObject<SchedulingSessionMemory | null>>>({});
  const selectableItems = items.filter((item) => item.orderItemId && item.description.trim());
  const appointments = getAppointments(shipping, selectableItems, isNewSaleFlow);
  const schedulingValidationErrors = validateShippingScheduling(
    { ...shipping.scheduling, appointments },
    shipping.deliveryMethod,
    false,
    selectableItems
  );

  const closeAppointmentModal = useCallback(() => {
    setActiveAppointmentModal(null);
  }, []);
  const openAppointmentModal = (appointmentId: string, mode: 'add' | 'edit') => {
    setActiveOperationSteps((current) => ({ ...current, [appointmentId]: 'method' }));
    setActiveAppointmentModal({ id: appointmentId, mode });
  };
  const setOperationStep = (appointmentId: string, step: OperationStep) => {
    setActiveOperationSteps((current) => ({ ...current, [appointmentId]: step }));
  };

  React.useEffect(() => {
    if (!isSale) return;
    const currentItems = items.filter((item) => item.orderItemId && item.description.trim());
    if (currentItems.length === 0) {
      if (!shipping.scheduling.appointments?.length) return;
      setShipping((previous) => {
        const serviceNotices = syncServiceToolNoticesForAppointments(
          previous.scheduling.appointments || [],
          currentItems,
        );
        if (!serviceNotices.changed) return previous;
        return {
          ...previous,
          scheduling: { ...previous.scheduling, appointments: serviceNotices.appointments } as Schedule,
        };
      });
      return;
    }
    setShipping((previous) => {
      const hasStoredAppointments = Boolean(previous.scheduling.appointments?.length);
      const hasSingleMethodMismatch = !isNewSaleFlow && previous.scheduling.appointments?.length === 1 &&
        previous.scheduling.appointments[0].deliveryMethod !== previous.deliveryMethod;
      const hasLegacyNotices = previous.callBeforeDelivery !== undefined ||
        previous.bringCardMachine !== undefined || previous.callOnArrival !== undefined;
      const current = getAppointments(previous, currentItems, isNewSaleFlow);
      const serviceNotices = syncServiceToolNoticesForAppointments(current, currentItems);
      let changed = !hasStoredAppointments || hasSingleMethodMismatch || hasLegacyNotices || serviceNotices.changed;
      const next = serviceNotices.appointments.map((appointment, index) => {
        const method = appointment.deliveryMethod || (!isNewSaleFlow ? previous.deliveryMethod : undefined);
        const notices = { ...appointment.notices };
        let noticesChanged = false;
        if (index === 0) {
          for (const option of DELIVERY_NOTICE_OPTIONS) {
            if (notices[option.field] === undefined && previous[option.field] !== undefined) {
              notices[option.field] = previous[option.field];
              noticesChanged = true;
            }
          }
        }
        if (method === 'delivery' && cardMachineRequired && notices.bringCardMachine !== true) {
          notices.bringCardMachine = true;
          noticesChanged = true;
        }
        if (!noticesChanged) return appointment;
        changed = true;
        return { ...appointment, notices };
      });

      if (!changed) return previous;
      return {
        ...previous,
        callBeforeDelivery: undefined,
        bringCardMachine: undefined,
        callOnArrival: undefined,
        scheduling: { ...previous.scheduling, appointments: next } as Schedule,
      };
    });
  }, [
    cardMachineRequired,
    isSale,
    isNewSaleFlow,
    items,
    setShipping,
    shipping.callBeforeDelivery,
    shipping.bringCardMachine,
    shipping.callOnArrival,
    shipping.deliveryMethod,
    shipping.scheduling,
  ]);

  useEffect(() => {
    if (!activeAppointmentModal) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') closeAppointmentModal();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeAppointmentModal, closeAppointmentModal]);

  const itemQuantity = (entry: Appointment, item: Item) =>
    entry.itemIds.includes(item.orderItemId!)
      ? entry.itemQuantities?.[item.orderItemId!] ?? item.quantity
      : 0;

  const availableFor = (entries: Appointment[], appointmentId: string, item: Item) =>
    Math.max(0, Math.floor(item.quantity - entries.reduce((sum, entry) =>
      entry.id === appointmentId ? sum : sum + itemQuantity(entry, item), 0)));

  const quantitiesForSelectedItems = (entry: Appointment) => {
    const quantities = { ...entry.itemQuantities };
    for (const item of selectableItems) {
      const id = item.orderItemId!;
      if (entry.itemIds.includes(id) && quantities[id] === undefined) quantities[id] = item.quantity;
    }
    return quantities;
  };

  const handlingsForSelectedItems = (entry: Appointment): NonNullable<Appointment['itemHandlings']> => {
    if (entry.itemHandlings) return { ...entry.itemHandlings };
    return Object.fromEntries(selectableItems.filter((item) => entry.itemIds.includes(item.orderItemId!))
      .map((item) => [item.orderItemId!, {
        handlingType: item.handlingType || '',
        assemblyResponsible: item.assemblyResponsible || '',
      }]));
  };

  const updateAppointments = (
    update: (current: Appointment[]) => Appointment[],
    options: { autoCalculateValue?: boolean; clearRoute?: boolean } = {},
  ) => {
    setShipping((previous) => {
      const current = getAppointments(previous, selectableItems, isNewSaleFlow);
      const normalizedAppointments = normalizeOperationFreight(
        update(current),
        previous.deliveryMethod,
        previous.value,
        previous.distance,
      );
      const next = isSale
        ? syncServiceToolNoticesForAppointments(normalizedAppointments, selectableItems).appointments
        : normalizedAppointments;
      const first = next[0];
      const selectedMethods = next.map((entry) => entry.deliveryMethod).filter(Boolean);
      const deliveryMethod = selectedMethods.includes('delivery')
        ? 'delivery'
        : selectedMethods.includes('pickup')
          ? 'pickup'
          : previous.deliveryMethod;
      return {
        ...previous,
        deliveryMethod,
        value: getOperationsFreightTotal(next, deliveryMethod),
        distance: getPrimaryOperationDistance(next, deliveryMethod),
        ...(options.autoCalculateValue === undefined ? {} : { autoCalculateValue: options.autoCalculateValue }),
        ...(options.clearRoute ? { durationMinutes: undefined, destinationCoords: undefined, routeGeoJSON: undefined } : {}),
        scheduling: { ...first.scheduling, appointments: next } as Schedule,
      };
    });
  };

  const autoCalculateAppointmentDistance = (
    appointmentId: string,
    address?: FullAddress,
    silentSuccess = true,
  ) => {
    if (!onAutoCalculateDistance || !hasRoutableAddress(address)) return;
    void onAutoCalculateDistance(address, {
      silentSuccess,
      onCalculated: (route, freight) => updateAppointments((current) => current.map((entry) =>
        entry.id === appointmentId
          ? {
              ...entry,
              distance: route.distanceKm,
              freightValue: freight,
              durationMinutes: route.durationMinutes,
              destinationCoords: route.destinationCoords,
              routeGeoJSON: route.routeGeoJSON,
            }
          : entry
      ), { autoCalculateValue: true }),
    });
  };

  return (
    <section className="flex min-w-0 flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h4 className="text-sm font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Operações</h4>
        <button type="button" onClick={() => {
          const id = crypto.randomUUID();
          updateAppointments((current) => [...current, { id, itemIds: [], itemQuantities: {}, useCustomerAddress: true, freightValue: 0, scheduling: blankSchedule() }]);
          openAppointmentModal(id, 'add');
        }} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold text-slate-600 hover:text-blue-700 dark:text-slate-300">
          <Plus className="h-4 w-4" /> Adicionar operação
        </button>
      </div>
      <div className="hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-700 lg:block">
        <table aria-label="Operações do pedido" className="w-full table-fixed border-collapse text-left">
          <colgroup>
            <col className="w-[34%]" />
            <col className="w-[38%]" />
            <col className="w-[12%]" />
            <col className="w-[16%]" />
          </colgroup>
          <thead className="bg-slate-50 text-[10px] font-black uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th scope="col" className="px-3 py-2.5">Operação</th>
              <th scope="col" className="px-3 py-2.5">Programação</th>
              <th scope="col" className="px-3 py-2.5 text-center">Itens</th>
              <th scope="col" className="px-3 py-2.5 text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-700">
            {appointments.map((appointment, index) => {
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
              const scheduleSummary = [
                summarizeOptionText(appointment.scheduling),
                ...(isDelivery ? [`Frete ${formatFreight(Number(appointment.freightValue) || 0)}`] : []),
              ].join(' · ');
              const displayMethod = appointment.deliveryMethod || (!isNewSaleFlow ? shipping.deliveryMethod : undefined);

              return (
                <tr key={appointment.id} className={`${hasError ? 'bg-red-50/70 dark:bg-red-950/20' : 'bg-white dark:bg-slate-900'} align-middle`}>
                  <td className="px-3 py-3">
                    <button
                      type="button"
                      aria-haspopup="dialog"
                      aria-controls={`appointment-modal-${appointment.id}`}
                      title={appointmentError || undefined}
                      onClick={() => openAppointmentModal(appointment.id, 'edit')}
                      className={`flex min-w-0 flex-wrap items-center gap-1.5 text-left text-xs font-bold ${hasError ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'}`}
                    >
                      <span className="mr-1">Operação {index + 1}</span>
                      {displayMethod && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${displayMethod === 'delivery' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'}`}>
                        {displayMethod === 'delivery' ? <Truck className="h-3.5 w-3.5" aria-hidden="true" /> : <Store className="h-3.5 w-3.5" aria-hidden="true" />}
                        {displayMethod === 'delivery' ? 'Entrega' : 'Retirada'}
                      </span>}
                      {isImmediatePickup && <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">Retirada imediata</span>}
                      {hasPendingFields && <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Falta preencher</span>}
                      {appointment.scheduling.pendingScheduling && !isImmediatePickup && <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-bold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">Agendamento pendente</span>}
                    </button>
                  </td>
                  <td className="break-words px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{scheduleSummary}</td>
                  <td className="px-3 py-3 text-center text-xs text-slate-600 dark:text-slate-300">
                    {appointment.itemIds.length} {appointment.itemIds.length === 1 ? 'item' : 'itens'}
                  </td>
                  <td className="px-3 py-2">
                    <div className="flex justify-end gap-1">
                      <button
                        type="button"
                        aria-label={`Editar operação ${index + 1}`}
                        onClick={() => openAppointmentModal(appointment.id, 'edit')}
                        className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                      >
                        <Pencil className="h-4 w-4" aria-hidden="true" />
                      </button>
                      {appointments.length > 1 && <button
                        type="button"
                        aria-label={`Remover operação ${index + 1}`}
                        onClick={() => {
                          updateAppointments((current) => current.filter((entry) => entry.id !== appointment.id));
                          if (index === 0 && sessionMemoryRef) sessionMemoryRef.current = null;
                          if (activeAppointmentModal?.id === appointment.id) closeAppointmentModal();
                        }}
                        className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {appointments.map((appointment, index) => {
        const isEditing = activeAppointmentModal?.id === appointment.id;
        const prefix = `shipping_appointment_${appointment.id}_`;
        const isPickup = appointment.deliveryMethod === 'pickup' ||
          (!appointment.deliveryMethod && !isNewSaleFlow && shipping.deliveryMethod === 'pickup');
        const isDelivery = appointment.deliveryMethod === 'delivery' ||
          (!appointment.deliveryMethod && !isNewSaleFlow && shipping.deliveryMethod === 'delivery');
        const operationSteps: { id: OperationStep; label: string }[] = [
          { id: 'method', label: 'Modalidade' },
          { id: 'items', label: 'Itens' },
          ...(isDelivery ? [{ id: 'address' as const, label: 'Endereço e frete' }] : []),
          { id: 'schedule', label: 'Agendamento' },
          ...(isSale && (isDelivery || isPickup) ? [{ id: 'notices' as const, label: 'Avisos' }] : []),
        ];
        const requestedStep = activeOperationSteps[appointment.id] ?? 'method';
        const matchedStepIndex = operationSteps.findIndex((step) => step.id === requestedStep);
        const activeStepIndex = matchedStepIndex >= 0 ? matchedStepIndex : 0;
        const activeStep = operationSteps[activeStepIndex].id;
        const previousStep = operationSteps[activeStepIndex - 1];
        const nextStep = operationSteps[activeStepIndex + 1];
        const operationAddress: FullAddress | undefined = appointment.useCustomerAddress === false
          ? appointment.deliveryAddress
          : customerData?.fullAddress;
        const useCustomerAddress = appointment.useCustomerAddress !== false;
        const operationDestinationCoords = appointment.destinationCoords ||
          (appointments.length === 1 ? shipping.destinationCoords : undefined) ||
          operationAddress?.coords;
        const operationRouteGeoJSON = appointment.routeGeoJSON ??
          (appointments.length === 1 ? shipping.routeGeoJSON : undefined);
        const addressRequired = isDelivery &&
          !(useCustomerAddress && (shipping.noAddress || customerData?.noAddress));
        const missingOperationAddress = addressRequired && !hasCompleteAddress(operationAddress);
        const operationAddressError = Object.entries(errors).find(([key]) =>
          key.startsWith(`${prefix}address_`)
        )?.[1];
        const hasOperationAddress = Boolean(operationAddress && (
          operationAddress.street?.trim() || operationAddress.city?.trim() || operationAddress.mapsUrl ||
          operationAddress.googleMapsUrl || operationAddress.mapsLink || operationAddress.placeId || operationAddress.coords
        ));
        const operationRouteUrl = hasOperationAddress && operationAddress
          ? getShippingRouteUrl(operationAddress)
          : appointment.useCustomerAddress === false ? undefined : routeUrl;
        const missingDeliveryDistance = isDelivery && !(useCustomerAddress && (shipping.noAddress || customerData?.noAddress)) &&
          (!Number.isFinite(appointment.distance) || (appointment.distance ?? 0) <= 0);
        const deliveryMethodError = errors[`${prefix}deliveryMethod`];
        const itemsError = errors[`${prefix}items`];
        const appointmentError = Object.entries(errors).find(([key]) => key.startsWith(prefix))?.[1] ||
          (index === 0
            ? errors['shipping_date'] || errors['shipping_time'] ||
              Object.entries(errors).find(([key]) => key.startsWith('shipping_alternative_'))?.[1]
            : undefined);
        const hasError = Object.keys(errors).some((key) => key.startsWith(prefix)) ||
          (index === 0 && Object.keys(errors).some((key) =>
            key === 'shipping_date' || key === 'shipping_time' || key.startsWith('shipping_alternative_')
          ));
        const hasPendingFields = missingOperationAddress || missingDeliveryDistance ||
                (isSale && isDelivery && DELIVERY_NOTICE_OPTIONS.some((option) =>
                  appointment.notices?.[option.field] === undefined &&
                  !(option.field === 'bringCardMachine' && cardMachineRequired)
                )) ||
          Object.keys(schedulingValidationErrors).some((key) => key.startsWith(prefix)) ||
          (index === 0 && Object.keys(schedulingValidationErrors).some((key) =>
            key === 'shipping_date' || key === 'shipping_time' || key.startsWith('shipping_alternative_')
          ));
        const appointmentErrors: ValidationErrors = {};
        for (const [key, value] of Object.entries(errors)) {
          if (!key.startsWith(prefix)) continue;
          const suffix = key.slice(prefix.length);
          if (suffix === 'date' || suffix === 'time') appointmentErrors[`shipping_${suffix}`] = value;
          else if (suffix === 'distance') appointmentErrors.shipping_distance = value;
          else if (suffix.startsWith('alternative_')) appointmentErrors[`shipping_${suffix}`] = value;
        }
        if (index === 0) Object.assign(appointmentErrors, errors);
        if (!memoryRefs.current[appointment.id]) memoryRefs.current[appointment.id] = { current: null };
        const schedulingMemory = index === 0 && sessionMemoryRef
          ? sessionMemoryRef
          : memoryRefs.current[appointment.id];
        const scheduleSummary = [
          summarizeOptionText(appointment.scheduling),
          ...(isDelivery ? [`Frete ${formatFreight(Number(appointment.freightValue) || 0)}`] : []),
          `${appointment.itemIds.length} ${appointment.itemIds.length === 1 ? 'item' : 'itens'}`,
        ].join(' · ');
        const isImmediatePickup = isPickup && Boolean(appointment.scheduling.immediatePickup);
        const isPendingScheduling = Boolean(appointment.scheduling.pendingScheduling && !isImmediatePickup);
        const updateAppointmentSchedule = (fields: Partial<Appointment['scheduling']>) => updateAppointments((current) => current.map((entry) =>
          {
            if (entry.id !== appointment.id) return entry;
            const scheduling = { ...entry.scheduling, ...fields };
            scheduling.time = scheduling.type === 'fixed'
              ? scheduling.startTime || ''
              : scheduling.startTime && scheduling.endTime ? `${scheduling.startTime} às ${scheduling.endTime}` : '';
            return { ...entry, scheduling };
          }
        ));
        const toggleOperationItem = (item: Item, checked: boolean) => updateAppointments((current) => current.map((entry) => {
          if (entry.id !== appointment.id) return entry;
          const itemId = item.orderItemId!;
          const itemQuantities = quantitiesForSelectedItems(entry);
          const remaining = availableFor(current, appointment.id, item);
          if (checked && remaining < 1) return entry;
          if (checked) itemQuantities[itemId] = remaining;
          else delete itemQuantities[itemId];
          const itemHandlings = handlingsForSelectedItems(entry);
          if (checked) itemHandlings[itemId] = { handlingType: '', assemblyResponsible: '' };
          else delete itemHandlings[itemId];
          return {
            ...entry,
            itemIds: checked ? [...entry.itemIds, itemId] : entry.itemIds.filter((id) => id !== itemId),
            itemQuantities,
            itemHandlings,
          };
        }));
        const changeOperationItemQuantity = (item: Item, value: number) => {
          if (!Number.isFinite(value)) return;
          const itemId = item.orderItemId!;
          updateAppointments((current) => current.map((entry) => {
            const remaining = availableFor(current, appointment.id, item);
            if (entry.id !== appointment.id || remaining < 1) return entry;
            return {
              ...entry,
              itemQuantities: { ...quantitiesForSelectedItems(entry), [itemId]: Math.min(remaining, Math.max(1, value)) },
            };
          }));
        };
        const changeOperationItemHandling = (item: Item, value: AppointmentHandlingValue) => {
          const itemId = item.orderItemId!;
          updateAppointments((current) => current.map((entry) => entry.id === appointment.id ? {
            ...entry, itemHandlings: { ...handlingsForSelectedItems(entry), [itemId]: value },
          } : entry));
        };
        const handleSelectScheduleMode = (mode: 'scheduled' | 'pending' | 'immediate') => {
          // The selected date/time cache belongs to the active schedule mode.
          // Clear it before changing modes so a previous custom time cannot be
          // shown after the scheduling values themselves have been reset.
          schedulingMemory.current = null;

          if (mode === 'scheduled') {
            updateAppointmentSchedule({
              immediatePickup: false,
              pendingScheduling: false,
              notInformed: false,
              ...((isImmediatePickup || appointment.scheduling.immediatePickup)
                ? { date: '', endDate: '', startTime: '', endTime: '' }
                : {}),
            });
            return;
          }

          if (mode === 'pending') {
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
        return (
          <React.Fragment key={appointment.id}>
            <article className={`rounded-2xl border lg:hidden ${hasError ? 'border-red-400 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'}`}>
              <div className="flex items-center gap-2 p-3 sm:p-4">
                <button
                  type="button"
                  aria-haspopup="dialog"
                  aria-controls={`appointment-modal-${appointment.id}`}
                  title={appointmentError || undefined}
                  onClick={() => openAppointmentModal(appointment.id, 'edit')}
                  className={`flex min-w-0 flex-1 flex-col items-start gap-1.5 rounded-lg px-1 py-1 text-left hover:bg-slate-50 dark:hover:bg-slate-800 ${hasError ? 'text-red-700 dark:text-red-300' : 'text-slate-700 dark:text-slate-200'}`}
                >
                  <span className="flex max-w-full flex-wrap items-center gap-2 text-sm font-bold">
                    <span>Operação {index + 1}</span>
                    {appointment.deliveryMethod && <span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${appointment.deliveryMethod === 'delivery' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300' : 'bg-purple-50 text-purple-700 dark:bg-purple-950/30 dark:text-purple-300'}`}>
                      {appointment.deliveryMethod === 'delivery' ? <Truck className="h-3.5 w-3.5" aria-hidden="true" /> : <Store className="h-3.5 w-3.5" aria-hidden="true" />}
                      {appointment.deliveryMethod === 'delivery' ? 'Entrega' : 'Retirada'}
                    </span>}
                    {isImmediatePickup && <span className="inline-flex items-center rounded-full bg-purple-50 px-2 py-1 text-[10px] font-bold text-purple-700 dark:bg-purple-950/30 dark:text-purple-300">Retirada imediata</span>}
                    {hasPendingFields && <span className="inline-flex items-center rounded-full bg-orange-100 px-2 py-1 text-[10px] font-bold text-orange-700 dark:bg-orange-950/40 dark:text-orange-300">Falta preencher</span>}
                    {appointment.scheduling.pendingScheduling && !isImmediatePickup && <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-1 text-[10px] font-bold text-yellow-800 dark:bg-yellow-950/40 dark:text-yellow-300">Agendamento pendente</span>}
                  </span>
                  <span className="max-w-full break-words text-xs text-slate-500 dark:text-slate-400">
                    {scheduleSummary}
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Editar operação ${index + 1}`}
                  onClick={() => openAppointmentModal(appointment.id, 'edit')}
                  className="shrink-0 rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-700 dark:text-slate-400 dark:hover:bg-blue-950/30 dark:hover:text-blue-300"
                >
                  <Pencil className="h-4 w-4" aria-hidden="true" />
                </button>
                {appointments.length > 1 && <button type="button" aria-label={`Remover operação ${index + 1}`} onClick={() => {
                  updateAppointments((current) => current.filter((entry) => entry.id !== appointment.id));
                  if (index === 0 && sessionMemoryRef) sessionMemoryRef.current = null;
                  if (isEditing) closeAppointmentModal();
                }} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
              </div>
            </article>
            {isEditing && createPortal(
              <div
                className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"
                onClick={(event) => {
                  if (event.target === event.currentTarget) closeAppointmentModal();
                }}
              >
                  <section
                  id={`appointment-modal-${appointment.id}`}
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby={`appointment-modal-title-${appointment.id}`}
                    className="flex h-[calc(100dvh-1rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 shadow-2xl dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 sm:h-[min(82dvh,760px)] sm:max-h-[calc(100dvh-2rem)]"
                  onClick={(event) => event.stopPropagation()}
                >
                  <header className="flex shrink-0 flex-wrap items-center gap-x-4 gap-y-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-6 sm:py-4">
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-x-5 gap-y-2">
                      <h2 id={`appointment-modal-title-${appointment.id}`} className="text-lg font-semibold">
                        {activeAppointmentModal?.mode === 'add' ? 'Adicionar operação' : `Editar operação ${index + 1}`}
                      </h2>
                    </div>
                    <button
                      type="button"
                      aria-label={`Fechar operação ${index + 1}`}
                      onClick={() => closeAppointmentModal()}
                      className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </header>
                  <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
                    <div className="flex flex-col gap-6">
              <nav aria-label={`Etapas da operação ${index + 1}`} className="border-b border-slate-200 pb-3 dark:border-slate-800">
                <div className="relative flex min-h-12 items-center justify-between">
                  {previousStep && (
                    <button
                      type="button"
                      aria-label={`Voltar para ${previousStep.label}`}
                      onClick={() => setOperationStep(appointment.id, previousStep.id)}
                      className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
                    >
                      <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </button>
                  )}
                  <div className="absolute left-1/2 w-[calc(100%-5rem)] -translate-x-1/2 text-center sm:w-[calc(100%-6rem)]" aria-live="polite">
                    <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-[10px]">
                      Etapa {activeStepIndex + 1} de {operationSteps.length}
                    </span>
                    <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm">{operationSteps[activeStepIndex].label}</span>
                  </div>
                  {nextStep && (
                    <button
                      type="button"
                      aria-label={`Avançar para ${nextStep.label}`}
                      onClick={() => setOperationStep(appointment.id, nextStep.id)}
                      disabled={activeStep === 'method' && !appointment.deliveryMethod}
                      className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
                    >
                      <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
                    </button>
                  )}
                </div>
              </nav>
              {activeStep === 'method' && (
                <section className="flex min-w-0 flex-col gap-4" aria-label="Escolher modalidade da operação">
                  <fieldset aria-invalid={Boolean(deliveryMethodError)} className="flex min-w-0 flex-col gap-3">
                    <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
                      Escolha a modalidade <span className="text-red-500">*</span>
                    </legend>
                    <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                      {(['delivery', 'pickup'] as const).map((method) => {
                        const selected = appointment.deliveryMethod === method;
                        return (
                          <label
                            key={method}
                            className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-xl border px-4 py-3 text-sm font-semibold transition-colors ${
                              selected
                                ? method === 'delivery'
                                  ? 'border-emerald-500 bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200'
                                  : 'border-purple-500 bg-purple-50 text-purple-800 dark:bg-purple-950/30 dark:text-purple-200'
                                : 'border-slate-200 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            <input
                              type="radio"
                              name={`appointment-method-${appointment.id}`}
                              value={method}
                              required
                              checked={selected}
                              aria-invalid={Boolean(deliveryMethodError)}
                              className={method === 'delivery' ? 'accent-emerald-600' : 'accent-purple-600'}
                              onChange={() => {
                                if (index === 0 && sessionMemoryRef) sessionMemoryRef.current = null;
                                else if (memoryRefs.current[appointment.id]) memoryRefs.current[appointment.id].current = null;
                                const operationAddress = appointment.useCustomerAddress === false
                                  ? appointment.deliveryAddress
                                  : customerData?.fullAddress;
                                const distanceIsMissing = !Number.isFinite(appointment.distance) ||
                                  (appointment.distance ?? 0) <= 0;
                                updateAppointments((current) => current.map((entry) => {
                                  if (entry.id !== appointment.id || entry.deliveryMethod === method) return entry;
                                  const itemHandlings = handlingsForSelectedItems(entry);
                                  for (const itemId of entry.itemIds) itemHandlings[itemId] = { handlingType: '', assemblyResponsible: '' };
                                  const scheduling = method === 'delivery' && (entry.scheduling.immediatePickup || entry.scheduling.notInformed)
                                    ? { ...entry.scheduling, immediatePickup: false, notInformed: false, date: '', endDate: '', time: '', startTime: '', endTime: '' }
                                    : entry.scheduling;
                                  return {
                                    ...entry,
                                    deliveryMethod: method,
                                    itemHandlings,
                                    scheduling,
                                    ...(method === 'pickup' ? { durationMinutes: undefined, destinationCoords: undefined, routeGeoJSON: undefined } : {}),
                                  };
                                }), { clearRoute: method === 'pickup' });
                                if (
                                  method === 'delivery' && distanceIsMissing &&
                                  !(appointment.useCustomerAddress !== false && (shipping.noAddress || customerData?.noAddress))
                                ) {
                                  autoCalculateAppointmentDistance(appointment.id, operationAddress);
                                }
                              }}
                            />
                            {method === 'delivery' ? (
                              <Truck className="h-5 w-5" aria-hidden="true" />
                            ) : (
                              <Store className="h-5 w-5" aria-hidden="true" />
                            )}
                            {method === 'delivery' ? 'Entrega' : 'Retirada'}
                          </label>
                        );
                      })}
                    </div>
                    {deliveryMethodError && (
                      <p role="alert" className="text-xs font-semibold text-red-600 dark:text-red-400">
                        {String(deliveryMethodError)}
                      </p>
                    )}
                  </fieldset>
                </section>
              )}
              {activeStep === 'items' && (
                <section className="min-w-0" aria-label="Itens desta operação">
                <AppointmentItemsTable
                  items={selectableItems}
                  appointment={appointment}
                  deliveryMethod={appointment.deliveryMethod || (!isNewSaleFlow ? shipping.deliveryMethod : 'delivery')}
                  errors={errors}
                  itemsError={itemsError}
                  getAvailableQuantity={(item) => availableFor(appointments, appointment.id, item)}
                  getQuantity={(item) => itemQuantity(appointment, item)}
                  getHandling={(item) => {
                    const itemId = item.orderItemId!;
                    return {
                      handlingType: appointment.itemHandlings?.[itemId]?.handlingType ?? (appointment.itemHandlings ? '' : item.handlingType || ''),
                      assemblyResponsible: appointment.itemHandlings?.[itemId]?.assemblyResponsible ?? (appointment.itemHandlings ? '' : item.assemblyResponsible),
                    };
                  }}
                  onToggleItem={toggleOperationItem}
                  onChangeQuantity={changeOperationItemQuantity}
                  onChangeHandling={changeOperationItemHandling}
                />
                </section>
              )}
              {isDelivery && activeStep === 'address' && (
                <AppointmentAddressDialog
                  appointmentId={appointment.id}
                  hideSectionHeader
                  useCustomerAddress={appointment.useCustomerAddress}
                  customerAddress={customerData?.fullAddress}
                  deliveryAddress={appointment.deliveryAddress}
                  addressError={operationAddressError}
                  onUseCustomerAddress={(useCustomerAddress) => {
                    const selectedAddress = useCustomerAddress ? customerData?.fullAddress : appointment.deliveryAddress;
                    updateAppointments((current) => current.map((entry) =>
                      entry.id === appointment.id ? {
                        ...entry,
                        useCustomerAddress,
                        distance: undefined,
                        durationMinutes: undefined,
                        destinationCoords: undefined,
                        routeGeoJSON: undefined,
                      } : entry
                    ), { clearRoute: true });
                    autoCalculateAppointmentDistance(appointment.id, selectedAddress);
                  }}
                  onSaveAddress={(deliveryAddress) => {
                    updateAppointments((current) => current.map((entry) =>
                      entry.id === appointment.id ? {
                        ...entry,
                        useCustomerAddress: false,
                        deliveryAddress,
                        distance: undefined,
                        durationMinutes: undefined,
                        destinationCoords: undefined,
                        routeGeoJSON: undefined,
                      } : entry
                    ), { clearRoute: true });
                    autoCalculateAppointmentDistance(appointment.id, deliveryAddress);
                  }}
                  onRemoveAddress={() => updateAppointments((current) => current.map((entry) =>
                    entry.id === appointment.id ? {
                      ...entry,
                      deliveryAddress: undefined,
                      distance: undefined,
                      durationMinutes: undefined,
                      destinationCoords: undefined,
                      routeGeoJSON: undefined,
                    } : entry
                  ), { clearRoute: true })}
                >
                  <FreteDistancia
                    title="Frete"
                    titleClassName="text-[13px] font-semibold normal-case tracking-normal"
                    value={Number(appointment.freightValue) || 0}
                    distance={appointment.distance}
                    routeUrl={operationRouteUrl}
                    isCalculatingDistance={isCalculatingDistance}
                    errors={{
                      shipping_value: errors[`${prefix}freightValue`],
                      shipping_distance: errors[`${prefix}distance`],
                    }}
                    onChangeValue={(value) => updateAppointments((current) => current.map((entry) =>
                      entry.id === appointment.id ? { ...entry, freightValue: value } : entry
                    ), { autoCalculateValue: false })}
                    onChangeDistance={(rawValue) => {
                      const parsedDistance = Number.parseFloat(rawValue.replace(',', '.'));
                      const distance = Number.isFinite(parsedDistance) && parsedDistance >= 0 ? parsedDistance : undefined;
                      updateAppointments((current) => current.map((entry) => entry.id === appointment.id ? {
                        ...entry,
                        distance,
                        ...(distance === undefined ? {} : { freightValue: calculateFreightByDistance(distance) }),
                      } : entry), { autoCalculateValue: true });
                    }}
                    onAutoCalculateDistance={hasOperationAddress
                      ? () => autoCalculateAppointmentDistance(appointment.id, operationAddress, false)
                      : undefined}
                  />
                </AppointmentAddressDialog>
              )}
              {activeStep === 'schedule' && <Agendamento
                hideTitle
                modeSelector={(
                  <fieldset className="flex min-w-0 flex-col" aria-label="Como será a programação?">
                    <legend className="mb-2 text-[13px] font-medium text-slate-700 dark:text-slate-300">
                      Como será a programação?
                    </legend>
                    <div className="flex min-w-0 flex-wrap items-center gap-4">
                      {([
                        { value: 'scheduled', label: 'Agendar' },
                        { value: 'pending', label: 'Agendar depois' },
                        ...(isPickup ? [{ value: 'immediate' as const, label: 'Retirada imediata' }] : []),
                      ] as const).map((option) => {
                        const selected = option.value === (isImmediatePickup ? 'immediate' : isPendingScheduling ? 'pending' : 'scheduled');
                        return (
                          <label
                            key={option.value}
                            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                          >
                            <input
                              type="radio"
                              name={`appointment-schedule-mode-${appointment.id}`}
                              value={option.value}
                              checked={selected}
                              onChange={() => handleSelectScheduleMode(option.value)}
                              className="shrink-0 accent-blue-600"
                            />
                            {option.label}
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>
                )}
                scheduling={appointment.scheduling}
                onChangeScheduling={(key, value) => updateAppointments((current) => current.map((entry) => {
                  if (entry.id !== appointment.id) return entry;
                  const next = { ...entry.scheduling, [key]: value } as Schedule;
                  next.time = next.type === 'fixed' ? next.startTime || '' : next.startTime && next.endTime ? `${next.startTime} às ${next.endTime}` : '';
                  return { ...entry, scheduling: next };
                }))}
                errors={appointmentErrors}
                isPickup={isPickup}
                hideSchedulingShortcuts
                hideNotice
                sessionMemoryRef={schedulingMemory}
              />}
              {activeStep === 'notices' && isSale && (isDelivery || isPickup) && (
                <AppointmentNotices
                  appointmentId={appointment.id}
                  deliveryMethod={isPickup ? 'pickup' : 'delivery'}
                  notices={appointment.notices}
                  errors={errors}
                  cardMachineRequired={cardMachineRequired && isDelivery}
                  onChange={(changes) => updateAppointments((current) => current.map((entry) =>
                    entry.id === appointment.id
                      ? { ...entry, notices: { ...entry.notices, ...changes } }
                      : entry
                  ))}
                />
              )}
              {isDelivery && activeStepIndex === operationSteps.length - 1 && operationDestinationCoords && (
                <section className="flex min-w-0 flex-col gap-2" aria-label={`Rota da operação ${index + 1}`}>
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                    Rota de entrega
                  </h3>
                  <MapRoute
                    destinationCoords={operationDestinationCoords}
                    routeGeoJSON={operationRouteGeoJSON}
                    className="h-72 w-full"
                  />
                </section>
              )}
                    </div>
                  </div>
                  <footer className={`flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5 sm:py-4 lg:px-6 ${nextStep ? 'lg:hidden' : ''}`}>
                    {previousStep && (
                      <button
                        type="button"
                        onClick={() => setOperationStep(appointment.id, previousStep.id)}
                        className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
                      >
                        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
                      </button>
                    )}
                    {nextStep ? (
                      <button
                        type="button"
                        onClick={() => setOperationStep(appointment.id, nextStep.id)}
                        disabled={activeStep === 'method' && !appointment.deliveryMethod}
                        className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Próxima etapa <ChevronRight className="h-4 w-4" aria-hidden="true" />
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => closeAppointmentModal()}
                        className="ml-auto min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                      >
                        Concluir
                      </button>
                    )}
                  </footer>
                </section>
              </div>,
              document.body
            )}
          </React.Fragment>
        );
      })}
    </section>
  );
};
