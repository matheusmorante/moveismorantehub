import type { NfeDocumentRecord } from '../../types/fiscalDocuments.types';

export function getFiscalDocumentStatusBadgeClass(
  status: NfeDocumentRecord['status'],
): string {
  if (status === 'autorizada' || status === 'homologada') {
    return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300';
  }

  if (status === 'cancelada') {
    return 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300';
  }

  return 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300';
}
