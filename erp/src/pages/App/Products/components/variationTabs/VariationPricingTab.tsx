import React from 'react';
import type Product from '../../../../types/product.type';
import type { Variation } from '../../../../types/product.type';
import CurrencyInput from '@/components/CurrencyInput';

interface VariationPricingTabProps {
    readonly formData: Variation;
    readonly setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
    readonly parentProduct: Product;
    readonly varDiscountPercent: string;
    readonly varDiscountFixed: string;
    readonly getParentDiscountPercent: () => string;
    readonly getParentDiscountFixed: () => string;
    readonly handlePriceChange: (valStr: string) => void;
    readonly handleDiscountPercentChange: (valStr: string) => void;
    readonly handleDiscountFixedChange: (valStr: string) => void;
    readonly handlePromoPriceFieldChange: (valStr: string) => void;
    readonly updateCost?: (fields: Partial<Variation>) => void;
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
}) => {
    return (
        <div className="space-y-6 animate-in fade-in duration-350">
            {/* Precificação e Venda */}
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">
                        Precificação de Venda
                    </h4>
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
                        className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-xl transition-all cursor-pointer ${
                            formData.syncUnitPrice 
                                ? "bg-blue-600 text-white shadow-lg shadow-blue-500/30" 
                                : "bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
                        }`}
                    >
                        {formData.syncUnitPrice ? "Preço Herdado do Pai" : "Preço Personalizado"}
                    </button>
                </div>

                <div className="flex flex-wrap gap-4">
                    {/* Preço de Venda */}
                    <div className="flex flex-col gap-2 min-w-[200px] flex-1">
                        <label htmlFor="variation-unit-price-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Preço de Venda</span>
                        </label>
                        <CurrencyInput
                            id="variation-unit-price-input"
                            aria-label="Preço de venda da variação"
                            disabled={formData.syncUnitPrice}
                            value={formData.syncUnitPrice ? (parentProduct.unitPrice || 0) : (formData.unitPrice || 0)}
                            onChange={val => handlePriceChange(String(val))}
                            className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-blue-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:opacity-60"
                        />
                    </div>

                    {/* Desconto % */}
                    <div className="flex flex-col gap-2 min-w-[120px] flex-1">
                        <label htmlFor="variation-discount-percent-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Desconto (%)</span>
                        </label>
                        <div className="relative">
                            <input
                                id="variation-discount-percent-input"
                                type="number"
                                min="0"
                                max="100"
                                aria-label="Desconto em percentual da variação"
                                disabled={formData.syncUnitPrice}
                                placeholder="0"
                                value={formData.syncUnitPrice ? getParentDiscountPercent() : varDiscountPercent}
                                onChange={e => handleDiscountPercentChange(e.target.value)}
                                className="w-full pl-1 pr-8 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-emerald-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:opacity-60"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none" aria-hidden="true">%</span>
                        </div>
                    </div>

                    {/* Desconto R$ */}
                    <div className="flex flex-col gap-2 min-w-[140px] flex-1">
                        <label htmlFor="variation-discount-fixed-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Desconto (R$)</span>
                        </label>
                        <CurrencyInput
                            id="variation-discount-fixed-input"
                            aria-label="Desconto fixo em reais da variação"
                            disabled={formData.syncUnitPrice}
                            value={formData.syncUnitPrice ? getParentDiscountFixed() : varDiscountFixed}
                            onChange={val => handleDiscountFixedChange(String(val))}
                            className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-emerald-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:opacity-60"
                        />
                    </div>

                    {/* Preço Promocional */}
                    <div className="flex flex-col gap-2 min-w-[180px] flex-1">
                        <label htmlFor="variation-promo-price-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Preço Promocional</span>
                        </label>
                        <CurrencyInput
                            id="variation-promo-price-input"
                            aria-label="Preço promocional da variação"
                            disabled={formData.syncUnitPrice}
                            value={formData.syncUnitPrice ? (parentProduct.promoPrice || 0) : (formData.promoPrice || 0)}
                            onChange={val => handlePromoPriceFieldChange(String(val))}
                            className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-amber-600 focus:border-blue-600 dark:focus:border-blue-400 transition-all disabled:opacity-60"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VariationPricingTab;

