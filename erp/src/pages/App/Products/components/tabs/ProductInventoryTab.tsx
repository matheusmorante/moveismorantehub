import React from 'react';
import { Product } from '@/pages/types/product.type';
import { Person } from '../../../../types/person.type';
import { ProductSupplierField } from './ProductSupplierField';
import { ProductPricingFields } from './ProductPricingFields';

interface ProductInventoryTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    suppliers: Person[];
    handleSuggestPrices: () => void;
    isSuggestingPrices: boolean;
    suggestPricesResults: { low: any, medium: any, high: any } | null;
    discountPercent: string;
    setDiscountPercent: React.Dispatch<React.SetStateAction<string>>;
    discountFixed: string;
    setDiscountFixed: React.Dispatch<React.SetStateAction<string>>;
    handlePriceChange: (newPrice: string) => void;
    handleDiscountPercentChange: (valStr: string) => void;
    handleDiscountFixedChange: (valStr: string) => void;
    handlePromoPriceFieldChange: (valStr: string) => void;
    validationErrors?: Record<string, boolean>;
    setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
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
            const cost = next.costPrice || 0;
            const ipi = next.ipiPercent || 0;
            const freight = next.freightCost || 0;
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

    const isEditing = !!formData.id && !formData.isDraft;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Fornecedor e Estoque Mínimo - Sempre Visíveis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <ProductSupplierField formData={formData} suppliers={suppliers} onChange={updateCost} hasError={validationErrors.mainSupplierId} />

                {!formData.hasVariations && (
                    /* Estoque Mínimo */
                    <div className="flex flex-col gap-2 p-2 rounded-2xl">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Estoque Mínimo</span>
                        </label>
                        <input
                            type="number"
                            value={(formData.minStock === null || formData.minStock === undefined || isNaN(formData.minStock as number)) ? '' : formData.minStock}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setFormData({ ...formData, minStock: isNaN(val) ? 0 : val });
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
