import React, { useState } from "react";
import Order from "../../../types/order.type";
import UndoFulfillmentModal from "./UndoFulfillmentModal";
import { canUndoFulfillment } from "@/pages/utils/orderStatusTransitionRules";

type Props = {
    order: Order;
    onStatusUpdate: (id: string, status: Order["status"]) => void;
    onCloseMenu: () => void;
};

const UndoFulfillmentButton = ({ order, onStatusUpdate, onCloseMenu }: Props) => {
    const [isConfirmOpen, setIsConfirmOpen] = useState(false);

    if (!canUndoFulfillment(order) || !order.id) return null;

    return (
        <>
            <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
            <button
                type="button"
                onClick={(event) => {
                    event.stopPropagation();
                    setIsConfirmOpen(true);
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30 cursor-pointer"
                title="Desfazer status de atendido"
            >
                <i className="bi bi-arrow-counterclockwise text-lg shrink-0" />
                <span className="text-xs font-black uppercase tracking-widest">Desfazer atendido</span>
            </button>
            {isConfirmOpen && (
                <UndoFulfillmentModal
                    onCancel={() => {
                        setIsConfirmOpen(false);
                        onCloseMenu();
                    }}
                    onConfirm={() => {
                        onStatusUpdate(order.id!, "scheduled");
                        setIsConfirmOpen(false);
                        onCloseMenu();
                    }}
                />
            )}
        </>
    );
};

export default UndoFulfillmentButton;
