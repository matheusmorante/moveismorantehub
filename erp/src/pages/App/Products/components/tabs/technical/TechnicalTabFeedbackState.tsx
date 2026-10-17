import React from 'react';

export interface TechnicalTabFeedbackStateProps {
  readonly loading: boolean;
  readonly showEmpty: boolean;
}

/**
 * Renderiza os estados visuais de carregamento ou ausência de campos na aba técnica.
 */
export const TechnicalTabFeedbackState: React.FC<TechnicalTabFeedbackStateProps> = ({
  loading,
  showEmpty,
}) => {
  if (loading) {
    return (
      <div className="py-8 text-center text-slate-400 text-xs font-bold animate-pulse">
        <i className="bi bi-arrow-clockwise animate-spin mr-2" />
        Carregando especificações técnicas...
      </div>
    );
  }

  if (showEmpty) {
    return (
      <div className="py-8 text-center text-slate-400 text-xs italic bg-slate-50 dark:bg-slate-950/40 rounded-2xl border border-dashed border-slate-200 dark:border-slate-800 flex flex-col items-center gap-2">
        <i className="bi bi-info-circle text-lg text-slate-400" />
        <span>Nenhuma especificação técnica cadastrada no sistema.</span>
      </div>
    );
  }

  return null;
};
