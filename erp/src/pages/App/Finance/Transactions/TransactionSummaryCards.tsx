import React from 'react';

interface TransactionSummaryCardsProps {
  incomeTotal: number;
  expenseTotal: number;
  formatCurrency: (value: number) => string;
}

export const TransactionSummaryCards: React.FC<TransactionSummaryCardsProps> = ({
  incomeTotal,
  expenseTotal,
  formatCurrency,
}) => {
  const saldoPeriodo = incomeTotal - expenseTotal;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 flex items-center justify-center">
            <i className="bi bi-arrow-up-circle-fill text-xl"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Entradas (Filtro)
          </h3>
        </div>
        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
          {formatCurrency(incomeTotal)}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-900/20 text-rose-600 flex items-center justify-center">
            <i className="bi bi-arrow-down-circle-fill text-xl"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Saídas (Filtro)
          </h3>
        </div>
        <p className="text-2xl font-black text-slate-800 dark:text-slate-100">
          {formatCurrency(expenseTotal)}
        </p>
      </div>

      <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-100 dark:border-slate-800 shadow-sm relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <i className="bi bi-wallet2 text-6xl text-blue-600"></i>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${saldoPeriodo >= 0 ? 'bg-blue-100 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' : 'bg-amber-100 text-amber-600 dark:bg-amber-900/20'} `}
          >
            <i className="bi bi-cash-stack text-xl"></i>
          </div>
          <h3 className="text-sm font-black uppercase tracking-widest text-slate-500">
            Saldo Período
          </h3>
        </div>
        <p
          className={`text-2xl font-black ${saldoPeriodo >= 0 ? 'text-blue-600 dark:text-blue-400' : 'text-amber-600 dark:text-amber-500'}`}
        >
          {formatCurrency(saldoPeriodo)}
        </p>
      </div>
    </div>
  );
};
