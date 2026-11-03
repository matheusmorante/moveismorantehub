import React from 'react';

export interface LabelGridModelHeaderProps {
  isDesignMode: boolean;
  setIsDesignMode: (mode: boolean) => void;
  marginT: number;
  marginB: number;
  marginL: number;
  marginR: number;
  gapH: number;
  gapV: number;
  displayName: string;
  onSave: () => void;
  busy: boolean;
  saveBlocked: boolean;
  blocked: boolean;
  isSaving: boolean;
}

export const LabelGridModelHeader: React.FC<LabelGridModelHeaderProps> = ({
  isDesignMode,
  setIsDesignMode,
  marginT,
  marginB,
  marginL,
  marginR,
  gapH,
  gapV,
  displayName,
  onSave,
  busy,
  saveBlocked,
  blocked,
  isSaving,
}) => {
  return (
    <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-50 bg-white px-3 py-3 dark:border-slate-800 dark:bg-slate-900 sm:px-6 sm:py-4 lg:px-12 lg:py-8">
      <div className="flex min-w-0 flex-1 items-center gap-2 sm:gap-5">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 text-white shadow-lg shadow-indigo-500/20 sm:h-14 sm:w-14 sm:rounded-3xl">
          <i className={`bi bi-${isDesignMode ? 'brush-fill' : 'grid-3x3-gap-fill'} text-lg sm:text-2xl`} />
        </div>
        <div className="min-w-0">
          <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
            <p className="text-[8px] font-black uppercase leading-tight tracking-widest text-slate-400 sm:text-[9px] sm:tracking-[0.3em]">
              {isDesignMode ? 'Design da Etiqueta' : 'Editar Modelo de Etiqueta'}
            </p>
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <p className="text-[8px] font-black uppercase leading-tight tracking-wide text-blue-500 sm:text-[9px] sm:tracking-widest">
              Margens: {marginT}|{marginB}|{marginL}|{marginR} - Gaps: {gapH}|{gapV} (mm)
            </p>
          </div>
          <h3
            id="label-grid-modal-title"
            className="break-words text-base font-black uppercase leading-tight tracking-tight text-slate-800 dark:text-white sm:text-xl lg:text-2xl sm:tracking-tighter"
          >
            {displayName}
          </h3>
        </div>
      </div>

      <div className="flex w-full items-center gap-2 sm:w-auto sm:gap-4">
        {!isDesignMode && (
          <button
            onClick={onSave}
            disabled={busy || saveBlocked || blocked}
            className={`min-h-10 flex-1 rounded-xl px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white shadow-xl shadow-blue-500/20 transition-all active:scale-95 sm:flex-none sm:rounded-[1.5rem] sm:px-6 sm:py-4 sm:text-[10px] sm:tracking-widest ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} flex items-center justify-center gap-2`}
          >
            {isSaving ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        )}
        {isDesignMode && (
          <button
            onClick={() => setIsDesignMode(false)}
            className="flex min-h-10 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-[9px] font-black uppercase tracking-wider text-white shadow-xl shadow-emerald-500/20 transition-all active:scale-95 hover:bg-emerald-700 sm:flex-none sm:gap-4 sm:rounded-[1.5rem] sm:px-6 sm:py-4 sm:text-[10px] sm:tracking-widest"
          >
            <i className="bi bi-check-circle-fill" /> Confirmar Design
          </button>
        )}
      </div>
    </div>
  );
};
