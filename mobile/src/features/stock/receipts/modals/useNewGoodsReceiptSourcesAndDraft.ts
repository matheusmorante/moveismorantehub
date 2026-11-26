import type React from 'react';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import { validateNfeAccessKey } from '../../../../../../shared-utils/nfeAccessKeyValidation';
import { withTimeout } from '../../../../../../shared-utils/core/withTimeout';
import { supplierProvidesStockOrigin } from '../../../../../../shared-utils/productSupplierStockOrigin';
import { flattenFormErrors } from '../../../../hooks/useZodForm';
import { generateUUID } from '../../../../services/offline/offlineStorageService';
import { getLocalDateString } from '../../../../utils/orderUtils';
import { fetchMobileProductSuppliersWithStatus } from '../../../products/services/products/mobileSupplierService';
import type { MobilePurchase } from '../../purchases/mobilePurchaseService';
import type { Invoice } from '../../types/stock.types';
import {
  assertInvoiceAvailableForReceipt,
  fetchReceiptInvoiceIdByFiscalKey,
  saveMobileGoodsReceiptDraft,
} from '../../../../services/stock/stockReceiptsService';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { fetchInboundInvoiceForMappings } from '../../../../services/stock/invoices/inboundInvoiceMappingsService';
import {
  inboundReceiptOrigin,
  normalizeReceiptDraftItem,
  purchaseReceiptOrigin,
  type MobileReceiptItem,
  type ReceiptOrigin,
} from '../utils/receiptSource';
import type { RateioMode } from './ReceiptRateioField';
import {
  buildBaseGoodsReceiptPayload,
  type ValidatedGoodsReceiptFormValues,
} from './goodsReceiptPayloadBuilder';

export interface GoodsReceiptSupplierOption {
  id: string;
  name: string;
  full_name?: string | null;
  nickname?: string | null;
  social_name?: string | null;
  stock_origins?: string[] | null;
}

interface UseNewGoodsReceiptSourcesAndDraftParams {
  visible: boolean;
  stage: 'source' | 'invoice' | 'purchase' | 'form';
  setStage: React.Dispatch<React.SetStateAction<'source' | 'invoice' | 'purchase' | 'form'>>;
  initialInvoice: Invoice | null;
  receiptToResume: any | null;
  receiptToEdit: any | null;
  isEditingReceipt: boolean;
  hasDraftProgress: boolean;
  resumeSourceLoading: boolean;
  setResumeSourceLoading: React.Dispatch<React.SetStateAction<boolean>>;
  resumeSourceError: string;
  setResumeSourceError: React.Dispatch<React.SetStateAction<string>>;
  origin: ReceiptOrigin;
  setOrigin: React.Dispatch<React.SetStateAction<ReceiptOrigin>>;
  supplierId: string;
  setSupplierId: React.Dispatch<React.SetStateAction<string>>;
  suppliers: GoodsReceiptSupplierOption[];
  setSuppliers: React.Dispatch<React.SetStateAction<GoodsReceiptSupplierOption[]>>;
  suppliersLoaded: boolean;
  setSuppliersLoaded: React.Dispatch<React.SetStateAction<boolean>>;
  loadingSuppliers: boolean;
  setLoadingSuppliers: React.Dispatch<React.SetStateAction<boolean>>;
  setSupplierSearch: React.Dispatch<React.SetStateAction<string>>;
  setSupplierPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  setSupplierLoadError: React.Dispatch<React.SetStateAction<string>>;
  selectedSupplier?: GoodsReceiptSupplierOption;
  receiptDate: string;
  setReceiptDate: React.Dispatch<React.SetStateAction<string>>;
  setReceiptDatePickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  observation: string;
  setObservation: React.Dispatch<React.SetStateAction<string>>;
  items: MobileReceiptItem[];
  setItems: React.Dispatch<React.SetStateAction<MobileReceiptItem[]>>;
  attachments: any[];
  setAttachments: React.Dispatch<React.SetStateAction<any[]>>;
  nonFiscalFreightMode: RateioMode;
  setNonFiscalFreightMode: React.Dispatch<React.SetStateAction<RateioMode>>;
  nonFiscalFreightValue: number;
  setNonFiscalFreightInput: React.Dispatch<React.SetStateAction<string>>;
  nonFiscalOtherExpensesMode: RateioMode;
  setNonFiscalOtherExpensesMode: React.Dispatch<React.SetStateAction<RateioMode>>;
  nonFiscalOtherExpensesValue: number;
  setNonFiscalOtherExpensesInput: React.Dispatch<React.SetStateAction<string>>;
  setProductPickerOpen: React.Dispatch<React.SetStateAction<boolean>>;
  saving: boolean;
  formValues: ValidatedGoodsReceiptFormValues;
  validateDraft: (
    values: any,
    onValid: (validated: any) => Promise<boolean>,
    onInvalid: (errors: Record<string, any>) => void,
  ) => Promise<boolean>;
  defaultReceiptDateRef: React.MutableRefObject<string>;
  savingRef: React.MutableRefObject<boolean>;
  receiptIdRef: React.MutableRefObject<string>;
  receiptIndexRef: React.MutableRefObject<number | undefined>;
  activeDraftWriteRef: React.MutableRefObject<Promise<unknown>>;
  draftTimerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  draftSavedRef: React.MutableRefObject<boolean>;
  draftErrorShownRef: React.MutableRefObject<boolean>;
  persistDraftRef: React.MutableRefObject<(force?: boolean) => Promise<boolean>>;
  supplierLoadRequestRef: React.MutableRefObject<number>;
}

/** Gerencia persistência automática de rascunho e resolução de origens (nota fiscal, pedido e fornecedor). */
export function useNewGoodsReceiptSourcesAndDraft(
  params: UseNewGoodsReceiptSourcesAndDraftParams,
) {
  const {
    visible,
    stage,
    setStage,
    initialInvoice,
    receiptToResume,
    receiptToEdit,
    isEditingReceipt,
    hasDraftProgress,
    resumeSourceLoading,
    setResumeSourceLoading,
    resumeSourceError,
    setResumeSourceError,
    origin,
    setOrigin,
    supplierId,
    setSupplierId,
    suppliers,
    setSuppliers,
    suppliersLoaded,
    setSuppliersLoaded,
    loadingSuppliers,
    setLoadingSuppliers,
    setSupplierSearch,
    setSupplierPickerOpen,
    setSupplierLoadError,
    selectedSupplier,
    receiptDate,
    setReceiptDate,
    setReceiptDatePickerOpen,
    observation,
    setObservation,
    items,
    setItems,
    attachments,
    setAttachments,
    nonFiscalFreightMode,
    setNonFiscalFreightMode,
    nonFiscalFreightValue,
    setNonFiscalFreightInput,
    nonFiscalOtherExpensesMode,
    setNonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue,
    setNonFiscalOtherExpensesInput,
    setProductPickerOpen,
    saving,
    formValues,
    validateDraft,
    defaultReceiptDateRef,
    savingRef,
    receiptIdRef,
    receiptIndexRef,
    activeDraftWriteRef,
    draftTimerRef,
    draftSavedRef,
    draftErrorShownRef,
    persistDraftRef,
    supplierLoadRequestRef,
  } = params;

  const persistDraft = async (force = false): Promise<boolean> => {
    if (
      isEditingReceipt ||
      !visible ||
      stage !== 'form' ||
      !hasDraftProgress ||
      resumeSourceLoading
    ) {
      return !hasDraftProgress || !resumeSourceLoading;
    }
    if (savingRef.current && !force) return false;
    let validationMessage = '';
    const write = validateDraft(
      formValues,
      async (values) => {
        if (!connectivityService.connected) {
          throw new Error('Conecte-se à internet para salvar o rascunho do recebimento.');
        }
        const saved = await saveMobileGoodsReceiptDraft({
          ...buildBaseGoodsReceiptPayload({
            id: receiptIdRef.current || (receiptIdRef.current = generateUUID()),
            receiptIndex: receiptIndexRef.current,
            purchaseId: origin.purchaseId,
            values,
            supplierName: selectedSupplier?.name || origin.supplierName || 'Fornecedor',
          }),
          supplierId: values.supplierId || undefined,
        });
        receiptIndexRef.current = saved.receiptIndex ?? receiptIndexRef.current;
        draftSavedRef.current = true;
        return true;
      },
      (errors) => {
        validationMessage =
          Object.values(flattenFormErrors(errors))[0] || 'Confira os dados do recebimento.';
      },
    );
    const completedWrite = write.then((result) => {
      if (result === false) {
        throw new Error(validationMessage || 'Não foi possível validar o rascunho.');
      }
      return result;
    });
    activeDraftWriteRef.current = completedWrite.catch(() => undefined);
    try {
      await completedWrite;
      draftErrorShownRef.current = false;
      return true;
    } catch (error) {
      if (!force && !draftErrorShownRef.current) {
        Alert.alert(
          'Rascunho não salvo',
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar o rascunho. Tente novamente.',
        );
        draftErrorShownRef.current = true;
      }
      return false;
    }
  };
  persistDraftRef.current = persistDraft;

  useEffect(() => {
    supplierLoadRequestRef.current += 1;
    if (!visible) return;
    let active = true;
    const draft =
      receiptToEdit ||
      (receiptToResume?.is_draft === true || receiptToResume?.status === 'draft'
        ? receiptToResume
        : null);
    const defaultDate = getLocalDateString(new Date());
    defaultReceiptDateRef.current = defaultDate;
    const draftReceiptIndex = Number(draft?.receipt_index ?? draft?.receiptIndex);
    receiptIndexRef.current =
      Number.isInteger(draftReceiptIndex) && draftReceiptIndex > 0
        ? draftReceiptIndex
        : undefined;
    draftSavedRef.current = Boolean(draft && !isEditingReceipt);
    draftErrorShownRef.current = false;
    const normalizedDraftItems: MobileReceiptItem[] = Array.isArray(draft?.items)
      ? draft.items.map(normalizeReceiptDraftItem)
      : [];
    const restoredItems = draft?.fiscal_key
      ? normalizedDraftItems
      : normalizedDraftItems.map((item) => {
          const freightFiscalUnit = Number(
            item.freightFiscalUnit ??
              Math.max(0, Number(item.freightUnit || 0) - Number(item.freightNonFiscalUnit || 0)),
          );
          return {
            ...item,
            baseCost: item.baseCost,
            discountUnit: Number(
              item.discountFiscalUnit ??
                Math.max(
                  0,
                  Number(item.discountUnit || 0) - Number(item.discountNonFiscalUnit || 0),
                ),
            ),
            discountNonFiscalUnit: 0,
            freightFiscalUnit,
            freightNonFiscalUnit: 0,
            freightUnit: freightFiscalUnit,
          };
        });
    receiptIdRef.current = draft?.id || generateUUID();
    setStage(draft ? 'form' : 'source');
    setOrigin({
      kind: draft?.fiscal_key ? 'invoice' : draft?.purchase_id ? 'purchase' : 'manual',
      purchaseId: draft?.purchase_id || undefined,
      supplierId: draft?.supplier_id || undefined,
      supplierName: draft?.supplier_name || draft?.supplierName || undefined,
      invoiceNumber: draft?.invoice_number || undefined,
      invoiceDate: draft?.invoice_date ? String(draft.invoice_date).slice(0, 10) : undefined,
      fiscalKey: draft?.fiscal_key || undefined,
      ipiPercent: Number(draft?.ipi_percent || 0),
      freightPercent: Number(draft?.freight_percent || 0),
      fiscalIpi: Number(draft?.fiscal_ipi || 0),
      fiscalFreight: Number(draft?.fiscal_freight || 0),
      fiscalDiscount: Number(draft?.fiscal_discount || 0),
      fiscalOtherExpenses: Number(draft?.fiscal_other_expenses || 0),
      items: restoredItems,
    });
    setSupplierId(draft?.supplier_id || '');
    setSuppliers([]);
    setSupplierSearch('');
    setSupplierPickerOpen(false);
    setSupplierLoadError('');
    setResumeSourceError('');
    setSuppliersLoaded(false);
    setLoadingSuppliers(false);
    const selectedDate = draft?.received_at;
    const receivedAt = String(selectedDate || '');
    setReceiptDate(
      /^\d{4}-\d{2}-\d{2}$/.test(receivedAt)
        ? receivedAt
        : selectedDate
          ? getLocalDateString(new Date(selectedDate))
          : defaultDate,
    );
    setReceiptDatePickerOpen(false);
    setObservation(draft?.observation || '');
    const freightMode = draft?.non_fiscal_freight_mode ?? draft?.nonFiscalFreightMode;
    const otherExpensesMode =
      draft?.non_fiscal_other_expenses_mode ?? draft?.nonFiscalOtherExpensesMode;
    setNonFiscalFreightMode(freightMode === 'fixed' ? 'fixed' : 'percent');
    setNonFiscalFreightInput(
      String(Number(draft?.non_fiscal_freight_value ?? draft?.nonFiscalFreightValue ?? 0)),
    );
    setNonFiscalOtherExpensesMode(otherExpensesMode === 'fixed' ? 'fixed' : 'percent');
    setNonFiscalOtherExpensesInput(
      String(
        Number(
          draft?.non_fiscal_other_expenses_value ?? draft?.nonFiscalOtherExpensesValue ?? 0,
        ),
      ),
    );
    setAttachments(Array.isArray(draft?.attachments) ? draft.attachments : []);
    setItems(restoredItems);
    setProductPickerOpen(false);
    setResumeSourceLoading(Boolean(draft?.fiscal_key && !isEditingReceipt));
    if (draft?.fiscal_key && !isEditingReceipt) {
      void (async () => {
        try {
          const normalizedKey = String(draft.fiscal_key).replace(/\D/g, '');
          const invoiceId = await fetchReceiptInvoiceIdByFiscalKey(draft.fiscal_key);
          if (!invoiceId) {
            if (normalizedKey.length !== 44 || !validateNfeAccessKey(normalizedKey).valid) {
              throw new Error('A chave da NF-e do rascunho é inválida.');
            }
            return;
          }
          const invoiceData = await withTimeout<any | null>(
            fetchInboundInvoiceForMappings(invoiceId),
            15_000,
            null,
            'mobile:receipt-resume-invoice-source',
          );
          if (!invoiceData) throw new Error('A busca da nota demorou para carregar.');
          const completeOrigin = inboundReceiptOrigin(invoiceData);
          if (draft.supplier_id && completeOrigin.supplierId !== draft.supplier_id) {
            throw new Error('O fornecedor da nota não corresponde ao rascunho.');
          }
          await assertInvoiceAvailableForReceipt(draft.fiscal_key, draft.id);
          const remainingOrigin = completeOrigin;
          const usedSourceIndexes = new Set<number>();
          const itemsWithSource = restoredItems.map((item) => {
            const matches = remainingOrigin.items
              .map((sourceItem, index) => ({ sourceItem, index }))
              .filter(
                ({ sourceItem, index }) =>
                  !usedSourceIndexes.has(index) &&
                  sourceItem.productId === item.productId &&
                  (sourceItem.variationId || '') === (item.variationId || ''),
              );
            if (matches.length !== 1) {
              throw new Error('Não foi possível reconciliar os itens do rascunho com a nota.');
            }
            const { sourceItem, index } = matches[0];
            usedSourceIndexes.add(index);
            return {
              ...sourceItem,
              ...item,
              expectedQuantity: sourceItem.expectedQuantity,
            };
          });
          if (!itemsWithSource.length) {
            throw new Error('O rascunho não tem itens vinculados à nota para retomar.');
          }
          if (!active) return;
          setOrigin({
            ...remainingOrigin,
            purchaseId: draft.purchase_id || undefined,
          });
          setItems(itemsWithSource);
        } catch (error) {
          if (active) {
            setResumeSourceError(
              error instanceof Error
                ? `${error.message} Reabra o recebimento para conferir a origem.`
                : 'Não foi possível conferir a nota de origem. Reabra o recebimento.',
            );
          }
        } finally {
          if (active) setResumeSourceLoading(false);
        }
      })();
    }
    return () => {
      active = false;
    };
  }, [visible, receiptToResume?.id, receiptToEdit?.id]);

  useEffect(() => {
    if (
      !visible ||
      stage !== 'form' ||
      !hasDraftProgress ||
      resumeSourceLoading ||
      resumeSourceError ||
      savingRef.current
    ) {
      return;
    }
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    draftTimerRef.current = setTimeout(() => {
      void persistDraftRef.current();
    }, 500);
    return () => {
      if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    };
  }, [
    visible,
    stage,
    hasDraftProgress,
    supplierId,
    receiptDate,
    items,
    origin,
    observation,
    attachments,
    nonFiscalFreightMode,
    nonFiscalFreightValue,
    nonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue,
    resumeSourceLoading,
    resumeSourceError,
    saving,
  ]);

  const loadSupplierOptions = async (): Promise<GoodsReceiptSupplierOption[] | null> => {
    const requestId = ++supplierLoadRequestRef.current;
    setLoadingSuppliers(true);
    setSupplierLoadError('');
    try {
      const result = await fetchMobileProductSuppliersWithStatus();
      if (requestId !== supplierLoadRequestRef.current) return null;
      setSuppliersLoaded(result.ok);
      if (result.ok === false) {
        setSupplierLoadError(result.errorMessage);
        return null;
      }
      const options = result.suppliers.map((supplier) => ({
        ...supplier,
        name: supplier.nickname || supplier.full_name || supplier.social_name || 'Fornecedor',
      }));
      setSuppliers(options);
      setSupplierLoadError('');
      return options;
    } catch {
      if (requestId === supplierLoadRequestRef.current) {
        setSupplierLoadError('Não foi possível carregar os fornecedores. Tente novamente.');
      }
      return null;
    } finally {
      if (requestId === supplierLoadRequestRef.current) setLoadingSuppliers(false);
    }
  };

  const openSupplierPicker = async () => {
    if (loadingSuppliers) return;
    if (!suppliersLoaded && (await loadSupplierOptions()) === null) return;
    setSupplierPickerOpen(true);
  };

  const applyOrigin = (next: ReceiptOrigin) => {
    setOrigin(next);
    setSupplierId(next.supplierId || '');
    setItems(next.items.map((item) => ({ ...item })));
    if (next.kind === 'invoice') setSupplierLoadError('');
    setStage('form');
  };

  const selectPurchase = async (purchase: MobilePurchase) => {
    if (!purchase.supplierId) {
      Alert.alert('Pedido sem fornecedor', 'Vincule um fornecedor ao pedido antes de receber.');
      return;
    }
    let options: GoodsReceiptSupplierOption[];
    if (suppliersLoaded) {
      options = suppliers;
    } else {
      const result = await fetchMobileProductSuppliersWithStatus(purchase.supplierId);
      if (result.ok === false) {
        Alert.alert(
          'Fornecedores indisponíveis',
          'Não foi possível carregar os fornecedores. Tente novamente.',
        );
        return;
      }
      options = result.suppliers.map((supplier) => ({
        ...supplier,
        name: supplier.nickname || supplier.full_name || supplier.social_name || 'Fornecedor',
      }));
    }
    const supplier = options.find((item) => item.id === purchase.supplierId);
    if (!supplier) {
      Alert.alert(
        'Fornecedor indisponível',
        'Não foi possível conferir o fornecedor deste pedido. Tente novamente.',
      );
      return;
    }
    if (!supplierProvidesStockOrigin(supplier.stock_origins, 'normal')) {
      Alert.alert(
        'Fornecedor sem estoque normal',
        'Este fornecedor não gera recebimento de estoque normal.',
      );
      return;
    }
    applyOrigin(purchaseReceiptOrigin(purchase));
  };

  const loadInvoiceOrigin = async (invoiceId: string) => {
    const data = await withTimeout<any | null>(
      fetchInboundInvoiceForMappings(invoiceId),
      15_000,
      null,
      'mobile:receipt-invoice-source',
    );
    if (!data) throw new Error('A busca da nota demorou. Tente novamente.');
    const next = inboundReceiptOrigin(data);
    await assertInvoiceAvailableForReceipt(next.fiscalKey || '', receiptIdRef.current);
    return origin.purchaseId ? { ...next, purchaseId: origin.purchaseId } : next;
  };

  const selectInvoice = async (invoice: Invoice) => {
    applyOrigin(await loadInvoiceOrigin(invoice.id));
  };

  useEffect(() => {
    if (!visible || !initialInvoice?.id) return;
    let active = true;
    setStage('form');
    setResumeSourceError('');
    setResumeSourceLoading(true);
    void (async () => {
      try {
        const data = await withTimeout<any | null>(
          fetchInboundInvoiceForMappings(initialInvoice.id),
          15_000,
          null,
          'mobile:receipt-start-from-inbound-mappings',
        );
        if (!data) throw new Error('A busca da nota demorou. Tente novamente.');
        const next = inboundReceiptOrigin(data);
        await assertInvoiceAvailableForReceipt(next.fiscalKey || '', receiptIdRef.current);
        if (active) applyOrigin(next);
      } catch (error) {
        if (active) {
          setResumeSourceError(
            error instanceof Error
              ? error.message
              : 'Não foi possível abrir o recebimento. Tente novamente.',
          );
        }
      } finally {
        if (active) setResumeSourceLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [visible, initialInvoice?.id]);

  return {
    loadSupplierOptions,
    openSupplierPicker,
    applyOrigin,
    selectPurchase,
    loadInvoiceOrigin,
    selectInvoice,
  };
}
