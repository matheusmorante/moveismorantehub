import React from 'react';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatCurrency } from '@/pages/utils/formatters';

interface Props {
    readonly receipt: GoodsReceipt;
    readonly onClose: () => void;
}

export const ReceiptDetailsFooter: React.FC<Props> = ({ receipt, onClose }) => {

    return (
        <footer className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-955/40 xl:px-8">
            <div>
                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Total do Recebimento</span>
                <span className="text-xl font-black text-emerald-600 dark:text-emerald-400">
                    {formatCurrency(receipt.totalValue)}
                </span>
            </div>

            <div className="flex items-center gap-3">
                <button
                    type="button"
                    onClick={onClose}
                    className="rounded-xl bg-slate-200 dark:bg-slate-800 px-6 py-2.5 text-xs font-black uppercase text-slate-700 dark:text-slate-200 hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                    Fechar
                </button>
            </div>
        </footer>
    );
};
