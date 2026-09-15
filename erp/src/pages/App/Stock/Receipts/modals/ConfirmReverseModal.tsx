import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';

export interface ConfirmReverseModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
    readonly receipt: GoodsReceipt | null;
    readonly isProcessing?: boolean;
}

/**
 * Modal de confirmação para estorno de recebimento de mercadorias com reversão atômica de estoque.
 */
export const ConfirmReverseModal: React.FC<ConfirmReverseModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    receipt,
    isProcessing = false
}) => {
    useEffect(() => {
        if (!isOpen) return;

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape' && !isProcessing) {
                onClose();
            }
        };

        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, isProcessing, onClose]);

    if (!isOpen || !receipt) return null;

    const content = (
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-reverse-title"
            className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 animate-fade-in"
        >
            <button
                type="button"
                aria-label="Fechar confirmação de estorno"
                disabled={isProcessing}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full disabled:cursor-not-allowed"
            />
            <div className="relative w-full max-w-md rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 xl:p-8 space-y-6">
                {/* Icon Header */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-red-50 text-red-500 border border-red-100 dark:bg-red-950/30 dark:border-red-900/40">
                    <i className="bi bi-exclamation-triangle-fill text-2xl" />
                </div>

                <div className="text-center space-y-2">
                    <h3 id="confirm-reverse-title" className="text-lg font-black text-slate-800 dark:text-slate-100">
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
                        <li>Você poderá desfazer o estorno futuramente se necessário.</li>
                    </ul>
                </div>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    <button
                        type="button"
                        onClick={onClose}
                        disabled={isProcessing}
                        className="w-full sm:w-1/2 rounded-2xl border border-slate-200 bg-slate-100 py-3 text-xs font-black uppercase text-slate-600 hover:bg-slate-200 dark:border-slate-800 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors cursor-pointer disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={isProcessing}
                        className="w-full sm:w-1/2 rounded-2xl bg-red-600 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
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
};

export default ConfirmReverseModal;
