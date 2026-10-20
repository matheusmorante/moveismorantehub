import React from 'react';
import OrderStepper from '../../../components/OrderStepper';
import type { ValidationErrors } from '@/pages/utils/validations';

export interface OrderEditModalHeaderProps {
  readonly reconciliationMode?: boolean;
  readonly currentStep: number;
  readonly jumpToStep: (step: number) => void;
  readonly errors: ValidationErrors;
  readonly onClose: () => void;
}

export const OrderEditModalHeader: React.FC<OrderEditModalHeaderProps> = ({
  reconciliationMode,
  currentStep,
  jumpToStep,
  errors,
  onClose,
}) => {
  return (
    <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-slate-100 bg-white/80 px-2 py-2 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 sm:gap-6 sm:px-4 sm:py-2.5 lg:px-6">
      {/* Esquerda: Identificação */}
      <div className="flex min-w-0 items-center shrink-0">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20 sm:h-10 sm:w-10 sm:rounded-xl">
            <i className="bi bi-pencil-square text-xs sm:text-base" />
          </div>
          <div className="min-w-0">
            <h2 className="truncate text-xs font-black tracking-tight text-slate-800 dark:text-slate-100 sm:text-base">
              {reconciliationMode ? 'Conciliação Comercial' : 'Editar Pedido'}
            </h2>
          </div>
        </div>
      </div>

      {/* Centro: Stepper de Etapas */}
      {!reconciliationMode && (
        <div className="flex flex-1 min-w-0 justify-center px-1 sm:px-3 2xl:max-w-4xl mx-auto">
          <OrderStepper
            currentStep={currentStep}
            jumpToStep={jumpToStep}
            errors={errors}
          />
        </div>
      )}

      <button
        type="button"
        onClick={onClose}
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:bg-slate-800 dark:hover:bg-rose-950/30 sm:h-9 sm:w-9 sm:rounded-xl"
        title="Fechar"
        aria-label="Fechar pedido"
      >
        <i className="bi bi-x-lg text-xs" />
      </button>
    </div>
  );
};
