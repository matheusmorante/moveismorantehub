import React from 'react';
import { Product } from '@/pages/types/product.type';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { toast } from 'react-toastify';

interface ProductTitleTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    productTypes: { id: string, name: string }[];
}

const ProductTitleTab: React.FC<ProductTitleTabProps> = ({
    formData,
    setFormData,
    productTypes
}) => {

    const titleOrder = formData.titleOrder || ["environment", "line", "brand", "complement"];
    
    // Fixed Prefix: Type
    const typeName = formData.productTypeName || 'TIPO';

    const onDragEnd = (result: any) => {
        if (!result.destination) return;
        const items = Array.from(titleOrder);
        const [reorderedItem] = items.splice(result.source.index, 1);
        items.splice(result.destination.index, 0, reorderedItem);
        setFormData(prev => ({ ...prev, titleOrder: items }));
    };

    const togglePart = (id: string) => {
        setFormData(prev => {
            const field = `include${id.charAt(0).toUpperCase() + id.slice(1)}` as keyof Product;
            return { ...prev, [field]: !prev[field] };
        });
    };

    const getPartValue = (id: string) => {
        switch(id) {
            case 'environment': return formData.environment || 'AMBIENTE';
            case 'line': return formData.line || 'LINHA/MODELO';
            case 'brand': return formData.brand || 'MARCA';
            case 'complement': return formData.titleComplement || 'COMPLEMENTO';
            default: return '';
        }
    };

    const getPartOn = (id: string) => {
        switch(id) {
            case 'environment': return formData.includeEnvironment ?? true;
            case 'line': return formData.includeLine ?? true;
            case 'brand': return formData.includeBrand ?? true;
            case 'complement': return formData.includeComplement ?? true;
            default: return true;
        }
    };

    const previewTitle = () => {
        let parts = [typeName];
        titleOrder.forEach(id => {
            if (getPartOn(id)) {
                const val = getPartValue(id);
                if (val && val !== 'AMBIENTE' && val !== 'LINHA/MODELO' && val !== 'MARCA' && val !== 'COMPLEMENTO') {
                    parts.push(val);
                }
            }
        });
        return parts.join(' ').toUpperCase();
    };

    const applyTitle = () => {
        const title = previewTitle();
        setFormData(prev => ({ ...prev, description: title }));
        toast.info("Título montado e aplicado!");
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Preview Section */}
            <div className="bg-blue-600 p-8 rounded-[3rem] text-white shadow-2xl shadow-blue-500/20">
                <div className="flex items-center justify-between mb-6">
                    <div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest opacity-60">Prévia do Título Dinâmico</h4>
                        <p className="text-[9px] font-bold opacity-40 uppercase tracking-tighter">Este é o nome que aparecerá no catálogo e etiquetas</p>
                    </div>
                    <button 
                        onClick={applyTitle}
                        className="px-6 py-3 bg-white text-blue-600 rounded-2xl font-black uppercase tracking-widest text-[10px] shadow-lg hover:scale-105 transition-all"
                    >
                        Fixar como Título do Produto
                    </button>
                </div>
                <div className="bg-blue-700/30 p-8 rounded-[2rem] border border-blue-400/20">
                    <h2 className="text-2xl font-black tracking-tight leading-relaxed break-words">
                        {previewTitle() || "NENHUM COMPONENTE ATIVO"}
                    </h2>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                {/* Fixed Prefix Section */}
                <div className="bg-slate-50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center gap-2">
                        <i className="bi bi-pin-angle-fill text-blue-500"></i> Prefixo Fixo
                    </h4>
                    <div className="space-y-4">
                        <div className="flex flex-col gap-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-500">Tipo de Produto</label>
                            <input 
                                disabled
                                value={typeName}
                                className="w-full px-5 py-4 bg-slate-100 dark:bg-slate-900 border border-transparent rounded-2xl text-sm font-black text-slate-400 cursor-not-allowed uppercase"
                            />
                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">* O prefixo é obrigatório e vem da categoria selecionada.</p>
                        </div>
                    </div>
                </div>

                {/* Reorderable Components Section */}
                <div className="bg-white dark:bg-slate-900/40 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-grip-vertical text-blue-500"></i> Componentes Reordenáveis
                        </div>
                        <span className="text-[8px] opacity-60">Arraste para mudar a ordem</span>
                    </h4>

                    <DragDropContext onDragEnd={onDragEnd}>
                        <Droppable droppableId="title-parts">
                            {(provided) => (
                                <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-3">
                                    {titleOrder.map((id, index) => {
                                        const isOn = getPartOn(id);
                                        const val = getPartValue(id);
                                        return (
                                            <Draggable key={id} draggableId={id} index={index}>
                                                {(provided, snapshot) => (
                                                    <div
                                                        ref={provided.innerRef}
                                                        {...provided.draggableProps}
                                                        {...provided.dragHandleProps}
                                                        className={`flex items-center justify-between p-4 rounded-2xl border transition-all ${snapshot.isDragging ? 'bg-blue-50 border-blue-200 shadow-xl' : 'bg-slate-50 dark:bg-slate-800 border-slate-100 dark:border-slate-700 hover:border-slate-200'}`}
                                                    >
                                                        <div className="flex items-center gap-4">
                                                            <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-900 flex items-center justify-center text-slate-300">
                                                                <i className="bi bi-grip-vertical"></i>
                                                            </div>
                                                            <div>
                                                                <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">{id === 'environment' ? 'Ambiente' : id === 'line' ? 'Linha/Modelo' : id === 'brand' ? 'Marca' : 'Complemento'}</p>
                                                                <p className={`text-sm font-black ${isOn ? 'text-slate-700 dark:text-slate-200' : 'text-slate-300'}`}>{val}</p>
                                                            </div>
                                                        </div>
                                                        <div 
                                                            onClick={(e) => { e.stopPropagation(); togglePart(id); }}
                                                            className={`w-10 h-5 rounded-full p-1 cursor-pointer transition-colors ${isOn ? 'bg-emerald-500' : 'bg-slate-300'}`}
                                                        >
                                                            <div className={`w-3 h-3 bg-white rounded-full transition-transform ${isOn ? 'translate-x-5' : 'translate-x-0'}`} />
                                                        </div>
                                                    </div>
                                                )}
                                            </Draggable>
                                        );
                                    })}
                                    {provided.placeholder}
                                </div>
                            )}
                        </Droppable>
                    </DragDropContext>
                </div>
            </div>

            {/* Title Complement Input */}
            <div className="bg-slate-50 dark:bg-slate-950 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800">
                <div className="flex flex-col gap-4">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Complemento do Título (Manual)</label>
                    <input 
                        value={formData.titleComplement || ''}
                        onChange={(e) => setFormData(prev => ({ ...prev, titleComplement: e.target.value.toUpperCase() }))}
                        placeholder="EX: 2 GAVETAS, MADEIRA MACIÇA..."
                        className="w-full px-6 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none font-bold text-sm uppercase shadow-sm"
                    />
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Use este campo para adicionar informações que não estão nas categorias ou modelo.</p>
                </div>
            </div>
        </div>
    );
};

export default ProductTitleTab;
