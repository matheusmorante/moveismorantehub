import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import VariationType from "../../../types/variation.type";
import { subscribeToVariations } from "../../../utils/variationService";
import { toast } from "react-toastify";

interface CartesianVariationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onGenerate: (attributes: { name: string, values: string[], showName: boolean }[]) => void;
    isGenerating: boolean;

}

const CartesianVariationModal = ({ isOpen, onClose, onGenerate, isGenerating }: CartesianVariationModalProps) => {
    const [availableVariations, setAvailableVariations] = useState<VariationType[]>([]);
    const [selectedOptions, setSelectedOptions] = useState<{ name: string, values: string[], showName: boolean }[]>([]);


    useEffect(() => {
        if (isOpen) {
            const unsubscribe = subscribeToVariations((data) => {
                setAvailableVariations(data.filter(v => v.active && !v.deleted));
            });
            return () => unsubscribe();
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const handleAddAttribute = () => {
        setSelectedOptions([...selectedOptions, { name: '', values: [], showName: true }]);
    };

    const handleAttributeChange = (idx: number, attrName: string) => {
        const next = [...selectedOptions];
        next[idx].name = attrName;
        next[idx].values = [];
        setSelectedOptions(next);
    };

    const handleValueToggle = (idx: number, value: string) => {
        const next = [...selectedOptions];
        const currentValues = next[idx].values;
        if (currentValues.includes(value)) {
            next[idx].values = currentValues.filter(v => v !== value);
        } else {
            next[idx].values = [...currentValues, value];
        }
        setSelectedOptions(next);
    };

    const handleGenerate = () => {
        const validOptions = selectedOptions.filter(o => o.name && o.values.length > 0);
        if (validOptions.length === 0) {
            toast.warning("Selecione pelo menos um atributo e um valor.");
            return;
        }
        onGenerate(validOptions);
        setSelectedOptions([]); // Reset for next time

    };

    return createPortal(
        <div className="fixed inset-0 z-[10001] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-900 w-full max-w-2xl h-[80vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-300 border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="px-8 py-6 border-b border-slate-50 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div>
                        <h3 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <i className="bi bi-grid-3x3-gap-fill text-blue-600"></i>
                            Gerador de Grade (Cartesiano)
                        </h3>
                        <p className="text-[10px] uppercase font-black text-slate-400 tracking-widest mt-1">
                            Crie múltiplas variações automaticamente
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button 
                            disabled={isGenerating}
                            onClick={onClose} 
                            className="p-2 text-slate-400 hover:text-red-500 disabled:opacity-30 transition-colors bg-slate-50 dark:bg-slate-800 rounded-xl"
                        >
                            <i className="bi bi-x-lg"></i>
                        </button>
                    </div>

                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar space-y-6">
                    {selectedOptions.map((opt, idx) => {
                        const selectedAttr = availableVariations.find(v => v.name === opt.name);
                        return (
                            <div key={idx} className="bg-slate-50 dark:bg-slate-950/20 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 animate-in slide-in-from-left-2 transition-all">
                                <div className="flex gap-4 items-start">
                                    <div className="flex-1 space-y-4">
                                        <div className="flex items-center justify-between gap-4">
                                            <div className="flex-1 space-y-2">
                                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Atributo</label>
                                                <select
                                                    value={opt.name}
                                                    onChange={(e) => handleAttributeChange(idx, e.target.value)}
                                                    className="w-full bg-white dark:bg-slate-950 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 outline-none text-xs font-bold dark:text-slate-200"
                                                >
                                                    <option value="">Selecione...</option>
                                                    {availableVariations.map(v => (
                                                        <option key={v.id} value={v.name}>{v.name}</option>
                                                    ))}
                                                </select>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const next = [...selectedOptions];
                                                    next[idx].showName = !next[idx].showName;
                                                    setSelectedOptions(next);
                                                }}
                                                className={`mt-6 px-4 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest transition-all ${opt.showName ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600' : 'bg-slate-100 dark:bg-slate-800 text-slate-400'}`}
                                                title={opt.showName ? "Mostrar nome no título" : "Ocultar nome no título"}
                                            >
                                                <i className={`bi ${opt.showName ? 'bi-eye-fill' : 'bi-eye-slash-fill'} mr-1.5`}></i>
                                                {opt.showName ? "Mostrar Nome" : "Ocultar Nome"}
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                                                Valores ({opt.values.length} selecionados)
                                            </label>
                                            <div className="flex flex-wrap gap-2 min-h-[44px]">
                                                {!selectedAttr && (
                                                    <p className="text-[10px] text-slate-300 italic py-2">Escolha um atributo primeiro</p>
                                                )}
                                                {selectedAttr?.options.map(o => {
                                                    const isSelected = opt.values.includes(o.value);
                                                    return (
                                                        <button
                                                            key={o.id}
                                                            type="button"
                                                            onClick={() => handleValueToggle(idx, o.value)}
                                                            className={`px-3 py-1.5 rounded-xl text-[10px] font-bold border transition-all ${isSelected 
                                                                ? 'bg-blue-600 text-white border-blue-600 shadow-md shadow-blue-500/20 active:scale-95' 
                                                                : 'bg-white dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-100 dark:border-slate-800 hover:border-blue-200'}`}
                                                        >
                                                            {o.value}
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setSelectedOptions(selectedOptions.filter((_, i) => i !== idx))}
                                        className="w-10 h-10 flex items-center justify-center text-slate-300 hover:text-red-500 transition-colors shrink-0 mt-6"
                                    >
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </div>
                            </div>
                        );
                    })}

                    <button
                        type="button"
                        onClick={handleAddAttribute}
                        className="w-full py-4 border-2 border-dashed border-slate-100 dark:border-slate-800 rounded-3xl text-slate-400 hover:text-blue-600 hover:border-blue-100 dark:hover:border-blue-900/30 transition-all flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest"
                    >
                        <i className="bi bi-plus-lg"></i>
                        Adicionar Atributo para Combinação
                    </button>
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-800 flex gap-4 shrink-0 bg-white dark:bg-slate-900">
                    <button
                        onClick={onClose}
                        disabled={isGenerating}
                        className="flex-1 py-4 bg-slate-50 dark:bg-slate-800 text-slate-400 rounded-2xl font-black uppercase tracking-widest text-[10px] disabled:opacity-50"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || selectedOptions.length === 0}
                        className="flex-[2] py-4 bg-blue-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-xl shadow-blue-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50"
                    >
                        {isGenerating ? (
                            <><i className="bi bi-hourglass-split animate-spin mr-2"></i> Gerando...</>
                        ) : (
                            <><i className="bi bi-magic mr-2"></i> Gerar Combinações</>
                        )}
                    </button>
                </div>
            </div>
        </div>
    , document.body);
};

export default CartesianVariationModal;
