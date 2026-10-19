import React from 'react';
import OrderStepper from '../components/OrderStepper';
import { getNewOrderHeaderTheme } from './newSaleOrderHelpers';
import ReturnIcon from '@/components/shared/ReturnIcon';
import PickupIcon from '@/components/shared/PickupIcon';
import DeliveryTruckIcon from '@/components/shared/DeliveryTruckIcon';

interface NewSaleOrderHeaderProps {
  isScrolled: boolean;
  isBudget: boolean;
  isReturn: boolean;
  isPickup: boolean;
  orderIndex: number | null;
  isGeneratingCode: boolean;
  currentStep: number;
  jumpToStep: (step: number) => void;
  errors: Record<string, string>;
  onClose: () => void;
}

export const NewSaleOrderHeader = ({
  isScrolled,
  isBudget,
  isReturn,
  isPickup,
  orderIndex,
  isGeneratingCode,
  currentStep,
  jumpToStep,
  errors,
  onClose,
}: NewSaleOrderHeaderProps) => {
  const theme = getNewOrderHeaderTheme({ isScrolled, isBudget, isReturn, isPickup });

  return (
    <div
      className={`sticky top-0 z-50 transition-all duration-300 border-b flex flex-row justify-between items-center gap-4 px-2 py-2 sm:gap-6 sm:px-4 sm:py-2.5 lg:px-6 shrink-0 ${theme.containerBg}`}
    >
      <div className="flex min-w-0 items-center shrink-0">
        <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
          <div
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-md transition-all sm:h-10 sm:w-10 sm:rounded-xl ${theme.iconBadgeBg}`}
          >
            {theme.iconClass === 'bi-arrow-return-left' ? (
              <ReturnIcon className="h-6 w-6 sm:h-8 sm:w-8" />
            ) : isPickup ? (
              <PickupIcon white className="h-6 w-6 sm:h-8 sm:w-8" />
            ) : theme.iconClass === 'delivery-truck' ? (
              <DeliveryTruckIcon className="h-6 w-6 text-white sm:h-8 sm:w-8" />
            ) : (
              <i className={`bi ${theme.iconClass} text-white text-xs sm:text-base`} />
            )}
          </div>
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
              <h2
                className={`truncate text-xs font-black tracking-tight sm:text-base ${theme.titleColor}`}
              >
                {theme.titleText}
              </h2>
              {orderIndex ? (
                <span className="inline-flex shrink-0 items-center rounded-md border border-slate-700/50 bg-slate-900 px-1.5 py-0.5 font-mono text-[8px] font-black text-white shadow-sm dark:bg-white dark:text-slate-900 sm:rounded-lg sm:px-2.5 sm:text-[11px]">
                  #{String(orderIndex).padStart(6, '0')}
                </span>
              ) : isGeneratingCode ? (
                <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 sm:rounded-lg sm:px-2 sm:text-[10px] animate-pulse">
                  <i className="bi bi-arrow-repeat animate-spin text-[10px]" /> Gerando código...
                </span>
              ) : (
                <span className="inline-flex shrink-0 items-center rounded-md bg-rose-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 sm:rounded-lg sm:px-2 sm:text-[10px]">
                  Sem código
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 min-w-0 justify-center px-1 sm:px-3 2xl:max-w-4xl mx-auto">
        <OrderStepper
          currentStep={currentStep}
          jumpToStep={jumpToStep}
          errors={errors}
          isBudget={isBudget}
        />
      </div>

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
