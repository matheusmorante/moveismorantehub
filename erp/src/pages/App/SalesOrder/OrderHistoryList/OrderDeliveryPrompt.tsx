import React, { useState, useEffect } from "react";
import Order from "../../../types/order.type";
import { getOrderFulfillmentCountdown } from "@/pages/utils/orderFulfillmentCountdown";

interface OrderDeliveryPromptProps {
    order: Order;
    showTrash?: boolean;
    showManualPrompt?: boolean;
    onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    fulfilledLabel?: string;
}

export const OrderDeliveryPrompt = ({
    order,
    showTrash,
    showManualPrompt = true,
    onStatusUpdate,
    fulfilledLabel = 'Atendido',
}: OrderDeliveryPromptProps) => {
    const [showConfirm, setShowConfirm] = useState(false);
    const countdown = getOrderFulfillmentCountdown(order);

    useEffect(() => {
        if (!showConfirm) return;
        const timer = setTimeout(() => setShowConfirm(false), 5000);
        return () => clearTimeout(timer);
    }, [showConfirm]);

    if (!countdown.isPastDelivery || order.status === 'fulfilled' || order.status === 'cancelled' || showTrash || !showManualPrompt) {
        return null;
    }

    if (showConfirm) {
        return (
            <div className="flex items-center gap-1.5 animate-slide-up mt-1">
                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">Confirmar?</span>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onStatusUpdate(order.id!, 'fulfilled');
                        setShowConfirm(false);
                    }}
                    className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-md hover:bg-emerald-700 transition-colors shadow-sm cursor-pointer"
                >
                    Sim
                </button>
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        setShowConfirm(false);
                    }}
                    className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm cursor-pointer"
                >
                    Não
                </button>
            </div>
        );
    }

    return (
        <button
            onClick={(e) => {
                e.stopPropagation();
                setShowConfirm(true);
            }}
            className="flex flex-col items-start px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-lg border border-red-200 dark:border-red-900/30 w-fit hover:scale-105 transition-all active:scale-95 shadow-sm text-left cursor-pointer mt-1"
            title="A data de entrega passou. Este pedido já foi atendido?"
        >
            <div className="flex items-center gap-1.5">
                <i className="bi bi-clock-history text-[10px]" />
                <span className="text-[9px] font-black uppercase tracking-widest">
                    Pedido {fulfilledLabel}?
                </span>
            </div>
            {countdown.countdownLabel && (
                <span className="text-[8px] font-bold text-red-500 dark:text-red-400 tracking-tight mt-0.5">
                    {countdown.countdownLabel}
                </span>
            )}
        </button>
    );
};
