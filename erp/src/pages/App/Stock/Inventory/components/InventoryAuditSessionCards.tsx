import React from 'react';
import type { InventoryAuditSession } from '../types/inventoryAudit.types';
import { AdjustmentBadge, StatusBadge } from './InventoryAuditBadges';
import { sumInventoryCountedQuantities } from '../../../../../../../shared-utils/inventorySupplierStages';

interface InventoryAuditSessionCardsProps {
  readonly sessions: readonly InventoryAuditSession[];
  readonly activeSession: InventoryAuditSession | null;
  readonly onOpen: (session: InventoryAuditSession) => void;
  readonly onOpenMenu: (
    event: React.MouseEvent<HTMLButtonElement>,
    session: InventoryAuditSession
  ) => void;
}

export const InventoryAuditSessionCards: React.FC<InventoryAuditSessionCardsProps> = ({
  sessions,
  activeSession,
  onOpen,
  onOpenMenu,
}) => (
  <div className="flex flex-col gap-2.5 xl:hidden">
    {!sessions.length && (
      <div className="rounded-2xl border border-slate-100 bg-white p-8 text-center text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        Nenhum inventário registrado ainda.
      </div>
    )}
    {sessions.map((session) => (
      <article
        key={session.id}
        className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm transition-colors hover:border-blue-200 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/60"
      >
        <div className="flex items-center gap-2 border-b border-slate-50 px-4 py-3 dark:border-slate-800/60">
          <button
            type="button"
            onClick={() => onOpen(session)}
            aria-label={`Abrir inventário #${session.inventoryCode || '---'}`}
            className="flex min-w-0 flex-1 items-center justify-between gap-2 text-left"
          >
            <span className="truncate text-sm font-black text-slate-800 dark:text-slate-100">
              <span className="text-slate-500 dark:text-slate-400">Inventário </span>
              #{session.inventoryCode || '---'}
            </span>
            <StatusBadge session={session} />
          </button>
          <button
            type="button"
            onClick={(event) => onOpenMenu(event, session)}
            className="shrink-0 p-1.5 text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
            title="Mais opções"
            aria-label="Mais opções"
            aria-haspopup="true"
            aria-expanded={activeSession?.id === session.id}
          >
            <i className="bi bi-three-dots-vertical text-sm" aria-hidden="true" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => onOpen(session)}
          className="block w-full px-4 py-3 text-left"
        >
          <div className="flex flex-col gap-1.5 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">
              {new Date(session.date).toLocaleDateString('pt-BR')} ·{' '}
              {new Date(session.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
            <span className="truncate text-xs text-slate-600 dark:text-slate-300 sm:text-right">
              <span className="font-bold text-slate-400">Responsável: </span>
              {session.responsibleName || 'Não informado'}
            </span>
          </div>

          <div className="mt-3 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800/60">
            <div className="min-w-0">
              <span className="block text-[10px] font-black uppercase tracking-wide text-slate-400">
                Quantidades contadas
              </span>
              <span className="text-base font-black text-slate-700 dark:text-slate-200">
                {(session.countedQuantityTotal ?? sumInventoryCountedQuantities(session.items)).toLocaleString('pt-BR')}
              </span>
            </div>
            <div className="min-w-0">
              <span className="mb-0.5 block text-[10px] font-black uppercase tracking-wide text-slate-400">
                Ajustes gerados
              </span>
              <AdjustmentBadge session={session} />
            </div>
          </div>
        </button>
      </article>
    ))}
  </div>
);
