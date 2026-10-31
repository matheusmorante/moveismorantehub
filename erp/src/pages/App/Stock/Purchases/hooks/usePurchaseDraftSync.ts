import { useState, useEffect, useRef, useCallback } from 'react';
import Purchase, { PurchaseItem } from '../../../../types/purchase.type';
import Person from '../../../../types/person.type';
import { savePurchase, updatePurchaseDraft } from '../../../../utils/purchaseService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { purchaseDraftFormSchema } from '../../../../../../../shared-utils/purchaseFormSchemas';

export type PurchaseDraft = Omit<Purchase, 'status'> & { status: 'draft' };

export interface UsePurchaseDraftSyncProps {
  readonly isOpen: boolean;
  readonly isDraftSession: boolean;
  readonly activePurchase?: Purchase | null;
  readonly selectedSupplierId: string;
  readonly purchaseDate: string;
  readonly processedItems: readonly PurchaseItem[];
  readonly totalValue: number;
  readonly discountPercent: number;
  readonly ipiPercent: number;
  readonly freightPercent: number;
  readonly attachments: readonly string[];
  readonly suppliers: readonly Person[];
  readonly actionRef: React.MutableRefObject<boolean>;
  readonly completedRef: React.MutableRefObject<boolean>;
}

/**
 * Sub-hook responsável pelo ciclo de vida, persistência e auto-save com debounce de 3000ms
 * para rascunhos de pedidos de compra no ERP.
 */
export function usePurchaseDraftSync({
  isOpen,
  isDraftSession,
  activePurchase,
  selectedSupplierId,
  purchaseDate,
  processedItems,
  totalValue,
  discountPercent,
  ipiPercent,
  freightPercent,
  attachments,
  suppliers,
  actionRef,
  completedRef,
}: UsePurchaseDraftSyncProps) {
  const [draftId, setDraftIdState] = useState<string | null>(null);
  const draftIdRef = useRef<string | null>(null);
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const hasDraftChangesRef = useRef(false);
  const draftRevisionRef = useRef(0);
  const autoSaveTimerRef = useRef<number | null>(null);
  const [draftError, setDraftError] = useState('');
  const [isAutoSaving, setIsAutoSaving] = useState(false);

  const pendingDraftRef = useRef<Promise<unknown>>(Promise.resolve());
  const savedItemsSignatureRef = useRef('[]');
  const attachmentsSignatureRef = useRef(JSON.stringify(attachments));
  const pendingAttachmentSignatureRef = useRef<string | null>(null);
  const currentAttachmentsRef = useRef(attachments);
  currentAttachmentsRef.current = attachments;

  const setDraftId = useCallback((id: string | null) => {
    draftIdRef.current = id;
    setDraftIdState(id);
  }, []);

  const markDraftChanged = useCallback(() => {
    hasDraftChangesRef.current = true;
    draftRevisionRef.current += 1;
    setHasDraftChanges(true);
    setDraftError('');
  }, []);

  const { enqueueAndRun: validateDraft } = useZodForm(purchaseDraftFormSchema, {
    supplierId: selectedSupplierId,
    supplierName: '',
    date: purchaseDate,
    status: 'draft',
    items: [],
    totalValue: 0,
    discountPercent: 0,
  });

  const resetDraftState = useCallback((purchase?: Purchase | null) => {
    hasDraftChangesRef.current = false;
    draftRevisionRef.current = 0;
    setHasDraftChanges(false);
    setDraftError('');
    setIsAutoSaving(false);
    pendingDraftRef.current = Promise.resolve();

    const initialAttachments = purchase?.attachments || [];
    const initialSignature = JSON.stringify(initialAttachments);
    pendingAttachmentSignatureRef.current =
      JSON.stringify(currentAttachmentsRef.current) === initialSignature ? null : initialSignature;
    attachmentsSignatureRef.current = initialSignature;
    savedItemsSignatureRef.current = JSON.stringify(purchase?.items || []);
    setDraftId(purchase?.status === 'draft' ? purchase.id || null : null);
  }, [setDraftId]);

  // Monitora alterações nos anexos sem disparar dirty indevidamente na carga inicial
  useEffect(() => {
    const signature = JSON.stringify(attachments);
    if (pendingAttachmentSignatureRef.current !== null) {
      if (signature === pendingAttachmentSignatureRef.current) {
        pendingAttachmentSignatureRef.current = null;
        attachmentsSignatureRef.current = signature;
      }
      return;
    }
    if (signature === attachmentsSignatureRef.current) return;
    attachmentsSignatureRef.current = signature;
    markDraftChanged();
  }, [attachments, markDraftChanged]);

  const persistDraft = useCallback(
    (payload: PurchaseDraft, allowDuringAction = false) => {
      const write = pendingDraftRef.current.then(() =>
        validateDraft(
          payload,
          async (values) => {
            if (completedRef.current || (actionRef.current && !allowDuringAction)) return false;
            const itemsSignature = JSON.stringify(values.items);
            if (draftIdRef.current) {
              const updates = { ...values } as Purchase;
              if (itemsSignature === savedItemsSignatureRef.current) {
                delete (updates as Partial<Purchase>).items;
              }
              await updatePurchaseDraft(draftIdRef.current, updates);
            } else {
              const savedId = await savePurchase(values as Purchase);
              if (!savedId) throw new Error('Não foi possível salvar o rascunho da compra.');
              setDraftId(savedId);
            }
            savedItemsSignatureRef.current = itemsSignature;
            setDraftError('');
            return true;
          },
          (errors) => setDraftError(Object.values(flattenFormErrors(errors))[0])
        )
      );
      pendingDraftRef.current = write.catch(() => undefined);
      return write;
    },
    [validateDraft, setDraftId, actionRef, completedRef]
  );

  const buildDraftPayload = useCallback(() => {
    const supplier = suppliers.find((item) => item.id === selectedSupplierId);
    return {
      supplierId: selectedSupplierId,
      supplierName: supplier?.fullName || activePurchase?.supplierName || 'Fornecedor Rascunho',
      date: new Date(purchaseDate || new Date().toISOString().split('T')[0]).toISOString(),
      items: processedItems,
      totalValue,
      observation: '',
      status: 'draft' as const,
      invoiceNumber: '',
      invoiceDate: '',
      invoiceStatus: activePurchase?.invoiceStatus || ('pending' as const),
      attachments: [...attachments],
      discountPercent,
      ipiPercent,
      freightPercent,
    } satisfies PurchaseDraft;
  }, [
    suppliers,
    selectedSupplierId,
    activePurchase?.supplierName,
    activePurchase?.invoiceStatus,
    purchaseDate,
    processedItems,
    totalValue,
    attachments,
    discountPercent,
    ipiPercent,
    freightPercent,
  ]);

  // Auto-save com debounce de 3000ms
  useEffect(() => {
    if (!isOpen || !isDraftSession || !hasDraftChanges) return;
    if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current);
    const revision = draftRevisionRef.current;
    autoSaveTimerRef.current = window.setTimeout(async () => {
      setIsAutoSaving(true);
      try {
        const write = persistDraft(buildDraftPayload());
        const result = await write;
        if (!result && !actionRef.current) throw new Error('Confira os campos do rascunho.');
        if (result && revision === draftRevisionRef.current) {
          hasDraftChangesRef.current = false;
          setHasDraftChanges(false);
        }
      } catch (error: unknown) {
        console.error('Erro ao salvar rascunho automático:', error);
        setDraftError('Não foi possível salvar o rascunho da compra.');
      } finally {
        setIsAutoSaving(false);
      }
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current !== null) window.clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    };
  }, [
    isOpen,
    isDraftSession,
    hasDraftChanges,
    buildDraftPayload,
    persistDraft,
    actionRef,
  ]);

  return {
    draftId,
    setDraftId,
    hasDraftChanges,
    setHasDraftChanges,
    hasDraftChangesRef,
    draftRevisionRef,
    autoSaveTimerRef,
    pendingDraftRef,
    draftError,
    setDraftError,
    isAutoSaving,
    markDraftChanged,
    persistDraft,
    buildDraftPayload,
    resetDraftState,
    draftIdRef,
  };
}
