import React from 'react';
import { createPortal } from 'react-dom';
import { GoodsReceipt } from '../../../utils/goodsReceiptService';
import { formatGoodsReceiptCode } from '../../../utils/goodsReceiptCode';

type Props = {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    receipt: GoodsReceipt | null;
    isProcessing?: boolean;
};

export default function ConfirmReverseModal({ isOpen, onClose, onConfirm, receipt, isProcessing }: Props) {
    if (!isOpen || !receipt) return null;

    const content = (
        <div className="fixed inset-0 z-[9999999] flex items-center justify-center bg-slate-950/70 p-4 backdrop-blur-sm animate-fade-in">
            <div className="relative w-full max-w-md rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 xl:p-8 space-y-6">
                {/* Icon Header */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500 border border-red-100 dark:bg-red-950/30 dark:border-red-900/40">
                    <i className="bi bi-exclamation-triangle-fill text-2xl" />
                </div>

                <div className="text-center space-y-2">
                    <h3 className="text-lg font-black text-slate-800 dark:text-slate-100">
                        Estornar Recebimento?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Você está prestes a estornar o recebimento <strong className="text-slate-700 dark:text-slate-200">#{formatGoodsReceiptCode(receipt)}</strong> do fornecedor <strong className="text-slate-700 dark:text-slate-200">{receipt.supplierName}</strong>.
                    </p>
                </div>

                {/* Details Callout */}
                <div className="rounded-2xl bg-amber-50 dark:bg-amber-950/30 p-4 border border-amber-200 dark:border-amber-900/40 text-xs text-amber-800 dark:text-amber-300 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold">
                        <i className="bi bi-info-circle-fill text-amber-600" />
                        <span>Atenção: Esta ação irá reverter o estoque!</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90 pl-1">
                        <li>As quantidades dos {receipt.items.length} item(ns) serão debitadas do saldo no estoque.</li>
                        <li>O status do recebimento passará para <span className="font-bold uppercase text-red-600">Estornado</span>.</li>
                        <li>Esta operação <span className="font-bold underline">não poderá ser desfeita</span>.</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-full sm:w-1/2 rounded-2xl border border-slate-200 bg-slate-100 py-3 text-xs font-black uppercase text-slate-600 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="w-full sm:w-1/2 rounded-2xl bg-red-600 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2"
                    >
                        {isProcessing ? (
                            <>
                                <i className="bi bi-arrow-repeat animate-spin text-sm" />
                                Estornando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-arrow-counterclockwise text-sm" />
                                Estornar
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
}
