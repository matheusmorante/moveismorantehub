import React, { useState } from 'react';
import Product, { Variation } from '../../../../types/product.type';
import { aiService } from '@/pages/utils/aiService';
import { toast } from 'react-toastify';

interface VariationTechnicalTabProps {
    formData: Variation;
    setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
    parentProduct: Product;
    handleChange: (field: keyof Variation, value: any) => void;
}

export const VariationTechnicalTab: React.FC<VariationTechnicalTabProps> = ({
    formData,
    parentProduct,
    handleChange
}) => {
    const [isImprovingDescription, setIsImprovingDescription] = useState(false);

    const handleImproveDescriptionWithAI = async () => {
        const title = (formData.name || parentProduct.name || parentProduct.description || '').trim();
        setIsImprovingDescription(true);
        try {
            const result = await aiService.improveProductDescription({
                currentDescription: formData.description || '',
                title,
                material: formData.material || parentProduct.material,
                brand: parentProduct.brand,
                line: parentProduct.line,
                width: formData.syncWidth ? parentProduct.width : formData.width,
                height: formData.syncHeight ? parentProduct.height : formData.height,
                depth: formData.syncDepth ? parentProduct.depth : formData.depth,
                weight: formData.syncWeight ? parentProduct.weight : formData.weight
            });

            handleChange('description', result.improvedDescription);
            toast.success('Descrição da variação aperfeiçoada com sucesso! ✨');
        } catch (error: any) {
            console.error(error);
            toast.error(error?.message || 'Erro ao aperfeiçoar descrição com IA.');
        } finally {
            setIsImprovingDescription(false);
        }
    };

    return (
        <div className="space-y-6 animate-in fade-in duration-350">
            {/* Descrição */}
            <div className="flex flex-col gap-2 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between">
                    <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600 flex items-center gap-2">
                        Descrição da Variação
                    </h4>
                    <div className="flex items-center gap-2">
                        {!formData.syncDescription && (
                            <button
                                type="button"
                                onClick={handleImproveDescriptionWithAI}
                                disabled={isImprovingDescription}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-100/80 hover:bg-purple-200/80 dark:bg-purple-955/60 dark:hover:bg-purple-900/60 border border-purple-200 dark:border-purple-800/70 text-amber-600 dark:text-amber-400 font-black uppercase text-[9px] tracking-wider transition-all disabled:opacity-50 active:scale-95 shadow-sm"
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
                        <button 
                            type="button"
                            onClick={() => handleChange('syncDescription', !formData.syncDescription)}
                            className={`p-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${formData.syncDescription ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-850'}`}
                            title={formData.syncDescription ? "Desvincular Descrição do Pai" : "Sincronizar Descrição com o Pai"}
                        >
                            <i className={`bi ${formData.syncDescription ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'}`}></i>
                            <span className="text-[9px] font-black uppercase">{formData.syncDescription ? 'Herdado do Pai' : 'Manual'}</span>
                        </button>
                    </div>
                </div>
                {formData.syncDescription ? (
                    <div className="w-full mt-2 p-4 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border border-slate-200/50 dark:border-slate-800 text-xs font-semibold text-slate-500 flex items-start justify-between min-h-[80px]">
                        <span>{parentProduct?.description || 'Descrição do produto pai (vazia por padrão)'}</span>
                        <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-955/60 px-2 py-0.5 rounded-md shrink-0 ml-2">Herdado</span>
                    </div>
                ) : (
                    <textarea
                        rows={4}
                        value={formData.description || ''}
                        onChange={(e) => handleChange('description', e.target.value)}
                        placeholder="Descrição específica desta variação (se vazia, herdará do pai no e-commerce)..."
                        className="w-full mt-2 p-4 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all resize-none dark:text-slate-100"
                    />
                )}
            </div>

            {/* Dimensões e Peso */}
            <div className="flex flex-col gap-4 bg-slate-50 dark:bg-slate-950 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                <h4 className="text-[10px] font-black uppercase tracking-widest text-blue-600">Dimensões e Peso</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    
                    {/* Largura */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between h-6">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Largura</label>
                            <button 
                                type="button"
                                onClick={() => handleChange('syncWidth', !formData.syncWidth)}
                                className={`p-1 rounded-lg transition-all ${formData.syncWidth ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-850'}`}
                                title={formData.syncWidth ? "Desvincular Largura do Pai" : "Sincronizar Largura com o Pai"}
                            >
                                <i className={`bi ${formData.syncWidth ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                            </button>
                        </div>
                        {formData.syncWidth ? (
                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                <span>{parentProduct?.width || 0} cm</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-955/60 px-1.5 py-0.5 rounded">Herdado</span>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={formData.width || ''}
                                    onChange={e => handleChange('width', parseFloat(e.target.value) || 0)}
                                    className="w-full pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-100"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">cm</span>
                            </div>
                        )}
                    </div>

                    {/* Altura */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between h-6">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Altura</label>
                            <button 
                                type="button"
                                onClick={() => handleChange('syncHeight', !formData.syncHeight)}
                                className={`p-1 rounded-lg transition-all ${formData.syncHeight ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-850'}`}
                                title={formData.syncHeight ? "Desvincular Altura do Pai" : "Sincronizar Altura com o Pai"}
                            >
                                <i className={`bi ${formData.syncHeight ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                            </button>
                        </div>
                        {formData.syncHeight ? (
                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                <span>{parentProduct?.height || 0} cm</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-955/60 px-1.5 py-0.5 rounded">Herdado</span>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={formData.height || ''}
                                    onChange={e => handleChange('height', parseFloat(e.target.value) || 0)}
                                    className="w-full pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-100"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">cm</span>
                            </div>
                        )}
                    </div>

                    {/* Profundidade */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between h-6">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Profundidade</label>
                            <button 
                                type="button"
                                onClick={() => handleChange('syncDepth', !formData.syncDepth)}
                                className={`p-1 rounded-lg transition-all ${formData.syncDepth ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-850'}`}
                                title={formData.syncDepth ? "Desvincular Profundidade do Pai" : "Sincronizar Profundidade com o Pai"}
                            >
                                <i className={`bi ${formData.syncDepth ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                            </button>
                        </div>
                        {formData.syncDepth ? (
                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                <span>{parentProduct?.depth || 0} cm</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-955/60 px-1.5 py-0.5 rounded">Herdado</span>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    min={0}
                                    value={formData.depth || ''}
                                    onChange={e => handleChange('depth', parseFloat(e.target.value) || 0)}
                                    className="w-full pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-100"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">cm</span>
                            </div>
                        )}
                    </div>

                    {/* Peso */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between h-6">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Peso</label>
                            <button 
                                type="button"
                                onClick={() => handleChange('syncWeight', !formData.syncWeight)}
                                className={`p-1 rounded-lg transition-all ${formData.syncWeight ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-955/30' : 'text-slate-400 bg-slate-100 dark:bg-slate-850'}`}
                                title={formData.syncWeight ? "Desvincular Peso do Pai" : "Sincronizar Peso com o Pai"}
                            >
                                <i className={`bi ${formData.syncWeight ? 'bi-link text-emerald-600' : 'bi-link-45deg text-slate-400'} text-xs`}></i>
                            </button>
                        </div>
                        {formData.syncWeight ? (
                            <div className="w-full px-3 py-2.5 bg-slate-100 dark:bg-slate-900/50 rounded-xl border border-slate-200/50 dark:border-slate-800 text-xs font-bold text-slate-500 flex items-center justify-between">
                                <span>{parentProduct?.weight || 0} kg</span>
                                <span className="text-[8px] font-black uppercase tracking-wider text-emerald-700 dark:text-emerald-400 bg-emerald-100 dark:bg-emerald-955/60 px-1.5 py-0.5 rounded">Herdado</span>
                            </div>
                        ) : (
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.01"
                                    min={0}
                                    value={formData.weight || ''}
                                    onChange={e => handleChange('weight', parseFloat(e.target.value) || 0)}
                                    className="w-full pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold focus:border-blue-600 dark:focus:border-blue-400 transition-all dark:text-slate-100"
                                    placeholder="0"
                                />
                                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold pointer-events-none">kg</span>
                            </div>
                        )}
                    </div>

                </div>
            </div>
        </div>
    );
};
