import React, { useState } from 'react';
import {
  getOrderStepStatus,
  getVisibleOrderSteps,
} from './stepper/orderStepperConfig';
import {
  OrderStepIconBadge,
  OrderStepPickerModal,
} from './stepper/OrderStepIconBadge';

interface OrderStepperProps {
  currentStep: number;
  jumpToStep: (step: number) => void;
  errors?: Record<string, string>;
  isBudget?: boolean;
}

const OrderStepper = ({
  currentStep,
  jumpToStep,
  errors = {},
  isBudget = false,
}: OrderStepperProps) => {
  const [isStepPickerOpen, setIsStepPickerOpen] = useState(false);
  const visibleSteps = getVisibleOrderSteps(isBudget);
  const getStepStatus = (step: number) => getOrderStepStatus(step, currentStep, errors);

  const activeStep = visibleSteps.find((step) => step.step === currentStep) || visibleSteps[0];
  const activeStatus = getStepStatus(activeStep.step);

  return (
    <div className="relative flex w-auto max-w-full min-w-0 items-center justify-center py-0.5 md:w-full">
      <button
        type="button"
        onClick={() => setIsStepPickerOpen(true)}
        className="group flex min-w-0 items-center gap-2 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 md:hidden"
        aria-haspopup="dialog"
        aria-expanded={isStepPickerOpen}
        title="Selecionar etapa do pedido"
      >
        <OrderStepIconBadge step={activeStep} status={activeStatus} size="h-8 w-8" />
        <span className="flex min-w-0 flex-col">
          <span
            className={`text-[8px] font-black uppercase tracking-wider leading-none ${
              activeStatus === 'error' ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'
            }`}
          >
            Passo {activeStep.step}
          </span>
          <span className="max-w-[118px] truncate text-[10px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">
            {activeStep.label}
          </span>
        </span>
        <i className="bi bi-chevron-down ml-0.5 text-[10px] text-slate-400" aria-hidden="true" />
      </button>

      <div className="hidden w-full items-center justify-between gap-1 md:flex md:gap-1.5 2xl:gap-2">
        {visibleSteps.map((s, idx) => {
          const status = getStepStatus(s.step);
          return (
            <React.Fragment key={s.step}>
              <button
                type="button"
                onClick={() => jumpToStep(s.step)}
                className="group flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl px-0.5 py-0.5 text-left outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 2xl:flex-1 2xl:gap-2"
                title={`Passo ${s.step}: ${s.label}`}
              >
                <OrderStepIconBadge step={s} status={status} size="h-8 w-8 sm:h-9 sm:w-9" />
                <span
                  className={`min-w-0 flex-col text-left ${
                    status === 'active' ? 'flex' : 'hidden 2xl:flex'
                  }`}
                >
                  <span
                    className={`text-[8px] font-black uppercase tracking-wider leading-none ${
                      status === 'error'
                        ? 'text-rose-500'
                        : status === 'active'
                          ? 'text-blue-600 dark:text-blue-400'
                          : 'text-slate-400'
                    }`}
                  >
                    Passo {s.step}
                  </span>
                  <span
                    className={`max-w-[130px] truncate text-[10px] font-black uppercase tracking-tight 2xl:max-w-none 2xl:whitespace-nowrap ${
                      status === 'error'
                        ? 'text-rose-600 italic'
                        : status === 'active'
                          ? 'text-slate-900 dark:text-slate-100'
                          : 'text-slate-500'
                    }`}
                  >
                    {s.label}
                  </span>
                </span>
              </button>

              {idx < visibleSteps.length - 1 && (
                <div
                  className={`hidden h-0.5 min-w-2 flex-1 md:block 2xl:max-w-8 ${
                    status === 'done'
                      ? 'bg-emerald-500/40'
                      : status === 'error'
                        ? 'bg-rose-500/30'
                        : 'bg-slate-200 dark:bg-slate-800'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {isStepPickerOpen && (
        <OrderStepPickerModal
          visibleSteps={visibleSteps}
          getStepStatus={getStepStatus}
          onSelectStep={jumpToStep}
          onClose={() => setIsStepPickerOpen(false)}
        />
      )}
    </div>
  );
};

export default OrderStepper;
