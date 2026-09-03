import React from 'react';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';

interface ReceiptsTableProps {
    receipts: GoodsReceipt[];
    openMenuId: string | null;
    setOpenMenuId: (id: string | null) => void;
    onRowClick: (receipt: GoodsReceipt) => void;
    onOpenDetails: (receipt: GoodsReceipt) => void;
    onOpenEdit: (receipt: GoodsReceipt) => void;
    onReverseRequest: (e: React.MouseEvent | null, receipt: GoodsReceipt) => void;
    onDelete: (e: React.MouseEvent, id: string) => void;
}

export const ReceiptsTable: React.FC<ReceiptsTableProps> = ({
    receipts,
    openMenuId,
    setOpenMenuId,
    onRowClick,
    onOpenDetails,
    onOpenEdit,
    onReverseRequest,
    onDelete
}) => {
    return (
        <div className="hidden xl:block overflow-hidden rounded-[2rem] border border-slate-100 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-955/30">
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Recebimento</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Status</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Fornecedor</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Data</th>
                        <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Nota Fiscal</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Total recebido</th>
                        <th className="px-6 py-4 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">Ações</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {receipts.map((receipt) => {
                        const isDraft = receipt.isDraft || receipt.status === 'draft';
                        const isEstornado = receipt.status === 'estornado';
                        const hasNF = Boolean(receipt.fiscalKey && receipt.fiscalKey.replace(/\D/g, '').length === 44);

                        return (
                            <tr key={receipt.id} onClick={() => onRowClick(receipt)} className="hover:bg-slate-50 dark:hover:bg-slate-800/30 cursor-pointer transition-colors">
                                <td className="px-6 py-4">
                                    <p className="text-xs font-mono font-bold text-slate-500">#{formatGoodsReceiptCode(receipt)}</p>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600">{receipt.items.length} itens recebidos</p>
                                </td>
                                <td className="px-6 py-4">
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
                                </td>
                                <td className="px-6 py-4 text-sm font-bold text-slate-800 dark:text-slate-100">{receipt.supplierName}</td>
                                <td className="px-6 py-4 text-sm text-slate-500">{formatToBRDate(receipt.receivedAt)}</td>
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
                                <td className="px-6 py-4 text-right text-sm font-black text-slate-700 dark:text-slate-200">{formatCurrency(receipt.totalValue)}</td>
                                <td className="px-6 py-4 text-right">
                                    <div className="relative inline-block text-left">
                                        <button
                                            type="button"
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setOpenMenuId(openMenuId === receipt.id ? null : receipt.id);
                                            }}
                                            className="p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 rounded-xl transition-colors"
                                            title="Ações"
                                        >
                                            <i className="bi bi-three-dots-vertical text-base" />
                                        </button>

                                        {openMenuId === receipt.id && (
                                            <div
                                                className="absolute right-0 mt-2 z-50 w-48 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900"
                                                onClick={(e) => e.stopPropagation()}
                                            >
                                                <button
                                                    type="button"
                                                    onClick={() => {
                                                        setOpenMenuId(null);
                                                        onOpenDetails(receipt);
                                                    }}
                                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                                                >
                                                    <i className="bi bi-eye text-emerald-600" /> Ver Detalhes
                                                </button>

                                                {isDraft && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            setOpenMenuId(null);
                                                            onOpenEdit(receipt);
                                                        }}
                                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                                    >
                                                        <i className="bi bi-pencil-square" /> Editar Rascunho
                                                    </button>
                                                )}

                                                {!isDraft && !isEstornado && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            setOpenMenuId(null);
                                                            onReverseRequest(e, receipt);
                                                        }}
                                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    >
                                                        <i className="bi bi-arrow-counterclockwise" /> Estornar Recebimento
                                                    </button>
                                                )}

                                                {isDraft && (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            setOpenMenuId(null);
                                                            onDelete(e, receipt.id);
                                                        }}
                                                        className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                                    >
                                                        <i className="bi bi-trash" /> Excluir Rascunho
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};
