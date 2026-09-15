import React from 'react';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';

interface Props {
    readonly receipt: GoodsReceipt;
    readonly onClose: () => void;
}

export const ReceiptDetailsHeader: React.FC<Props> = ({ receipt, onClose }) => {
    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isEstornado = receipt.status === 'estornado';

    return (
        <header className="flex items-center justify-between border-b border-slate-100 bg-slate-900 px-6 py-5 text-white dark:border-slate-800 xl:px-8">
            <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-emerald-600/30 text-emerald-400 border border-emerald-500/30">
                    <i className="bi bi-box-seam text-lg" aria-hidden="true" />
                </div>
                <div>
                    <div className="flex items-center gap-2">
                        <h2 id="receipt-details-modal-title" className="text-lg font-black tracking-tight">
                            Recebimento #{formatGoodsReceiptCode(receipt)}
                        </h2>
                        {isDraft ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-400 border border-amber-500/30">
                                <i className="bi bi-clock-history text-xs" aria-hidden="true" /> Rascunho
                            </span>
                        ) : isEstornado ? (
                            <span className="inline-flex items-center gap-1 rounded-full bg-red-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-red-400 border border-red-500/30">
                                <i className="bi bi-arrow-counterclockwise text-xs" aria-hidden="true" /> Estornado
                            </span>
                        ) : (
                            <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[10px] font-black uppercase text-emerald-400 border border-emerald-500/30">
                                <i className="bi bi-check-circle-fill text-xs" aria-hidden="true" /> Recebido
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-slate-400">Detalhes completos da movimentação de entrada</p>
                </div>
            </div>

            <button
                type="button"
                onClick={onClose}
                aria-label="Fechar"
                className="rounded-2xl p-2.5 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
            >
                <i className="bi bi-x-lg text-lg" aria-hidden="true" />
            </button>
        </header>
    );
};
