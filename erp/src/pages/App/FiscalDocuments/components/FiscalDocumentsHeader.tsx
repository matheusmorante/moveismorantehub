import React from 'react';

export type FiscalDocumentsMainTab = 'documents' | 'pendencies';

interface FiscalDocumentsHeaderProps {
  readonly activeTab?: FiscalDocumentsMainTab;
  readonly onTabChange?: (tab: FiscalDocumentsMainTab) => void;
  readonly openPendenciesCount?: number;
  readonly canExport?: boolean;
  readonly onExport?: () => void;
}

export const FiscalDocumentsHeader: React.FC<FiscalDocumentsHeaderProps> = ({
  activeTab = 'documents',
  onTabChange,
  openPendenciesCount = 0,
  canExport = false,
  onExport,
}) => {
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!menuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (event.target instanceof Node && !menuRef.current?.contains(event.target)) setMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('mousedown', closeOnOutsideClick);
    document.addEventListener('keydown', closeOnEscape);
    return () => {
      document.removeEventListener('mousedown', closeOnOutsideClick);
      document.removeEventListener('keydown', closeOnEscape);
    };
  }, [menuOpen]);

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

      <div className="flex items-center justify-between gap-2">
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

        {canExport && onExport && (
          <div className="relative" ref={menuRef}>
            <button
              type="button"
              aria-label="Mais opções fiscais"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              onClick={() => setMenuOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              <i aria-hidden="true" className="bi bi-three-dots-vertical text-lg" />
            </button>
            {menuOpen && (
              <div
                role="menu"
                aria-label="Opções fiscais"
                className="absolute right-0 z-30 mt-2 w-64 overflow-hidden rounded-xl border border-slate-200 bg-white p-1 shadow-xl dark:border-slate-700 dark:bg-slate-900"
              >
                <button
                  type="button"
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    onExport();
                  }}
                  className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-xs font-semibold text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
                >
                  <i aria-hidden="true" className="bi bi-file-earmark-zip text-blue-600 dark:text-blue-400" />
                  <span>Exportar documentos fiscais</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
