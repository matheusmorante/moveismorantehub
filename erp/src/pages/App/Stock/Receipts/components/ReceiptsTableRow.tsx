import React from 'react';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';
import { ReceiptMovementBadge } from './ReceiptMovementBadge';
import { ReceiptsActionsMenu } from './ReceiptsActionsMenu';

export interface ReceiptsTableRowProps {
    readonly receipt: GoodsReceipt;
    readonly isMenuOpen: boolean;
    readonly onToggleMenu: (id: string | null) => void;
    readonly onRowClick: (receipt: GoodsReceipt) => void;
    readonly onOpenDetails: (receipt: GoodsReceipt) => void;
    readonly onOpenEdit: (receipt: GoodsReceipt) => void;
    readonly onCopyReceipt: (receipt: GoodsReceipt) => void;
    readonly onReverseRequest: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
    readonly onUnreverseRequest?: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
    readonly onDelete: (e: React.MouseEvent, id: string) => void;
}

/**
 * Linha individual da tabela de recebimentos de estoque (Desktop).
 * Responsabilidade única: renderização e interatividade de uma única linha.
 */
export const ReceiptsTableRow: React.FC<ReceiptsTableRowProps> = ({
    receipt,
    isMenuOpen,
    onToggleMenu,
    onRowClick,
    onOpenDetails,
    onOpenEdit,
    onCopyReceipt,
    onReverseRequest,
    onUnreverseRequest,
    onDelete,
}) => {
    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isEstornado = receipt.status === 'estornado';
    const hasNF = Boolean(receipt.fiscalKey && receipt.fiscalKey.replace(/\D/g, '').length === 44);

    return (
        <tr
            onClick={() => onRowClick(receipt)}
            className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors"
        >
            <td className="px-6 py-4">
                <p className="text-xs font-mono font-bold text-slate-500">#{formatGoodsReceiptCode(receipt)}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">
                    {receipt.items.length} itens recebidos
                </p>
            </td>

            <td className="px-6 py-4">
                <div className="flex items-center gap-2">
                    {isDraft ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-amber-50 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 rounded-md border border-amber-200 dark:border-amber-900/40">
                            <i className="bi bi-clock-history text-[11px]" /> Rascunho
                        </span>
                    ) : isEstornado ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400 rounded-md border border-red-200 dark:border-red-900/50">
                            <i className="bi bi-arrow-counterclockwise text-[11px]" /> Estornado
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                            <i className="bi bi-check-circle-fill text-[11px]" /> Recebido
                        </span>
                    )}
                    <ReceiptMovementBadge receipt={receipt} />
                </div>
            </td>

            <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">
                {receipt.supplierName}
            </td>

            <td className="px-6 py-4 text-sm text-slate-500">
                {formatToBRDate(receipt.receivedAt)}
            </td>

            <td className="px-6 py-4">
                {hasNF ? (
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-900/40">
                        <i className="bi bi-file-earmark-check-fill text-[11px]" /> Com NF {receipt.invoiceNumber ? `(${receipt.invoiceNumber})` : ''}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider bg-slate-100 text-slate-400 dark:bg-slate-800/60 dark:text-slate-500 rounded-md">
                        <i className="bi bi-file-earmark-x text-[11px]" /> Sem NF
                    </span>
                )}
            </td>

            <td className="px-6 py-4 text-right text-sm font-black text-slate-700 dark:text-slate-200">
                {formatCurrency(receipt.totalValue)}
            </td>

            <td className="px-6 py-4 text-right">
                <div className="relative inline-block text-left">
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            onToggleMenu(isMenuOpen ? null : receipt.id);
                        }}
                        aria-label="Abrir menu de ações"
                        className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors cursor-pointer"
                        title="Ações"
                    >
                        <i className="bi bi-three-dots-vertical text-base" />
                    </button>

                    <ReceiptsActionsMenu
                        receipt={receipt}
                        isOpen={isMenuOpen}
                        onClose={() => onToggleMenu(null)}
                        onOpenDetails={onOpenDetails}
                        onOpenEdit={onOpenEdit}
                        onCopyReceipt={onCopyReceipt}
                        onReverseRequest={onReverseRequest}
                        onUnreverseRequest={onUnreverseRequest}
                        onDelete={onDelete}
                    />
                </div>
            </td>
        </tr>
    );
};

export default ReceiptsTableRow;
