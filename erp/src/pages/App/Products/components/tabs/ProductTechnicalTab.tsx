import React from 'react';
import { Product } from '../../../../types/product.type';

interface ProductTechnicalTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    handleImproveDescriptionWithAI?: () => void;
    isImprovingDescription?: boolean;
}

const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
    formData,
    setFormData,
    handleImproveDescriptionWithAI,
    isImprovingDescription
}) => {
    const handleFieldChange = (field: keyof Product, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Descrição Detalhada */}
            <div className="flex flex-col gap-2 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-file-text text-blue-600"></i> Descrição Detalhada
                    </h4>
                    {handleImproveDescriptionWithAI && (
                        <button
                            type="button"
                            onClick={handleImproveDescriptionWithAI}
                            disabled={isImprovingDescription}
                            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${isImprovingDescription ? 'bg-slate-100 dark:bg-slate-800 text-slate-400 cursor-not-allowed' : 'bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white shadow-md shadow-purple-500/10 active:scale-95'}`}
                        >
                            {isImprovingDescription ? (
                                <>
                                    <div className="w-2.5 h-2.5 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
                                    Aperfeiçoando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-sparkles"></i>
                                    Aperfeiçoar com IA
                                </>
                            )}
                        </button>
                    )}
                </div>
                <textarea
                    rows={8}
                    value={formData.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Escreva a descrição detalhada do produto, diferenciais, especificações técnicas..."
                    className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 resize-none dark:text-slate-200"
                />
            </div>

            {/* Dimensões Físicas e Peso */}
            <div id="field-product-dimensions" className="flex flex-col gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-ruler text-blue-600"></i> Medidas
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                            <span>Altura (cm)</span>
                            {formData.noHeight && <span className="text-[8px] text-amber-500 font-bold lowercase">Ocultado</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                disabled={formData.noHeight}
                                value={formData.height || ''}
                                onChange={(e) => handleFieldChange('height', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="0"
                            />
                            <button
                                type="button"
                                onClick={() => handleFieldChange('noHeight', !formData.noHeight)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${formData.noHeight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/25' : 'text-slate-400 hover:text-slate-600'}`}
                                title={formData.noHeight ? "Mostrar no e-commerce" : "Ocultar no e-commerce"}
                            >
                                <i className={`bi ${formData.noHeight ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                            <span>Largura (cm)</span>
                            {formData.noWidth && <span className="text-[8px] text-amber-500 font-bold lowercase">Ocultado</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                disabled={formData.noWidth}
                                value={formData.width || ''}
                                onChange={(e) => handleFieldChange('width', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="0"
                            />
                            <button
                                type="button"
                                onClick={() => handleFieldChange('noWidth', !formData.noWidth)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${formData.noWidth ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/25' : 'text-slate-400 hover:text-slate-600'}`}
                                title={formData.noWidth ? "Mostrar no e-commerce" : "Ocultar no e-commerce"}
                            >
                                <i className={`bi ${formData.noWidth ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                                <span>{formData.depthUseLength ? 'Comprimento (cm)' : 'Profundidade (cm)'}</span>
                                <button
                                    type="button"
                                    onClick={() => handleFieldChange('depthUseLength', !formData.depthUseLength)}
                                    className="flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[8px] font-black uppercase tracking-widest bg-slate-100 hover:bg-blue-50 dark:bg-slate-800 dark:hover:bg-blue-900/30 text-slate-500 hover:text-blue-600 dark:text-slate-400 dark:hover:text-blue-400 transition-all border border-slate-200 dark:border-slate-700 hover:border-blue-300"
                                    title={formData.depthUseLength ? 'Usar Profundidade' : 'Usar Comprimento'}
                                >
                                    <i className="bi bi-arrow-left-right text-[9px]" />
                                    {formData.depthUseLength ? 'Prof.' : 'Comp.'}
                                </button>
                            </div>
                            {formData.noDepth && <span className="text-[8px] text-amber-500 font-bold lowercase">Ocultado</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                disabled={formData.noDepth}
                                value={formData.depth || ''}
                                onChange={(e) => handleFieldChange('depth', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="0"
                            />
                            <button
                                type="button"
                                onClick={() => handleFieldChange('noDepth', !formData.noDepth)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${formData.noDepth ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/25' : 'text-slate-400 hover:text-slate-600'}`}
                                title={formData.noDepth ? "Mostrar no e-commerce" : "Ocultar no e-commerce"}
                            >
                                <i className={`bi ${formData.noDepth ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                            <span>Peso (kg)</span>
                            {formData.noWeight && <span className="text-[8px] text-amber-500 font-bold lowercase">Ocultado</span>}
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.01"
                                disabled={formData.noWeight}
                                value={formData.weight || ''}
                                onChange={(e) => handleFieldChange('weight', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                                placeholder="0,00"
                            />
                            <button
                                type="button"
                                onClick={() => handleFieldChange('noWeight', !formData.noWeight)}
                                className={`absolute right-2 top-1/2 -translate-y-1/2 p-1.5 rounded-lg transition-colors ${formData.noWeight ? 'text-amber-500 bg-amber-50 dark:bg-amber-900/25' : 'text-slate-400 hover:text-slate-600'}`}
                                title={formData.noWeight ? "Mostrar no e-commerce" : "Ocultar no e-commerce"}
                            >
                                <i className={`bi ${formData.noWeight ? 'bi-eye-slash-fill' : 'bi-eye'}`}></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTechnicalTab;
