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
  const uncertainSupplierCodeOperation = useRef('');

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

  const searchState = useInboundMappingSearches({ visible, supplierId });
  const suggestionState = useInboundMappingSuggestions({ visible, supplierId, items });

  useEffect(() => {
    if (!visible || !invoice) return;
    let active = true;
    uncertainSupplierCodeOperation.current = '';
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

  type MappingValues = {
    invoiceId: string;
    supplierId: string;
    items: MappingItem[];
  };

  const saveValidatedMappings = async (values: MappingValues) => {
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
    const values = await validateMappings(nextItems, nextSupplierId);
    if (!values) return false;
    setSaving(true);
    setErrorMessage('');
    try {
      return await saveValidatedMappings(values);
    } finally {
      setSaving(false);
    }
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
    if (item.linkMode === 'composition') {
      const saved = await persist(nextItems);
      if (saved) searchState.setQueries((current) => ({ ...current, [item.itemNumber]: '' }));
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
      searchState.setQueries((current) => ({ ...current, [item.itemNumber]: '' }));
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
      setSaving(false);
    }
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
    if (uncertainSupplierCodeOperation.current) {
      setErrorMessage(uncertainSupplierCodeOperation.current);
      return false;
    }

    const nextItems = clearSingleItemLinkFromItems(items, item);
    const validatedMappings = await validateMappings(nextItems);
    if (!validatedMappings) return false;

    const link = await supplierCodeForm.validateAndRun(
      {
        itemNumber: item.itemNumber,
        productId: item.matchedProductId || '',
        variationId: item.matchedVariationId,
        supplierId,
        supplierProductCode: item.productCode,
        supplierDescription: item.productDescription,
      },
      (values) => values,
      (errors) =>
        setErrorMessage(
          Object.values(flattenFormErrors(errors))[0] ||
            'Confira o código do fornecedor e o vínculo.'
        )
    );
    if (!link) return false;

    setSaving(true);
    setErrorMessage('');
    try {
      const deleted = await withTimeout(
        stockService
          .deleteInboundSupplierProductCode(link.supplierId, link.supplierProductCode)
          .then(() => true),
        20_000,
        false,
        'entrada:remover-codigo-fornecedor'
      );
      if (!deleted) throw new Error('A remoção do código do fornecedor não foi confirmada no prazo.');

      const mappings = await withTimeout(
        stockService.findInboundSupplierProductCodes(link.supplierId, [link.supplierProductCode]),
        15_000,
        null,
        'entrada:confirmar-remocao-codigo-fornecedor'
      );
      if (
        !mappings ||
        mappings.has(link.supplierProductCode.trim().toLocaleUpperCase('pt-BR'))
      ) {
        throw new Error('A remoção da memória do código do fornecedor não foi confirmada.');
      }

      const savedInvoiceLink = await saveValidatedMappings(validatedMappings);
      if (!savedInvoiceLink) {
        uncertainSupplierCodeOperation.current =
          'A memória do código foi removida, mas a alteração da nota não foi confirmada. Feche e reabra Gerenciar vínculos para conferir antes de tentar novamente.';
        setErrorMessage(uncertainSupplierCodeOperation.current);
        return false;
      }
      return true;
    } catch (error: any) {
      uncertainSupplierCodeOperation.current =
        'Não foi possível confirmar a remoção da memória do código do fornecedor. Feche e reabra Gerenciar vínculos para conferir a nota antes de tentar novamente.';
      setErrorMessage(uncertainSupplierCodeOperation.current);
      console.warn(
        '[InboundInvoiceMappings] supplier product code removal could not be confirmed',
        error
      );
      return false;
    } finally {
      setSaving(false);
    }
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
