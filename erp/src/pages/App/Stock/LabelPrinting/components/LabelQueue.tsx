import React from 'react';
import labelMdf from '../../../../../assets/label_mdf.png';


interface LabelQueueProps {
    labelItems: any[];
    setLabelItems: React.Dispatch<React.SetStateAction<any[]>>;
    printingMode: 'simple' | 'advanced';
    selectedCategory?: string | null;
}

const LabelQueue: React.FC<LabelQueueProps> = ({ 
    labelItems, 
    setLabelItems, 
    printingMode,
    selectedCategory
}) => {
    const [dragOverIdx, setDragOverIdx] = React.useState<number | null>(null);
    
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

    const removeItem = (idx: number) => {
        setLabelItems(prev => prev.filter((_, i) => i !== idx));
    };

    const handleDragStart = (e: React.DragEvent, index: number) => {
        e.dataTransfer.setData('text/plain', index.toString());
        e.dataTransfer.effectAllowed = 'move';
    };

    const handleDragOver = (e: React.DragEvent, index: number) => {
        e.preventDefault();
        if (dragOverIdx !== index) {
            setDragOverIdx(index);
        }
    };

    const handleDragLeave = () => {
        setDragOverIdx(null);
    };

    const handleDrop = (e: React.DragEvent, targetIndex: number) => {
        e.preventDefault();
        setDragOverIdx(null);
        const sourceIndexStr = e.dataTransfer.getData('text/plain');
        if (sourceIndexStr) {
            const sourceIndex = parseInt(sourceIndexStr, 10);
            if (sourceIndex !== targetIndex && sourceIndex >= 0 && sourceIndex < labelItems.length) {
                const newItems = [...labelItems];
                const [movedItem] = newItems.splice(sourceIndex, 1);
                newItems.splice(targetIndex, 0, movedItem);
                setLabelItems(newItems);
            }
        }
    };

    if (labelItems.length === 0) {
        return (
            <div className="py-8 flex flex-col items-center justify-center text-slate-400 dark:text-slate-500">
                <i className="bi bi-tags text-4xl mb-4 opacity-50" />
                <p className="text-xs font-black uppercase tracking-widest text-center">
                    Nenhuma etiqueta adicionada
                </p>
                <p className="text-[10px] font-bold text-center mt-2 max-w-[200px] leading-relaxed opacity-80">
                    Busque um produto acima para começar a montar a impressão.
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-3">
            {labelItems.map((item, idx) => (
                <div 
                    key={idx} 
                    draggable={selectedCategory !== 'precos' || printingMode === 'simple'}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`group relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[1.75rem] border p-3 hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex items-center gap-3 ${
                        (selectedCategory !== 'precos' || printingMode === 'simple') ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                        dragOverIdx === idx 
                            ? 'border-2 border-dashed border-blue-500 bg-blue-500/5 scale-[1.01] z-10' 
                            : 'border-slate-100 dark:border-slate-800'
                    }`}
                >
                    {/* Drag Grip Handle */}
                    {(selectedCategory !== 'precos' || printingMode === 'simple') && (
                        <div className="text-slate-350 dark:text-slate-650 hover:text-slate-450 px-1 py-2 flex items-center justify-center pointer-events-none select-none">
                            <i className="bi bi-grip-vertical text-base opacity-60" />
                        </div>
                    )}
                    
                    {/* Miniatura Interativa */}
                    {selectedCategory !== 'identificacao' && (selectedCategory !== 'precos' || printingMode === 'simple') && (
                        <div className="flex flex-col gap-2 items-center">
                            <div className="relative w-16 h-16 shrink-0 rounded-[1.25rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden p-1.5 group/thumb shadow-inner">
                                {item.isBlank ? (
                                    <div className="w-full h-full border border-dashed border-slate-300 dark:border-slate-700 rounded-lg flex items-center justify-center bg-white dark:bg-slate-900">
                                        <span className="text-[8px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-tighter text-center">EM BRANCO</span>
                                    </div>
                                ) : (
                                    <img 
                                        src={item.image || labelMdf} 
                                        style={{ 
                                            transform: `scale(${item.scale || 1}) rotate(${item.rotation || 0}deg)`,
                                            objectFit: item.imageFit || 'contain'
                                        }} 
                                        className="max-w-full max-h-full transition-all duration-500" 
                                        alt="" 
                                    />
                                )}
                                {!item.isBlank && (
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
                                )}
                            </div>
                            
                            {!item.isBlank && (item.productImages?.length > 0 || item.parentImages?.length > 0) && (() => {
                                const allImages = [...(item.productImages || []), ...(item.parentImages || [])];
                                if (allImages.length <= 1) return null;
                                const currentIndex = item.currentImageIndex || 0;
                                return (
                                    <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-1 py-0.5 shadow-sm mt-[-4px]">
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newIndex = (currentIndex - 1 + allImages.length) % allImages.length;
                                                updateItem(idx, { currentImageIndex: newIndex, image: allImages[newIndex].image_url });
                                            }}
                                            className="text-slate-400 hover:text-blue-500 p-0.5"
                                        >
                                            <i className="bi bi-chevron-left text-[10px]" />
                                        </button>
                                        <span className="text-[9px] font-bold text-slate-500 select-none min-w-[20px] text-center">
                                            {currentIndex + 1}/{allImages.length}
                                        </span>
                                        <button 
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                const newIndex = (currentIndex + 1) % allImages.length;
                                                updateItem(idx, { currentImageIndex: newIndex, image: allImages[newIndex].image_url });
                                            }}
                                            className="text-slate-400 hover:text-blue-500 p-0.5"
                                        >
                                            <i className="bi bi-chevron-right text-[10px]" />
                                        </button>
                                    </div>
                                );
                            })()}
                        </div>
                    )}

                    <div className="flex-1 flex flex-col gap-3 min-w-0">
                        {/* CABEÇALHO DO ITEM (Produto / SKU) e AÇÕES (Qtd / Lixeira) */}
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                            {/* Nome e SKU */}
                            <div className="min-w-0 flex-1">
                                {item.isBlank ? (
                                    <>
                                        <label className="text-[8px] font-black uppercase text-slate-400 mb-0.5 block tracking-widest">
                                            Espaçador
                                        </label>
                                        <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tighter">
                                            Etiqueta Em Branco
                                        </h4>
                                    </>
                                ) : (
                                    <>
                                        <h4 className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase truncate" title={item.name || 'Produto sem nome'}>
                                            {item.name || 'Produto sem nome'}
                                        </h4>
                                        <div className="flex items-center gap-2 mt-1">
                                            {selectedCategory !== 'precos' && (item.sku || item.code) && (
                                                <div className="flex items-center gap-1.5">
                                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400">SKU</span>
                                                    <span className="text-[10px] text-slate-600 dark:text-slate-300 font-bold truncate uppercase tracking-wide bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                                                        {item.sku || item.code}
                                                    </span>
                                                </div>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                            
                            {/* Quantidade e Lixeira */}
                            <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-lg px-1.5 py-1 shrink-0">
                                    <span className="text-[9px] font-black text-slate-400 mr-1 uppercase hidden md:inline">Qtd</span>
                                    <button onClick={() => updateItem(idx, { quantity: Math.max(1, (item.quantity || 1) - 1) })} className="text-slate-500 hover:text-blue-500 w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-sm"><i className="bi bi-dash" /></button>
                                    <input 
                                        type="number" 
                                        value={item.quantity || 1}
                                        onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="w-8 bg-transparent text-center text-xs font-black outline-none text-slate-700 dark:text-slate-200"
                                    />
                                    <button onClick={() => updateItem(idx, { quantity: (item.quantity || 1) + 1 })} className="text-slate-500 hover:text-blue-500 w-5 h-5 flex items-center justify-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded shadow-sm"><i className="bi bi-plus" /></button>
                                </div>

                                <button 
                                    onClick={() => removeItem(idx)}
                                    className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 text-slate-400 hover:bg-red-50 hover:text-red-500 hover:border-red-200 transition-all flex items-center justify-center border border-slate-200 dark:border-slate-800 shrink-0 shadow-sm"
                                    title="Remover item"
                                >
                                    <i className="bi bi-trash3-fill text-sm" />
                                </button>
                            </div>
                        </div>

                        {/* OPÇÕES DE LOGO / IMAGEM LIVRE (Zoom) */}
                        {(selectedCategory === 'logos' || (selectedCategory === 'precos' && printingMode === 'simple')) && !item.isBlank && (
                            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 mt-1">
                                <div className="flex items-center gap-2 w-max bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-lg px-1.5 py-1">
                                    <span className="text-[8px] font-black uppercase tracking-widest text-slate-400 mr-1 hidden md:inline">Escala</span>
                                    <button 
                                        onClick={() => updateItem(idx, { scale: Math.max(0.1, parseFloat(((item.scale || 1) - 0.05).toFixed(2))) })}
                                        className="w-5 h-5 rounded bg-white dark:bg-slate-900 border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-500"
                                    >
                                        <i className="bi bi-dash text-xs" />
                                    </button>
                                    <input 
                                        type="number" step="5" min="10" max="2000"
                                        value={Math.round((item.scale || 1) * 100)}
                                        onChange={e => updateItem(idx, { scale: Math.max(0.1, Math.min(20, (parseFloat(e.target.value) || 100) / 100)) })}
                                        className="w-10 bg-transparent text-[10px] font-black outline-none text-center"
                                    />
                                    <span className="text-[9px] font-black text-slate-400">%</span>
                                    <button 
                                        onClick={() => updateItem(idx, { scale: Math.min(20, parseFloat(((item.scale || 1) + 0.05).toFixed(2))) })}
                                        className="w-5 h-5 rounded bg-white dark:bg-slate-900 border border-slate-200 shadow-sm flex items-center justify-center text-slate-500 hover:text-blue-500"
                                    >
                                        <i className="bi bi-plus text-xs" />
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LabelQueue;
