import { useEffect, useRef, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../../../hooks/useZodForm';
import {
  createInboundCreatedProductLinkSchema,
  mobileInboundMappingsFormSchema,
} from '../../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/withTimeout';
import * as stockService from '../../../../../../services/stockService';
import type { Invoice } from '../../../../types/stock.types';
import {
  applyProductLinkToMappingItems,
  buildNotApplicableItems,
  buildCompositionMigratedItems,
  buildSingleModeItems,
  clearAllMappingItemLinks,
  clearSingleItemLinkFromItems,
  extractLinkedProductRefs,
  hydrateMappingItemsWithDetails,
  removeCompositionLinkFromItems,
  updateCompositionMultiplierInItems,
} from '../domain/inboundMappingItemRules';
import { useInboundMappingSearches } from './useInboundMappingSearches';
import { useInboundMappingSuggestions } from './useInboundMappingSuggestions';
import { useInboundQuickRegistration } from './useInboundQuickRegistration';
import type { CompositionLink, MappingItem, Product, Supplier } from '../types';
import { isSalvadosOnlySupplier } from '../../../../../../../../shared-utils/productSupplierStockOrigin';
import { markInboundInvoiceItemsNotApplicable } from '../../../../../../../../shared-utils/inboundInvoiceSupplierRules';

interface UseInboundInvoiceMappingsParams {
  invoice: Invoice | null;
  visible: boolean;
  onSaved: () => void | Promise<void>;
}

export const useInboundInvoiceMappings = ({
  invoice,
  visible,
  onSaved,
}: UseInboundInvoiceMappingsParams) => {
  const [details, setDetails] = useState<any>(null);
  const [items, setItems] = useState<MappingItem[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [supplierStockOrigins, setSupplierStockOrigins] = useState<string[] | undefined>();
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [loadRevision, setLoadRevision] = useState(0);
  const [saving, setSaving] = useState(false);
  const [hasUncertainWrite, setHasUncertainWrite] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const uncertainSupplierCodeOperation = useRef('');
  const uncertainMappingOperation = useRef('');
  const savingInFlight = useRef(false);

  const mappingForm = useZodForm(mobileInboundMappingsFormSchema, {
    invoiceId: '',
    supplierId,
    items,
  });
  const supplierCodeForm = useZodForm(
    createInboundCreatedProductLinkSchema(items.map((item) => item.itemNumber)),
    {
      itemNumber: 0,
      productId: '',
      supplierId: '',
      supplierProductCode: '',
      supplierDescription: '',
    }
  );

  const isSalvadosSupplier = isSalvadosOnlySupplier(supplierStockOrigins ?? invoice?.supplierStockOrigins);
  const searchState = useInboundMappingSearches({
    visible: visible && !isSalvadosSupplier,
    supplierId: isSalvadosSupplier ? '' : supplierId,
    items,
  });
  const suggestionState = useInboundMappingSuggestions({
    visible: visible && !isSalvadosSupplier,
    supplierId: isSalvadosSupplier ? '' : supplierId,
    items: isSalvadosSupplier ? [] : items,
  });

  useEffect(() => {
    if (!visible || !invoice) return;
    let active = true;
    uncertainSupplierCodeOperation.current = '';
    setLoadError('');
    setLoading(true);
    setErrorMessage('');
    setSupplierStockOrigins(invoice.supplierStockOrigins);
    setSupplierId('');
    setItems([]);
    setDetails(null);
    void (async () => {
      try {
        const result = await withTimeout(
          stockService.fetchInboundInvoiceForMappings(invoice.id),
          15_000,
          null,
          'entrada:consultar-nota-para-vinculos'
        );
        if (!result || String(result.id) !== String(invoice.id)) {
          throw new Error('Não foi possível confirmar a nota fiscal selecionada.');
        }
        if (!active) return;
        const resolvedOrigins = result.supplierStockOrigins ?? invoice.supplierStockOrigins;
        const salvadosOnly = isSalvadosOnlySupplier(resolvedOrigins);
        if (salvadosOnly) result.items = markInboundInvoiceItemsNotApplicable(result.items);
        let mappings = new Map<string, any>();
        if (!salvadosOnly && result.supplier_id && result.items.length) {
          const resolvedMappings = await withTimeout(
            stockService.findInboundSupplierProductCodes(
              result.supplier_id,
              result.items.map((item: MappingItem) => item.productCode)
            ),
            15_000,
            null,
            'entrada:consultar-memoria-de-vinculos'
          );
          if (!resolvedMappings) throw new Error('Não foi possível confirmar os vínculos existentes.');
          mappings = resolvedMappings;
        }
        if (!salvadosOnly) {
          const linkedRefs = extractLinkedProductRefs(result.items, mappings);
          const productDetails = await withTimeout(
            stockService.fetchInboundInvoiceProductDetails(linkedRefs),
            15_000,
            null,
            'entrada:consultar-produtos-vinculados'
          );
          if (!productDetails) throw new Error('Não foi possível confirmar os produtos vinculados.');
          result.items = hydrateMappingItemsWithDetails(result.items, mappings, productDetails);
        }
        if (!active) return;
        setDetails(result);
        setItems(result.items);
        setSupplierId(result.supplier_id || '');
        setSupplierStockOrigins(resolvedOrigins);
        searchState.setSuppliers(result.supplier ? [result.supplier as Supplier] : []);
        searchState.setSupplierSearch(result.supplier?.full_name || '');
        uncertainSupplierCodeOperation.current = '';
        uncertainMappingOperation.current = '';
        setHasUncertainWrite(false);
      } catch (error: any) {
        if (active) {
          const message = error?.message || 'Não foi possível carregar os dados da nota.';
          setLoadError(message);
          setErrorMessage('');
        }
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible, invoice?.id, loadRevision]);

  type MappingValues = {
    invoiceId: string;
    supplierId: string;
    items: MappingItem[];
  };

  const saveValidatedMappings = async (values: MappingValues) => {
    if (uncertainSupplierCodeOperation.current || uncertainMappingOperation.current) {
      setErrorMessage(
        uncertainSupplierCodeOperation.current || uncertainMappingOperation.current
      );
      return false;
    }
    const effectiveSupplierId = isSalvadosSupplier ? supplierId : values.supplierId;
    const effectiveItems = isSalvadosSupplier
      ? markInboundInvoiceItemsNotApplicable(values.items)
      : values.items;
    try {
      const persistedItems = await withTimeout(
        stockService
          .updateInboundInvoiceMappings(
            values.invoiceId,
            effectiveSupplierId || null,
            effectiveItems
          ),
        30_000,
        null,
        'entrada:salvar-mapeamentos'
      );
      if (!Array.isArray(persistedItems)) throw new Error('A gravação dos vínculos não foi confirmada no prazo.');
      setItems(persistedItems);
      setSupplierId(effectiveSupplierId);
      try {
        const refreshed = await withTimeout(
          Promise.resolve(onSaved()).then(() => true),
          15_000,
          false,
          'entrada:atualizar-lista'
        );
        if (!refreshed) setErrorMessage('Vínculos salvos. A atualização da lista demorou demais; recarregue a lista.');
      } catch {
        setErrorMessage('Vínculos salvos. Não foi possível atualizar a lista; recarregue a lista.');
      }
      return true;
    } catch (error: any) {
      const message = `${error?.message || 'Não foi possível salvar os vínculos.'} Confira a nota antes de repetir.`;
      uncertainMappingOperation.current = message;
      setHasUncertainWrite(true);
      setErrorMessage(message);
      try {
        await withTimeout(
          Promise.resolve(onSaved()).then(() => true),
          15_000,
          false,
          'entrada:atualizar-lista-incerta'
        );
      } catch {
        // A lista ainda pode ser atualizada quando a escrita da NF fica incerta.
      }
      return false;
    }
  };

  const validateMappings = async (nextItems: MappingItem[], nextSupplierId = supplierId) => {
    if (!details) return false;
    return mappingForm.validateAndRun(
      { invoiceId: String(details.id), supplierId: nextSupplierId, items: nextItems },
      (values) => values as MappingValues,
      (errors) =>
        setErrorMessage(Object.values(flattenFormErrors(errors))[0] || 'Confira os vínculos.')
    );
  };

  const persist = async (nextItems: MappingItem[], nextSupplierId = supplierId) => {
    const uncertainMessage = uncertainSupplierCodeOperation.current || uncertainMappingOperation.current;
    if (savingInFlight.current) return false;
    if (uncertainMessage) {
      setErrorMessage(uncertainMessage);
      return false;
    }
    const values = await validateMappings(nextItems, nextSupplierId);
    if (!values) return false;
    savingInFlight.current = true;
    setSaving(true);
    setErrorMessage('');
    try {
      return await saveValidatedMappings(values);
    } finally {
      savingInFlight.current = false;
      setSaving(false);
    }
  };

  const clearSupplier = async () => {
    if (isSalvadosSupplier) return false;
    const cleared = await persist(clearAllMappingItemLinks(items), '');
    if (cleared) setSupplierStockOrigins(undefined);
    return cleared;
  };

  const chooseSupplier = async (supplier: Supplier) => {
    if (isSalvadosSupplier) return false;
    const nextIsSalvadosSupplier = isSalvadosOnlySupplier(supplier.stock_origins);
    const cleared = nextIsSalvadosSupplier
      ? markInboundInvoiceItemsNotApplicable(items)
      : clearAllMappingItemLinks(items);
    if (await persist(cleared, supplier.id)) {
      setSupplierStockOrigins(supplier.stock_origins || undefined);
      searchState.clearProductSearches();
      searchState.setSupplierSearch(supplier.full_name);
      searchState.setSuppliers([supplier]);
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

  const linkProduct = async (
    item: MappingItem,
    product: Product,
    rememberSupplierCode = false
  ) => {
    if (isSalvadosSupplier) return false;
    const uncertainMessage = uncertainSupplierCodeOperation.current || uncertainMappingOperation.current;
    if (savingInFlight.current) return false;
    if (uncertainMessage) {
      setErrorMessage(uncertainMessage);
      return false;
    }
    const nextItems = applyProductLinkToMappingItems(items, item, product);
    if (item.linkMode === 'composition' || !rememberSupplierCode) {
      const saved = await persist(nextItems);
      if (saved) searchState.setQueries(item.itemNumber, '');
      return saved;
    }

    if (uncertainSupplierCodeOperation.current) {
      setErrorMessage(uncertainSupplierCodeOperation.current);
      return false;
    }

    const link = await supplierCodeForm.validateAndRun(
      {
        itemNumber: item.itemNumber,
        productId: product.productId,
        variationId: product.variationId,
        supplierId,
        supplierProductCode: item.productCode,
        supplierDescription: item.productDescription,
      },
      (values) => values,
      (errors) =>
        setErrorMessage(
          Object.values(flattenFormErrors(errors))[0] ||
            'Confira o código do fornecedor e o produto.'
        )
    );
    if (!link) return false;

    // Validate the invoice owner before writing the supplier-code memory.
    const validatedMappings = await validateMappings(nextItems);
    if (!validatedMappings) return false;

    savingInFlight.current = true;
    setSaving(true);
    setErrorMessage('');
    try {
      const savedCode = await withTimeout(
        stockService
          .saveInboundSupplierProductCode(
            link.supplierId,
            link.supplierProductCode,
            link.productId,
            link.supplierDescription,
            link.variationId
          )
          .then(() => true),
        20_000,
        false,
        'entrada:salvar-codigo-fornecedor'
      );
      if (!savedCode) {
        throw new Error('A gravação do código do fornecedor não foi confirmada no prazo.');
      }

      const mappings = await withTimeout(
        stockService.findInboundSupplierProductCodes(link.supplierId, [link.supplierProductCode]),
        15_000,
        null,
        'entrada:confirmar-codigo-fornecedor'
      );
      const confirmed = mappings?.get(
        link.supplierProductCode.trim().toLocaleUpperCase('pt-BR')
      );
      if (
        !confirmed ||
        confirmed.productId !== link.productId ||
        (confirmed.variationId || undefined) !== (link.variationId || undefined)
      ) {
        throw new Error('A memória do código do fornecedor não corresponde ao produto escolhido.');
      }

      const savedInvoiceLink = await saveValidatedMappings(validatedMappings);
      if (!savedInvoiceLink) {
        uncertainSupplierCodeOperation.current =
          'O código foi salvo, mas a alteração da nota não foi confirmada. Feche e reabra Gerenciar vínculos para conferir antes de tentar novamente.';
        setErrorMessage(uncertainSupplierCodeOperation.current);
        return false;
      }
      searchState.setQueries(item.itemNumber, '');
      return true;
    } catch (error: any) {
      uncertainSupplierCodeOperation.current =
        'Não foi possível confirmar a memória do código do fornecedor. Feche e reabra Gerenciar vínculos para conferir a nota antes de tentar novamente.';
      setErrorMessage(uncertainSupplierCodeOperation.current);
      console.warn(
        '[InboundInvoiceMappings] supplier product code could not be confirmed',
        error
      );
      return false;
    } finally {
      savingInFlight.current = false;
      setSaving(false);
    }
  };

  const registrationState = useInboundQuickRegistration({
    supplierId,
    linkProduct: (item, product) => linkProduct(item, product, true),
    retryProductSearch: searchState.retryProductSearch,
    setErrorMessage,
  });

  const toggleLinkMode = async (
    item: MappingItem,
    mode: 'single' | 'composition' | 'not_applicable'
  ) => {
    if (isSalvadosSupplier) return;
    if (item.linkMode === mode) return;
    if (mode === 'not_applicable') {
      await persist(buildNotApplicableItems(items, item));
      return;
    }
    if (mode === 'composition') {
      await persist(buildCompositionMigratedItems(items, item));
      return;
    }

    const links: CompositionLink[] = item.compositionLinks || [];
    if (links.length > 1) {
      setErrorMessage(
        'Remova produtos da composição até restar apenas um para voltar ao modo Único.'
      );
      return;
    }
    await persist(buildSingleModeItems(items, item, links[0]));
  };

  const removeCompositionLink = async (item: MappingItem, linkId: string) => {
    if (isSalvadosSupplier) return;
    await persist(removeCompositionLinkFromItems(items, item, linkId));
  };

  const saveCompositionMultiplier = async (
    item: MappingItem,
    linkId: string,
    rawValue: string
  ) => {
    if (isSalvadosSupplier) return;
    const parsed = Number(rawValue.replace(',', '.'));
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setErrorMessage('A quantidade na composição precisa ser maior que zero.');
      return;
    }
    await persist(updateCompositionMultiplierInItems(items, item, linkId, parsed));
  };

  const removeLink = async (item: MappingItem) => {
    if (isSalvadosSupplier) return false;
    return persist(clearSingleItemLinkFromItems(items, item));
  };

  const retryLoad = () => {
    setLoadError('');
    setErrorMessage('');
    setLoading(true);
    setLoadRevision((current) => current + 1);
  };

  return {
    details,
    items,
    supplierId,
    supplierStockOrigins,
    isSalvadosSupplier,
    setSupplierId,
    supplierSearch: searchState.supplierSearch,
    setSupplierSearch: searchState.setSupplierSearch,
    searchSuppliers: searchState.searchSuppliers,
    suppliers: searchState.suppliers,
    supplierSearchError: searchState.supplierSearchError,
    supplierSearchLoading: searchState.supplierSearchLoading,
    retrySupplierSearch: searchState.retrySupplierSearch,
    queries: searchState.queries,
    setQueries: searchState.setQueries,
    products: searchState.products,
    productSearchLoading: searchState.productSearchLoading,
    productSearchErrors: searchState.productSearchErrors,
    retryProductSearch: searchState.retryProductSearch,
    suggestions: suggestionState.suggestions,
    dismissedSuggestions: suggestionState.dismissedSuggestions,
    setDismissedSuggestions: suggestionState.setDismissedSuggestions,
    suggestionsLoading: suggestionState.suggestionsLoading,
    suggestionsError: suggestionState.suggestionsError,
    loading,
    loadError,
    retryLoad,
    saving,
    hasUncertainWrite: hasUncertainWrite || Boolean(uncertainSupplierCodeOperation.current || uncertainMappingOperation.current),
    errorMessage,
    setErrorMessage,
    supplierFormVisible,
    setSupplierFormVisible,
    ...registrationState,
    chooseSupplier,
    clearSupplier,
    createSupplier,
    linkProduct,
    toggleLinkMode,
    removeCompositionLink,
    saveCompositionMultiplier,
    removeLink,
    handleRetrySuggestions: suggestionState.handleRetrySuggestions,
  };
};
