import React from "react";
import Order from "../../../types/order.type";
import { buttons } from "../OrderActions/orderActionsConfig";
import PostSaleActionMenuButton, { isPostSaleAction } from "./PostSaleActionMenuButton";
import CancelScheduledSaleButton from "./CancelScheduledSaleButton";
import { canGenerateReturn } from "@/pages/utils/returnPolicy";

interface OrderMenuActiveActionsProps {
    order: Order;
    isEditLocked: boolean;
    isCancelled: boolean;
    canReconcileTemporaryProducts: boolean;
    onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean, reconciliationMode?: boolean) => void;
    onAction: (actionKey: string, order: Order) => void;
    onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    onShowPostSaleActions?: (order: Order) => void;
    onCloseMenu: () => void;
}

export const OrderMenuActiveActions: React.FC<OrderMenuActiveActionsProps> = ({
    order,
    isEditLocked,
    isCancelled,
    canReconcileTemporaryProducts,
    onEdit,
    onAction,
    onStatusUpdate,
    onShowPostSaleActions,
    onCloseMenu,
}) => {
    return (
        <>
            {canReconcileTemporaryProducts && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(order, 2, true, true); onCloseMenu(); }}
                    className="flex w-full items-center gap-3 rounded-xl p-2.5 text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                >
                    <i className="bi bi-link-45deg text-lg" />
                    <span className="text-xs font-black uppercase tracking-widest">Conciliação Comercial</span>
                </button>
            )}

            {!isEditLocked && !isCancelled && (
                <button
                    onClick={(e) => { e.stopPropagation(); onEdit(order); onCloseMenu(); }}
                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 group/item ${
                        order.orderType === 'assistance' ? 'text-orange-600' : order.orderType === 'budget' ? 'text-blue-600' : order.orderType === 'return' ? 'text-amber-600' : 'text-emerald-600'
                    }`}
                    title={`Editar est${order.orderType === 'assistance' ? 'a assistência' : order.orderType === 'budget' ? 'e orçamento' : order.orderType === 'return' ? 'a devolução' : 'a venda'}`}
                >
                    <i className="bi bi-pencil-fill text-lg" />
                    <div className="flex flex-col text-left">
                        <span className="text-xs font-black uppercase tracking-widest">
                            {order.orderType === 'assistance' ? 'Editar Assistência' : order.orderType === 'budget' ? 'Editar Orçamento' : order.orderType === 'return' ? 'Editar Devolução' : 'Editar Venda'}
                        </span>
                    </div>
                </button>
            )}

            <PostSaleActionMenuButton
                order={order}
                onOpen={onShowPostSaleActions}
                onCloseMenu={onCloseMenu}
            />

            {buttons.filter(btn => {
                if (isPostSaleAction(btn.key)) return false;
                if (btn.key === 'sendCustomerReviews' && order.orderType === 'assistance') return false;
                if (btn.orderTypes && !btn.orderTypes.includes(order.orderType || 'sale')) return false;

                const hasReturn = !!(
                    order.returnOrderId ||
                    order.orderType === 'return' ||
                    order.status === 'returned' ||
                    (order as any).hasReturn ||
                    (order as any).returned ||
                    (order as any).order_data?.returnOrderId ||
                    (order as any).order_data?.returned ||
                    (order as any).order_data?.status === 'returned'
                );

                if (btn.key === 'generateReturn' && (hasReturn || !canGenerateReturn(order))) return false;
                if (btn.key === 'undoReturn' && (!hasReturn || order.status === 'cancelled')) return false;

                return true;
            }).map((btn) => {
                const isPrintReceipt = btn.key === 'printReceipt';
                const disablePrintReceipt = isPrintReceipt && (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor");
                return (
                    <button
                        key={btn.key}
                        disabled={disablePrintReceipt}
                        onClick={async (e) => {
                            e.stopPropagation();
                            if (disablePrintReceipt) return;
                            onAction(btn.key, order);
                            onCloseMenu();
                        }}
                        className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${disablePrintReceipt ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50' : `hover:bg-slate-50 dark:hover:bg-slate-800 group/item ${btn.color}`}`}
                        title={disablePrintReceipt ? 'Não é possível imprimir recibo sem cliente associado' : btn.tooltip}
                    >
                        <div className="flex items-center gap-3 text-left">
                            <i className={`bi ${btn.icon} text-lg`} />
                            <span className="text-xs font-black uppercase tracking-widest">
                                {typeof btn.label === 'function' ? btn.label(order) : btn.label}
                            </span>
                        </div>
                    </button>
                );
            })}

            <CancelScheduledSaleButton
                order={order}
                onStatusUpdate={onStatusUpdate}
                onCloseMenu={onCloseMenu}
            />
        </>
    );
};
