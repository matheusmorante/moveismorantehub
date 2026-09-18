import { useState, useMemo, useCallback } from 'react';
import type Product from "@/pages/types/product.type";
import type { Variation } from "@/pages/types/product.type";
import type Person from "@/pages/types/person.type";
import { getVariationDisplayName } from "@/components/productAutocompleteUtils";
import type { InventoryScopeType, ScopeConfiguration } from '../Inventory/modals/InventoryScopeModal';

export const useInventoryScopeBuilder = (
    allProducts: readonly Product[],
    suppliers: readonly Person[],
) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [scopeType, setScopeType] = useState<InventoryScopeType | null>(null);
    
    // Configs
    const [inventoryName, setInventoryName] = useState("");
    const [blindCount, setBlindCount] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
    const [responsibleError, setResponsibleError] = useState(false);
    const [customProducts, setCustomProducts] = useState<Array<{ product: Product, variation?: Variation }>>([]);

    const getAssignedSupplierName = useCallback((product: Product) => {
        const supplierId = [
            product.mainSupplierId,
            product.supplierId,
            ...(product.supplierIds || []),
        ].filter(Boolean).map(String)[0];

        if (!supplierId) return 'Sem fornecedor';
        
        const supplier = suppliers.find((person) => String(person.id) === supplierId);
        return supplier?.tradeName || supplier?.fullName || supplier?.nickname || 'Sem fornecedor';
    }, [suppliers]);

    const getSupplierNames = useCallback((product: Product) => {
        const supplierIds = [
            product.mainSupplierId,
            product.supplierId,
            ...(product.supplierIds || []),
        ].filter(Boolean).map(String);
        
        const names = supplierIds.map((supplierId) => {
            const supplier = suppliers.find((person) => String(person.id) === supplierId);
            return supplier?.tradeName || supplier?.fullName || supplier?.nickname;
        }).filter(Boolean) as string[];

        return [...new Set(names)].join(' / ') || 'Fábrica não informada';
    }, [suppliers]);


    const matchingItems = useMemo(() => {
        const items: ScopeConfiguration['itemsSnapshot'] = [];
        
        const addProductVariations = (product: Product, specificVariation?: Variation) => {
            const assignedSupplier = getAssignedSupplierName(product);
            const supplierNames = getSupplierNames(product);

            if (specificVariation) {
                items.push({
                    productId: String(product.id),
                    variationId: String(specificVariation.id),
                    name: getVariationDisplayName(product, specificVariation) || product.description || 'Produto',
                    supplierNames,
                    assignedSupplier,
                    systemStock: Number(specificVariation.stock ?? 0),
                    unit: product.unit || 'UN',
                });
            } else if (product.variations && product.variations.length > 0) {
                for (const variation of product.variations) {
                    items.push({
                        productId: String(product.id),
                        variationId: String(variation.id),
                        name: getVariationDisplayName(product, variation) || product.description || 'Produto',
                        supplierNames,
                        assignedSupplier,
                        systemStock: Number(variation.stock ?? 0),
                        unit: product.unit || 'UN',
                    });
                }
            } else {
                items.push({
                    productId: String(product.id),
                    name: product.description || product.name || 'Produto',
                    supplierNames,
                    assignedSupplier,
                    systemStock: Number(product.stock ?? 0),
                    unit: product.unit || 'UN',
                });
            }
        };

        if (scopeType === 'full') {
            for (const product of allProducts) {
                addProductVariations(product);
            }
        } else if (scopeType === 'supplier' && selectedSupplierId) {
            const supplierProducts = allProducts.filter((product) => {
                const supplierIds = [
                    product.mainSupplierId,
                    product.supplierId,
                    ...(product.supplierIds || []),
                ].filter(Boolean).map(String);
                return supplierIds.includes(String(selectedSupplierId));
            });
            for (const product of supplierProducts) {
                addProductVariations(product);
            }
        } else if (scopeType === 'custom') {
            for (const { product, variation } of customProducts) {
                addProductVariations(product, variation);
            }
        }

        return items;
    }, [scopeType, allProducts, selectedSupplierId, customProducts, suppliers]);

    const handleNextStep = (type: InventoryScopeType) => {
        setScopeType(type);
        setStep(2);
        
        // Auto-generate name
        const dateStr = new Date().toLocaleDateString('pt-BR', { month: 'long' });
        if (type === 'full') setInventoryName(`Inventário Geral - ${dateStr}`);
        else if (type === 'supplier') setInventoryName(`Inventário por Fornecedor`);
        else setInventoryName(`Inventário Personalizado`);
    };

    return {
        step,
        scopeType,
        inventoryName,
        setInventoryName,
        blindCount,
        setBlindCount,
        selectedSupplierId,
        setSelectedSupplierId,
        selectedResponsibleId,
        setSelectedResponsibleId,
        responsibleError,
        setResponsibleError,
        customProducts,
        setCustomProducts,
        matchingItems,
        handleNextStep,
    };
};
