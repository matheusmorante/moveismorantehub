import React from "react";
import Item from "../../../types/items.type";
import { formatCurrency } from "../../../utils/formatters";
import { getSettings } from '../../../utils/settingsService';

interface AssistanceExtraItemsSectionProps {
    extraItems: Item[];
    setExtraItems: React.Dispatch<React.SetStateAction<Item[]>>;
    onOpenSearch: () => void;
}

const AssistanceExtraItemsSection = ({
    extraItems,
    setExtraItems,
    onOpenSearch
}: AssistanceExtraItemsSectionProps) => {
    const settings = getSettings();
    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                    <i className="bi bi-box-seam-fill text-indigo-500" />
                    Peças e Materiais Utilizados
                </h3>
                <button
                    type="button"
                    onClick={onOpenSearch}
                    className="px-3 py-1.5 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 text-[9px] font-black uppercase tracking-widest rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-indigo-100 dark:border-indigo-900/50"
                >
                    <i className="bi bi-plus-lg mr-1.5" />
                    Adicionar Item
                </button>
            </div>

            <div className="flex flex-col gap-3">
                {extraItems.length === 0 ? (
                    <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-center">
                        <div className="w-10 h-10 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300 mb-3">
                            <i className="bi bi-cart-plus text-lg" />
                        </div>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhuma peça adicionada</p>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3">
                        {extraItems.map((item, idx) => (
                            <div key={idx} className="p-4 bg-slate-50 dark:bg-slate-900 rounded-[2rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-3 group transition-all hover:border-indigo-200">
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-0.5">
                                        <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                                            {item.description}
                                        </span>
                                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                            {item.quantity} {item.quantity === 1 ? 'unidade' : 'unidades'} • {formatCurrency(item.unitPrice)}/un
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-black text-indigo-600">
                                            {formatCurrency(item.quantity * item.unitPrice)}
                                        </span>
                                        <button
                                            type="button"
                                            onClick={() => setExtraItems(prev => prev.filter((_, i) => i !== idx))}
                                            className="w-8 h-8 rounded-xl bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors shadow-sm opacity-0 group-hover:opacity-100"
                                        >
                                            <i className="bi bi-trash3" />
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-1.5 pt-2 border-t border-slate-100 dark:border-slate-800">
                                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Modalidade</label>
                                    <div className="flex items-center gap-2">
                                        <select
                                            value={item.handlingType || ""}
                                            onChange={(e) => {
                                                const val = e.target.value;
                                                setExtraItems(prev => prev.map((it, i) => i === idx ? { ...it, handlingType: val } : it));
                                            }}
                                            className="text-[10px] font-black bg-white dark:bg-slate-950 border-none rounded-lg p-1.5 flex-1 focus:ring-1 focus:ring-indigo-500 transition-all uppercase"
                                        >
                                            <option value="">(Nenhuma)</option>
                                            {allOptions.map((opt, i) => (
                                                <option key={i} value={opt.label}>
                                                    {opt.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>
                            </div>
                        ))}
                        <div className="flex justify-end px-4 py-2 bg-indigo-50/50 dark:bg-indigo-900/10 rounded-2xl border border-indigo-100/50 dark:border-indigo-900/30">
                            <span className="text-[10px] font-black uppercase tracking-widest text-indigo-400 dark:text-indigo-500 mr-2">Subtotal Peças:</span>
                            <span className="text-xs font-black text-indigo-600">
                                {formatCurrency(extraItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0))}
                            </span>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AssistanceExtraItemsSection;
