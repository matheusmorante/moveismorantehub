import { createContext, createElement, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState } from 'react-native';
import { useAuth } from '../../../contexts/AuthContext';
import { connectivityService } from '../../../services/offline/connectivityService';
import {
  collectProductMetadataIds,
  emptyProductNameMaps,
  fetchProductOpportunityMap,
  fetchProductSupplierMap,
  resolveProductMetadata,
  type ProductMetadataSource,
  type ProductNameMaps,
} from '../services/mobileProductMetadataService';

const ProductMetadataContext = createContext<ProductNameMaps>(emptyProductNameMaps);
type Props = { products: readonly ProductMetadataSource[]; children?: ReactNode };

function PageProductMetadata({ products, children }: Props) {
  const [maps, setMaps] = useState(emptyProductNameMaps);
  const [online, setOnline] = useState(connectivityService.connected);
  const [refreshKey, setRefreshKey] = useState(0);
  const inFlight = useRef(new Map<string, Promise<Record<string, string>>>());
  const { opportunityIds, supplierIds } = collectProductMetadataIds(products);
  const idsKey = JSON.stringify([opportunityIds, supplierIds]);

  useEffect(() => {
    const stopConnectivity = connectivityService.subscribe(setOnline);
    let previousState = AppState.currentState;
    const subscription = AppState.addEventListener('change', (nextState) => {
      if (nextState === 'active' && previousState !== 'active') setRefreshKey((key) => key + 1);
      previousState = nextState;
    });
    return () => { stopConnectivity(); subscription.remove(); };
  }, []);

  useEffect(() => {
    if (!online) return;
    let current = true;
    const request = (key: string, load: () => Promise<Record<string, string>>) => {
      const existing = inFlight.current.get(key);
      if (existing) return existing;
      const pending = load().finally(() => {
        if (inFlight.current.get(key) === pending) inFlight.current.delete(key);
      });
      inFlight.current.set(key, pending);
      return pending;
    };
    const loadMap = (kind: keyof ProductNameMaps, ids: string[], fetcher: typeof fetchProductSupplierMap) => {
      void request(JSON.stringify([kind, ids]), () => fetcher(ids)).then((map) => {
        if (current) setMaps((previous) => ({ ...previous, [kind]: map }));
      }).catch(() => {
        // Mantém nomes locais e os fallbacks; a próxima atualização pode tentar novamente.
      });
    };
    loadMap('opportunities', opportunityIds, fetchProductOpportunityMap);
    loadMap('suppliers', supplierIds, fetchProductSupplierMap);
    return () => { current = false; };
  }, [products, idsKey, refreshKey, online]);

  return createElement(ProductMetadataContext.Provider, { value: maps }, children);
}

export function MobileProductMetadataProvider({ products, children }: Props) {
  const { userProfile } = useAuth();
  if (!userProfile?.id) {
    return createElement(ProductMetadataContext.Provider, { value: emptyProductNameMaps }, children);
  }
  // Remontar por conta impede que nomes ou promessas da sessão anterior sejam reaproveitados.
  return createElement(PageProductMetadata, { key: userProfile.id, products }, children);
}

export function useMobileProductMetadata(product: ProductMetadataSource) {
  return resolveProductMetadata(product, useContext(ProductMetadataContext));
}
