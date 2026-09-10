import React from "react";
import Order from "../../../types/order.type";

interface OrderMenuDraftActionsProps {
    order: Order;
    onEdit: (order: Order) => void;
    onDelete: (id: string) => void;
    onCloseMenu: () => void;
}

export const OrderMenuDraftActions: React.FC<OrderMenuDraftActionsProps> = ({
    order,
    onEdit,
    onDelete,
    onCloseMenu,
}) => {
    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onEdit(order);
                    onCloseMenu();
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-all text-left cursor-pointer group/item"
                title="Retomar cadastramento do pedido"
            >
                <i className="bi bi-arrow-repeat text-lg" />
                <span className="text-xs font-black uppercase tracking-widest">
                    Retomar Cadastramento
                </span>
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onDelete(order.id!);
                    onCloseMenu();
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-all text-left cursor-pointer group/item"
                title="Descartar este rascunho permanentemente"
            >
                <i className="bi bi-trash3-fill text-lg" />
                <span className="text-xs font-black uppercase tracking-widest">
                    Descartar Rascunho
                </span>
            </button>
        </>
    );
};
