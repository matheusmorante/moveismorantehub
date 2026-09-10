import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";
import { OrderMenuDraftActions } from "./OrderMenuDraftActions";
import { OrderMenuTrashActions } from "./OrderMenuTrashActions";
import { OrderMenuActiveActions } from "./OrderMenuActiveActions";

interface OrderOptionsMenuProps {
    order: Order;
    showTrash?: boolean;
    onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean, reconciliationMode?: boolean) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onAction: (actionKey: string, order: Order) => void;
    onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    onShowPostSaleActions?: (order: Order) => void;
    onCloseOtherPopovers?: () => void;
}

export const OrderOptionsMenu = ({
    order,
    showTrash,
    onEdit,
    onDelete,
    onRestore,
    onPermanentDelete,
    onAction,
    onStatusUpdate,
    onShowPostSaleActions,
    onCloseOtherPopovers,
}: OrderOptionsMenuProps) => {
    const [showMenu, setShowMenu] = useState(false);
    const [menuPosition, setMenuPosition] = useState<{ top: number | string; bottom: number | string; right: number }>({ top: 'auto', bottom: 'auto', right: 0 });
    const menuButtonRef = useRef<HTMLButtonElement>(null);

    const isDraft = order.status === 'draft';
    const isCancelled = order.status === 'cancelled';
    const isEditLocked = (order.status === 'fulfilled' || isCancelled) && ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');
    const canReconcileTemporaryProducts = order.status === 'fulfilled' && order.orderType === 'sale' && (order.items || []).some(item => !item.productId?.trim() || item.isTemporaryProduct);

    const handleToggleMenu = (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!showMenu && menuButtonRef.current) {
            const rect = menuButtonRef.current.getBoundingClientRect();
            const spaceBelow = window.innerHeight - rect.bottom;
            if (spaceBelow < 340) {
                setMenuPosition({ top: 'auto', bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right });
            } else {
                setMenuPosition({ top: rect.bottom + 8, bottom: 'auto', right: window.innerWidth - rect.right });
            }
        }
        setShowMenu(!showMenu);
        onCloseOtherPopovers?.();
    };

    return (
        <div className="relative">
            <button
                ref={menuButtonRef}
                className={`p-2 rounded-xl transition-all border flex items-center justify-center h-7 w-7 shadow-sm ${
                    showMenu
                        ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700'
                        : isCancelled
                        ? 'text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700 hover:text-slate-900 dark:hover:white hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
                        : 'text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
                title={isCancelled ? "Mais opções (Copiar pedido)" : "Mais ações e opções de envio"}
                onClick={handleToggleMenu}
            >
                <i className="bi bi-three-dots-vertical text-sm" />
            </button>

            {showMenu && typeof document !== 'undefined' && createPortal(
                <div className="portal-menu-container">
                    <div className="fixed inset-0 z-[9990]" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                    <div
                        className="fixed w-64 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] z-[9999] p-2 flex flex-col gap-1 animate-slide-up max-h-[60vh] overflow-y-auto custom-scrollbar"
                        style={{ top: menuPosition.top, bottom: menuPosition.bottom, right: menuPosition.right }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        {isCancelled ? (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onAction('duplicateOrder', order);
                                    setShowMenu(false);
                                }}
                                className="flex items-center gap-3 w-full p-2.5 rounded-xl text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all text-left cursor-pointer group/item"
                                title="Criar uma cópia deste pedido"
                            >
                                <i className="bi bi-files text-lg" />
                                <span className="text-xs font-black uppercase tracking-widest">
                                    Copiar Pedido
                                </span>
                            </button>
                        ) : isDraft ? (
                            <OrderMenuDraftActions
                                order={order}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                onCloseMenu={() => setShowMenu(false)}
                            />
                        ) : showTrash ? (
                            <OrderMenuTrashActions
                                orderId={order.id!}
                                onRestore={onRestore}
                                onPermanentDelete={onPermanentDelete}
                                onCloseMenu={() => setShowMenu(false)}
                            />
                        ) : (
                            <OrderMenuActiveActions
                                order={order}
                                isEditLocked={isEditLocked}
                                isCancelled={isCancelled}
                                canReconcileTemporaryProducts={canReconcileTemporaryProducts}
                                onEdit={onEdit}
                                onAction={onAction}
                                onStatusUpdate={onStatusUpdate}
                                onShowPostSaleActions={onShowPostSaleActions}
                                onCloseMenu={() => setShowMenu(false)}
                            />
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
