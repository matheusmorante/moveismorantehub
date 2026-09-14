import React, { useState, useEffect } from "react";
import Order from "../../../types/order.type";
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { toast } from "react-toastify";
import { formatOrderCode } from '@/pages/utils/orderCode';

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly order: Order;
    readonly type: 'withdrawal' | 'entry'; // withdrawal = lancar saida, entry = estornar (volta pro estoque)
}

const StockActionModal = ({ isOpen, onClose, order, type }: Props) => {
    const [observation, setObservation] = useState("");
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const title = type === 'withdrawal' ? "Lançar Saída de Estoque" : "Estornar Lançamento de Estoque";
    const actionLabel = type === 'withdrawal' ? "Lançar Saída" : "Confirmar Estorno";
    const icon = type === 'withdrawal' ? "bi-box-arrow-right" : "bi-arrow-counterclockwise";
    const color = type === 'withdrawal' ? "bg-orange-600 hover:bg-orange-700" : "bg-blue-600 hover:bg-blue-700";

    const handleConfirm = async () => {
        if (!observation.trim()) {
            toast.error("Por favor, informe o motivo da ação.");
            return;
        }

        const catalogItems = order.items.filter(item => Boolean(item.productId?.trim()) && !item.isTemporaryProduct);
        if (catalogItems.length === 0) {
            toast.error("Não há itens vinculados ao catálogo para movimentar no estoque.");
            return;
        }

        setIsSaving(true);
        try {
            // Record a move for each item in the order
            const moves = catalogItems.map(item => ({
                productId: item.productId!,
                variationId: item.variationId,
                productDescription: item.description,
                type: type,
                quantity: item.quantity,
                date: new Date().toISOString(),
                label: type === 'withdrawal' ? `Saída - Pedido #${formatOrderCode(order)}` : `Estorno - Pedido #${formatOrderCode(order)}`,
                observation: observation,
                unitPrice: item.unitPrice,
                relatedEntityId: order.id,
                relatedEntityType: 'sales_order'
            }));

            // Execute moves
            for (const move of moves) {
                await saveInventoryMove(move, 0);
            }

            toast.success(`${type === 'withdrawal' ? 'Saída lançada' : 'Estorno realizado'} com sucesso!`);
            onClose();
        } catch (error: unknown) {
            console.error("Erro ao processar estoque:", error);
            toast.error("Erro ao processar movimentação de estoque.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar modal de movimentação de estoque"
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="stock-action-title"
                className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-md rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`p-8 ${color} text-white flex items-center justify-between`}>
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2.5 rounded-2xl">
                            <i className={`bi ${icon} text-2xl`} />
                        </div>
                        <div>
                            <h2 id="stock-action-title" className="text-xl font-black tracking-tight">{title}</h2>
                            <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mt-0.5">Pedido #{formatOrderCode(order)}</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        aria-label="Fechar"
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-6">
                    <div className="flex flex-col gap-2">
                        <label htmlFor="stock-action-reason" className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Motivo de {type === 'withdrawal' ? 'Saída' : 'Estorno'} <span className="text-red-500">*</span>
                        </label>
                        <textarea
                            id="stock-action-reason"
                            autoFocus
                            value={observation}
                            onChange={(e) => setObservation(e.target.value)}
                            placeholder="Descreva o motivo desta ação..."
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none transition-all text-sm font-bold dark:text-slate-100 min-h-[100px] resize-none"
                        />
                    </div>

                    <div className="bg-blue-50 dark:bg-blue-900/10 p-4 rounded-2xl border border-blue-100 dark:border-blue-900/30 flex items-start gap-3">
                        <i className="bi bi-info-circle-fill text-blue-600 dark:text-blue-400 mt-0.5" />
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-medium leading-relaxed">
                            Esta ação irá {type === 'withdrawal' ? 'dar baixa no' : 'estornar para o'} estoque atual de todos os itens deste pedido.
                        </p>
                    </div>
                </div>

                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end gap-3">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleConfirm}
                        disabled={isSaving}
                        className={`px-8 py-3 ${color} text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-200 dark:shadow-none`}
                    >
                        {isSaving && <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>}
                        {actionLabel}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockActionModal;
