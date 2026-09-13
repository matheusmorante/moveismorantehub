import React from 'react';
import Product, { Variation } from '../../../../types/product.type';
import CurrencyInput from '@/components/CurrencyInput';

interface VariationPricingTabProps {
    formData: Variation;
    setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
    parentProduct: Product;
    varDiscountPercent: string;
    varDiscountFixed: string;
    getParentDiscountPercent: () => string;
    getParentDiscountFixed: () => string;
    handlePriceChange: (valStr: string) => void;
    handleDiscountPercentChange: (valStr: string) => void;
    handleDiscountFixedChange: (valStr: string) => void;
    handlePromoPriceFieldChange: (valStr: string) => void;
    updateCost: (fields: Partial<Variation>) => void;
}

export const VariationPricingTab: React.FC<VariationPricingTabProps> = ({
    formData,
    setFormData,
    parentProduct,
    varDiscountPercent,
    varDiscountFixed,
    getParentDiscountPercent,
    getParentDiscountFixed,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
    updateCost
}) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-350">
            {/* Precificação e Venda */}
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Precificação de Venda</h4>
                    <button
                        type="button"
                        onClick={() => {
                            const nextSync = !formData.syncUnitPrice;
                            setFormData(prev => prev ? {
                                ...prev,
                                syncUnitPrice: nextSync,
                                unitPrice: nextSync ? parentProduct.unitPrice : prev.unitPrice,
                                promoPrice: nextSync ? parentProduct.promoPrice : prev.promoPrice
                            } : null);
                        }}
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl transition-all ${formData.syncUnitPrice ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"}`}
                    >
                        {formData.syncUnitPrice ? "Preço Herdado do Pai" : "Preço Personalizado"}
                    </button>
                </div>

                <div className="flex flex-wrap gap-4">
                    {/* Preço de Venda */}
                    <div className="flex flex-col gap-2 min-w-[200px] flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Preço de Venda</span>
                        </label>
                        <CurrencyInput
                            disabled={formData.syncUnitPrice}
                            value={formData.syncUnitPrice ? (parentProduct.unitPrice || 0) : (formData.unitPrice || 0)}
                            onChange={val => handlePriceChange(String(val))}
                            className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-blue-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                        />
                    </div>

                    {/* Desconto % */}
                    <div className="flex flex-col gap-2 min-w-[120px] flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Desconto (%)</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                disabled={formData.syncUnitPrice}
                                placeholder="0"
                                value={formData.syncUnitPrice ? getParentDiscountPercent() : varDiscountPercent}
                                onChange={e => handleDiscountPercentChange(e.target.value)}
                                className="w-full pl-1 pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-emerald-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">%</span>
                        </div>
                    </div>

                    {/* Desconto R$ */}
                    <div className="flex flex-col gap-2 min-w-[140px] flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Desconto (R$)</span>
                        </label>
                        <CurrencyInput
                            disabled={formData.syncUnitPrice}
                            value={formData.syncUnitPrice ? getParentDiscountFixed() : varDiscountFixed}
                            onChange={val => handleDiscountFixedChange(String(val))}
                            className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-emerald-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                        />
                    </div>

                    {/* Preço Promocional */}
                    <div className="flex flex-col gap-2 min-w-[180px] flex-1">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Preço Promocional</span>
                        </label>
                        <CurrencyInput
                            disabled={formData.syncUnitPrice}
                            value={formData.syncUnitPrice ? (parentProduct.promoPrice || 0) : (formData.promoPrice || 0)}
                            onChange={val => handlePromoPriceFieldChange(String(val))}
                            className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-amber-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};
