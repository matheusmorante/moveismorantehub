import React, { useState } from 'react';
import { GoodsReceipt } from '../../../utils/goodsReceiptService';
import { formatCurrency, formatToBRDate } from '../../../utils/formatters';
import { formatGoodsReceiptCode } from '../../../utils/goodsReceiptCode';

interface Props {
    receipt: GoodsReceipt;
    onClick: (receipt: GoodsReceipt) => void;
    onEdit?: (receipt: GoodsReceipt) => void;
    onDelete?: (e: React.MouseEvent, id: string) => void;
    onReverse?: (e: React.MouseEvent, receipt: GoodsReceipt) => void;
    onViewDetails?: (receipt: GoodsReceipt) => void;
}

export default function ReceiptCard({ receipt, onClick, onEdit, onDelete, onReverse, onViewDetails }: Props) {
    const [showMenu, setShowMenu] = useState(false);
    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isEstornado = receipt.status === 'estornado';
    const hasNF = Boolean(receipt.fiscalKey && receipt.fiscalKey.replace(/\D/g, '').length === 44);

    return (
        <div
            onClick={() => onClick(receipt)}
            className="group relative flex flex-col justify-between rounded-3xl border border-slate-100 bg-white p-5 shadow-sm transition-all hover:border-emerald-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-emerald-900/50 cursor-pointer space-y-4"
        >
            {/* Top Bar: ID + Status Badge */}
            <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-black text-slate-500 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-lg">
                        #{formatGoodsReceiptCode(receipt)}
                    </span>
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
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            if (onReverse) onReverse(e, receipt);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-600 hover:bg-red-50 hover:text-red-600 hover:border-red-200 transition-all dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-400 dark:hover:bg-red-950/30 dark:hover:text-red-400"
                        title="Clique para estornar este recebimento"
                    >
                        <i className="bi bi-check-circle-fill text-xs" /> Recebido
                    </button>
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
                            setShowMenu(!showMenu);
                        }}
                        className="rounded-xl p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                        title="Ações do recebimento"
                    >
                        <i className="bi bi-three-dots-vertical text-base" />
                    </button>

                    {showMenu && (
                        <div
                            className="absolute right-0 bottom-10 z-50 w-48 rounded-2xl border border-slate-100 bg-white p-1.5 shadow-xl dark:border-slate-800 dark:bg-slate-900 animate-in fade-in zoom-in-95"
                            onClick={(e) => e.stopPropagation()}
                        >
                            <button
                                type="button"
                                onClick={() => {
                                    setShowMenu(false);
                                    if (onViewDetails) onViewDetails(receipt);
                                    else onClick(receipt);
                                }}
                                className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
                            >
                                <i className="bi bi-eye text-emerald-600" /> Ver Detalhes
                            </button>

                            {isDraft && onEdit && (
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowMenu(false);
                                        onEdit(receipt);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                >
                                    <i className="bi bi-pencil-square" /> Editar Rascunho
                                </button>
                            )}

                            {!isDraft && !isEstornado && onReverse && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        setShowMenu(false);
                                        onReverse(e, receipt);
                                    }}
                                    className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-xs font-bold text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30"
                                >
                                    <i className="bi bi-arrow-counterclockwise" /> Estornar Recebimento
                                </button>
                            )}

                            {isDraft && onDelete && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        setShowMenu(false);
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
            </div>
        </div>
    );
}
