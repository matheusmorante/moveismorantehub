import React from 'react';
import { StatusPill } from './NcmManagementPanelIndicators';

export interface NcmRow {
  code: string;
  official_description: string;
  active: boolean;
  is_active: boolean;
  start_date: string | null;
  end_date: string | null;
  legal_act: string | null;
  changed_at: string | null;
  product_count: number;
  is_unverified: boolean;
}

export function getNcmStatus(row: Pick<NcmRow, 'active' | 'start_date' | 'is_unverified'>) {
  if (row.is_unverified) return 'Não verificado';
  if (row.start_date && new Date(`${row.start_date}T00:00:00`) > new Date()) return 'Futuro';
  return row.active ? 'Vigente' : 'Encerrado';
}

interface Props {
  rows: NcmRow[];
  isLoading: boolean;
  canManage: boolean;
  onOpenDetails: (row: NcmRow) => void;
  onToggleStoreActivation: (row: NcmRow) => void;
}

export function NcmCatalogResults({
  rows,
  isLoading,
  canManage,
  onOpenDetails,
  onToggleStoreActivation,
}: Props) {
  return (
    <>
      <div className="mt-4 space-y-2 md:hidden">
        {isLoading ? (
          <p className="rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">
            Carregando NCMs...
          </p>
        ) : rows.length === 0 ? (
          <p className="rounded-xl border border-slate-200 p-5 text-center text-xs text-slate-400 dark:border-slate-800">
            Nenhum código corresponde aos filtros.
          </p>
        ) : (
          rows.map((row) => {
            const status = getNcmStatus(row);
            return (
              <article
                key={row.code}
                className={`rounded-xl border p-3 ${status === 'Encerrado' && row.product_count > 0 ? 'border-rose-200 bg-rose-50/60 dark:border-rose-900 dark:bg-rose-950/10' : status === 'Não verificado' ? 'border-amber-200 bg-amber-50/60 dark:border-amber-900 dark:bg-amber-950/10' : 'border-slate-200 dark:border-slate-800'}`}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm font-bold text-slate-800 dark:text-slate-100">
                    {row.code}
                  </span>
                  <StatusPill status={status} />
                </div>
                <p className="mt-2 text-xs text-slate-600 dark:text-slate-300">
                  {row.official_description}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-[10px] text-slate-500">
                    {row.product_count} produto(s)
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenDetails(row)}
                    className="rounded-lg px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                  >
                    Detalhes
                  </button>
                </div>
                <p className="mt-2 text-[10px] font-bold">
                  Uso na loja: {row.is_active ? 'Ativo' : 'Desativado'}
                </p>
                {canManage && !row.is_unverified && (
                  <button
                    type="button"
                    disabled={!row.is_active && (!row.active || getNcmStatus(row) !== 'Vigente')}
                    onClick={() => onToggleStoreActivation(row)}
                    className="mt-2 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-blue-700 disabled:opacity-50 dark:border-slate-700 dark:text-blue-300"
                  >
                    {row.is_active ? 'Desativar na loja' : 'Ativar na loja'}
                  </button>
                )}
              </article>
            );
          })
        )}
      </div>
      <div className="mt-4 hidden overflow-x-auto rounded-2xl border border-slate-200 dark:border-slate-800 md:block">
        <table className="w-full min-w-[700px] border-collapse text-left text-xs">
          <thead className="bg-slate-50 text-[10px] uppercase tracking-wider text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">NCM</th>
              <th className="px-4 py-3">Descrição oficial</th>
              <th className="px-4 py-3">Situação oficial</th>
              <th className="px-4 py-3">Uso na loja</th>
              <th className="px-4 py-3 text-right">Produtos</th>
              <th className="px-4 py-3 text-right">Detalhes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  <i className="bi bi-arrow-repeat animate-spin mr-2" />
                  Carregando NCMs...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  Nenhum código corresponde aos filtros.
                </td>
              </tr>
            ) : (
              rows.map((row) => {
                const status = getNcmStatus(row);
                return (
                  <tr
                    key={row.code}
                    className={
                      status === 'Encerrado' && row.product_count > 0
                        ? 'bg-rose-50/60 dark:bg-rose-950/10'
                        : status === 'Não verificado'
                          ? 'bg-amber-50/60 dark:bg-amber-950/10'
                          : 'hover:bg-slate-50/70 dark:hover:bg-slate-800/30'
                    }
                  >
                    <td className="whitespace-nowrap px-4 py-3 font-mono font-bold text-slate-800 dark:text-slate-100">
                      {row.code}
                    </td>
                    <td className="max-w-xl px-4 py-3 text-slate-600 dark:text-slate-300">
                      {row.official_description}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill status={status} />
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-[10px] font-bold ${row.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
                      >
                        {row.is_active ? 'Ativo' : 'Desativado'}
                      </span>
                      {canManage && !row.is_unverified && (
                        <button
                          type="button"
                          disabled={!row.is_active && status !== 'Vigente'}
                          onClick={() => onToggleStoreActivation(row)}
                          className="ml-2 text-[10px] font-bold text-blue-600 underline disabled:opacity-50"
                        >
                          {row.is_active ? 'Desativar' : 'Ativar'}
                        </button>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-700 dark:text-slate-300">
                      {row.product_count}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        type="button"
                        onClick={() => onOpenDetails(row)}
                        className="rounded-lg px-3 py-1.5 font-bold text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/40"
                      >
                        Abrir
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
