import React, { useState, useCallback } from 'react';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';
import { ReceiptMovementBadge } from './ReceiptMovementBadge';
import { ReceiptsActionsMenu } from './ReceiptsActionsMenu';

export interface ReceiptCardProps {
    readonly receipt: GoodsReceipt;
    readonly onClick: (receipt: GoodsReceipt) => void;
    readonly onEdit?: (receipt: GoodsReceipt) => void;
    readonly onCopyReceipt?: (receipt: GoodsReceipt) => void;
    readonly onDelete?: (e: React.MouseEvent, id: string) => void;
    readonly onReverse?: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
    readonly onUnreverse?: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
    readonly onViewDetails?: (receipt: GoodsReceipt) => void;
}

/**
 * Card para listagem de recebimentos em visualização mobile / grid responsiva.
 */
export const ReceiptCard: React.FC<ReceiptCardProps> = ({
    receipt,
    onClick,
    onEdit,
    onCopyReceipt,
    onDelete,
    onReverse,
    onUnreverse,
    onViewDetails
}) => {
    const [showMenu, setShowMenu] = useState(false);
    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isEstornado = receipt.status === 'estornado';
    const hasNF = Boolean(receipt.fiscalKey && receipt.fiscalKey.replace(/\D/g, '').length === 44);

    const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick(receipt);
        }
    }, [onClick, receipt]);

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={() => onClick(receipt)}
            onKeyDown={handleKeyDown}
            aria-label={`Recebimento #${formatGoodsReceiptCode(receipt)} de ${receipt.supplierName}`}
            className="group relative flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900/50 cursor-pointer space-y-4 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
            {/* Top Bar: ID + Status Badge */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        #{formatGoodsReceiptCode(receipt)}
                    </span>
                    <ReceiptMovementBadge receipt={receipt} />
                    <span className="rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:text-emerald-400">
                        {receipt.items.length} item(ns)
                    </span>
                </div>

                {isDraft ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-amber-200 bg-amber-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-amber-600 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-400">
                        <i className="bi bi-clock-history text-xs" /> Rascunho
                    </span>
                ) : isEstornado ? (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-red-600 dark:border-red-900/50 dark:bg-red-950/40 dark:text-red-400">
                        <i className="bi bi-arrow-counterclockwise text-xs" /> Estornado
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400">
                        <i className="bi bi-check-circle-fill text-xs" /> Recebido
                    </span>
                )}
            </div>

            {/* Middle Section: Fornecedor e detalhes */}
            <div className="space-y-2">
                <h3 className="text-base font-black text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors line-clamp-1">
                    {receipt.supplierName}
                </h3>

                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                    <div className="flex items-center gap-1.5">
                        <i className="bi bi-calendar3 text-emerald-600 text-xs" />
                        <span>{formatToBRDate(receipt.receivedAt)}</span>
                    </div>

                    {hasNF ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
                            <i className="bi bi-file-earmark-check-fill text-xs" /> Com NF {receipt.invoiceNumber ? `(${receipt.invoiceNumber})` : ''}
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
                            <i className="bi bi-file-earmark-x text-xs" /> Sem NF
                        </span>
                    )}
                </div>
            </div>

            {/* Footer Bar: Total e Ações (3 pontinhos) */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-3">
                <div>
                    <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Total Recebido</span>
                    <span className="text-base font-black text-emerald-600 dark:text-emerald-400">
                        {formatCurrency(receipt.totalValue)}
                    </span>
                </div>

                <div className="relative">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            setShowMenu((prev) => !prev);
                        }}
                        aria-label="Abrir menu de ações do recebimento"
                        aria-expanded={showMenu}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        title="Ações do recebimento"
                    >
                        <i className="bi bi-three-dots-vertical text-base" />
                    </button>

                    <ReceiptsActionsMenu
                        receipt={receipt}
                        isOpen={showMenu}
                        onClose={() => setShowMenu(false)}
                        onOpenDetails={onViewDetails || onClick}
                        onOpenEdit={onEdit}
                        onCopyReceipt={onCopyReceipt}
                        onReverseRequest={onReverse}
                        onUnreverseRequest={onUnreverse}
                        onDelete={onDelete}
                    />
                </div>
            </div>
        </div>
    );
};

export default ReceiptCard;
