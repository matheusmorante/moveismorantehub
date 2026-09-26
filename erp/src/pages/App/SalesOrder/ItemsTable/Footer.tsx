import React from "react";
import { Item, ItemsSummary } from "../../../types/items.type";
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import { calcItemTotalValue } from "../../../utils/calculations";

interface Props {
    summary: ItemsSummary;
    items?: Item[];
    isMobile?: boolean;
    isBudget?: boolean;
}

const Footer = ({ summary, items = [], isMobile, isBudget }: Props) => {
    // Apuração dos subtotais segregados por tipo
    const productsSubtotal = items
        .filter(i => i.itemType !== 'service')
        .reduce((acc, i) => acc + calcItemTotalValue(i), 0);

    const servicesSubtotal = items
        .filter(i => i.itemType === 'service')
        .reduce((acc, i) => acc + calcItemTotalValue(i), 0);

    const hasServices = servicesSubtotal > 0;
    const hasDiscounts = (summary.totalFixedDiscount || 0) > 0;

    if (isMobile) {
        return (
            <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs">
                {/* Detalhamento compacto dos subtotais */}
                <div className="flex items-center gap-3 sm:gap-4 flex-wrap text-slate-500 dark:text-slate-400 font-bold text-[11px]">
                    <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">Produtos:</span>
                        <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                            <CurrencyDisplay value={productsSubtotal} />
                        </span>
                    </div>

                    {hasServices && (
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">Serviços:</span>
                            <span className="text-slate-700 dark:text-slate-300 font-extrabold">
                                <CurrencyDisplay value={servicesSubtotal} />
                            </span>
                        </div>
                    )}

                    {hasDiscounts && (
                        <div className="flex items-center gap-1.5 text-rose-500">
                            <span className="uppercase tracking-wider text-[9px] font-black">Descontos:</span>
                            <span className="font-extrabold">
                                -<CurrencyDisplay value={summary.totalFixedDiscount} />
                            </span>
                        </div>
                    )}
                </div>

                {/* Total consolidado dos itens */}
                <div className="flex items-center gap-2 ml-auto">
                    <span className="text-[10px] font-black uppercase tracking-wider text-slate-400">Total Itens:</span>
                    <span className="text-sm sm:text-base font-black text-blue-600 dark:text-blue-400 leading-none">
                        <CurrencyDisplay value={summary.itemsTotalValue} />
                    </span>
                </div>
            </div>
        );
    }

    const colSpanValue = isBudget ? 5 : 6;

    return (
        <tfoot className="bg-slate-50/50 dark:bg-slate-800/30 border-t border-slate-200/80 dark:border-slate-800">
            <tr>
                <td colSpan={colSpanValue} className="px-4 py-2.5">
                    <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">Produtos:</span>
                            <span className="text-slate-700 dark:text-slate-300">
                                <CurrencyDisplay value={productsSubtotal} />
                            </span>
                        </div>

                        {hasServices && (
                            <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black">Serviços:</span>
                                <span className="text-slate-700 dark:text-slate-300">
                                    <CurrencyDisplay value={servicesSubtotal} />
                                </span>
                            </div>
                        )}

                        {hasDiscounts && (
                            <div className="flex items-center gap-1.5 text-rose-500">
                                <span className="uppercase tracking-wider text-[9px] font-black">Descontos:</span>
                                <span>
                                    -<CurrencyDisplay value={summary.totalFixedDiscount} />
                                </span>
                            </div>
                        )}
                    </div>
                </td>
                <td className="px-3 py-2.5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
                    Total Itens:
                </td>
                <td className="px-4 py-2.5 text-right">
                    <div className="text-base font-black text-blue-600 dark:text-blue-400 whitespace-nowrap">
                        <CurrencyDisplay value={summary.itemsTotalValue} />
                    </div>
                </td>
                <td></td>
            </tr>
        </tfoot>
    );
};

export default Footer;
