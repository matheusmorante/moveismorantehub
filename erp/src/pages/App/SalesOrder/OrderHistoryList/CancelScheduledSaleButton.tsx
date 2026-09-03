import React, { useState } from "react";
import Order from "../../../types/order.type";
import CancelSaleModal from "./CancelSaleModal";

type Props = {
    order: Order;
    onStatusUpdate: (id: string, status: Order["status"]) => void;
    onCloseMenu: () => void;
};

const CancelScheduledSaleButton = ({ order, onStatusUpdate, onCloseMenu }: Props) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    const orderType = order.orderType || "sale";
    if (!["sale", "showroom"].includes(orderType)) return null;
    if (order.status !== "scheduled" || !order.id) return null;

    return (
        <>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsConfirmOpen(true);
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-rose-600 transition-all hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30 cursor-pointer"
                title="Cancelar venda agendada"
            >
                <i className="bi bi-x-circle-fill text-lg shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest">Cancelar venda</span>
            </button>
            {isConfirmOpen && (
                <CancelSaleModal
                    onCancel={() => {
                        setIsConfirmOpen(false);
                        onCloseMenu();
                    }}
                    onConfirm={() => {
                        onStatusUpdate(order.id!, "cancelled");
                        setIsConfirmOpen(false);
                        onCloseMenu();
                    }}
                />
            )}
        </>
    );
};

export default CancelScheduledSaleButton;

