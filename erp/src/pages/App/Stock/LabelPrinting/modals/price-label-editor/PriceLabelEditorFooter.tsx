import React from 'react';

interface PriceLabelEditorFooterProps {
  autoSaveStatus: 'saved' | 'saving' | 'error';
}

export const PriceLabelEditorFooter: React.FC<PriceLabelEditorFooterProps> = ({
  autoSaveStatus,
}) => {
  return (
    <div className="flex shrink-0 items-center border-t border-slate-200 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-3.5 lg:px-10">
      <div
        className={`flex items-center gap-2 text-xs font-bold ${
          autoSaveStatus === 'error' ? 'text-red-600' : 'text-slate-500'
        }`}
      >
        <i
          className={`bi text-sm ${
            autoSaveStatus === 'saving'
              ? 'bi-arrow-repeat animate-spin text-blue-500'
              : autoSaveStatus === 'error'
                ? 'bi-exclamation-circle-fill text-red-500'
                : 'bi-cloud-check-fill text-emerald-500'
          }`}
        />
        <span>
          {autoSaveStatus === 'saving'
            ? 'Salvamento automático...'
            : autoSaveStatus === 'error'
              ? 'Erro no salvamento automático'
              : 'Salvamento automático'}
        </span>
      </div>
    </div>
  );
};

export default PriceLabelEditorFooter;
