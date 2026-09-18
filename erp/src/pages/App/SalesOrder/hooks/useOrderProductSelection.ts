import { useCallback } from 'react';
import Item from '@/pages/types/items.type';
import Product, { Variation } from '@/pages/types/product.type';
import { getSelectedProductPricing } from '@/pages/utils/productPricing';
import { getSelectedProductDisplayName } from '@/pages/utils/productVariationDefaults';

export function useOrderProductSelection(
    items: Item[],
    setItems: React.Dispatch<React.SetStateAction<Item[]>>
) {
    const handleSelectProduct = useCallback((index: number, product: any, variation?: any) => {
        if (product.isComposition) {
            // EXPLOSÃO DO KIT (COMPOSIÇÃO)
            const compositionItems = variation ? variation.items : product.variations?.[0]?.items;
            
            if (!compositionItems || compositionItems.length === 0) {
                console.warn("Composição sem itens reais vinculados.");
                return;
            }

            setItems(currentItems => {
                const newItems = [...currentItems];
                const explodedItems = compositionItems.map((compItem: any) => {
                    const realProduct = compItem.product;
                    const realVariation = compItem.variation;
                    
                    const pricing = getSelectedProductPricing(realProduct, realVariation);
                    const selectedCost = realVariation
                        ? (realVariation.costPrice ?? realProduct.costPrice ?? 0)
                        : (realProduct.costPrice ?? 0);
                        
                    let resolvedCode = realVariation ? realVariation.sku : realProduct.code;
                    if (!resolvedCode || resolvedCode === '000000') resolvedCode = realProduct.sku || "";

                    // Aqui definimos o unitPrice usando uma regra de 3 ou apenas 0 se a composição tiver preço fixo manual?
                    // Para rastreabilidade contábil, é melhor usar o preço real da peça.
                    // O cliente disse "expandiremos a composição em suas partes componentes originais para que o pedido deduza os estoques perfeitamente das peças individuais sem violar a rastreabilidade fiscal e contábil."
                    // Como não pediram rateio de preço agora, vamos usar o preço real. Se a composição era mais barata, o usuário aplica desconto no pedido.

                    return {
                        id: crypto.randomUUID(), // fake id para novo item
                        productId: realProduct.id,
                        variationId: realVariation?.id,
                        isTemporaryProduct: false,
                        code: resolvedCode || "",
                        description: getSelectedProductDisplayName(realProduct, realVariation),
                        unitPrice: pricing.unitPrice,
                        unitDiscount: pricing.unitDiscount,
                        discountType: pricing.discountType,
                        quantity: compItem.quantity,
                        total: Math.max(0, (pricing.unitPrice - (pricing.unitDiscount || 0)) * compItem.quantity),
                        costPrice: Number(selectedCost) || 0,
                        handlingType: "",
                        condition: realVariation?.condition || realProduct.condition || "novo"
                    };
                });

                // Substitui a linha vazia (index) pelos itens explodidos
                newItems.splice(index, 1, ...explodedItems);
                
                return newItems;
            });

            return;
        }

        // Fluxo normal para produto simples
        const pricing = getSelectedProductPricing(product, variation);

        const selectedCost = variation
            ? (variation.costPrice ?? product.costPrice ?? 0)
            : (product.costPrice ?? 0);

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
                    handlingType: "",
                    condition: variation?.condition || product.condition || "novo"
                };
            }
            return item;
        }));
    }, [setItems]);

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
