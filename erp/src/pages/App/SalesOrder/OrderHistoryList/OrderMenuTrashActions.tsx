import React from "react";

interface OrderMenuTrashActionsProps {
    orderId: string;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onCloseMenu: () => void;
}

export const OrderMenuTrashActions: React.FC<OrderMenuTrashActionsProps> = ({
    orderId,
    onRestore,
    onPermanentDelete,
    onCloseMenu,
}) => {
    return (
        <>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onRestore(orderId);
                    onCloseMenu();
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all text-left cursor-pointer group/item"
                title="Restaurar Pedido"
            >
                <i className="bi bi-arrow-counterclockwise text-lg" />
                <span className="text-xs font-black uppercase tracking-widest">
                    Restaurar Pedido
                </span>
            </button>
            <button
                type="button"
                onClick={(e) => {
                    e.stopPropagation();
                    onPermanentDelete(orderId);
                    onCloseMenu();
                }}
                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-all text-left cursor-pointer group/item"
                title="Excluir Definitivamente"
            >
                <i className="bi bi-trash-fill text-lg" />
                <span className="text-xs font-black uppercase tracking-widest">
                    Excluir Definitivamente
                </span>
            </button>
        </>
    );
};
