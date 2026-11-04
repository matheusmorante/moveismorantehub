import { ChevronDown, PackageCheck } from 'lucide-react';
import {
  resolveOrderItemHandling,
  resolveOrderItemTypeLabel,
  summarizeOrderItemHandling,
} from '@/../../shared-utils/orderItemPresentation';

export const ItemsTable = ({ items }: { items: any[] }) => (
  <section>
    <h3 className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
      <i className="bi bi-box-seam-fill" /> Lista de Itens
    </h3>
    <div className="overflow-hidden rounded-3xl border border-slate-100 bg-white shadow-sm transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900">
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {items?.map((item: any, idx: number) => {
          const productTypeLabel = resolveOrderItemTypeLabel(item);
          const handlingType = resolveOrderItemHandling(item);
          const handlingSummary = summarizeOrderItemHandling(handlingType);
          const hasHandlingDetails = handlingType !== handlingSummary;
          const qty = Number(item.quantity) || 1;
          const unitPrice = Number(item.unitPrice) || 0;
          const rawDiscount = Number(item.unitDiscount) || 0;
          const isPercentage = item.discountType === 'percentage';
          const fixedUnitDiscount = isPercentage ? (unitPrice * rawDiscount) / 100 : rawDiscount;
          const hasDiscount = fixedUnitDiscount > 0;
          const unitPriceWithDiscount = Math.max(0, unitPrice - fixedUnitDiscount);
          const grossTotal = unitPrice * qty;
          const netTotal = unitPriceWithDiscount * qty;

          return (
            <article
              key={idx}
              className="grid min-w-0 grid-cols-1 gap-3 px-4 py-4 transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/30 sm:px-6 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)] md:items-start md:gap-6"
            >
              <div className="min-w-0">
                <div className="flex min-w-0 items-start gap-2">
                  <span className="shrink-0 text-xs font-black text-slate-700 dark:text-slate-300">
                    {qty}×
                  </span>
                  <p className="min-w-0 break-words text-sm font-bold text-slate-800 dark:text-slate-200">
                    {item.description}
                  </p>
                </div>
                {item.variationLabel && (
                  <p className="ml-7 mt-1 break-words text-[10px] font-bold text-slate-400 dark:text-slate-500">
                    {item.variationLabel}
                  </p>
                )}
                <div className="mt-2 flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
                  {productTypeLabel && (
                    <span className="inline-flex max-w-full items-center rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                      {productTypeLabel}
                    </span>
                  )}
                  {item.isAssistanceItem && (
                    <span className="rounded-lg border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-indigo-600 dark:border-indigo-900/30 dark:bg-indigo-900/20 dark:text-indigo-400">
                      Peça sob Assistência
                      {item.originalOrderId && ' (#' + item.originalOrderId.slice(-5) + ')'}
                    </span>
                  )}
                  {handlingType && (
                    hasHandlingDetails ? (
                      <details className="group min-w-0 max-w-full">
                        <summary className="flex max-w-full cursor-pointer list-none items-center gap-1.5 text-xs text-slate-500 marker:hidden [&::-webkit-details-marker]:hidden dark:text-slate-400">
                          <PackageCheck
                            aria-hidden="true"
                            size={13}
                            className="shrink-0 text-blue-500 dark:text-blue-400"
                          />
                          <span className="break-words">{handlingSummary}</span>
                          <ChevronDown
                            aria-hidden="true"
                            size={13}
                            className="shrink-0 text-slate-400 transition-transform group-open:rotate-180"
                          />
                        </summary>
                        <p className="mt-1 break-words text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                          {handlingType}
                        </p>
                      </details>
                    ) : (
                      <span className="flex min-w-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <PackageCheck
                          aria-hidden="true"
                          size={13}
                          className="shrink-0 text-blue-500 dark:text-blue-400"
                        />
                        <span className="break-words">{handlingSummary}</span>
                      </span>
                    )
                  )}
                </div>
              </div>

              <div className="grid min-w-0 grid-cols-2 gap-3 md:gap-5">
                <div className="min-w-0 text-left md:text-right">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Unitário
                  </p>
                  {hasDiscount ? (
                    <div className="flex min-w-0 flex-col md:items-end">
                      <span className="text-[11px] line-through text-slate-400 dark:text-slate-500">
                        {unitPrice.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {unitPriceWithDiscount.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      {unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>

                <div className="min-w-0 text-right">
                  <p className="mb-1 text-[9px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                    Total
                  </p>
                  {hasDiscount ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] line-through text-slate-400 dark:text-slate-500">
                        {grossTotal.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {netTotal.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {grossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  </section>
);
