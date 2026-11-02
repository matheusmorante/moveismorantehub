import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { receiptDraftFormSchema, receiptFormSchema } from '../../../../../../../shared-utils/receiptFormSchemas';
import { IN_USE_INVOICE_MESSAGE } from '../../../../../../../shared-utils/receiptInvoiceAvailability';
import { withTimeout } from '../../../../../../../shared-utils/withTimeout';
import type Person from '@/pages/types/person.type';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import { subscribeToPeople } from '@/pages/utils/personService';
import {
  type GoodsReceipt,
  editGoodsReceipt,
  finalizeGoodsReceipt,
  saveGoodsReceiptDraft,
} from '@/pages/utils/goodsReceiptService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import { markInvoiceAsReceived } from '@/pages/utils/inboundNfe/inboundInvoicesService';
import type Purchase from '@/pages/types/purchase.type';
import { type InboundReceiptItem } from '../components/InboundNfeItemsSection';
import { calculateReceiptItems } from '@/pages/utils/goodsReceiptCostCalculation';
import { convertInboundToPurchaseItems } from '../utils/inboundToPurchaseConverter';
import { adaptInboundInvoiceToReceiptState } from '../utils/inboundInvoiceToReceiptAdapter';
import { calculateReceiptRateioBase } from '../utils/calculateReceiptRateioBase';
import { getSafeReceivedAt } from '../utils/receiptDateUtils';
import { persistInboundSupplierProductCodes } from '../utils/receiptSupplierCodesPersistence';
import { buildGoodsReceiptPayload } from '../utils/receiptPayloadBuilders';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface UseReceiptFormParams {
  isOpen: boolean;
  onClose: () => void;
  initialReceipt?: GoodsReceipt | null;
  copyReceipt?: boolean;
  initialInboundInvoice?: InboundInvoice | null;
  initialPurchase?: Purchase | null;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useReceiptForm({
  isOpen,
  onClose,
  initialReceipt,
  copyReceipt = false,
  initialInboundInvoice,
  initialPurchase,
}: UseReceiptFormParams) {
  const isEditingReceipt = Boolean(
    initialReceipt && !copyReceipt &&
      initialReceipt.status === 'received',
  );
  // ── Estado principal ───────────────────────────────────────────────────────
  const [suppliers, setSuppliers] = useState<Person[]>([]);
  const [draftId, setDraftIdState] = useState<string>('');
  const draftIdRef = useRef('');
  const setDraftId = useCallback((id: string) => { draftIdRef.current = id; setDraftIdState(id); }, []);
  const activeDraftWriteRef = useRef<Promise<unknown>>(Promise.resolve());
  const finalizingRef = useRef(false);
  const completedRef = useRef(false);
  const persistDraftRef = useRef<() => Promise<boolean>>(async () => false);
  const [receiptIndex, setReceiptIndex] = useState<number | undefined>(undefined);
  const [sourcePurchaseId, setSourcePurchaseId] = useState<string>('');
  const [supplierId, setSupplierId] = useState<string>('');
  const [items, setItems] = useState<PurchaseItem[]>([]);
  const [inboundItems, setInboundItems] = useState<InboundReceiptItem[] | null>(null);
  const [ipiPercent, setIpiPercent] = useState(0);
  const [freightPercent, setFreightPercent] = useState(0);

  // ── Custos não fiscais ─────────────────────────────────────────────────────
  const [nonFiscalFreightMode, setNonFiscalFreightMode] = useState<'percent' | 'fixed'>('percent');
  const [nonFiscalFreightValue, setNonFiscalFreightValue] = useState<number>(0);
  const [nonFiscalOtherExpensesMode, setNonFiscalOtherExpensesMode] = useState<'percent' | 'fixed'>(
    'percent'
  );
  const [nonFiscalOtherExpensesValue, setNonFiscalOtherExpensesValue] = useState<number>(0);

  // ── Dados fiscais de referência (NF-e) ────────────────────────────────────
  const [fiscalIpi, setFiscalIpi] = useState<number>(0);
  const [fiscalFreight, setFiscalFreight] = useState<number>(0);
  const [fiscalDiscount, setFiscalDiscount] = useState<number>(0);
  const [fiscalOtherExpenses, setFiscalOtherExpenses] = useState<number>(0);

  // ── Metadados ─────────────────────────────────────────────────────────────
  const [receiptDate, setReceiptDate] = useState(() => new Date().toISOString().slice(0, 10));
  const defaultReceiptDateRef = useRef(receiptDate);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isAttachingInboundDocument, setIsAttachingInboundDocument] = useState(false);
  const [fiscalKey, setFiscalKey] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [observations, setObservations] = useState<string[]>([]);
  const [isDraftSaved, setIsDraftSaved] = useState(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Aplicar pedido de compra ───────────────────────────────────────────────
  const applyPurchase = (purchase: Purchase) => {
    setSupplierId(purchase.supplierId);
    setItems(
      purchase.items.map((item) => ({
        ...item,
        baseCost: item.baseCost || item.unitCost,
        unitCost: item.baseCost || item.unitCost,
        totalCost: (item.baseCost || item.unitCost) * item.quantity,
      }))
    );
    setIpiPercent(purchase.ipiPercent || 0);
    setFreightPercent(purchase.freightPercent || 0);
    toast.info('Pedido carregado. Confira e ajuste os itens recebidos antes de registrar.');
  };

  // ── Aplicar NF-e (via adapter de domínio) ─────────────────────────────────
  const applyInboundInvoice = async (invoice: InboundInvoice) => {
    const adapted = await adaptInboundInvoiceToReceiptState(
      invoice,
      suppliers,
      setIsAttachingInboundDocument
    );

    if (adapted.resolvedSupplierId) setSupplierId(adapted.resolvedSupplierId);
    setFiscalKey(adapted.fiscalKey);
    if (adapted.invoiceNumber) setInvoiceNumber(adapted.invoiceNumber);
    setReceiptDate(adapted.receiptDate);
    setInvoiceDate(adapted.invoiceDate);
    setIpiPercent(adapted.ipiPercent);
    setFreightPercent(adapted.freightPercent);
    setFiscalIpi(adapted.fiscalIpi);
    setFiscalFreight(adapted.fiscalFreight);
    setFiscalDiscount(adapted.fiscalDiscount);
    setFiscalOtherExpenses(adapted.fiscalOtherExpenses);

    if (adapted.attachmentUrl) {
      setAttachments((prev) =>
        prev.includes(adapted.attachmentUrl!) ? prev : [...prev, adapted.attachmentUrl!]
      );
    }

    const convertedItems = convertInboundToPurchaseItems(adapted.linkedItems);
    setInboundItems(adapted.linkedItems);
    setItems(convertedItems);
    toast.success(`NF-e #${invoice.nfeNumber} carregada com ${convertedItems.length} item(ns)!`);
  };

  // ── Reset de estado para formulário vazio ─────────────────────────────────
  const resetForm = () => {
    const today = new Date().toISOString().slice(0, 10);
    setDraftId('');
    setReceiptIndex(undefined);
    setSourcePurchaseId('');
    setSupplierId('');
    setItems([]);
    setIpiPercent(0);
    setFreightPercent(0);
    setNonFiscalFreightMode('percent');
    setNonFiscalFreightValue(0);
    setNonFiscalOtherExpensesMode('percent');
    setNonFiscalOtherExpensesValue(0);
    setFiscalIpi(0);
    setFiscalFreight(0);
    setFiscalDiscount(0);
    setFiscalOtherExpenses(0);
    setInboundItems(null);
    defaultReceiptDateRef.current = today;
    setReceiptDate(today);
    setInvoiceNumber('');
    setInvoiceDate('');
    setFiscalKey('');
    setAttachments([]);
    setObservations([]);
    setIsDraftSaved(false);
  };

  // ── Efeito de inicialização por tipo de origem ─────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    completedRef.current = false;

    if (initialReceipt) {
      const today = new Date().toISOString().slice(0, 10);
      const storedDate = initialReceipt.receivedAt;
      const initialDate = copyReceipt
        ? today
        : storedDate
          ? /^\d{4}-\d{2}-\d{2}$/.test(storedDate)
            ? storedDate
            : new Date(storedDate).toLocaleDateString('sv-SE')
          : today;
      defaultReceiptDateRef.current = initialDate;
      setDraftId(copyReceipt ? '' : initialReceipt.id);
      setReceiptIndex(copyReceipt ? undefined : initialReceipt.receiptIndex);
      setSourcePurchaseId(copyReceipt ? '' : initialReceipt.purchaseId || '');
      setSupplierId(initialReceipt.supplierId || '');
      setItems(
        initialReceipt.items.map(({ inventoryMoveId: _inventoryMoveId, ...item }) => ({ ...item }))
      );
      setInboundItems(null);
      setIpiPercent(initialReceipt.ipiPercent || 0);
      setFreightPercent(initialReceipt.freightPercent || 0);
      setNonFiscalFreightMode(initialReceipt.nonFiscalFreightMode || 'percent');
      setNonFiscalFreightValue(initialReceipt.nonFiscalFreightValue || 0);
      setNonFiscalOtherExpensesMode(initialReceipt.nonFiscalOtherExpensesMode || 'percent');
      setNonFiscalOtherExpensesValue(initialReceipt.nonFiscalOtherExpensesValue || 0);
      setFiscalIpi(initialReceipt.fiscalIpi || 0);
      setFiscalFreight(initialReceipt.fiscalFreight || 0);
      setFiscalDiscount(initialReceipt.fiscalDiscount || 0);
      setFiscalOtherExpenses(initialReceipt.fiscalOtherExpenses || 0);
      setReceiptDate(initialDate);
      setInvoiceNumber(initialReceipt.invoiceNumber || '');
      setInvoiceDate(initialReceipt.invoiceDate || '');
      setFiscalKey(initialReceipt.fiscalKey || '');
      setAttachments(initialReceipt.attachments || []);
      setObservations(
        initialReceipt.observation
          ? initialReceipt.observation
              .split('\n')
              .map((s) => s.trim())
              .filter(Boolean)
          : []
      );
      setIsDraftSaved(copyReceipt || isEditingReceipt ? false : initialReceipt.isDraft);
    } else if (initialPurchase) {
      const today = new Date().toISOString().slice(0, 10);
      defaultReceiptDateRef.current = today;
      setDraftId('');
      setReceiptIndex(undefined);
      setSourcePurchaseId(initialPurchase.id || '');
      applyPurchase(initialPurchase);
      setInboundItems(null);
      setReceiptDate(today);
      setInvoiceNumber('');
      setInvoiceDate('');
      setFiscalKey('');
      setAttachments([]);
      setObservations([]);
      setIsDraftSaved(false);
      setNonFiscalFreightMode('percent');
      setNonFiscalFreightValue(0);
      setNonFiscalOtherExpensesMode('percent');
      setNonFiscalOtherExpensesValue(0);
    } else if (initialInboundInvoice) {
      resetForm();
      void applyInboundInvoice(initialInboundInvoice);
    } else {
      resetForm();
    }

    return subscribeToPeople('suppliers', (data) =>
      setSuppliers(data.filter((person) => !person.deleted && person.type === 'suppliers'))
    );
  }, [isOpen, initialReceipt, copyReceipt, initialInboundInvoice, initialPurchase, isEditingReceipt]);

  // ── Cálculo dos itens processados (com custos adicionais rateados) ─────────
  const isInvoiceLinkedReceipt = Boolean(initialInboundInvoice || fiscalKey || initialReceipt?.fiscalKey);
  const receiptItemsForCosts = isInvoiceLinkedReceipt
    ? items
    : items.map((item) => ({
        ...item,
        discountFiscalUnit: 0,
        discountNonFiscalUnit: 0,
        discountUnit: 0,
      }));
  const processedItems = calculateReceiptItems(receiptItemsForCosts, {
    fallbackIpiPercent: ipiPercent,
    fallbackFreightPercent: freightPercent,
    nonFiscalFreight: { mode: nonFiscalFreightMode, value: nonFiscalFreightValue },
    nonFiscalOtherExpenses: {
      mode: nonFiscalOtherExpensesMode,
      value: nonFiscalOtherExpensesValue,
    },
  });
  const totalValue = processedItems.reduce((sum, item) => sum + item.totalCost, 0);
  const formValues = { supplierId, receiptDate, items: processedItems, totalValue, fiscalKey, ipiPercent, freightPercent,
    invoiceNumber, invoiceDate, attachments, observations, nonFiscalDiscountMode: 'percent' as const, nonFiscalDiscountValue: 0,
    nonFiscalFreightMode, nonFiscalFreightValue, nonFiscalOtherExpensesMode, nonFiscalOtherExpensesValue,
    fiscalIpi, fiscalFreight, fiscalDiscount, fiscalOtherExpenses,
  };
  const hasReceiptProgress = Boolean(
    supplierId || items.length || inboundItems?.length || sourcePurchaseId ||
    receiptDate !== defaultReceiptDateRef.current || fiscalKey || invoiceNumber || invoiceDate ||
    attachments.length || observations.length || nonFiscalFreightMode !== 'percent' || nonFiscalFreightValue ||
    nonFiscalOtherExpensesMode !== 'percent' || nonFiscalOtherExpensesValue || ipiPercent ||
    freightPercent || fiscalIpi || fiscalFreight || fiscalDiscount || fiscalOtherExpenses
  );
  const { enqueueAndRun: validateReceiptDraft } = useZodForm(receiptDraftFormSchema, formValues);
  const { validateAndRun: validateReceipt } = useZodForm(receiptFormSchema, formValues);

  const handleSupplierChange = useCallback((nextSupplierId: string) => {
    if (isEditingReceipt && nextSupplierId !== supplierId) {
      setItems([]);
      setSourcePurchaseId('');
      setInboundItems(null);
    }
    setSupplierId(nextSupplierId);
  }, [isEditingReceipt, supplierId]);

  const baseValueForRateio = useMemo(
    () =>
      calculateReceiptRateioBase({
        initialInvoice: initialInboundInvoice,
        inboundItems,
        items,
      }),
    [initialInboundInvoice, inboundItems, items]
  );

  // ── Auto-save do rascunho ──────────────────────────────────────────────────
  const persistDraft = async (): Promise<boolean> => {
    if (isEditingReceipt || !isOpen || !hasReceiptProgress || finalizingRef.current || completedRef.current) {
      return false;
    }
    try {
      const write = validateReceiptDraft(formValues, async (validated) => {
        if (finalizingRef.current || completedRef.current) return;
        const currentSupplier = suppliers.find((p) => p.id === validated.supplierId);
        const safeReceivedAt = getSafeReceivedAt(validated.receiptDate);
        const stableDraftId = draftIdRef.current || crypto.randomUUID();
        draftIdRef.current = stableDraftId;
        const draftPayload = buildGoodsReceiptPayload(validated, {
          id: stableDraftId,
          receiptIndex: receiptIndex || (copyReceipt ? undefined : initialReceipt?.receiptIndex),
          purchaseId: sourcePurchaseId || undefined,
          supplierName: currentSupplier?.fullName || 'Fornecedor',
          safeReceivedAt,
        });

        const savedDraft = await saveGoodsReceiptDraft(draftPayload);
        if (savedDraft.id) setDraftId(savedDraft.id);
        if (savedDraft.receiptIndex) setReceiptIndex(savedDraft.receiptIndex);
        setIsDraftSaved(true);
      }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0], { toastId: 'receipt-draft-validation' }));
      activeDraftWriteRef.current = write.catch(() => undefined);
      const saved = await write;
      return saved !== false;
    } catch (err: unknown) {
      console.error('Erro ao auto-salvar rascunho:', err);
      setIsDraftSaved(false);
      toast.error(
        err instanceof Error && err.message === IN_USE_INVOICE_MESSAGE
          ? err.message
          : 'Não foi possível salvar o rascunho do recebimento.',
        { toastId: 'receipt-draft-error' },
      );
      return false;
    }
  };
  persistDraftRef.current = persistDraft;

  const handleClose = async () => {
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    if (!isEditingReceipt && hasReceiptProgress) {
      await withTimeout(
        persistDraftRef.current().then((saved) => ({ saved })),
        15_000,
        null,
        'erp:receipt-close-draft-flush',
      );
    }
    onClose();
  };

  useEffect(() => {
    if (!isOpen || isEditingReceipt || !hasReceiptProgress) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    autoSaveTimerRef.current = setTimeout(() => {
      void persistDraftRef.current();
    }, 500);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    isOpen,
    isEditingReceipt,
    hasReceiptProgress,
    supplierId,
    items,
    inboundItems,
    draftId,
    receiptIndex,
    sourcePurchaseId,
    ipiPercent,
    freightPercent,
    nonFiscalFreightMode,
    nonFiscalFreightValue,
    nonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue,
    fiscalIpi,
    fiscalFreight,
    fiscalDiscount,
    fiscalOtherExpenses,
    receiptDate,
    invoiceNumber,
    invoiceDate,
    fiscalKey,
    attachments,
    observations,
    validateReceiptDraft,
  ]);

  // ── Finalizar recebimento ──────────────────────────────────────────────────
  const handleFinalize = async () => {
    if (finalizingRef.current || completedRef.current) return;
    const supplier = suppliers.find((person) => person.id === supplierId);
    if (!supplier) {
      toast.error('Selecione o fornecedor para continuar.');
      return;
    }
    if (!items.length) {
      toast.error('Adicione pelo menos um item para confirmar o recebimento.');
      return;
    }
    if (items.some((item) => !item.productId?.trim())) {
      toast.error('Selecione o produto de todos os itens antes de confirmar o recebimento.');
      return;
    }
    if (
      inboundItems?.some((item) => {
        if (item.linkMode === 'not_applicable') return false;
        if (item.linkMode === 'composition')
          return !item.compositionLinks || item.compositionLinks.length === 0 ||
            item.compositionLinks.some((link) => !link.productId?.trim());
        return !item.linkedProductId?.trim();
      })
    ) {
      toast.error(
        'Vincule todos os itens da NF-e a um produto ou composição do ERP antes de confirmar.'
      );
      return;
    }
    finalizingRef.current = true;
    setIsSaving(true);
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    try {
      if (!isEditingReceipt) await activeDraftWriteRef.current;
      await validateReceipt(formValues, async (validated) => {
      const receiptId = draftIdRef.current || crypto.randomUUID();

      if (!isEditingReceipt) await persistInboundSupplierProductCodes(inboundItems, supplierId);

      const safeReceivedAt = getSafeReceivedAt(validated.receiptDate);
      const currentStatus = 'received' as const;
      const finalizePayload = buildGoodsReceiptPayload(validated, {
        id: receiptId,
        receiptIndex: receiptIndex || (copyReceipt ? undefined : initialReceipt?.receiptIndex),
        purchaseId: sourcePurchaseId || undefined,
        supplierName: supplier.fullName,
        safeReceivedAt,
        status: isEditingReceipt ? currentStatus : 'received',
        isDraft: false,
      });

      if (isEditingReceipt && initialReceipt) {
        await editGoodsReceipt({
          ...finalizePayload,
          id: receiptId,
          status: currentStatus,
          isDraft: false,
        });
      } else {
        await finalizeGoodsReceipt({ ...finalizePayload, id: receiptId, status: 'received', isDraft: false });
      }

      let invoiceLinkFailed = false;
      if (!isEditingReceipt && validated.fiscalKey) {
        try {
          await markInvoiceAsReceived(validated.fiscalKey, receiptId);
        } catch {
          invoiceLinkFailed = true;
        }
      }

      completedRef.current = true;
      if (isEditingReceipt) {
        toast.success('Alteração do recebimento salva com sucesso.');
      } else if (invoiceLinkFailed) {
        toast.warning('Recebimento confirmado, mas não foi possível atualizar o vínculo da nota. Confira a nota antes de repetir.');
      } else {
        toast.success('Recebimento de mercadorias confirmado com sucesso!');
      }
      onClose();
      }, (errors) => toast.error(Object.values(flattenFormErrors(errors))[0]));
    } catch (error: unknown) {
      console.error('Erro ao finalizar recebimento:', error);
      const message =
        error instanceof Error ? error.message : (isEditingReceipt
          ? 'Não foi possível salvar a alteração do recebimento.'
          : 'Não foi possível concluir o recebimento.');
      toast.error(message);
    } finally {
      finalizingRef.current = false;
      setIsSaving(false);
    }
  };

  // ── Atualizar item da NF-e individualmente ─────────────────────────────────
  const handleInboundItemChange = (itemNumber: number, update: Partial<InboundReceiptItem>) => {
    setInboundItems((current) => {
      if (!current) return current;
      const updated = current.map((item) =>
        item.itemNumber === itemNumber ? { ...item, ...update } : item
      );
      setItems(convertInboundToPurchaseItems(updated));
      return updated;
    });
  };

  // ── Retorno público do hook ────────────────────────────────────────────────
  return {
    suppliers,
    supplierId,
    handleSupplierChange,
    setSupplierId,
    items,
    setItems,
    inboundItems,
    setInboundItems,
    ipiPercent,
    freightPercent,
    nonFiscalFreightMode,
    setNonFiscalFreightMode,
    nonFiscalFreightValue,
    setNonFiscalFreightValue,
    nonFiscalOtherExpensesMode,
    setNonFiscalOtherExpensesMode,
    nonFiscalOtherExpensesValue,
    setNonFiscalOtherExpensesValue,
    receiptDate,
    setReceiptDate,
    invoiceNumber,
    invoiceDate,
    fiscalKey,
    setFiscalKey,
    attachments,
    setAttachments,
    observations,
    setObservations,
    isSaving,
    isEditingReceipt,
    isAttachingInboundDocument,
    isDraftSaved,
    receiptIndex,
    processedItems,
    totalValue,
    baseValueForRateio,
    handleFinalize,
    handleClose,
    handleInboundItemChange,
  };
}
