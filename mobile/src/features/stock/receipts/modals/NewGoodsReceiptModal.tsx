import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { FormTextInput } from '../../../../components/shared/FormTextInput';
import { ReceiptRateioField, parseRateioInputValue } from './ReceiptRateioField';
import type { RateioMode } from './ReceiptRateioField';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft, CalendarDays, Check, LockKeyhole, X } from 'lucide-react-native';
import {
  mobileReceiptFormSchema,
  receiptDraftFormSchema,
} from '../../../../../../shared-utils/receiptFormSchemas';
import { validateNfeAccessKey } from '../../../../../../shared-utils/nfeAccessKeyValidation';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import { supplierProvidesStockOrigin } from '../../../../../../shared-utils/productSupplierStockOrigin';
import { matchesSearchText } from '../../../../../../shared-utils/searchText';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { generateUUID } from '../../../../services/offline/offlineStorageService';
import { getLocalDateString } from '../../../../utils/orderUtils';
import { fetchMobileProductSuppliersWithStatus } from '../../../products/services/mobileSupplierService';
import { searchInventoryScopeProducts } from '../../../../services/stockService';
import { InventoryProductSearchModal } from '../../inventory/components/InventoryProductSearchModal';
import type { SearchableProduct } from '../../inventory/components/InventoryProductSearchModal';
import { PurchaseItemsSection } from '../../purchases/modals/purchase-form/PurchaseItemsSection';
import { PurchaseAttachmentsSection } from '../../purchases/modals/purchase-form/PurchaseAttachmentsSection';
import { useMobilePurchaseAttachments } from '../../purchases/hooks/useMobilePurchaseAttachments';
import { PurchaseSupplierPickerModal } from '../../purchases/modals/purchase-form/PurchaseSupplierPickerModal';
import { TransactionDatePickerModal } from '../../../finance/components/transaction-date/TransactionDatePickerModal';
import type { MobilePurchase } from '../../purchases/mobilePurchaseService';
import type { Invoice } from '../../types/stock.types';
import {
  createMobileGoodsReceipt,
  editMobileGoodsReceipt,
  assertInvoiceAvailableForReceipt,
  fetchReceiptInvoiceIdByFiscalKey,
  saveMobileGoodsReceiptDraft,
} from '../../../../services/stock/stockReceiptsService';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { fetchInboundInvoiceForMappings } from '../../../../services/stock/invoices/inboundInvoiceMappingsService';
import { ReceiptSourceOptions, ReceiptSourcePicker } from './ReceiptSourcePicker';
import {
  calculateMobileReceiptItems,
  inboundReceiptOrigin,
  purchaseReceiptOrigin,
  receiptItemWithCosts,
  type MobileReceiptItem,
  type ReceiptOrigin,
} from '../utils/receiptSource';

interface SupplierOption {
  id: string;
  name: string;
  full_name?: string;
  nickname?: string;
  social_name?: string;
  stock_origins?: string[];
}

interface Props {
  visible: boolean;
  isDarkMode: boolean;
  initialInvoice?: Invoice | null;
  receiptToResume?: any | null;
  receiptToEdit?: any | null;
  onClose: () => void;
  onSaved: () => void;
  onManageInUseInvoice: (fiscalKey: string) => void | Promise<void>;
}

const normalizeReceiptDraftItem = (raw: any): MobileReceiptItem => {
  const snapshot = raw?.item_snapshot && typeof raw.item_snapshot === 'object'
    ? raw.item_snapshot
    : {};
  const quantity = Number(raw?.quantity ?? snapshot.quantity ?? 0);
  const baseCost = Number(raw?.base_cost ?? snapshot.baseCost ?? snapshot.unitCost ?? 0);
  const unitCost = Number(raw?.unit_cost ?? snapshot.unitCost ?? baseCost);
  const discountFiscalUnit = raw?.discount_fiscal_unit ?? snapshot.discountFiscalUnit;
  const freightFiscalUnit = raw?.freight_fiscal_unit ?? snapshot.freightFiscalUnit;
  return {
    ...snapshot,
    receiptItemId: raw?.id || snapshot.receiptItemId,
    productId: String(raw?.product_id || snapshot.productId || ''),
    variationId: raw?.variation_id || snapshot.variationId || undefined,
    description: String(raw?.description || snapshot.description || 'Produto'),
    quantity,
    baseCost,
    unitCost,
    totalCost: Number(snapshot.totalCost ?? (quantity * unitCost).toFixed(2)),
    ...(freightFiscalUnit == null ? {} : { freightFiscalUnit: Number(freightFiscalUnit) }),
    freightNonFiscalUnit: Number(raw?.freight_non_fiscal_unit ?? snapshot.freightNonFiscalUnit ?? 0),
    discountUnit: Number(raw?.discount_unit ?? snapshot.discountUnit ?? 0),
    ...(discountFiscalUnit == null ? {} : { discountFiscalUnit: Number(discountFiscalUnit) }),
    discountNonFiscalUnit: Number(
      raw?.discount_non_fiscal_unit ?? snapshot.discountNonFiscalUnit ?? 0,
    ),
    freightUnit: Number(raw?.freight_unit ?? snapshot.freightUnit ?? 0),
    otherExpensesFiscalUnit: Number(
      raw?.other_expenses_fiscal_unit ?? snapshot.otherExpensesFiscalUnit ?? 0,
    ),
    otherExpensesNonFiscalUnit: Number(
      raw?.other_expenses_non_fiscal_unit ?? snapshot.otherExpensesNonFiscalUnit ?? 0,
    ),
    additionalCostUnit: Number(raw?.additional_cost_unit ?? snapshot.additionalCostUnit ?? 0),
  };
};

export const NewGoodsReceiptModal: React.FC<Props> = ({
  visible,
  isDarkMode,
  initialInvoice = null,
  receiptToResume = null,
  receiptToEdit = null,
  onClose,
  onSaved,
  onManageInUseInvoice,
}) => {
  const isEditingReceipt = receiptToEdit?.status === 'received';
  const existingReceipt = receiptToEdit || receiptToResume;
  const insets = useSafeAreaInsets();
  const colors = {
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    surface: isDarkMode ? '#1e293b' : '#ffffff',
    border: isDarkMode ? '#334155' : '#e2e8f0',
    text: isDarkMode ? '#f8fafc' : '#0f172a',
    muted: isDarkMode ? '#94a3b8' : '#64748b',
  };
  const {
    attachments,
    setAttachments,
    isUploading: isUploadingAttachments,
    addAttachments,
    removeAttachment,
  } = useMobilePurchaseAttachments({ storageFolder: 'receipts', recordLabel: 'recebimento' });
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [supplierId, setSupplierId] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [supplierPickerOpen, setSupplierPickerOpen] = useState(false);
  const [showSupplierLockTooltip, setShowSupplierLockTooltip] = useState(false);
  const [supplierLoadError, setSupplierLoadError] = useState('');
  const [stage, setStage] = useState<'source' | 'invoice' | 'purchase' | 'form'>('source');
  const [origin, setOrigin] = useState<ReceiptOrigin>({
    kind: 'manual',
    items: [],
  });
  const [receiptDate, setReceiptDate] = useState(getLocalDateString(new Date()));
  const defaultReceiptDateRef = useRef(receiptDate);
  const [receiptDatePickerOpen, setReceiptDatePickerOpen] = useState(false);
  const formattedReceiptDate = receiptDate.split('-').reverse().join('/');
  const [observation, setObservation] = useState('');
  const [items, setItems] = useState<MobileReceiptItem[]>([]);
  const [nonFiscalFreightMode, setNonFiscalFreightMode] = useState<RateioMode>('percent');
  const [nonFiscalFreightInput, setNonFiscalFreightInput] = useState('0');
  const [nonFiscalOtherExpensesMode, setNonFiscalOtherExpensesMode] = useState<RateioMode>('percent');
  const [nonFiscalOtherExpensesInput, setNonFiscalOtherExpensesInput] = useState('0');
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resumeSourceLoading, setResumeSourceLoading] = useState(false);
  const [resumeSourceError, setResumeSourceError] = useState('');
  const savingRef = useRef(false);
  const receiptIdRef = useRef('');
  const receiptIndexRef = useRef<number | undefined>(undefined);
  const activeDraftWriteRef = useRef<Promise<unknown>>(Promise.resolve());
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const draftSavedRef = useRef(false);
  const draftErrorShownRef = useRef(false);
  const persistDraftRef = useRef<(force?: boolean) => Promise<boolean>>(async () => true);
  const supplierLoadRequestRef = useRef(0);
  const nonFiscalFreightValue = parseRateioInputValue(nonFiscalFreightInput);
  const nonFiscalOtherExpensesValue = parseRateioInputValue(nonFiscalOtherExpensesInput);
  const isInvoiceLinkedReceipt = origin.kind === 'invoice' || Boolean(origin.fiscalKey);
  const rateioBaseTotal = useMemo(
    () => Number(items.reduce(
      (total, item) => total + Number(item.baseCost ?? item.unitCost ?? 0) * Number(item.quantity || 0),
      0,
    ).toFixed(2)),
    [items],
  );
  const processedItems = useMemo(
    () => calculateMobileReceiptItems(
      isInvoiceLinkedReceipt
        ? items
        : items.map((item) => ({
            ...item,
            discountFiscalUnit: 0,
            discountNonFiscalUnit: 0,
            discountUnit: 0,
          })),
      {
        discountMode: 'percent',
        discountValue: 0,
        freightMode: nonFiscalFreightMode,
        freightValue: nonFiscalFreightValue,
        otherExpensesMode: nonFiscalOtherExpensesMode,
        otherExpensesValue: nonFiscalOtherExpensesValue,
      },
    ),
    [items, isInvoiceLinkedReceipt, nonFiscalFreightMode, nonFiscalFreightValue, nonFiscalOtherExpensesMode, nonFiscalOtherExpensesValue],
  );
  const totalValue = useMemo(
    () => Number(processedItems.reduce((total, item) => total + item.totalCost, 0).toFixed(2)),
    [processedItems],
  );

  const formValues = {
    supplierId,
    receiptDate,
    items: processedItems,
    totalValue,
    fiscalKey: origin.fiscalKey || '',
    ipiPercent: origin.ipiPercent || 0,
    freightPercent: origin.freightPercent || 0,
    invoiceNumber: origin.invoiceNumber || '',
    invoiceDate: origin.invoiceDate || '',
    attachments,
    observations: observation.trim() ? [observation.trim()] : [],
    nonFiscalDiscountMode: 'percent' as const,
    nonFiscalDiscountValue: 0,
    nonFiscalFreightMode,
    nonFiscalFreightValue,
    nonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue,
    fiscalIpi: origin.fiscalIpi || 0,
    fiscalFreight: origin.fiscalFreight || 0,
    fiscalDiscount: origin.fiscalDiscount || 0,
    fiscalOtherExpenses: origin.fiscalOtherExpenses || 0,
  };
  const { validateAndRun } = useZodForm(mobileReceiptFormSchema, formValues);
  const { enqueueAndRun: validateDraft } = useZodForm(receiptDraftFormSchema, formValues);
  const selectedSupplier = suppliers.find((supplier) => supplier.id === supplierId);
  const supplierSelected = Boolean(supplierId);
  const supplierLocked = !isEditingReceipt && origin.kind === 'manual' && supplierSelected && items.length > 0;
  const hasIncompleteItems = items.some((item) => !item.productId?.trim());
  const isExistingDraft = receiptToResume?.is_draft === true || receiptToResume?.status === 'draft';
  const hasDraftProgress = !isEditingReceipt && Boolean(
    isExistingDraft ||
      draftSavedRef.current ||
      supplierId ||
      items.length ||
      receiptDate !== defaultReceiptDateRef.current ||
      attachments.length > 0 ||
      observation.trim() ||
      nonFiscalFreightValue > 0 ||
      nonFiscalOtherExpensesValue > 0 ||
      origin.purchaseId ||
      origin.fiscalKey ||
      origin.invoiceNumber ||
      origin.invoiceDate,
  );

  useEffect(() => {
    if (!supplierLocked) setShowSupplierLockTooltip(false);
  }, [supplierLocked]);

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
          id: receiptIdRef.current || (receiptIdRef.current = generateUUID()),
          receiptIndex: receiptIndexRef.current,
          purchaseId: origin.purchaseId,
          supplierId: values.supplierId || undefined,
          supplierName: selectedSupplier?.name || origin.supplierName || 'Fornecedor',
          receivedAt: new Date(`${values.receiptDate}T12:00:00`).toISOString(),
          totalValue: values.totalValue,
          observation: values.observations.join('\n'),
          invoiceNumber: values.invoiceNumber,
          invoiceDate: values.invoiceDate,
          fiscalKey: values.fiscalKey,
          attachments: values.attachments,
          ipiPercent: values.ipiPercent,
          freightPercent: values.freightPercent,
          nonFiscalDiscountMode:
            values.nonFiscalDiscountMode,
          nonFiscalDiscountValue: values.nonFiscalDiscountValue,
          nonFiscalFreightMode:
            values.nonFiscalFreightMode,
          nonFiscalFreightValue: values.nonFiscalFreightValue,
          nonFiscalOtherExpensesMode: values.nonFiscalOtherExpensesMode,
          nonFiscalOtherExpensesValue: values.nonFiscalOtherExpensesValue,
          fiscalIpi: values.fiscalIpi,
          fiscalFreight: values.fiscalFreight,
          fiscalDiscount: values.fiscalDiscount,
          fiscalOtherExpenses: values.fiscalOtherExpenses,
          items: values.items,
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

  const filteredSuppliers = useMemo(() => {
    const query = supplierSearch.trim().toLocaleLowerCase('pt-BR');
    return suppliers.filter(
      (supplier) =>
        supplierProvidesStockOrigin(supplier.stock_origins, 'normal') &&
        matchesSearchText(supplier.name, query),
    );
  }, [supplierSearch, suppliers]);

  const searchReceiptProducts = useCallback(
    (query: string) => searchInventoryScopeProducts(query, supplierId || undefined),
    [supplierId],
  );

  useEffect(() => {
    supplierLoadRequestRef.current += 1;
    if (!visible) return;
    let active = true;
    const draft = receiptToEdit || (
      receiptToResume?.is_draft === true || receiptToResume?.status === 'draft'
        ? receiptToResume
        : null
    );
    const defaultDate = getLocalDateString(new Date());
    defaultReceiptDateRef.current = defaultDate;
    const draftReceiptIndex = Number(draft?.receipt_index ?? draft?.receiptIndex);
    receiptIndexRef.current =
      Number.isInteger(draftReceiptIndex) && draftReceiptIndex > 0
        ? draftReceiptIndex
        : undefined;
    draftSavedRef.current = Boolean(draft && !isEditingReceipt);
    draftErrorShownRef.current = false;
    const normalizedDraftItems = Array.isArray(draft?.items)
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
                Math.max(0, Number(item.discountUnit || 0) - Number(item.discountNonFiscalUnit || 0)),
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
    const otherExpensesMode = draft?.non_fiscal_other_expenses_mode ?? draft?.nonFiscalOtherExpensesMode;
    setNonFiscalFreightMode(freightMode === 'fixed' ? 'fixed' : 'percent');
    setNonFiscalFreightInput(String(Number(
      draft?.non_fiscal_freight_value ?? draft?.nonFiscalFreightValue ?? 0,
    )));
    setNonFiscalOtherExpensesMode(otherExpensesMode === 'fixed' ? 'fixed' : 'percent');
    setNonFiscalOtherExpensesInput(String(Number(
      draft?.non_fiscal_other_expenses_value ?? draft?.nonFiscalOtherExpensesValue ?? 0,
    )));
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
              .filter(({ sourceItem, index }) =>
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

  const loadSupplierOptions = async (): Promise<SupplierOption[] | null> => {
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
    const options = suppliersLoaded ? suppliers : await loadSupplierOptions();
    if (!options) {
      Alert.alert('Fornecedores indisponíveis', 'Não foi possível carregar os fornecedores. Tente novamente.');
      return;
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
            error instanceof Error ? error.message : 'Não foi possível abrir o recebimento. Tente novamente.',
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

  const addProduct = (product: SearchableProduct) => {
    setItems((current) => {
      const existingIndex = current.findIndex(
        (item) => item.productId === product.id && item.variationId === product.variation_id,
      );
      if (existingIndex >= 0) {
        return current.map((item, index) =>
          index === existingIndex
            ? receiptItemWithCosts({ ...item, quantity: item.quantity + 1 })
            : item,
        );
      }
      return [
        ...current,
        {
          productId: product.id,
          variationId: product.variation_id,
          description: product.name || product.description || 'Produto',
          quantity: 1,
          baseCost: 0,
          unitCost: 0,
          totalCost: 0,
          sku: product.sku || product.code || undefined,
        },
      ];
    });
  };

  const updateItem = (index: number, patch: Partial<MobileReceiptItem>) => {
    setItems((current) =>
      current.map((item, itemIndex) => {
        if (itemIndex !== index) return item;
        return receiptItemWithCosts({ ...item, ...patch });
      }),
    );
  };

  const handleConfirm = async () => {
    if (savingRef.current || resumeSourceLoading || resumeSourceError) return;
    savingRef.current = true;
    setSaving(true);
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    try {
      if (!isEditingReceipt && hasDraftProgress) await persistDraftRef.current(true);
      if (!isEditingReceipt) await activeDraftWriteRef.current;
      const saved = await validateAndRun<{
        invoiceUpdated: boolean;
        invoiceComplete: boolean;
        edited?: boolean;
      }>(
        formValues,
        async (values) => {
          if (!connectivityService.connected) {
            throw new Error(isEditingReceipt
              ? 'Conecte-se à internet para salvar a alteração do recebimento.'
              : 'Conecte-se à internet para confirmar o recebimento.');
          }
          if (isEditingReceipt && receiptToEdit) {
            const editedStatus = 'received' as const;
            await editMobileGoodsReceipt({
              id: receiptIdRef.current || receiptToEdit.id,
              receiptIndex: receiptIndexRef.current ?? (Number(receiptToEdit.receipt_index || 0) || undefined),
              purchaseId: origin.purchaseId,
              supplierId: values.supplierId,
              supplierName: selectedSupplier?.name || origin.supplierName || 'Fornecedor',
              receivedAt: new Date(`${values.receiptDate}T12:00:00`).toISOString(),
              totalValue: values.totalValue,
              observation: values.observations.join('\n'),
              invoiceNumber: values.invoiceNumber,
              invoiceDate: values.invoiceDate,
              fiscalKey: values.fiscalKey,
              attachments: values.attachments,
              ipiPercent: values.ipiPercent,
              freightPercent: values.freightPercent,
              nonFiscalDiscountMode: values.nonFiscalDiscountMode,
              nonFiscalDiscountValue: values.nonFiscalDiscountValue,
              nonFiscalFreightMode: isInvoiceLinkedReceipt
                ? existingReceipt?.non_fiscal_freight_mode || values.nonFiscalFreightMode
                : values.nonFiscalFreightMode,
              nonFiscalFreightValue: isInvoiceLinkedReceipt
                ? Number(existingReceipt?.non_fiscal_freight_value ?? values.nonFiscalFreightValue)
                : values.nonFiscalFreightValue,
              nonFiscalOtherExpensesMode: isInvoiceLinkedReceipt
                ? existingReceipt?.non_fiscal_other_expenses_mode || values.nonFiscalOtherExpensesMode
                : values.nonFiscalOtherExpensesMode,
              nonFiscalOtherExpensesValue: isInvoiceLinkedReceipt
                ? Number(existingReceipt?.non_fiscal_other_expenses_value ?? values.nonFiscalOtherExpensesValue)
                : values.nonFiscalOtherExpensesValue,
              fiscalIpi: values.fiscalIpi,
              fiscalFreight: values.fiscalFreight,
              fiscalDiscount: values.fiscalDiscount,
              fiscalOtherExpenses: values.fiscalOtherExpenses,
              items: values.items,
              status: editedStatus,
            });
            return { invoiceUpdated: true, invoiceComplete: true, edited: true };
          }
          if (origin.kind === 'invoice' && origin.invoiceId) {
            if (
              values.items.some((item, index) =>
                item.quantity >
                Number(item.expectedQuantity ?? origin.items[index]?.expectedQuantity ?? 0),
              )
            ) {
              throw new Error('A quantidade recebida não pode superar o saldo da nota.');
            }
            if (
              JSON.stringify(await loadInvoiceOrigin(origin.invoiceId)) !== JSON.stringify(origin)
            ) {
              throw new Error(
                'A nota, seus vínculos ou os recebimentos anteriores mudaram. Selecione a nota novamente.',
              );
            }
          }
          const invoiceComplete =
            origin.kind === 'invoice' &&
            values.items.length === origin.items.length &&
            values.items.every((item, index) =>
              item.quantity >=
              Number(item.expectedQuantity ?? origin.items[index]?.expectedQuantity ?? 0),
            );
          const result = await createMobileGoodsReceipt({
            id: receiptIdRef.current || (receiptIdRef.current = generateUUID()),
            receiptIndex: receiptIndexRef.current ?? (
              receiptToResume?.receipt_index ? Number(receiptToResume.receipt_index) : undefined
            ),
            purchaseId: origin.purchaseId,
            supplierId: values.supplierId,
            supplierName: selectedSupplier?.name || origin.supplierName || 'Fornecedor',
            receivedAt: new Date(`${values.receiptDate}T12:00:00`).toISOString(),
            totalValue: values.totalValue,
            observation: values.observations.join('\n'),
            invoiceId: origin.invoiceId,
            invoiceComplete,
            invoiceNumber: values.invoiceNumber,
            invoiceDate: values.invoiceDate,
            fiscalKey: values.fiscalKey,
            ipiPercent: values.ipiPercent,
            freightPercent: values.freightPercent,
            fiscalIpi: values.fiscalIpi,
            fiscalFreight: values.fiscalFreight,
            fiscalDiscount: values.fiscalDiscount,
            fiscalOtherExpenses: values.fiscalOtherExpenses,
            attachments: values.attachments,
            nonFiscalDiscountMode: values.nonFiscalDiscountMode,
            nonFiscalDiscountValue: values.nonFiscalDiscountValue,
            nonFiscalFreightMode: values.nonFiscalFreightMode,
            nonFiscalFreightValue: values.nonFiscalFreightValue,
            nonFiscalOtherExpensesMode: values.nonFiscalOtherExpensesMode,
            nonFiscalOtherExpensesValue: values.nonFiscalOtherExpensesValue,
            items: values.items,
          });
          return { ...result, invoiceComplete };
        },
        (errors) => {
          const message = Object.values(flattenFormErrors(errors))[0];
          Alert.alert('Revise o recebimento', message || 'Confira os campos obrigatórios.');
        },
      );
      if (saved) {
        onSaved();
        onClose();
        if (saved.edited) {
          Alert.alert(
            'Alteração salva',
            `O recebimento foi atualizado e continua ${receiptToEdit?.status === 'estornado' ? 'Estornado' : 'Recebido'}.`,
          );
          return;
        }
        const message = !saved.invoiceUpdated
          ? 'A entrada foi registrada, mas a nota não pôde ser atualizada. Confira a nota e o recebimento antes de repetir.'
          : origin.kind === 'invoice' && !saved.invoiceComplete
            ? 'A entrada parcial foi registrada. A nota ficou vinculada a este recebimento.'
            : 'A entrada dos produtos foi registrada no estoque.';
        Alert.alert('Recebimento confirmado', message);
      }
    } catch (error) {
      Alert.alert(
        'Não foi possível confirmar',
        error instanceof Error
          ? error.message
          : 'Confira a lista de recebimentos antes de tentar novamente.',
      );
    } finally {
      savingRef.current = false;
      setSaving(false);
    }
  };

  const safeClose = async () => {
    if (saving || savingRef.current) return;
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current);
    if (!isEditingReceipt && stage === 'form' && hasDraftProgress && !resumeSourceLoading && !resumeSourceError) {
      await persistDraftRef.current();
    }
    if (draftSavedRef.current) onSaved();
    onClose();
  };

  const backToSources = async () => {
    if (hasDraftProgress && !(await persistDraftRef.current())) return;
    setStage('source');
  };

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={safeClose}>
      <KeyboardAvoidingView
        style={[
          styles.flex,
          {
            backgroundColor: colors.bg,
            paddingTop: Math.max(insets.top, Platform.OS === 'android' ? 24 : 0),
            paddingBottom: Math.max(insets.bottom, Platform.OS === 'android' ? 24 : 0),
          },
        ]}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.header, { backgroundColor: '#059669' }]}>
          {stage === 'form' && !existingReceipt && (
            <TouchableOpacity
              onPress={() => void backToSources()}
              disabled={saving}
              accessibilityLabel="Voltar aos tipos de recebimento"
            >
              <ArrowLeft size={22} color="#ffffff" />
            </TouchableOpacity>
          )}
          <View style={styles.headerCopy}>
            <Text style={styles.headerTitle}>
              Cadastro do recebimento de mercadoria
            </Text>
            <Text style={styles.headerSubtitle}>
              {stage === 'source'
                ? 'Escolha a origem'
                : stage === 'invoice'
                  ? 'Selecione a nota fiscal'
                  : stage === 'purchase'
                    ? 'Selecione o pedido de compra'
                    : origin.kind === 'invoice' || existingReceipt?.invoice_number
                      ? `NF-e #${origin.invoiceNumber || existingReceipt?.invoice_number || '—'}`
                      : origin.kind === 'purchase'
                        ? 'Pedido de compra'
                        : 'Sem nota fiscal'}
            </Text>
          </View>
          <TouchableOpacity onPress={safeClose} disabled={saving} accessibilityLabel="Fechar">
            <X size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {stage === 'source' ? (
          <ReceiptSourceOptions
            colors={colors}
            onSelect={(source) => {
              if (source === 'manual') applyOrigin({ kind: 'manual', items: [] });
              else setStage(source);
            }}
          />
        ) : stage === 'invoice' || stage === 'purchase' ? (
          <ReceiptSourcePicker
            kind={stage}
            isDarkMode={isDarkMode}
            colors={colors}
            onSelectInvoice={selectInvoice}
            onSelectPurchase={selectPurchase}
            onManageInUseInvoice={onManageInUseInvoice}
          />
        ) : (
          <>
            <ScrollView
              pointerEvents={saving || resumeSourceLoading ? 'none' : 'auto'}
              contentContainerStyle={styles.content}
              keyboardShouldPersistTaps="handled"
            >
              {resumeSourceLoading ? (
                <View style={styles.resumeNotice}>
                  <ActivityIndicator size="small" color="#059669" />
                  <Text style={[styles.hint, { color: colors.muted }]}>Conferindo a nota vinculada…</Text>
                </View>
              ) : null}
              {resumeSourceError ? (
                <View style={styles.resumeError}>
                  <Text style={styles.errorText}>{resumeSourceError}</Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.label, { color: colors.text }]}>
                  Fornecedor{isInvoiceLinkedReceipt ? '' : ' *'}
                </Text>
                <View style={styles.supplierFieldContainer}>
                  {isInvoiceLinkedReceipt ? (
                    <View
                      style={[styles.informationalField, { backgroundColor: colors.bg }]}
                      accessibilityRole="text"
                      accessibilityLabel={`Fornecedor: ${selectedSupplier?.name || origin.supplierName || 'Fornecedor'}`}
                    >
                      <Text style={{ color: colors.text, flex: 1 }}>
                        {selectedSupplier?.name || origin.supplierName || 'Fornecedor'}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        if (supplierLocked) {
                          setShowSupplierLockTooltip((visible) => !visible);
                        } else if (isEditingReceipt && !origin.fiscalKey) {
                          void openSupplierPicker();
                        } else if (!isEditingReceipt && origin.kind === 'manual') {
                          void openSupplierPicker();
                        }
                      }}
                      disabled={
                        loadingSuppliers ||
                        (isEditingReceipt ? Boolean(origin.fiscalKey) : origin.kind !== 'manual')
                      }
                      style={[
                        styles.selectButton,
                        {
                          backgroundColor: colors.bg,
                          borderBottomColor: supplierSelected ? '#059669' : colors.border,
                        },
                      ]}
                      accessibilityRole="button"
                      accessibilityLabel={supplierLocked
                        ? 'Fornecedor selecionado e bloqueado. Toque para ver como liberar o campo.'
                        : selectedSupplier?.name || origin.supplierName || 'Selecionar fornecedor'}
                      accessibilityState={{ expanded: supplierLocked && showSupplierLockTooltip }}
                      accessibilityHint={supplierLocked
                        ? 'Remova todos os itens do recebimento para trocar o fornecedor.'
                        : undefined}
                    >
                      <Text
                        style={{
                          color: supplierId ? colors.text : colors.muted,
                          flex: 1,
                        }}
                      >
                        {selectedSupplier?.name || origin.supplierName || 'Selecionar fornecedor'}
                      </Text>
                      {supplierSelected ? (
                        <View style={styles.supplierIcons}>
                          <Check size={18} color="#059669" />
                          {supplierLocked || (isEditingReceipt && Boolean(origin.fiscalKey))
                            ? <LockKeyhole size={18} color="#d97706" />
                            : null}
                        </View>
                      ) : origin.kind === 'manual' && items.length === 0 && loadingSuppliers ? (
                        <ActivityIndicator size="small" color="#059669" />
                      ) : origin.kind === 'manual' && items.length === 0 ? (
                        <Text style={{ color: '#059669', fontWeight: '900' }}>Escolher</Text>
                      ) : null}
                    </TouchableOpacity>
                  )}
                  {!isInvoiceLinkedReceipt && supplierLocked && showSupplierLockTooltip ? (
                    <View
                      style={[styles.lockedTooltip, { backgroundColor: colors.surface, borderColor: colors.border }]}
                      accessibilityRole="text"
                    >
                      <Text style={[styles.lockedTooltipText, { color: colors.text }]}>
                        Para alterar o fornecedor, remova todos os itens deste recebimento.
                      </Text>
                    </View>
                  ) : null}
                </View>
                {supplierLoadError && origin.kind !== 'invoice' ? (
                  <Text style={styles.errorText}>{supplierLoadError}</Text>
                ) : null}

                <Text style={[styles.label, { color: colors.text }]}>
                  Data de recebimento *
                </Text>
                <TouchableOpacity
                  onPress={() => setReceiptDatePickerOpen(true)}
                  accessibilityRole="button"
                  accessibilityLabel={`Data de recebimento ${formattedReceiptDate}. Abrir calendário.`}
                  style={[
                    styles.dateField,
                    {
                      backgroundColor: colors.bg,
                      borderBottomColor: colors.border,
                    },
                  ]}
                >
                  <Text style={{ color: colors.text, fontSize: 14, fontWeight: '700' }}>
                    {formattedReceiptDate}
                  </Text>
                  <CalendarDays size={18} color={colors.muted} />
                </TouchableOpacity>
              </View>

              <PurchaseAttachmentsSection
                attachments={attachments}
                isUploading={isUploadingAttachments}
                colors={colors}
                recordLabel="recebimento"
                onAdd={() => void addAttachments()}
                onOpen={(url) => {
                  void Linking.openURL(url).catch(() =>
                    Alert.alert('Não foi possível abrir o anexo', 'Confira sua conexão e tente novamente.'),
                  );
                }}
                onRemove={removeAttachment}
              />

              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <View style={styles.rateioSectionHeader}>
                  <Text style={[styles.rateioSectionTitle, { color: colors.text }]}>
                    {isInvoiceLinkedReceipt ? 'Despesas não fiscais' : 'Despesas'}
                  </Text>
                  <Text style={[styles.rateioHint, { color: colors.muted }]}>
                    {isInvoiceLinkedReceipt
                      ? isEditingReceipt
                        ? 'Custos cobrados fora da nota fiscal, rateados entre os itens.'
                        : 'Informe custos cobrados fora da nota fiscal; eles serão rateados entre os itens.'
                      : 'Os valores serão rateados entre os itens.'}
                  </Text>
                </View>
                <View style={styles.rateioGrid}>
                  <ReceiptRateioField
                    label="Frete"
                    mode={nonFiscalFreightMode}
                    value={nonFiscalFreightInput}
                    baseTotal={rateioBaseTotal}
                    readOnly={isInvoiceLinkedReceipt && isEditingReceipt}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    onModeChange={setNonFiscalFreightMode}
                    onValueChange={setNonFiscalFreightInput}
                  />
                  <ReceiptRateioField
                    label="Outras despesas"
                    mode={nonFiscalOtherExpensesMode}
                    value={nonFiscalOtherExpensesInput}
                    baseTotal={rateioBaseTotal}
                    readOnly={isInvoiceLinkedReceipt && isEditingReceipt}
                    colors={colors}
                    isDarkMode={isDarkMode}
                    onModeChange={setNonFiscalOtherExpensesMode}
                    onValueChange={setNonFiscalOtherExpensesInput}
                  />
                </View>
              </View>

              <PurchaseItemsSection
                items={processedItems}
                onOpenProductPicker={() => setProductPickerOpen(true)}
                onAddItemRow={() => setProductPickerOpen(true)}
                onUpdateItem={updateItem}
                onRemoveItem={(index) =>
                  setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
                }
                colors={colors}
                allowAdd={!isInvoiceLinkedReceipt && (isEditingReceipt || origin.kind !== 'invoice')}
                showEmptyAddButton={false}
                allowRemove={!isInvoiceLinkedReceipt && (isEditingReceipt || origin.kind !== 'invoice')}
                addDisabled={!supplierId}
                receiptMode
                simplifiedReceiptMode={origin.kind !== 'invoice'}
                showReceiptCostComposition={!isInvoiceLinkedReceipt}
                readOnly={isInvoiceLinkedReceipt}
              />

              <View
                style={[
                  styles.section,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.border,
                  },
                ]}
              >
                <Text style={[styles.label, { color: colors.text }]}>Observações</Text>
                <FormTextInput
                  value={observation}
                  onChangeText={setObservation}
                  multiline
                  placeholder="Anote divergências ou detalhes da entrega"
                  placeholderTextColor={colors.muted}
                  style={[
                    styles.observationInput,
                    {
                      color: colors.text,
                      backgroundColor: colors.bg,
                      borderColor: colors.border,
                    },
                  ]}
                />
              </View>

              <View
                style={[
                  styles.totalBox,
                  {
                    borderColor: '#a7f3d0',
                    backgroundColor: isDarkMode ? '#064e3b' : '#ecfdf5',
                  },
                ]}
              >
                <Text
                  style={{
                    color: isDarkMode ? '#a7f3d0' : '#047857',
                    fontWeight: '900',
                  }}
                >
                  Valor total do recebimento
                </Text>
                <Text
                  style={{
                    color: isDarkMode ? '#a7f3d0' : '#047857',
                    fontWeight: '900',
                    fontSize: 20,
                  }}
                >
                  {new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL',
                  }).format(totalValue)}
                </Text>
              </View>
            </ScrollView>

            <View
              style={[
                styles.footer,
                { backgroundColor: colors.surface, borderColor: colors.border },
              ]}
            >
              <TouchableOpacity
                onPress={safeClose}
                disabled={saving}
                style={[styles.cancelButton, { borderColor: colors.border }]}
              >
                <Text style={{ color: colors.muted, fontWeight: '800' }}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => void handleConfirm()}
                disabled={saving || resumeSourceLoading || Boolean(resumeSourceError) || hasIncompleteItems}
                style={[styles.confirmButton, (resumeSourceLoading || resumeSourceError || hasIncompleteItems) && styles.confirmButtonDisabled]}
              >
                {saving || resumeSourceLoading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.confirmText}>{isEditingReceipt ? 'Salvar alteração' : 'Confirmar recebimento'}</Text>
                )}
              </TouchableOpacity>
            </View>
          </>
        )}
      </KeyboardAvoidingView>

      <PurchaseSupplierPickerModal
        visible={supplierPickerOpen}
        onClose={() => setSupplierPickerOpen(false)}
        supplierSearch={supplierSearch}
        setSupplierSearch={setSupplierSearch}
        filteredSuppliers={filteredSuppliers}
        onSelectSupplier={(supplier) => {
          if (isEditingReceipt && supplier.id !== supplierId) {
            setItems([]);
            setOrigin((current) => ({
              ...current,
              kind: 'manual',
              purchaseId: undefined,
              supplierId: supplier.id,
              supplierName: supplier.name,
              items: [],
            }));
          }
          setSupplierId(supplier.id);
          setSupplierPickerOpen(false);
        }}
        colors={colors}
      />
      <InventoryProductSearchModal
        isDarkMode={isDarkMode}
        visible={productPickerOpen}
        subtitle="Selecione a variação recebida"
        supplierId={supplierId || undefined}
        searchProvider={searchReceiptProducts}
        onClose={() => setProductPickerOpen(false)}
        onSelect={addProduct}
      />
      <TransactionDatePickerModal
        visible={receiptDatePickerOpen}
        selectedDate={receiptDate}
        isDarkMode={isDarkMode}
        onClose={() => setReceiptDatePickerOpen(false)}
        onSelect={setReceiptDate}
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  flex: { flex: 1 },
  header: {
    minHeight: 76,
    paddingHorizontal: 18,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerCopy: { flex: 1 },
  headerTitle: { color: '#ffffff', fontSize: 17, fontWeight: '900' },
  headerSubtitle: {
    color: 'rgba(255,255,255,.82)',
    marginTop: 3,
    fontSize: 12,
  },
  content: { padding: 16, paddingBottom: 24, gap: 14 },
  section: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8 },
  rateioSectionHeader: { gap: 4 },
  rateioSectionTitle: { fontSize: 14, fontWeight: '900' },
  rateioHint: { fontSize: 11, lineHeight: 16 },
  rateioGrid: { flexDirection: 'row', gap: 10 },
  label: {
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
    marginTop: 3,
  },
  selectButton: {
    minHeight: 46,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  supplierFieldContainer: { position: 'relative', zIndex: 5 },
  informationalField: {
    minHeight: 46,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierIcons: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lockedTooltip: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    zIndex: 10,
    elevation: 10,
    marginTop: 6,
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    shadowColor: '#0f172a',
    shadowOpacity: 0.14,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
  },
  lockedTooltipText: { fontSize: 11, fontWeight: '700', lineHeight: 16 },
  input: {
    minHeight: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  dateField: {
    minHeight: 44,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  hint: { fontSize: 11, marginTop: -3 },
  errorText: { color: '#dc2626', fontSize: 12, fontWeight: '700' },
  resumeNotice: { minHeight: 44, flexDirection: 'row', alignItems: 'center', gap: 10 },
  resumeError: { padding: 12, borderRadius: 10, backgroundColor: '#fef2f2' },
  observationInput: {
    minHeight: 88,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderRadius: 0,
    padding: 12,
    textAlignVertical: 'top',
  },
  totalBox: {
    borderWidth: 1,
    borderRadius: 15,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 8,
  },
  footer: { borderTopWidth: 1, padding: 12, flexDirection: 'row', gap: 10 },
  cancelButton: {
    flex: 1,
    minHeight: 46,
    borderWidth: 1,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmButton: {
    flex: 1.5,
    minHeight: 46,
    borderRadius: 11,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  confirmButtonDisabled: { opacity: 0.55 },
  confirmText: { color: '#ffffff', fontWeight: '900', fontSize: 12 },
});
