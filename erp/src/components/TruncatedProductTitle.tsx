import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { renderHighlightedProductText } from './productAutocompleteUtils';

interface TruncatedProductTitleProps {
    fullName: string;
    displayName: string;
    query: string;
    className?: string;
}

export const TruncatedProductTitle: React.FC<TruncatedProductTitleProps> = ({
    fullName,
    displayName,
    query,
    className = 'text-xs font-bold text-slate-800 dark:text-slate-100 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors truncate block',
}) => {
    const textRef = useRef<HTMLSpanElement>(null);
    const [tooltipState, setTooltipState] = useState<{
        visible: boolean;
        coords: { top: number; left: number };
    } | null>(null);

    const handleMouseEnter = () => {
        const el = textRef.current;
        if (!el) return;

        // Detecta se o texto está cortado/truncado com reticências (...) no navegador
        const isTruncated = el.scrollWidth > el.clientWidth;
        if (!isTruncated) {
            setTooltipState(null);
            return;
        }

        const rect = el.getBoundingClientRect();
        const tooltipHeight = 36;
        const placeAbove = rect.top >= tooltipHeight + 8;
        const top = placeAbove ? rect.top - tooltipHeight : rect.bottom + 6;
        const left = Math.max(12, Math.min(rect.left, window.innerWidth - 320));

        setTooltipState({
            visible: true,
            coords: { top, left },
        });
    };

    const handleMouseLeave = () => {
        setTooltipState(null);
    };

    useEffect(() => {
        if (!tooltipState?.visible) return;
        const hide = () => setTooltipState(null);
        window.addEventListener('scroll', hide, true);
        window.addEventListener('resize', hide);
        return () => {
            window.removeEventListener('scroll', hide, true);
            window.removeEventListener('resize', hide);
        };
    }, [tooltipState?.visible]);

    const labelToShow = fullName || displayName;

    return (
        <>
            <span
                ref={textRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                title={tooltipState?.visible ? labelToShow : undefined}
                className={className}
            >
                {renderHighlightedProductText(displayName, query)}
            </span>
            {tooltipState?.visible && typeof document !== 'undefined' && createPortal(
                <div
                    role="tooltip"
                    className="fixed z-[100000000] pointer-events-none rounded-xl bg-slate-900/95 dark:bg-slate-800/95 backdrop-blur-xs border border-slate-700/60 px-3 py-1.5 text-xs font-semibold text-white shadow-2xl max-w-sm whitespace-normal break-words animate-in fade-in zoom-in-95 duration-100"
                    style={{
                        top: tooltipState.coords.top,
                        left: tooltipState.coords.left,
                    }}
                >
                    {labelToShow}
                </div>,
                document.body
            )}
        </>
    );
};

export default TruncatedProductTitle;
