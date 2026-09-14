import React, { useEffect } from 'react';
import InventoryMove from '@/pages/types/inventoryMove.type';

export interface PurchaseEntryLockedModalProps {
    readonly move: InventoryMove | null;
    readonly onClose: () => void;
    readonly onOpenPurchase: (purchaseId: string) => void;
}

/**
 * Modal informativo exibido ao tentar alterar diretamente uma entrada de estoque vinculada a um pedido de compra.
 */
export const PurchaseEntryLockedModal: React.FC<PurchaseEntryLockedModalProps> = ({
    move,
    onClose,
    onOpenPurchase,
}) => {
    useEffect(() => {
        if (!move) return;

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [move, onClose]);

    if (!move) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-fade-in"
            role="dialog"
            aria-modal="true"
            aria-label="Entrada vinculada ao pedido de compra"
        >
            <div
                className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm cursor-pointer"
                onClick={onClose}
                aria-hidden="true"
            />
            <div className="relative w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl dark:bg-slate-900 border border-slate-100 dark:border-slate-800 animate-slide-up">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 text-amber-600 dark:bg-amber-900/20">
                    <i className="bi bi-lock-fill text-lg" aria-hidden="true" />
                </div>
                <h2 className="mt-4 text-xl font-black text-slate-800 dark:text-white tracking-tight">
                    Entrada vinculada ao pedido
                </h2>
                <p className="mt-2 text-sm leading-relaxed text-slate-500 dark:text-slate-400">
                    Esta movimentação foi gerada por um pedido de compra. Para desfazer a entrada, acesse os detalhes do pedido vinculado e use a ação de estorno.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-xl px-4 py-2.5 text-sm font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                    >
                        Fechar
                    </button>
                    <button
                        type="button"
                        onClick={() => move.relatedEntityId && onOpenPurchase(move.relatedEntityId)}
                        disabled={!move.relatedEntityId}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-black text-white hover:bg-blue-700 disabled:opacity-60 transition-all shadow-md shadow-blue-500/20"
                    >
                        Ver pedido de compra
                    </button>
                </div>
            </div>
        </div>
    );
};

export default PurchaseEntryLockedModal;
