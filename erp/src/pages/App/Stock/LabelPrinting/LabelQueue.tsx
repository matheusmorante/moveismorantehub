import React from 'react';
import labelMdf from '../../../../assets/label_mdf.png';

interface LabelQueueProps {
    labelItems: any[];
    setLabelItems: React.Dispatch<React.SetStateAction<any[]>>;
    printingMode: 'simple' | 'advanced';
}

const LabelQueue: React.FC<LabelQueueProps> = ({ 
    labelItems, 
    setLabelItems, 
    printingMode 
}) => {
    
    const updateItem = (idx: number, updates: any) => {
        const newItems = [...labelItems];
        newItems[idx] = { ...newItems[idx], ...updates };
        setLabelItems(newItems);
    };

    const updateExtraField = (itemIdx: number, fieldId: string, value: string) => {
        const newItems = [...labelItems];
        const item = { ...newItems[itemIdx] };
        if (item.extraFields) {
            item.extraFields = item.extraFields.map((f: any) => 
                f.id === fieldId ? { ...f, text: value } : f
            );
            newItems[itemIdx] = item;
            setLabelItems(newItems);
        }
    };

    const rotateItem = (idx: number) => {
        const currentRotation = labelItems[idx].rotation || 0;
        const nextRotation = (currentRotation + 90) % 360;
        updateItem(idx, { rotation: nextRotation });
    };

    const removeItem = (idx: number) => {
        setLabelItems(prev => prev.filter((_, i) => i !== idx));
    };

    if (labelItems.length === 0) {
        return (
            <div className="py-12 flex flex-col items-center justify-center text-slate-300">
                <i className="bi bi-arrow-up-circle text-4xl mb-4 opacity-10" />
                <p className="text-[10px] font-black uppercase tracking-widest opacity-40">
                    Sua fila está vazia
                </p>
                <p className="text-[8px] font-bold uppercase tracking-tighter opacity-30 mt-1">Adicione itens para começar a imprimir</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {labelItems.map((item, idx) => (
                <div key={idx} className="group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 p-4 hover:shadow-xl hover:border-blue-500/30 transition-all animate-in fade-in slide-in-from-bottom-2 duration-300 flex items-center gap-6">
                    
                    {/* Miniatura Interativa */}
                    <div className="relative w-20 h-20 shrink-0 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden p-2 group/thumb shadow-inner">
                        <img 
                            src={item.image || labelMdf} 
                            style={{ 
                                transform: `scale(${item.scale || 1}) rotate(${item.rotation || 0}deg)`,
                                objectFit: item.imageFit || 'contain'
                            }} 
                            className="max-w-full max-h-full transition-all duration-500" 
                            alt="" 
                        />
                        <div className="absolute inset-0 bg-blue-600/90 backdrop-blur-sm opacity-0 group-hover/thumb:opacity-100 flex flex-col items-center justify-center gap-2 transition-all p-2">
                            <label className="w-full text-center py-1.5 bg-white text-blue-600 rounded-xl text-[8px] font-black uppercase cursor-pointer hover:scale-105 active:scale-95 transition-all shadow-lg">
                                Trocar Imagem
                                <input 
                                    type="file" accept="image/*" className="hidden" 
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => updateItem(idx, { image: ev.target?.result as string });
                                            reader.readAsDataURL(file);
                                        }
                                    }} 
                                />
                            </label>
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                        {/* Header do Item */}
                        <div className="flex items-center justify-between">
                            <div className="min-w-0">
                                <label className="text-[8px] font-black uppercase text-blue-500 mb-0.5 block tracking-widest">Item #{idx + 1}</label>
                                <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tighter">
                                    {item.name || 'Logotipo / Rótulo Sem Título'}
                                </h4>
                            </div>
                            <button 
                                onClick={() => removeItem(idx)}
                                className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700"
                            >
                                <i className="bi bi-trash3" />
                            </button>
                        </div>

                        {/* Grade de Controles (Padronizada com Preço) */}
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {/* Quantidade */}
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">QTD</label>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-1.5 group-focus-within:border-blue-500/30 transition-all">
                                    <button onClick={() => updateItem(idx, { quantity: Math.max(1, (item.quantity || 1) - 1) })} className="text-slate-400 hover:text-blue-500"><i className="bi bi-dash" /></button>
                                    <input 
                                        type="number" 
                                        value={item.quantity || 1}
                                        onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="w-full bg-transparent text-center text-[10px] font-black outline-none"
                                    />
                                    <button onClick={() => updateItem(idx, { quantity: (item.quantity || 1) + 1 })} className="text-slate-400 hover:text-blue-500"><i className="bi bi-plus" /></button>
                                </div>
                            </div>

                            {/* Escala (Zoom) */}
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Escala</label>
                                <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-1.5">
                                    <button 
                                        onClick={() => updateItem(idx, { scale: Math.max(0.1, Number((item.scale || 1) - 0.05).toFixed(2)) })}
                                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"
                                    >
                                        <i className="bi bi-dash text-xs" />
                                    </button>
                                    <input 
                                        type="number" step="0.01" min="0.1" max="20"
                                        value={item.scale || 1}
                                        onChange={e => updateItem(idx, { scale: parseFloat(e.target.value) || 1 })}
                                        className="w-full bg-transparent text-[10px] font-black outline-none text-center"
                                    />
                                    <button 
                                        onClick={() => updateItem(idx, { scale: Math.min(20, Number((item.scale || 1) + 0.05).toFixed(2)) })}
                                        className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"
                                    >
                                        <i className="bi bi-plus text-xs" />
                                    </button>
                                </div>
                            </div>

                            {/* Enquadramento */}
                            <div>
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Enquadrar</label>
                                <div className="relative">
                                    <select 
                                        value={item.imageFit || 'contain'}
                                        onChange={e => updateItem(idx, { imageFit: e.target.value as any })}
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-3 py-[7px] text-[10px] font-black uppercase outline-none appearance-none cursor-pointer"
                                    >
                                        <option value="contain">Ajustar</option>
                                        <option value="cover">Preencher</option>
                                        <option value="fill">Esticar</option>
                                    </select>
                                    <i className="bi bi-chevron-down absolute right-3 top-1/2 -translate-y-1/2 text-[8px] text-slate-400 pointer-events-none" />
                                </div>
                            </div>
                        </div>

                        {/* Campos Dinâmicos (SKU, Lote, etc) */}
                        <div className="flex flex-wrap gap-2 pt-2">
                            {item.extraFields?.map((f: any) => (
                                <div key={f.id} className="min-w-[100px] flex-1">
                                    <input 
                                        type="text" 
                                        value={f.text || ''} 
                                        placeholder={f.id.toUpperCase()}
                                        onChange={e => updateExtraField(idx, f.id, e.target.value)}
                                        className="w-full bg-slate-50/50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-lg px-3 py-1.5 text-[9px] font-black text-slate-600 dark:text-slate-400 outline-none focus:border-blue-500/30 transition-all placeholder:font-bold placeholder:opacity-30" 
                                    />
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LabelQueue;
