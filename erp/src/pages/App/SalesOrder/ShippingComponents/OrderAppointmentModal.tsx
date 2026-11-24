import React from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import type CustomerData from '@/pages/types/customerData.type';
import type FullAddress from '@/pages/types/fullAddress.type';
import type { ValidationErrors } from '@/pages/utils/validations';
import Agendamento, { type SchedulingSessionMemory } from './Agendamento';
import { AppointmentItemsTable } from './AppointmentItemsTable';
import FreteDistancia from './FreteDistancia';
import { AppointmentAddressDialog } from './AppointmentAddressDialog';
import { AppointmentNotices } from './AppointmentNotices';
import {
  AppointmentMethodStep,
  AppointmentModalFooter,
  AppointmentModalStepperNav,
  AppointmentRouteMapSection,
  AppointmentScheduleModeSelector,
} from './OrderAppointmentModalSteps';
import { useOrderAppointmentModalActions } from './useOrderAppointmentModalActions';
import {
  type Appointment,
  type OperationStep,
  getAppointmentItemQuantity,
  getAvailableItemQuantityForAppointment,
} from './orderAppointmentsNormalization';

export interface OrderAppointmentModalProps {
  appointment: Appointment;
  index: number;
  mode: 'add' | 'edit';
  appointments: Appointment[];
  shipping: Shipping;
  selectableItems: Item[];
  customerData?: CustomerData;
  errors: ValidationErrors;
  routeUrl?: string;
  isCalculatingDistance?: boolean;
  isNewSaleFlow: boolean;
  isSale: boolean;
  cardMachineRequired: boolean;
  requestedStep: OperationStep;
  schedulingMemory: React.MutableRefObject<SchedulingSessionMemory | null>;
  onStepChange: (appointmentId: string, step: OperationStep) => void;
  onClose: () => void;
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

export const OrderAppointmentModal: React.FC<OrderAppointmentModalProps> = ({
  appointment,
  index,
  mode,
  appointments,
  shipping,
  selectableItems,
  customerData,
  errors,
  routeUrl,
  isCalculatingDistance,
  isNewSaleFlow,
  isSale,
  cardMachineRequired,
  requestedStep,
  schedulingMemory,
  onStepChange,
  onClose,
  onClearMemory,
  updateAppointments,
  autoCalculateAppointmentDistance,
}) => {
  const modal = useOrderAppointmentModalActions({
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
  });

  return createPortal(
    <div
      className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/60 p-2 backdrop-blur-sm sm:p-4"
      onClick={(event) => {
        if (event.target === event.currentTarget) onClose();
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
              {mode === 'add' ? 'Adicionar operação' : `Editar operação ${index + 1}`}
            </h2>
          </div>
          <button
            type="button"
            aria-label={`Fechar operação ${index + 1}`}
            onClick={() => onClose()}
            className="ml-auto flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </header>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 sm:p-6">
          <div className="flex flex-col gap-6">
            <AppointmentModalStepperNav
              index={index}
              appointmentId={appointment.id}
              operationSteps={modal.operationSteps}
              activeStepIndex={modal.activeStepIndex}
              activeStep={modal.activeStep}
              previousStep={modal.previousStep}
              nextStep={modal.nextStep}
              deliveryMethod={appointment.deliveryMethod}
              onStepChange={onStepChange}
            />
            {modal.activeStep === 'method' && (
              <AppointmentMethodStep
                appointmentId={appointment.id}
                deliveryMethod={appointment.deliveryMethod}
                deliveryMethodError={modal.deliveryMethodError}
                onSelectMethod={modal.handleSelectDeliveryMethod}
              />
            )}
            {modal.activeStep === 'items' && (
              <section className="min-w-0" aria-label="Itens desta operação">
                <AppointmentItemsTable
                  items={selectableItems}
                  appointment={appointment}
                  deliveryMethod={
                    appointment.deliveryMethod || (!isNewSaleFlow ? shipping.deliveryMethod : 'delivery')
                  }
                  errors={errors}
                  itemsError={modal.itemsError}
                  getAvailableQuantity={(item) =>
                    getAvailableItemQuantityForAppointment(appointments, appointment.id, item)
                  }
                  getQuantity={(item) => getAppointmentItemQuantity(appointment, item)}
                  getHandling={(item) => {
                    const itemId = item.orderItemId!;
                    return {
                      handlingType:
                        appointment.itemHandlings?.[itemId]?.handlingType ??
                        (appointment.itemHandlings ? '' : item.handlingType || ''),
                      assemblyResponsible:
                        appointment.itemHandlings?.[itemId]?.assemblyResponsible ??
                        (appointment.itemHandlings ? '' : item.assemblyResponsible),
                    };
                  }}
                  onToggleItem={modal.toggleOperationItem}
                  onChangeQuantity={modal.changeOperationItemQuantity}
                  onChangeHandling={modal.changeOperationItemHandling}
                />
              </section>
            )}
            {modal.isDelivery && modal.activeStep === 'address' && (
              <AppointmentAddressDialog
                appointmentId={appointment.id}
                hideSectionHeader
                useCustomerAddress={appointment.useCustomerAddress}
                customerAddress={customerData?.fullAddress}
                deliveryAddress={appointment.deliveryAddress}
                addressError={modal.operationAddressError}
                onUseCustomerAddress={modal.handleUseCustomerAddress}
                onSaveAddress={modal.handleSaveAddress}
                onRemoveAddress={modal.handleRemoveAddress}
              >
                <FreteDistancia
                  title="Frete"
                  titleClassName="text-[13px] font-semibold normal-case tracking-normal"
                  value={Number(appointment.freightValue) || 0}
                  distance={appointment.distance}
                  routeUrl={modal.operationRouteUrl}
                  isCalculatingDistance={isCalculatingDistance}
                  errors={{
                    shipping_value: errors[`${modal.prefix}freightValue`],
                    shipping_distance: errors[`${modal.prefix}distance`],
                  }}
                  onChangeValue={modal.handleChangeFreightValue}
                  onChangeDistance={modal.handleChangeFreightDistance}
                  onAutoCalculateDistance={
                    modal.hasOperationAddress
                      ? () =>
                          autoCalculateAppointmentDistance(appointment.id, modal.operationAddress, false)
                      : undefined
                  }
                />
              </AppointmentAddressDialog>
            )}
            {modal.activeStep === 'schedule' && (
              <Agendamento
                hideTitle
                modeSelector={
                  <AppointmentScheduleModeSelector
                    appointmentId={appointment.id}
                    isPickup={modal.isPickup}
                    isImmediatePickup={modal.isImmediatePickup}
                    isPendingScheduling={modal.isPendingScheduling}
                    onSelectMode={modal.handleSelectScheduleMode}
                  />
                }
                scheduling={appointment.scheduling}
                onChangeScheduling={modal.handleChangeScheduling}
                errors={modal.appointmentErrors}
                isPickup={modal.isPickup}
                hideSchedulingShortcuts
                hideNotice
                sessionMemoryRef={schedulingMemory}
              />
            )}
            {modal.activeStep === 'notices' && isSale && (modal.isDelivery || modal.isPickup) && (
              <AppointmentNotices
                appointmentId={appointment.id}
                deliveryMethod={modal.isPickup ? 'pickup' : 'delivery'}
                notices={appointment.notices}
                errors={errors}
                cardMachineRequired={cardMachineRequired && modal.isDelivery}
                onChange={modal.handleChangeNotices}
              />
            )}
            {modal.isDelivery &&
              modal.activeStepIndex === modal.operationSteps.length - 1 &&
              modal.operationDestinationCoords && (
                <AppointmentRouteMapSection
                  index={index}
                  destinationCoords={modal.operationDestinationCoords}
                  routeGeoJSON={modal.operationRouteGeoJSON}
                />
              )}
          </div>
        </div>
        <AppointmentModalFooter
          appointmentId={appointment.id}
          activeStep={modal.activeStep}
          previousStep={modal.previousStep}
          nextStep={modal.nextStep}
          deliveryMethod={appointment.deliveryMethod}
          onStepChange={onStepChange}
          onClose={onClose}
        />
      </section>
    </div>,
    document.body,
  );
};
