import React from "react";
import Order from "../../types/order.type";

interface FormHeaderProps {
    currentOrder?: Order | null;
    onClearForm: () => void;
    orderDate: string;
    setOrderDate: (date: string) => void;
    isSavingDraft: boolean;
}

const FormHeader = ({ currentOrder, onClearForm, orderDate, setOrderDate, isSavingDraft }: FormHeaderProps) => (
    <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-6 pb-4 border-b border-slate-100 dark:border-slate-800 mb-6 pt-4">
        <div className="flex flex-wrap items-end gap-6 w-full md:w-auto order-2 md:order-1">
            {currentOrder && (
                <button
                    onClick={(e) => {
                        e.preventDefault();
                        onClearForm();
                    }}
                    className="flex items-center gap-2.5 px-5 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 shadow-sm"
                >
                    <i className="bi bi-plus-lg" /> Novo Pedido
                </button>
            )}
        </div>

        <div className="flex flex-col gap-2 order-1 md:order-2 md:text-right w-full md:w-auto">
            <div className="flex flex-col md:items-end gap-1">
                {/* Simple Save Status indicator instead of large buttons */}
                <div className="flex items-center gap-4">
                    {isSavingDraft && (
                        <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse border border-slate-200/50 dark:border-slate-700/50">
                            <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Salvando rascunho...</span>
                        </div>
                    )}

                    <div className="flex items-center gap-3">
                        <div className="relative group">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <i className="bi bi-calendar-event text-blue-500 text-xs" />
                            </div>
                            <input
                                type="date"
                                value={orderDate}
                                onChange={(e) => setOrderDate(e.target.value)}
                                className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-0 focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
);

export default FormHeader;
