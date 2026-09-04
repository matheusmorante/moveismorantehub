import React from "react";
import { createPortal } from "react-dom";
import { Package, PackageCheck, PackageX, X } from "lucide-react";
import Order from "../../../types/order.type";
import { InventoryBadgeContentResult, getOrderItemsMovementList } from "./inventoryBadgeContent";

interface InventoryBadgePopoverProps {
    coords: { top: number; left: number; placement: 'top' | 'bottom' };
    content: InventoryBadgeContentResult;
    isReturn: boolean;
    hasMovement: boolean;
    isReversed?: boolean;
    order?: Order;
    onClose: () => void;
    onMouseEnter: () => void;
    onMouseLeave: () => void;
}

export const InventoryBadgePopover = ({
    coords,
    content,
    isReturn,
    hasMovement,
    isReversed,
    order,
    onClose,
    onMouseEnter,
    onMouseLeave,
}: InventoryBadgePopoverProps) => {
    if (typeof document === 'undefined') return null;

    const itemsMovement = getOrderItemsMovementList(order, hasMovement, isReversed);

    return createPortal(
        <div
            style={{ position: 'fixed', top: `${coords.top}px`, left: `${coords.left}px` }}
            className="z-[9999] w-80 sm:w-96 max-h-[85vh] flex flex-col rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={(e) => e.stopPropagation()}
        >
            {/* Cabeçalho do Popover */}
            <div className="flex items-start justify-between gap-2.5 shrink-0">
                <div className="flex items-center gap-2.5">
                    <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${content.badgeColorClass}`}>
                        {isReversed ? (
                            <PackageX className="h-4 w-4" />
                        ) : hasMovement ? (
                            <PackageCheck className="h-4 w-4" />
                        ) : (
                            <Package className="h-4 w-4" />
                        )}
                    </div>
                    <div>
                        <h4 className="text-xs font-black tracking-tight text-slate-800 dark:text-slate-100">
                            {isReturn ? 'Estoque (Devolução)' : 'Estoque (Venda)'}
                        </h4>
                        <span className={`text-[9px] font-black uppercase tracking-wider ${content.statusTextColor}`}>
                            {content.statusLabel}
                        </span>
                    </div>
                </div>
                <button
                    type="button"
                    onClick={onClose}
                    className="flex h-5 w-5 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-colors"
                    title="Fechar"
                >
                    <X className="h-3.5 w-3.5" />
                </button>
            </div>

            {/* Texto Explicativo Geral */}
            <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300 shrink-0">
                {content.explanation}
            </p>

            {/* Lista com Todos os Itens do Pedido */}
            {itemsMovement.length > 0 && (
                <div className="mt-3 pt-2.5 border-t border-slate-100 dark:border-slate-800 flex flex-col min-h-0">
                    <div className="flex items-center justify-between mb-2 shrink-0">
                        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Itens da Venda ({itemsMovement.length})
                        </span>
                        <span className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                            Movimentação
                        </span>
                    </div>

                    <div className="overflow-y-auto max-h-48 space-y-1.5 pr-1 custom-scrollbar">
                        {itemsMovement.map((item, idx) => (
                            <div
                                key={idx}
                                className="flex items-center justify-between gap-2 p-2 rounded-xl bg-slate-50/80 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700/60 text-[11px]"
                            >
                                <div className="flex flex-col min-w-0 flex-1">
                                    <span 
                                        className="font-bold text-slate-800 dark:text-slate-200 truncate"
                                        title={item.description}
                                    >
                                        {item.description}
                                    </span>
                                    <span className="text-[9px] text-slate-500 dark:text-slate-400 font-medium mt-0.5">
                                        Qtd: <strong className="text-slate-700 dark:text-slate-300 font-bold">{item.quantity}</strong>
                                    </span>
                                </div>

                                <span
                                    className={`shrink-0 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider border ${item.statusBadgeClass}`}
                                    title={item.tooltip}
                                >
                                    {item.statusLabel}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>,
        document.body
    );
};
