import React from 'react';
import Purchase from '../../../../../types/purchase.type';
import { formatCurrency } from '../../../../../utils/formatters';

interface PurchaseDetailsStatsProps {
  purchase: Purchase;
  totalQuantity: number;
}

export const PurchaseDetailsStats: React.FC<PurchaseDetailsStatsProps> = ({
  purchase,
  totalQuantity,
}) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Valor Total
        </p>
        <p className="text-xl xl:text-2xl font-black text-blue-600 dark:text-blue-400 mt-1">
          {formatCurrency(purchase.totalValue)}
        </p>
      </div>

      <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Itens / Volumes
        </p>
        <p className="text-xl xl:text-2xl font-black text-slate-800 dark:text-slate-200 mt-1">
          {purchase.items.length} itens{' '}
          <span className="text-xs font-semibold text-slate-400">({totalQuantity} un)</span>
        </p>
      </div>

      <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          IPI & Frete
        </p>
        <p className="text-sm font-bold text-slate-700 dark:text-slate-300 mt-1.5">
          IPI: <span className="font-extrabold">{purchase.ipiPercent || 0}%</span> • Frete:{' '}
          <span className="font-extrabold">{purchase.freightPercent || 0}%</span>
        </p>
      </div>

      <div className="p-5 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-center">
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
          Uso no recebimento
        </p>
        <p
          className={`text-xs font-black uppercase mt-1.5 ${
            purchase.stockProcessed
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-amber-600 dark:text-amber-400'
          }`}
        >
          {purchase.stockProcessed
            ? 'Movimento legado já registrado'
            : 'Use para preencher um recebimento'}
        </p>
      </div>
    </div>
  );
};
