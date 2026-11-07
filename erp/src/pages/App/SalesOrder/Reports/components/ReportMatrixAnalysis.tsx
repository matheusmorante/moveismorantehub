import React, { useMemo } from 'react';
import {
  CartesianGrid,
  Cell,
  ReferenceLine,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ABCResult } from '../utils/salesReportCalculations';
import { deriveReportScatterData } from './reportChartData';
import {
  deriveSalvadosBenchmark,
  deriveSupplierAverages,
} from './reportSupplierMetrics';
import type { deriveReportRefinementMetrics } from './reportSupplierMetrics';
import { REPORT_QUADRANTS } from './reportQuadrantPresentation';
import { ReportQuadrantProductLists } from './ReportQuadrantProductLists';

type ReportRefinementMetrics = ReturnType<typeof deriveReportRefinementMetrics>;

interface ReportMatrixAnalysisProps {
  results: ABCResult[];
  rawResults: readonly ABCResult[];
  totalProfit: number;
  avgProfitPerItem: number;
  avgTurnoverPerItem: number;
  monthCount: number;
  refinementMetrics: ReportRefinementMetrics;
  onSelectResult: (result: ABCResult) => void;
}

export const ReportMatrixAnalysis: React.FC<ReportMatrixAnalysisProps> = ({
  results,
  rawResults,
  totalProfit,
  avgProfitPerItem,
  avgTurnoverPerItem,
  monthCount,
  refinementMetrics,
  onSelectResult,
}) => {
  const supplierAverages = useMemo(() => deriveSupplierAverages(results), [results]);
  const salvadosBenchmark = useMemo(
    () => deriveSalvadosBenchmark(rawResults),
    [rawResults]
  );
  const scatterData = useMemo(
    () => deriveReportScatterData(results, monthCount),
    [results, monthCount]
  );

  return (
    <>
      <div className="bg-white dark:bg-slate-900 p-8 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800">
        <h3 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest mb-10 flex items-center justify-between">
          Matriz Giro vs Lucratividade
          <span className="px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[10px] font-black text-slate-500">
            {refinementMetrics.active} Itens Analisados
          </span>
        </h3>
        <div className="h-[500px]">
          <ResponsiveContainer width="100%" height="100%">
            <ScatterChart margin={{ top: 40, right: 120, bottom: 40, left: 40 }}>
              <CartesianGrid
                strokeDasharray="3 3"
                stroke="#f1f5f9"
                strokeOpacity={0.8}
              />
              <XAxis
                type="number"
                dataKey="x"
                name="Giro Mensal"
                fontSize={9}
                fontWeight="900"
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => val.toFixed(1)}
                domain={['auto', 'auto']}
              />
              <YAxis
                type="number"
                dataKey="y"
                name="Lucro Mensal"
                fontSize={9}
                fontWeight="900"
                axisLine={false}
                tickLine={false}
                tickFormatter={(val) => `R$ ${val.toLocaleString('pt-BR')}`}
                domain={['auto', 'auto']}
              />
              <Tooltip
                cursor={{ strokeDasharray: '3 3' }}
                content={({ active, payload }) => {
                  if (active && payload && payload.length) {
                    const data = payload[0].payload;
                    return (
                      <div className="bg-white dark:bg-slate-900 p-4 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl flex flex-col gap-1 min-w-[200px]">
                        <p className="text-[11px] font-black uppercase text-indigo-600 mb-1">
                          {data.name}
                        </p>
                        <div className="h-px bg-slate-100 dark:bg-slate-800 my-1"></div>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                          <span className="text-slate-400 font-black uppercase text-[8px]">
                            Lucro Mensal:
                          </span>
                          {data.y.toLocaleString('pt-BR', {
                            style: 'currency',
                            currency: 'BRL',
                          })}
                        </p>
                        <p className="text-[11px] font-bold text-slate-700 dark:text-slate-200 flex justify-between">
                          <span className="text-slate-400 font-black uppercase text-[8px]">
                            Giro Mensal:
                          </span>
                          {data.x.toFixed(1)} un.
                        </p>
                      </div>
                    );
                  }
                  return null;
                }}
              />
              <ReferenceLine
                x={avgTurnoverPerItem}
                stroke="#94a3b8"
                strokeDasharray="8 8"
                strokeWidth={1}
                label={{
                  position: 'top',
                  value: `MÉD. GIRO: ${avgTurnoverPerItem.toFixed(1)} un/mês`,
                  fill: '#94a3b8',
                  fontSize: 8,
                  fontWeight: 900,
                }}
              />
              <ReferenceLine
                y={avgProfitPerItem}
                stroke="#94a3b8"
                strokeDasharray="8 8"
                strokeWidth={1}
                label={{
                  position: 'right',
                  value: `MÉD. LUCRO: ${avgProfitPerItem.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}`,
                  fill: '#94a3b8',
                  fontSize: 8,
                  fontWeight: 900,
                }}
              />
              <Scatter name="Produtos" data={scatterData}>
                {scatterData.map((entry: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={
                      entry.quadrant === 1
                        ? '#10b981'
                        : entry.quadrant === 2
                          ? '#3b82f6'
                          : entry.quadrant === 3
                            ? '#f59e0b'
                            : '#94a3b8'
                    }
                    fillOpacity={0.8}
                  />
                ))}
              </Scatter>
            </ScatterChart>
          </ResponsiveContainer>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-8">
          {(() => {
            const totalViewQty = results.reduce(
              (acc, curr) => acc + (curr.totalQuantity || 0),
              0
            );
            const q1ResTotal = results.filter((r) => r.quadrant === 1);
            const q1ProfitSum = q1ResTotal.reduce(
              (acc, curr) => acc + (curr.totalProfit || 0),
              0
            );
            const q1AvgProfitPerItem =
              q1ResTotal.length > 0 ? q1ProfitSum / q1ResTotal.length : 0;

            return REPORT_QUADRANTS.map((q) => {
              const qResults = results.filter((r) => r.quadrant === q.id);
              const qProfit = qResults.reduce(
                (acc, curr) => acc + (curr.totalProfit || 0),
                0
              );
              const qQty = qResults.reduce(
                (acc, curr) => acc + (curr.totalQuantity || 0),
                0
              );

              const qPerc = totalProfit > 0 ? (qProfit / totalProfit) * 100 : 0;
              const qItemsPerc =
                results.length > 0 ? (qResults.length / results.length) * 100 : 0;
              const qMonthlyProfit = qProfit / (monthCount || 1);

              const qSupplierProfitSum = qResults.reduce((acc, r) => {
                const sAvg = supplierAverages[r.supplier || 'N/A']?.avgProfit || 0;
                return acc + sAvg * (monthCount || 1);
              }, 0);

              return (
                <div
                  key={q.id}
                  className={`${q.bg} p-6 rounded-[2.5rem] border ${q.border} flex flex-col gap-2 shadow-sm transition-all hover:scale-[1.02]`}
                >
                  <div className="flex flex-col mb-2">
                    <h4
                      className={`text-[9px] font-black ${q.text} uppercase tracking-[0.2em]`}
                    >
                      {q.label}
                    </h4>
                    <span className="text-[7px] font-bold opacity-50 uppercase tracking-widest">
                      {q.sub}
                    </span>
                  </div>
                  <div className="flex flex-col gap-1">
                    <p className={`text-xl font-black ${q.valText}`}>
                      {qResults.length}{' '}
                      <span className="text-[10px] font-bold opacity-60 uppercase">
                        itens
                      </span>
                    </p>
                    <div className="flex flex-col">
                      <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                        {qProfit.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}{' '}
                        <span className="text-[8px] font-bold opacity-30 ml-1">
                          TOTAL
                        </span>
                      </p>
                      <p className={`text-[11px] font-black ${q.text}`}>
                        {qMonthlyProfit.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}{' '}
                        <span className="text-[8px] font-bold opacity-40 ml-1">
                          / MÊS
                        </span>
                      </p>
                    </div>
                    <div className="flex flex-col gap-0.5 mt-1 border-t border-black/5 dark:border-white/5 pt-2">
                      <p className={`text-[10px] font-black opacity-60 ${q.text}`}>
                        {qPerc.toFixed(1)}%{' '}
                        <span className="text-[8px] uppercase tracking-tighter">
                          do lucro total
                        </span>
                      </p>
                      <p className={`text-[10px] font-black opacity-60 ${q.text}`}>
                        {qItemsPerc.toFixed(1)}%{' '}
                        <span className="text-[8px] uppercase tracking-tighter">
                          da quantidade de itens
                        </span>
                      </p>
                    </div>
                    {q.id !== 1 && qResults.length > 0 && (
                      <div className="mt-4 pt-2 -mx-2">
                        <div className="relative group/insight">
                          <button className="flex items-center gap-2 px-3 py-2 bg-white/40 dark:bg-black/10 hover:bg-white dark:hover:bg-indigo-600 hover:text-white rounded-xl border border-black/5 dark:border-white/5 transition-all cursor-help">
                            <i className="bi bi-lightbulb-fill text-amber-500 group-hover/insight:text-white text-[10px]"></i>
                            <span className="text-[8px] font-black uppercase tracking-widest">
                              Ver Insights
                            </span>
                          </button>

                          <div className="absolute bottom-full left-0 mb-3 w-[400px] p-8 bg-white dark:bg-slate-900 rounded-[3rem] shadow-2xl border border-slate-100 dark:border-slate-800 opacity-0 invisible group-hover/insight:opacity-100 group-hover/insight:visible transition-all z-50 transform translate-y-2 group-hover/insight:translate-y-0">
                            <div className="flex items-center gap-3 mb-6">
                              <div className="w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 flex items-center justify-center">
                                <i className="bi bi-graph-up-arrow text-indigo-600 dark:text-indigo-400 text-lg"></i>
                              </div>
                              <div>
                                <h5 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest leading-none mb-1">
                                  Análise de Potencial
                                </h5>
                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                                  Simulações de Melhoria de Margem
                                </p>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                              {/* Coluna 1: Cenário Realista (Benchmark SALVADOS) */}
                              <div
                                className={`flex flex-col gap-4 ${!salvadosBenchmark ? 'opacity-30 grayscale pointer-events-none' : ''}`}
                              >
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-4 bg-indigo-500 rounded-full"></div>
                                  <h6 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                                    Padrão SALVADOS
                                  </h6>
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-2">
                                  {salvadosBenchmark
                                    ? 'Simula elevar itens para o lucro médio do fornecedor Salvados.'
                                    : 'Fornecedor SALVADOS não encontrado neste relatório.'}
                                </p>

                                {salvadosBenchmark &&
                                  [100, 50, 25].map((perc) => {
                                    const ratio = perc / 100;
                                    const scenarioProfit =
                                      qResults.length *
                                        ratio *
                                        salvadosBenchmark *
                                        (monthCount || 1) +
                                      qProfit * (1 - ratio);
                                    const profitIncrease = scenarioProfit - qProfit;
                                    const monthlyIncrease =
                                      profitIncrease / (monthCount || 1);

                                    return (
                                      <div
                                        key={perc}
                                        className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-indigo-500/20 transition-all"
                                      >
                                        <div className="flex justify-between items-center mb-1">
                                          <span className="text-[9px] font-black text-slate-600">
                                            {perc}% dos itens
                                          </span>
                                          <span className="text-[9px] font-black text-emerald-600">
                                            +
                                            {monthlyIncrease.toLocaleString('pt-BR', {
                                              style: 'currency',
                                              currency: 'BRL',
                                              maximumFractionDigits: 0,
                                            })}
                                            /mês
                                          </span>
                                        </div>
                                        <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                          <div
                                            className="h-full bg-indigo-500"
                                            style={{ width: `${perc}%` }}
                                          ></div>
                                        </div>
                                      </div>
                                    );
                                  })}
                              </div>

                              {/* Coluna 2: Cenário Otimista (Benchmark Q1) */}
                              <div className="flex flex-col gap-4">
                                <div className="flex items-center gap-2 mb-1">
                                  <div className="w-2 h-4 bg-emerald-500 rounded-full"></div>
                                  <h6 className="text-[10px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-widest">
                                    Meta Estrela (Q1)
                                  </h6>
                                </div>
                                <p className="text-[8px] font-bold text-slate-400 uppercase leading-tight mb-2">
                                  Simula elevar itens para a média geral dos melhores
                                  itens (Q1).
                                </p>

                                {[100, 50, 25].map((perc) => {
                                  const ratio = perc / 100;
                                  const scenarioProfit =
                                    qResults.length * ratio * q1AvgProfitPerItem +
                                    qProfit * (1 - ratio);
                                  const profitIncrease = scenarioProfit - qProfit;
                                  const monthlyIncrease =
                                    profitIncrease / (monthCount || 1);

                                  return (
                                    <div
                                      key={perc}
                                      className="bg-slate-50 dark:bg-slate-955 p-3 rounded-2xl border border-slate-100 dark:border-slate-800 hover:border-emerald-500/20 transition-all"
                                    >
                                      <div className="flex justify-between items-center mb-1">
                                        <span className="text-[9px] font-black text-slate-600">
                                          {perc}% dos itens
                                        </span>
                                        <span className="text-[9px] font-black text-emerald-600">
                                          +
                                          {monthlyIncrease.toLocaleString('pt-BR', {
                                            style: 'currency',
                                            currency: 'BRL',
                                            maximumFractionDigits: 0,
                                          })}
                                          /mês
                                        </span>
                                      </div>
                                      <div className="h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                          className="h-full bg-emerald-500"
                                          style={{ width: `${perc}%` }}
                                        ></div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>

                            <div className="mt-8 pt-4 border-t border-slate-100 dark:border-slate-800">
                              <div className="grid grid-cols-2 gap-4">
                                {salvadosBenchmark ? (
                                  <div className="p-3 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl">
                                    <p className="text-[8px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-1">
                                      Média SALVADOS
                                    </p>
                                    <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                                      R${' '}
                                      {salvadosBenchmark.toLocaleString('pt-BR', {
                                        maximumFractionDigits: 0,
                                      })}{' '}
                                      / item
                                    </p>
                                  </div>
                                ) : (
                                  <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-2xl">
                                    <p className="text-[8px] font-black text-slate-400 uppercase tracking-[0.2em] mb-1">
                                      Média SALVADOS
                                    </p>
                                    <p className="text-[11px] font-black text-slate-400 italic">
                                      Não disponível
                                    </p>
                                  </div>
                                )}
                                <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl">
                                  <p className="text-[8px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-1">
                                    Média Estrela (Q1)
                                  </p>
                                  <p className="text-[11px] font-black text-slate-800 dark:text-slate-100">
                                    R${' '}
                                    {(
                                      q1AvgProfitPerItem / (monthCount || 1)
                                    ).toLocaleString('pt-BR', {
                                      maximumFractionDigits: 0,
                                    })}{' '}
                                    / item
                                  </p>
                                </div>
                              </div>
                            </div>

                            <div className="absolute -bottom-2 left-6 w-4 h-4 bg-white dark:bg-slate-900 border-r border-b border-slate-100 dark:border-slate-800 rotate-45"></div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            });
          })()}
        </div>
      </div>

      <ReportQuadrantProductLists results={results} onSelectResult={onSelectResult} />
    </>
  );
};
