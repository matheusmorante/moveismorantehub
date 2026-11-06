import React from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/context/AuthContext';
import {
  collectProductMetadataIds,
  emptyProductNameMaps,
  fetchProductOpportunityMap,
  fetchProductSupplierMap,
  resolveProductMetadata,
  type ProductMetadataSource,
  type ProductNameMaps,
} from '../../../services/productCatalogMetadataService';

const ProductMetadataContext = React.createContext<ProductNameMaps>(emptyProductNameMaps);

export function ProductMetadataProvider({ products, children }: {
  products: readonly ProductMetadataSource[];
  children: React.ReactNode;
}) {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { opportunityIds, supplierIds } = collectProductMetadataIds(products);
  const opportunityKey = opportunityIds.join(',');
  const supplierKey = supplierIds.join(',');
  const opportunities = useQuery({
    queryKey: ['product-page-metadata', user?.id, 'opportunities', opportunityKey],
    enabled: Boolean(user?.id && opportunityIds.length),
    staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true,
    queryFn: ({ signal }) => fetchProductOpportunityMap(opportunityIds, signal),
  });
  const suppliers = useQuery({
    queryKey: ['product-page-metadata', user?.id, 'suppliers', supplierKey],
    enabled: Boolean(user?.id && supplierIds.length),
    staleTime: 0, gcTime: 0, retry: false, refetchOnWindowFocus: true,
    queryFn: ({ signal }) => fetchProductSupplierMap(supplierIds, signal),
  });
  const previousProducts = React.useRef(products);
  React.useEffect(() => {
    if (previousProducts.current === products) return;
    previousProducts.current = products;
    if (!user?.id) return;
    if (opportunityKey) void opportunities.refetch({ cancelRefetch: false });
    if (supplierKey) void suppliers.refetch({ cancelRefetch: false });
  }, [products, user?.id, opportunityKey, supplierKey, opportunities.refetch, suppliers.refetch]);

  React.useEffect(() => {
    const refreshNames = (event: Event) => {
      const collection = (event as CustomEvent<{ collectionName?: string }>).detail?.collectionName;
      if (collection && collection !== 'suppliers' && collection !== 'supplier') return;
      void queryClient.invalidateQueries({ queryKey: ['product-page-metadata', user?.id, 'suppliers'] });
    };
    window.addEventListener('people_updated', refreshNames);
    return () => window.removeEventListener('people_updated', refreshNames);
  }, [queryClient, user?.id]);

  const value: ProductNameMaps = user?.id ? {
    opportunities: opportunities.data || emptyProductNameMaps.opportunities,
    suppliers: suppliers.data || emptyProductNameMaps.suppliers,
  } : emptyProductNameMaps;
  return React.createElement(ProductMetadataContext.Provider, { value }, children);
}

export function useProductMetadata(product: ProductMetadataSource) {
  return resolveProductMetadata(product, React.useContext(ProductMetadataContext), true);
}
