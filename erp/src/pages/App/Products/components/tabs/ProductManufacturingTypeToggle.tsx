import React from 'react';

interface ProductManufacturingTypeToggleProps {
  readonly isOwnProduction: boolean;
  readonly onChange: (ownProduction: boolean) => void;
}

export const ProductManufacturingTypeToggle: React.FC<ProductManufacturingTypeToggleProps> = ({
  isOwnProduction,
  onChange,
}) => {
  return (
    <div
      id="product-manufacturing-type-section"
      className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 p-4 rounded-2xl bg-slate-50/80 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800 transition-colors"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isOwnProduction
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}
        >
          <i
            className={`bi ${
              isOwnProduction ? 'bi-tools' : 'bi-box-seam'
            } text-xl`}
            aria-hidden="true"
          />
        </div>
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Origem Comercial do Produto
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {isOwnProduction
              ? 'Produção própria da empresa — seleção de fornecedor externo dispensada (CFOP base 5.101).'
              : 'Mercadoria adquirida/recebida de parceiros — exige fornecedor externo (CFOP base 5.102).'}
          </p>
        </div>
      </div>

      <div className="flex w-full items-center gap-3 self-end sm:w-auto sm:self-center shrink-0">
        <div className="inline-flex w-full rounded-xl bg-slate-200/70 p-0.5 text-xs font-bold dark:bg-slate-800 sm:w-auto">
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`flex-1 whitespace-normal rounded-lg px-2 py-1.5 transition-all sm:flex-none sm:px-3 ${
              !isOwnProduction
                ? 'bg-white dark:bg-slate-900 text-blue-600 dark:text-blue-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Adquirido de Terceiros
          </button>
          <button
            type="button"
            onClick={() => onChange(true)}
            className={`flex-1 whitespace-normal rounded-lg px-2 py-1.5 transition-all sm:flex-none sm:px-3 ${
              isOwnProduction
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm font-black'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Fabricação Própria
          </button>
        </div>
      </div>
    </div>
  );
};
