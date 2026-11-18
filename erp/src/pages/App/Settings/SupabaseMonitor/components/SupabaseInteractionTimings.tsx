import React from 'react';
import type { InteractionTimingRow } from '../types/supabaseMonitor.types';

interface Props {
  rows: InteractionTimingRow[];
}

const SALE_BUCKET_LABELS = [
  { key: 'b_0_50_ms', label: '0–50 ms' },
  { key: 'b_51_100_ms', label: '51–100 ms' },
  { key: 'b_101_250_ms', label: '101–250 ms' },
  { key: 'b_251_500_ms', label: '251–500 ms' },
  { key: 'b_501_1000_ms', label: '501 ms–1 s' },
  { key: 'b_1001_2000_ms', label: '1–2 s' },
  { key: 'b_2001_5000_ms', label: '2–5 s' },
  { key: 'b_5001_10000_ms', label: '5–10 s' },
  { key: 'b_10001_30000_ms', label: '10–30 s' },
  { key: 'b_gt_30000_ms', label: '>30 s' },
];

const PRODUCT_BUCKET_LABELS = [
  { key: 'b_0_50_ms', label: '0–50 ms' },
  { key: 'b_51_100_ms', label: '51–100 ms' },
  { key: 'b_101_200_ms', label: '101–200 ms' },
  { key: 'b_201_250_ms', label: '201–250 ms' },
  { key: 'b_251_500_ms', label: '251–500 ms' },
  { key: 'b_501_1000_ms', label: '501 ms–1 s' },
  { key: 'b_1001_2000_ms', label: '1–2 s' },
  { key: 'b_2001_2500_ms', label: '2–2,5 s' },
  { key: 'b_2501_4000_ms', label: '2,5–4 s' },
  { key: 'b_4001_5000_ms', label: '4–5 s' },
  { key: 'b_5001_10000_ms', label: '5–10 s' },
  { key: 'b_10001_30000_ms', label: '10–30 s' },
  { key: 'b_gt_30000_ms', label: '>30 s' },
];

const percentileRange = (row: InteractionTimingRow, percentile: number) => {
  const buckets = row.metric_kind === 'product_interaction_timing' ? PRODUCT_BUCKET_LABELS : SALE_BUCKET_LABELS;
  const total = buckets.reduce((sum, bucket) => sum + Number(row.duration_buckets?.[bucket.key] || 0), 0);
  if (total === 0) return '—';

  const target = Math.ceil(total * percentile);
  let seen = 0;
  for (const bucket of buckets) {
    seen += Number(row.duration_buckets?.[bucket.key] || 0);
    if (seen >= target) return bucket.label;
  }
  return '—';
};

const actionLabel = (action: string) => {
  if (action === 'sale_completion_click_to_indicator') return 'Clique → indicador';
  if (action === 'sale_completion_click_to_result') return 'Gravação → resposta';
  if (action === 'post_picker_search_to_results') return 'Busca → lista atualizada';
  if (action === 'post_picker_select_to_preview') return 'Escolha → prévia pronta';
  if (action === 'erp_page_lcp') return 'Carregamento da página (LCP)';
  if (action === 'erp_page_inp') return 'Resposta às interações (INP)';
  return action;
};

const networkLabel = (networkClass: string) => {
  if (networkClass === 'offline') return 'Sem conexão';
  if (networkClass === 'slow-2g') return '2G lento';
  if (networkClass === 'unknown') return 'Não identificada';
  return networkClass.toUpperCase();
};

const resultLabel = (result: string) => {
  if (result === 'visible') return 'Indicador exibido';
  if (result === 'observed') return 'Medido';
  if (result === 'success') return 'Concluído';
  if (result === 'failure') return 'Falhou';
  return result;
};

const viewportLabel = (viewportClass: string) => {
  if (viewportClass === 'phone') return 'Celular';
  if (viewportClass === 'tablet') return 'Tablet';
  if (viewportClass === 'desktop') return 'Computador';
  return 'Não identificado';
};

export const SupabaseInteractionTimings: React.FC<Props> = ({ rows }) => (
  <section className="overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <div className="border-b border-slate-100 px-5 py-4 dark:border-slate-800">
      <h3 className="font-bold text-slate-800 dark:text-slate-100">Rapidez das ações e da página</h3>
      <p className="mt-1 text-xs text-slate-500">
        Faixas aproximadas das etapas do seletor de produtos e dos indicadores da página do ERP. LCP mede o conteúdo principal carregado; INP mede a resposta às interações. Os dados são agrupados em lote, sem identificadores de produto ou cliente; grupos com menos de 5 medições ficam ocultos. Referências provisórias: LCP até 2,5 s e INP até 200 ms no p75.
      </p>
    </div>

    {rows.length === 0 ? (
      <p className="px-5 py-8 text-center text-sm text-slate-500">
        Ainda não há grupos com 5 ou mais medições neste período.
      </p>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500 dark:bg-slate-950/40">
            <tr>
              <th className="px-4 py-3">Etapa</th>
              <th className="px-4 py-3">Versão</th>
              <th className="px-4 py-3">Rede</th>
              <th className="px-4 py-3">Tela</th>
              <th className="px-4 py-3">Resultado</th>
              <th className="px-4 py-3 text-right">Medições</th>
              <th className="px-4 py-3">Mediana aprox. (p50)</th>
              <th className="px-4 py-3">p75 aprox.</th>
              <th className="px-4 py-3">p95 aprox.</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((row) => (
              <tr key={[row.metric_kind, row.action, row.app_version, row.network_class, row.viewport_class, row.result].join(':')}>
                <td className="px-4 py-3 font-medium text-slate-800 dark:text-slate-100">{actionLabel(row.action)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{row.app_version}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{networkLabel(row.network_class)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{viewportLabel(row.viewport_class)}</td>
                <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{resultLabel(row.result)}</td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-600 dark:text-slate-300">{Number(row.execution_count).toLocaleString()}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{percentileRange(row, 0.5)}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{percentileRange(row, 0.75)}</td>
                <td className="px-4 py-3 tabular-nums text-slate-600 dark:text-slate-300">{percentileRange(row, 0.95)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )}
  </section>
);
