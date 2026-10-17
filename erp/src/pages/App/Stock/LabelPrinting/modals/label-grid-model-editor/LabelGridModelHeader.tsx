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
    <div className="px-12 py-8 border-b border-slate-50 dark:border-slate-800 bg-white dark:bg-slate-900 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-5">
        <div className="w-14 h-14 rounded-3xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
          <i className={`bi bi-${isDesignMode ? 'brush-fill' : 'grid-3x3-gap-fill'} text-2xl`} />
        </div>
        <div>
          <div className="flex items-center gap-3 mb-1">
            <p className="text-[9px] text-slate-400 uppercase tracking-[0.3em] font-black leading-none">
              {isDesignMode ? 'Design da Etiqueta' : 'Editar Modelo de Etiqueta'}
            </p>
            <div className="h-1 w-1 rounded-full bg-slate-300" />
            <p className="text-[9px] text-blue-500 font-black uppercase tracking-widest leading-none">
              Margens: {marginT}|{marginB}|{marginL}|{marginR} - Gaps: {gapH}|{gapV} (mm)
            </p>
          </div>
          <h3
            id="label-grid-modal-title"
            className="text-2xl font-black text-slate-800 dark:text-white uppercase tracking-tighter leading-none"
          >
            {displayName}
          </h3>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {!isDesignMode && (
          <button
            onClick={onSave}
            disabled={busy || saveBlocked || blocked}
            className={`px-8 py-4 ${isSaving ? 'bg-slate-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'} text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-blue-500/20 transition-all active:scale-95 flex items-center gap-2`}
          >
            {isSaving ? 'Salvando...' : 'Salvar Modelo'}
          </button>
        )}
        {isDesignMode && (
          <button
            onClick={() => setIsDesignMode(false)}
            className="px-8 py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-[1.5rem] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-emerald-500/20 transition-all active:scale-95 flex items-center gap-4"
          >
            <i className="bi bi-check-circle-fill" /> Confirmar Design
          </button>
        )}
      </div>
    </div>
  );
};
