import React from 'react';
import type { InventorySnapshotItem, InventoryAuditSession } from './types/inventoryAudit.types';
import { ActionConfirmModal } from './modals/ActionConfirmModal';
import { InventoryAuditContextMenu } from './components/InventoryAuditContextMenu';
import { InventoryAuditSessionCards } from './components/InventoryAuditSessionCards';
import { InventoryAuditSessionsTable } from './components/InventoryAuditSessionsTable';
import { useInventoryAuditSessions } from './hooks/useInventoryAuditSessions';
import { FixedPageSlots } from '@/components/shared/FixedPageSlots';

interface InventoryAuditProps {
  readonly onCopy: (items: readonly InventorySnapshotItem[]) => void;
  readonly onOpen: (session: InventoryAuditSession) => void;
}

export const InventoryAudit: React.FC<InventoryAuditProps> = ({ onCopy, onOpen }) => {
  const {
    sessions,
    loading,
    activeSession,
    menuPos,
    confirmAction,
    setConfirmAction,
    handleOpenMenu,
    closeMenu,
    deleteDraft,
    handleToggleAdjustments,
    periodDays,
    setPeriodDays,
    page,
    setPage,
    pageCount,
  } = useInventoryAuditSessions();

  if (loading) {
    return (
      <div className="p-20 text-center text-[10px] font-black uppercase tracking-widest text-slate-400">
        Carregando inventários...
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-100 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
        <label className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-slate-400">
          <i className="bi bi-calendar3 text-blue-500" />
          Período
          <select
            value={periodDays}
            onChange={(event) => setPeriodDays(Number(event.target.value))}
            className="rounded-lg border border-slate-200 bg-transparent px-2 py-1.5 text-[10px] font-bold text-slate-700 outline-none dark:border-slate-700 dark:text-slate-200"
          >
            <option value={30}>Últimos 30 dias</option>
            <option value={90}>Últimos 90 dias</option>
            <option value={365}>Último ano</option>
            <option value={0}>Todos os períodos</option>
          </select>
        </label>
        <div className="flex flex-col items-center gap-2 sm:flex-row">
          <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
            Página {page} de {pageCount}
          </span>
          <FixedPageSlots
            ariaLabel="Paginação de inventários"
            currentPage={page}
            totalPages={pageCount}
            onPageChange={setPage}
          />
        </div>
      </div>
      <InventoryAuditSessionCards
        sessions={sessions}
        activeSession={activeSession}
        onOpen={onOpen}
        onOpenMenu={handleOpenMenu}
      />
      <InventoryAuditSessionsTable
        sessions={sessions}
        activeSession={activeSession}
        onOpen={onOpen}
        onOpenMenu={handleOpenMenu}
      />

      <InventoryAuditContextMenu
        activeSession={activeSession}
        menuPos={menuPos}
        onClose={closeMenu}
        onOpen={onOpen}
        onCopy={onCopy}
        onDeleteDraft={deleteDraft}
        onConfirmReversal={(session, type) => setConfirmAction({ session, type })}
      />

      <ActionConfirmModal
        isOpen={!!confirmAction}
        actionType={confirmAction?.type ?? null}
        inventoryCode={confirmAction?.session.inventoryCode || ''}
        onConfirm={handleToggleAdjustments}
        onCancel={() => setConfirmAction(null)}
      />
    </>
  );
};

export default InventoryAudit;
