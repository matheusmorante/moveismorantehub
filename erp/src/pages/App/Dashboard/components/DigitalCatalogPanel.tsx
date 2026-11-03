import React from 'react';
import { useDashboardDigitalCatalog } from '../hooks/useDashboardDigitalCatalog';

export default function DigitalCatalogPanel() {
  const { data, isLoading, isError, refetch } = useDashboardDigitalCatalog();

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 h-64 flex items-center justify-center">
        <i className="bi bi-arrow-repeat animate-spin text-4xl text-slate-300" />
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

  const metrics = data;

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-6 shadow-sm flex flex-col h-full animate-fade-in-up">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
            <i className="bi bi-globe2 text-lg"></i>
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-wider">
              Catálogo Digital
            </h2>
            <p className="text-[10px] text-slate-500 font-bold uppercase">
              Métricas da Loja Online
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">Visualizações</div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100">
            {metrics.views}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
            Visitantes Únicos
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100">
            {metrics.uniqueVisitors}
          </div>
        </div>
        <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-100 dark:border-indigo-800/30">
            <div className="text-[10px] text-indigo-500 dark:text-indigo-400 font-bold uppercase mb-1">
            Estimativa fixa
          </div>
          <div className="text-xl font-black text-indigo-700 dark:text-indigo-300">
            {metrics.conversionRate.toFixed(1)}%
          </div>
          <p className="mt-1 text-[9px] leading-snug text-indigo-500 dark:text-indigo-300">
            Referência fixa; não mede compras concluídas.
          </p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800/50">
          <div className="text-[10px] text-slate-500 font-bold uppercase mb-1">
            Total de Produtos
          </div>
          <div className="text-xl font-black text-slate-800 dark:text-slate-100">
              {metrics.products}
          </div>
        </div>
      </div>

      <div className="mt-auto">
        <a
          href="/marketing/catalog"
          className="inline-flex items-center gap-2 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
        >
          Gerenciar Catálogo Completo <i className="bi bi-arrow-right" />
        </a>
      </div>
    </div>
  );
}
