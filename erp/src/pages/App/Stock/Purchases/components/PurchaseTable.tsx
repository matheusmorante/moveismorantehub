import React from 'react';
import Purchase from '@/pages/types/purchase.type';
import { formatCurrency, formatToBRDate } from '@/pages/utils/formatters';

export interface PurchaseTableProps {
    readonly purchases: readonly Purchase[];
    readonly onOpen: (purchase: Purchase) => void;
    readonly onChangeStatus: (purchase: Purchase, status: Purchase['status']) => void;
}

const STATUS_LABELS: Record<Purchase['status'], string> = {
    fulfilled: 'Atendido',
    ordered: 'Em Ordem',
    cancelled: 'Cancelado',
};

const PURCHASE_STATUSES: readonly Purchase['status'][] = ['ordered', 'fulfilled', 'cancelled'];

/**
 * Tabela com histórico e listagem de pedidos de compra, permitindo troca rápida de status e navegação para detalhes.
 */
export const PurchaseTable: React.FC<PurchaseTableProps> = ({ purchases, onOpen, onChangeStatus }) => {
    return (
        <div className="overflow-x-auto">
            <table className="w-full text-left">
                <thead>
                    <tr className="bg-slate-50/50 dark:bg-slate-950/20">
                        {['Cód.', 'Data', 'Fornecedor', 'Status', 'Total'].map((title, index) => (
                            <th
                                key={title}
                                className={`px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-50 dark:border-slate-800 ${
                                    index > 3 ? 'text-right' : index === 3 ? 'text-center' : ''
                                }`}
                            >
                                {title}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {purchases.map((purchase) => {
                        const cancelled = purchase.status === 'cancelled';
                        const displayCode = purchase.purchaseNumber || purchase.id?.slice(-4) || '—';

                        return (
                            <tr
                                key={purchase.id}
                                onClick={() => onOpen(purchase)}
                                className={`group cursor-pointer transition-colors ${
                                    cancelled
                                        ? 'bg-slate-100/90 opacity-60 dark:bg-slate-900/90'
                                        : 'hover:bg-slate-50/80 dark:hover:bg-slate-800/30'
                                }`}
                            >
                                <td className="px-8 py-5 text-xs font-mono font-bold text-slate-500">
                                    #{displayCode}
                                </td>
                                <td className="px-8 py-5 text-xs text-slate-500">
                                    {formatToBRDate(purchase.date)}
                                </td>
                                <td className="px-8 py-5">
                                    <span
                                        className={`block font-bold ${
                                            cancelled
                                                ? 'text-slate-400 line-through'
                                                : 'text-slate-700 group-hover:text-blue-600 dark:text-slate-200'
                                        }`}
                                    >
                                        {purchase.supplierName}
                                    </span>
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                        {purchase.items.length} {purchase.items.length === 1 ? 'item' : 'itens'}
                                    </span>
                                </td>
                                <td className="px-8 py-5 text-center" onClick={(event) => event.stopPropagation()}>
                                    <select
                                        value={purchase.status}
                                        onChange={(event) =>
                                            onChangeStatus(purchase, event.target.value as Purchase['status'])
                                        }
                                        aria-label={`Alterar status do pedido de compra #${displayCode}`}
                                        title="Alterar status"
                                        className="rounded-full border border-blue-200 bg-blue-50 px-3 py-1 text-center text-[9px] font-black uppercase tracking-wider text-blue-700 outline-none transition-colors hover:bg-blue-100 dark:border-blue-900 dark:bg-blue-900/20 dark:text-blue-400 cursor-pointer"
                                    >
                                        {PURCHASE_STATUSES.map((status) => (
                                            <option key={status} value={status}>
                                                {STATUS_LABELS[status] || status}
                                            </option>
                                        ))}
                                    </select>
                                </td>
                                <td className="px-8 py-5 text-right font-black text-slate-700 dark:text-slate-200">
                                    {formatCurrency(purchase.totalValue)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
};

export default PurchaseTable;
