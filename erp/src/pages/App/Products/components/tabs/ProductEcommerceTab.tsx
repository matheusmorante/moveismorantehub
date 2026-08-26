import React, { useState } from 'react';
import Product from '../../../../types/product.type';
import { compressImageToFile } from '@/pages/utils/imageUtils';
import { uploadFile } from '@/pages/utils/storageService';
import { parseVariationImages } from '@/pages/utils/productService';
import { toast } from 'react-toastify';

interface ProductEcommerceTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    activeEcommerceSubTab?: 'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo';
    setActiveEcommerceSubTab?: React.Dispatch<React.SetStateAction<'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo'>>;
    isDraggingPhoto?: boolean;
    setIsDraggingPhoto?: React.Dispatch<React.SetStateAction<boolean>>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent | { files: File[] }) => void;
    removingPhoto?: string | null;
    removePhoto: (url: string) => void;
    handleGenerateAIDescription?: (type: 'whatsapp' | 'ecommerce') => void;
    isGeneratingDescription?: boolean;
    handleGenerateMarketplaceTitle?: () => void;
    isGeneratingTitle?: boolean;
    handleToggleActive?: () => void;
}

const ProductEcommerceTab: React.FC<ProductEcommerceTabProps> = ({
    formData,
    setFormData,
    handleFileChange,
    removePhoto
}) => {
    const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
    const [replacingIndex, setReplacingIndex] = useState<number | null>(null);
    const maxPhotos = 15;
    const currentCount = (formData.images || []).length;

    const handleReplacePhoto = async (index: number, file: File) => {
        setReplacingIndex(index);
        try {
            const compressed = await compressImageToFile(file, { maxMB: 0.1, maxWidth: 1200 });
            const fileExt = file.name.split('.').pop() || 'jpg';
            const fileName = `${Math.random().toString(36).substring(2)}_${Date.now()}.${fileExt}`;
            const path = `products/${fileName}`;
            const newUrl = await uploadFile(compressed, path);

            const updatedImages = [...(formData.images || [])];
            updatedImages[index] = newUrl;
            setFormData(prev => ({ ...prev, images: updatedImages }));
            toast.success("Foto substituída com sucesso!");
        } catch (error) {
            console.error("Erro ao substituir foto:", error);
            toast.error("Erro ao substituir a imagem.");
        } finally {
            setReplacingIndex(null);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* PHOTOS SECTION */}
            <div id="field-product-images" className={`flex flex-col gap-6 transition-all p-2 rounded-2xl ${currentCount === 0 ? 'border-2 border-red-500/70 bg-red-50/10 dark:bg-red-950/5' : ''}`}>
                <div className={`flex items-center justify-between border-b pb-2 ${currentCount === 0 ? 'border-red-200 dark:border-red-900/50' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200 font-bold text-xs uppercase tracking-wider">
                        <i className="bi bi-camera text-base text-purple-600 dark:text-purple-400"></i>
                        <span>Fotos do Produto ({currentCount}/{maxPhotos})</span>
                    </div>
                    {currentCount === 0 && (
                        <span className="text-[10px] text-red-500 font-black uppercase tracking-wider bg-red-50 dark:bg-red-950/20 px-2 py-0.5 rounded-full border border-red-200 dark:border-red-900/30">
                            ⚠ Mínimo 1 foto
                        </span>
                    )}
                </div>
                <p className="text-[10px] uppercase font-black tracking-widest bg-purple-50/50 dark:bg-purple-955/10 text-purple-700 dark:text-purple-400 p-3 rounded-2xl border border-purple-100 dark:border-purple-900/20 flex items-center gap-2">
                    <i className="bi bi-info-circle text-sm shrink-0"></i>
                    <span><strong>Dica prática:</strong> Você pode arrastar/soltar imagens, colar fotos (Ctrl+V) ou clicar em Adicionar (Máximo de 15 fotos). Passe o mouse sobre qualquer foto para ver os botões de substituir (câmera) ou excluir (lixeira).</span>
                </p>

                <div className="transition-colors rounded-[2rem] border-2 border-dashed border-slate-150 dark:border-slate-800 p-4 sm:p-6 bg-slate-50/50 dark:bg-slate-955/10">
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4 select-none min-w-0 w-full">
                        {currentCount < maxPhotos && (
                            <label className="aspect-square w-full bg-white dark:bg-slate-900 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-purple-500 hover:bg-purple-50/20 dark:hover:bg-purple-955/20 transition-all group shadow-sm">
                                <i className="bi bi-plus text-2xl text-purple-600 dark:text-purple-400 group-hover:scale-125 transition-transform"></i>
                                <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Adicionar</span>
                                <input type="file" className="hidden" accept="image/*" multiple onChange={handleFileChange} />
                            </label>
                        )}
                        {(formData.images || []).map((url, index) => {
                            const borderClass = "border-slate-200 dark:border-slate-800";

                            return (
                                <div 
                                    key={index} 
                                    draggable 
                                    onDragStart={() => setDraggedIndex(index)}
                                    onDragOver={(e) => {
                                        e.preventDefault();
                                        if (draggedIndex === null || draggedIndex === index) return;
                                        const newImages = [...(formData.images || [])];
                                        const item = newImages.splice(draggedIndex, 1)[0];
                                        newImages.splice(index, 0, item);
                                        setDraggedIndex(index);
                                        setFormData({ ...formData, images: newImages });
                                    }}
                                    onDragEnd={() => setDraggedIndex(null)}
                                    className={`group relative aspect-square w-full rounded-3xl overflow-hidden border-2 cursor-move transition-all shadow-sm ${borderClass}`}
                                    title="Arraste para reordenar ou passe o mouse para obter opções"
                                >
                                    <img src={url} alt={`Foto ${index + 1}`} className="object-cover w-full h-full pointer-events-none" />
                                    
                                    {replacingIndex === index && (
                                        <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-1 z-30 text-white">
                                            <i className="bi bi-hourglass-split animate-spin text-xl"></i>
                                            <span className="text-[9px] font-black uppercase tracking-wider">Substituindo...</span>
                                        </div>
                                    )}

                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 z-10 p-2">
                                        <div className="flex gap-2">
                                            {/* Substituir foto (Câmera) */}
                                            <label 
                                                className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-xl transition-all shadow-md cursor-pointer hover:scale-110 active:scale-95 flex items-center justify-center" 
                                                title="Substituir foto"
                                            >
                                                <i className="bi bi-camera text-xs"></i>
                                                <input 
                                                    type="file" 
                                                    accept="image/*" 
                                                    className="hidden" 
                                                    onChange={(e) => {
                                                        const file = e.target.files?.[0];
                                                        if (file) {
                                                            handleReplacePhoto(index, file);
                                                        }
                                                    }} 
                                                />
                                            </label>

                                            {/* Apagar foto (Lixeira) */}
                                            <button 
                                                type="button" 
                                                onClick={() => removePhoto(url)} 
                                                className="bg-red-500 hover:bg-red-600 text-white p-2 rounded-xl transition-all shadow-md hover:scale-110 active:scale-95 flex items-center justify-center" 
                                                title="Apagar foto"
                                            >
                                                <i className="bi bi-trash text-xs"></i>
                                            </button>
                                        </div>

                                        {index !== 0 && (
                                            <button 
                                                type="button" 
                                                onClick={() => {
                                                    const updated = [...(formData.images || [])];
                                                    const item = updated.splice(index, 1)[0];
                                                    setFormData({ ...formData, images: [item, ...updated] });
                                                }} 
                                                className="bg-white text-[9px] text-slate-900 font-black uppercase tracking-widest px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors shadow-md"
                                            >
                                                Definir Capa
                                            </button>
                                        )}
                                    </div>
                                    {index === 0 && (
                                        <span className="absolute top-2 left-2 bg-blue-600 text-white text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full pointer-events-none z-20 shadow-md">
                                            Capa
                                        </span>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductEcommerceTab;
