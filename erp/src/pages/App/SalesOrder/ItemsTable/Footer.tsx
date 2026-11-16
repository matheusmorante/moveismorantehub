import React from 'react';
import { Item, ItemsSummary } from '../../../types/items.type';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';

interface Props {
  summary: ItemsSummary;
  items?: Item[];
  isMobile?: boolean;
  isBudget?: boolean;
  hideHandling?: boolean;
  compactDesktop?: boolean;
  physicalProductQuantity?: number;
}

const Footer = ({
  summary,
  isMobile,
  isBudget,
  hideHandling,
  compactDesktop,
  physicalProductQuantity = 0,
}: Props) => {
  const hasDiscounts = (summary.totalFixedDiscount || 0) > 0;

  if (isMobile) {
    return (
      <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-3 text-xs">
        {/* Detalhamento compacto dos subtotais */}
        <div className="flex flex-wrap items-end gap-x-4 gap-y-3 text-slate-500 dark:text-slate-400 font-bold text-[11px]">
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">
              Produtos
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-extrabold">
              {physicalProductQuantity.toLocaleString('pt-BR')}
            </span>
          </div>
          <div className="flex flex-col items-start gap-0.5">
            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">
              Subtotal
            </span>
            <span className="text-slate-700 dark:text-slate-300 font-extrabold">
              <CurrencyDisplay value={summary.itemsSubtotal} />
            </span>
          </div>

          {hasDiscounts && (
            <div className="flex flex-col items-start gap-0.5 text-rose-500">
              <span className="uppercase tracking-wider text-[9px] font-black">Descontos</span>
              <span className="font-extrabold">
                -<CurrencyDisplay value={summary.totalFixedDiscount} />
              </span>
            </div>
          )}
        </div>

        {/* Total consolidado dos itens */}
        <div className="ml-auto flex flex-col items-end gap-0.5">
          <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">
            Total
          </span>
          <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 leading-none">
            <CurrencyDisplay value={summary.itemsTotalValue} />
          </span>
        </div>
      </div>
    );
  }

  const colSpanValue = compactDesktop ? 5 : isBudget || hideHandling ? 5 : 6;

  return (
    <tfoot className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800">
      <tr>
        <td colSpan={colSpanValue} className="px-4 py-2.5">
          <div className="flex flex-wrap items-end gap-x-5 gap-y-3 text-xs font-bold text-slate-500 dark:text-slate-400">
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">
                Produtos
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                {physicalProductQuantity.toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="flex flex-col items-start gap-0.5">
              <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">
                Subtotal
              </span>
              <span className="text-slate-700 dark:text-slate-300">
                <CurrencyDisplay value={summary.itemsSubtotal} />
              </span>
            </div>

            {hasDiscounts && (
              <div className="flex flex-col items-start gap-0.5 text-rose-500">
                <span className="uppercase tracking-wider text-[9px] font-black">Descontos</span>
                <span>
                  -<CurrencyDisplay value={summary.totalFixedDiscount} />
                </span>
              </div>
            )}
          </div>
        </td>
        <td colSpan={2} className="px-4 py-2.5 text-right">
          <div className="flex flex-col items-end gap-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Total
            </span>
            <span className="text-base font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
              <CurrencyDisplay value={summary.itemsTotalValue} />
            </span>
          </div>
        </td>
        <td></td>
      </tr>
    </tfoot>
  );
};

export default Footer;
