import React from 'react';

interface ProductAiModeTabsProps {
  activeMode: 'web_search' | 'descriptive_text';
  onChangeMode: (mode: 'web_search' | 'descriptive_text') => void;
}

export const ProductAiModeTabs: React.FC<ProductAiModeTabsProps> = ({
  activeMode,
  onChangeMode,
}) => {
  return (
    <div className="px-5 pt-3 pb-0 bg-slate-50/40 dark:bg-slate-950/20 border-b border-slate-100 dark:border-slate-800 flex gap-2 shrink-0">
      <button
        type="button"
        onClick={() => onChangeMode('web_search')}
        className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
          activeMode === 'web_search'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <i className="bi bi-globe2" />
        <span>1. Pesquisar na Web (Nome do Produto)</span>
      </button>
      <button
        type="button"
        onClick={() => onChangeMode('descriptive_text')}
        className={`pb-2.5 px-3 text-xs font-bold border-b-2 flex items-center gap-2 transition-all cursor-pointer ${
          activeMode === 'descriptive_text'
            ? 'border-amber-500 text-amber-600 dark:text-amber-400'
            : 'border-transparent text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
        }`}
      >
        <i className="bi bi-file-earmark-text" />
        <span>2. Texto Descritivo / Ficha Técnica</span>
      </button>
    </div>
  );
};
