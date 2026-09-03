import React from "react";
import Order from "@/pages/types/order.type";
import { formatCurrency } from "@/pages/utils/formatters";

interface NfeOrderSummaryProps {
    order: Order;
}

export const NfeOrderSummary: React.FC<NfeOrderSummaryProps> = ({ order }) => {
    return (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Cliente</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate mt-1">
                    {order.customerData?.fullName || 'Consumidor Final'}
                </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">CPF/CNPJ</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate mt-1">
                    {order.customerData?.cpfCnpj || order.customerData?.document || 'Não informado'}
                </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Qtd Itens</span>
                <p className="text-xs font-bold text-slate-700 dark:text-slate-200 mt-1">
                    {order.items?.length || 0} produto(s)
                </p>
            </div>
            <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Total</span>
                <p className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-1">
                    {formatCurrency(order.paymentsSummary?.totalOrderValue || 0)}
                </p>
            </div>
        </div>
    );
};
