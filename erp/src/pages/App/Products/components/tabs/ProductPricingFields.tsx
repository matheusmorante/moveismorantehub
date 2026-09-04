import type React from 'react';
import { Product } from '@/pages/types/product.type';
import CurrencyInput from '@/components/CurrencyInput';

interface ProductPricingFieldsProps {
    formData: Partial<Product>;
    discountPercent: string;
    discountFixed: string;
    onPriceChange: (value: string) => void;
    onDiscountPercentChange: (value: string) => void;
    onDiscountFixedChange: (value: string) => void;
    onPromoPriceChange: (value: string) => void;
    validationErrors: Record<string, boolean>;
    setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function ProductPricingFields({
    formData, discountPercent, discountFixed, onPriceChange, onDiscountPercentChange,
    onDiscountFixedChange, onPromoPriceChange, validationErrors, setValidationErrors,
}: ProductPricingFieldsProps) {
    return (
        <div className="border-t border-slate-150 dark:border-slate-800/80 pt-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
                <i className="bi bi-tag-fill"></i> Precificação e Descontos {formData.hasVariations ? '(Produto Pai)' : ''}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div id="field-unit-price" className="flex flex-col gap-2 transition-all p-2 rounded-2xl">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                        <span>Preço de Venda</span><span className="text-red-500 ml-0.5">*</span>
                    </label>
                    <CurrencyInput
                        value={formData.unitPrice}
                        onChange={(value) => onPriceChange(String(value))}
                        onBlur={() => {
                            if (formData.unitPrice && Number(formData.unitPrice) > 0 && setValidationErrors) {
                                setValidationErrors(previous => {
                                    const next = { ...previous };
                                    delete next.unitPrice;
                                    return next;
                                });
                            }
                        }}
                        className={`w-full text-left px-3 py-2.5 bg-white dark:bg-slate-955 border rounded-xl outline-none text-xs font-bold transition-all ${validationErrors.unitPrice ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-600' : 'border-slate-200 dark:border-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500/20'}`}
                    />
                </div>
                <div className="flex flex-col gap-2 p-2 rounded-2xl">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6"><span>Desconto (%)</span></label>
                    <div className="relative">
                        <input type="number" placeholder="0" value={discountPercent} onChange={(event) => onDiscountPercentChange(event.target.value)} className="w-full pl-4 pr-8 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20" />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2 p-2 rounded-2xl">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6"><span>Desconto (R$)</span></label>
                    <CurrencyInput value={discountFixed} onChange={(value) => onDiscountFixedChange(String(value))} className="w-full text-left px-3 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20" />
                </div>
                <div className="flex flex-col gap-2 p-2 rounded-2xl">
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6"><span>Preço Promocional Final</span></label>
                    <CurrencyInput placeholder="Sem desconto" value={formData.promoPrice} onChange={(value) => onPromoPriceChange(String(value))} className="w-full text-left px-3 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/30 rounded-xl outline-none text-xs font-black text-amber-600 dark:text-amber-500 focus:ring-2 focus:ring-amber-500/20" />
                </div>
            </div>
        </div>
    );
}
