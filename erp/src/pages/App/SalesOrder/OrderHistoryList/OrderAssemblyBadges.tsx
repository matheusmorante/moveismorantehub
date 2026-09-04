import React from "react";
import { Drill } from "@/components/shared/DrillIcon";

interface OrderAssemblyBadgesProps {
    hasAssemblyDepot: boolean;
    hasAssemblyOutside: boolean;
    size?: 'sm' | 'md';
}

export const OrderAssemblyBadges = ({
    hasAssemblyDepot,
    hasAssemblyOutside,
    size = 'sm',
}: OrderAssemblyBadgesProps) => {
    if (!hasAssemblyDepot && !hasAssemblyOutside) return null;

    const boxSize = size === 'md' ? 'h-7 w-7' : 'h-6 w-6';
    const iconSize = size === 'md' ? 14 : 12;

    return (
        <div className="flex items-center gap-1">
            {hasAssemblyDepot && (
                <div
                    className={`flex ${boxSize} items-center justify-center rounded-md bg-blue-600 text-white border border-blue-700 shadow-2xs`}
                    title="Montagem no Depósito (antes da entrega/retirada)"
                >
                    <Drill size={iconSize} className="text-white fill-white" />
                </div>
            )}
            {hasAssemblyOutside && (
                <div
                    className={`flex ${boxSize} items-center justify-center rounded-md bg-indigo-600 text-white border border-indigo-700 shadow-2xs`}
                    title="Montagem Fora (na casa do cliente)"
                >
                    <Drill size={iconSize} className="text-white fill-white" />
                </div>
            )}
        </div>
    );
};
