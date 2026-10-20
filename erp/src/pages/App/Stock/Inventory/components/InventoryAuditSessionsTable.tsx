import React from 'react';
import type { InventoryAuditSession } from '../types/inventoryAudit.types';
import { AdjustmentBadge, StatusBadge } from './InventoryAuditBadges';

interface InventoryAuditSessionsTableProps {
  readonly sessions: readonly InventoryAuditSession[];
  readonly activeSession: InventoryAuditSession | null;
  readonly onOpen: (session: InventoryAuditSession) => void;
  readonly onOpenMenu: (
    event: React.MouseEvent<HTMLButtonElement>,
    session: InventoryAuditSession
  ) => void;
}

export const InventoryAuditSessionsTable: React.FC<InventoryAuditSessionsTableProps> = ({
  sessions,
  activeSession,
  onOpen,
  onOpenMenu,
}) => (
  <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 xl:block">
    <table className="w-full border-collapse whitespace-nowrap text-left">
      <thead>
        <tr className="border-b border-slate-100 bg-slate-50 dark:border-slate-800 dark:bg-slate-955">
          <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Inventário
          </th>
          <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Data e horário
          </th>
          <th scope="col" className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400">
            Responsável
          </th>
          <th scope="col" className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            Status
          </th>
          <th scope="col" className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            Produtos contados
          </th>
          <th scope="col" className="px-8 py-5 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
            Ajustes gerados
          </th>
          <th scope="col" className="px-8 py-5 text-right text-[10px] font-black uppercase tracking-widest text-slate-400">
            Ações
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
        {sessions.map((session) => (
          <tr
            key={session.id}
            onClick={() => onOpen(session)}
            className="cursor-pointer transition-colors hover:bg-slate-50/50 dark:hover:bg-slate-800/20"
          >
            <td className="px-8 py-5 font-mono text-sm font-black text-slate-800 dark:text-slate-100">
              Inventário #{session.inventoryCode || '---'}
            </td>
            <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">
              {new Date(session.date).toLocaleString('pt-BR')}
            </td>
            <td className="px-8 py-5 text-sm font-bold text-slate-700 dark:text-slate-200">
              {session.responsibleName || 'Não informado'}
            </td>
            <td className="px-8 py-5 text-center">
              <StatusBadge status={session.status} />
            </td>
            <td className="px-8 py-5 text-center text-sm font-black text-slate-600 dark:text-slate-300">
              {session.productsCount}
            </td>
            <td className="px-8 py-5">
              <div className="flex items-center justify-center gap-2">
                <AdjustmentBadge session={session} />
              </div>
            </td>
            <td className="px-8 py-5 text-right">
              <button
                type="button"
                onClick={(event) => onOpenMenu(event, session)}
                className="cursor-pointer rounded-lg p-2 text-slate-500 transition-colors hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Mais opções"
                aria-label="Mais opções"
                aria-haspopup="true"
                aria-expanded={activeSession?.id === session.id}
              >
                <i className="bi bi-three-dots-vertical" aria-hidden="true" />
              </button>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
    {!sessions.length && (
      <div className="p-20 text-center text-sm font-bold text-slate-400">
        Nenhum inventário registrado ainda.
      </div>
    )}
  </div>
);
