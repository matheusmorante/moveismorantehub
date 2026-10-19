import { useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../../hooks/useZodForm';
import { mobileInboundMappingsFormSchema } from '../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import * as stockService from '../../../../../services/stockService';
import { saveMobileProduct } from '../../../../products/services/mobileProductMutationService';
import type { Invoice } from '../../../types/stock.types';
import {
  createInboundScorerContext,
  rankInboundSuggestions,
  type InboundScorerProduct,
} from '../../utils/inboundDeterministicScorer';
import { amount, landedUnitCost } from './inboundCostUtils';
import type { CompositionLink, MappingItem, Product, ProductSuggestion, Supplier } from './types';

interface UseInboundInvoiceMappingsParams {
  invoice: Invoice | null;
  visible: boolean;
  onSaved: () => void;
}

export const useInboundInvoiceMappings = ({
  invoice,
  visible,
  onSaved,
}: UseInboundInvoiceMappingsParams) => {
  const [details, setDetails] = useState<any>(null);
  const [items, setItems] = useState<MappingItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const mappingForm = useZodForm(mobileInboundMappingsFormSchema, {
    invoiceId: '',
    supplierId,
    items,
  });
  const [supplierSearch, setSupplierSearch] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [supplierSearchError, setSupplierSearchError] = useState('');
  const [supplierSearchLoading, setSupplierSearchLoading] = useState(false);
  const [queries, setQueries] = useState<Record<number, string>>({});
  const [products, setProducts] = useState<Record<number, Product[]>>({});
  const [productSearchLoading, setProductSearchLoading] = useState<Record<number, boolean>>({});
  const [productSearchErrors, setProductSearchErrors] = useState<Record<number, string>>({});
  const [suggestions, setSuggestions] = useState<Record<number, ProductSuggestion[]>>({});
  const [dismissedSuggestions, setDismissedSuggestions] = useState<Record<number, boolean>>({});
  const [suggestionsLoading, setSuggestionsLoading] = useState(false);
  const [suggestionsError, setSuggestionsError] = useState('');
  const [suggestionRetryVersion, setSuggestionRetryVersion] = useState(0);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const [registrationItem, setRegistrationItem] = useState<MappingItem | null>(null);
  const [registrationDefaults, setRegistrationDefaults] = useState<Record<string, any>>();
  const [registrationParent, setRegistrationParent] = useState<any | null>(null);
  const [registrationFormVisible, setRegistrationFormVisible] = useState(false);
  const [registrationOptionsVisible, setRegistrationOptionsVisible] = useState(false);
  const [parentSearch, setParentSearch] = useState('');
  const [parentResults, setParentResults] = useState<any[]>([]);
  const [parentSearchError, setParentSearchError] = useState('');
  const [parentSearchLoading, setParentSearchLoading] = useState(false);
  const suggestionCache = useRef(new Map<string, Promise<Product[]>>());
  const suggestionRunKey = useRef('');

  useEffect(() => {
    if (!visible || !invoice) return;
    let active = true;
    setLoading(true);
    setErrorMessage('');
    void stockService
      .fetchInboundInvoiceForMappings(invoice.id)
      .then(async (result) => {
        if (!active) return;
        let mappings = new Map<string, any>();
        if (result.supplier_id && result.items.length) {
          try {
            mappings = await stockService.findInboundSupplierProductCodes(
              result.supplier_id,
              result.items.map((item: MappingItem) => item.productCode)
            );
          } catch (error) {
            console.warn(
              '[InboundInvoiceMappings] existing supplier mappings could not be loaded',
              error
            );
          }
        }
        const linkedRefs = result.items.flatMap((item: MappingItem) => [
          ...(item.matchedProductId
            ? [{ productId: item.matchedProductId, variationId: item.matchedVariationId }]
            : []),
          ...(item.compositionLinks || []).map((link: CompositionLink) => ({
            productId: link.productId,
            variationId: link.variationId,
          })),
          ...(mappings.has(item.productCode.trim().toLocaleUpperCase('pt-BR'))
            ? [mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'))]
            : []),
        ]);
        try {
          const productDetails = await stockService.fetchInboundInvoiceProductDetails(linkedRefs);
          result.items = result.items.map((item: MappingItem) => {
            const knownMapping = mappings.get(item.productCode.trim().toLocaleUpperCase('pt-BR'));
            const itemReference = item.matchedProductId
              ? productDetails.get(`${item.matchedProductId}:${item.matchedVariationId || ''}`)
              : undefined;
            const savedMapping =
              knownMapping &&
              productDetails.get(`${knownMapping.productId}:${knownMapping.variationId || ''}`);
            const compositionLinks = (item.compositionLinks || []).map((link: CompositionLink) => ({
              ...link,
              ...(productDetails.get(`${link.productId}:${link.variationId || ''}`) || {}),
            }));
            if (itemReference || savedMapping || (!item.matchedProductId && knownMapping)) {
              const detail = itemReference || savedMapping || knownMapping;
              return {
                ...item,
                ...(item.matchedProductId
                  ? {}
                  : { matchedProductId: detail.productId, matchedVariationId: detail.variationId }),
                productErpName: detail.name || item.productErpName,
                linkedProductCode: detail.sku || item.linkedProductCode,
                sellingPrice: detail.sellingPrice ?? item.sellingPrice,
                compositionLinks,
              };
            }
            return { ...item, compositionLinks };
          });
        } catch (error) {
          console.warn(
            '[InboundInvoiceMappings] linked product details could not be loaded',
            error
          );
        }
        if (!active) return;
        setDetails(result);
        setItems(result.items);
        setSupplierId(result.supplier_id || '');
        setSuppliers(result.supplier ? [result.supplier as Supplier] : []);
      })
      .catch((error: any) =>
        setErrorMessage(error?.message || 'Não foi possível carregar os dados da nota.')
      )
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, invoice?.id]);

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
    if (!registrationOptionsVisible || parentSearch.trim().length < 2) {
      setParentResults([]);
      setParentSearchError('');
      setParentSearchLoading(false);
      return;
    }
    let active = true;
    const timer = setTimeout(() => {
      setParentSearchLoading(true);
      setParentResults([]);
      void stockService
        .searchInboundInvoiceProductParents(parentSearch)
        .then((rows) => {
          if (active) {
            setParentResults(rows);
            setParentSearchError('');
          }
        })
        .catch((error) => {
          console.warn('[InboundInvoiceMappings] parent product search failed', error);
          if (active) {
            setParentResults([]);
            setParentSearchError('Não foi possível buscar produtos-pai. Tente novamente.');
          }
        })
        .finally(() => {
          if (active) setParentSearchLoading(false);
        });
    }, 250);
    return () => {
      active = false;
      clearTimeout(timer);
    };
  }, [registrationOptionsVisible, parentSearch]);

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

  useEffect(() => {
    const unresolved = items.filter(
      (item) => !item.matchedProductId && !item.compositionLinks?.length
    );
    if (!visible || !supplierId || unresolved.length === 0) {
      setSuggestionsLoading(false);
      setSuggestions({});
      return;
    }

    const runKey = `${supplierId}:${JSON.stringify(unresolved.map((item) => [item.itemNumber, item.productCode, item.productDescription]))}`;
    if (suggestionRunKey.current === runKey) return;
    suggestionRunKey.current = runKey;
    setSuggestionsLoading(true);
    setSuggestionsError('');
    setDismissedSuggestions({});
    const cached = suggestionCache.current.get(supplierId);
    const catalogPromise = cached || stockService.fetchInboundInvoiceSupplierCatalog(supplierId);
    if (!cached) suggestionCache.current.set(supplierId, catalogPromise);
    let active = true;
    void catalogPromise
      .then((catalog) => {
        if (!active) return;
        const context = createInboundScorerContext(catalog as InboundScorerProduct[]);
        const ranked: Record<number, ProductSuggestion[]> = {};
        unresolved.forEach((item) => {
          ranked[item.itemNumber] = rankInboundSuggestions(
            item.productDescription || '',
            item.productCode,
            context
          );
        });
        setSuggestions(ranked);
      })
      .catch((error) => {
        suggestionCache.current.delete(supplierId);
        if (active) setSuggestionsError(error?.message || 'Falha na consulta do catálogo.');
        console.warn('[InboundInvoiceMappings] deterministic suggestions failed', error);
      })
      .finally(() => {
        if (active) setSuggestionsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [visible, supplierId, items, suggestionRetryVersion]);

  const persist = async (nextItems: MappingItem[], nextSupplierId = supplierId) => {
    if (!details) return false;
    const saved = await mappingForm.validateAndRun(
      { invoiceId: String(details.id), supplierId: nextSupplierId, items: nextItems },
      async (values) => {
        setSaving(true);
        setErrorMessage('');
        try {
          await stockService.updateInboundInvoiceMappings(
            values.invoiceId,
            values.supplierId || null,
            values.items
          );
          setItems(values.items);
          setSupplierId(values.supplierId);
          onSaved();
          return true;
        } catch (error: any) {
          setErrorMessage(error?.message || 'Não foi possível salvar os vínculos.');
          return false;
        } finally {
          setSaving(false);
        }
      },
      (errors) => setErrorMessage(Object.values(flattenFormErrors(errors))[0])
    );
    return saved || false;
  };

  const chooseSupplier = async (supplier: Supplier) => {
    const cleared = items.map((item) => ({
      ...item,
      matchedProductId: undefined,
      matchedVariationId: undefined,
      productErpName: undefined,
      linkedProductCode: undefined,
      sellingPrice: undefined,
      compositionLinks: [],
      linkMode: 'single' as const,
    }));
    if (await persist(cleared, supplier.id)) {
      setSupplierSearch('');
      setSuppliers([supplier]);
      return true;
    }
    return false;
  };

  const createSupplier = async (supplierData: any) => {
    const created = await stockService.saveSupplier(supplierData);
    if (!created?.id) throw new Error('O fornecedor foi salvo sem retornar um identificador.');
    if (!(await chooseSupplier(created as Supplier)))
      throw new Error('Fornecedor criado, mas não foi possível vinculá-lo à NF-e.');
    setSupplierFormVisible(false);
  };

  const linkProduct = async (item: MappingItem, product: Product) => {
    const nextItems = items.map((current) => {
      if (current.itemNumber !== item.itemNumber) return current;
      if (current.linkMode === 'composition') {
        const links: CompositionLink[] = current.compositionLinks || [];
        if (
          links.some(
            (link) =>
              link.productId === product.productId && link.variationId === product.variationId
          )
        )
          return current;
        return {
          ...current,
          compositionLinks: [
            ...links,
            {
              id: `${Date.now()}-${product.id}`,
              productId: product.productId,
              variationId: product.variationId,
              productErpName: product.name,
              linkedProductCode: product.sku || '',
              sellingPrice: Number(product.sellingPrice || 0),
              quantityMultiplier: 1,
            },
          ],
        };
      }
      return {
        ...current,
        matchedProductId: product.productId,
        matchedVariationId: product.variationId,
        productErpName: product.name,
        linkedProductCode: product.sku || '',
        sellingPrice: Number(product.sellingPrice || 0),
      };
    });
    if (await persist(nextItems)) {
      if (item.linkMode !== 'composition') {
        try {
          await stockService.saveInboundSupplierProductCode(
            supplierId,
            item.productCode,
            product.productId,
            item.productDescription,
            product.variationId
          );
        } catch (error) {
          setErrorMessage(
            `Vínculo salvo, mas não foi possível memorizar o código ${item.productCode} para este fornecedor. Tente vincular novamente.`
          );
          console.warn('[InboundInvoiceMappings] supplier product code could not be saved', error);
        }
      }
      setQueries((current) => ({ ...current, [item.itemNumber]: '' }));
      return true;
    }
    return false;
  };

  const openQuickRegister = (item: MappingItem) => {
    setRegistrationItem(item);
    setRegistrationOptionsVisible(true);
    setParentSearch('');
    setRegistrationParent(null);
    setRegistrationDefaults({
      name: item.productDescription?.trim() || '',
      description: item.additionalDescription || '',
      itemType: 'product',
      mainSupplierId: supplierId,
      costPrice: String(landedUnitCost(item)),
      unitPrice: '',
      stock: '0',
      hasVariations: false,
      variations: [],
    });
  };

  const startNewProductRegistration = () => {
    setRegistrationParent(null);
    setRegistrationOptionsVisible(false);
    setRegistrationFormVisible(true);
  };

  const startVariationRegistration = (parent: any) => {
    setRegistrationParent({ ...parent, allVariations: parent.product_variations || [] });
    setRegistrationDefaults(undefined);
    setRegistrationOptionsVisible(false);
    setRegistrationFormVisible(true);
  };

  const saveQuickRegisteredProduct = async (productData: any) => {
    if (!registrationItem) return;
    if (
      registrationParent &&
      (productData.variations || []).length <= (registrationParent.allVariations || []).length
    ) {
      throw new Error(
        'Adicione uma nova variação na aba Variações antes de salvar o produto existente.'
      );
    }
    const productId = await saveMobileProduct(productData);
    if (!productId)
      throw new Error('Produto salvo sem identificador; atualize a busca para vinculá-lo.');
    const newVariationName = productData.variations?.[productData.variations.length - 1]?.name;
    const createdProduct = await stockService.getInboundInvoiceProductById(
      String(productId),
      newVariationName
    );
    const linked = await linkProduct(registrationItem, createdProduct);
    if (!linked)
      throw new Error(
        'Produto cadastrado, mas não foi possível concluir o vínculo com a NF-e. Ele continua disponível na busca de produtos.'
      );
    setRegistrationItem(null);
    setRegistrationDefaults(undefined);
    setRegistrationParent(null);
    setRegistrationFormVisible(false);
    return String(productId);
  };

  const toggleLinkMode = async (item: MappingItem, mode: 'single' | 'composition') => {
    if (item.linkMode === mode) return;
    if (mode === 'composition') {
      const links: CompositionLink[] = item.compositionLinks || [];
      const migrated =
        item.matchedProductId && !links.some((link) => link.productId === item.matchedProductId)
          ? [
              {
                id: `${Date.now()}-${item.matchedProductId}`,
                productId: item.matchedProductId,
                variationId: item.matchedVariationId,
                productErpName: item.productErpName || 'Produto vinculado',
                linkedProductCode: item.linkedProductCode || '',
                sellingPrice: amount(item.sellingPrice),
                quantityMultiplier: 1,
              },
              ...links,
            ]
          : links;
      await persist(
        items.map((current) =>
          current.itemNumber === item.itemNumber
            ? { ...current, linkMode: mode, compositionLinks: migrated }
            : current
        )
      );
      return;
    }

    const links: CompositionLink[] = item.compositionLinks || [];
    if (links.length > 1) {
      setErrorMessage(
        'Remova produtos da composição até restar apenas um para voltar ao modo Único.'
      );
      return;
    }
    const first = links[0];
    await persist(
      items.map((current) =>
        current.itemNumber === item.itemNumber
          ? {
              ...current,
              linkMode: mode,
              compositionLinks: [],
              matchedProductId: first?.productId || current.matchedProductId,
              matchedVariationId: first?.variationId || current.matchedVariationId,
              productErpName: first?.productErpName || current.productErpName,
              linkedProductCode: first?.linkedProductCode || current.linkedProductCode,
              sellingPrice: first?.sellingPrice || current.sellingPrice,
            }
          : current
      )
    );
  };

  const removeCompositionLink = async (item: MappingItem, linkId: string) => {
    const nextItems = items.map((current) =>
      current.itemNumber === item.itemNumber
        ? {
            ...current,
            compositionLinks: (current.compositionLinks || []).filter(
              (link: CompositionLink) => link.id !== linkId
            ),
          }
        : current
    );
    await persist(nextItems);
  };

  const saveCompositionMultiplier = async (
    item: MappingItem,
    linkId: string,
    rawValue: string
  ) => {
    const parsed = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErrorMessage('A quantidade na composição precisa ser maior que zero.');
      return;
    }
    const nextItems = items.map((current) =>
      current.itemNumber === item.itemNumber
        ? {
            ...current,
            compositionLinks: (current.compositionLinks || []).map((link: CompositionLink) =>
              link.id === linkId ? { ...link, quantityMultiplier: parsed } : link
            ),
          }
        : current
    );
    await persist(nextItems);
  };

  const removeLink = async (item: MappingItem) => {
    try {
      await stockService.deleteInboundSupplierProductCode(supplierId, item.productCode);
    } catch (error) {
      setErrorMessage(
        'Não foi possível remover a memória do código do fornecedor. O vínculo permanece intacto. Tente novamente.'
      );
      console.warn('[InboundInvoiceMappings] supplier product code could not be removed', error);
      return;
    }
    const nextItems = items.map((current) =>
      current.itemNumber === item.itemNumber
        ? {
            ...current,
            matchedProductId: undefined,
            matchedVariationId: undefined,
            productErpName: undefined,
            linkedProductCode: undefined,
            sellingPrice: undefined,
            compositionLinks: [],
          }
        : current
    );
    await persist(nextItems);
  };

  const handleRetrySuggestions = () => {
    suggestionRunKey.current = '';
    setSuggestionRetryVersion((current) => current + 1);
  };

  return {
    details,
    items,
    supplierId,
    setSupplierId,
    supplierSearch,
    setSupplierSearch,
    suppliers,
    supplierSearchError,
    supplierSearchLoading,
    queries,
    setQueries,
    products,
    productSearchLoading,
    productSearchErrors,
    suggestions,
    dismissedSuggestions,
    setDismissedSuggestions,
    suggestionsLoading,
    suggestionsError,
    loading,
    saving,
    errorMessage,
    setErrorMessage,
    expandedItems,
    setExpandedItems,
    supplierFormVisible,
    setSupplierFormVisible,
    registrationItem,
    setRegistrationItem,
    registrationDefaults,
    setRegistrationDefaults,
    registrationParent,
    setRegistrationParent,
    registrationFormVisible,
    setRegistrationFormVisible,
    registrationOptionsVisible,
    setRegistrationOptionsVisible,
    parentSearch,
    setParentSearch,
    parentResults,
    parentSearchError,
    parentSearchLoading,
    chooseSupplier,
    createSupplier,
    linkProduct,
    openQuickRegister,
    startNewProductRegistration,
    startVariationRegistration,
    saveQuickRegisteredProduct,
    toggleLinkMode,
    removeCompositionLink,
    saveCompositionMultiplier,
    removeLink,
    handleRetrySuggestions,
  };
};
