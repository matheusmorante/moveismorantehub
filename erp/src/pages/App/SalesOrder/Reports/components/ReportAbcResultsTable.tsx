import React from 'react';
import type { ABCResult } from '../utils/salesReportCalculations';

interface ReportAbcResultsTableProps {
  sortedResults: ABCResult[];
  monthCount: number;
  sortConfig: { key: string; direction: 'asc' | 'desc' };
  onSort: (key: string) => void;
  onRowClick: (result: ABCResult) => void;
}

const SortIcon: React.FC<{ column: string; sortConfig: { key: string; direction: 'asc' | 'desc' } }> = ({
  column,
  sortConfig,
}) => {
  if (sortConfig.key !== column) return <i className="bi bi-arrow-down-up opacity-20 ml-2"></i>;
  return (
    <i
      className={`bi bi-sort-${sortConfig.direction === 'asc' ? 'down' : 'up'} text-indigo-500 ml-2`}
    ></i>
  );
};

export const ReportAbcResultsTable: React.FC<ReportAbcResultsTableProps> = ({
  sortedResults,
  monthCount,
  sortConfig,
  onSort,
  onRowClick,
}) => (
  <div className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 overflow-hidden">
    <table className="w-full text-left">
      <thead>
        <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800">
          <th
            onClick={() => onSort('classification')}
            className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            Classe <SortIcon column="classification" sortConfig={sortConfig} />
          </th>
          <th
            onClick={() => onSort('product')}
            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
          >
            Produto <SortIcon column="product" sortConfig={sortConfig} />
          </th>
          <th
            onClick={() => onSort('giroMensal')}
            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
          >
            Giro Mensal <SortIcon column="giroMensal" sortConfig={sortConfig} />
          </th>
          <th
            onClick={() => onSort('totalProfit')}
            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
          >
            Lucro Total <SortIcon column="totalProfit" sortConfig={sortConfig} />
          </th>
          <th
            onClick={() => onSort('lucroMensal')}
            className="px-6 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
          >
            Lucro Mensal <SortIcon column="lucroMensal" sortConfig={sortConfig} />
          </th>
          <th
            onClick={() => onSort('accumulatedPercentage')}
            className="px-8 py-6 text-[9px] font-black uppercase tracking-widest text-slate-400 cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-right"
          >
            % Acum. <SortIcon column="accumulatedPercentage" sortConfig={sortConfig} />
          </th>
        </tr>
      </thead>
      <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
        {sortedResults.map((res, i) => (
          <tr
            key={i}
            onClick={() => onRowClick(res)}
            className="group hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer active:scale-[0.99]"
          >
            <td className="px-8 py-5">
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-[12px] ${res.classification === 'A' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' : res.classification === 'B' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400' : 'bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500'}`}
              >
                {res.classification}
              </div>
            </td>
            <td className="px-6 py-5 max-w-[400px]">
              <p className="text-[12px] font-black text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-wrap">
                {res.product}
              </p>
              <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                {res.supplier}
              </p>
            </td>
            <td className="px-6 py-5 text-right">
              <span className="px-3 py-1 bg-slate-50 dark:bg-slate-950 rounded-lg text-[11px] font-black text-slate-800 dark:text-slate-200">
                {(res.totalQuantity / (monthCount || 1)).toFixed(1)}
              </span>
            </td>
            <td className="px-6 py-5 text-right">
              <span className="text-[12px] font-black text-emerald-600">
                {res.totalProfit.toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </td>
            <td className="px-6 py-5 text-right">
              <span className="text-[12px] font-black text-indigo-600">
                {(res.totalProfit / (monthCount || 1)).toLocaleString('pt-BR', {
                  style: 'currency',
                  currency: 'BRL',
                })}
              </span>
            </td>
            <td className="px-8 py-5 text-right text-[11px] font-black text-slate-300">
              {res.accumulatedPercentage.toFixed(1)}%
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);
