import React from 'react';

interface PriceLabelEditorHeaderProps {
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onBackToErp: () => void;
}

export const PriceLabelEditorHeader: React.FC<PriceLabelEditorHeaderProps> = ({
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onBackToErp,
}) => {
  return (
    <div className="flex items-center justify-between px-4 sm:px-6 lg:px-10 py-3 bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 shrink-0 relative z-30">
      <div className="flex items-center gap-3.5">
        <div className="w-8 h-8 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center font-black">
          <i className="bi bi-palette-fill text-sm" />
        </div>
        <div>
          <h2 className="text-xs sm:text-sm font-black text-slate-800 dark:text-white uppercase tracking-tight leading-none">
            TEMPLATE DA ETIQUETA DE PREÇO
          </h2>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onUndo}
          disabled={!canUndo}
          title="Desfazer alterações (Ctrl+Z)"
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <i className="bi bi-arrow-counterclockwise text-sm" />
          <span className="hidden sm:inline">Desfazer</span>
        </button>
        <button
          type="button"
          onClick={onRedo}
          disabled={!canRedo}
          title="Refazer alterações (Ctrl+Y)"
          className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all text-xs font-bold flex items-center gap-1.5 cursor-pointer"
        >
          <i className="bi bi-arrow-clockwise text-sm" />
          <span className="hidden sm:inline">Refazer</span>
        </button>

        <button
          type="button"
          onClick={onBackToErp}
          className="h-8 rounded-lg bg-slate-50 dark:bg-slate-800 px-3 text-slate-500 hover:text-red-500 flex items-center justify-center gap-1.5 transition-colors cursor-pointer ml-1 text-xs font-black"
        >
          <i className="bi bi-arrow-left text-xs" />
          <span>Voltar ao ERP</span>
        </button>
      </div>
    </div>
  );
};

export default PriceLabelEditorHeader;
