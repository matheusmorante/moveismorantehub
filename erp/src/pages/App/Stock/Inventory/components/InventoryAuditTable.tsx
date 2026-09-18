import React from 'react';
import type { AuditItem } from '../modals/InventoryAuditModal';

export interface InventoryAuditTableProps {
    readonly items: readonly AuditItem[];
    readonly onUpdateCount: (id: string, newCount: number) => void;
    readonly onIncrement: (id: string) => void;
    readonly onDecrement: (id: string) => void;
    readonly onRemove: (id: string) => void;
}

/**
 * Visualização tabular para conferência de inventário em telas médias e grandes com atalhos de contagem.
 */
export const InventoryAuditTable: React.FC<InventoryAuditTableProps> = ({
    items,
    onUpdateCount,
    onIncrement,
    onDecrement,
    onRemove,
}) => {
    return (
        <table className="hidden md:table w-full text-left border-collapse">
            <thead>
                <tr className="bg-slate-50/80 dark:bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                    <th className="px-4 py-3">Produto / Variação</th>
                    <th className="px-4 py-3">Fornecedor</th>
                    <th className="px-4 py-3 text-center">Saldo Atual</th>
                    <th className="px-4 py-3 text-center w-48">Contagem Física</th>
                    <th className="px-4 py-3 text-center">Ajuste</th>
                    <th className="px-4 py-3 text-right">Ações</th>
                </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                {items.map((item) => {
                    const isCounted = item.physicalCount !== null;
                    const diff = isCounted ? item.physicalCount! - item.systemStock : 0;
                    return (
                        <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                {item.name}
                            </td>
                            <td
                                className="px-4 py-3 text-slate-500 font-medium truncate max-w-[200px]"
                                title={item.supplierNames}
                            >
                                {item.supplierNames}
                            </td>
                            <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                {item.systemStock} {item.unit}
                            </td>
                            <td className="px-4 py-3 text-center">
                                <div className="flex items-center justify-center gap-1.5">
                                    <button
                                        type="button"
                                        onClick={() => onDecrement(item.id)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                        aria-label={`Diminuir contagem de ${item.name}`}
                                    >
                                        −
                                    </button>
                                    <input
                                        type="number"
                                        min="0"
                                        value={item.physicalCount ?? ''}
                                        onChange={(e) => {
                                            const parsed = parseInt(e.target.value, 10);
                                            onUpdateCount(item.id, Number.isNaN(parsed) ? 0 : parsed);
                                        }}
                                        className="w-16 text-center font-bold font-mono py-1 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                                        aria-label={`Contagem de ${item.name}`}
                                    />
                                    <button
                                        type="button"
                                        onClick={() => onIncrement(item.id)}
                                        className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                        aria-label={`Aumentar contagem de ${item.name}`}
                                    >
                                        +
                                    </button>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-center">
                                <span
                                    className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
                                        !isCounted
                                            ? 'bg-slate-100 text-slate-400 dark:bg-slate-800'
                                            : diff > 0
                                            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300'
                                            : diff < 0
                                            ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300'
                                            : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                    }`}
                                >
                                    {!isCounted ? '-' : diff > 0 ? `+${diff}` : diff} {isCounted ? item.unit : ''}
                                </span>
                            </td>
                            <td className="px-4 py-3 text-right">
                                <button
                                    type="button"
                                    onClick={() => onRemove(item.id)}
                                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                    title="Remover da lista"
                                    aria-label={`Remover ${item.name} da lista`}
                                >
                                    <i className="bi bi-trash text-xs" aria-hidden="true" />
                                </button>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
};

export default InventoryAuditTable;
