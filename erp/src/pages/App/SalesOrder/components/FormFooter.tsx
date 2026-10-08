import React from 'react';
import Order from '@/pages/types/order.type';
import type { DraftAutoSaveStatus } from '../hooks/useOrderAutoSave';

interface FormFooterProps {
  currentOrder: Order;
  totalOrderValue: number;
  isSaving: boolean;
  draftAutoSaveStatus: DraftAutoSaveStatus;
  showDraftAutoSave: boolean;
  onCompleteOrder: (e?: React.MouseEvent) => void;
  onPrev?: () => void;
  onNext?: () => void;
  currentStep: number;
  buttonLabel?: string;
  colorScheme?: 'blue' | 'emerald' | 'indigo';
  showTestMode?: boolean;
  isTestMode?: boolean;
  onTestModeChange?: (enabled: boolean) => void;
}

const FormFooter = ({
  currentOrder,
  totalOrderValue,
  isSaving,
  draftAutoSaveStatus,
  showDraftAutoSave,
  onCompleteOrder,
  onPrev,
  onNext,
  currentStep,
  buttonLabel,
  colorScheme = 'emerald',
  showTestMode = false,
  isTestMode = false,
  onTestModeChange,
}: FormFooterProps) => {
  const isBudget = currentOrder.orderType === 'budget';
  const isLastStep = isBudget ? currentStep === 4 : currentStep === 5;

  return (
    <div className="border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-4 px-6 transition-all duration-300 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] dark:shadow-none shrink-0 z-50">
      <div className="max-w-[1400px] mx-auto flex flex-col gap-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 w-full">
          {/* Totals Section */}
          <div className="flex flex-col sm:flex-row items-center gap-4">
            <div className="bg-slate-50 dark:bg-slate-800/60 px-5 py-2 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm min-w-fit flex flex-col items-center md:items-start transition-all">
              <span className="text-slate-400 dark:text-slate-500 text-[9px] font-black uppercase tracking-widest mb-0.5">
                Total do Pedido
              </span>
              <span className="text-blue-600 dark:text-blue-400 font-black text-xl italic tracking-tighter whitespace-nowrap leading-none">
                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                  totalOrderValue || 0
                )}
              </span>
            </div>

            {showTestMode && currentOrder.orderType === 'sale' && onTestModeChange && (
              <div
                className={`flex items-center gap-2.5 rounded-xl border px-3 py-2 transition-colors ${
                  isTestMode
                    ? 'border-amber-300 bg-amber-50 dark:border-amber-800 dark:bg-amber-950/40'
                    : 'border-slate-200 bg-white/70 dark:border-slate-700 dark:bg-slate-800/40'
                }`}
              >
                <span
                  className={`text-[10px] font-bold ${
                    isTestMode
                      ? 'text-amber-800 dark:text-amber-200'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  Modo teste
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-label="Modo teste"
                  aria-checked={isTestMode}
                  onClick={() => onTestModeChange(!isTestMode)}
                  className={`inline-flex min-w-12 items-center justify-center rounded-full px-2 py-1 text-[9px] font-black tracking-wider transition-colors ${
                    isTestMode
                      ? 'bg-amber-500 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-300'
                  }`}
                >
                  {isTestMode ? 'ON' : 'OFF'}
                </button>
              </div>
            )}

            {showDraftAutoSave && (
              <div
                role="status"
                aria-live="polite"
                aria-busy={draftAutoSaveStatus === 'saving'}
                className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2 transition-colors ${
                  draftAutoSaveStatus === 'saving'
                    ? 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30'
                    : draftAutoSaveStatus === 'saved'
                      ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30'
                      : draftAutoSaveStatus === 'error'
                        ? 'border-rose-200 bg-rose-50 dark:border-rose-900/60 dark:bg-rose-950/30'
                        : 'border-slate-200 bg-slate-50 dark:border-slate-700 dark:bg-slate-800/60'
                }`}
              >
                <i
                  aria-hidden="true"
                  className={`bi text-sm ${
                    draftAutoSaveStatus === 'saving'
                      ? 'bi-arrow-repeat animate-spin text-amber-600 dark:text-amber-400'
                      : draftAutoSaveStatus === 'saved'
                        ? 'bi-check-circle-fill text-emerald-600 dark:text-emerald-400'
                        : draftAutoSaveStatus === 'error'
                          ? 'bi-exclamation-circle-fill text-rose-600 dark:text-rose-400'
                          : draftAutoSaveStatus === 'pending'
                            ? 'bi-clock-history text-blue-600 dark:text-blue-400'
                            : 'bi-cloud-check text-slate-500 dark:text-slate-400'
                  }`}
                />
                <span className="text-[10px] font-bold tracking-wide text-slate-600 dark:text-slate-300">
                  {draftAutoSaveStatus === 'saving'
                    ? 'Salvando alteração...'
                    : draftAutoSaveStatus === 'saved'
                      ? 'Alteração processada e salva'
                      : draftAutoSaveStatus === 'error'
                        ? 'Falha ao salvar alteração'
                        : draftAutoSaveStatus === 'pending'
                          ? 'Alteração pendente'
                          : 'Salvamento automático ativo'}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Actions */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            {currentStep > 1 && onPrev && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onPrev();
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all active:scale-95"
              >
                <i className="bi bi-arrow-left" />
                Anterior
              </button>
            )}

            {!isLastStep ? (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  onNext?.();
                }}
                className="flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all active:scale-95"
              >
                Próxima Etapa
                <i className="bi bi-arrow-right" />
              </button>
            ) : (
              <button
                onClick={(e) => {
                  e.preventDefault();
                  onCompleteOrder(e as any);
                }}
                disabled={isSaving}
                className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-10 py-3 rounded-xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95 whitespace-nowrap ${
                  isSaving
                    ? 'bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none'
                    : colorScheme === 'blue'
                      ? 'bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-blue-900/40 shadow-lg'
                      : colorScheme === 'indigo'
                        ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-200 dark:shadow-indigo-900/40 shadow-lg'
                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-emerald-900/40 shadow-lg'
                }`}
              >
                {isSaving ? (
                  <>
                    <i className="bi bi-arrow-repeat animate-spin text-lg" />
                    Salvando...
                  </>
                ) : (
                  <>
                    <i className="bi bi-check2-circle text-lg" />
                    {buttonLabel || 'Concluir Pedido'}
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Secondary Actions (WhatsApp, Print, etc) REMOVED as per user request. Actions handled in the list view. */}
      </div>
    </div>
  );
};

export default FormFooter;
