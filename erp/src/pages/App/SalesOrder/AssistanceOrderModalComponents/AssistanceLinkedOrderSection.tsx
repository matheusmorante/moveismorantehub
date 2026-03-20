import React from "react";
import Order, { AssistanceItem } from "../../../types/order.type";
import { formatToBRDate } from "../../../utils/formatters";
import { getSettings } from '../../../utils/settingsService';

interface AssistanceLinkedOrderSectionProps {
    isLinked: boolean;
    setIsLinked: (val: boolean) => void;
    linkedOrderId: string;
    onOpenSearch: () => void;
    currentLinkedOrder?: Order;
    selectedAssistanceItems: AssistanceItem[];
    handleToggleItem: (desc: string, max: number) => void;
    handleUpdateItemQty: (desc: string, qty: number, max: number) => void;
    handleUpdateItemHandling: (desc: string, handling: string) => void;
}

const AssistanceLinkedOrderSection = ({
    isLinked,
    setIsLinked,
    linkedOrderId,
    onOpenSearch,
    currentLinkedOrder,
    selectedAssistanceItems,
    handleToggleItem,
    handleUpdateItemQty,
    handleUpdateItemHandling
}: AssistanceLinkedOrderSectionProps) => {
    const settings = getSettings();
    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    return (
        <div className="flex flex-col gap-4 p-5 rounded-[2.5rem] bg-indigo-50/50 dark:bg-indigo-900/10 border border-indigo-100 dark:border-indigo-900/20 transition-all">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-500 rounded-xl shadow-md shadow-indigo-200 dark:shadow-indigo-900/30">
                        <i className="bi bi-link-45deg text-white text-lg" />
                    </div>
                    <div className="flex flex-col">
                        <h3 className="text-xs font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            Vínculo com Venda
                        </h3>
                        <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-tighter">Associar esta assistência a um pedido</p>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={() => setIsLinked(!isLinked)}
                    className={`w-12 h-6 rounded-full transition-all relative ${isLinked ? 'bg-indigo-600 shadow-inner' : 'bg-slate-300 dark:bg-slate-700'}`}
                >
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all shadow-md ${isLinked ? 'left-7' : 'left-1'}`} />
                </button>
            </div>

            {isLinked && (
                <div className="flex flex-col gap-4 animate-slide-up">
                    {!linkedOrderId ? (
                        <button
                            type="button"
                            onClick={onOpenSearch}
                            className="w-full py-4 px-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800/50 rounded-2xl bg-white dark:bg-slate-950 text-indigo-600 dark:text-indigo-400 font-black text-xs uppercase tracking-widest hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all flex items-center justify-center gap-2 group"
                        >
                            <i className="bi bi-plus-circle-fill text-lg group-hover:scale-110 transition-transform" />
                            Selecionar Pedido Original
                        </button>
                    ) : (
                        <div className="bg-emerald-50/50 dark:bg-emerald-900/10 p-4 rounded-2xl border-2 border-emerald-500 dark:border-emerald-400 shadow-sm relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-2 flex items-center gap-2">
                                <span className="text-[8px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                                    <i className="bi bi-check-circle-fill" /> Selecionado
                                </span>
                                <button
                                    type="button"
                                    onClick={onOpenSearch}
                                    className="p-1.5 text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                                    title="Trocar pedido"
                                >
                                    <i className="bi bi-arrow-left-right" />
                                </button>
                            </div>
                            <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest mb-1">Pedido Selecionado</p>
                            <h4 className="text-sm font-black text-slate-800 dark:text-slate-100">
                                #{currentLinkedOrder?.id?.slice(-8).toUpperCase()} — {currentLinkedOrder?.customerData.fullName}
                            </h4>
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                                Data da Venda: {formatToBRDate(currentLinkedOrder?.date)}
                            </p>
                        </div>
                    )}

                    {currentLinkedOrder && (
                        <div className="flex flex-col gap-3">
                            <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                    Itens sob Assistência
                                </label>
                                <span className="text-[10px] font-black text-indigo-600 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded-md">
                                    {selectedAssistanceItems.length} selecionado(s)
                                </span>
                            </div>
                            <div className="flex flex-col gap-3 max-h-72 overflow-y-auto custom-scrollbar pr-2">
                                {currentLinkedOrder.items.map((item, idx) => {
                                    const isSelected = selectedAssistanceItems.some(i => i.description === item.description);
                                    const selectedItem = selectedAssistanceItems.find(i => i.description === item.description);

                                    return (
                                        <div
                                            key={`${item.description}-${idx}`}
                                            className={`p-4 rounded-3xl border-2 transition-all flex flex-col gap-4 ${isSelected ? 'border-indigo-400 bg-white dark:bg-slate-900 shadow-md' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-200 dark:hover:border-indigo-900/40 cursor-pointer'}`}
                                            onClick={() => handleToggleItem(item.description, item.quantity)}
                                        >
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-5 h-5 rounded-lg flex items-center justify-center border-2 transition-all ${isSelected ? 'bg-indigo-600 border-indigo-600' : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'}`}>
                                                        {isSelected && <i className="bi bi-check-lg text-white text-[10px] font-black" />}
                                                    </div>
                                                    <div>
                                                        <p className="text-xs font-black text-slate-700 dark:text-slate-200">{item.description}</p>
                                                        <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Saldo: {item.quantity}</p>
                                                    </div>
                                                </div>

                                                {isSelected && (
                                                    <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-800 p-1 rounded-xl border border-indigo-100 dark:border-indigo-900/30" onClick={e => e.stopPropagation()}>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateItemQty(item.description, (selectedItem?.quantity || 1) - 1, item.quantity)}
                                                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-indigo-600 shadow-sm transition-all"
                                                        >
                                                            <i className="bi bi-dash-lg" />
                                                        </button>
                                                        <span className="text-xs font-black text-indigo-600 min-w-[24px] text-center">{selectedItem?.quantity}</span>
                                                        <button
                                                            type="button"
                                                            onClick={() => handleUpdateItemQty(item.description, (selectedItem?.quantity || 1) + 1, item.quantity)}
                                                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-500 hover:text-indigo-600 shadow-sm transition-all"
                                                        >
                                                            <i className="bi bi-plus-lg" />
                                                        </button>
                                                    </div>
                                                )}
                                            </div>

                                            {isSelected && (
                                                <div className="flex flex-col gap-2 pt-2 border-t border-slate-50 dark:border-slate-800" onClick={e => e.stopPropagation()}>
                                                    <label className="text-[8px] font-black uppercase text-slate-400 tracking-widest">Modalidade de Manuseio</label>
                                                    <div className="flex items-center gap-2">
                                                        <select
                                                            value={selectedItem?.handlingType || ""}
                                                            onChange={(e) => handleUpdateItemHandling(item.description, e.target.value)}
                                                            className="text-[10px] font-black bg-slate-50 dark:bg-slate-800 border-none rounded-lg p-2 flex-1 focus:ring-2 focus:ring-indigo-500 transition-all uppercase"
                                                        >
                                                            <option value="">(Nenhuma)</option>
                                                            {allOptions.map((opt, i) => (
                                                                <option key={i} value={opt.label}>
                                                                    {opt.label} {opt.includeInAssemblySchedule ? '🔨' : ''}
                                                                </option>
                                                            ))}
                                                        </select>
                                                        {(() => {
                                                            const opt = allOptions.find(o => o.label === selectedItem?.handlingType);
                                                            return opt?.includeInAssemblySchedule && <i className="bi bi-hammer text-red-500 text-sm animate-pulse" title="Exige Montagem" />;
                                                        })()}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default AssistanceLinkedOrderSection;
