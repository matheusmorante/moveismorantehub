import React from "react";
import OrderActions from "./OrderActions/Index";
import Order from "../../types/order.type";

interface FormFooterProps {
    currentOrder: Order;
    totalOrderValue: number;
    isSaving: boolean;
    onCompleteOrder: (e?: React.MouseEvent) => void;
    buttonLabel?: string;
}

const FormFooter = ({ currentOrder, totalOrderValue, isSaving, onCompleteOrder, buttonLabel }: FormFooterProps) => (
    <div className="border-t border-slate-100 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md py-4 px-8 transition-colors duration-300 shadow-[0_-10px_20px_-5px_rgba(0,0,0,0.05)] dark:shadow-none shrink-0">
        <div className="max-w-[1400px] mx-auto">
            <div className="bg-slate-50/50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800 p-4 px-6 md:px-8 rounded-3xl shadow-sm flex flex-col gap-6 transition-colors duration-300">
                {/* Summary Row */}
                <div className="flex flex-row items-center justify-between gap-6 w-full">
                    <div className="flex items-center gap-6 ml-auto">
                        <div className="bg-white dark:bg-slate-900 p-3 px-6 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col items-end transition-colors duration-300">
                            <span className="text-slate-400 dark:text-slate-500 text-[8px] font-black uppercase tracking-widest">Total a Receber</span>
                            <span className="text-blue-600 dark:text-blue-400 font-black text-2xl italic tracking-tighter">
                                {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalOrderValue || 0)}
                            </span>
                        </div>

                        <button
                            onClick={(e) => { e.preventDefault(); onCompleteOrder(e as any); }}
                            disabled={isSaving}
                            className={`flex items-center justify-center gap-2 px-8 py-4 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl transition-all active:scale-95 whitespace-nowrap ${isSaving
                                ? "bg-slate-200 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed shadow-none"
                                : "bg-green-600 hover:bg-green-700 text-white shadow-green-200 dark:shadow-green-900/20 shadow-lg"
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
                                    {buttonLabel || "Finalizar"}
                                </>
                            )}
                        </button>
                    </div>
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
