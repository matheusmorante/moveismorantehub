import React from 'react';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { formatCurrency } from '@/pages/utils/formatters';

interface ExtendedPurchaseItem extends PurchaseItem {
    readonly code?: string;
    readonly otherExpensesFiscalUnit?: number;
    readonly otherExpensesNonFiscalUnit?: number;
    readonly freightFiscalUnit?: number;
    readonly freightNonFiscalUnit?: number;
    readonly freightUnit?: number;
}

interface Props {
    readonly items: GoodsReceipt['items'];
}

export const ReceiptItemsTable: React.FC<Props> = ({ items }) => {
    return (
        <div className="space-y-3">
            <h3 className="text-xs font-black uppercase tracking-widest text-slate-400">
                Itens Recebidos ({items.length})
            </h3>
            <div className="overflow-hidden rounded-2xl border border-slate-100 dark:border-slate-800">
                <table className="w-full text-left text-xs">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-800/60 text-slate-400 font-black uppercase tracking-wider text-[9px]">
                            <th scope="col" className="px-4 py-3">Produto</th>
                            <th scope="col" className="px-3 py-3 text-center">Qtd. recebida</th>
                            <th scope="col" className="px-4 py-3 text-right">Custo unitário</th>
                            <th scope="col" className="px-4 py-3 text-right">Desconto</th>
                            <th scope="col" className="px-4 py-3 text-right">Frete</th>
                            <th scope="col" className="px-4 py-3 text-right">Outras despesas</th>
                            <th scope="col" className="px-4 py-3 text-right bg-emerald-50/40 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400">
                                Custo unitário final
                            </th>
                            <th scope="col" className="px-4 py-3 text-right text-slate-700 dark:text-slate-200">Total do item</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                        {items.map((rawItem, index) => {
                            const item = rawItem as ExtendedPurchaseItem;
                            const unitDiscount = item.discountUnit || 0;
                            const unitFreight = item.freightUnit
                                ?? ((item.freightFiscalUnit ?? 0) + (item.freightNonFiscalUnit ?? 0));
                            const unitOther = item.otherExpensesUnit
                                ?? (((item.otherExpensesFiscalUnit ?? 0) + (item.otherExpensesNonFiscalUnit ?? 0))
                                || (item.additionalCostUnit || 0));

                            return (
                                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30">
                                    <td className="px-4 py-3">
                                        <p className="font-bold text-slate-800 dark:text-slate-100">{item.description}</p>
                                        {item.code && <p className="text-[10px] text-slate-400 font-mono">Cód: {item.code}</p>}
                                    </td>
                                    <td className="px-3 py-3 text-center font-black text-slate-700 dark:text-slate-200">{item.quantity}</td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                        {formatCurrency(item.baseCost || item.unitCost)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-amber-600 dark:text-amber-400">
                                        {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                        {unitFreight > 0 ? formatCurrency(unitFreight) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium text-slate-600 dark:text-slate-400">
                                        {unitOther > 0 ? formatCurrency(unitOther) : '—'}
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50/30 dark:bg-emerald-950/15">
                                        {formatCurrency(item.unitCost)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-black text-slate-800 dark:text-slate-100">
                                        {formatCurrency(item.totalCost || item.quantity * item.unitCost)}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    );
};
