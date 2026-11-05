import React from 'react';
import { ERPListPagination } from '@/components/shared/ERPListPagination';

export interface NcmPreview {
  sync_run_id: string;
  source_updated_at: string;
  source_total_count: number;
  source_valid_count: number;
  inserted_count: number;
  retired_count: number;
  changed_count: number;
  affected_products_count: number;
  expires_at: string;
}

export interface NcmPreviewChange {
  code: string;
  change_type: 'inserted' | 'retired' | 'changed';
  old_description: string | null;
  new_description: string | null;
  old_start_date: string | null;
  new_start_date: string | null;
  old_end_date: string | null;
  new_end_date: string | null;
  old_legal_act: string | null;
  new_legal_act: string | null;
}

interface NcmManagementSyncPreviewProps {
  preview: NcmPreview;
  lastSyncLabel: string;
  previewChangesOpen: boolean;
  previewChanges: NcmPreviewChange[];
  previewChangesPage: number;
  previewPageSize: number;
  previewChangesTotal: number;
  pageSizeOptions: readonly number[];
  isSyncing: boolean;
  isLoadingPreviewChanges: boolean;
  onToggleChanges: () => void;
  onCancel: () => void;
  onApply: () => void;
  onPageChange: (nextPage: number) => void;
  onPageSizeChange: (size: number) => void;
}

export function NcmManagementSyncPreview({
  preview,
  lastSyncLabel,
  previewChangesOpen,
  previewChanges,
  previewChangesPage,
  previewPageSize,
  previewChangesTotal,
  pageSizeOptions,
  isSyncing,
  isLoadingPreviewChanges,
  onToggleChanges,
  onCancel,
  onApply,
  onPageChange,
  onPageSizeChange,
}: NcmManagementSyncPreviewProps) {
  return (
    <div className="m-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-800 dark:bg-amber-950/20 md:p-5">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-start">
        <div>
          <h4 className="font-bold text-amber-900 dark:text-amber-200">
            Prévia da atualização oficial
          </h4>
          <p className="mt-1 text-xs text-amber-800 dark:text-amber-300">
            Base local: {lastSyncLabel} · Fonte obtida: {preview.source_updated_at} ·{' '}
            {preview.source_valid_count.toLocaleString('pt-BR')} códigos de oito dígitos.
          </p>
          <div className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 text-xs text-amber-900 dark:text-amber-200 md:grid-cols-4">
            <span>
              Novos: <b>{preview.inserted_count}</b>
            </span>
            <span>
              Encerrados: <b>{preview.retired_count}</b>
            </span>
            <span>
              Alterados: <b>{preview.changed_count}</b>
            </span>
            <span>
              Produtos afetados: <b>{preview.affected_products_count}</b>
            </span>
          </div>
          <button
            type="button"
            disabled={isLoadingPreviewChanges}
            onClick={onToggleChanges}
            className="mt-3 text-xs font-bold text-amber-900 underline underline-offset-2 disabled:opacity-50 dark:text-amber-200"
          >
            {previewChangesOpen ? 'Ocultar mudanças' : 'Abrir lista de mudanças'}
          </button>
        </div>
        <div className="flex shrink-0 gap-2">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSyncing}
            className="rounded-xl border border-amber-300 px-3 py-2 text-xs font-bold text-amber-900 dark:border-amber-700 dark:text-amber-200"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={onApply}
            disabled={isSyncing}
            className="rounded-xl bg-amber-600 px-3 py-2 text-xs font-bold text-white disabled:opacity-60"
          >
            {isSyncing ? 'Aplicando...' : 'Confirmar atualização'}
          </button>
        </div>
      </div>
      {previewChangesOpen && (
        <div className="mt-4 rounded-xl border border-amber-200 bg-white/80 p-3 dark:border-amber-900 dark:bg-slate-900/70">
          {previewChanges.length === 0 ? (
            <p className="text-xs text-slate-500">Nenhuma mudança identificada.</p>
          ) : (
            <div className="max-h-72 space-y-2 overflow-y-auto">
              {previewChanges.map((change) => (
                <div
                  key={change.code}
                  className="rounded-lg border border-slate-200 p-2 text-xs dark:border-slate-700"
                >
                  <p className="font-bold text-slate-800 dark:text-slate-100">
                    <span className="font-mono">{change.code}</span> ·{' '}
                    {change.change_type === 'inserted'
                      ? 'Novo'
                      : change.change_type === 'retired'
                        ? 'Encerrado'
                        : 'Alterado'}
                  </p>
                  {change.old_description !== change.new_description && (
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      Descrição: {change.old_description || '—'} → {change.new_description || '—'}
                    </p>
                  )}
                  {(change.old_start_date !== change.new_start_date ||
                    change.old_end_date !== change.new_end_date) && (
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      Vigência: {change.old_start_date || '—'} a {change.old_end_date || '—'} →{' '}
                      {change.new_start_date || '—'} a {change.new_end_date || '—'}
                    </p>
                  )}
                  {change.old_legal_act !== change.new_legal_act && (
                    <p className="mt-1 text-slate-600 dark:text-slate-300">
                      Ato: {change.old_legal_act || '—'} → {change.new_legal_act || '—'}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
          <ERPListPagination
            ariaLabel="Paginação das mudanças da sincronização NCM"
            page={previewChangesPage + 1}
            pageSize={previewPageSize}
            totalItems={previewChangesTotal}
            onPageChange={onPageChange}
            onPageSizeChange={onPageSizeChange}
            pageSizeOptions={pageSizeOptions}
            preferenceKey="ncm-preview"
            itemLabel="mudanças"
            loading={isLoadingPreviewChanges}
            className="mt-3"
          />
        </div>
      )}
    </div>
  );
}
