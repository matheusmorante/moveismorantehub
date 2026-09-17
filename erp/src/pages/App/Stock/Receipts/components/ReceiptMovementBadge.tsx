import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Check, PackagePlus, RotateCcw } from 'lucide-react';
import { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { getReceiptBadgeContent } from './receiptBadgeContent';
import { ReceiptMovementBadgePopover } from './ReceiptMovementBadgePopover';

interface ReceiptMovementBadgeProps {
    readonly receipt: GoodsReceipt;
}

export const ReceiptMovementBadge: React.FC<ReceiptMovementBadgeProps> = ({ receipt }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [coords, setCoords] = useState<{ top: number; left: number; placement: 'top' | 'bottom' } | null>(null);
    const buttonRef = useRef<HTMLButtonElement>(null);
    const hoverTimerRef = useRef<number | null>(null);
    const closeTimerRef = useRef<number | null>(null);

    const isDraft = receipt.isDraft || receipt.status === 'draft';
    const isReversed = receipt.status === 'estornado';
    const hasMovement = !isDraft && !isReversed;

    const content = getReceiptBadgeContent(receipt);

    const updatePosition = useCallback(() => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const hasItems = Boolean(receipt.items && receipt.items.length > 0);
        const popoverWidth = Math.min(384, window.innerWidth - 24);
        const popoverHeight = hasItems ? 280 : 160;

        const spaceBelow = window.innerHeight - rect.bottom;
        const placement = spaceBelow < popoverHeight + 20 && rect.top > popoverHeight + 20 ? 'top' : 'bottom';
        const top = placement === 'bottom' ? rect.bottom + 6 : rect.top - popoverHeight - 6;
        let left = rect.left + rect.width / 2 - popoverWidth / 2;
        left = Math.max(12, Math.min(window.innerWidth - popoverWidth - 12, left));

        setCoords({ top, left, placement });
    }, [receipt.items]);

    const handleMouseEnter = () => {
        if (closeTimerRef.current) {
            clearTimeout(closeTimerRef.current);
            closeTimerRef.current = null;
        }
        if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current);
        hoverTimerRef.current = window.setTimeout(() => {
            updatePosition();
            setIsOpen(true);
        }, 500);
    };

    const handleMouseLeave = () => {
        if (hoverTimerRef.current) {
            clearTimeout(hoverTimerRef.current);
            hoverTimerRef.current = null;
        }
        closeTimerRef.current = window.setTimeout(() => {
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
        <div className="relative inline-flex items-center" onClick={(e) => e.stopPropagation()}>
            <button
                ref={buttonRef}
                type="button"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                onClick={handleClick}
                className={`relative flex h-6 w-6 items-center justify-center rounded-md border shadow-sm transition-all active:scale-95 cursor-pointer ${content.badgeColorClass}`}
                title={content.title}
                aria-label={content.title}
            >
                <PackagePlus className="h-3.5 w-3.5" />

                {isReversed ? (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-red-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                        <RotateCcw className="h-1.5 w-1.5 stroke-[3]" />
                    </span>
                ) : hasMovement ? (
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                        <Check className="h-2 w-2 stroke-[3]" />
                    </span>
                ) : null}
            </button>

            {isOpen && coords && (
                <ReceiptMovementBadgePopover
                    coords={coords}
                    content={content}
                    receipt={receipt}
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

export default ReceiptMovementBadge;
