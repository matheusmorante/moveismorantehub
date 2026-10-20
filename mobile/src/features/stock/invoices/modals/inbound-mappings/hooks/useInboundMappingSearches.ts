import { useEffect, useState } from 'react';
import * as stockService from '../../../../../../services/stockService';
import type { Product, Supplier } from '../types';

interface UseInboundMappingSearchesParams {
  visible: boolean;
  supplierId: string;
}

export const useInboundMappingSearches = ({
  visible,
  supplierId,
}: UseInboundMappingSearchesParams) => {
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchError, setSupplierSearchError] = useState('');
  const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);

  const [queries, setQueries] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<Record<number, Product[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Record<number, boolean>>({});
  const [productSearchErrors, setProductSearchErrors] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!visible || supplierSearch.trim().length < 2 || supplierId) {
      setSuppliers([]);
      setSupplierSearchError('');
      setSupplierSearchLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setSupplierSearchLoading(true);
      setSuppliers([]);
      void stockService
        .searchInboundInvoiceSuppliers(supplierSearch)
        .then((rows) => {
          if (active) {
            setSuppliers(rows as Supplier[]);
            setSupplierSearchError('');
          }
        })
        .catch((error) => {
          console.warn('[InboundInvoiceMappings] supplier search failed', error);
          if (active) {
            setSuppliers([]);
            setSupplierSearchError('Não foi possível buscar fornecedores. Tente novamente.');
          }
        })
        .finally(() => {
          if (active) setSupplierSearchLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [visible, supplierSearch, supplierId]);

  useEffect(() => {
    if (!visible || !supplierId) return;
    let active = true;
    const timers = Object.entries(queries)
      .map(([itemNumber, query]) => {
        if (query.trim().length < 2) {
          setProducts((current) => ({ ...current, [itemNumber]: [] }));
          setProductSearchErrors((current) => ({ ...current, [itemNumber]: '' }));
          setProductSearchLoading((current) => ({ ...current, [itemNumber]: false }));
          return null;
        }
        return setTimeout(() => {
          setProductSearchErrors((current) => ({ ...current, [itemNumber]: '' }));
          setProductSearchLoading((current) => ({ ...current, [itemNumber]: true }));
          setProducts((current) => ({ ...current, [itemNumber]: [] }));
          void stockService
            .searchInboundInvoiceProducts(query.trim())
            .then((rows) => {
              if (active)
                setProducts((current) => ({ ...current, [itemNumber]: rows as Product[] }));
            })
            .catch((error) => {
              console.warn('[InboundInvoiceMappings] product search failed', error);
              if (active)
                setProductSearchErrors((current) => ({
                  ...current,
                  [itemNumber]: 'Não foi possível buscar produtos. Tente novamente.',
                }));
            })
            .finally(() => {
              if (active)
                setProductSearchLoading((current) => ({ ...current, [itemNumber]: false }));
            });
        }, 250);
      })
      .filter(Boolean);
    return () => {
      active = false;
      timers.forEach((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
    };
  }, [visible, supplierId, queries]);

  return {
    supplierSearch,
    setSupplierSearch,
    suppliers,
    setSuppliers,
    supplierSearchError,
    supplierSearchLoading,
    queries,
    setQueries,
    products,
    productSearchLoading,
    productSearchErrors,
  };
};
