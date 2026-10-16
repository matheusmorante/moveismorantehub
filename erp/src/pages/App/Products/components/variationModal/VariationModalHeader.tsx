import React from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type { LegibilityStatus } from '../../domain/productLegibilityRules';

interface VariationModalHeaderProps {
  readonly variation: Variation | null;
  readonly parentProduct: Product;
  readonly loading: boolean;
  readonly isStockistOnly: boolean;
  readonly erpStatus: LegibilityStatus;
  readonly ecomStatus: LegibilityStatus;
  readonly onClose: () => void;
}

export const VariationModalHeader: React.FC<VariationModalHeaderProps> = ({
  variation,
  parentProduct,
  loading,
  isStockistOnly,
  erpStatus,
  ecomStatus,
  onClose,
}) => {
  return (
    <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-50 dark:border-slate-800/50 flex flex-col gap-2 sm:gap-4 shrink-0 bg-white dark:bg-slate-900">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2
            id="variation-form-modal-title"
            className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-2 flex-wrap"
          >
            <span className="shrink-0">
              {variation ? 'Editar Variação' : 'Adicionar Variação'}
            </span>
            <span className="text-slate-400 text-xs font-normal truncate max-w-[200px] sm:max-w-none">
              | {parentProduct.name || parentProduct.description || 'Produto Pai'}
            </span>
          </h2>
          <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-0.5">
            Configure os dados específicos desta variação.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          disabled={loading}
          aria-label="Fechar"
          className="shrink-0 w-9 h-9 sm:w-10 sm:h-10 flex items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-all cursor-pointer"
        >
          <i className="bi bi-x-lg text-base sm:text-lg" aria-hidden="true" />
        </button>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {/* Pílula de status ERP */}
        <div className="relative group cursor-help">
          <div
            className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
              erpStatus.isLegible
                ? 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-955/20 dark:text-blue-400 dark:border-blue-900/30'
                : 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-955/20 dark:text-amber-400 dark:border-amber-900/30'
            }`}
          >
            <span>ERP: {erpStatus.isLegible ? 'Ativo' : 'Pendente'}</span>
          </div>

          <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
              Requisitos do ERP (Variação / Ativação)
            </p>
            <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
              <li className="flex items-center gap-2 p-1 rounded-xl">
                <i
                  className={`bi ${erpStatus.checks.description ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  aria-hidden="true"
                />
                <span
                  className={
                    erpStatus.checks.description
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 font-bold'
                  }
                >
                  Nome / Identificação Válida
                </span>
              </li>
              <li className="flex items-center gap-2 p-1 rounded-xl">
                <i
                  className={`bi ${erpStatus.checks.unitPrice ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  aria-hidden="true"
                />
                <span
                  className={
                    erpStatus.checks.unitPrice
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 font-bold'
                  }
                >
                  Preço de Venda &gt; R$ 0
                </span>
              </li>
              <li className="flex items-center gap-2 p-1 rounded-xl">
                <i
                  className={`bi ${erpStatus.checks.categories ? 'bi-check-circle-fill text-blue-500' : 'bi-x-circle-fill text-amber-500'}`}
                  aria-hidden="true"
                />
                <span
                  className={
                    erpStatus.checks.categories
                      ? 'text-blue-700 dark:text-blue-400'
                      : 'text-slate-500 font-bold'
                  }
                >
                  Categoria (Herdada do Pai)
                </span>
              </li>
              <li className="flex items-center gap-2 p-1 rounded-xl">
                <i className="bi bi-check-circle-fill text-blue-500" aria-hidden="true" />
                <span className="text-blue-700 dark:text-blue-400">
                  Fornecedor (Herdado do Pai)
                </span>
              </li>
            </ul>
          </div>
        </div>

        {/* Pílula de status Catálogo (Estoquista não edita fotos) */}
        {!isStockistOnly && (
          <div className="relative group cursor-help">
            <div
              className={`flex items-center gap-1.5 h-6 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                parentProduct.status === 'published'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-955/20 dark:text-emerald-400 dark:border-emerald-900/30'
                  : 'bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700'
              }`}
            >
              <span>
                Catálogo: {parentProduct.status === 'published' ? 'Publicado' : 'Ocultado'}
              </span>
            </div>

            <div className="absolute top-full left-0 mt-2 w-80 bg-white dark:bg-slate-955 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50 text-left">
              <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
                Requisitos para o Catálogo
              </p>
              <ul className="space-y-1 text-xs font-bold text-slate-600 dark:text-slate-300 mt-2">
                <li className="flex items-center gap-2 p-1 rounded-xl">
                  <i
                    className={`bi ${ecomStatus.checks.unitPrice ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span
                    className={
                      ecomStatus.checks.unitPrice
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 font-bold'
                    }
                  >
                    Preço de Venda &gt; R$ 0
                  </span>
                </li>
                <li className="flex items-center gap-2 p-1 rounded-xl">
                  <i
                    className={`bi ${ecomStatus.checks.images ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-400'}`}
                    aria-hidden="true"
                  />
                  <span
                    className={
                      ecomStatus.checks.images
                        ? 'text-emerald-700 dark:text-emerald-400'
                        : 'text-slate-500 font-bold'
                    }
                  >
                    Fotos vinculadas (Pai ou Variação)
                  </span>
                </li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
