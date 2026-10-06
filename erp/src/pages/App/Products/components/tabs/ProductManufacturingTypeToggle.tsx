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
            <span
              data-testid="origin-status-badge"
              className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                isOwnProduction
                  ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-955/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-800'
                  : 'bg-blue-100 text-blue-800 dark:bg-blue-955/60 dark:text-blue-300 border border-blue-300 dark:border-blue-800'
              }`}
            >
              {isOwnProduction
                ? 'Produção do Próprio Estabelecimento (Fabricação Própria)'
                : 'Adquirido ou Recebido de Terceiros (Padrão)'}
            </span>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
            {isOwnProduction
              ? 'Produção própria da empresa — seleção de fornecedor externo dispensada (CFOP base 5.101).'
              : 'Mercadoria adquirida/recebida de parceiros — exige fornecedor externo (CFOP base 5.102).'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
        {/* Botão de Ligar / Desligar (Switch Toggle) */}
        <button
          type="button"
          role="switch"
          aria-checked={isOwnProduction}
          aria-label="Alternar entre adquirido de terceiros e fabricação própria"
          onClick={() => onChange(!isOwnProduction)}
          className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-blue-500/20 ${
            isOwnProduction ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
          }`}
        >
          <span
            aria-hidden="true"
            className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
              isOwnProduction ? 'translate-x-7' : 'translate-x-0'
            }`}
          />
        </button>

        {/* Botões Segmentados Alternativos para Seleção Direta */}
        <div className="hidden sm:inline-flex rounded-xl bg-slate-200/70 dark:bg-slate-800 p-0.5 text-xs font-bold">
          <button
            type="button"
            onClick={() => onChange(false)}
            className={`px-3 py-1.5 rounded-lg transition-all ${
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
            className={`px-3 py-1.5 rounded-lg transition-all ${
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
