import { useEffect, useState } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../../../hooks/useZodForm';
import { mobileInboundMappingsFormSchema } from '../../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import * as stockService from '../../../../../../services/stockService';
import type { Invoice } from '../../../../types/stock.types';
import {
  applyProductLinkToMappingItems,
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
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [expandedItems, setExpandedItems] = useState<Record<number, boolean>>({});
  const [supplierFormVisible, setSupplierFormVisible] = useState(false);

  const mappingForm = useZodForm(mobileInboundMappingsFormSchema, {
    invoiceId: '',
    supplierId,
    items,
  });

  const searchState = useInboundMappingSearches({ visible, supplierId });
  const suggestionState = useInboundMappingSuggestions({ visible, supplierId, items });

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
        const linkedRefs = extractLinkedProductRefs(result.items, mappings);
        try {
          const productDetails = await stockService.fetchInboundInvoiceProductDetails(linkedRefs);
          result.items = hydrateMappingItemsWithDetails(result.items, mappings, productDetails);
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
        searchState.setSuppliers(result.supplier ? [result.supplier as Supplier] : []);
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
    const cleared = clearAllMappingItemLinks(items);
    if (await persist(cleared, supplier.id)) {
      searchState.setSupplierSearch('');
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
    const nextItems = applyProductLinkToMappingItems(items, item, product);
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
      searchState.setQueries((current) => ({ ...current, [item.itemNumber]: '' }));
      return true;
    }
    return false;
  };

  const registrationState = useInboundQuickRegistration({
    supplierId,
    linkProduct,
  });

  const toggleLinkMode = async (item: MappingItem, mode: 'single' | 'composition') => {
    if (item.linkMode === mode) return;
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
    await persist(removeCompositionLinkFromItems(items, item, linkId));
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
    await persist(updateCompositionMultiplierInItems(items, item, linkId, parsed));
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
    await persist(clearSingleItemLinkFromItems(items, item));
  };

  return {
    details,
    items,
    supplierId,
    setSupplierId,
    supplierSearch: searchState.supplierSearch,
    setSupplierSearch: searchState.setSupplierSearch,
    suppliers: searchState.suppliers,
    supplierSearchError: searchState.supplierSearchError,
    supplierSearchLoading: searchState.supplierSearchLoading,
    queries: searchState.queries,
    setQueries: searchState.setQueries,
    products: searchState.products,
    productSearchLoading: searchState.productSearchLoading,
    productSearchErrors: searchState.productSearchErrors,
    suggestions: suggestionState.suggestions,
    dismissedSuggestions: suggestionState.dismissedSuggestions,
    setDismissedSuggestions: suggestionState.setDismissedSuggestions,
    suggestionsLoading: suggestionState.suggestionsLoading,
    suggestionsError: suggestionState.suggestionsError,
    loading,
    saving,
    errorMessage,
    setErrorMessage,
    expandedItems,
    setExpandedItems,
    supplierFormVisible,
    setSupplierFormVisible,
    ...registrationState,
    chooseSupplier,
    createSupplier,
    linkProduct,
    toggleLinkMode,
    removeCompositionLink,
    saveCompositionMultiplier,
    removeLink,
    handleRetrySuggestions: suggestionState.handleRetrySuggestions,
  };
};
