import React, { useState, useEffect } from 'react';
import InventoryMove from '@/pages/types/inventoryMove.type';

export interface InventoryMoveDeleteModalProps {
    readonly move: InventoryMove | null;
    readonly isPurchaseEntry: boolean;
    readonly isDeleting: boolean;
    readonly onClose: () => void;
    readonly onConfirm: (reason: string) => void;
}

/**
 * Modal de confirmação e justificativa para estorno seguro de movimentação de estoque.
 */
export const InventoryMoveDeleteModal: React.FC<InventoryMoveDeleteModalProps> = ({
    move,
    isPurchaseEntry,
    isDeleting,
    onClose,
    onConfirm,
}) => {
    const [reason, setReason] = useState('');

    useEffect(() => {
        if (move) {
            setReason(isPurchaseEntry ? 'Estorno de entrada de pedido de compra' : 'Estorno manual de lançamento');
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isDeleting) {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, isPurchaseEntry, isDeleting, onClose]);

    if (!move) return null;

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onConfirm(reason.trim() || 'Estorno manual de lançamento');
    };

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Estornar movimentação de estoque"
        >
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-slide-up">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                    <i className="bi bi-arrow-counterclockwise text-xl" aria-hidden="true" />
                </div>

                <h2 className="mt-4 text-lg font-black text-slate-800 dark:text-white tracking-tight">
                    Estornar movimentação?
                </h2>

                <p className="mt-2 text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {isPurchaseEntry
                        ? 'Esta entrada foi gerada a partir de um pedido de compra. Ao estornar, o efeito no saldo de estoque será cancelado e o histórico ficará preservado.'
                        : 'A movimentação receberá o status de estornada e não terá mais efeito no saldo do estoque. O registro permanecerá no histórico.'}
                </p>

                <form onSubmit={handleSubmit} className="mt-4">
                    <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1.5">
                        Observação <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={reason}
                        onChange={(e) => setReason(e.target.value)}
                        placeholder="Informe a observação do estorno..."
                        rows={2}
                        required
                        className="w-full text-xs p-3 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none"
                    />

                    <div className="mt-6 flex justify-end gap-2.5">
                        <button
                            type="button"
                            onClick={onClose}
                            disabled={isDeleting}
                            className="rounded-xl px-4 py-2.5 text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer disabled:opacity-50"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isDeleting || !reason.trim()}
                            className="rounded-xl bg-rose-600 hover:bg-rose-700 px-4 py-2.5 text-xs font-black text-white disabled:opacity-60 transition-colors cursor-pointer flex items-center gap-2 shadow-md shadow-rose-500/20"
                        >
                            {isDeleting ? (
                                <>
                                    <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                    <span>Estornando...</span>
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-arrow-counterclockwise" aria-hidden="true" />
                                    <span>Confirmar Estorno</span>
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default InventoryMoveDeleteModal;
