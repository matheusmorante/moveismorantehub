import React from 'react';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';

interface Props {
    readonly receipt: GoodsReceipt;
}

export const ReceiptDetailsSummary: React.FC<Props> = ({ receipt }) => {
    const rawKey = (receipt.fiscalKey || '').replace(/\D/g, '');
    const formattedFiscalKey = rawKey.length === 44 ? rawKey.match(/.{1,4}/g)?.join(' ') : receipt.fiscalKey;

    return (
        <div className="space-y-4">
            {/* Top Info Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800">
                <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor / Fábrica</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{receipt.supplierName}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Data do Recebimento</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToBRDate(receipt.receivedAt)}</span>
                </div>
                <div>
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Número da NF</span>
                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{receipt.invoiceNumber || 'Não informada'}</span>
                </div>
            </div>

            {/* Fiscal Key & Encargos */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="md:col-span-2 rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
                    <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Chave de Acesso (NF-e)</span>
                    {formattedFiscalKey ? (
                        <span className="font-mono text-xs font-bold text-emerald-600 dark:text-emerald-400 break-all select-all">
                            {formattedFiscalKey}
                        </span>
                    ) : (
                        <span className="text-xs text-slate-400 italic">Sem chave de acesso cadastrada</span>
                    )}
                </div>

                <div className="relative rounded-2xl border border-slate-100 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 shadow-sm flex items-center justify-around">
                    <span className="absolute top-2 right-2 text-[9px] font-black uppercase tracking-wider bg-slate-100 dark:bg-slate-800 text-slate-500 px-1.5 py-0.5 rounded">
                        Não fiscal
                    </span>
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Desconto</span>
                        <span className="text-sm font-black text-amber-600 dark:text-amber-400">
                            {receipt.nonFiscalDiscountValue && receipt.nonFiscalDiscountValue > 0
                                ? (receipt.nonFiscalDiscountMode === 'percent'
                                    ? `${receipt.nonFiscalDiscountValue}%`
                                    : formatCurrency(receipt.nonFiscalDiscountValue))
                                : '—'}
                        </span>
                    </div>
                    <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                    <div>
                        <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Frete</span>
                        <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                            {receipt.nonFiscalFreightValue && receipt.nonFiscalFreightValue > 0
                                ? (receipt.nonFiscalFreightMode === 'percent'
                                    ? `${receipt.nonFiscalFreightValue}%`
                                    : formatCurrency(receipt.nonFiscalFreightValue))
                                : (receipt.freightPercent && receipt.freightPercent > 0 ? `${receipt.freightPercent}% (IPI/fiscal)` : '—')}
                        </span>
                    </div>
                    {(receipt.nonFiscalOtherExpensesValue && receipt.nonFiscalOtherExpensesValue > 0) ? (
                        <>
                            <div className="h-8 w-px bg-slate-100 dark:bg-slate-800" />
                            <div>
                                <span className="block text-[10px] font-black uppercase tracking-widest text-slate-400">Outras Desp.</span>
                                <span className="text-sm font-black text-slate-700 dark:text-slate-200">
                                    {receipt.nonFiscalOtherExpensesMode === 'percent'
                                        ? `${receipt.nonFiscalOtherExpensesValue}%`
                                        : formatCurrency(receipt.nonFiscalOtherExpensesValue)}
                                </span>
                            </div>
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    );
};
