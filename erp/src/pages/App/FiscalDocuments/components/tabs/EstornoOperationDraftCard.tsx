import type { FiscalOperationDraftSummary } from '../../types/fiscalDocuments.types';
import { formatFiscalDateTime } from '../../utils/fiscalPresentationHelpers';

interface EstornoOperationDraftCardProps {
  draft: FiscalOperationDraftSummary;
}

export function EstornoOperationDraftCard({ draft }: EstornoOperationDraftCardProps) {
  const draftStatusLabel =
    ({
      draft: 'Em elaboração',
      ready: 'Pronto para transmissão',
      authorized: 'Autorizado',
      cancelled: 'Cancelado',
      transmitting: 'Em transmissão',
      unknown: 'Confirmação pendente',
      rejected: 'Rejeitado',
    } as Record<string, string>)[draft.status] || draft.status;

  return (
    <div className="rounded-2xl border border-indigo-200 bg-indigo-50/50 p-4 shadow-sm dark:border-indigo-900/60 dark:bg-indigo-950/30 sm:p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-900/60 dark:text-indigo-300">
            <i className="bi bi-clock-history text-base" />
          </span>
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Rascunho de NF-e de Estorno Fiscal (Modelo 55)
            </h4>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">
              Preparado em: {formatFiscalDateTime(draft.created_at)} ·{' '}
              {draft.environment === 2 ? 'Homologação' : 'Produção'}
            </span>
          </div>
        </div>

        <span className="rounded-full bg-indigo-100 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-800 dark:bg-indigo-900/60 dark:text-indigo-300">
          {draftStatusLabel}
        </span>
      </div>

      {draft.reason && (
        <div className="mt-3 rounded-xl border border-indigo-100 bg-white/80 p-3 text-xs dark:border-indigo-900/40 dark:bg-slate-900/60">
          <span className="font-bold text-slate-700 dark:text-slate-300">Motivação:</span>
          <p className="mt-1 text-slate-600 dark:text-slate-400">{draft.reason}</p>
        </div>
      )}
    </div>
  );
}
