import React from 'react';
import ReturnIcon from '@/components/shared/ReturnIcon';
import PickupIcon from '@/components/shared/PickupIcon';
import { Drill } from '@/components/shared/DrillIcon';
import type { ResolvedScheduleOption } from '../../../../../../../shared-utils/commercialScheduling';

interface CardHeaderBadgesProps {
  orderType?: string;
  isAssistance: boolean;
  isPickup: boolean;
  hasInternalAssembly: boolean;
  hasOutsideAssembly: boolean;
  isAssemblyTask: boolean;
  isUsingAlternative: boolean;
  activeOption: ResolvedScheduleOption | null;
}

export const CardHeaderBadges: React.FC<CardHeaderBadgesProps> = ({
  orderType,
  isAssistance,
  isPickup,
  hasInternalAssembly,
  hasOutsideAssembly,
  isAssemblyTask,
  isUsingAlternative,
  activeOption,
}) => (
  <div className="flex items-center flex-wrap gap-1.5">
    {/* Selo Operacional Primário (Entrega / Retirada / Assistência / Devolução) */}
    <div
      className={`flex h-6 w-6 items-center justify-center ${
        orderType === 'return'
          ? ''
          : `rounded-md text-white border border-white/20 shadow-2xs ${
              isAssistance
                ? 'bg-amber-500 border-amber-600'
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
        <ReturnIcon className="h-6 w-6 text-orange-500" />
      ) : isAssistance ? (
        <i className="bi bi-tools text-[11px] text-white" />
      ) : isPickup ? (
        <PickupIcon white className="h-3.5 w-3.5" />
      ) : (
        <i className="bi bi-truck text-[11px] text-white" />
      )}
    </div>

    {/* Selo Montagem Depósito */}
    {(hasInternalAssembly || (isAssemblyTask && !hasOutsideAssembly)) && (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500 text-white border border-amber-600 shadow-2xs"
        title="Montagem Depósito (antes da entrega/retirada)"
      >
        <Drill size={12} className="text-white fill-white" />
      </div>
    )}

    {/* Selo Montagem Fora */}
    {hasOutsideAssembly && (
      <div
        className="flex h-6 w-6 items-center justify-center rounded-md bg-red-600 text-white border border-red-700 shadow-2xs"
        title="Montagem Fora (na casa do cliente)"
      >
        <Drill size={12} className="text-white fill-white" />
      </div>
    )}

    {/* Selo Alternativo no Card do Cronograma */}
    {isUsingAlternative && activeOption && (
      <span
        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider bg-amber-500 text-white shadow-2xs border border-amber-600"
        title={`Agendamento alternativo em vigor: ${activeOption.formattedDate}`}
      >
        <i className="bi bi-arrow-repeat text-[10px]" />
        ALTERNATIVO • {activeOption.label}
      </span>
    )}
  </div>
);
