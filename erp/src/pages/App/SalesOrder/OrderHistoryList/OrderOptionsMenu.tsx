import React, { useState, useRef } from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";
import { buttons } from "../OrderActions/orderActionsConfig";
import PostSaleActionMenuButton, { isPostSaleAction } from "./PostSaleActionMenuButton";
import CancelScheduledSaleButton from "./CancelScheduledSaleButton";
import { canGenerateReturn } from "@/pages/utils/returnPolicy";

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
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(order);
                                        setShowMenu(false);
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
                                        setShowMenu(false);
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
                        ) : showTrash ? (
                            <>
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onRestore(order.id!);
                                        setShowMenu(false);
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
                                        onPermanentDelete(order.id!);
                                        setShowMenu(false);
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
                        ) : (
                            <>
                                {canReconcileTemporaryProducts && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(order, 2, true, true); setShowMenu(false); }}
                                        className="flex w-full items-center gap-3 rounded-xl p-2.5 text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                    >
                                        <i className="bi bi-link-45deg text-lg" />
                                        <span className="text-xs font-black uppercase tracking-widest">Conciliação Comercial</span>
                                    </button>
                                )}

                                {!isEditLocked && !isCancelled && (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onEdit(order); setShowMenu(false); }}
                                        className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 group/item ${
                                            order.orderType === 'assistance' ? 'text-orange-600' : order.orderType === 'budget' ? 'text-blue-600' : order.orderType === 'return' ? 'text-amber-600' : 'text-emerald-600'
                                        }`}
                                        title={isDraft ? 'Retomar cadastramento do pedido' : `Editar est${order.orderType === 'assistance' ? 'a assistência' : order.orderType === 'budget' ? 'e orçamento' : order.orderType === 'return' ? 'a devolução' : 'a venda'}`}
                                    >
                                        <i className={`bi ${isDraft ? 'bi-arrow-repeat' : 'bi-pencil-fill'} text-lg`} />
                                        <div className="flex flex-col text-left">
                                            <span className="text-xs font-black uppercase tracking-widest">
                                                {isDraft
                                                    ? 'Retomar Cadastramento'
                                                    : (order.orderType === 'assistance' ? 'Editar Assistência' : order.orderType === 'budget' ? 'Editar Orçamento' : order.orderType === 'return' ? 'Editar Devolução' : 'Editar Venda')}
                                            </span>
                                        </div>
                                    </button>
                                )}

                                <PostSaleActionMenuButton
                                    order={order}
                                    onOpen={onShowPostSaleActions}
                                    onCloseMenu={() => setShowMenu(false)}
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
                                                setShowMenu(false);
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
                                    onCloseMenu={() => setShowMenu(false)}
                                />
                            </>
                        )}
                    </div>
                </div>,
                document.body
            )}
        </div>
    );
};
