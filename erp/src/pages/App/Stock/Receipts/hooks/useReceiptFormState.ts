import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'react-toastify';
import type Person from '@/pages/types/person.type';
import type Purchase from '@/pages/types/purchase.type';
import type { PurchaseItem } from '@/pages/types/purchase.type';
import type { GoodsReceipt } from '@/pages/utils/goodsReceiptService';
import { subscribeToPeople } from '@/pages/utils/personService';
import type { InboundInvoice } from '@/pages/utils/inboundNfe/inboundNfeTypes';
import type { InboundReceiptItem } from '../components/InboundNfeItemsSection';
import { convertInboundToPurchaseItems } from '../utils/inboundToPurchaseConverter';
import { adaptInboundInvoiceToReceiptState } from '../utils/inboundInvoiceToReceiptAdapter';

interface UseReceiptFormStateParams {
  isOpen: boolean;
  initialReceipt?: GoodsReceipt | null;
  copyReceipt: boolean;
  initialInboundInvoice?: InboundInvoice | null;
  initialPurchase?: Purchase | null;
  isEditingReceipt: boolean;
}

export function useReceiptFormState({
  isOpen,
  initialReceipt,
  copyReceipt,
  initialInboundInvoice,
  initialPurchase,
  isEditingReceipt,
}: UseReceiptFormStateParams) {
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

  const [nonFiscalFreightMode, setNonFiscalFreightMode] = useState<'percent' | 'fixed'>('percent');
  const [nonFiscalFreightValue, setNonFiscalFreightValue] = useState<number>(0);
  const [nonFiscalOtherExpensesMode, setNonFiscalOtherExpensesMode] = useState<'percent' | 'fixed'>(
    'percent'
  );
  const [nonFiscalOtherExpensesValue, setNonFiscalOtherExpensesValue] = useState<number>(0);

  const [fiscalIpi, setFiscalIpi] = useState<number>(0);
  const [fiscalFreight, setFiscalFreight] = useState<number>(0);
  const [fiscalDiscount, setFiscalDiscount] = useState<number>(0);
  const [fiscalOtherExpenses, setFiscalOtherExpenses] = useState<number>(0);

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

  return {
    suppliers,
    draftId,
    draftIdRef,
    setDraftId,
    activeDraftWriteRef,
    finalizingRef,
    completedRef,
    persistDraftRef,
    receiptIndex,
    setReceiptIndex,
    sourcePurchaseId,
    setSourcePurchaseId,
    supplierId,
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
    fiscalIpi,
    fiscalFreight,
    fiscalDiscount,
    fiscalOtherExpenses,
    receiptDate,
    setReceiptDate,
    defaultReceiptDateRef,
    invoiceNumber,
    invoiceDate,
    setInvoiceDate,
    isSaving,
    setIsSaving,
    isAttachingInboundDocument,
    fiscalKey,
    setFiscalKey,
    attachments,
    setAttachments,
    observations,
    setObservations,
    isDraftSaved,
    autoSaveTimerRef,
  };
}
