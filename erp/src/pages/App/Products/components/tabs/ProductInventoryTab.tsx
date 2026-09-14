import React from 'react';
import type { Product } from '@/pages/types/product.type';
import type { Person } from '../../../../types/person.type';
import { ProductSupplierField } from './ProductSupplierField';
import { ProductPricingFields } from './ProductPricingFields';

interface ProductInventoryTabProps {
    readonly formData: Partial<Product>;
    readonly setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    readonly suppliers: readonly Person[];
    readonly handleSuggestPrices?: () => void;
    readonly isSuggestingPrices?: boolean;
    readonly suggestPricesResults?: { readonly low: number; readonly medium: number; readonly high: number } | null;
    readonly discountPercent: string;
    readonly setDiscountPercent?: React.Dispatch<React.SetStateAction<string>>;
    readonly discountFixed: string;
    readonly setDiscountFixed?: React.Dispatch<React.SetStateAction<string>>;
    readonly handlePriceChange: (newPrice: string) => void;
    readonly handleDiscountPercentChange: (valStr: string) => void;
    readonly handleDiscountFixedChange: (valStr: string) => void;
    readonly handlePromoPriceFieldChange: (valStr: string) => void;
    readonly validationErrors?: Record<string, boolean>;
    readonly setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const ProductInventoryTab: React.FC<ProductInventoryTabProps> = ({
    formData,
    setFormData,
    suppliers,
    discountPercent,
    discountFixed,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
    validationErrors = {},
    setValidationErrors
}) => {
    const updateCost = (fields: Partial<Product>) => {
        if (fields.mainSupplierId && setValidationErrors) {
            setValidationErrors(previous => {
                const next = { ...previous };
                delete next.mainSupplierId;
                return next;
            });
        }
        setFormData(prev => {
            const next = { ...prev, ...fields };
            const cost = Number(next.costPrice) || 0;
            const ipi = Number(next.ipiPercent) || 0;
            const freight = Number(next.freightCost) || 0;
            const freightType = next.freightType || 'fixed';

            let finalCost = cost + (cost * (ipi / 100));
            if (freightType === 'fixed') {
                finalCost += freight;
            } else {
                finalCost += cost * (freight / 100);
            }

            next.finalPurchasePrice = Number(finalCost.toFixed(2));
            return next;
        });
    };

    const minStockValue = (formData.minStock === null || formData.minStock === undefined || Number.isNaN(Number(formData.minStock)))
        ? ''
        : formData.minStock;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Fornecedor e Estoque Mínimo - Sempre Visíveis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ProductSupplierField
                    formData={formData}
                    suppliers={suppliers}
                    onChange={updateCost}
                    hasError={validationErrors.mainSupplierId}
                />

                {!formData.hasVariations && (
                    <div className="flex flex-col gap-2 p-2 rounded-2xl">
                        <label htmlFor="product-min-stock-input" className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Estoque Mínimo</span>
                        </label>
                        <input
                            id="product-min-stock-input"
                            type="number"
                            min="0"
                            aria-label="Estoque mínimo do produto"
                            value={minStockValue}
                            onChange={(e) => {
                                const parsed = parseInt(e.target.value, 10);
                                setFormData(prev => ({ ...prev, minStock: Number.isNaN(parsed) ? 0 : parsed }));
                            }}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-black text-amber-600 dark:text-amber-500 focus:ring-2 focus:ring-amber-500/20"
                            placeholder="0"
                        />
                    </div>
                )}
            </div>

            <ProductPricingFields
                formData={formData}
                discountPercent={discountPercent}
                discountFixed={discountFixed}
                onPriceChange={handlePriceChange}
                onDiscountPercentChange={handleDiscountPercentChange}
                onDiscountFixedChange={handleDiscountFixedChange}
                onPromoPriceChange={handlePromoPriceFieldChange}
                validationErrors={validationErrors}
                setValidationErrors={setValidationErrors}
            />
        </div>
    );
};

export default ProductInventoryTab;

