import React from 'react';
import { formatCurrency } from '@/pages/utils/formatters';

interface CardPriceStockProps {
    readonly hasPromo: boolean;
    readonly unitPrice: number;
    readonly currentPrice: number;
    readonly itemType?: string;
    readonly isLowStock: boolean;
    readonly stock?: number;
    readonly unit?: string;
}

export const CardPriceStock: React.FC<CardPriceStockProps> = ({
    hasPromo,
    unitPrice,
    currentPrice,
    itemType,
    isLowStock,
    stock,
    unit
}) => {
    return (
        <div className="flex justify-between items-end border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
            <div className="flex flex-col">
                {hasPromo && (
                    <span className="text-[10px] text-red-500 dark:text-red-400 line-through font-bold leading-tight">
                        {formatCurrency(unitPrice || 0)}
                    </span>
                )}
                <span className="text-base font-black text-blue-600 dark:text-blue-400">
                    {formatCurrency(currentPrice)}
                </span>
            </div>

            {itemType !== 'service' && (
                <div className="flex flex-col items-end">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5 text-right">
                        Estoque
                    </span>
                    <div className="flex items-baseline gap-1">
                        <span className={`text-sm font-black ${isLowStock ? 'text-red-500 dark:text-red-400' : 'text-slate-700 dark:text-slate-200'}`}>
                            {stock ?? 0}
                        </span>
                        <span className="text-[9px] text-slate-400 dark:text-slate-600 font-bold uppercase">
                            {unit}
                        </span>
                    </div>
                </div>
            )}
        </div>
    );
};
