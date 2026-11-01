import React from 'react';
import {
  canDeleteSupplier,
  getSupplierDeletionBlockers,
  type SupplierDeletionCounts,
} from '../../../../../../../shared-utils/supplierDeletion';

interface SupplierDeleteMenuItemProps {
  counts?: SupplierDeletionCounts;
  loading?: boolean;
  error?: boolean;
  onDelete: () => void;
}

const SupplierDeleteMenuItem: React.FC<SupplierDeleteMenuItemProps> = ({
  counts,
  loading = false,
  error = false,
  onDelete,
}) => {
  const enabled = !loading && !error && canDeleteSupplier(counts);
  const blockers = getSupplierDeletionBlockers(counts);
  const detail = error
    ? 'Não foi possível verificar. Recarregue a lista.'
    : loading || !counts
      ? 'Verificando vínculos…'
      : blockers.length
        ? `Remova: ${blockers.join(', ')}`
        : 'Nenhum vínculo encontrado';

  return (
    <button
      type="button"
      disabled={!enabled}
      aria-disabled={!enabled}
      onClick={(event) => {
        event.stopPropagation();
        if (enabled) onDelete();
      }}
      title={detail}
      className={`flex w-full items-start gap-3 border-t border-slate-50 px-4 py-2.5 text-left transition-colors dark:border-slate-800/50 ${
        enabled
          ? 'hover:bg-red-50 dark:hover:bg-red-955/20'
          : 'cursor-not-allowed opacity-60'
      }`}
    >
      <i className="bi bi-trash3-fill mt-0.5 text-red-500" />
      <span className="flex min-w-0 flex-col gap-0.5">
        <span className="text-[10px] font-black uppercase tracking-widest text-red-600 dark:text-red-400">
          Excluir fornecedor
        </span>
        <span className="text-[9px] font-medium normal-case tracking-normal text-slate-500 dark:text-slate-400">
          {detail}
        </span>
      </span>
    </button>
  );
};

export default SupplierDeleteMenuItem;
