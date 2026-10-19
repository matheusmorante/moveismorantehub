import { Drill } from '@/components/shared/DrillIcon';
import { getSettings } from '@/pages/utils/settingsService';
import { getNonStockOrigin } from '@/pages/utils/saleInventoryRules';

const getStockOriginLabel = (item: any) => {
  if (item.itemType === 'service') return null;
  const rawOrigin = String(
    getNonStockOrigin(item) ||
      item.stockOrigin ||
      item.stock_origin ||
      item.productKind ||
      item.product_kind ||
      (item.is_salvado ? 'salvado' : '')
  ).toLocaleLowerCase('pt-BR');
  const origin = rawOrigin.includes('salvad') ? 'salvado' : rawOrigin.includes('usad') ? 'usado' : null;
  return origin === 'salvado' ? 'Salvados' : origin === 'usado' ? 'Usados' : 'Convencional';
};

export const ItemsTable = ({ items }: { items: any[] }) => (
  <section>
    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
      <i className="bi bi-box-seam-fill" /> Lista de Itens
    </h3>
    <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm transition-colors duration-300">
      <table className="w-full min-w-[620px] text-left border-collapse">
        <thead>
          <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
            <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-16">
              Qtd
            </th>
            <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Produto
            </th>
            <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">
              Valor Unitário
            </th>
            <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">
              Total do Item
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
          {items?.map((item: any, idx: number) => {
            const stockOriginLabel = getStockOriginLabel(item);
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
              <tr
                key={idx}
                className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors"
              >
                <td className="px-4 sm:px-6 py-4 text-xs font-black text-slate-800 dark:text-slate-200 align-top">
                  <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                    {qty}x
                  </span>
                </td>
                <td className="px-4 sm:px-6 py-4 flex flex-col gap-1 items-start align-top">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      {item.description}
                    </span>
                  </div>
                  {item.variationLabel && (
                    <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">
                      {item.variationLabel}
                    </span>
                  )}
                  <div className="flex flex-wrap gap-2 items-center mt-1">
                    {stockOriginLabel && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800">
                        {stockOriginLabel}
                      </span>
                    )}
                    {item.isAssistanceItem && (
                      <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                        Peça sob Assistência
                        {item.originalOrderId && ` (#${item.originalOrderId.slice(-5)})`}
                      </span>
                    )}
                    {item.handlingType &&
                      (() => {
                        const settings = getSettings();
                        const allOptions = [
                          ...(settings?.deliveryHandlingOptions || []),
                          ...(settings?.pickupHandlingOptions || []),
                        ];
                        const hLower = item.handlingType.toLowerCase();
                        const matchedOpt = allOptions.find(
                          (o) => (o.label || '').toLowerCase().trim() === hLower.trim()
                        );
                        const isOutside =
                          matchedOpt?.isAssemblyOutside ||
                          hLower.includes('fora') ||
                          hLower.includes('no local da entrega') ||
                          hLower.includes('na entrega');
                        const isDepot =
                          (matchedOpt?.includeInAssemblySchedule && !isOutside) ||
                          hLower.includes('deposito') ||
                          hLower.includes('depósito') ||
                          hLower.includes('para retirada');
                        const isAssembly = isOutside || isDepot || hLower.includes('montagem');

                        let badgeClasses =
                          'bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 border-blue-100/50 dark:border-blue-900/30';
                        if (isOutside) {
                          badgeClasses = 'bg-red-600 text-white border-red-700 shadow-2xs';
                        } else if (isDepot) {
                          badgeClasses = 'bg-amber-500 text-white border-amber-600 shadow-2xs';
                        }

                        return (
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border flex items-center gap-1.5 ${badgeClasses}`}
                            >
                              {isAssembly ? (
                                <Drill
                                  size={11}
                                  className={
                                    isOutside || isDepot ? 'text-white fill-white' : 'text-blue-500'
                                  }
                                />
                              ) : (
                                <i
                                  className={`bi bi-box-seam ${isOutside || isDepot ? 'text-white' : 'text-blue-500'} text-[10px]`}
                                />
                              )}
                              {item.handlingType}
                            </span>
                          </div>
                        );
                      })()}
                  </div>
                </td>

                <td className="px-4 sm:px-6 py-4 text-right align-top">
                  {hasDiscount ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] line-through text-slate-400 dark:text-slate-500">
                        {unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
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
                </td>

                <td className="px-4 sm:px-6 py-4 text-right align-top">
                  {hasDiscount ? (
                    <div className="flex flex-col items-end">
                      <span className="text-[11px] line-through text-slate-400 dark:text-slate-500">
                        {grossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                      <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                        {netTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </span>
                    </div>
                  ) : (
                    <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                      {grossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  </section>
);
