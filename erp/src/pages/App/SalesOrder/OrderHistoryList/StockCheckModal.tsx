import React, { useState } from "react";
import Order from "../../../types/order.type";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    order: Order;
    onStockCheckUpdate: (id: string, value: boolean, updatedItems?: any[], updatedAssistanceItems?: any[]) => void;
}

const StockCheckModal = ({ isOpen, onClose, order, onStockCheckUpdate }: Props) => {
    const items = [...(order.items || []), ...(order.assistanceItems || [])];

    const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>(() => {
        const initial: Record<string, boolean> = {};
        items.forEach((item: any, idx) => {
            if (item.isStockChecked || order.isStockChecked) {
                initial[idx] = true;
            }
        });
        return initial;
    });

    if (!isOpen) return null;

    const toggleItem = (index: number) => {
        setCheckedItems(prev => ({
            ...prev,
            [index]: !prev[index]
        }));
    };

    const toggleAll = () => {
        const allChecked = items.every((_, idx) => checkedItems[idx]);
        const newState: Record<string, boolean> = {};
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
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="p-8 bg-indigo-600 text-white flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2.5 rounded-2xl">
                            <i className="bi bi-box-seam text-2xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Checar Estoque dos Itens</h2>
                            <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mt-0.5">Pedido #{order.id?.slice(-8).toUpperCase()}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>

                <div className="p-8 flex flex-col gap-4 max-h-[50vh] overflow-y-auto custom-scrollbar">
                    <div className="flex justify-between items-center mb-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                            Itens do Pedido ({items.length})
                        </span>
                        <button 
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
                                onClick={() => toggleItem(idx)}
                                className={`flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer select-none ${
                                    checkedItems[idx] 
                                    ? 'bg-indigo-50/50 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-900/50' 
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:border-indigo-100 dark:hover:border-indigo-900/30'
                                }`}
                            >
                                <div className="flex flex-col gap-1">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
                                        {item.description || 'Produto sem descrição'}
                                    </span>
                                    {item.variationLabel && (
                                        <span className="text-[9px] font-black uppercase tracking-widest bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded w-fit text-slate-500 dark:text-slate-400">
                                            {item.variationLabel}
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
                        onClick={onClose}
                        className="px-6 py-3 rounded-xl font-bold text-xs uppercase tracking-widest text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200 transition-all"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        className="px-8 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2"
                    >
                        <i className="bi bi-check2-circle text-sm" />
                        Concluir Checagem
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockCheckModal;
