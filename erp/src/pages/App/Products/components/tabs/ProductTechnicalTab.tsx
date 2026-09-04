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
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-950/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-amber-600 dark:text-amber-400 font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
                        >
                            {isImprovingDescription ? (
                                <>
                                    <i className="bi bi-arrow-repeat animate-spin text-amber-500" />
                                    Aperfeiçoando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-stars text-amber-500 text-xs font-bold" />
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
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Altura (cm)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.height || ''}
                            onChange={(e) => handleFieldChange('height', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Largura (cm)
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.width || ''}
                            onChange={(e) => handleFieldChange('width', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="0"
                        />
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
                        </label>
                        <input
                            type="number"
                            step="0.1"
                            value={formData.depth || ''}
                            onChange={(e) => handleFieldChange('depth', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="0"
                        />
                    </div>

                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">
                            Peso (kg)
                        </label>
                        <input
                            type="number"
                            step="0.01"
                            value={formData.weight || ''}
                            onChange={(e) => handleFieldChange('weight', e.target.value)}
                            className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                            placeholder="0,00"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTechnicalTab;
