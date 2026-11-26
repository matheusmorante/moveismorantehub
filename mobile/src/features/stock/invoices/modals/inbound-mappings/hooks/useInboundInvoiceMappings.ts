import { useEffect, useRef, useState } from 'react';
import { Alert } from 'react-native';
import { flattenFormErrors, useZodForm } from '../../../../../../hooks/useZodForm';
import {
  mobileInboundMappingsFormSchema,
} from '../../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import { withTimeout } from '../../../../../../../../shared-utils/core/withTimeout';
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
import { formatMoney } from '../inboundCostUtils';
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
  const [checkingSuggestionPrice, setCheckingSuggestionPrice] = useState(false);
  const [hasUncertainWrite, setHasUncertainWrite] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);
  const uncertainMappingOperation = useRef('');
  const savingInFlight = useRef(false);

  const mappingForm = useZodForm(mobileInboundMappingsFormSchema, {
    invoiceId: '',
    supplierId,
    items,
  });
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
        if (!salvadosOnly) {
          const linkedRefs = extractLinkedProductRefs(result.items);
          const productDetails = await withTimeout(
            stockService.fetchInboundInvoiceProductDetails(linkedRefs),
            15_000,
            null,
            'entrada:consultar-produtos-vinculados'
          );
          if (!productDetails) throw new Error('Não foi possível confirmar os produtos vinculados.');
          result.items = hydrateMappingItemsWithDetails(result.items, productDetails);
        }
        if (!active) return;
        setDetails(result);
        setItems(result.items);
        setSupplierId(result.supplier_id || '');
        setSupplierStockOrigins(resolvedOrigins);
        searchState.setSuppliers(result.supplier ? [result.supplier as Supplier] : []);
        searchState.setSupplierSearch(result.supplier?.full_name || '');
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

  const saveValidatedMappings = async (values: MappingValues, changedItemNumbers: number[]) => {
    if (uncertainMappingOperation.current) {
      setErrorMessage(uncertainMappingOperation.current);
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
            effectiveItems,
            changedItemNumbers
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

  const persist = async (
    nextItems: MappingItem[],
    nextSupplierId = supplierId,
    changedItemNumbers: number[] = []
  ) => {
    const uncertainMessage = uncertainMappingOperation.current;
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
      return await saveValidatedMappings(values, changedItemNumbers);
    } finally {
      savingInFlight.current = false;
      setSaving(false);
    }
  };

  const clearSupplier = async () => {
    if (details && ['recebida', 'received'].includes(String(details.status_recebimento || '').toLocaleLowerCase('pt-BR'))) {
      setErrorMessage('O fornecedor não pode ser alterado depois que a nota foi recebida.');
      return false;
    }
    if (isSalvadosSupplier) return false;
    const cleared = await persist(clearAllMappingItemLinks(items), '');
    if (cleared) setSupplierStockOrigins(undefined);
    return cleared;
  };

  const chooseSupplier = async (supplier: Supplier) => {
    if (details && ['recebida', 'received'].includes(String(details.status_recebimento || '').toLocaleLowerCase('pt-BR'))) {
      setErrorMessage('O fornecedor não pode ser alterado depois que a nota foi recebida.');
      return false;
    }
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

  const linkProduct = async (item: MappingItem, product: Product) => {
    if (isSalvadosSupplier) return false;
    const uncertainMessage = uncertainMappingOperation.current;
    if (savingInFlight.current) return false;
    if (uncertainMessage) {
      setErrorMessage(uncertainMessage);
      return false;
    }
    const nextItems = applyProductLinkToMappingItems(items, item, product);
    const saved = await persist(nextItems, supplierId, [item.itemNumber]);
    if (saved) searchState.setQueries(item.itemNumber, '');
    return saved;
  };

  const linkSuggestedProduct = async (item: MappingItem, suggestion: Product) => {
    if (isSalvadosSupplier || savingInFlight.current) return false;
    const uncertainMessage = uncertainMappingOperation.current;
    if (uncertainMessage) {
      setErrorMessage(uncertainMessage);
      return false;
    }
    if (!supplierId) {
      setErrorMessage('Confirme o fornecedor da nota antes de vincular a sugestão.');
      return false;
    }

    savingInFlight.current = true;
    setCheckingSuggestionPrice(true);
    setErrorMessage('');
    let waitingForPriceConfirmation = false;
    const releasePriceCheck = () => {
      savingInFlight.current = false;
      setCheckingSuggestionPrice(false);
    };

    try {
      const currentDetails = await withTimeout(
        stockService.fetchInboundInvoiceProductDetails(
          [{ productId: suggestion.productId, variationId: suggestion.variationId }],
          supplierId
        ),
        15_000,
        null,
        'entrada:confirmar-preco-da-sugestao'
      );
      if (!currentDetails) {
        throw new Error('Não foi possível confirmar o preço atual. Verifique a conexão e tente novamente.');
      }
      const current = currentDetails?.get(
        `${suggestion.productId}:${suggestion.variationId || ''}`
      );
      if (!current) {
        throw new Error(
          'O produto não está mais ativo ou vinculado a este fornecedor. Atualize a busca antes de vincular.'
        );
      }

      const refreshedProduct: Product = {
        ...suggestion,
        ...current,
        id: String(current.variationId || current.productId),
      };
      const referencePriceCents = Math.round(Number(suggestion.sellingPrice || 0) * 100);
      const currentPriceCents = Math.round(Number(refreshedProduct.sellingPrice || 0) * 100);
      if (referencePriceCents !== currentPriceCents) {
        Alert.alert(
          'Preço de venda atualizado',
          `${refreshedProduct.name}: o preço de referência era ${formatMoney(referencePriceCents / 100)} e agora é ${formatMoney(currentPriceCents / 100)}. Confirme para vincular com o valor atual.`,
          [
            { text: 'Cancelar', style: 'cancel', onPress: releasePriceCheck },
            {
              text: `Vincular por ${formatMoney(currentPriceCents / 100)}`,
              onPress: () => {
                releasePriceCheck();
                void linkProduct(item, refreshedProduct).catch((error: any) => {
                  setErrorMessage(error?.message || 'Não foi possível salvar o vínculo. Tente novamente.');
                });
              },
            },
          ],
          { cancelable: false }
        );
        waitingForPriceConfirmation = true;
        return false;
      }

      releasePriceCheck();
      return await linkProduct(item, refreshedProduct);
    } catch (error: any) {
      setErrorMessage(
        error?.message || 'Não foi possível confirmar o preço atual. Tente novamente antes de vincular.'
      );
      console.warn('[InboundInvoiceMappings] current suggestion price could not be confirmed', error);
      return false;
    } finally {
      if (!waitingForPriceConfirmation) releasePriceCheck();
    }
  };

  const registrationState = useInboundQuickRegistration({
    supplierId,
    linkProduct,
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
      await persist(buildNotApplicableItems(items, item), supplierId, [item.itemNumber]);
      return;
    }
    if (mode === 'composition') {
      await persist(buildCompositionMigratedItems(items, item), supplierId, [item.itemNumber]);
      return;
    }

    const links: CompositionLink[] = item.compositionLinks || [];
    if (links.length > 1) {
      setErrorMessage(
        'Remova produtos da composição até restar apenas um para voltar ao modo Único.'
      );
      return;
    }
    await persist(buildSingleModeItems(items, item, links[0]), supplierId, [item.itemNumber]);
  };

  const removeCompositionLink = async (item: MappingItem, linkId: string) => {
    if (isSalvadosSupplier) return;
    await persist(removeCompositionLinkFromItems(items, item, linkId), supplierId, [item.itemNumber]);
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
    await persist(updateCompositionMultiplierInItems(items, item, linkId, parsed), supplierId, [item.itemNumber]);
  };

  const removeLink = async (item: MappingItem) => {
    if (isSalvadosSupplier) return false;
    return persist(clearSingleItemLinkFromItems(items, item), supplierId, [item.itemNumber]);
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
    checkingSuggestionPrice,
    hasUncertainWrite: hasUncertainWrite || Boolean(uncertainMappingOperation.current),
    errorMessage,
    setErrorMessage,
    supplierFormVisible,
    setSupplierFormVisible,
    ...registrationState,
    chooseSupplier,
    clearSupplier,
    createSupplier,
    linkProduct,
    linkSuggestedProduct,
    toggleLinkMode,
    removeCompositionLink,
    saveCompositionMultiplier,
    removeLink,
    handleRetrySuggestions: suggestionState.handleRetrySuggestions,
  };
};
