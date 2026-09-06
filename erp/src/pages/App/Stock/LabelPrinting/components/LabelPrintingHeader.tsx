import React from 'react';

interface Props {
  queueCount: number;
  selectedCategoryName: string;
  onOpenModelModal: () => void;
  onOpenQueueModal: () => void;
  onBack?: () => void;
}

export const LabelPrintingHeader: React.FC<Props> = ({
  queueCount,
  selectedCategoryName,
  onOpenModelModal,
  onOpenQueueModal,
  onBack,
}) => {
  return (
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 mb-4 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
          🏷️ Impressão e Design de Etiquetas
          <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300">
            {selectedCategoryName}
          </span>
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          Gerencie modelos de etiquetas de gôndola, preços, QR Codes e filas de impressão em lote.
        </p>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={onOpenModelModal}
          className="px-3.5 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 border border-slate-200 dark:border-slate-700"
        >
          <span>📐</span> Modelos de Grade
        </button>

        <button
          onClick={onOpenQueueModal}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs rounded-xl transition-colors flex items-center gap-2 shadow-sm relative"
        >
          <span>📋</span> Fila de Impressão
          {queueCount > 0 && (
            <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-amber-400 text-slate-900 rounded-full">
              {queueCount}
            </span>
          )}
        </button>

        {onBack && (
          <button
            onClick={onBack}
            className="px-3 py-2 text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 text-xs font-semibold"
          >
            Voltar
          </button>
        )}
      </div>
    </div>
  );
};
