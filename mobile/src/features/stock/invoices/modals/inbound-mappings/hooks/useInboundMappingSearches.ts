import { useEffect, useMemo, useState } from 'react';
import { useZodForm } from '../../../../../../hooks/useZodForm';
import {
  inboundInvoiceCatalogSearchFormSchema,
  inboundInvoiceProductSearchFormSchema,
  INBOUND_INVOICE_SEARCH_DEBOUNCE_MS,
  INBOUND_INVOICE_SEARCH_MIN_CHARACTERS,
  INBOUND_INVOICE_SEARCH_RESULT_LIMIT,
} from '../../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import * as stockService from '../../../../../../services/stockService';
import type { MappingItem, Product, Supplier } from '../types';

interface UseInboundMappingSearchesParams {
  visible: boolean;
  supplierId: string;
  items: MappingItem[];
}

export const useInboundMappingSearches = ({
  visible,
  supplierId,
  items,
}: UseInboundMappingSearchesParams) => {
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchError, setSupplierSearchError] = useState('');
  const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
  const [supplierRetryVersion, setSupplierRetryVersion] = useState(0);
  const supplierSearchForm = useZodForm(inboundInvoiceCatalogSearchFormSchema, { query: '' });

  const [queries, setQueries] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<Record<number, Product[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Record<number, boolean>>({});
  const [productSearchErrors, setProductSearchErrors] = useState<Record<number, string>>({});
  const [productRetryVersions, setProductRetryVersions] = useState<Record<number, number>>({});
  const productSearchForm = useZodForm(inboundInvoiceProductSearchFormSchema, {
    query: '',
    supplierId: '',
    excludedLinks: [],
    itemType: undefined,
  });

  const excludedLinks = useMemo(
    () => items.flatMap((item) => {
      if (item.linkMode === 'not_applicable') return [];
      return [
        ...(item.matchedProductId
          ? [{ productId: item.matchedProductId, variationId: item.matchedVariationId }]
          : []),
        ...(item.compositionLinks || []).map((link) => ({
          productId: link.productId,
          variationId: link.variationId,
        })),
      ];
    }),
    [items]
  );

  const setSupplierSearchQuery = (query: string) => {
    setSupplierSearch(query);
    setSuppliers([]);
    setSupplierSearchError('');
  };

  const setProductSearchQuery = (itemNumber: number, query: string) => {
    setQueries((current) => ({ ...current, [itemNumber]: query }));
    setProducts((current) => ({ ...current, [itemNumber]: [] }));
    setProductSearchErrors((current) => ({ ...current, [itemNumber]: '' }));
    setProductSearchLoading((current) => ({ ...current, [itemNumber]: false }));
  };

  const clearProductSearches = () => {
    setQueries({});
    setProducts({});
    setProductSearchErrors({});
    setProductSearchLoading({});
  };

  useEffect(() => {
    if (!visible) {
      setSuppliers([]);
      setSupplierSearchError('');
      setSupplierSearchLoading(false);
      setQueries({});
      setProducts({});
      setProductSearchErrors({});
      setProductSearchLoading({});
      setSupplierRetryVersion(0);
      setProductRetryVersions({});
      return;
    }

    const term = supplierSearch.trim();
    if (supplierId || term.length < INBOUND_INVOICE_SEARCH_MIN_CHARACTERS) {
      setSuppliers([]);
      setSupplierSearchError('');
      setSupplierSearchLoading(false);
      return;
    }

    let active = true;
    setSuppliers([]);
    setSupplierSearchError('');
    setSupplierSearchLoading(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const values = await supplierSearchForm.validateValues({ query: supplierSearch });
          if (!active) return;
          if (!values) {
            setSupplierSearchLoading(false);
            return;
          }

          const rows = await stockService.searchInboundInvoiceSuppliers(values.query);
          if (active) {
            setSuppliers((rows as Supplier[]).slice(0, INBOUND_INVOICE_SEARCH_RESULT_LIMIT));
            setSupplierSearchError('');
          }
        } catch (error) {
          console.warn('[InboundInvoiceMappings] supplier search failed', error);
          if (active) {
            setSuppliers([]);
            setSupplierSearchError('Não foi possível buscar fornecedores. Tente novamente.');
          }
        } finally {
          if (active) setSupplierSearchLoading(false);
        }
      })();
    }, INBOUND_INVOICE_SEARCH_DEBOUNCE_MS);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [visible, supplierSearch, supplierId, supplierRetryVersion, supplierSearchForm.validateValues]);

  useEffect(() => {
    if (!visible || !supplierId) {
      setProducts({});
      setProductSearchErrors({});
      setProductSearchLoading({});
      return;
    }

    let active = true;
    const timers = Object.entries(queries)
      .map(([itemNumber, query]) => {
        const term = query.trim();
        setProducts((current) => ({ ...current, [itemNumber]: [] }));
        setProductSearchErrors((current) => ({ ...current, [itemNumber]: '' }));
        if (term.length < INBOUND_INVOICE_SEARCH_MIN_CHARACTERS) {
          setProductSearchLoading((current) => ({ ...current, [itemNumber]: false }));
          return null;
        }

        return setTimeout(() => {
          setProductSearchErrors((current) => ({ ...current, [itemNumber]: '' }));
          setProductSearchLoading((current) => ({ ...current, [itemNumber]: true }));
          setProducts((current) => ({ ...current, [itemNumber]: [] }));
          void (async () => {
            try {
              const itemType = items.find(
                (item) => item.itemNumber === Number(itemNumber)
              )?.linkMode === 'composition' ? 'composition' : undefined;
              const values = await productSearchForm.validateValues({
                query,
                supplierId,
                excludedLinks,
                itemType,
              });
              if (!active) return;
              if (!values) {
                setProductSearchLoading((current) => ({ ...current, [itemNumber]: false }));
                return;
              }

              const rows = await stockService.searchInboundInvoiceProducts(
                values.query,
                values.supplierId,
                values.excludedLinks,
                values.itemType
              );
              if (active) {
                setProducts((current) => ({
                  ...current,
                  [itemNumber]: (rows as Product[]).slice(0, INBOUND_INVOICE_SEARCH_RESULT_LIMIT),
                }));
              }
            } catch (error) {
              console.warn('[InboundInvoiceMappings] product search failed', error);
              if (active) {
                setProductSearchErrors((current) => ({
                  ...current,
                  [itemNumber]: 'Não foi possível buscar produtos. Tente novamente.',
                }));
              }
            } finally {
              if (active)
                setProductSearchLoading((current) => ({ ...current, [itemNumber]: false }));
            }
          })();
        }, INBOUND_INVOICE_SEARCH_DEBOUNCE_MS);
      })
      .filter(Boolean);

    return () => {
      active = false;
      timers.forEach((timer) => clearTimeout(timer as ReturnType<typeof setTimeout>));
    };
  }, [visible, supplierId, items, queries, productRetryVersions, productSearchForm.validateValues]);

  const retrySupplierSearch = () => setSupplierRetryVersion((current) => current + 1);
  const retryProductSearch = (itemNumber: number) =>
    setProductRetryVersions((current) => ({
      ...current,
      [itemNumber]: (current[itemNumber] || 0) + 1,
    }));

  return {
    supplierSearch,
    setSupplierSearch,
    searchSuppliers: setSupplierSearchQuery,
    suppliers,
    setSuppliers,
    supplierSearchError,
    supplierSearchLoading,
    retrySupplierSearch,
    queries,
    setQueries: setProductSearchQuery,
    clearProductSearches,
    products,
    productSearchLoading,
    productSearchErrors,
    retryProductSearch,
  };
};
