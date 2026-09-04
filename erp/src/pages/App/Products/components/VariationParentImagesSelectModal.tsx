import React, { useState, useEffect } from "react";
import { createPortal } from "react-dom";

interface VariationParentImagesSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
    parentImages: string[];
    selectedImages: string[];
    onConfirm: (selected: string[]) => void;
}

export const VariationParentImagesSelectModal: React.FC<VariationParentImagesSelectModalProps> = ({
    isOpen,
    onClose,
    parentImages,
    selectedImages,
    onConfirm
}) => {
    const [tempSelected, setTempSelected] = useState<string[]>([]);

    useEffect(() => {
        if (isOpen) {
            setTempSelected(selectedImages || []);
        }
    }, [isOpen, selectedImages]);

    if (!isOpen) return null;

    const toggleImage = (url: string) => {
        setTempSelected(prev => {
            if (prev.includes(url)) {
                return prev.filter(u => u !== url);
            } else {
                return [...prev, url];
            }
        });
    };

    const handleSelectAll = () => {
        if (tempSelected.length === parentImages.length) {
            setTempSelected([]);
        } else {
            setTempSelected([...parentImages]);
        }
    };

    const handleFinish = () => {
        onConfirm(tempSelected);
        onClose();
    };

    return createPortal(
        <div className="fixed inset-0 z-[100005] flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose} />
            <div className="relative bg-white dark:bg-slate-950 w-full max-w-3xl max-h-[85vh] rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-slate-100 dark:border-slate-800 z-10">
                {/* Header */}
                <div className="px-6 py-5 sm:px-8 sm:py-6 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0 bg-white dark:bg-slate-950">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
                            <i className="bi bi-images text-xl" />
                        </div>
                        <div>
                            <h3 className="text-lg sm:text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
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
                        className="w-10 h-10 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-500/10 rounded-xl transition-all cursor-pointer"
                    >
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 custom-scrollbar space-y-4">
                    {parentImages.length === 0 ? (
                        <div className="text-center py-12 px-6 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50 dark:bg-slate-900 flex flex-col items-center justify-center gap-2">
                            <i className="bi bi-image text-3xl text-slate-300 dark:text-slate-600" />
                            <p className="text-xs font-black uppercase tracking-widest text-slate-500 dark:text-slate-400">
                                Nenhuma foto cadastrada no produto pai
                            </p>
                            <p className="text-[11px] text-slate-400">
                                Adicione fotos na aba principal do produto para poder vinculá-las aqui.
                            </p>
                        </div>
                    ) : (
                        <>
                            <div className="flex items-center justify-between pb-1">
                                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    {tempSelected.length} de {parentImages.length} selecionada(s)
                                </span>
                                <button
                                    type="button"
                                    onClick={handleSelectAll}
                                    className="text-[10px] font-black uppercase tracking-wider text-blue-600 dark:text-blue-400 hover:underline"
                                >
                                    {tempSelected.length === parentImages.length ? "Desmarcar Todas" : "Selecionar Todas"}
                                </button>
                            </div>

                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
                                {parentImages.map((url, imgIndex) => {
                                    const isSelected = tempSelected.includes(url);
                                    const selectedOrder = tempSelected.indexOf(url) + 1;

                                    return (
                                        <button
                                            key={imgIndex}
                                            type="button"
                                            onClick={() => toggleImage(url)}
                                            className={`group relative aspect-square rounded-none overflow-hidden cursor-pointer transition-all border-3 ${
                                                isSelected
                                                    ? "border-blue-600 ring-4 ring-blue-500/30 scale-[1.02] shadow-md opacity-100"
                                                    : "border-slate-200 dark:border-slate-800 opacity-60 hover:opacity-100 hover:border-blue-300"
                                            }`}
                                        >
                                            <img
                                                src={url}
                                                alt={`Foto Pai ${imgIndex + 1}`}
                                                className="object-cover h-full w-full pointer-events-none"
                                            />

                                            {/* Indicador de Seleção */}
                                            {isSelected ? (
                                                <div className="absolute top-2 right-2 w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg text-xs font-black border-2 border-white">
                                                    <i className="bi bi-check-lg" />
                                                </div>
                                            ) : (
                                                <div className="absolute top-2 right-2 w-6 h-6 rounded-full border-2 border-white/80 bg-black/30 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity" />
                                            )}
                                        </button>
                                    );
                                })}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between bg-white dark:bg-slate-950 shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-300 rounded-xl font-black uppercase tracking-widest text-[10px] transition-all cursor-pointer"
                    >
                        Cancelar
                    </button>
                    <button
                        type="button"
                        onClick={handleFinish}
                        className="px-8 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black uppercase tracking-widest text-[10px] shadow-lg shadow-blue-500/20 transition-all cursor-pointer active:scale-95"
                    >
                        Concluir ({tempSelected.length})
                    </button>
                </div>
            </div>
        </div>,
        document.body
    );
};

export default VariationParentImagesSelectModal;
