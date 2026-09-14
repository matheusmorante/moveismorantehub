import React, { useState, useEffect } from "react";
import Order, { AssistanceItem } from "../../../types/order.type";
import { Item } from "../../../types/items.type";
import { formatOrderCode } from "../../../utils/orderCode";

interface Props {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly order: Order;
    readonly onStockCheckUpdate: (id: string, value: boolean, updatedItems?: readonly Item[], updatedAssistanceItems?: readonly AssistanceItem[]) => void;
}

const StockCheckModal = ({ isOpen, onClose, order, onStockCheckUpdate }: Props) => {
    const items = [...(order.items || []), ...(order.assistanceItems || [])];

    const [checkedItems, setCheckedItems] = useState<Record<number, boolean>>(() => {
        const initial: Record<number, boolean> = {};
        items.forEach((item, idx) => {
            const isItemChecked = 'isStockChecked' in item && Boolean((item as { isStockChecked?: boolean }).isStockChecked);
            if (isItemChecked || order.isStockChecked) {
                initial[idx] = true;
            }
        });
        return initial;
    });

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

    const toggleItem = (index: number) => {
        setCheckedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const toggleAll = () => {
        const allChecked = items.every((_, idx) => checkedItems[idx]);
        const newState: Record<number, boolean> = {};
        if (!allChecked) {
            items.forEach((_, idx) => {
                newState[idx] = true;
            });
        }
        setCheckedItems(newState);
    };

    const handleConfirm = () => {
        const updatedItems = (order.items || []).map((item, idx) => ({
            ...item,
            isStockChecked: !!checkedItems[idx]
        }));
        
        const updatedAssistanceItems = (order.assistanceItems || []).map((item, idx) => {
            const realIdx = (order.items || []).length + idx;
            return {
                ...item,
                isStockChecked: !!checkedItems[realIdx]
            };
        });

        const allChecked = [...updatedItems, ...updatedAssistanceItems].every(item => item.isStockChecked);
        
        onStockCheckUpdate(order.id!, allChecked, updatedItems, updatedAssistanceItems);
        onClose();
    };

    const isAllChecked = items.length > 0 && items.every((_, idx) => checkedItems[idx]);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4">
            <button
                type="button"
                aria-label="Fechar modal de etiquetagem de itens"
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="stock-check-title"
                className="relative z-10 bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2.5 rounded-2xl">
                            <i className="bi bi-box-seam text-2xl" />
                        </div>
                        <div>
                            <h2 id="stock-check-title" className="text-xl font-black tracking-tight">Etiquetar Itens</h2>
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

                <div className="p-8 flex flex-col gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Itens do Pedido ({items.length})
                        </span>
                        <button 
                            type="button"
                            onClick={toggleAll}
                            className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 hover:opacity-80 flex items-center gap-1"
                        >
                            <i className={`bi ${isAllChecked ? 'bi-check-square-fill' : 'bi-square'}`} />
                            {isAllChecked ? "Desmarcar Tudo" : "Marcar Tudo"}
                        </button>
                    </div>

                    <div className="flex flex-col gap-2">
                        {items.map((item, idx) => (
                            <div 
                                key={idx}
                                role="checkbox"
                                aria-checked={!!checkedItems[idx]}
                                tabIndex={0}
                                onClick={() => toggleItem(idx)}
                                onKeyDown={(e) => {
                                    if (e.key === ' ' || e.key === 'Enter') {
                                        e.preventDefault();
                                        toggleItem(idx);
                                    }
                                }}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                                    checkedItems[idx] 
                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50' 
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/30'
                                }`}
                            >
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {item.description || 'Produto sem descrição'}
                                    </span>
                                    {'variationLabel' in item && Boolean((item as { variationLabel?: string }).variationLabel) && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit text-slate-500 dark:text-slate-400">
                                            {(item as { variationLabel?: string }).variationLabel}
                                        </span>
                                    )}
                                    <span className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 mt-1">
                                        Qtd: {item.quantity}
                                    </span>
                                </div>
                                
                                <div className={`w-6 h-6 rounded-xl border-2 flex items-center justify-center transition-all ${
                                    checkedItems[idx]
                                    ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-200 dark:shadow-none'
                                    : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900'
                                }`}>
                                    {checkedItems[idx] && <i className="bi bi-check-lg text-sm font-black" />}
                                </div>
                            </div>
                        ))}
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
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                    >
                        <i className="bi bi-check2-circle text-sm" />
                        Concluir Etiquetagem
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockCheckModal;
