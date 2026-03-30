import React, { useEffect } from 'react';
import { InitialStockEntry } from '../../../types/product.type';

interface InitialStockListProps {
    entries: InitialStockEntry[];
    onChange: (entries: InitialStockEntry[]) => void;
}

const InitialStockList: React.FC<InitialStockListProps> = ({ entries, onChange }) => {
    
    // Auto-init to one element if empty
    useEffect(() => {
        if (!entries || entries.length === 0) {
            onChange([{ quantity: 0, unitCost: 0, finalUnitCost: 0 }]);
        }
    }, [entries, onChange]);

    const updateEntry = (field: keyof InitialStockEntry, value: any) => {
        const entry = { ...(entries[0] || {}), [field]: value };
        
        // Recalculate final unit cost
        const baseOrder = entry.unitCost || 0;
        const ipi = entry.ipiType === 'percentage' 
            ? baseOrder * ((entry.ipiPercent || 0) / 100)
            : (entry.ipiPercent || 0);
        
        const freight = entry.freightType === 'percentage'
            ? baseOrder * ((entry.freightCost || 0) / 100)
            : (entry.freightCost || 0);

        entry.finalUnitCost = baseOrder + ipi + freight;
        onChange([entry]);
    };

    const entry = entries[0] || { quantity: 0, unitCost: 0, finalUnitCost: 0 };

    return (
        <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-3">
                <div className="p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] animate-in fade-in duration-300">
                    
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">Qtd.</label>
                            <input
                                type="number"
                                value={entry.quantity || ''}
                                onChange={(e) => updateEntry('quantity', parseInt(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-xl outline-none text-sm font-bold dark:text-slate-200"
                                placeholder="0"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">Custo Unit.</label>
                            <input
                                type="number"
                                step="0.01"
                                value={entry.unitCost || ''}
                                onChange={(e) => updateEntry('unitCost', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-xl outline-none text-sm font-bold dark:text-slate-200"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">IPI</label>
                                <div className="flex gap-1 justify-end">
                                    <button 
                                        type="button" 
                                        onClick={() => updateEntry('ipiType', 'percentage')}
                                        className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold transition-all ${entry.ipiType !== 'fixed' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >%</button>
                                    <button 
                                        type="button" 
                                        onClick={() => updateEntry('ipiType', 'fixed')}
                                        className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold transition-all ${entry.ipiType === 'fixed' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >$</button>
                                </div>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                value={entry.ipiPercent || ''}
                                onChange={(e) => updateEntry('ipiPercent', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-xl outline-none text-sm font-bold dark:text-slate-200"
                                placeholder="0.00"
                            />
                        </div>

                        <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between px-1">
                                <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Frete</label>
                                <div className="flex gap-1 justify-end">
                                    <button 
                                        type="button" 
                                        onClick={() => updateEntry('freightType', 'percentage')}
                                        className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold transition-all ${entry.freightType === 'percentage' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >%</button>
                                    <button 
                                        type="button" 
                                        onClick={() => updateEntry('freightType', 'fixed')}
                                        className={`text-[8px] px-1.5 py-0.5 rounded-md font-bold transition-all ${entry.freightType !== 'percentage' ? 'bg-blue-100 text-blue-600' : 'text-slate-400 hover:bg-slate-100'}`}
                                    >$</button>
                                </div>
                            </div>
                            <input
                                type="number"
                                step="0.01"
                                value={entry.freightCost || ''}
                                onChange={(e) => updateEntry('freightCost', parseFloat(e.target.value) || 0)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-xl outline-none text-sm font-bold dark:text-slate-200"
                                placeholder="0.00"
                            />
                        </div>
                    </div>
                    
                    <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-900 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 shadow-lg shadow-blue-500/50"></span>
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Custo Final Unitário:</p>
                        </div>
                        <p className="text-sm font-black text-blue-600 bg-blue-50 dark:bg-blue-900/10 px-4 py-1.5 rounded-lg border border-blue-100 dark:border-blue-900/30 shadow-sm">
                            R$ {(entry.finalUnitCost || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InitialStockList;
