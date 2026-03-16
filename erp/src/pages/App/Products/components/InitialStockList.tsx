import React from 'react';
import { InitialStockEntry } from '../../../types/product.type';

interface InitialStockListProps {
    entries: InitialStockEntry[];
    onChange: (entries: InitialStockEntry[]) => void;
}

const InitialStockList: React.FC<InitialStockListProps> = ({ entries, onChange }) => {
    const addEntry = () => {
        onChange([...entries, { quantity: 0, unitCost: 0, finalUnitCost: 0 }]);
    };

    const removeEntry = (index: number) => {
        onChange(entries.filter((_, i) => i !== index));
    };

    const updateEntry = (index: number, field: keyof InitialStockEntry, value: any) => {
        const newEntries = [...entries];
        const entry = { ...newEntries[index], [field]: value };
        
        // Recalculate final unit cost
        const baseOrder = entry.unitCost || 0;
        const ipi = entry.ipiType === 'percentage' 
            ? baseOrder * ((entry.ipiPercent || 0) / 100)
            : (entry.ipiPercent || 0);
        
        const freight = entry.freightType === 'percentage'
            ? baseOrder * ((entry.freightCost || 0) / 100)
            : (entry.freightCost || 0);

        entry.finalUnitCost = baseOrder + ipi + freight;
        newEntries[index] = entry;
        onChange(newEntries);
    };

    const totalQuantity = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
    const averageCost = entries.length > 0 
        ? entries.reduce((acc, curr) => acc + (curr.finalUnitCost || 0), 0) / entries.length 
        : 0;

    return (
        <div className="flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Lotes de Entrada Inicial</h5>
                <button
                    type="button"
                    onClick={addEntry}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg shadow-blue-500/20"
                >
                    <i className="bi bi-plus-lg"></i> Adicionar Lote
                </button>
            </div>

            {entries.length === 0 ? (
                <div className="p-8 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-[2rem] flex flex-col items-center justify-center text-center gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-slate-50 dark:bg-slate-900 flex items-center justify-center text-slate-300">
                        <i className="bi bi-box-seam text-2xl"></i>
                    </div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Nenhum lote adicionado.<br/>Clique no botão acima para lançar o estoque inicial.</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3">
                    {entries.map((entry, index) => (
                        <div key={index} className="p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[2rem] animate-in slide-in-from-right-2 duration-300 relative group">
                            <button
                                type="button"
                                onClick={() => removeEntry(index)}
                                className="absolute -top-2 -right-2 w-8 h-8 bg-red-50 text-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 hover:text-white shadow-sm border border-red-100"
                            >
                                <i className="bi bi-x"></i>
                            </button>

                            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[8px] font-black uppercase tracking-widest text-slate-400 px-1">Qtd.</label>
                                    <input
                                        type="number"
                                        value={entry.quantity || ''}
                                        onChange={(e) => updateEntry(index, 'quantity', parseInt(e.target.value) || 0)}
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
                                        onChange={(e) => updateEntry(index, 'unitCost', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-xl outline-none text-sm font-bold dark:text-slate-200"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">IPI</label>
                                        <div className="flex gap-1">
                                            <button 
                                                type="button" 
                                                onClick={() => updateEntry(index, 'ipiType', 'percentage')}
                                                className={`text-[7px] font-bold ${entry.ipiType !== 'fixed' ? 'text-blue-600' : 'text-slate-300'}`}
                                            >%</button>
                                            <button 
                                                type="button" 
                                                onClick={() => updateEntry(index, 'ipiType', 'fixed')}
                                                className={`text-[7px] font-bold ${entry.ipiType === 'fixed' ? 'text-blue-600' : 'text-slate-300'}`}
                                            >$</button>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={entry.ipiPercent || ''}
                                        onChange={(e) => updateEntry(index, 'ipiPercent', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-xl outline-none text-sm font-bold dark:text-slate-200"
                                        placeholder="0.00"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <div className="flex items-center justify-between px-1">
                                        <label className="text-[8px] font-black uppercase tracking-widest text-slate-400">Frete</label>
                                        <div className="flex gap-1">
                                            <button 
                                                type="button" 
                                                onClick={() => updateEntry(index, 'freightType', 'percentage')}
                                                className={`text-[7px] font-bold ${entry.freightType === 'percentage' ? 'text-blue-600' : 'text-slate-300'}`}
                                            >%</button>
                                            <button 
                                                type="button" 
                                                onClick={() => updateEntry(index, 'freightType', 'fixed')}
                                                className={`text-[7px] font-bold ${entry.freightType !== 'percentage' ? 'text-blue-600' : 'text-slate-300'}`}
                                            >$</button>
                                        </div>
                                    </div>
                                    <input
                                        type="number"
                                        step="0.01"
                                        value={entry.freightCost || ''}
                                        onChange={(e) => updateEntry(index, 'freightCost', parseFloat(e.target.value) || 0)}
                                        className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-900 border border-transparent focus:border-blue-500/30 rounded-xl outline-none text-sm font-bold dark:text-slate-200"
                                        placeholder="0.00"
                                    />
                                </div>
                            </div>
                            
                            <div className="mt-4 pt-4 border-t border-slate-50 dark:border-slate-900 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Custo Final Unitário:</p>
                                </div>
                                <p className="text-sm font-black text-blue-600">R$ {(entry.finalUnitCost || 0).toFixed(2)}</p>
                            </div>
                        </div>
                    ))}

                    <div className="mt-2 p-6 bg-slate-900 rounded-[2rem] flex items-center justify-between">
                        <div className="flex flex-col">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Total a Lançar</p>
                            <p className="text-xl font-black text-white">{totalQuantity} unidades</p>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Custo Médio Est.</p>
                            <p className="text-xl font-black text-emerald-400">R$ {averageCost.toFixed(2)}</p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default InitialStockList;
