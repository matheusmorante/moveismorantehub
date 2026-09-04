import { useCallback } from 'react';
import Item from '../../../types/items.type';
import Product, { Variation } from '../../../types/product.type';
import { getSelectedProductPricing } from '../../../utils/productPricing';
import { getSelectedProductDisplayName } from '../../../utils/productVariationDefaults';

export function useOrderProductSelection(
    items: Item[],
    setItems: React.Dispatch<React.SetStateAction<Item[]>>
) {
    const handleSelectProduct = useCallback((index: number, product: Product, variation?: Variation) => {
        const pricing = getSelectedProductPricing(product, variation);

        const selectedCost = variation
            ? (variation.costPrice ?? product.costPrice ?? 0)
            : (product.costPrice ?? 0);

        const defaultHandling = (product.itemType === 'service' ? "Execução no local" : items[0]?.handlingType) || "";

        let resolvedCode = "";
        if (variation) {
            resolvedCode = variation.sku || "";
        }
        if (!resolvedCode) {
            resolvedCode = product.code && product.code !== '000000' 
                ? product.code 
                : (product.sku || "");
        }

        const fullDescription = getSelectedProductDisplayName(product, variation);

        setItems(currentItems => currentItems.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    productId: product.id,
                    variationId: variation?.id,
                    isTemporaryProduct: false,
                    code: resolvedCode,
                    description: fullDescription,
                    unitPrice: pricing.unitPrice,
                    unitDiscount: pricing.unitDiscount,
                    discountType: pricing.discountType,
                    costPrice: Number(selectedCost) || 0,
                    handlingType: defaultHandling,
                    condition: variation?.condition || product.condition || "novo"
                };
            }
            return item;
        }));
    }, [items, setItems]);

    const handleItemChange = useCallback((index: number, field: keyof Item, value: any) => {
        setItems(currentItems => currentItems.map((item, i) => {
            if (i === index) {
                const updated = { ...item, [field]: value };
                if (field === 'unitPrice' || field === 'quantity' || field === 'unitDiscount') {
                    const price = field === 'unitPrice' ? Number(value) : (item.unitPrice || 0);
                    const qty = field === 'quantity' ? Number(value) : (item.quantity || 1);
                    const disc = field === 'unitDiscount' ? Number(value) : (item.unitDiscount || 0);
                    updated.total = Math.max(0, (price - disc) * qty);
                }
                return updated;
            }
            return item;
        }));
    }, [setItems]);

    return {
        handleSelectProduct,
        handleItemChange,
    };
}
