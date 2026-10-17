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

      <div className="border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-slate-50/30 dark:bg-slate-800/20">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="border-b border-slate-100 dark:border-slate-800 bg-slate-100/50 dark:bg-slate-800/50 text-[10px] font-black uppercase tracking-widest text-slate-400">
              <th className="px-5 py-3">Produto</th>
              <th className="px-5 py-3 text-center">Qtd. Pedida</th>
              <th className="px-5 py-3 text-center">Qtd. Recebida</th>
              <th className="px-5 py-3 text-right">Custo Unitário</th>
              <th className="px-5 py-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-semibold text-slate-700 dark:text-slate-200">
            {items.map((item, index) => {
              const unitCost = item.unitCost || 0;
              const lineTotal = item.totalCost || item.quantity * unitCost;
              return (
                <tr key={index} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/40">
                  <td className="px-5 py-3.5">
                    <p className="font-bold text-slate-900 dark:text-white">{item.description}</p>
                    {item.baseCost && item.baseCost !== item.unitCost && (
                      <p className="text-[10px] text-slate-400 font-normal">
                        Base: {formatCurrency(item.baseCost)}
                      </p>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center font-bold">{item.quantity} un</td>
                  <td className="px-5 py-3.5 text-center font-bold text-blue-600 dark:text-blue-400">
                    {item.receivedQuantity !== undefined ? `${item.receivedQuantity} un` : '-'}
                  </td>
                  <td className="px-5 py-3.5 text-right">{formatCurrency(unitCost)}</td>
                  <td className="px-5 py-3.5 text-right font-black text-slate-900 dark:text-white">
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
