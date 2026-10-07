import { useState, useEffect } from 'react';
import {
  fetchProductOpportunityMap,
  fetchProductSupplierMap,
} from '../services/mobileProductMetadataService';

export function useMobileProductMetadata(product: any) {
  const [oppName, setOppName] = useState<string | null>(
    product.opportunityName || product.opportunity?.name || null
  );
  const [supplierNames, setSupplierNames] = useState<string[]>([]);

  useEffect(() => {
    let mounted = true;
    const oppId = product.opportunity_id || product.opportunityId;
    if (oppId) {
      fetchProductOpportunityMap().then((map) => {
        if (mounted && map[oppId]) setOppName(map[oppId]);
      });
    } else {
      setOppName(product.opportunityName || product.opportunity?.name || null);
    }

    const rawIds = [
      product.mainSupplierId,
      product.supplierId,
      product.main_supplier_id,
      product.supplier_id,
      ...(product.supplierIds || product.supplier_ids || []),
    ];
    const sIds = Array.from(new Set(rawIds.filter(Boolean))).map(String);

    if (sIds.length > 0) {
      fetchProductSupplierMap().then((map) => {
        if (!mounted) return;
        const names: string[] = [];
        sIds.forEach((id) => {
          if (map && map[id]) names.push(map[id]);
        });
        if (names.length === 0) {
          const fallback =
            product.supplierName ||
            product.supplier_name ||
            product.supplier?.name ||
            product.supplier;
          if (fallback) names.push(String(fallback));
        }
        setSupplierNames(Array.from(new Set(names)));
      });
    } else {
      const fallback =
        product.supplierName || product.supplier_name || product.supplier?.name || product.supplier;
      setSupplierNames(fallback ? [String(fallback)] : []);
    }

    return () => {
      mounted = false;
    };
  }, [
    product.opportunity_id,
    product.opportunityId,
    product.mainSupplierId,
    product.supplierId,
    product.main_supplier_id,
    product.supplier_id,
    JSON.stringify(product.supplierIds || product.supplier_ids || []),
  ]);

  return { oppName, supplierNames };
}
