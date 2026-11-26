import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import {
  getOrderStepStatus,
  getVisibleOrderSteps,
} from './orderStepperConfig';
import type { OrderStep, OrderStepStatus } from './orderStepperConfig';
import { OrderStepIconBadge } from './OrderStepIconBadge';

interface OrderStepperProps {
  currentStep: number;
  jumpToStep: (step: number) => void;
  errors?: Record<string, string>;
  isBudget?: boolean;
  isLogisticsDisabled?: boolean;
  steps?: OrderStep[];
  resolveStepStatus?: (step: number, currentStep: number, errors: Record<string, string>) => OrderStepStatus;
  navigationLabel?: string;
  navigationDisabled?: boolean;
}

const OrderStepper = ({
  currentStep,
  jumpToStep,
  errors = {},
  isBudget = false,
  isLogisticsDisabled = false,
  steps,
  resolveStepStatus,
  navigationLabel = 'Navegação entre etapas do pedido',
  navigationDisabled = false,
}: OrderStepperProps) => {
  const visibleSteps = steps || getVisibleOrderSteps(isBudget);
  const getStepStatus = (step: number) =>
    resolveStepStatus
      ? resolveStepStatus(step, currentStep, errors)
      : getOrderStepStatus(step, currentStep, errors);
  const matchedActiveStepIndex = visibleSteps.findIndex((step) => step.step === currentStep);
  const activeStepIndex = matchedActiveStepIndex >= 0 ? matchedActiveStepIndex : 0;
  const activeStep = visibleSteps[activeStepIndex];
  const activeStepStatus = getStepStatus(activeStep.step);
  const previousStep = visibleSteps[activeStepIndex - 1];
  const nextStep = visibleSteps[activeStepIndex + 1];
  const isStepDisabled = (step: number) => navigationDisabled || (step === 4 && isLogisticsDisabled);
  const getDisabledTitle = (step: number) =>
    navigationDisabled
      ? 'Aguarde a conclusão do salvamento.'
      : isStepDisabled(step)
        ? 'Selecione um cliente para acessar Logística.'
        : undefined;

  return (
    <div className="relative w-full max-w-full min-w-0 py-0.5">
      <div className="relative flex min-h-12 items-center justify-between lg:hidden" role="group" aria-label={navigationLabel}>
        {previousStep && (
          <button
            type="button"
            aria-label={`Voltar para ${previousStep.label}`}
            disabled={isStepDisabled(previousStep.step)}
            title={getDisabledTitle(previousStep.step)}
            onClick={() => jumpToStep(previousStep.step)}
            className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
          >
            <ChevronLeft className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </button>
        )}
        <div className="absolute left-1/2 w-[calc(100%-5rem)] -translate-x-1/2 text-center sm:w-[calc(100%-6rem)]" aria-live="polite">
          <span className={`block text-[9px] font-semibold uppercase tracking-wider sm:text-[10px] ${
            activeStepStatus === 'error' ? 'text-rose-500' : 'text-slate-400 dark:text-slate-500'
          }`}>
            Etapa {activeStepIndex + 1} de {visibleSteps.length}
          </span>
          <span className={`block truncate text-xs font-bold sm:text-sm ${
            activeStepStatus === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'
          }`}>
            {activeStep.label}
          </span>
        </div>
        {nextStep && (
          <button
            type="button"
            aria-label={`Avançar para ${nextStep.label}`}
            disabled={isStepDisabled(nextStep.step)}
            title={getDisabledTitle(nextStep.step)}
            onClick={() => jumpToStep(nextStep.step)}
            className="ml-auto inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 sm:h-10 sm:w-10"
          >
            <ChevronRight className="h-4 w-4 sm:h-5 sm:w-5" aria-hidden="true" />
          </button>
        )}
      </div>

      <div className="hidden w-full items-center justify-between gap-1 lg:flex lg:gap-1.5 2xl:gap-2">
        {visibleSteps.map((s, idx) => {
          const status = getStepStatus(s.step);
          const disabled = isStepDisabled(s.step);
          return (
            <React.Fragment key={s.step}>
              <button
                type="button"
                disabled={disabled}
                onClick={() => jumpToStep(s.step)}
                className="group flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl px-0.5 py-0.5 text-left outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-40 disabled:hover:bg-transparent dark:hover:bg-slate-800 2xl:flex-1 2xl:gap-2"
                title={
                  disabled
                    ? getDisabledTitle(s.step)
                    : status === 'error'
                    ? `Passo ${s.step}: ${s.label}. Há erros para revisar.`
                    : `Passo ${s.step}: ${s.label}`
                }
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
                  className={`hidden h-0.5 min-w-2 flex-1 lg:block 2xl:max-w-8 ${
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

    </div>
  );
};

export default OrderStepper;
