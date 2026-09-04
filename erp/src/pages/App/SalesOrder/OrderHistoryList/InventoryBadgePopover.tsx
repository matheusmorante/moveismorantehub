import React from "react";
import { createPortal } from "react-dom";
import { Package, PackageCheck, PackageX, X } from "lucide-react";
import { InventoryBadgeContentResult } from "./inventoryBadgeContent";

interface InventoryBadgePopoverProps {
    coords: { top: number; left: number; placement: 'top' | 'bottom' };
    content: InventoryBadgeContentResult;
    isReturn: boolean;
    hasMovement: boolean;
    isReversed?: boolean;
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
    onClose,
    onMouseEnter,
    onMouseLeave,
}: InventoryBadgePopoverProps) => {
    if (typeof document === 'undefined') return null;

    return createPortal(
        <div
            style={{ position: 'fixed', top: `${coords.top}px`, left: `${coords.left}px` }}
            className="z-[9999] w-72 sm:w-80 rounded-2xl border border-slate-200/90 dark:border-slate-700/80 bg-white/95 dark:bg-slate-900/95 p-4 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 pointer-events-auto"
            onMouseEnter={onMouseEnter}
            onMouseLeave={onMouseLeave}
            onClick={(e) => e.stopPropagation()}
        >
            <div className="flex items-start justify-between gap-2.5">
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

            <p className="mt-2.5 text-[11px] font-medium leading-relaxed text-slate-600 dark:text-slate-300">
                {content.explanation}
            </p>
        </div>,
        document.body
    );
};
