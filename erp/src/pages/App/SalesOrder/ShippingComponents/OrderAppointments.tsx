import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Pencil, Plus, Store, Trash2, Truck } from 'lucide-react';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import type CustomerData from '@/pages/types/customerData.type';
import type FullAddress from '@/pages/types/fullAddress.type';
import type { ValidationErrors } from '@/pages/utils/validations';
import type { DistanceCalculationOptions } from '../hooks/useOrderDistanceCalculator';
import type { SchedulingSessionMemory } from './Agendamento';
import { getOperationsFreightTotal, getPrimaryOperationDistance, normalizeOperationFreight } from './operationFreight';
import { validateShippingScheduling } from '../../../../../../shared-utils/commercialShippingRules';
import { DELIVERY_NOTICE_OPTIONS } from '../components/steps/logisticsNoticeRules';
import { OrderAppointmentModal } from './OrderAppointmentModal';
import {
  type Appointment,
  type OperationStep,
  type Schedule,
  blankSchedule,
  getAppointmentDisplayState,
  getAppointments,
  hasRoutableAddress,
  syncServiceToolNoticesForAppointments,
} from './orderAppointmentsNormalization';

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

  const appointmentViews = appointments.map((appointment, index) => ({
    appointment,
    index,
    ...getAppointmentDisplayState({
      appointment,
      index,
      shipping,
      customerData,
      errors,
      schedulingValidationErrors,
      isNewSaleFlow,
      isSale,
      cardMachineRequired,
    }),
  }));

  const editingView = activeAppointmentModal
    ? appointmentViews.find((view) => view.appointment.id === activeAppointmentModal.id)
    : undefined;
  if (editingView && !memoryRefs.current[editingView.appointment.id]) {
    memoryRefs.current[editingView.appointment.id] = { current: null };
  }

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
            {appointmentViews.map(({
              appointment,
              index,
              isImmediatePickup,
              hasPendingFields,
              hasError,
              appointmentError,
              displayMethod,
              desktopScheduleSummary,
            }) => (
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
                <td className="break-words px-3 py-3 text-xs text-slate-600 dark:text-slate-300">{desktopScheduleSummary}</td>
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
            ))}
          </tbody>
        </table>
      </div>
      {appointmentViews.map(({
        appointment,
        index,
        isImmediatePickup,
        hasPendingFields,
        hasError,
        appointmentError,
        mobileScheduleSummary,
      }) => (
        <article key={appointment.id} className={`rounded-2xl border lg:hidden ${hasError ? 'border-red-400 dark:border-red-700' : 'border-slate-200 dark:border-slate-700'}`}>
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
                {mobileScheduleSummary}
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
              if (activeAppointmentModal?.id === appointment.id) closeAppointmentModal();
            }} className="shrink-0 rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"><Trash2 className="h-4 w-4" /></button>}
          </div>
        </article>
      ))}
      {editingView && activeAppointmentModal && (
        <OrderAppointmentModal
          appointment={editingView.appointment}
          index={editingView.index}
          mode={activeAppointmentModal.mode}
          appointments={appointments}
          shipping={shipping}
          selectableItems={selectableItems}
          customerData={customerData}
          errors={errors}
          routeUrl={routeUrl}
          isCalculatingDistance={isCalculatingDistance}
          isNewSaleFlow={isNewSaleFlow}
          isSale={isSale}
          cardMachineRequired={cardMachineRequired}
          requestedStep={activeOperationSteps[editingView.appointment.id] ?? 'method'}
          schedulingMemory={
            editingView.index === 0 && sessionMemoryRef
              ? sessionMemoryRef
              : memoryRefs.current[editingView.appointment.id]
          }
          onStepChange={setOperationStep}
          onClose={closeAppointmentModal}
          onClearMemory={() => {
            if (editingView.index === 0 && sessionMemoryRef) sessionMemoryRef.current = null;
            else if (memoryRefs.current[editingView.appointment.id]) {
              memoryRefs.current[editingView.appointment.id].current = null;
            }
          }}
          updateAppointments={updateAppointments}
          autoCalculateAppointmentDistance={autoCalculateAppointmentDistance}
        />
      )}
    </section>
  );
};
