import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { formatGoodsReceiptCode } from '@/pages/utils/goodsReceiptCode';

export interface ConfirmUnreverseModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly onConfirm: () => void;
    readonly receipt: GoodsReceipt | null;
    readonly isProcessing?: boolean;
}

/**
 * Modal de confirmação para desfazer estorno de recebimento, reativando a entrada no estoque.
 */
export const ConfirmUnreverseModal: React.FC<ConfirmUnreverseModalProps> = ({
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
            aria-labelledby="confirm-unreverse-title"
            className="fixed inset-0 z-[9999999] flex items-center justify-center p-4 animate-fade-in"
        >
            <button
                type="button"
                aria-label="Fechar confirmação de desfeita de estorno"
                disabled={isProcessing}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm cursor-default border-0 p-0 m-0 w-full h-full disabled:cursor-not-allowed"
            />
            <div className="relative w-full max-w-md rounded-[2.5rem] border border-slate-100 bg-white p-6 shadow-2xl dark:border-slate-800 dark:bg-slate-900 xl:p-8 space-y-6">
                {/* Icon Header */}
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-950/30 dark:border-emerald-900/40">
                    <i className="bi bi-arrow-clockwise text-3xl" />
                </div>

                <div className="text-center space-y-2">
                    <h3 id="confirm-unreverse-title" className="text-lg font-black text-slate-800 dark:text-slate-100">
                        Desfazer Estorno?
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                        Você está prestes a reativar o recebimento <strong className="text-slate-700 dark:text-slate-200">#{formatGoodsReceiptCode(receipt)}</strong> do fornecedor <strong className="text-slate-700 dark:text-slate-200">{receipt.supplierName}</strong>.
                    </p>
                </div>

                {/* Details Callout */}
                <div className="rounded-2xl bg-emerald-50/70 dark:bg-emerald-950/30 p-4 border border-emerald-200/80 dark:border-emerald-900/40 text-xs text-emerald-900 dark:text-emerald-300 space-y-1.5">
                    <div className="flex items-center gap-2 font-bold">
                        <i className="bi bi-check-circle-fill text-emerald-600" />
                        <span>O estoque e o recebimento serão restabelecidos:</span>
                    </div>
                    <ul className="list-disc list-inside space-y-1 text-[11px] opacity-90 pl-1">
                        <li>As quantidades dos {receipt.items.length} item(ns) serão creditadas de volta no saldo do estoque.</li>
                        <li>A movimentação de entrada sairá do status <span className="font-bold uppercase text-red-600">Estornado</span> e voltará a ser <span className="font-bold uppercase text-emerald-600">Efetivada</span>.</li>
                        <li>O recebimento passará a ter o status <span className="font-bold uppercase text-emerald-600">Recebido</span>.</li>
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
                        className="w-full sm:w-1/2 rounded-2xl bg-emerald-600 py-3 text-xs font-black uppercase tracking-wider text-white hover:bg-emerald-700 disabled:opacity-50 transition-all shadow-md flex items-center justify-center gap-2 cursor-pointer"
                    >
                        {isProcessing ? (
                            <>
                                <i className="bi bi-arrow-repeat animate-spin text-sm" />
                                Reativando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-arrow-clockwise text-sm" />
                                Desfazer Estorno
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );

    return typeof document === 'undefined' ? content : createPortal(content, document.body);
};

export default ConfirmUnreverseModal;
