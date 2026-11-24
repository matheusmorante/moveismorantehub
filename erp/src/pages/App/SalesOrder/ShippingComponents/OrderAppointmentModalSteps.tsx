import React from 'react';
import { ChevronLeft, ChevronRight, Store, Truck } from 'lucide-react';
import type Shipping from '@/pages/types/Shipping.type';
import MapRoute from './MapRoute';
import type { OperationStep } from './orderAppointmentsNormalization';

export const AppointmentModalStepperNav: React.FC<{
  index: number;
  appointmentId: string;
  operationSteps: { id: OperationStep; label: string }[];
  activeStepIndex: number;
  activeStep: OperationStep;
  previousStep?: { id: OperationStep; label: string };
  nextStep?: { id: OperationStep; label: string };
  deliveryMethod?: string;
  onStepChange: (appointmentId: string, step: OperationStep) => void;
}> = ({
  index,
  appointmentId,
  operationSteps,
  activeStepIndex,
  activeStep,
  previousStep,
  nextStep,
  deliveryMethod,
  onStepChange,
}) => (
  <nav aria-label={`Etapas da operação ${index + 1}`} className="border-b border-slate-200 pb-3 dark:border-slate-800">
    <div className="relative flex min-h-12 items-center justify-between">
      {previousStep && (
        <button
          type="button"
          aria-label={`Voltar para ${previousStep.label}`}
          onClick={() => onStepChange(appointmentId, previousStep.id)}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
        >
          <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </button>
      )}
      <div className="absolute left-1/2 w-[calc(100%-5rem)] -translate-x-1/2 text-center sm:w-[calc(100%-6rem)]" aria-live="polite">
        <span className="block text-[9px] font-semibold uppercase tracking-wider text-slate-400 dark:text-slate-500 sm:text-[10px]">
          Etapa {activeStepIndex + 1} de {operationSteps.length}
        </span>
        <span className="block truncate text-xs font-bold text-slate-800 dark:text-slate-100 sm:text-sm">
          {operationSteps[activeStepIndex].label}
        </span>
      </div>
      {nextStep && (
        <button
          type="button"
          aria-label={`Avançar para ${nextStep.label}`}
          onClick={() => onStepChange(appointmentId, nextStep.id)}
          disabled={activeStep === 'method' && !deliveryMethod}
          className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
        >
          <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
        </button>
      )}
    </div>
  </nav>
);

export const AppointmentMethodStep: React.FC<{
  appointmentId: string;
  deliveryMethod?: string;
  deliveryMethodError?: string;
  onSelectMethod: (method: 'delivery' | 'pickup') => void;
}> = ({ appointmentId, deliveryMethod, deliveryMethodError, onSelectMethod }) => (
  <section className="flex min-w-0 flex-col gap-4" aria-label="Escolher modalidade da operação">
    <fieldset aria-invalid={Boolean(deliveryMethodError)} className="flex min-w-0 flex-col gap-3">
      <legend className="text-sm font-semibold text-slate-700 dark:text-slate-200">
        Escolha a modalidade <span className="text-red-500">*</span>
      </legend>
      <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
        {(['delivery', 'pickup'] as const).map((method) => {
          const selected = deliveryMethod === method;
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
                name={`appointment-method-${appointmentId}`}
                value={method}
                required
                checked={selected}
                aria-invalid={Boolean(deliveryMethodError)}
                className={method === 'delivery' ? 'accent-emerald-600' : 'accent-purple-600'}
                onChange={() => onSelectMethod(method)}
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
);

export const AppointmentScheduleModeSelector: React.FC<{
  appointmentId: string;
  isPickup: boolean;
  isImmediatePickup: boolean;
  isPendingScheduling: boolean;
  onSelectMode: (mode: 'scheduled' | 'pending' | 'immediate') => void;
}> = ({ appointmentId, isPickup, isImmediatePickup, isPendingScheduling, onSelectMode }) => (
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
        const selected =
          option.value === (isImmediatePickup ? 'immediate' : isPendingScheduling ? 'pending' : 'scheduled');
        return (
          <label
            key={option.value}
            className="flex min-h-10 cursor-pointer items-center gap-2 rounded-lg px-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <input
              type="radio"
              name={`appointment-schedule-mode-${appointmentId}`}
              value={option.value}
              checked={selected}
              onChange={() => onSelectMode(option.value)}
              className="shrink-0 accent-blue-600"
            />
            {option.label}
          </label>
        );
      })}
    </div>
  </fieldset>
);

export const AppointmentRouteMapSection: React.FC<{
  index: number;
  destinationCoords: [number, number];
  routeGeoJSON?: Shipping['routeGeoJSON'];
}> = ({ index, destinationCoords, routeGeoJSON }) => (
  <section className="flex min-w-0 flex-col gap-2" aria-label={`Rota da operação ${index + 1}`}>
    <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
      Rota de entrega
    </h3>
    <MapRoute
      destinationCoords={destinationCoords}
      routeGeoJSON={routeGeoJSON}
      className="h-72 w-full"
    />
  </section>
);

export const AppointmentModalFooter: React.FC<{
  appointmentId: string;
  activeStep: OperationStep;
  previousStep?: { id: OperationStep; label: string };
  nextStep?: { id: OperationStep; label: string };
  deliveryMethod?: string;
  onStepChange: (appointmentId: string, step: OperationStep) => void;
  onClose: () => void;
}> = ({ appointmentId, activeStep, previousStep, nextStep, deliveryMethod, onStepChange, onClose }) => (
  <footer
    className={`flex shrink-0 items-center justify-between gap-3 border-t border-slate-200 px-4 py-3 dark:border-slate-800 sm:px-5 sm:py-4 lg:px-6 ${
      nextStep ? 'lg:hidden' : ''
    }`}
  >
    {previousStep && (
      <button
        type="button"
        onClick={() => onStepChange(appointmentId, previousStep.id)}
        className="inline-flex min-h-11 items-center gap-1 rounded-xl bg-slate-100 px-4 py-3 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" /> Anterior
      </button>
    )}
    {nextStep ? (
      <button
        type="button"
        onClick={() => onStepChange(appointmentId, nextStep.id)}
        disabled={activeStep === 'method' && !deliveryMethod}
        className="ml-auto inline-flex min-h-11 items-center gap-1 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Próxima etapa <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    ) : (
      <button
        type="button"
        onClick={() => onClose()}
        className="ml-auto min-h-11 rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
      >
        Concluir
      </button>
    )}
  </footer>
);
