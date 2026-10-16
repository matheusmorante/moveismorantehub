import React from 'react';
import { OrderStep, OrderStepStatus } from './orderStepperConfig';

interface OrderStepIconBadgeProps {
  step: OrderStep;
  status: OrderStepStatus;
  size?: string;
}

export const OrderStepIconBadge = ({
  step,
  status,
  size = 'h-8 w-8',
}: OrderStepIconBadgeProps) => (
  <span
    className={`relative flex ${size} shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-colors ${
      status === 'error'
        ? 'border-rose-600 bg-rose-600 text-white'
        : status === 'active'
          ? 'border-blue-600 bg-blue-600 text-white shadow-blue-500/30'
          : status === 'done'
            ? 'border-emerald-500 bg-emerald-500 text-white'
            : 'border-slate-200 bg-slate-50 text-slate-400 group-hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900'
    }`}
  >
    <i className={`bi ${step.icon} text-sm`} />
    {status === 'error' && (
      <i className="bi bi-exclamation-triangle-fill absolute -right-1 -top-1 rounded-full border border-rose-500 bg-white p-0.5 text-[7px] text-rose-500 dark:bg-slate-900" />
    )}
  </span>
);

interface OrderStepPickerModalProps {
  visibleSteps: OrderStep[];
  getStepStatus: (step: number) => OrderStepStatus;
  onSelectStep: (step: number) => void;
  onClose: () => void;
}

export const OrderStepPickerModal = ({
  visibleSteps,
  getStepStatus,
  onSelectStep,
  onClose,
}: OrderStepPickerModalProps) => (
  <div
    className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:hidden"
    onClick={onClose}
  >
    <section
      role="dialog"
      aria-modal="true"
      aria-labelledby="order-step-picker-title"
      className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
      onClick={(event) => event.stopPropagation()}
    >
      <div className="mb-3 flex items-center justify-between">
        <div>
          <h2
            id="order-step-picker-title"
            className="text-sm font-black text-slate-900 dark:text-white"
          >
            Ir para uma etapa
          </h2>
          <p className="text-[10px] font-medium text-slate-500">Etapas do pedido</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
          aria-label="Fechar seleção de etapa"
        >
          <i className="bi bi-x-lg" />
        </button>
      </div>
      <div className="flex flex-col gap-1">
        {visibleSteps.map((step) => {
          const status = getStepStatus(step.step);
          return (
            <button
              key={step.step}
              type="button"
              onClick={() => {
                onSelectStep(step.step);
                onClose();
              }}
              className={`flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${
                status === 'active'
                  ? 'bg-blue-50 dark:bg-blue-950/40'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              <OrderStepIconBadge step={step} status={status} size="h-9 w-9" />
              <span className="flex flex-col">
                <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">
                  Passo {step.step}
                </span>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                  {step.label}
                </span>
              </span>
              {status === 'active' && (
                <i className="bi bi-check2 ml-auto text-blue-600" aria-label="Etapa atual" />
              )}
            </button>
          );
        })}
      </div>
    </section>
  </div>
);
