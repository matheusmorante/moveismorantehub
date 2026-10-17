import React from 'react';

interface PersonImportFooterProps {
  busy: boolean;
  hasStartedImport: boolean;
  previousImportPending: boolean;
  selectedCount: number;
  onBack: () => void;
  onRunImport: () => void;
}

export const PersonImportFooter: React.FC<PersonImportFooterProps> = ({
  busy,
  hasStartedImport,
  previousImportPending,
  selectedCount,
  onBack,
  onRunImport,
}) => {
  return (
    <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex gap-4 bg-slate-50/50 dark:bg-slate-900/50 shrink-0">
      <button
        type="button"
        disabled={busy || hasStartedImport}
        onClick={onBack}
        className="flex-1 py-4 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-200 rounded-2xl font-black uppercase text-[10px] tracking-widest"
      >
        Voltar
      </button>
      <button
        type="button"
        disabled={busy || previousImportPending}
        onClick={onRunImport}
        className="flex-[2] py-4 bg-blue-600 hover:bg-blue-700 text-white rounded-2xl font-black uppercase tracking-widest shadow-xl shadow-blue-200/50 flex items-center justify-center gap-3"
      >
        <i className="bi bi-cloud-arrow-up-fill text-lg" />
        Finalizar Importação ({selectedCount} Registros)
      </button>
    </div>
  );
};
