import { useState, useRef, useEffect } from 'react';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { aiService } from '@/pages/utils/aiService';
import {
  fetchSupplierProductsForContext,
  buildSupplierContextSummary,
  type SupplierProductSummary,
} from '@/pages/utils/inboundNfe/inboundSupplierProductContext';

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
  const active = useRef(true);
  const request = useRef(0);
  useEffect(() => { active.current = true; return () => { active.current = false; request.current += 1; }; }, []);
  const supplierProductsCacheRef = useRef<{
    supplierId: string;
    products: SupplierProductSummary[];
  } | null>(null);

  useEffect(() => {
    if (supplierId && supplierProductsCacheRef.current?.supplierId !== supplierId) {
      supplierProductsCacheRef.current = null;
    }
  }, [supplierId]);

  const getSupplierProducts = async (targetSupplierId: string | undefined, stillCurrent: () => boolean): Promise<SupplierProductSummary[]> => {
    if (!targetSupplierId) return [];
    if (supplierProductsCacheRef.current?.supplierId === targetSupplierId)
      return supplierProductsCacheRef.current.products;
    const products = await fetchSupplierProductsForContext(targetSupplierId);
    if (!stillCurrent()) throw new Error('O contexto da nota mudou. Reabra a preparação do produto.');
    supplierProductsCacheRef.current = { supplierId: targetSupplierId, products };
    return products;
  };

  const classifyWithAI = async (item: InboundInvoiceItem, stillCurrent: () => boolean = () => true, targetSupplierId = supplierId): Promise<AiClassification | null> => {
    if (!active.current || !stillCurrent()) return null;
    const token = ++request.current;
    setIsClassifying(true);
    setClassifyingItem(item);
    try {
      const supplierProducts = await getSupplierProducts(targetSupplierId, () => active.current && token === request.current && stillCurrent());
      if (!active.current || token !== request.current || !stillCurrent()) throw new Error('O contexto da nota mudou. Reabra a preparação do produto.');
      if (!supplierProducts.length) {
        return null;
      }
      const contextSummary = buildSupplierContextSummary(supplierProducts);
      const classification = await aiService.classifyInboundItemWithSupplierContext({
        itemDescription: item.productDescription,
        itemProductCode: item.productCode || undefined,
        supplierContextSummary: contextSummary,
      });
      if (!active.current || token !== request.current || !stillCurrent()) throw new Error('O contexto da nota mudou. Reabra a preparação do produto.');
      return classification as AiClassification;
    } finally {
      if (active.current && token === request.current) setIsClassifying(false);
    }
  };

  const resetClassification = () => {
    request.current += 1;
    setIsClassifying(false);
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
    resetClassification,
  };
}
