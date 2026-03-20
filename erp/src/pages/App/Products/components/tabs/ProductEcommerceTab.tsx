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

const InfoTooltip: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => {
    return (
        <div className="relative group inline-block ml-2">
            <i className="bi bi-info-circle text-blue-500 hover:text-blue-600 transition-colors cursor-help"></i>
            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-300 z-[100] pointer-events-none">
                <div className="flex flex-col gap-2">
                    <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">{title}</p>
                    <div className="text-[11px] font-medium text-slate-600 dark:text-slate-400 leading-relaxed">
                        {children}
                    </div>
                </div>
                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-t-[6px] border-t-white dark:border-t-slate-800"></div>
            </div>
        </div>
    );
};

const ProductEcommerceTab: React.FC<ProductEcommerceTabProps> = ({
    formData,
    setFormData,
    activeEcommerceSubTab,
    setActiveEcommerceSubTab,
    isDraggingPhoto,
    setIsDraggingPhoto,
    handleFileChange,
    removingPhoto,
    removePhoto,
    handleGenerateAIDescription,
    isGeneratingDescription,
    handleGenerateMarketplaceTitle,
    isGeneratingTitle,
    handleToggleActive
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
            {/* Sub-tabs Navigation */}
            <div className="flex gap-4 p-1 bg-slate-100 dark:bg-slate-950/50 rounded-2xl self-start">
                {[
                    { id: 'vitrine', label: 'Resumo Catálogo', icon: 'bi-grid-1x2-fill' },
                    { id: 'photos', label: 'Galeria de Fotos', icon: 'bi-images' },
                    { id: 'descriptions', label: 'Descrição & WhatsApp', icon: 'bi-pencil-square' },
                    { id: 'logistics', label: 'Envio / Cubagem', icon: 'bi-truck' },
                    { id: 'seo', label: 'SEO (Google)', icon: 'bi-search' },
                ].map(tab => (
                    <button
                        key={tab.id}
                        type="button"
                        onClick={() => setActiveEcommerceSubTab(tab.id as any)}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${activeEcommerceSubTab === tab.id
                            ? 'bg-white dark:bg-slate-800 text-blue-600 shadow-sm'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200'
                            }`}
                    >
                        <i className={`bi ${tab.icon}`}></i>
                        {tab.label}
                    </button>
                ))}
            </div>

            {/* VITRINE DASHBOARD */}
            {activeEcommerceSubTab === 'vitrine' && (
                <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-right-4 duration-300">
                    <div className="bg-white dark:bg-slate-900 p-8 rounded-[3rem] border border-slate-100 dark:border-slate-800 flex items-center justify-between shadow-sm animate-in fade-in zoom-in duration-500">
                        <div className="flex items-center gap-4">
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-lg transition-all ${formData.active ? 'bg-emerald-500 text-white shadow-emerald-500/20' : 'bg-slate-200 text-slate-400 shadow-none'}`}>
                                <i className={`bi ${formData.active ? 'bi-toggle-on' : 'bi-toggle-off'}`}></i>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Status de Exibição no Site</h4>
                                <p className={`text-[10px] font-black uppercase tracking-widest ${formData.active ? 'text-emerald-600' : 'text-slate-400'}`}>
                                    {formData.active ? 'Visível no Catálogo Online' : 'Oculto no Catálogo Online'}
                                </p>
                            </div>
                        </div>
                        <div 
                            onClick={handleToggleActive}
                            className={`w-16 h-8 rounded-full p-1 cursor-pointer transition-all duration-300 relative ${formData.active ? 'bg-emerald-500 shadow-lg shadow-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800'}`}
                        >
                            <div className={`w-6 h-6 bg-white rounded-full transition-transform duration-300 shadow-sm flex items-center justify-center ${formData.active ? 'translate-x-8' : 'translate-x-0'}`}>
                                <i className={`bi ${formData.active ? 'bi-check text-emerald-500' : 'bi-pause text-slate-300'} text-xs font-black`}></i>
                            </div>
                        </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {/* SITE / ECOMMERCE READINESS */}
                        <div className={`p-8 rounded-[3rem] border transition-all ${(!formData.ecommerceDescription || !formData.images?.length || !formData.unitPrice) ? 'bg-amber-500/5 border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg ${(!formData.ecommerceDescription || !formData.images?.length || !formData.unitPrice) ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                                        <i className="bi bi-globe"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Presença no Site</h4>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${(!formData.ecommerceDescription || !formData.images?.length || !formData.unitPrice) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {(!formData.ecommerceDescription || !formData.images?.length || !formData.unitPrice) ? 'Incompleto para o Site' : 'Apto para o Site'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${(!formData.ecommerceDescription || !formData.images?.length || !formData.unitPrice) ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                    {(!formData.ecommerceDescription || !formData.images?.length || !formData.unitPrice) ? 'Revisar' : 'Pronto'}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Checklist Site</p>
                                <ul className="space-y-3">
                                    <li className="flex items-center gap-3">
                                        <i className={`bi ${formData.ecommerceDescription ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-200'} text-lg`}></i>
                                        <span className={`text-xs font-bold ${formData.ecommerceDescription ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 italic'}`}>Descrição Otimizada para SEO</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <i className={`bi ${formData.images?.length ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-200'} text-lg`}></i>
                                        <span className={`text-xs font-bold ${formData.images?.length ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 italic'}`}>Galeria de Fotos (Mín. 1)</span>
                                    </li>
                                    <li className="flex items-center gap-3">
                                        <i className={`bi ${formData.unitPrice && formData.unitPrice > 0 ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-200'} text-lg`}></i>
                                        <span className={`text-xs font-bold ${formData.unitPrice && formData.unitPrice > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-600 italic'}`}>Valor de Venda Definido</span>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* WHATSAPP READINESS */}
                        <div className={`p-8 rounded-[3rem] border transition-all ${(!formData.whatsappDescription || !formData.images?.length || !formData.unitPrice || (!formData.line && !formData.hasNoLine)) ? 'bg-amber-500/5 border-amber-500/10' : 'bg-emerald-500/5 border-emerald-500/10'}`}>
                            <div className="flex items-center justify-between mb-8">
                                <div className="flex items-center gap-4">
                                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-xl shadow-lg ${(!formData.whatsappDescription || !formData.images?.length || !formData.unitPrice || (!formData.line && !formData.hasNoLine)) ? 'bg-amber-500 text-white shadow-amber-500/20' : 'bg-emerald-500 text-white shadow-emerald-500/20'}`}>
                                        <i className="bi bi-whatsapp"></i>
                                    </div>
                                    <div>
                                        <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Catálogo WhatsApp (Botão Comprar)</h4>
                                        <p className={`text-[10px] font-black uppercase tracking-widest ${(!formData.whatsappDescription || !formData.images?.length || !formData.unitPrice || (!formData.line && !formData.hasNoLine)) ? 'text-amber-600' : 'text-emerald-600'}`}>
                                            {(!formData.whatsappDescription || !formData.images?.length || !formData.unitPrice || (!formData.line && !formData.hasNoLine)) ? 'Informações Pendentes' : 'Sincronizado'}
                                        </p>
                                    </div>
                                </div>
                                <div className={`flex flex-col gap-2 items-end`}>
                                    <div 
                                        onClick={() => setFormData({ ...formData, whatsappSync: !formData.whatsappSync })}
                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest cursor-pointer transition-all ${formData.whatsappSync ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' : 'bg-slate-100 text-slate-400'}`}
                                    >
                                        {formData.whatsappSync ? 'Ativo no WhatsApp' : 'Inativo no WhatsApp'}
                                    </div>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                <div className="space-y-4">
                                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-2">Checklist WhatsApp</p>
                                    <ul className="space-y-2">
                                        <li className="flex items-center gap-3">
                                            <i className={`bi ${formData.whatsappDescription ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-200'} text-md`}></i>
                                            <span className={`text-[11px] font-bold ${formData.whatsappDescription ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>Descrição Venda</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <i className={`bi ${formData.images?.length ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-200'} text-md`}></i>
                                            <span className={`text-[11px] font-bold ${formData.images?.length ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>Fotos</span>
                                        </li>
                                        <li className="flex items-center gap-3">
                                            <i className={`bi ${formData.unitPrice && formData.unitPrice > 0 ? 'bi-check-circle-fill text-emerald-500' : 'bi-x-circle-fill text-slate-200'} text-md`}></i>
                                            <span className={`text-[11px] font-bold ${formData.unitPrice && formData.unitPrice > 0 ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400'}`}>Preço</span>
                                        </li>
                                    </ul>
                                </div>

                                <div className="bg-white/50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <div className="flex flex-col">
                                            <span className="text-[10px] font-black text-blue-600 uppercase tracking-tight">Sinc. Automática</span>
                                            <span className="text-[8px] font-bold text-slate-400 uppercase leading-none">Conforme Estoque</span>
                                        </div>
                                        <div 
                                            onClick={() => setFormData({ ...formData, whatsappAutoSync: !formData.whatsappAutoSync })}
                                            className={`w-12 h-6 rounded-full p-1 cursor-pointer transition-all ${formData.whatsappAutoSync ? 'bg-blue-500 shadow-md shadow-blue-500/20' : 'bg-slate-200 dark:bg-slate-700'}`}
                                        >
                                            <div className={`w-4 h-4 bg-white rounded-full transition-all ${formData.whatsappAutoSync ? 'translate-x-6' : 'translate-x-0'}`}></div>
                                        </div>
                                    </div>
                                    <p className="text-[8px] font-medium text-slate-500 dark:text-slate-400 italic leading-tight">
                                        Se ativo, o produto será marcado como "Indisponível" no WhatsApp automaticamente quando o estoque for zero.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="p-8 bg-slate-50 dark:bg-slate-900/50 rounded-[3rem] border border-slate-100 dark:border-slate-800 text-center">
                        <i className="bi bi-info-circle text-2xl text-slate-400 mb-4 block"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 max-w-lg mx-auto leading-relaxed">
                            O status "Apto" garante que os campos obrigatórios para cada canal estão preenchidos. A sincronização efetiva ocorre através das rotinas de integração.
                        </p>
                    </div>
                </div>
            )}

            {/* PHOTOS SUB-TAB */}
            {activeEcommerceSubTab === 'photos' && (
                <div className="flex flex-col gap-6 animate-in fade-in duration-300">
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
                            <p className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Arraste as fotos ou clique aqui</p>
                            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">PNG, JPG ou WebP (Máx 2MB por arquivo)</p>
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
                                                            Pai / Principal
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
            )}

            {/* DESCRIPTIONS SUB-TAB */}
            {activeEcommerceSubTab === 'descriptions' && (
                <div className="flex flex-col gap-10 animate-in fade-in duration-300">
                    {/* Marketplace Title Section */}
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 flex flex-col gap-6">
                        <div className="flex items-center justify-between">
                            <div className="flex flex-col gap-1">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                    <i className="bi bi-megaphone"></i> Título para Marketplace
                                    <InfoTooltip title="O que é o Título para Marketplace?">
                                        É o nome que aparecerá em canais como Mercado Livre, Shopee e seu site.
                                        <br/><br/>
                                        <b>Dica:</b> Use palavras-chave que seus clientes usam para pesquisar, como "Madeira Maciça", "Luxo", "Retrô". Evite códigos internos ou nomes técnicos sem contexto.
                                    </InfoTooltip>
                                </h5>
                                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-widest">Este título será usado em Mercado Livre, Shopee, etc.</p>
                            </div>
                            <button
                                type="button"
                                onClick={handleGenerateMarketplaceTitle}
                                disabled={isGeneratingTitle}
                                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-blue-500/30 hover:bg-blue-700 transition-all active:scale-95 disabled:opacity-50"
                            >
                                {isGeneratingTitle ? <i className="bi bi-arrow-repeat animate-spin"></i> : <i className="bi bi-stars"></i>}
                                IA: Gerar Título Otimizado
                            </button>
                        </div>
                        <input
                            type="text"
                            maxLength={60}
                            value={formData.marketplaceTitle || ''}
                            onChange={(e) => setFormData({ ...formData, marketplaceTitle: e.target.value.toUpperCase() })}
                            className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-blue-100 dark:border-blue-900/30 rounded-2xl outline-none text-sm font-bold dark:text-slate-200 placeholder:text-slate-300"
                            placeholder="EX: GUARDA-ROUPA CASAL 6 PORTAS EM MADEIRA MACIÇA"
                        />
                        <div className="flex justify-end">
                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">{(formData.marketplaceTitle || '').length}/60 caracteres</span>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                        {/* WhatsApp Marketplace */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                                    <i className="bi bi-whatsapp"></i> Catálogo WhatsApp
                                    <InfoTooltip title="Dicas para descrição no WhatsApp">
                                        O WhatsApp é um canal de venda direta e rápida. 
                                        <br/><br/>
                                        <b>Dica:</b> Use uma linguagem mais pessoal e direta. Foque nos benefícios rápidos, dimensões principais e se está a pronta entrega. Use emojis para destacar pontos de atenção!
                                    </InfoTooltip>
                                </h5>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateAIDescription('whatsapp')}
                                        disabled={isGeneratingDescription}
                                        className="text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 px-3 py-1 rounded-lg hover:bg-emerald-200 flex items-center gap-1.5"
                                    >
                                        <i className="bi bi-stars"></i> IA: Descrever
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={formData.whatsappDescription || ''}
                                onChange={(e) => setFormData({ ...formData, whatsappDescription: e.target.value.toUpperCase() })}
                                className="w-full h-64 p-5 bg-emerald-50/20 dark:bg-emerald-950/10 border border-emerald-100 dark:border-emerald-900/30 rounded-[2rem] outline-none text-xs leading-relaxed font-bold custom-scrollbar"
                                placeholder="DESCRIÇÃO ATRAENTE PARA VENDAS RÁPIDAS NO WHATSAPP..."
                            />
                        </div>

                        {/* E-commerce Full */}
                        <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                                    <i className="bi bi-globe"></i> Loja Virtual / Site
                                    <InfoTooltip title="Otimização para Loja Virtual">
                                        Aqui a descrição deve ser rica e detalhada para convencer o cliente e ajudar o Google a te encontrar.
                                        <br/><br/>
                                        <b>Dica:</b> Divida o texto em tópicos (Dimensões, Material, Cuidados). Use os termos que a IA gera como base para criar autoridade no seu nicho.
                                    </InfoTooltip>
                                </h5>
                                <div className="flex gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleGenerateAIDescription('ecommerce')}
                                        disabled={isGeneratingDescription}
                                        className="text-[9px] font-black uppercase tracking-widest bg-blue-100 text-blue-700 px-3 py-1 rounded-lg hover:bg-blue-200 flex items-center gap-1.5"
                                    >
                                        <i className="bi bi-stars"></i> IA: Descrever
                                    </button>
                                </div>
                            </div>
                            <textarea
                                value={formData.ecommerceDescription || ''}
                                onChange={(e) => setFormData({ ...formData, ecommerceDescription: e.target.value.toUpperCase() })}
                                className="w-full h-64 p-5 bg-blue-50/20 dark:bg-blue-950/10 border border-blue-100 dark:border-blue-900/30 rounded-[2rem] outline-none text-xs leading-relaxed font-bold custom-scrollbar"
                                placeholder="DESCRIÇÃO COMPLETA COM ESPECIFICAÇÕES TÉCNICAS E SEO..."
                            />
                        </div>
                    </div>
                </div>
            )}

            {/* LOGISTICS SUB-TAB */}
            {activeEcommerceSubTab === 'logistics' && (
                <div className="flex flex-col gap-8 animate-in fade-in duration-300">
                    <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                        <div className="flex items-center gap-2">
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Dados de Envio / Logística</h4>
                            <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Utilizado para cálculo de frete nos marketplaces</p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Peso Bruto (KG)</label>
                                <input
                                    type="number"
                                    step="0.001"
                                    value={(formData.weight === null || formData.weight === undefined || isNaN(formData.weight as number)) ? '' : formData.weight}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, weight: isNaN(val) ? 0 : val });
                                    }}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                                    placeholder="0.000"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Largura Emb. (cm)</label>
                                <input
                                    type="number"
                                    value={(formData.pkgWidth === null || formData.pkgWidth === undefined || isNaN(formData.pkgWidth as number)) ? '' : formData.pkgWidth}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, pkgWidth: isNaN(val) ? 0 : val });
                                    }}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Altura Emb. (cm)</label>
                                <input
                                    type="number"
                                    value={(formData.pkgHeight === null || formData.pkgHeight === undefined || isNaN(formData.pkgHeight as number)) ? '' : formData.pkgHeight}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, pkgHeight: isNaN(val) ? 0 : val });
                                    }}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                                    placeholder="0"
                                />
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Profund. Emb. (cm)</label>
                                <input
                                    type="number"
                                    value={(formData.pkgDepth === null || formData.pkgDepth === undefined || isNaN(formData.pkgDepth as number)) ? '' : formData.pkgDepth}
                                    onChange={(e) => {
                                        const val = parseFloat(e.target.value);
                                        setFormData({ ...formData, pkgDepth: isNaN(val) ? 0 : val });
                                    }}
                                    className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                                    placeholder="0"
                                />
                            </div>
                        </div>

                        {/* Automated Logistics Intelligence */}
                        {formData.pkgWidth && formData.pkgHeight && formData.pkgDepth ? (
                            <div className="flex flex-col gap-6">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                    <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 rounded-3xl border border-blue-100 dark:border-blue-900/20 flex flex-col justify-center">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-blue-600 mb-1 flex items-center gap-2">
                                            <i className="bi bi-box"></i> Peso Cubado (DIM)
                                        </p>
                                        <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                                            {((formData.pkgWidth * formData.pkgHeight * formData.pkgDepth) / 6000).toFixed(2)} KG
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Fator: 6000 (Correios/Geral)</p>
                                    </div>

                                    <div className="p-6 bg-emerald-50/50 dark:bg-emerald-900/10 rounded-3xl border border-emerald-100 dark:border-emerald-900/20 flex flex-col justify-center border-l-4 border-l-emerald-500">
                                        <p className="text-[9px] font-black uppercase tracking-widest text-emerald-600 mb-1 flex items-center gap-2">
                                            <i className="bi bi-calculator"></i> Peso Taxado (Maior)
                                        </p>
                                        <p className="text-xl font-black text-slate-800 dark:text-slate-100">
                                            {Math.max(formData.weight || 0, (formData.pkgWidth * formData.pkgHeight * formData.pkgDepth) / 6000).toFixed(2)} KG
                                        </p>
                                        <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1">Valor base p/ transportadora</p>
                                    </div>

                                    {/* Shipping Method Logic */}
                                    <div className={`p-6 rounded-3xl border flex flex-col justify-center ${(formData.weight || 0) <= 30 && (formData.pkgWidth || 0) <= 100 && ((formData.pkgWidth || 0) + (formData.pkgHeight || 0) + (formData.pkgDepth || 0)) <= 200 ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10' : 'bg-slate-50 border-slate-200 dark:bg-slate-900/50'}`}>
                                        <p className="text-[9px] font-black uppercase tracking-widest text-slate-500 mb-1 flex items-center gap-2">
                                            <i className="bi bi-truck-flatbed"></i> Método Provável
                                        </p>
                                        <p className="text-md font-black text-slate-800 dark:text-slate-100 uppercase italic">
                                            {(formData.weight || 0) <= 30 && (formData.pkgWidth || 0) <= 100 && ((formData.pkgWidth || 0) + (formData.pkgHeight || 0) + (formData.pkgDepth || 0)) <= 200 ? 'Sedex / Correios' : 'Transportadora'}
                                        </p>
                                        <p className="text-[8px] font-bold text-slate-400 uppercase tracking-widest mt-1">Baseado em peso e volume</p>
                                    </div>
                                </div>

                                {/* Special Alerts */}
                                <div className="flex flex-wrap gap-4">
                                    {(Math.max(formData.weight || 0, (formData.pkgWidth * formData.pkgHeight * formData.pkgDepth) / 6000) > 68) && (
                                        <div className="flex-1 min-w-[300px] p-6 bg-rose-500/10 rounded-3xl border border-rose-500/20 flex items-center gap-4 animate-in zoom-in duration-300">
                                            <div className="p-3 bg-rose-500 text-white rounded-2xl shadow-xl shadow-rose-500/20">
                                                <i className="bi bi-exclamation-triangle-fill text-xl"></i>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-rose-600">Alerta: Carga Pesada (LTL)</p>
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                                    Item ultrapassa 68kg. Requer contratação de frete fracionado (LTL) ou caminhão próprio.
                                                </p>
                                            </div>
                                        </div>
                                    )}

                                    {((formData.pkgWidth || 0) > 105 || (formData.pkgHeight || 0) > 105 || (formData.pkgDepth || 0) > 105) && (
                                        <div className="flex-1 min-w-[300px] p-6 bg-amber-500/10 rounded-3xl border border-amber-500/20 flex items-center gap-4 animate-in zoom-in duration-300">
                                            <div className="p-3 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-500/20">
                                                <i className="bi bi-rulers text-xl"></i>
                                            </div>
                                            <div>
                                                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600">Alerta: Grande Dimensão</p>
                                                <p className="text-[11px] font-bold text-slate-700 dark:text-slate-300 leading-tight">
                                                    Dimensão &gt; 105cm. Pode haver taxas extras por dificuldade de manuseio.
                                                </p>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 bg-slate-100 dark:bg-slate-900 rounded-3xl border border-dashed border-slate-200 dark:border-slate-800 text-center">
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Insira as dimensões para calcular o peso cubado automaticamente.
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            )}
            {/* SEO SUB-TAB */}
            {activeEcommerceSubTab === 'seo' && (
                <div className="flex flex-col gap-10 animate-in fade-in duration-300">
                    <div className="bg-blue-50/50 dark:bg-blue-950/20 p-8 rounded-[2.5rem] border border-blue-100 dark:border-blue-900/30 flex flex-col gap-8">
                        <div className="flex items-center gap-4">
                            <div className="p-4 bg-blue-600 text-white rounded-2xl shadow-lg shadow-blue-500/20">
                                <i className="bi bi-search text-2xl"></i>
                            </div>
                            <div>
                                <h4 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Otimização de SEO (Search Engine Optimization)</h4>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-600">Melhore o ranking e as URLs do seu produto no Google</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-8">
                            {/* SLUG */}
                            <div className="flex flex-col gap-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                        URL Amigável (Slug) 
                                        <InfoTooltip title="O que é URL Amigável (Slug)?">
                                            É o endereço final do seu produto na internet. 
                                            <br/><br/>
                                            <b>Dica:</b> Mantenha curto e descritivo. Use apenas letras minúsculas e hifens. Ex: <i>aparador-madeira-retro-luxo</i>. URLs curtas rankeiam melhor no Google!
                                        </InfoTooltip>
                                    </label>
                                    <span className="text-[9px] font-black text-blue-600 uppercase"> moveismorante.com/p/{(formData.slug || '').toLowerCase()} </span>
                                </div>
                                <input
                                    type="text"
                                    value={formData.slug || ''}
                                    placeholder="ex: aparador-luxo-retro"
                                    onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                                />
                                <p className="text-[9px] text-slate-400 font-bold uppercase"><b>O que é?</b> É o nome do produto simplificado para a URL, sem espaços ou acentos.</p>
                            </div>

                            {/* META TITLE */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    Título SEO (Meta Title)
                                    <InfoTooltip title="Dicas para o Título SEO">
                                        Este é o título que aparece no Google e na aba do navegador.
                                        <br/><br/>
                                        <b>Dica:</b> O ideal é ter entre 50 e 60 caracteres. Coloque a palavra-chave principal no início. Ex: "Aparador de Madeira Retrô | Móveis Morante".
                                    </InfoTooltip>
                                </label>
                                <input
                                    type="text"
                                    value={formData.meta_title || ''}
                                    placeholder="Título para o Google..."
                                    onChange={(e) => setFormData({ ...formData, meta_title: e.target.value })}
                                    className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                                />
                                <p className="text-[9px] text-slate-400 font-bold uppercase"><b>O que é?</b> O título principal que aparece na pesquisa do Google. Deve ser chamativo.</p>
                            </div>

                            {/* META DESCRIPTION */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    Descrição SEO (Meta Description)
                                    <InfoTooltip title="Como escrever uma boa Meta Description">
                                        É o "resumo" que aparece abaixo do título no Google.
                                        <br/><br/>
                                        <b>Dica:</b> Deve ter em torno de 150-160 caracteres. Inclua um "Chamado para Ação" (CTA) como "Confira as melhores ofertas!" ou "Entrega Imediata!".
                                    </InfoTooltip>
                                </label>
                                <textarea
                                    value={formData.meta_description || ''}
                                    placeholder="Resumo atraente para atrair cliques..."
                                    rows={3}
                                    onChange={(e) => setFormData({ ...formData, meta_description: e.target.value })}
                                    className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200 resize-none"
                                />
                                <p className="text-[9px] text-slate-400 font-bold uppercase"><b>O que é?</b> Breve texto que convence o usuário a clicar no seu link ao pesquisar.</p>
                            </div>

                            {/* SEO DESCRIPTION (Additional Content) */}
                            <div className="flex flex-col gap-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-2">
                                    Conteúdo Extra SEO (Página)
                                    <InfoTooltip title="Para que serve o Conteúdo Extra?">
                                        Conteúdo rico em texto posicionado no final da página para reforçar as palavras-chave para robôs de busca.
                                        <br/><br/>
                                        <b>Dica:</b> Escreva um texto fluido explicando a origem da linha de móveis, inspiração do design e por que o cliente deve escolher este material específico.
                                    </InfoTooltip>
                                </label>
                                <textarea
                                    value={formData.seo_description || ''}
                                    placeholder="Conteúdo rico em palavras-chave..."
                                    rows={5}
                                    onChange={(e) => setFormData({ ...formData, seo_description: e.target.value })}
                                    className="w-full px-6 py-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200 resize-none"
                                />
                                <p className="text-[9px] text-slate-400 font-bold uppercase"><b>O que é?</b> Texto longo usado para incluir palavras-chave secundárias e melhorar o ranqueamento.</p>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ProductEcommerceTab;
