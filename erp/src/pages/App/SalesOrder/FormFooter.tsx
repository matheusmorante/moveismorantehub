import React from "react";
import OrderActions from "./OrderActions/Index";
import Order from "../../types/order.type";
import { actionsMap } from "./OrderActions/orderActionsConfig";

interface FormFooterProps {
    currentOrder: Order;
    totalOrderValue: number;
    isSaving: boolean;
    onCompleteOrder: (e?: React.MouseEvent) => void;
    onPrev: () => void;
    buttonLabel?: string;
    colorScheme?: 'blue' | 'emerald';
}

const FormFooter = ({ currentOrder, totalOrderValue, isSaving, onCompleteOrder, onPrev, buttonLabel, colorScheme = 'emerald' }: FormFooterProps) => (
    <div className="border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-2 px-2 transition-colors duration-300 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] dark:shadow-none shrink-0">
        <div className="max-w-[1400px] mx-auto">
            <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-2 px-4 rounded-2xl shadow-sm flex flex-col gap-3 transition-colors duration-300">
                {/* Summary Row */}
                <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 w-full">
                        <div className="bg-white dark:bg-slate-900 p-1.5 px-4 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-center sm:items-end transition-colors duration-300 min-w-fit">
                            <span className="text-slate-400 dark:text-slate-500 text-[8px] font-black uppercase tracking-widest mb-0">Total</span>
                            <span className="text-blue-600 dark:text-blue-400 font-black text-xl italic tracking-tighter whitespace-nowrap">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrderValue || 0)}
                            </span>
                        </div>

                        <button
                            onClick={(e) => { e.preventDefault(); onCompleteOrder(e as any); }}
                            disabled={isSaving}
                            className={`flex items-center justify-center gap-2 px-8 py-2.5 rounded-xl font-black uppercase tracking-widest text-[11px] shadow-xl transition-all active:scale-95 whitespace-nowrap flex-1 sm:flex-none ${isSaving
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                                : colorScheme === 'blue'
                                ? "bg-blue-600 hover:bg-blue-700 text-white shadow-blue-200 dark:shadow-blue-900/40 shadow-lg"
                                : "bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-200 dark:shadow-emerald-900/40 shadow-lg"
                                }`}
                            title="Finalizar e salvar permanentemente este pedido de venda"
                        >
                            {isSaving ? (
                                <>
                                    <i className="bi bi-arrow-repeat animate-spin text-xl" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-check2-circle text-lg" />
                                    {buttonLabel || "Concluir Pedido"}
                                </>
                            )}
                        </button>
                </div>

                {/* Actions Row - Full Width and Centered */}
                <div className="w-full pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                    <OrderActions order={currentOrder} context="form" />
                </div>
            </div>
        </div>
    </div>
);

export default FormFooter;
