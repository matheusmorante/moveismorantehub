import React from 'react';
import { Metric } from './NcmManagementPanelIndicators';

export interface NcmSummary {
  active_count: number;
  recent_changes_count: number;
  retired_with_products_count: number;
  products_to_review_count: number;
  last_sync: null | {
    completed_at: string;
    source_updated_at: string;
    status: string;
    source_valid_count: number;
  };
}

export interface StoreSummary {
  total_count: number;
  active_count: number;
  inactive_count: number;
}

interface NcmCatalogSummaryProps {
  canManage: boolean;
  isSyncing: boolean;
  summary: NcmSummary | null;
  storeSummary: StoreSummary | null;
  lastSyncLabel: string;
  onRequestSync: () => void;
}

export function NcmCatalogSummary({
  canManage,
  isSyncing,
  summary,
  storeSummary,
  lastSyncLabel,
  onRequestSync,
}: NcmCatalogSummaryProps) {
  return (
    <header className="border-b border-slate-200 bg-slate-50/70 p-5 dark:border-slate-800 dark:bg-slate-800/20 md:p-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h3 className="flex items-center gap-2 text-base font-bold text-slate-800 dark:text-slate-100">
            <i className="bi bi-journal-check text-blue-500" /> Gestão da tabela NCM
          </h3>
          <p className="mt-1 max-w-3xl text-xs text-slate-500 dark:text-slate-400">
            Consulta local da tabela Classif/Siscomex. NCMs antigos permanecem no histórico;
            alterações cadastrais só são aplicadas após revisão.
          </p>
        </div>
        {canManage && (
          <button
            type="button"
            onClick={onRequestSync}
            disabled={isSyncing}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-blue-500/20 transition hover:bg-blue-700 disabled:cursor-wait disabled:opacity-60"
          >
            {isSyncing ? (
              <>
                <i className="bi bi-arrow-repeat animate-spin" /> Consultando fonte...
              </>
            ) : (
              <>
                <i className="bi bi-cloud-download" /> Atualizar tabela oficial
              </>
            )}
          </button>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-2 lg:grid-cols-4">
        <Metric label="NCMs ativos na loja" value={storeSummary?.active_count} />
        <Metric label="NCMs desativados na loja" value={storeSummary?.inactive_count} warning />
        <Metric label="NCMs vigentes" value={summary?.active_count} />
        <Metric label="Mudanças em 30 dias" value={summary?.recent_changes_count} />
        <Metric
          label="Encerrados com produtos"
          value={summary?.retired_with_products_count}
          warning
        />
        <Metric label="Produtos pendentes" value={summary?.products_to_review_count} warning />
      </div>
      <p className="mt-3 text-[11px] text-slate-500 dark:text-slate-400">
        Última sincronização: {lastSyncLabel}
      </p>
    </header>
  );
}
