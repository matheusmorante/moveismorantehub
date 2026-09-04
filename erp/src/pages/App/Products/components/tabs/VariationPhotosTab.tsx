import React, { useState } from "react";
import VariationParentImagesSelectModal from "../VariationParentImagesSelectModal";

interface VariationPhotosTabProps {
    images: string[];
    parentImages: string[];
    onChangeImages: (images: string[]) => void;
}

export const VariationPhotosTab: React.FC<VariationPhotosTabProps> = ({
    images,
    parentImages,
    onChangeImages
}) => {
    const [isSelectModalOpen, setIsSelectModalOpen] = useState(false);
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);

    const handleRemoveImage = (indexToRemove: number) => {
        const next = images.filter((_, idx) => idx !== indexToRemove);
        onChangeImages(next);
    };

    return (
        <div className="space-y-4 animate-in fade-in duration-350">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-1.5 h-6">
                        <span>Fotos da Variação</span>
                        <span className="text-red-500">*</span>
                        <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo Digital</span>
                    </h3>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-0.5">
                        Clique no botão para vincular fotos do produto pai. Arraste para reordenar (a 1ª foto é a capa).
                    </p>
                </div>

                {images.length > 0 && (
                    <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-xl border border-blue-100 dark:border-blue-800">
                        {images.length} foto(s) vinculada(s)
                    </span>
                )}
            </div>

            {/* Grid com Input 1:1 + Fotos Vinculadas */}
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 pt-1">
                {/* Slot/Input 1:1 de Adicionar/Vincular Fotos */}
                <button
                    type="button"
                    onClick={() => setIsSelectModalOpen(true)}
                    className="group relative aspect-square rounded-none border-2 border-dashed border-blue-300 dark:border-blue-800 hover:border-blue-500 bg-blue-50/40 dark:bg-blue-950/20 hover:bg-blue-50/80 dark:hover:bg-blue-900/30 transition-all flex flex-col items-center justify-center gap-2 text-center p-3 cursor-pointer shadow-xs hover:shadow-md"
                >
                    <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/30 group-hover:scale-110 transition-transform">
                        <i className="bi bi-plus-lg text-lg" />
                    </div>
                    <div>
                        <span className="text-xs font-black text-blue-600 dark:text-blue-400 block">
                            Vincular Fotos
                        </span>
                        <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block mt-0.5">
                            Fotos do Pai
                        </span>
                    </div>
                </button>

                {/* Fotos Vinculadas com Drag and Drop */}
                {images.map((url, index) => {
                    const isCover = index === 0;

                    return (
                        <div
                            key={`${url}-${index}`}
                            draggable
                            onDragStart={() => setDraggedIndex(index)}
                            onDragOver={(e) => {
                                e.preventDefault();
                                if (draggedIndex === null || draggedIndex === index) return;
                                const newImages = [...images];
                                const item = newImages.splice(draggedIndex, 1)[0];
                                newImages.splice(index, 0, item);
                                setDraggedIndex(index);
                                onChangeImages(newImages);
                            }}
                            onDragEnd={() => setDraggedIndex(null)}
                            className={`group relative aspect-square rounded-none overflow-hidden border-2 cursor-grab active:cursor-grabbing transition-all shadow-sm bg-slate-50 dark:bg-slate-900 ${
                                isCover
                                    ? "border-blue-500 ring-2 ring-blue-500/30"
                                    : "border-slate-200 dark:border-slate-800 hover:border-blue-300"
                            } ${draggedIndex === index ? "opacity-50 scale-95" : "opacity-100"}`}
                            title="Arraste para reordenar as fotos"
                        >
                            <img
                                src={url}
                                alt={`Foto ${index + 1}`}
                                className="object-cover w-full h-full pointer-events-none"
                            />

                            {/* Badge Capa */}
                            {isCover && (
                                <div className="absolute top-2 left-2 z-10 bg-blue-600 text-white text-[9px] font-black uppercase tracking-wider px-2.5 py-0.5 rounded-full shadow-md border border-white/40 flex items-center gap-1">
                                    <i className="bi bi-star-fill text-[8px]" />
                                    Capa
                                </div>
                            )}

                            {/* Botão Remover/Desvincular */}
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleRemoveImage(index);
                                }}
                                className="absolute top-2 right-2 z-10 w-7 h-7 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-md opacity-0 group-hover:opacity-100 transition-all hover:scale-110 cursor-pointer"
                                title="Desvincular foto"
                            >
                                <i className="bi bi-trash text-xs" />
                            </button>

                            {/* Dica de arrasto em hover */}
                            <div className="absolute inset-x-0 bottom-0 py-1 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white text-[8px] font-black uppercase tracking-wider gap-1 pointer-events-none">
                                <i className="bi bi-arrows-move" />
                                Arrastar
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Modal de Seleção de Fotos do Pai */}
            <VariationParentImagesSelectModal
                isOpen={isSelectModalOpen}
                onClose={() => setIsSelectModalOpen(false)}
                parentImages={parentImages}
                selectedImages={images}
                onConfirm={(selected) => onChangeImages(selected)}
            />
        </div>
    );
};

export default VariationPhotosTab;
