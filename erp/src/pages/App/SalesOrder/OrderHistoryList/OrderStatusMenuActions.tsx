import type { MouseEvent } from "react";
import Order from "../../../types/order.type";

interface OrderStatusMenuActionsProps {
    order: Order;
    onUndoFulfillment: () => void;
    onMarkFulfilled: () => void;
    onCancelSale: () => void;
    onClose: () => void;
}

const OrderStatusMenuActions = ({ order, onUndoFulfillment, onMarkFulfilled, onCancelSale, onClose }: OrderStatusMenuActionsProps) => {
    if (!order.id || !["scheduled", "fulfilled"].includes(order.status || "")) return null;

    const isFulfilled = order.status === "fulfilled";
    const handleClick = (event: MouseEvent) => {
        event.stopPropagation();
        (isFulfilled ? onUndoFulfillment : onMarkFulfilled)();
        onClose();
    };

    return (
        <>
            <div className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <button type="button" onClick={handleClick} className={`flex w-full items-center gap-3 rounded-xl p-2.5 text-left transition-all ${isFulfilled ? "text-amber-700 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950/30" : "text-emerald-700 hover:bg-emerald-50 dark:text-emerald-300 dark:hover:bg-emerald-950/30"}`}>
                <i className={`bi ${isFulfilled ? "bi-arrow-counterclockwise" : "bi-check-circle-fill"} text-lg`} />
                <span className="text-xs font-black uppercase tracking-widest">{isFulfilled ? "Desfazer atendido" : "Marcar como atendido"}</span>
            </button>
            {!isFulfilled && <button type="button" onClick={(event) => { event.stopPropagation(); onCancelSale(); onClose(); }} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-red-700 transition-all hover:bg-red-50 dark:text-red-300 dark:hover:bg-red-950/30">
                <i className="bi bi-x-circle-fill text-lg" />
                <span className="text-xs font-black uppercase tracking-widest">Cancelar venda</span>
            </button>}
        </>
    );
};

export default OrderStatusMenuActions;
