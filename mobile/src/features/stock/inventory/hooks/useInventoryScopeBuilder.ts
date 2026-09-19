import { useState, useMemo } from 'react';

export interface ScopeProduct {
    id: string;
    name: string;
    description?: string;
    stock: number;
    unit?: string;
    main_supplier_id?: string;
}

export interface ScopeSupplier {
    id: string;
    full_name: string;
}

export type InventoryScopeType = 'full' | 'supplier' | 'custom';

export interface ScopeConfiguration {
    type: InventoryScopeType;
    name: string;
    blindCount: boolean;
    hasStages?: boolean;
    supplierId?: string;
    responsibleId: string;
    itemsSnapshot: Array<{
        productId: string;
        variationId?: string;
        name: string;
        supplierNames: string;
        assignedSupplier: string;
        systemStock: number;
        unit: string;
    }>;
}

export const useInventoryScopeBuilder = (
    allProducts: readonly ScopeProduct[],
    suppliers: readonly ScopeSupplier[],
) => {
    const [step, setStep] = useState<1 | 2>(1);
    const [scopeType, setScopeType] = useState<InventoryScopeType | null>(null);
    
    // Configs
    const [inventoryName, setInventoryName] = useState("");
    const [blindCount, setBlindCount] = useState(false);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
    const [responsibleError, setResponsibleError] = useState(false);
    const [customProducts, setCustomProducts] = useState<Array<{ product: ScopeProduct }>>([]);

    const getSupplierNames = (product: ScopeProduct) => {
        if (!product.main_supplier_id) return 'Fábrica não informada';
        const supplier = suppliers.find(s => s.id === product.main_supplier_id);
        return supplier ? supplier.full_name : 'Fábrica não informada';
    };

    const matchingItems = useMemo(() => {
        const items: ScopeConfiguration['itemsSnapshot'] = [];
        
        const addProduct = (product: ScopeProduct) => {
            const supplierName = getSupplierNames(product);
            items.push({
                productId: String(product.id),
                name: product.name || product.description || 'Produto',
                supplierNames: supplierName,
                assignedSupplier: supplierName.split(' / ')[0] || 'Sem fornecedor',
                systemStock: Number(product.stock ?? 0),
                unit: product.unit || 'UN',
            });
        };

        if (scopeType === 'full') {
            for (const product of allProducts) addProduct(product);
        } else if (scopeType === 'supplier' && selectedSupplierId) {
            const supplierProducts = allProducts.filter(p => p.main_supplier_id === selectedSupplierId);
            for (const product of supplierProducts) addProduct(product);
        } else if (scopeType === 'custom') {
            for (const { product } of customProducts) addProduct(product);
        }

        return items;
    }, [scopeType, allProducts, selectedSupplierId, customProducts, suppliers]);

    const handleNextStep = (type: InventoryScopeType) => {
        setScopeType(type);
        setStep(2);
        
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
        setStep,
    };
};
