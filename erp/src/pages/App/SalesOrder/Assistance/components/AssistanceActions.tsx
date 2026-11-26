import React from 'react';

interface AssistanceActionsProps {
  onClose: () => void;
  isLoading: boolean;
  isEditing: boolean;
  currentStep: number;
  totalSteps: number;
  onPrevious: () => void;
  onNext: () => void;
  navigationDisabled?: boolean;
  saveBlocked?: boolean;
  autoSaving?: boolean;
}

const AssistanceActions: React.FC<AssistanceActionsProps> = ({
  onClose,
  isLoading,
  isEditing,
  currentStep,
  totalSteps,
  onPrevious,
  onNext,
  navigationDisabled = false,
  saveBlocked,
  autoSaving = false,
}) => {
  const isLastStep = currentStep >= totalSteps;

  return (
    <div className="flex shrink-0 items-center gap-2 border-t border-slate-100 bg-white/95 px-4 py-4 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] backdrop-blur-md dark:border-slate-800 dark:bg-slate-900/95 sm:gap-3 sm:px-6">
    <button
      type="button"
      onClick={onClose}
      disabled={isLoading || autoSaving}
      className="flex-1 py-3 text-[10px] font-black uppercase tracking-widest text-slate-500 transition-colors rounded-xl border border-slate-200 hover:border-red-200 hover:text-red-500 disabled:opacity-50 dark:border-slate-800 dark:text-slate-400 dark:hover:border-red-900 sm:flex-none sm:px-5"
    >
      Cancelar
    </button>

    {currentStep > 1 && (
      <button
        type="button"
        onClick={onPrevious}
        disabled={navigationDisabled}
        className="flex-1 py-3 rounded-xl bg-slate-100 text-[10px] font-black uppercase tracking-widest text-slate-600 transition-all hover:bg-slate-200 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 sm:flex-none sm:px-5"
      >
        <i className="bi bi-arrow-left mr-2" />Anterior
      </button>
    )}

    {!isLastStep ? (
      <button
        type="button"
        onClick={onNext}
        disabled={navigationDisabled}
        className="flex-1 py-3 rounded-xl bg-blue-600 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-blue-500/20 transition-all hover:bg-blue-700 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 sm:flex-none sm:px-7"
      >
        Próxima Etapa<i className="bi bi-arrow-right ml-2" />
      </button>
    ) : (
      <button
        type="submit"
        disabled={isLoading || saveBlocked}
        className="flex-1 py-3 rounded-xl bg-amber-500 text-[10px] font-black uppercase tracking-widest text-white shadow-lg shadow-amber-200 transition-all hover:bg-amber-600 active:scale-95 disabled:opacity-50 dark:shadow-amber-900/30 sm:flex-none sm:px-7"
      >
        {isLoading ? (
          <i className="bi bi-hourglass-split animate-spin mr-2" />
        ) : (
          <i className="bi bi-check-lg mr-2" />
        )}
        {isLoading ? 'Salvando...' : isEditing ? 'Atualizar Assistência' : 'Finalizar Assistência'}
      </button>
    )}
    </div>
  );
};

export default AssistanceActions;
