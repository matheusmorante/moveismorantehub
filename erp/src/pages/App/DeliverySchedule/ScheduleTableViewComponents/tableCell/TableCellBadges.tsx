import React from 'react';
import ReturnIcon from '@/components/shared/ReturnIcon';
import PickupIcon from '@/components/shared/PickupIcon';
import { Drill } from '@/components/shared/DrillIcon';

interface TableCellBadgesProps {
  isAssembly: boolean;
  isAssemblyOutside: boolean;
  isOnlyInternalAssembly: boolean;
  isAssistance: boolean;
  isPickup: boolean;
  orderType?: string;
  isAssemblyTask: boolean;
}

export const TableCellBadges: React.FC<TableCellBadgesProps> = ({
  isAssembly,
  isAssemblyOutside,
  isOnlyInternalAssembly,
  isAssistance,
  isPickup,
  orderType,
  isAssemblyTask,
}) => (
  <div className="flex items-center gap-1.5 flex-wrap">
    {(!isAssembly || (!isAssemblyOutside && !isOnlyInternalAssembly)) && (
      <div
        className={`flex h-6 w-6 items-center justify-center ${
          orderType === 'return'
            ? ''
            : `rounded-md text-white border border-white/20 shadow-2xs ${
                isAssistance
                  ? 'bg-orange-500 border-orange-600'
                  : isPickup
                    ? 'bg-purple-600 border-purple-700'
                    : 'bg-emerald-600 border-emerald-700'
              }`
        }`}
        title={
          isAssistance
            ? 'Assistência Técnica'
            : isPickup
              ? 'Retirada na Loja'
              : orderType === 'return'
                ? 'Devolução'
                : 'Entrega'
        }
      >
        {orderType === 'return' ? (
          <ReturnIcon className="h-6 w-6" />
        ) : isAssistance ? (
          <i className="bi bi-tools text-[11px] text-white" />
        ) : isPickup ? (
          <PickupIcon white className="h-3.5 w-3.5" />
        ) : (
          <i className="bi bi-truck text-[11px] text-white" />
        )}
      </div>
    )}

    {/* Selo Montagem Depósito */}
    {(isAssemblyTask || isOnlyInternalAssembly) && (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white border border-amber-600 shadow-2xs"
        title="Montagem Depósito (antes da entrega/retirada)"
      >
        <Drill size={12} className="text-white fill-white" />
      </div>
    )}

    {/* Selo Montagem Fora */}
    {isAssemblyOutside && (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-white border border-red-700 shadow-2xs"
        title="Montagem Fora (na casa do cliente)"
      >
        <Drill size={12} className="text-white fill-white" />
      </div>
    )}
  </div>
);
