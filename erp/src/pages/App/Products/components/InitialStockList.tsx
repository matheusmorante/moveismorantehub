import React, { useState, useEffect } from 'react';
import { InitialStockEntry } from '../../../types/product.type';
import CurrencyInput from '@/components/CurrencyInput';

interface InitialStockListProps {
    entries: InitialStockEntry[];
    onChange: (entries: InitialStockEntry[]) => void;
}

const DEFAULT_ENTRY: InitialStockEntry = {
    quantity: 0,
    unitCost: 0,
    ipiPercent: 0,
    ipiType: 'percentage',
    freightCost: 0,
    freightType: 'fixed',
    finalUnitCost: 0,
};

const calcFinal = (e: InitialStockEntry): number => {
    const base = e.unitCost || 0;
    const ipi = e.ipiType === 'percentage'
        ? base * ((e.ipiPercent || 0) / 100)
        : (e.ipiPercent || 0);
    const freight = e.freightType === 'percentage'
        ? base * ((e.freightCost || 0) / 100)
        : (e.freightCost || 0);
    return base + ipi + freight;
};

const InitialStockList: React.FC<InitialStockListProps> = ({ entries, onChange }) => {
    const [entry, setEntry] = useState<InitialStockEntry>(entries?.[0] || DEFAULT_ENTRY);

    // Sync from parent only on mount or when entries are reset externally (e.g. clear form)
    useEffect(() => {
        if (entries && entries.length > 0) {
            setEntry(entries[0]);
        } else {
            setEntry(DEFAULT_ENTRY);
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []); // Only on mount - prevents the infinite loop

    const update = (field: keyof InitialStockEntry, value: any) => {
        const next = { ...entry, [field]: value };
        next.finalUnitCost = calcFinal(next);
        setEntry(next);
        onChange([next]);
    };

    return (
        <div className="flex flex-col gap-4">
            {/* Quantidade */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                        Quantidade Inicial <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number"
                        min={0}
                        value={entry.quantity || ''}
                        onChange={(e) => update('quantity', parseInt(e.target.value) || 0)}
                        className="w-full px-4 py-3 bg-white dark:bg-slate-900 border-2 border-blue-200 dark:border-blue-900/40 focus:border-blue-500 rounded-xl outline-none text-sm font-black text-blue-600 dark:text-blue-400 transition-colors"
                        placeholder="0"
                    />
                </div>

                {/* Custo Unitário */}
                <div className="flex flex-col gap-1.5">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-1">
                        Custo Unitário (R$)
                    </label>
                    <CurrencyInput
                        value={entry.unitCost}
                        onChange={(val) => update('unitCost', val)}
                        className="w-full text-left px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl outline-none text-sm font-bold dark:text-slate-200 transition-colors"
                        placeholder="0,00"
                    />
                </div>
            </div>

            {/* IPI */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">IPI</label>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => update('ipiType', 'percentage')}
                                className={`text-[8px] px-2 py-0.5 rounded-md font-black transition-all ${entry.ipiType !== 'fixed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >%</button>
                            <button
                                type="button"
                                onClick={() => update('ipiType', 'fixed')}
                                className={`text-[8px] px-2 py-0.5 rounded-md font-black transition-all ${entry.ipiType === 'fixed' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >R$</button>
                        </div>
                    </div>
                    {entry.ipiType === 'fixed' ? (
                        <CurrencyInput
                            value={entry.ipiPercent}
                            onChange={(val) => update('ipiPercent', val)}
                            className="w-full text-left px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl outline-none text-sm font-bold dark:text-slate-200 transition-colors"
                            placeholder="0,00"
                        />
                    ) : (
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={entry.ipiPercent || ''}
                                onChange={(e) => update('ipiPercent', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-3 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl outline-none text-sm font-bold dark:text-slate-200 transition-colors"
                                placeholder="0,00"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">%</span>
                        </div>
                    )}
                </div>

                {/* Frete */}
                <div className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between px-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Frete</label>
                        <div className="flex gap-1">
                            <button
                                type="button"
                                onClick={() => update('freightType', 'percentage')}
                                className={`text-[8px] px-2 py-0.5 rounded-md font-black transition-all ${entry.freightType === 'percentage' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >%</button>
                            <button
                                type="button"
                                onClick={() => update('freightType', 'fixed')}
                                className={`text-[8px] px-2 py-0.5 rounded-md font-black transition-all ${entry.freightType !== 'percentage' ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-600' : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                            >R$</button>
                        </div>
                    </div>
                    {entry.freightType === 'percentage' ? (
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                min={0}
                                value={entry.freightCost || ''}
                                onChange={(e) => update('freightCost', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-3 pr-10 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl outline-none text-sm font-bold dark:text-slate-200 transition-colors"
                                placeholder="0,00"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-black text-slate-400 pointer-events-none">%</span>
                        </div>
                    ) : (
                        <CurrencyInput
                            value={entry.freightCost}
                            onChange={(val) => update('freightCost', val)}
                            className="w-full text-left px-4 py-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 focus:border-blue-500 rounded-xl outline-none text-sm font-bold dark:text-slate-200 transition-colors"
                            placeholder="0,00"
                        />
                    )}
                </div>
            </div>

            {/* Custo Final Calculado */}
            <div className="flex items-center justify-between p-4 bg-blue-600 rounded-2xl shadow-lg shadow-blue-500/20">
                <div>
                    <p className="text-[9px] font-black uppercase tracking-widest text-blue-200">Custo Final Unitário (calculado)</p>
                    <p className="text-[9px] text-blue-200/70 mt-0.5">Custo + IPI + Frete</p>
                </div>
                <p className="text-xl font-black text-white">
                    R$ {(entry.finalUnitCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
            </div>
        </div>
    );
};

export default InitialStockList;


