import React from 'react';
import type Product from '@/pages/types/product.type';
import {
  fetchProductOpportunityMap,
  fetchProductSupplierMap,
} from '../../../services/productCatalogMetadataService';

interface ProductMetadataSource extends Product {
  readonly main_supplier_id?: string | null;
  readonly supplier_id?: string | null;
  readonly supplier_ids?: readonly string[] | null;
  readonly supplierName?: string | null;
  readonly supplier?: { readonly name?: string | null } | null;
}

export interface UseProductMetadataResult {
  readonly oppName: string | null;
  readonly supplierNames: readonly string[];
}

/**
 * Hook para carregar dinamicamente o nome da oportunidade e fornecedores de um produto.
 */
export function useProductMetadata(product: ProductMetadataSource): UseProductMetadataResult {
  const [oppName, setOppName] = React.useState<string | null>(
    product.opportunityName || product.opportunity?.name || null
  );
  const [supplierNames, setSupplierNames] = React.useState<readonly string[]>([]);

  React.useEffect(() => {
    let isMounted = true;
    if (product.opportunityId) {
      fetchProductOpportunityMap().then((map) => {
        if (isMounted && map && product.opportunityId && map[product.opportunityId]) {
          setOppName(map[product.opportunityId]);
        }
      });
    } else {
      setOppName(product.opportunityName || product.opportunity?.name || null);
    }
    return () => {
      isMounted = false;
    };
  }, [product.opportunityId, product.opportunityName, product.opportunity]);

  const supplierIdsKey = React.useMemo(() => {
    const rawIds = [
      product.mainSupplierId,
      product.supplierId,
      product.main_supplier_id,
      product.supplier_id,
      ...(product.supplierIds || product.supplier_ids || []),
    ];
    return Array.from(new Set(rawIds.filter(Boolean)))
      .map(String)
      .sort()
      .join(',');
  }, [
    product.mainSupplierId,
    product.supplierId,
    product.main_supplier_id,
    product.supplier_id,
    product.supplierIds,
    product.supplier_ids,
  ]);

  React.useEffect(() => {
    let isMounted = true;
    const sIds = supplierIdsKey ? supplierIdsKey.split(',') : [];

    if (sIds.length > 0) {
      fetchProductSupplierMap().then((map) => {
        if (!isMounted) return;
        const resolvedNames: string[] = [];
        sIds.forEach((id) => {
          if (map && map[id]) resolvedNames.push(map[id]);
        });
        if (resolvedNames.length === 0) {
          const fallback = product.supplierName || product.supplier?.name || null;
          if (fallback) resolvedNames.push(fallback);
        }
        setSupplierNames(Array.from(new Set(resolvedNames)));
      });
    } else {
      const fallback = product.supplierName || product.supplier?.name || null;
      setSupplierNames(fallback ? [fallback] : []);
    }

    return () => {
      isMounted = false;
    };
  }, [supplierIdsKey, product.supplierName, product.supplier]);

  return { oppName, supplierNames };
}
