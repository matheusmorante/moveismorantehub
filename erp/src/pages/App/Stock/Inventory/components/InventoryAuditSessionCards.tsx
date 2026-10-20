import React from 'react';
import type { InventoryAuditSession } from '../types/inventoryAudit.types';
import { AdjustmentBadge, StatusBadge } from './InventoryAuditBadges';

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
  <div className="flex flex-col gap-3 xl:hidden">
    {!sessions.length && (
      <div className="rounded-2xl border border-slate-100 bg-white p-12 text-center text-sm font-bold text-slate-400 dark:border-slate-800 dark:bg-slate-900">
        Nenhum inventário registrado ainda.
      </div>
    )}
    {sessions.map((session) => (
      <button
        key={session.id}
        type="button"
        onClick={() => onOpen(session)}
        className="group w-full cursor-pointer overflow-hidden rounded-2xl border border-slate-100 bg-white text-left shadow-sm transition-all duration-200 hover:border-blue-200 hover:shadow-md dark:border-slate-800 dark:bg-slate-900 dark:hover:border-blue-900/60"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-50 px-5 pb-4 pt-5 dark:border-slate-800/60">
          <div className="flex min-w-0 flex-col gap-1">
            <span className="text-xs font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
              Inventário
            </span>
            <span className="font-mono text-base font-black text-slate-800 transition-colors group-hover:text-blue-600 dark:text-slate-100 dark:group-hover:text-blue-400">
              #{session.inventoryCode || '---'}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2 pt-0.5">
            <StatusBadge status={session.status} />
            <button
              type="button"
              onClick={(event) => onOpenMenu(event, session)}
              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
              title="Mais opções"
              aria-label="Mais opções"
              aria-haspopup="true"
              aria-expanded={activeSession?.id === session.id}
            >
              <i className="bi bi-three-dots-vertical text-sm" aria-hidden="true" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-50 dark:divide-slate-800/60">
          <div className="flex flex-col gap-0.5 px-5 py-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Data
            </span>
            <span className="text-sm font-bold leading-snug text-slate-700 dark:text-slate-200">
              {new Date(session.date).toLocaleDateString('pt-BR')}
            </span>
            <span className="text-xs text-slate-400">
              {new Date(session.date).toLocaleTimeString('pt-BR', {
                hour: '2-digit',
                minute: '2-digit',
              })}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-5 py-4">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Responsável
            </span>
            <span className="truncate text-sm font-bold leading-snug text-slate-700 dark:text-slate-200">
              {session.responsibleName || 'Não informado'}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-slate-100 border-t border-slate-50 bg-slate-50/50 dark:divide-slate-800/60 dark:border-slate-800/60 dark:bg-slate-800/20">
          <div className="flex flex-col gap-0.5 px-5 py-3.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Produtos contados
            </span>
            <span className="text-lg font-black text-slate-700 dark:text-slate-200">
              {session.productsCount}
            </span>
          </div>
          <div className="flex flex-col gap-0.5 px-5 py-3.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Ajustes gerados
            </span>
            <AdjustmentBadge session={session} />
          </div>
        </div>
      </button>
    ))}
  </div>
);
