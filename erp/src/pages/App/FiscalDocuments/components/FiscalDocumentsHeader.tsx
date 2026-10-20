import React from 'react';

export type FiscalDocumentsMainTab = 'documents' | 'pendencies';

interface FiscalDocumentsHeaderProps {
  readonly activeTab?: FiscalDocumentsMainTab;
  readonly onTabChange?: (tab: FiscalDocumentsMainTab) => void;
  readonly openPendenciesCount?: number;
}

export const FiscalDocumentsHeader: React.FC<FiscalDocumentsHeaderProps> = ({
  activeTab = 'documents',
  onTabChange,
  openPendenciesCount = 0,
}) => {
  return (
    <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between py-0.5">
      <div>
        <h1 className="text-base font-semibold leading-tight tracking-tight text-slate-800 dark:text-slate-100">
          Notas Fiscais de Saída
        </h1>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
          Gestão fiscal de emissões, regularizações e pendências SEFAZ.
        </p>
      </div>

      {onTabChange && (
        <div
          role="tablist"
          aria-label="Navegação do módulo fiscal"
          className="flex items-center gap-1 rounded-2xl border border-slate-200/80 bg-slate-100/80 p-1 dark:border-slate-800 dark:bg-slate-900/80"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'documents'}
            onClick={() => onTabChange('documents')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'documents'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i aria-hidden="true" className="bi bi-file-earmark-text" />
            <span>Documentos Fiscais</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'pendencies'}
            onClick={() => onTabChange('pendencies')}
            className={`flex items-center gap-2 rounded-xl px-3.5 py-1.5 text-xs font-bold transition-all ${
              activeTab === 'pendencies'
                ? 'bg-white text-slate-900 shadow-2xs dark:bg-slate-800 dark:text-white'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200'
            }`}
          >
            <i aria-hidden="true" className="bi bi-exclamation-triangle" />
            <span>Pendências Fiscais</span>
            {openPendenciesCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-[10px] font-black text-white">
                {openPendenciesCount}
              </span>
            )}
          </button>
        </div>
      )}
    </header>
  );
};
