import { useState, useMemo } from 'react';

export interface ScopeProduct {
    id: string;
    variation_id?: string;
    name: string;
    description?: string;
    stock: number;
    unit?: string;
    sku?: string;
    code?: string;
    barcode?: string;
    active?: boolean;
    main_supplier_id?: string;
    supplier_id?: string;
    supplier_ids?: string[];
}

export interface ScopeSupplier {
    id: string;
    full_name: string;
}

export type InventoryScopeType = 'full' | 'supplier' | 'custom';

export interface ScopeConfiguration {
    type: InventoryScopeType;
    name: string;
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
        sku?: string;
        code?: string;
        barcode?: string;
        isActive?: boolean;
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
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [selectedResponsibleId, setSelectedResponsibleId] = useState("");
    const [responsibleError, setResponsibleError] = useState(false);
    const [customProducts, setCustomProducts] = useState<Array<{ product: ScopeProduct }>>([]);

    const getSupplierNames = (product: ScopeProduct) => {
        const ids = [...new Set([product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].filter(Boolean).map(String))];
        const names = ids.map(id => suppliers.find(s => String(s.id) === id)?.full_name).filter(Boolean);
        return (names as string[]).join(' / ') || 'Fábrica não informada';
    };

    const getAssignedSupplier = (product: ScopeProduct) => {
        const id = [product.main_supplier_id, product.supplier_id, ...(product.supplier_ids || [])].find(Boolean);
        return (id && suppliers.find(s => String(s.id) === String(id))?.full_name) || 'Sem fornecedor';
    };

    const matchingItems = useMemo(() => {
        const items: ScopeConfiguration['itemsSnapshot'] = [];
        
        const addProduct = (product: ScopeProduct) => {
            const supplierName = getSupplierNames(product);
            items.push({
                productId: String(product.id),
                variationId: product.variation_id ? String(product.variation_id) : undefined,
                name: product.name || product.description || 'Produto',
                supplierNames: supplierName,
                assignedSupplier: getAssignedSupplier(product),
                systemStock: Number(product.stock ?? 0),
                unit: product.unit || 'UN',
                sku: product.sku || product.code || '',
                code: product.code || '',
                barcode: product.barcode || '',
                isActive: product.active !== false,
            });
        };

        if (scopeType === 'full') {
            for (const product of allProducts) addProduct(product);
        } else if (scopeType === 'supplier' && selectedSupplierId) {
            const supplierProducts = allProducts.filter(p =>
                [p.main_supplier_id, p.supplier_id, ...(p.supplier_ids || [])].some(id => String(id) === String(selectedSupplierId))
            );
            for (const product of supplierProducts) addProduct(product);
        } else if (scopeType === 'custom') {
            for (const { product } of customProducts) addProduct(product);
        }

        return items;
    }, [scopeType, allProducts, selectedSupplierId, customProducts, suppliers]);

    const handleNextStep = (type: InventoryScopeType) => {
        setScopeType(type);
        setStep(2);
        
        const dateStr = new Date().toLocaleDateString('pt-BR');
        if (type === 'full') setInventoryName(`Inventário Geral - ${dateStr}`);
        else if (type === 'supplier') setInventoryName(`Inventário por Fornecedor`);
        else setInventoryName(`Inventário Personalizado`);
    };

    return {
        step,
        scopeType,
        inventoryName,
        setInventoryName,
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
