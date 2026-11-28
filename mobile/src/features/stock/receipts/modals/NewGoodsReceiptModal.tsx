import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
} from 'react-native';
import { parseRateioInputValue } from './ReceiptRateioField';
import type { RateioMode } from './ReceiptRateioField';
import { ReceiptSubmissionFooter } from './ReceiptSubmissionFooter';
import { styles } from './newGoodsReceiptModal.styles';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  mobileReceiptFormSchema,
  receiptDraftFormSchema,
} from '../../../../../../shared-utils/receiptFormSchemas';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { generateUUID } from '../../../../services/offline/offlineStorageService';
import { getLocalDateString } from '../../../../utils/orderUtils';
import { searchInventoryScopeProducts } from '../../../../services/stockService';
import { InventoryProductSearchModal } from '../../inventory/components/InventoryProductSearchModal';
import type { SearchableProduct } from '../../inventory/components/InventoryProductSearchModal';
import { useMobilePurchaseAttachments } from '../../purchases/hooks/useMobilePurchaseAttachments';
import { PurchaseSupplierPickerModal } from '../../purchases/modals/purchase-form/PurchaseSupplierPickerModal';
import { fetchMobileReceiptSupplierPickerPage } from '../../../products/services/products/mobileSupplierService';
import { TransactionDatePickerModal } from '../../../finance/components/transaction-date/TransactionDatePickerModal';
import type { Invoice } from '../../types/stock.types';
import {
  createMobileGoodsReceipt,
  editMobileGoodsReceipt,
} from '../../../../services/stock/stockReceiptsService';
import { connectivityService } from '../../../../services/offline/connectivityService';
import { ReceiptSourceOptions, ReceiptSourcePicker } from './ReceiptSourcePicker';
import { ReceiptHeader } from './ReceiptHeader';
import {
  calculateMobileReceiptItems,
  receiptItemWithCosts,
  type MobileReceiptItem,
  type ReceiptOrigin,
} from '../utils/receiptSource';
import { buildBaseGoodsReceiptPayload } from './goodsReceiptPayloadBuilder';
import { NewGoodsReceiptFormBody } from './NewGoodsReceiptFormBody';
import {
  useNewGoodsReceiptSourcesAndDraft,
  type GoodsReceiptSupplierOption,
} from './useNewGoodsReceiptSourcesAndDraft';

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
  const [suppliers, setSuppliers] = useState<GoodsReceiptSupplierOption[]>([]);
  const [suppliersLoaded, setSuppliersLoaded] = useState(false);
  const [loadingSuppliers, setLoadingSuppliers] = useState(false);
  const [receiptSupplierResults, setReceiptSupplierResults] = useState<GoodsReceiptSupplierOption[]>([]);
  const [receiptSupplierPickerLoading, setReceiptSupplierPickerLoading] = useState(false);
  const [receiptSupplierPickerLoadingMore, setReceiptSupplierPickerLoadingMore] = useState(false);
  const [receiptSupplierError, setReceiptSupplierError] = useState('');
  const [receiptSupplierResultsOffline, setReceiptSupplierResultsOffline] = useState(false);
  const [receiptSupplierHasMore, setReceiptSupplierHasMore] = useState(false);
  const [receiptSupplierPage, setReceiptSupplierPage] = useState(0);
  const [receiptSupplierRetry, setReceiptSupplierRetry] = useState(0);
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
  const supplierSearchRevisionRef = useRef(0);
  const supplierSearchControllerRef = useRef<AbortController | null>(null);
  const supplierPickerLoadingMoreRef = useRef(false);
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

  const {
    openSupplierPicker,
    applyOrigin,
    selectPurchase,
    loadInvoiceOrigin,
    selectInvoice,
  } = useNewGoodsReceiptSourcesAndDraft({
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
  });

  useEffect(() => {
    if (!supplierPickerOpen) {
      supplierSearchRevisionRef.current += 1;
      supplierPickerLoadingMoreRef.current = false;
      supplierSearchControllerRef.current?.abort();
      setReceiptSupplierPickerLoading(false);
      setReceiptSupplierPickerLoadingMore(false);
      return;
    }

    supplierSearchControllerRef.current?.abort();
    const controller = new AbortController();
    supplierSearchControllerRef.current = controller;
    const requestId = ++supplierSearchRevisionRef.current;
    let active = true;
    supplierPickerLoadingMoreRef.current = false;

    setReceiptSupplierPickerLoading(true);
    setReceiptSupplierPickerLoadingMore(false);
    setReceiptSupplierResults([]);
    setReceiptSupplierResultsOffline(false);
    setReceiptSupplierHasMore(false);
    setReceiptSupplierPage(0);
    setReceiptSupplierError('');

    const search = supplierSearch.trim();
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const result = await fetchMobileReceiptSupplierPickerPage(search, 0, {
            signal: controller.signal,
          });
          if (!active || requestId !== supplierSearchRevisionRef.current) return;
          if (result.ok) {
            setReceiptSupplierResults(result.suppliers);
            setReceiptSupplierResultsOffline(result.source === 'offline');
            setReceiptSupplierHasMore(result.hasMore);
            setReceiptSupplierPage(0);
            setReceiptSupplierError('');
          } else {
            setReceiptSupplierResults([]);
            setReceiptSupplierError(result.errorMessage);
          }
        } catch {
          if (active && requestId === supplierSearchRevisionRef.current) {
            setReceiptSupplierResults([]);
            setReceiptSupplierError('Não foi possível carregar os fornecedores. Tente novamente.');
          }
        } finally {
          if (active && requestId === supplierSearchRevisionRef.current) {
            setReceiptSupplierPickerLoading(false);
          }
        }
      })();
    }, search ? 300 : 0);

    return () => {
      active = false;
      clearTimeout(timer);
      controller.abort();
    };
  }, [supplierPickerOpen, supplierSearch, receiptSupplierRetry]);

  useEffect(() => {
    if (!supplierPickerOpen) return;
    let wasConnected = connectivityService.connected;
    return connectivityService.subscribe((connected) => {
      if (!wasConnected && connected) {
        setReceiptSupplierRetry((current) => current + 1);
      }
      wasConnected = connected;
    });
  }, [supplierPickerOpen]);

  const loadMoreReceiptSupplierResults = useCallback(async () => {
    if (
      !supplierPickerOpen ||
      !receiptSupplierHasMore ||
      receiptSupplierPickerLoading ||
      receiptSupplierPickerLoadingMore ||
      supplierPickerLoadingMoreRef.current
    ) {
      return;
    }

    const requestId = supplierSearchRevisionRef.current;
    const nextPage = receiptSupplierPage + 1;
    const controller = new AbortController();
    supplierSearchControllerRef.current?.abort();
    supplierSearchControllerRef.current = controller;
    supplierPickerLoadingMoreRef.current = true;
    setReceiptSupplierPickerLoadingMore(true);

    try {
      const result = await fetchMobileReceiptSupplierPickerPage(
        supplierSearch.trim(),
        nextPage,
        { signal: controller.signal },
      );
      if (requestId !== supplierSearchRevisionRef.current || !supplierPickerOpen) return;
      if (!result.ok) {
        setReceiptSupplierError(result.errorMessage);
        return;
      }

      setReceiptSupplierResults((current) => {
        const seen = new Set(current.map((supplier) => supplier.id));
        return [
          ...current,
          ...result.suppliers.filter((supplier) => !seen.has(supplier.id)),
        ];
      });
      setReceiptSupplierResultsOffline(result.source === 'offline');
      setReceiptSupplierHasMore(result.hasMore);
      setReceiptSupplierPage(nextPage);
      setReceiptSupplierError('');
    } catch {
      if (requestId === supplierSearchRevisionRef.current && supplierPickerOpen) {
        setReceiptSupplierError('Não foi possível carregar os fornecedores. Tente novamente.');
      }
    } finally {
      if (requestId === supplierSearchRevisionRef.current) {
        supplierPickerLoadingMoreRef.current = false;
        setReceiptSupplierPickerLoadingMore(false);
      }
    }
  }, [
    receiptSupplierHasMore,
    receiptSupplierPage,
    receiptSupplierPickerLoading,
    receiptSupplierPickerLoadingMore,
    supplierPickerOpen,
    supplierSearch,
  ]);

  const filteredSuppliers = receiptSupplierResults;

  const searchReceiptProducts = useCallback(
    (query: string) => searchInventoryScopeProducts(query, supplierId || undefined),
    [supplierId],
  );

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
          const supplierName = selectedSupplier?.name || origin.supplierName || 'Fornecedor';
          if (isEditingReceipt && receiptToEdit) {
            const editedStatus = 'received' as const;
            await editMobileGoodsReceipt({
              ...buildBaseGoodsReceiptPayload({
                id: receiptIdRef.current || receiptToEdit.id,
                receiptIndex: receiptIndexRef.current ?? (Number(receiptToEdit.receipt_index || 0) || undefined),
                purchaseId: origin.purchaseId,
                values,
                supplierName,
                existingReceipt,
                isEditingInvoiceLinked: isInvoiceLinkedReceipt,
              }),
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
            ...buildBaseGoodsReceiptPayload({
              id: receiptIdRef.current || (receiptIdRef.current = generateUUID()),
              receiptIndex: receiptIndexRef.current ?? (
                receiptToResume?.receipt_index ? Number(receiptToResume.receipt_index) : undefined
              ),
              purchaseId: origin.purchaseId,
              values,
              supplierName,
            }),
            invoiceId: origin.invoiceId,
            invoiceComplete,
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
        <ReceiptHeader
          stage={stage}
          isExistingReceipt={Boolean(existingReceipt)}
          originKind={origin.kind}
          originInvoiceNumber={origin.invoiceNumber}
          existingInvoiceNumber={existingReceipt?.invoice_number}
          saving={saving}
          onBackToSources={backToSources}
          onRequestClose={safeClose}
        />

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
            <NewGoodsReceiptFormBody
              colors={colors}
              isDarkMode={isDarkMode}
              saving={saving}
              resumeSourceLoading={resumeSourceLoading}
              resumeSourceError={resumeSourceError}
              isInvoiceLinkedReceipt={isInvoiceLinkedReceipt}
              isEditingReceipt={isEditingReceipt}
              origin={origin}
              selectedSupplierName={selectedSupplier?.name}
              supplierId={supplierId}
              supplierSelected={supplierSelected}
              supplierLocked={supplierLocked}
              showSupplierLockTooltip={showSupplierLockTooltip}
              supplierLoadError={supplierLoadError}
              loadingSuppliers={loadingSuppliers}
              itemsCount={items.length}
              formattedReceiptDate={formattedReceiptDate}
              attachments={attachments}
              isUploadingAttachments={isUploadingAttachments}
              nonFiscalFreightMode={nonFiscalFreightMode}
              nonFiscalFreightInput={nonFiscalFreightInput}
              nonFiscalOtherExpensesMode={nonFiscalOtherExpensesMode}
              nonFiscalOtherExpensesInput={nonFiscalOtherExpensesInput}
              rateioBaseTotal={rateioBaseTotal}
              processedItems={processedItems}
              observation={observation}
              totalValue={totalValue}
              onSupplierPress={() => {
                if (supplierLocked) {
                  setShowSupplierLockTooltip((current) => !current);
                } else if (isEditingReceipt && !origin.fiscalKey) {
                  void openSupplierPicker();
                } else if (!isEditingReceipt && origin.kind === 'manual') {
                  void openSupplierPicker();
                }
              }}
              onOpenDatePicker={() => setReceiptDatePickerOpen(true)}
              onAddAttachments={() => void addAttachments()}
              onRemoveAttachment={removeAttachment}
              onFreightModeChange={setNonFiscalFreightMode}
              onFreightInputChange={setNonFiscalFreightInput}
              onOtherExpensesModeChange={setNonFiscalOtherExpensesMode}
              onOtherExpensesInputChange={setNonFiscalOtherExpensesInput}
              onOpenProductPicker={() => setProductPickerOpen(true)}
              onUpdateItem={updateItem}
              onRemoveItem={(index) =>
                setItems((current) => current.filter((_, itemIndex) => itemIndex !== index))
              }
              onObservationChange={setObservation}
            />

            <ReceiptSubmissionFooter
              colors={colors}
              saving={saving}
              resumeSourceLoading={resumeSourceLoading}
              resumeSourceError={resumeSourceError}
              hasIncompleteItems={hasIncompleteItems}
              isEditingReceipt={isEditingReceipt}
              onCancel={safeClose}
              onConfirm={() => void handleConfirm()}
            />
          </>
        )}
      </KeyboardAvoidingView>

      <PurchaseSupplierPickerModal
        visible={supplierPickerOpen}
        onClose={() => setSupplierPickerOpen(false)}
        supplierSearch={supplierSearch}
        setSupplierSearch={setSupplierSearch}
        filteredSuppliers={filteredSuppliers}
        loading={receiptSupplierPickerLoading}
        errorMessage={receiptSupplierError}
        offlineResults={receiptSupplierResultsOffline}
        hasMore={receiptSupplierHasMore}
        loadingMore={receiptSupplierPickerLoadingMore}
        onLoadMore={() => void loadMoreReceiptSupplierResults()}
        preserveResultsOnError
        onRetry={() => {
          if (receiptSupplierResults.length) {
            void loadMoreReceiptSupplierResults();
          } else {
            setReceiptSupplierRetry((current) => current + 1);
          }
        }}
        onSelectSupplier={(supplier) => {
          setSuppliers((current) => {
            const selected = {
              id: supplier.id,
              name: supplier.name,
              full_name: supplier.full_name,
              nickname: supplier.nickname,
              social_name: supplier.social_name,
            };
            const existingIndex = current.findIndex((item) => item.id === supplier.id);
            if (existingIndex < 0) return [...current, selected];
            return current.map((item, index) => index === existingIndex ? { ...item, ...selected } : item);
          });
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
