import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

export interface VariationParentImagesSelectModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
    readonly parentImages: readonly string[];
    readonly selectedImages: readonly string[];
    readonly maxSelection: number;
    readonly onConfirm: (selected: string[]) => void;
}

export const VariationParentImagesSelectModal: React.FC<VariationParentImagesSelectModalProps> = ({
    isOpen,
    onClose,
    parentImages,
    selectedImages,
    maxSelection,
    onConfirm
}) => {
    const [tempSelected, setTempSelected] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTempSelected((selectedImages || []).slice(0, maxSelection));
        }
    }, [isOpen, selectedImages, maxSelection]);

    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    const toggleImage = (url: string) => {
        setTempSelected(prev => {
            if (prev.includes(url)) {
                return prev.filter(u => u !== url);
            } else {
                if (prev.length >= maxSelection) return prev;
                return [...prev, url];
            }
        });
    };

    const handleSelectAll = () => {
        if (tempSelected.length === Math.min(parentImages.length, maxSelection)) {
            setTempSelected([]);
        } else {
            setTempSelected(parentImages.slice(0, maxSelection));
        }
    };

    const handleFinish = () => {
        onConfirm(tempSelected);
        onClose();
    };

    return createPortal(
        <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="select-parent-images-title"
            className="fixed inset-0 z-[1000025] flex items-center justify-center p-4 sm:p-6"
        >
            <div
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200"
                onClick={onClose}
            />
            <div className="relative bg-white dark:bg-slate-950 w-full max-w-3xl max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 z-10">
                {/* Header */}
                <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0" aria-hidden="true">
                            <i className="bi bi-images text-xl" />
                        </div>
                        <div>
                            <h3 id="select-parent-images-title" className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
                                Selecionar Fotos do Pai
                            </h3>
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                                Marque as fotos que deseja vincular a esta variação
                            </p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-2xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors cursor-pointer"
                        aria-label="Fechar modal"
                    >
                        <i className="bi bi-x-lg" aria-hidden="true" />
                    </button>
                </div>

                {/* Subheader com contador e ações rápidas */}
                <div className="px-6 py-3 sm:px-8 bg-slate-50 dark:bg-slate-900/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <span className="text-xs font-bold text-slate-600 dark:text-slate-400">
                        Selecionadas: <strong className="text-blue-600 dark:text-blue-400 font-black">{tempSelected.length}</strong> de {maxSelection} máx.
                    </span>

                    {parentImages.length > 0 && (
                        <button
                            type="button"
                            onClick={handleSelectAll}
                            className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                        >
                            {tempSelected.length === Math.min(parentImages.length, maxSelection)
                                ? "Desmarcar Todas"
                                : "Selecionar Todas"}
                        </button>
                    )}
                </div>

                {/* Body - Grid de Fotos do Pai */}
                <div className="p-6 sm:p-8 overflow-y-auto flex-1">
                    {parentImages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 text-center">
                            <div className="w-16 h-16 rounded-3xl bg-slate-100 dark:bg-slate-900 flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4" aria-hidden="true">
                                <i className="bi bi-image text-3xl" />
                            </div>
                            <h4 className="text-sm font-black text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                                Nenhuma foto cadastrada no produto pai
                            </h4>
                            <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                Adicione fotos na aba principal do produto para poder vinculá-las aqui.
                            </p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                            {parentImages.map((url, idx) => {
                                const isSelected = tempSelected.includes(url);
                                const selectionOrder = tempSelected.indexOf(url) + 1;

                                return (
                                    <button
                                        key={`${url}-${idx}`}
                                        type="button"
                                        onClick={() => toggleImage(url)}
                                        aria-pressed={isSelected}
                                        aria-label={`Foto ${idx + 1} do produto pai, ${isSelected ? `selecionada posição ${selectionOrder}` : 'não selecionada'}`}
                                        className={`group relative aspect-square rounded-2xl overflow-hidden border-2 transition-all cursor-pointer text-left ${
                                            isSelected
                                                ? "border-blue-600 ring-4 ring-blue-500/20 shadow-md scale-[1.02]"
                                                : "border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 opacity-80 hover:opacity-100"
                                        }`}
                                    >
                                        <img
                                            src={url}
                                            alt={`Foto ${idx + 1} do pai`}
                                            className="w-full h-full object-cover pointer-events-none"
                                        />

                                        {/* Overlay de Seleção */}
                                        <div
                                            className={`absolute inset-0 transition-colors flex items-start justify-end p-2.5 ${
                                                isSelected
                                                    ? "bg-blue-600/15"
                                                    : "group-hover:bg-black/10"
                                            }`}
                                        >
                                            <div
                                                className={`w-7 h-7 rounded-xl flex items-center justify-center text-xs font-black shadow-md transition-all ${
                                                    isSelected
                                                        ? "bg-blue-600 text-white shadow-blue-500/30 scale-105"
                                                        : "bg-white/90 dark:bg-slate-900/90 text-slate-400 border border-slate-200 dark:border-slate-700"
                                                }`}
                                            >
                                                {isSelected ? (
                                                    <span>{selectionOrder}</span>
                                                ) : (
                                                    <i className="bi bi-plus text-base" aria-hidden="true" />
                                                )}
                                            </div>
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 sm:px-8 border-t border-slate-100 dark:border-slate-800 flex items-center justify-end gap-3 shrink-0 bg-white dark:bg-slate-950">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleFinish}
                        className="px-6 py-2.5 rounded-2xl font-black text-xs uppercase tracking-wider bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
                    >
                        Confirmar ({tempSelected.length})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VariationParentImagesSelectModal;
