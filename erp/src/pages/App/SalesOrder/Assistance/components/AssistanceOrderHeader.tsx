import React from 'react';

interface AssistanceOrderHeaderProps {
  isEditing: boolean;
  isLinked?: boolean;
  linkedOrderCode?: string;
  onClose: () => void;
  isBusy?: boolean;
  autoSaving?: boolean;
}

const AssistanceOrderHeader: React.FC<AssistanceOrderHeaderProps> = ({
  isEditing,
  isLinked,
  linkedOrderCode,
  onClose,
  isBusy = false,
  autoSaving,
}) => (
  <div className="px-6 py-3 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-amber-50 dark:bg-amber-900/10 shrink-0">
    <div className="flex items-center gap-3">
      <div className="bg-amber-500 p-2 rounded-xl shadow-md shadow-amber-200 dark:shadow-amber-900/30">
        <i className="bi bi-tools text-white text-lg" />
      </div>
      <div className="flex flex-col">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {isLinked
              ? isEditing
                ? 'Editar Assistência Vinculada'
                : 'Nova Assistência Vinculada'
              : isEditing
                ? 'Editar Assistência Avulsa'
                : 'Pedido de Assistência Avulso'}
          </h2>
          {isLinked && linkedOrderCode && (
            <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
              Venda #{linkedOrderCode}
            </span>
          )}
          {autoSaving && (
            <span
              data-testid="assistance-autosaving-badge"
              className="text-[10px] font-bold text-amber-600 dark:text-amber-400 flex items-center gap-1 animate-pulse"
            >
              <i className="bi bi-cloud-arrow-up" /> Salvando rascunho...
            </span>
          )}
        </div>
      </div>
    </div>
    <button
      type="button"
      onClick={onClose}
      disabled={isBusy}
      aria-label="Fechar formulário de assistência"
      className="p-1.5 hover:bg-amber-100 dark:hover:bg-amber-900/30 rounded-full transition-colors text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
    >
      <i className="bi bi-x-lg text-lg" />
    </button>
  </div>
);

export default AssistanceOrderHeader;
