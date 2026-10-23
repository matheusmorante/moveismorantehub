import React from 'react';
import type { InventoryAuditSession } from '../types/inventoryAudit.types';

export const StatusBadge: React.FC<{ session: InventoryAuditSession }> = ({ session }) => {
  const isReversed =
    session.adjustmentsCount > 0 && session.reversedCount >= session.adjustmentsCount;
  const colors = isReversed
    ? 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/20 dark:text-rose-400 dark:border-rose-900/30'
    : session.status !== 'completed'
      ? 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/20 dark:text-amber-400 dark:border-amber-900/30'
      : 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/20 dark:text-emerald-400 dark:border-emerald-900/30';
  const dotColor = isReversed
    ? 'bg-rose-500'
    : session.status !== 'completed'
      ? 'bg-amber-500'
      : 'bg-emerald-500';
  const label = isReversed
    ? 'Estornado'
    : session.status === 'pending'
      ? 'Aguardando envio'
      : session.status === 'in_progress'
        ? 'Em andamento'
        : 'Concluído';

  return (
    <span
      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-wider border ${colors}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label}
    </span>
  );
};

export const AdjustmentBadge: React.FC<{ session: InventoryAuditSession }> = ({ session }) => (
  <div className="flex items-center gap-1.5">
    <strong
      className={`text-sm font-black ${session.reversedCount > 0 ? 'text-rose-500' : 'text-emerald-600 dark:text-emerald-400'}`}
    >
      {session.adjustmentsCount}
    </strong>
    <span
      className={`rounded-full px-2 py-0.5 text-[9px] font-black uppercase tracking-wider ${
        session.reversedCount > 0
          ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30'
          : session.adjustmentsCount > 0
            ? 'bg-emerald-50 text-emerald-600'
            : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
      }`}
    >
      {session.status === 'pending'
        ? 'Envio pendente'
        : session.status === 'in_progress'
          ? 'Pendente'
          : session.reversedCount > 0
            ? 'Estornado'
            : session.adjustmentsCount > 0
              ? 'Lançado'
              : 'Sem ajuste'}
    </span>
  </div>
);
