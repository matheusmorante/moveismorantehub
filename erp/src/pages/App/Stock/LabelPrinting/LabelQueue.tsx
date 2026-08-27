import React from 'react';
import labelMdf from '../../../../assets/label_mdf.png';

interface LabelQueueProps {
    labelItems: any[];
    setLabelItems: React.Dispatch<React.SetStateAction<any[]>>;
    printingMode: 'simple' | 'advanced';
    selectedCategory?: string;
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
                <div 
                    key={idx} 
                    draggable={selectedCategory !== 'precos' || printingMode === 'simple'}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`group relative bg-white dark:bg-slate-900 rounded-[2.5rem] border p-4 hover:shadow-xl hover:border-blue-500/30 transition-all duration-300 flex items-center gap-4 ${
                        (selectedCategory !== 'precos' || printingMode === 'simple') ? 'cursor-grab active:cursor-grabbing' : ''
                    } ${
                        dragOverIdx === idx 
                            ? 'border-2 border-dashed border-blue-500 bg-blue-500/5 scale-[1.01] z-10' 
                            : 'border-slate-100 dark:border-slate-800'
                    }`}
                >
                    {/* Drag Grip Handle */}
                    {(selectedCategory !== 'precos' || printingMode === 'simple') && (
                        <div className="text-slate-350 dark:text-slate-650 hover:text-slate-450 px-1 py-4 flex items-center justify-center pointer-events-none select-none">
                            <i className="bi bi-grip-vertical text-lg opacity-60" />
                        </div>
                    )}
                    
                    {/* Miniatura Interativa */}
                    {(selectedCategory !== 'precos' || printingMode === 'simple') && (
                        <div className="flex flex-col gap-2 items-center">
                            <div className="relative w-20 h-20 shrink-0 rounded-[1.5rem] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 flex items-center justify-center overflow-hidden p-2 group/thumb shadow-inner">
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

                    <div className="flex-1 flex flex-col gap-4 min-w-0">
                        {/* Layout compacto para etiquetas de preço no modo avançado */}
                        {selectedCategory === 'precos' && printingMode === 'advanced' && !item.isBlank && (
                            <div className="flex items-center gap-3">
                                {/* Título editável */}
                                <div className="flex-1 min-w-0">
                                    <input 
                                        type="text"
                                        value={item.name || ''}
                                        onChange={e => updateItem(idx, { name: e.target.value })}
                                        placeholder="Título na etiqueta..."
                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-[11px] font-black uppercase outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                                    />
                                </div>

                                {/* Visibilidade do título somente desta etiqueta */}
                                <button
                                    type="button"
                                    onClick={() => updateItem(idx, { showName: item.showName === false })}
                                    aria-pressed={item.showName !== false}
                                    title={item.showName === false ? 'Mostrar título na etiqueta' : 'Ocultar título na etiqueta'}
                                    className={`h-8 px-2 rounded-lg border text-[9px] font-black uppercase transition-all shrink-0 ${
                                        item.showName === false
                                            ? 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-500'
                                            : 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800 text-blue-600 dark:text-blue-300'
                                    }`}
                                >
                                    <i className={`bi ${item.showName === false ? 'bi-eye-slash' : 'bi-eye'} mr-1`} />
                                    {item.showName === false ? 'Título oculto' : 'Ocultar título'}
                                </button>

                                {/* Quantidade compacta */}
                                <div className="flex items-center gap-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-1.5 shrink-0">
                                    <button onClick={() => updateItem(idx, { quantity: Math.max(1, (item.quantity || 1) - 1) })} className="text-slate-400 hover:text-blue-500"><i className="bi bi-dash" /></button>
                                    <input 
                                        type="number" 
                                        value={item.quantity || 1}
                                        onChange={e => updateItem(idx, { quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                                        className="w-10 bg-transparent text-center text-[10px] font-black outline-none"
                                    />
                                    <button onClick={() => updateItem(idx, { quantity: (item.quantity || 1) + 1 })} className="text-slate-400 hover:text-blue-500"><i className="bi bi-plus" /></button>
                                </div>

                                {/* Botão excluir */}
                                <button 
                                    onClick={() => removeItem(idx)}
                                    className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700 shrink-0"
                                >
                                    <i className="bi bi-trash3" />
                                </button>
                            </div>
                        )}

                        {/* Layout para modo por imagem ou outras categorias */}
                        {(selectedCategory !== 'precos' || printingMode === 'simple' || item.isBlank) && (
                            <>
                                {/* Header do Item */}
                                <div className="flex items-center justify-between">
                                    <div className="min-w-0">
                                        <label className="text-[8px] font-black uppercase text-blue-500 mb-0.5 block tracking-widest">
                                            {item.isBlank ? 'Espaçador em Branco' : `Item #${idx + 1}`}
                                        </label>
                                        <h4 className="text-[11px] font-black text-slate-800 dark:text-white uppercase truncate tracking-tighter">
                                            {item.isBlank ? 'Etiqueta Em Branco (Vazia)' : (item.name || 'Etiqueta Personalizada')}
                                        </h4>
                                    </div>
                                    <button 
                                        onClick={() => removeItem(idx)}
                                        className="w-8 h-8 rounded-full bg-slate-50 dark:bg-slate-800 text-slate-400 hover:bg-red-500 hover:text-white transition-all flex items-center justify-center border border-slate-100 dark:border-slate-700"
                                    >
                                        <i className="bi bi-trash3" />
                                    </button>
                                </div>

                                {/* Grade de Controles */}
                                <div className={`grid grid-cols-1 ${item.isBlank ? 'sm:grid-cols-1' : 'sm:grid-cols-2'} gap-3`}>
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

                                    {!item.isBlank && (
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1.5 block px-1">Escala</label>
                                            <div className="flex items-center gap-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl px-2 py-1.5">
                                                <button 
                                                    onClick={() => updateItem(idx, { scale: Math.max(0.1, parseFloat(((item.scale || 1) - 0.05).toFixed(2))) })}
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
                                                    onClick={() => updateItem(idx, { scale: Math.min(20, parseFloat(((item.scale || 1) + 0.05).toFixed(2))) })}
                                                    className="w-6 h-6 rounded-lg bg-white dark:bg-slate-900 shadow-sm flex items-center justify-center text-slate-400 hover:text-blue-500 transition-all"
                                                >
                                                    <i className="bi bi-plus text-xs" />
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {/* Opções de Design Avançado (Título, Preço e Preço Promocional) */}
                                {printingMode === 'advanced' && !item.isBlank && (
                                    <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
                                        <div>
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                                Título na Etiqueta
                                            </label>
                                            <input 
                                                type="text"
                                                value={item.name || ''}
                                                onChange={e => updateItem(idx, { name: e.target.value })}
                                                placeholder="Ex: Guarda-Roupa Casal..."
                                                className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-black uppercase outline-none focus:border-blue-500 transition-all text-slate-800 dark:text-slate-100"
                                            />
                                        </div>

                                        {selectedCategory !== 'precos' && (
                                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                                        Preço de Venda
                                                    </label>
                                                    <input 
                                                        type="text"
                                                        value={item.price || ''}
                                                        onChange={e => updateItem(idx, { price: e.target.value })}
                                                        placeholder="R$ 0,00"
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-black outline-none focus:border-blue-500 transition-all text-emerald-600 dark:text-emerald-400"
                                                    />
                                                </div>

                                                <div>
                                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-1 block">
                                                        Preço Promocional
                                                    </label>
                                                    <input 
                                                        type="text"
                                                        value={item.promoPrice || ''}
                                                        onChange={e => updateItem(idx, { promoPrice: e.target.value })}
                                                        placeholder="R$ 0,00 (opcional)"
                                                        className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-1.5 text-[11px] font-black outline-none focus:border-blue-500 transition-all text-blue-600 dark:text-blue-400"
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </>
                        )}

                        {/* Campos Dinâmicos (SKU, Lote, etc) */}
                        {!item.isBlank && item.extraFields && item.extraFields.length > 0 && (
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
                        )}
                    </div>
                </div>
            ))}
        </div>
    );
};

export default LabelQueue;
