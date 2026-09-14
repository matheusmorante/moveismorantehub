import type React from 'react';
import type { Product } from '@/pages/types/product.type';
import CurrencyInput from '@/components/CurrencyInput';

interface ProductPricingFieldsProps {
    readonly formData: Partial<Product>;
    readonly discountPercent: string;
    readonly discountFixed: string;
    readonly onPriceChange: (value: string) => void;
    readonly onDiscountPercentChange: (value: string) => void;
    readonly onDiscountFixedChange: (value: string) => void;
    readonly onPromoPriceChange: (value: string) => void;
    readonly validationErrors: Record<string, boolean>;
    readonly setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

export function ProductPricingFields({
    formData,
    discountPercent,
    discountFixed,
    onPriceChange,
    onDiscountPercentChange,
    onDiscountFixedChange,
    onPromoPriceChange,
    validationErrors,
    setValidationErrors,
}: ProductPricingFieldsProps) {
    const handleBlurPrice = () => {
        const parsed = Number(formData.unitPrice);
        if (formData.unitPrice && !Number.isNaN(parsed) && parsed > 0 && setValidationErrors) {
            setValidationErrors(previous => {
                const next = { ...previous };
                delete next.unitPrice;
                return next;
            });
        }
    };

    return (
        <div className="border-t border-slate-150 dark:border-slate-800/80 pt-6">
            <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
                <i className="bi bi-tag-fill" aria-hidden="true" /> Precificação e Descontos {formData.hasVariations ? '(Produto Pai)' : ''}
            </h5>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div id="field-unit-price" className="flex flex-col gap-2 transition-all p-2 rounded-2xl">
                    <label
                        htmlFor="product-unit-price-input"
                        className={`text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 h-6 ${validationErrors.unitPrice ? 'text-red-500 dark:text-red-400' : 'text-slate-400'}`}
                    >
                        <span>Preço de Venda</span><span className="text-red-500 ml-0.5" aria-hidden="true">*</span>
                    </label>
                    <CurrencyInput
                        id="product-unit-price-input"
                        aria-label="Preço de venda do produto"
                        aria-invalid={!!validationErrors.unitPrice}
                        value={formData.unitPrice}
                        onChange={(value) => onPriceChange(String(value))}
                        onBlur={handleBlurPrice}
                        className={`w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 outline-none text-xs font-bold transition-all ${validationErrors.unitPrice ? 'border-red-500 text-red-600 focus:border-red-600' : 'border-slate-200 dark:border-slate-800 text-blue-600 focus:border-blue-600 dark:focus:border-blue-400'}`}
                    />
                </div>
                <div className="flex flex-col gap-2 p-2 rounded-2xl">
                    <label htmlFor="product-discount-percent-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                        <span>Desconto (%)</span>
                    </label>
                    <div className="relative">
                        <input
                            id="product-discount-percent-input"
                            type="number"
                            min="0"
                            max="100"
                            placeholder="0"
                            aria-label="Percentual de desconto"
                            value={discountPercent}
                            onChange={(event) => onDiscountPercentChange(event.target.value)}
                            className="w-full pl-1 pr-6 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-emerald-600 focus:border-emerald-600"
                        />
                        <span className="absolute right-1 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none" aria-hidden="true">%</span>
                    </div>
                </div>
                <div className="flex flex-col gap-2 p-2 rounded-2xl">
                    <label htmlFor="product-discount-fixed-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                        <span>Desconto (R$)</span>
                    </label>
                    <CurrencyInput
                        id="product-discount-fixed-input"
                        aria-label="Valor fixo de desconto em reais"
                        value={discountFixed}
                        onChange={(value) => onDiscountFixedChange(String(value))}
                        className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-slate-200 dark:border-slate-800 outline-none text-xs font-bold text-emerald-600 focus:border-emerald-600"
                    />
                </div>
                <div className="flex flex-col gap-2 p-2 rounded-2xl">
                    <label htmlFor="product-promo-price-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                        <span>Preço Promocional Final</span>
                    </label>
                    <CurrencyInput
                        id="product-promo-price-input"
                        placeholder="Sem desconto"
                        aria-label="Preço promocional com desconto aplicado"
                        value={formData.promoPrice}
                        onChange={(value) => onPromoPriceChange(String(value))}
                        className="w-full text-left px-1 py-2.5 bg-transparent border-b-2 border-t-0 border-x-0 border-amber-200 dark:border-amber-800 outline-none text-xs font-black text-amber-600 dark:text-amber-500 focus:border-amber-600"
                    />
                </div>
            </div>
        </div>
    );
}

