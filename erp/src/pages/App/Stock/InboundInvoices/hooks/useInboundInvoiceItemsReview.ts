import { useState, useRef, useEffect, useMemo } from 'react';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import type Person from '@/pages/types/person.type';
import type { InboundInvoiceItem } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import {
  findProductSupplierCodes,
  saveProductSupplierCode,
  deleteProductSupplierCode,
} from '@/pages/utils/productSupplierCodesService';
import { getFullProduct, saveVariation } from '@/pages/utils/productService';
import { fetchGroupsAndCategories } from '@/pages/utils/categoryService';
import { resolveAutoCategory } from '@/pages/utils/categoryResolutionService';
import { aiService } from '@/pages/utils/aiService';
import {
  fetchSupplierProductsForContext,
  buildSupplierContextSummary,
  type SupplierProductSummary,
} from '@/pages/utils/inboundNfe/inboundSupplierProductContext';
import { itemCostWithAdditionalCosts } from '@/pages/utils/inboundNfe/inboundItemCosts';
import { useInboundInvoiceProductCreation } from './useInboundInvoiceProductCreation';
import {
  resolveLinkedProductDetails,
  enrichInboundItemsWithProductDetails,
  isGenericOrEmptyProductName,
} from '@/pages/utils/inboundNfe/inboundItemProductResolver';
import {
  useInboundInvoiceSuggestions,
  type InboundSuggestion,
} from './useInboundInvoiceSuggestions';
import { useInboundInvoiceQuickRegister } from './useInboundInvoiceQuickRegister';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createInboundProductPreparationSchema, createInboundCreatedProductLinkSchema } from '../../../../../../../shared-utils/inboundProductLinkFormSchemas';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import {
  useInboundInvoiceClassification,
  type AiClassification,
} from './useInboundInvoiceClassification';

export interface UseInboundInvoiceItemsReviewParams {
  contextKey?: string;
  items: InboundInvoiceItem[];
  supplierId?: string;
  suppliers: Person[];
  onChange: (itemNumber: number, update: Partial<InboundInvoiceItem>) => void | boolean | Promise<void | boolean>;
  onProcessingSuggestionsChange?: (processing: boolean) => void;
  suggestionsEnabled?: boolean;
}

/** Sugestões de vínculos determinísticas (sem IA, execução 100% local) */
export const INBOUND_SUGGESTIONS_FEATURE_ENABLED = true;

export function useInboundInvoiceItemsReview({
  contextKey,
  items,
  supplierId,
  suppliers,
  onChange,
  onProcessingSuggestionsChange,
  suggestionsEnabled = true,
}: UseInboundInvoiceItemsReviewParams) {
  const isSuggestionsActuallyEnabled =
    INBOUND_SUGGESTIONS_FEATURE_ENABLED && Boolean(supplierId?.trim()) && suggestionsEnabled;
  const {
    suggestionFor,
    rejectSuggestion,
    isProcessingSuggestions,
    isItemProcessing,
    retrySuggestions,
  } = useInboundInvoiceSuggestions({
    items,
    supplierId,
    enabled: isSuggestionsActuallyEnabled,
  });

  const [acceptingSuggestion, setAcceptingSuggestion] = useState<number | null>(null);
  const [removingLink, setRemovingLink] = useState<number | null>(null);
  const removalInProgress = useRef(false);
  const [linkError, setLinkError] = useState('');
  const [linkBusy, setLinkBusy] = useState(false);
  const uncertainOperation = useRef('');
  const linkSourceKey = JSON.stringify([supplierId, items]);
  const currentLinkContext = useRef({ supplierId, items, key: linkSourceKey });
  if (currentLinkContext.current.key !== linkSourceKey) currentLinkContext.current = { supplierId, items, key: linkSourceKey };
  const [individualBusy, setIndividualBusy] = useState(false);
  const [individualError, setIndividualError] = useState('');
  const individualInFlight = useRef(false), individualActive = useRef(true);
  useEffect(() => { individualActive.current = true; return () => { individualActive.current = false; }; }, []);



  // Auto-enriquece itens que possuem matchedProductId mas ainda estão sem código ou com nome genérico
  useEffect(() => {
    let active = true;
    const needsEnrichment = items.some(
      (item) =>
        item.matchedProductId &&
        (!item.linkedProductCode || isGenericOrEmptyProductName(item.productErpName))
    );
    if (!needsEnrichment) return;

    void enrichInboundItemsWithProductDetails(items).then((enriched) => {
      if (!active) return;
      enriched.forEach((item) => {
        const current = items.find((i) => i.itemNumber === item.itemNumber);
        if (
          current &&
          (current.linkedProductCode !== item.linkedProductCode ||
            current.productErpName !== item.productErpName)
        ) {
          onChange(item.itemNumber, {
            linkedProductCode: item.linkedProductCode,
            productErpName: item.productErpName,
          });
        }
      });
    });

    return () => {
      active = false;
    };
  }, [items, onChange]);

  const {
    quickRegisterTarget,
    setQuickRegisterTarget,
    handleQuickRegisterConfirm,
    handleReuseDuplicate,
    duplicateCandidate,
    nameMatches,
    isPreparingProduct,
    setIsPreparingProduct,
    creatingItemNumber,
    setCreatingItemNumber,
    creatingVariationId,
    setCreatingVariationId,
    editingParentProduct,
    setEditingParentProduct,
    initialProductData,
    setInitialProductData,
    isProductModalOpen,
    setIsProductModalOpen,
    suggestedCategory,
    setSuggestedCategory,
    editProduct,
    closeProductModal,
  } = useInboundInvoiceQuickRegister(supplierId, items, onChange, contextKey);

  const {
    isClassifying,
    aiClassification,
    setAiClassification,
    classifyingItem,
    setClassifyingItem,
    classifyWithAI,
    resetClassification,
  } = useInboundInvoiceClassification(supplierId);

  const [individualItem, setIndividualItem] = useState<InboundInvoiceItem | null>(null);
  const [individualMarkup, setIndividualMarkup] = useState('');
  const individualContext = useRef({ individualItem, supplierId, individualMarkup }); individualContext.current = { individualItem, supplierId, individualMarkup };
  const itemNumbers = items.map((item) => item.itemNumber);
  const individualForm = useZodForm(createInboundProductPreparationSchema(itemNumbers), {
    itemNumber: individualItem?.itemNumber || 0, supplierId: supplierId || '', markup: individualMarkup,
    finalCost: individualItem ? itemCostWithAdditionalCosts(individualItem) : 0, quantity: individualItem?.quantity || 0,
  });
  const selectionForm = useZodForm(createInboundCreatedProductLinkSchema(itemNumbers), {
    itemNumber: 0, productId: '', supplierId: '', supplierProductCode: '', supplierDescription: '',
  });

  const linkedCount = useMemo(
    () =>
      items.filter(
        (item) =>
          item.linkMode !== 'not_applicable' &&
          Boolean(item.matchedProductId || item.compositionLinks?.some((link) => link.productId))
      ).length,
    [items]
  );
  const notApplicableCount = useMemo(
    () => items.filter((item) => item.linkMode === 'not_applicable').length,
    [items]
  );
  const unlinkedItems = useMemo(
    () => items.filter((item) => item.linkMode !== 'not_applicable' && !item.matchedProductId && !item.compositionLinks?.some((link) => link.productId)),
    [items]
  );
  const creatingItem = useMemo(
    () => items.find((item) => item.itemNumber === creatingItemNumber),
    [items, creatingItemNumber]
  );
  const supplier = useMemo(
    () => suppliers.find((person) => person.id === supplierId),
    [suppliers, supplierId]
  );
  const effectiveMarkup = individualMarkup;
  const setEffectiveMarkup = setIndividualMarkup;

  const removeLink = async (item: InboundInvoiceItem) => {
    return executeLinkOperation('remove', item.itemNumber, item.matchedProductId || '', item.matchedVariationId);
  };

  const {
    preparationError,
    classificationBusy, classificationError,
    clearPreparationError,
    creationQueue,
    isSuggestingName,
    startCreation,
    classifyAndStart,
    confirmExistingVariationLink,
    confirmNewVariationInFamily,
    discardClassificationAndCreateNew,
    handleCreatedProductFromModal,
  } = useInboundInvoiceProductCreation({
    contextKey,
    items,
    supplierId,
    onChange,
    setCreatingItemNumber,
    setCreatingVariationId,
    setIsPreparingProduct,
    setSuggestedCategory,
    setInitialProductData,
    setIsProductModalOpen,
    creatingItemNumber,
    creatingVariationId,
    aiClassification,
    setAiClassification,
    classifyingItem,
    classifyWithAI,
    resetClassification,
    effectiveMarkup,
    setIndividualMarkup: setEffectiveMarkup,
  });

  useEffect(() => {
    onProcessingSuggestionsChange?.(acceptingSuggestion !== null || removingLink !== null || individualBusy || classificationBusy);
    return () => onProcessingSuggestionsChange?.(false);
  }, [acceptingSuggestion, removingLink, individualBusy, classificationBusy, onProcessingSuggestionsChange]);

  const requestIndividualCreation = (item: InboundInvoiceItem) => {
    if (individualInFlight.current) return;
    if (!supplierId)
      return toast.info('Vincule o fornecedor para identificar ou cadastrar os produtos.');
    setIndividualItem(item);
    setIndividualMarkup('');
    setIndividualError('');
    clearPreparationError();
  };

  const confirmIndividualCreation = async () => {
    if (!individualItem || individualInFlight.current || !individualActive.current) return;
    const item = individualItem;
    individualInFlight.current = true; setIndividualBusy(true); setIndividualError('');
    const isCurrent = () => individualActive.current && individualContext.current.individualItem === item
      && individualContext.current.supplierId === supplierId && individualContext.current.individualMarkup === individualMarkup;
    try {
      await individualForm.validateAndRun({ itemNumber: item.itemNumber, supplierId: supplierId || '', markup: individualMarkup, finalCost: itemCostWithAdditionalCosts(item), quantity: item.quantity }, async (values) => {
        if (!isCurrent()) return false;
        const confirmed = await classifyAndStart(item, [], values.markup === undefined ? undefined : String(values.markup), isCurrent);
        if (confirmed && isCurrent()) setIndividualItem(null);
        return confirmed;
      }, (errors) => { if (isCurrent()) setIndividualError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do produto.'); });
    } finally { individualInFlight.current = false; if (individualActive.current) setIndividualBusy(false); }
  };

  const executeLinkOperation = async (operation: 'select' | 'remove', itemNumber: number, productId: string, variationId?: string) => {
    if (removalInProgress.current) return false;
    if (uncertainOperation.current) { setLinkError(uncertainOperation.current); return false; }
    removalInProgress.current = true;
    setLinkBusy(true); setLinkError('');
    if (operation === 'remove') setRemovingLink(itemNumber); else setAcceptingSuggestion(itemNumber);
    const item = items.find((candidate) => candidate.itemNumber === itemNumber);
    const submittedContext = currentLinkContext.current;
    const itemSnapshot = JSON.stringify(item);
    let expired = false, writing = false;
    const assertCurrent = () => {
      if (expired || !individualActive.current || currentLinkContext.current !== submittedContext ||
        JSON.stringify(currentLinkContext.current.items.find((candidate) => candidate.itemNumber === itemNumber)) !== itemSnapshot) {
        throw new Error('O item ou fornecedor mudou. Confira os vínculos antes de continuar.');
      }
    };
    try {
      return Boolean(await selectionForm.validateAndRun({ itemNumber, productId, variationId, supplierId: supplierId || '',
        supplierProductCode: item?.productCode || '', supplierDescription: item?.productDescription || '' }, async (data) => {
        assertCurrent();
        let linkedProductCode: string | undefined, productErpName: string | undefined;
        if (operation === 'select') {
          const product = await withTimeout(getFullProduct(data.productId), 15000, null, 'entrada:consultar-produto-vinculo');
          assertCurrent();
          const variation = data.variationId ? product?.variations?.find((candidate) => candidate.id === data.variationId) : undefined;
          if (!product || product.id !== data.productId || product.deleted || (data.variationId && !variation)) throw new Error('Produto ou variação indisponível. Pesquise novamente.');
          linkedProductCode = variation?.sku || product.code || '';
          productErpName = variation?.name || variation?.title || product.name || product.title || '';
          writing = true;
          const saved = await withTimeout(saveProductSupplierCode({ supplierId: data.supplierId, productId: data.productId, productVariationId: data.variationId,
            supplierProductCode: data.supplierProductCode, supplierDescription: data.supplierDescription }).then(() => true), 20000, false, 'entrada:salvar-vinculo-selecionado');
          assertCurrent(); if (!saved) throw new Error('Não foi possível confirmar o vínculo do fornecedor.');
        } else {
          writing = true;
          const deleted = await withTimeout(deleteProductSupplierCode(data.supplierId, data.supplierProductCode).then(() => true), 20000, false, 'entrada:remover-vinculo-fornecedor');
          assertCurrent(); if (!deleted) throw new Error('Não foi possível confirmar a remoção do vínculo.');
        }
        const mappings = await withTimeout(findProductSupplierCodes(data.supplierId, [data.supplierProductCode]), 15000, null, 'entrada:confirmar-vinculo-selecionado');
        assertCurrent();
        const confirmed = mappings?.get(data.supplierProductCode.toLocaleUpperCase('pt-BR'));
        if (!mappings || (operation === 'remove' ? Boolean(confirmed) : !confirmed || confirmed.productId !== data.productId || confirmed.productVariationId !== data.variationId)) {
          throw new Error('O resultado do vínculo não foi confirmado.');
        }
        const applied = await withTimeout(Promise.resolve(onChange(data.itemNumber, operation === 'remove' ? {
          matchedProductId: undefined, matchedVariationId: undefined, linkedProductCode: undefined, productErpName: undefined,
        } : { matchedProductId: data.productId, matchedVariationId: data.variationId, linkedProductCode, productErpName })).then((result) => result !== false), 20000, false, 'entrada:aplicar-mapeamento-item');
        if (!applied) throw new Error('A alteração do item da nota não foi confirmada.');
        if (!individualActive.current) return false;
        if (operation === 'remove' && item) rejectSuggestion(item);
        toast.success(operation === 'remove' ? 'Vínculo e associação do código do fornecedor removidos.' : `Item vinculado a "${productErpName}"`);
        return true;
      }, (errors) => setLinkError(Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do vínculo.')));
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Não foi possível confirmar o vínculo.';
      if (writing) uncertainOperation.current = `${message} Confira a nota antes de repetir.`;
      if (individualActive.current) { setLinkError(uncertainOperation.current || message); toast.error(uncertainOperation.current || message); }
      return false;
    } finally {
      expired = true; removalInProgress.current = false;
      if (individualActive.current) { setAcceptingSuggestion(null); setRemovingLink(null); setLinkBusy(false); }
    }
  };
  const selectProduct = (itemNumber: number, product: Product, variation?: Variation) => executeLinkOperation('select', itemNumber, product.id || '', variation?.id);
  const acceptSuggestion = (item: InboundInvoiceItem, suggestion: InboundSuggestion) => executeLinkOperation('select', item.itemNumber, suggestion.productId, suggestion.variationId);

  return {
    // Estatísticas e listas
    linkedCount,
    notApplicableCount,
    unlinkedItems,
    creatingItem,
    supplier,
    // Sugestões
    suggestionFor,
    rejectSuggestion,
    retrySuggestions,
    isProcessingSuggestions,
    acceptingSuggestion,
    acceptSuggestion,
    // Ações de produto
    selectProduct,
    removeLink,
    removingLink,
    linkBusy,
    linkError,
    requestIndividualCreation,
    // Estado individual
    individualItem,
    individualBusy,
    individualError: individualError || preparationError,
    cancelIndividualCreation: () => { if (!individualInFlight.current) setIndividualItem(null); },
    setIndividualItem,
    individualMarkup,
    setIndividualMarkup,
    confirmIndividualCreation,
    effectiveMarkup,
    setEffectiveMarkup,
    // Modais e IA
    classificationBusy, classificationError,
    isPreparingProduct,
    isClassifying,
    classifyingItem,
    aiClassification,
    confirmExistingVariationLink,
    confirmNewVariationInFamily,
    discardClassificationAndCreateNew,
    // Cadastro rápido
    quickRegisterTarget,
    setQuickRegisterTarget,
    handleQuickRegisterConfirm,
    handleReuseDuplicate,
    duplicateCandidate,
    nameMatches,
    // Modal completo de produto
    isProductModalOpen,
    editingParentProduct,
    initialProductData,
    closeProductModal,
    handleCreatedProductFromModal,
    editProduct,
  };
}
