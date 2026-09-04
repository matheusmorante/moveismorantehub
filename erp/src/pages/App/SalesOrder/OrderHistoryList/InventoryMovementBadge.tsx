import React, { useState, useRef, useEffect, useCallback } from "react";
import { Package, PackageCheck, PackageX } from "lucide-react";
import type Order from "../../../types/order.type";
import { isPartialSaleStockMovement } from "../../../utils/saleInventoryRules";
import { getInventoryBadgeContent } from "./inventoryBadgeContent";
import { InventoryBadgePopover } from "./InventoryBadgePopover";

type Props = { 
    orderType?: string; 
    hasMovement: boolean; 
    isReversed?: boolean; 
    isPartial?: boolean;
    order?: Order;
};

const InventoryMovementBadge = ({ orderType, hasMovement, isReversed, isPartial, order }: Props) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hoverTimerRef = useRef<NodeJS.Timeout | null>(null);
    const closeTimerRef = useRef<NodeJS.Timeout | null>(null);

    const resolvedOrderType = orderType || order?.orderType;
    const isReturn = resolvedOrderType === 'return';
    const isPartialMovement = isPartial ?? (order?.isPartialStockProcessed ?? (order ? isPartialSaleStockMovement(order) : false));

    const content = getInventoryBadgeContent({
        isReturn,
        hasMovement,
        isReversed,
        isPartialMovement,
    });

    const updatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const popoverWidth = 288;
        const popoverHeight = 160;

        const spaceBelow = window.innerHeight - rect.bottom;
        const placement = spaceBelow < popoverHeight + 20 && rect.top > popoverHeight + 20 ? 'top' : 'bottom';
        const top = placement === 'bottom' ? rect.bottom + 6 : rect.top - popoverHeight - 6;
        let left = rect.left + rect.width / 2 - popoverWidth / 2;
        left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));

        setCoords({ top, left, placement });
    }, []);

    const handleMouseEnter = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = setTimeout(() => {
            updatePosition();
            setIsOpen(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        closeTimerRef.current = setTimeout(() => {
            setIsOpen(false);
        }, 200);
    };

    const handleClick = (event: React.MouseEvent) => {
        event.stopPropagation();
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        if (!isOpen) {
            updatePosition();
            setIsOpen(true);
        } else {
            setIsOpen(false);
        }
    };

    useEffect(() => {
        if (!isOpen) return;
        const handleScrollOrResize = () => updatePosition();
        window.addEventListener('scroll', handleScrollOrResize, true);
        window.addEventListener('resize', handleScrollOrResize);
        return () => {
            window.removeEventListener('scroll', handleScrollOrResize, true);
            window.removeEventListener('resize', handleScrollOrResize);
        };
    }, [isOpen, updatePosition]);

    useEffect(() => {
        return () => {
            if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
            if (closeTimerRef.current) clearTimeout(closeTimerRef.current);
        };
    }, []);

    return (
        <div className="relative inline-flex items-center">
            <button
                ref={buttonRef}
                type="button"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                className={`flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-all active:scale-95 ${content.badgeColorClass}`}
                title={content.title}
                aria-label={content.title}
            >
                {isReversed ? (
                    <PackageX className="h-3.5 w-3.5" />
                ) : hasMovement ? (
                    <PackageCheck className="h-3.5 w-3.5" />
                ) : (
                    <Package className="h-3.5 w-3.5" />
                )}
            </button>

            {isOpen && coords && (
                <InventoryBadgePopover
                    coords={coords}
                    content={content}
                    isReturn={isReturn}
                    hasMovement={hasMovement}
                    isReversed={isReversed}
                    onClose={() => setIsOpen(false)}
                    onMouseEnter={() => {
                        if (closeTimerRef.current) {
                            clearTimeout(closeTimerRef.current);
                            closeTimerRef.current = null;
                        }
                    }}
                    onMouseLeave={handleMouseLeave}
                />
            )}
        </div>
    );
};

export default InventoryMovementBadge;
