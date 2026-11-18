import React from 'react';
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  type TooltipProps,
} from 'recharts';
import { useDashboardDigitalCatalog } from '../hooks/useDashboardDigitalCatalog';

const formatCount = (value: number) => Math.max(0, value || 0).toLocaleString('pt-BR');
const formatTooltipValue: TooltipProps<number, string>['formatter'] = (value, name) => [
  formatCount(Number(value ?? 0)),
  String(name ?? ''),
];

function MetricCard({
  title,
  value,
  note,
  icon,
  tone = 'slate',
}: {
  title: string;
  value: number;
  note: string;
  icon: string;
  tone?: 'slate' | 'indigo' | 'emerald' | 'amber';
}) {
  const tones = {
    slate: 'bg-slate-50 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200',
    indigo: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300',
    emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    amber: 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
  };

  return (
    <div className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex items-center justify-between gap-2">
        <p className="text-[10px] font-black uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {title}
        </p>
        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-xl ${tones[tone]}`}>
          <i className={`bi ${icon}`} aria-hidden="true" />
        </span>
      </div>
      <p className="mt-2 text-2xl font-black tabular-nums text-slate-900 dark:text-white">
        {formatCount(value)}
      </p>
      <p className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{note}</p>
    </div>
  );
}

function ProductRanking({
  title,
  description,
  products,
  emptyMessage,
  icon,
  tone,
}: {
  title: string;
  description: string;
  products: Array<{ id: string; name: string; count: number }>;
  emptyMessage: string;
  icon: string;
  tone: 'indigo' | 'emerald';
}) {
  const accent = tone === 'indigo' ? 'text-indigo-600 dark:text-indigo-300' : 'text-emerald-600 dark:text-emerald-300';

  return (
    <section className="min-w-0 rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 sm:p-5">
      <div className="mb-4 flex items-start gap-3">
        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-50 dark:bg-slate-800 ${accent}`}>
          <i className={`bi ${icon}`} aria-hidden="true" />
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-black text-slate-900 dark:text-white">{title}</h3>
          <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
        </div>
      </div>
      {products.length > 0 ? (
        <ol className="divide-y divide-slate-100 dark:divide-slate-800">
          {products.map((product, index) => (
            <li key={product.id} className="flex min-w-0 items-center gap-3 py-2.5 first:pt-0 last:pb-0">
              <span className="w-5 shrink-0 text-xs font-black text-slate-400">{index + 1}</span>
              <span className="min-w-0 flex-1 truncate text-xs font-bold text-slate-700 dark:text-slate-200" title={product.name}>
                {product.name}
              </span>
              <span className={`shrink-0 text-xs font-black tabular-nums ${accent}`}>
                {formatCount(product.count)}
              </span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="rounded-xl bg-slate-50 px-3 py-4 text-center text-xs text-slate-500 dark:bg-slate-800/60 dark:text-slate-400">
          {emptyMessage}
        </p>
      )}
    </section>
  );
}

export default function DigitalCatalogPanel() {
  const { data, isLoading, isError, refetch } = useDashboardDigitalCatalog();

  if (isLoading) {
    return (
      <div className="min-h-64 animate-pulse rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-6 h-5 w-56 rounded bg-slate-100 dark:bg-slate-800" />
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }, (_, index) => <div key={index} className="h-28 rounded-2xl bg-slate-100 dark:bg-slate-800" />)}
        </div>
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div role="alert" className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-100">
        <p className="text-sm font-black">Não foi possível carregar as métricas do Catálogo Digital.</p>
        <button type="button" onClick={() => void refetch()} className="mt-3 rounded-lg bg-amber-700 px-3 py-2 text-xs font-bold text-white hover:bg-amber-800">
          Tentar novamente
        </button>
      </div>
    );
  }

  return (
    <section className="min-w-0 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900 sm:p-6">
      <header className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-600 dark:bg-indigo-900/30 dark:text-indigo-400">
            <i className="bi bi-globe2 text-lg" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900 dark:text-slate-100">
              Catálogo Digital
            </h2>
            <p className="text-[10px] font-bold uppercase text-slate-500 dark:text-slate-400">
              Acessos e desempenho · últimos 30 dias
            </p>
          </div>
        </div>
        <span className="rounded-full bg-indigo-50 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300">
          30 dias · UTC
        </span>
      </header>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          title="Acessos às páginas"
          value={data.catalogVisits30Days}
          note="Início, categorias e selecionados"
          icon="bi-shop"
          tone="indigo"
        />
        <MetricCard
          title="Visitantes únicos"
          value={data.uniqueVisitors30Days}
          note="Identificados pelo navegador"
          icon="bi-people"
          tone="emerald"
        />
        <MetricCard
          title="Visualizações de produtos"
          value={data.productViews30Days}
          note="Páginas de produto abertas"
          icon="bi-eye"
        />
        <MetricCard
          title="Cliques em produtos"
          value={data.productClicks30Days}
          note="Aberturas a partir das listas"
          icon="bi-cursor"
          tone="amber"
        />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-2 gap-y-1 rounded-xl bg-slate-50 px-3 py-2 text-[11px] text-slate-600 dark:bg-slate-800/60 dark:text-slate-300">
        <i className="bi bi-clock-history text-indigo-500" aria-hidden="true" />
        <span className="font-bold">Histórico de páginas de produto:</span>
        <span>{formatCount(data.views)} visualizações</span>
        <span aria-hidden="true">·</span>
        <span>{formatCount(data.uniqueVisitors)} IDs de navegador</span>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.7fr)_minmax(260px,1fr)]">
        <section className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="mb-3">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Atividade diária</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Acessos às páginas, produtos abertos e cliques registrados.</p>
          </div>
          <div className="h-64 min-w-0 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={data.daily} margin={{ top: 8, right: 8, bottom: 2, left: -18 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value: string) => `${value.slice(8, 10)}/${value.slice(5, 7)}`}
                  tick={{ fontSize: 10, fill: '#64748b' }}
                  minTickGap={18}
                />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  labelFormatter={(value) => String(value).split('-').reverse().join('/')}
                  formatter={formatTooltipValue}
                  contentStyle={{ borderRadius: 12, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="catalogVisits" name="Acessos às páginas" stroke="#4f46e5" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="productViews" name="Visualizações de produtos" stroke="#0891b2" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
                <Line type="monotone" dataKey="productClicks" name="Cliques em produtos" stroke="#059669" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </section>

        <section className="min-w-0 rounded-2xl border border-slate-200 p-4 dark:border-slate-800 sm:p-5">
          <div className="mb-4">
            <h3 className="text-sm font-black text-slate-900 dark:text-white">Catálogo publicado</h3>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Situação atual dos itens e categorias.</p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-emerald-50 p-3 dark:bg-emerald-950/30">
              <p className="text-[10px] font-black uppercase tracking-wide text-emerald-700 dark:text-emerald-300">Publicados</p>
              <p className="mt-1 text-xl font-black tabular-nums text-emerald-800 dark:text-emerald-200">{formatCount(data.published)}</p>
            </div>
            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/60">
              <p className="text-[10px] font-black uppercase tracking-wide text-slate-500 dark:text-slate-400">Não publicados</p>
              <p className="mt-1 text-xl font-black tabular-nums text-slate-800 dark:text-slate-100">{formatCount(data.draft)}</p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 dark:bg-indigo-950/30">
              <p className="text-[10px] font-black uppercase tracking-wide text-indigo-700 dark:text-indigo-300">Itens totais</p>
              <p className="mt-1 text-xl font-black tabular-nums text-indigo-800 dark:text-indigo-200">{formatCount(data.products)}</p>
            </div>
            <div className="rounded-xl bg-amber-50 p-3 dark:bg-amber-950/30">
              <p className="text-[10px] font-black uppercase tracking-wide text-amber-700 dark:text-amber-300">Categorias</p>
              <p className="mt-1 text-xl font-black tabular-nums text-amber-800 dark:text-amber-200">{formatCount(data.categories)}</p>
            </div>
          </div>
          <p className="mt-3 text-[10px] leading-snug text-slate-500 dark:text-slate-400">
            Itens totais contam produtos sem variação e cada variação como um item separado.
          </p>
        </section>
      </div>

      <div className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2">
        <ProductRanking
          title="Produtos mais vistos"
          description="Produtos publicados · últimos 30 dias"
          products={data.topViewedProducts}
          emptyMessage="Ainda não há visualizações de produtos neste período."
          icon="bi-eye"
          tone="indigo"
        />
        <ProductRanking
          title="Produtos mais clicados"
          description="Aberturas a partir das listas · últimos 30 dias"
          products={data.topClickedProducts}
          emptyMessage="O histórico de cliques começa após a publicação do novo rastreamento."
          icon="bi-cursor"
          tone="emerald"
        />
      </div>
    </section>
  );
}
