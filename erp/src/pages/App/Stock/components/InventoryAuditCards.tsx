import React from "react";
import type { AuditItem } from "./InventoryAuditModal";

interface InventoryAuditCardsProps {
    items: AuditItem[];
    onDecrement: (id: string) => void;
    onIncrement: (id: string) => void;
    onUpdateCount: (id: string, count: number) => void;
    onRemove: (id: string) => void;
}

const adjustmentClass = (difference: number) => {
    if (difference > 0) return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300';
    if (difference < 0) return 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300';
    return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400';
};

const InventoryAuditCards: React.FC<InventoryAuditCardsProps> = ({
    items,
    onDecrement,
    onIncrement,
    onUpdateCount,
    onRemove,
}) => (
    <div className="h-full overflow-x-auto overflow-y-hidden px-4 py-4 custom-scrollbar">
        <div className="flex h-full min-w-max snap-x snap-mandatory gap-4">
            {items.map((item, index) => {
                const difference = item.physicalCount - item.systemStock;
                return (
                    <article key={item.id} className="flex h-full w-[calc(100vw-4rem)] max-w-md snap-start flex-col rounded-2xl border border-slate-100 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto {index + 1} de {items.length}</span>
                                <h3 className="mt-1 truncate text-sm font-black text-slate-800 dark:text-slate-100">{item.name}</h3>
                                <p className="mt-1 text-[10px] font-bold text-slate-400">{item.supplierNames}</p>
                            </div>
                            <button type="button" onClick={() => onRemove(item.id)} className="rounded-lg p-2 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:hover:bg-rose-950/30" title="Remover da lista">
                                <i className="bi bi-trash text-sm" />
                            </button>
                        </div>

                        <div className="mt-6 grid grid-cols-2 gap-3">
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Estoque atual</span>
                                <strong className="mt-1 block text-lg text-slate-600 dark:text-slate-200">{item.systemStock} {item.unit}</strong>
                            </div>
                            <div className="rounded-xl bg-slate-50 p-3 dark:bg-slate-800/70">
                                <span className="block text-[9px] font-black uppercase tracking-widest text-slate-400">Ajuste</span>
                                <strong className={`mt-1 inline-flex rounded-lg px-2 py-0.5 text-lg ${adjustmentClass(difference)}`}>{difference > 0 ? `+${difference}` : difference} {item.unit}</strong>
                            </div>
                        </div>

                        <div className="mt-5">
                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">Contagem física</span>
                            <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-emerald-50 p-3 dark:bg-emerald-950/20">
                                <button type="button" onClick={() => onDecrement(item.id)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-white text-xl font-black text-slate-600 shadow-sm dark:bg-slate-800 dark:text-slate-200">−</button>
                                <input type="number" min="0" inputMode="numeric" value={item.physicalCount} onFocus={(event) => event.currentTarget.select()} onChange={(event) => onUpdateCount(item.id, parseInt(event.target.value, 10))} className="h-11 w-24 rounded-xl border border-emerald-200 bg-white text-center text-2xl font-black text-emerald-600 outline-none transition-colors focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20 dark:border-emerald-900 dark:bg-slate-900 dark:text-emerald-400" aria-label={`Contagem física de ${item.name}`} />
                                <button type="button" onClick={() => onIncrement(item.id)} className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-600 text-xl font-black text-white shadow-sm">+</button>
                            </div>
                        </div>

                        <p className="mt-auto pt-5 text-center text-[10px] font-bold uppercase tracking-widest text-slate-400">Deslize para a esquerda para o próximo produto</p>
                    </article>
                );
            })}
        </div>
    </div>
);

export default InventoryAuditCards;
