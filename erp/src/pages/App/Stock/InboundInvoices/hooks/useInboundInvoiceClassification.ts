import { useState, useRef, useEffect } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { aiService } from '@/pages/utils/aiService';
import { fetchSupplierProductsForContext, buildSupplierContextSummary, type SupplierProductSummary } from '@/pages/utils/inboundNfe/inboundSupplierProductContext';

export interface AiClassification {
    decision: 'EXISTING_VARIATION' | 'NEW_VARIATION_OF_EXISTING_PRODUCT' | 'NEW_PRODUCT' | 'UNSURE';
    matchedProductId: string | null;
    matchedVariationId: string | null;
    normalizedParentName: string;
    extractedAttributes: { color: string | null; measure: string | null; material: string | null };
    confidence: number;
    reasons: string[];
}

export function useInboundInvoiceClassification(supplierId?: string) {
    const [isClassifying, setIsClassifying] = useState(false);
    const [aiClassification, setAiClassification] = useState<AiClassification | null>(null);
    const [classifyingItem, setClassifyingItem] = useState<InboundInvoiceItem | null>(null);
    const supplierProductsCacheRef = useRef<{ supplierId: string; products: SupplierProductSummary[] } | null>(null);

    useEffect(() => {
        if (supplierId && supplierProductsCacheRef.current?.supplierId !== supplierId) {
            supplierProductsCacheRef.current = null;
        }
    }, [supplierId]);

    const getSupplierProducts = async (): Promise<SupplierProductSummary[]> => {
        if (!supplierId) return [];
        if (supplierProductsCacheRef.current?.supplierId === supplierId) return supplierProductsCacheRef.current.products;
        const products = await fetchSupplierProductsForContext(supplierId);
        supplierProductsCacheRef.current = { supplierId, products };
        return products;
    };

    const classifyWithAI = async (item: InboundInvoiceItem): Promise<AiClassification | null> => {
        setIsClassifying(true);
        setClassifyingItem(item);
        try {
            const supplierProducts = await getSupplierProducts();
            if (!supplierProducts.length) {
                return null;
            }
            const contextSummary = buildSupplierContextSummary(supplierProducts);
            const classification = await aiService.classifyInboundItemWithSupplierContext({
                itemDescription: item.productDescription,
                itemProductCode: item.productCode || undefined,
                supplierContextSummary: contextSummary,
            });
            return classification as AiClassification;
        } finally {
            setIsClassifying(false);
        }
    };

    const resetClassification = () => {
        setAiClassification(null);
        setClassifyingItem(null);
    };

    return {
        isClassifying,
        aiClassification,
        setAiClassification,
        classifyingItem,
        setClassifyingItem,
        classifyWithAI,
        resetClassification
    };
}
