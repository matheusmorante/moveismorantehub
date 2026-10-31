import React from 'react';
import Purchase from '../../../../../types/purchase.type';
import { formatCurrency } from '../../../../../utils/formatters';

interface PurchaseDetailsItemsTableProps {
  items: Purchase['items'];
}

export const PurchaseDetailsItemsTable: React.FC<PurchaseDetailsItemsTableProps> = ({ items }) => {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
        <i className="bi bi-list-task text-blue-500" aria-hidden="true" />
        Itens do Pedido ({items.length})
      </h3>

      <div className="space-y-3 xl:hidden">
        {items.map((item, index) => {
          const unitCost = item.unitCost || 0;
          const lineTotal = item.totalCost || item.quantity * unitCost;
          return (
            <article key={index} className="rounded-xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20">
              <div className="min-w-0">
                <p className="break-words font-bold text-slate-900 dark:text-white">{item.description}</p>
                {item.baseCost && item.baseCost !== item.unitCost && (
                  <p className="mt-1 text-[10px] text-slate-400">Base: {formatCurrency(item.baseCost)}</p>
                )}
              </div>
              <div className="mt-3 grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Qtd. pedida</p>
                  <p className="mt-1 font-bold text-slate-700 dark:text-slate-200">{item.quantity} un</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Qtd. recebida</p>
                  <p className="mt-1 font-bold text-blue-600 dark:text-blue-400">
                    {item.receivedQuantity !== undefined ? `${item.receivedQuantity} un` : '—'}
                  </p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Custo unitário</p>
                  <p className="mt-1 font-semibold text-slate-700 dark:text-slate-200">{formatCurrency(unitCost)}</p>
                </div>
                <div>
                  <p className="text-[9px] font-black uppercase tracking-wider text-slate-400">Total</p>
                  <p className="mt-1 font-black text-slate-900 dark:text-white">{formatCurrency(lineTotal)}</p>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      <div className="hidden overflow-x-auto rounded-2xl border border-slate-100 bg-slate-50/30 dark:border-slate-800 dark:bg-slate-800/20 xl:block">
        <table className="w-full min-w-[840px] text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-4 py-3 xl:px-5">Produto</th>
              <th className="px-4 py-3 text-center xl:px-5">Qtd. Pedida</th>
              <th className="px-4 py-3 text-center xl:px-5">Qtd. Recebida</th>
              <th className="px-4 py-3 text-right xl:px-5">Custo Unitário</th>
              <th className="px-4 py-3 text-right xl:px-5">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
            {items.map((item, index) => {
              const unitCost = item.unitCost || 0;
              const lineTotal = item.totalCost || item.quantity * unitCost;
              return (
                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-4 py-3.5 xl:px-5">
                    <p className="font-bold text-slate-900 dark:text-white">{item.description}</p>
                    {item.baseCost && item.baseCost !== item.unitCost && (
                      <p className="text-[10px] text-slate-400 font-normal">
                        Base: {formatCurrency(item.baseCost)}
                      </p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-center font-bold xl:px-5">{item.quantity} un</td>
                  <td className="px-4 py-3.5 text-center font-bold text-blue-600 dark:text-blue-400 xl:px-5">
                    {item.receivedQuantity !== undefined ? `${item.receivedQuantity} un` : '-'}
                  </td>
                  <td className="px-4 py-3.5 text-right xl:px-5">{formatCurrency(unitCost)}</td>
                  <td className="px-4 py-3.5 text-right font-black text-slate-900 dark:text-white xl:px-5">
                    {formatCurrency(lineTotal)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
