import React from 'react';

interface ProductTypeModeBannerProps {
  readonly isMultiVariationMode: boolean;
  readonly simpleModeBlocked: boolean;
  readonly onSelectProductMode: (nextMode: boolean) => void;
}

/**
 * Toggle bar for switching between single-SKU (`Simples`) and multi-SKU (`Com variações`) modes,
 * displaying an accessible tooltip when multiple active variations lock the mode.
 */
const ProductTypeModeBanner: React.FC<ProductTypeModeBannerProps> = ({
  isMultiVariationMode,
  simpleModeBlocked,
  onSelectProductMode,
}) => {
  const [showSimpleModeTooltip, setShowSimpleModeTooltip] = React.useState(false);
  const simpleModeTooltipId = React.useId();

  const handleSelect = (nextMode: boolean) => {
    if (!nextMode && isMultiVariationMode && simpleModeBlocked) {
      setShowSimpleModeTooltip(true);
      return;
    }
    setShowSimpleModeTooltip(false);
    onSelectProductMode(nextMode);
  };

  return (
    <section
      id="product-type-section"
      aria-labelledby="product-type-heading"
      className="md:col-span-2 flex flex-col items-start justify-between gap-4 rounded-2xl border border-slate-200/80 bg-slate-50/80 p-4 transition-colors dark:border-slate-800 dark:bg-slate-900/60 sm:flex-row sm:items-center"
    >
      <div className="flex items-center gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isMultiVariationMode
              ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
              : 'bg-blue-500/10 text-blue-600 dark:text-blue-400'
          }`}
          aria-hidden="true"
        >
          <i className={`bi ${isMultiVariationMode ? 'bi-layers-fill' : 'bi-box-seam'} text-xl`} />
        </div>
        <div>
          <h3 id="product-type-heading" className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
            Tipo do produto
          </h3>
        </div>
      </div>

      <div className="relative w-full shrink-0 sm:w-auto" onMouseLeave={() => setShowSimpleModeTooltip(false)}>
        <div
          role="group"
          aria-labelledby="product-type-heading"
          className="inline-flex w-full rounded-xl bg-slate-200/70 p-0.5 text-xs font-bold dark:bg-slate-800 sm:w-auto"
        >
          <button
            type="button"
            aria-pressed={!isMultiVariationMode}
            aria-disabled={simpleModeBlocked}
            aria-describedby={showSimpleModeTooltip && simpleModeBlocked ? simpleModeTooltipId : undefined}
            onFocus={() => {
              if (simpleModeBlocked) setShowSimpleModeTooltip(true);
            }}
            onBlur={() => setShowSimpleModeTooltip(false)}
            onClick={() => handleSelect(false)}
            className={`flex-1 whitespace-normal rounded-lg px-2 py-1.5 transition-all sm:flex-none sm:px-3 ${
              !isMultiVariationMode
                ? 'bg-white font-black text-blue-600 shadow-sm dark:bg-slate-900 dark:text-blue-400'
                : simpleModeBlocked
                  ? 'cursor-not-allowed text-slate-400 opacity-60 dark:text-slate-500'
                  : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Simples
          </button>

          <button
            type="button"
            aria-pressed={isMultiVariationMode}
            onClick={() => handleSelect(true)}
            className={`flex-1 whitespace-normal rounded-lg px-2 py-1.5 transition-all sm:flex-none sm:px-3 ${
              isMultiVariationMode
                ? 'bg-white font-black text-emerald-600 shadow-sm dark:bg-slate-900 dark:text-emerald-400'
                : 'text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            Com variações
          </button>
        </div>
        {showSimpleModeTooltip && isMultiVariationMode && simpleModeBlocked && (
          <span
            id={simpleModeTooltipId}
            role="tooltip"
            className="absolute left-2 top-full z-20 mt-2 max-w-72 rounded-xl bg-slate-900 px-3 py-2 text-[11px] font-semibold text-white shadow-lg dark:bg-slate-700"
          >
            Este produto se tornará simples automaticamente quando restar apenas 1 variação.
          </span>
        )}
      </div>
    </section>
  );
};

export default ProductTypeModeBanner;
