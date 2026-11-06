import React from 'react';
import type { ABCResult } from '../utils/salesReportCalculations';
import { REPORT_QUADRANTS } from './reportQuadrantPresentation';

interface ReportQuadrantProductListsProps {
  results: ABCResult[];
  onSelectResult: (result: ABCResult) => void;
}

export const ReportQuadrantProductLists: React.FC<ReportQuadrantProductListsProps> = ({
  results,
  onSelectResult,
}) => (
  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-12 pb-10">
    {REPORT_QUADRANTS.map((q) => (
      <div
        key={q.id}
        className="bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium border border-slate-100 dark:border-slate-800 flex flex-col min-h-[400px] overflow-hidden"
      >
        <div className={`p-8 border-b ${q.headerClass}`}>
          <h3 className="text-[10px] font-black uppercase tracking-widest">
            {q.headerTitle}
          </h3>
          <i className={`bi ${q.icon} text-xs opacity-50`}></i>
        </div>
        <p className="text-[7px] font-black opacity-60 uppercase tracking-widest">
          {q.shortDescription}
        </p>
        <div className="flex-1 overflow-y-auto">
          <table className="w-full">
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
              {results
                .filter((result) => result.quadrant === q.id)
                .map((result, index) => (
                  <tr
                    key={index}
                    onClick={() => onSelectResult(result)}
                    className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-all cursor-pointer active:scale-[0.98]"
                  >
                    <td className="px-6 py-4">
                      <p className="text-[11px] font-black text-slate-800 dark:text-slate-100 leading-tight whitespace-pre-wrap">
                        {result.product}
                      </p>
                      <p className="text-[8px] font-bold text-slate-400 uppercase mt-0.5">
                        {result.totalProfit.toLocaleString('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        })}
                      </p>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      </div>
    ))}
  </div>
);
