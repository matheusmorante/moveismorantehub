import React from 'react';
import { Product } from '../../../../types/product.type';

interface ProductTechnicalTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
}

const ProductTechnicalTab: React.FC<ProductTechnicalTabProps> = ({
    formData,
    setFormData
}) => {
    const handleFieldChange = (field: keyof Product, value: any) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Descrição para E-commerce */}
            <div className="flex flex-col gap-2 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-[#file-text] text-blue-600"></i> Descrição Detalhada para E-commerce
                    </h4>
                </div>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">
                    Esta descrição será exibida na página do produto no E-commerce / Marketplace.
                </p>
                <textarea
                    rows={6}
                    value={formData.description || ''}
                    onChange={(e) => handleFieldChange('description', e.target.value)}
                    placeholder="Escreva a descrição detalhada do produto, diferenciais, especificações técnicas..."
                    className="w-full mt-2 p-4 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 resize-none dark:text-slate-200"
                />
            </div>

            {/* Dimensões Físicas e Peso */}
            <div id="field-product-dimensions" className="flex flex-col gap-4 bg-white dark:bg-slate-900/40 p-6 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm transition-all">
                <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-ruler text-blue-600"></i> Dimensões Físicas do Produto (Sem Embalagem)
                    </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-2">
                    {/* Largura */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Largura</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.width !== undefined && formData.width !== null ? formData.width : ''}
                                onChange={(e) => handleFieldChange('width', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200"
                                placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold pointer-events-none">cm</span>
                        </div>
                    </div>

                    {/* Profundidade / Comprimento */}
                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-450 flex items-center gap-1.5">
                                <span>{formData.depthUseLength ? 'Comprimento' : 'Profundidade'}</span>
                                <button
                                    type="button"
                                    onClick={() => handleFieldChange('depthUseLength' as any, !formData.depthUseLength)}
                                    className="text-blue-600 hover:text-blue-700 bg-blue-50 dark:bg-blue-900/30 p-1 rounded-md transition-colors flex items-center gap-1 text-[9px] font-semibold"
                                    title={`Alternar para ${formData.depthUseLength ? 'Profundidade' : 'Comprimento'}`}
                                >
                                    <i className="bi bi-arrow-repeat text-xs"></i>
                                </button>
                            </label>
                        </div>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.depth !== undefined && formData.depth !== null ? formData.depth : ''}
                                onChange={(e) => handleFieldChange('depth', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200"
                                placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold pointer-events-none">cm</span>
                        </div>
                    </div>

                    {/* Altura */}
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-450">Altura</label>
                        <div className="relative">
                            <input
                                type="number"
                                step="0.1"
                                value={formData.height !== undefined && formData.height !== null ? formData.height : ''}
                                onChange={(e) => handleFieldChange('height', e.target.value === '' ? undefined : parseFloat(e.target.value))}
                                className="w-full pl-3 pr-8 py-2.5 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold focus:ring-2 focus:ring-blue-500/20 dark:text-slate-200"
                                placeholder="0"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-450 font-bold pointer-events-none">cm</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductTechnicalTab;
