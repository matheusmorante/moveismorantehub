import { useState, useEffect, useRef, useCallback } from 'react';
import { flattenFormErrors, useZodForm } from '../../../../hooks/useZodForm';
import { mobilePurchaseDraftFormSchema } from '../../../../../../shared-utils/purchaseFormSchemas';
import {
  MobilePurchase,
  MobilePurchaseItem,
  saveMobilePurchase,
  updateMobilePurchase,
} from '../mobilePurchaseService';
import { parseNumber } from './useMobilePurchaseItems';

export type DraftSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

export interface UseMobilePurchaseDraftOptions {
  readonly visible: boolean;
  readonly purchase?: MobilePurchase | null;
  readonly buildDraftPayload: () => any;
  readonly actionRef: React.MutableRefObject<boolean>;
}

/**
 * Sub-hook responsável pelo ciclo de vida do rascunho de compra no mobile:
 * auto-save com debounce de 3000ms, tracking de dirty/revision e persistência atômica.
 */
export function useMobilePurchaseDraft({
  visible,
  purchase,
  buildDraftPayload,
  actionRef,
}: UseMobilePurchaseDraftOptions) {
  const isDraftSession = !purchase?.id || purchase.status === 'draft';
  const [hasDraftChanges, setHasDraftChanges] = useState(false);
  const [draftSaveStatus, setDraftSaveStatus] = useState<DraftSaveStatus>('idle');

  const dirtyRef = useRef(false);
  const revisionRef = useRef(0);
  const draftIdRef = useRef<string | null>(null);
  const pendingDraftRef = useRef<Promise<unknown>>(Promise.resolve());
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedItemsSignatureRef = useRef('[]');

  const markDraftChanged = useCallback(() => {
    dirtyRef.current = true;
    revisionRef.current += 1;
    setHasDraftChanges(true);
    setDraftSaveStatus('pending');
  }, []);

  const draftForm = useZodForm(mobilePurchaseDraftFormSchema, {
    supplierId: '',
    supplierName: '',
    date: new Date().toISOString().slice(0, 10),
    observation: '',
    items: [],
    totalValue: 0,
    status: 'draft',
    discountInput: '0',
    ipiInput: '0',
    freightInput: '0',
  });

  // Inicialização / Reset ao alternar modal ou compra
  useEffect(() => {
    if (!visible) {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
      return;
    }

    dirtyRef.current = false;
    revisionRef.current = 0;
    setHasDraftChanges(false);
    setDraftSaveStatus(purchase?.status === 'draft' ? 'saved' : 'idle');
    draftIdRef.current = purchase?.status === 'draft' ? purchase.id : null;
    lastSavedItemsSignatureRef.current = JSON.stringify(purchase?.items || []);
    pendingDraftRef.current = Promise.resolve();

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    };
  }, [visible, purchase]);

  const persistDraft = useCallback(
    (payload: any, allowDuringAction = false) => {
      const write = pendingDraftRef.current.then(async () => {
        const result = await draftForm.enqueueAndRun(
          payload,
          async (values) => {
            if (!isDraftSession || (actionRef.current && !allowDuringAction)) return false;
            const validatedItems = values.items.map((item) => ({
              ...item,
              baseCost: Number(item.baseCost ?? item.unitCost ?? 0),
            })) as MobilePurchaseItem[];
            const itemSignature = JSON.stringify(validatedItems);
            const persistedValues = {
              supplierId: values.supplierId || undefined,
              supplierName: values.supplierName,
              date: new Date(`${values.date}T12:00:00`).toISOString(),
              observation: values.observation,
              discountPercent: values.discountPercent ?? parseNumber(values.discountInput),
              ipiPercent: parseNumber(values.ipiInput),
              freightPercent: parseNumber(values.freightInput),
              items: validatedItems,
              totalValue: values.totalValue,
              status: values.status,
              stockProcessed: purchase?.stockProcessed || false,
              attachments: values.attachments || [],
              invoiceNumber: purchase?.invoiceNumber,
              invoiceDate: purchase?.invoiceDate,
              invoiceStatus: purchase?.invoiceStatus,
              fiscalKey: purchase?.fiscalKey,
            };
            if (draftIdRef.current) {
              const updates = {
                ...persistedValues,
                ...(itemSignature !== lastSavedItemsSignatureRef.current ? { items: validatedItems } : { items: undefined }),
              };
              await updateMobilePurchase(draftIdRef.current, updates, { fetchAfterUpdate: false });
            } else {
              const saved = await saveMobilePurchase(persistedValues as Omit<MobilePurchase, 'id'>);
              draftIdRef.current = saved.id;
            }
            lastSavedItemsSignatureRef.current = itemSignature;
            return true;
          },
          (errors) => {
            setDraftSaveStatus('error');
            console.warn('[Purchases] Rascunho inválido:', Object.keys(flattenFormErrors(errors)));
          }
        );
        return result === true;
      });
      pendingDraftRef.current = write.catch(() => false);
      return write;
    },
    [draftForm.enqueueAndRun, isDraftSession, purchase, actionRef]
  );

  // Auto-save com debounce de 3000ms
  useEffect(() => {
    if (!visible || !isDraftSession || !hasDraftChanges) return;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const revision = revisionRef.current;
    autoSaveTimerRef.current = setTimeout(async () => {
      setDraftSaveStatus('saving');
      try {
        const result = await persistDraft(buildDraftPayload());
        if (!result && !actionRef.current) {
          setDraftSaveStatus('error');
          return;
        }
        if (result && revision === revisionRef.current) {
          dirtyRef.current = false;
          setHasDraftChanges(false);
          setDraftSaveStatus('saved');
        } else if (result) {
          setDraftSaveStatus('pending');
        }
      } catch (cause) {
        console.error('[Purchases] Falha ao salvar rascunho:', cause);
        setDraftSaveStatus('error');
      }
    }, 3000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    };
  }, [
    visible,
    isDraftSession,
    hasDraftChanges,
    persistDraft,
    buildDraftPayload,
    actionRef,
  ]);

  return {
    isDraftSession,
    hasDraftChanges,
    setHasDraftChanges,
    draftSaveStatus,
    setDraftSaveStatus,
    dirtyRef,
    revisionRef,
    draftIdRef,
    pendingDraftRef,
    autoSaveTimerRef,
    markDraftChanged,
    persistDraft,
  };
}
