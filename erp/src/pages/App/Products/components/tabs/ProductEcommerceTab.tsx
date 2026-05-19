import React from 'react';
import Product from '../../../../types/product.type';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

interface ProductEcommerceTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    activeEcommerceSubTab: 'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo';
    setActiveEcommerceSubTab: React.Dispatch<React.SetStateAction<'vitrine' | 'photos' | 'descriptions' | 'logistics' | 'seo'>>;
    isDraggingPhoto: boolean;
    setIsDraggingPhoto: React.Dispatch<React.SetStateAction<boolean>>;
    handleFileChange: (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent) => void;
    removingPhoto: string | null;
    removePhoto: (url: string) => void;
    handleGenerateAIDescription: (type: 'whatsapp' | 'ecommerce') => void;
    isGeneratingDescription: boolean;
    handleGenerateMarketplaceTitle: () => void;
    isGeneratingTitle: boolean;
    handleToggleActive: () => void;
}

const ProductEcommerceTab: React.FC<ProductEcommerceTabProps> = ({
    formData,
    setFormData,
    isDraggingPhoto,
    setIsDraggingPhoto,
    handleFileChange,
    removingPhoto,
    removePhoto
}) => {
    const onDragEnd = (result: DropResult) => {
        if (!result.destination) return;

        const items = Array.from(formData.images || []);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);

        setFormData({ ...formData, images: items });
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* PHOTOS SECTION */}
            <div className="flex flex-col gap-6">
                <div
                    onDragOver={(e) => { e.preventDefault(); setIsDraggingPhoto(true); }}
                    onDragLeave={() => setIsDraggingPhoto(false)}
                    onDrop={(e) => { e.preventDefault(); setIsDraggingPhoto(false); handleFileChange(e); }}
                    className={`relative group h-64 border-2 border-dashed rounded-[3rem] transition-all flex flex-col items-center justify-center gap-4 ${isDraggingPhoto ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-900/20' : 'border-slate-100 dark:border-slate-800 hover:border-blue-400 dark:hover:border-blue-900/40 hover:bg-slate-50 dark:hover:bg-slate-950/40'}`}
                >
                    <div className="p-5 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-[2rem] shadow-lg shadow-blue-500/10 group-hover:scale-110 transition-transform">
                        <i className="bi bi-cloud-arrow-up text-4xl"></i>
                    </div>
                    <div className="text-center">
                        <p className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Arraste as fotos do produto ou clique aqui</p>
                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">PNG, JPG ou WebP (Serão compactadas automaticamente para até 100KB)</p>
                    </div>
                    <input
                        type="file"
                        multiple
                        accept="image/*"
                        onChange={handleFileChange}
                        className="absolute inset-0 opacity-0 cursor-pointer"
                    />
                </div>

                <DragDropContext onDragEnd={onDragEnd}>
                    <Droppable droppableId="product-photos" direction="horizontal">
                        {(provided) => (
                            <div 
                                {...provided.droppableProps}
                                ref={provided.innerRef}
                                className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-6"
                            >
                                {formData.images?.map((url, idx) => (
                                    <Draggable key={url} draggableId={url} index={idx}>
                                        {(provided, snapshot) => (
                                            <div 
                                                ref={provided.innerRef}
                                                {...provided.draggableProps}
                                                {...provided.dragHandleProps}
                                                className={`relative group aspect-square rounded-[2rem] overflow-hidden border border-slate-100 dark:border-slate-800 shadow-md transition-all ${snapshot.isDragging ? 'ring-4 ring-blue-500 scale-105 z-50 rotate-2' : ''}`}
                                            >
                                                <img src={url} alt={`Produto ${idx}`} className="w-full h-full object-cover pointer-events-none" />
                                                <div className="absolute inset-0 bg-slate-900/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-3">
                                                    <button
                                                        type="button"
                                                        onClick={() => removePhoto(url)}
                                                        disabled={removingPhoto === url}
                                                        className="p-3 bg-red-600 text-white rounded-2xl hover:bg-red-700 transition-all shadow-xl shadow-red-500/40"
                                                    >
                                                        {removingPhoto === url ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-trash-fill"></i>}
                                                    </button>
                                                    
                                                    <div className="p-3 bg-white/20 text-white rounded-2xl backdrop-blur-md">
                                                        <i className="bi bi-arrows-move"></i>
                                                    </div>
                                                </div>
                                                {idx === 0 && (
                                                    <div className="absolute top-4 left-4 px-3 py-1 bg-emerald-500 text-white text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg z-10">
                                                        Principal
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </Draggable>
                                ))}
                                {provided.placeholder}
                            </div>
                        )}
                    </Droppable>
                </DragDropContext>
            </div>
        </div>
    );
};

export default ProductEcommerceTab;
