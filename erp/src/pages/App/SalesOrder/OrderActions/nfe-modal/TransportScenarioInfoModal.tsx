import React from 'react';

interface TransportScenarioInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description: string;
  sefazRule: string;
}

export const TransportScenarioInfoModal: React.FC<TransportScenarioInfoModalProps> = ({
  isOpen,
  onClose,
  title,
  description,
  sefazRule,
}) => {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-150"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-5 space-y-4 animate-in zoom-in-95 duration-150"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="fiscal-transport-modal-title"
      >
        <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-100 text-blue-700 dark:bg-blue-950/60 dark:text-blue-400 flex items-center justify-center shrink-0">
              <i className="bi bi-truck text-base" />
            </div>
            <div>
              <h3
                id="fiscal-transport-modal-title"
                className="text-sm font-bold text-slate-800 dark:text-slate-100"
              >
                Transporte na Nota Fiscal
              </h3>
              <span className="text-[10px] text-slate-500 dark:text-slate-400">
                Regra fiscal aplicada
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 dark:hover:text-slate-200 flex items-center justify-center transition-colors"
            aria-label="Fechar"
          >
            <i className="bi bi-x-lg text-xs" />
          </button>
        </div>

        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100 dark:border-blue-900/50">
            <span className="text-[10px] font-black uppercase tracking-wider text-blue-700 dark:text-blue-400 block mb-1">
              Modalidade Fiscal de Frete
            </span>
            <p className="text-xs font-bold text-blue-950 dark:text-blue-200">{title}</p>
          </div>

          <div className="text-xs text-slate-600 dark:text-slate-300 space-y-2.5 leading-relaxed">
            <p>{description}</p>
            <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/50 p-3 rounded-xl border border-slate-100 dark:border-slate-800">
              <strong className="text-slate-700 dark:text-slate-200 block mb-1">
                Diretriz SEFAZ:
              </strong>
              {sefazRule}
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold rounded-xl bg-blue-600 text-white hover:bg-blue-700 transition-colors shadow-sm"
          >
            Entendi
          </button>
        </div>
      </div>
    </div>
  );
};
