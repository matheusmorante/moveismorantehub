import { useState, useRef, useEffect, useCallback } from 'react';
import Order from '@/pages/types/order.type';
import Item from '@/pages/types/items.type';
import Shipping from '@/pages/types/Shipping.type';
import type { Payment } from '@/pages/types/payments.type';
import CustomerData from '@/pages/types/customerData.type';
import type { ValidationErrors } from '@/pages/utils/validations';
import { saveOrder } from '@/pages/utils/orderHistoryService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { orderDraftFormSchema } from '../../../../../../shared-utils/orderDomainValidation';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';
import type { z } from 'zod';

export type DraftAutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

const serializeOrderContent = (order: Partial<Order>): string => {
  const { id: _id, status: _status, ...content } = order;
  const normalize = (value: unknown): unknown => {
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) return value.map(normalize);
    if (value && typeof value === 'object') {
      return Object.fromEntries(
        Object.entries(value).sort(([left], [right]) => left.localeCompare(right))
          .map(([key, entry]) => [key, normalize(entry)])
      );
    }
    return value;
  };
  return JSON.stringify(normalize(content)) ?? '';
};

export function useOrderAutoSave(
  items: Item[],
  shipping: Shipping,
  payments: Payment[],
  customerData: CustomerData,
  observation: string,
  seller: string,
  marketingOrigin: string,
  orderDate: string,
  status: string,
  orderIndex: number | null,
  getOrderData: (newStatus?: Order['status']) => Order,
  setCurrentOrderId: (id: string | undefined) => void,
  latestStateRef: React.MutableRefObject<any>,
  isDraftAutoSaveEnabled: boolean,
  draftClassification?: unknown,
  additionalDraftFields?: unknown,
  ensureOrderCode?: () => Promise<number | null>,
  setErrors?: React.Dispatch<React.SetStateAction<ValidationErrors>>
) {
  const [draftAutoSaveStatus, setDraftAutoSaveStatus] = useState<DraftAutoSaveStatus>('idle');
  const [resumeRevision, setResumeRevision] = useState(0);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveWarningTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeSavePromiseRef = useRef<Promise<boolean> | null>(null);
  const activeSignatureRef = useRef<string | null>(null);
  const creationKeyRef = useRef<string | undefined>(undefined);
  const savedDraftContentSignatureRef = useRef<string | null>(null);
  const resetBaselineRef = useRef(false);
  const generationRef = useRef(0);
  const signature = JSON.stringify({
    items, shipping, payments, customerData, observation, seller, marketingOrigin, orderDate,
    draftClassification, additionalDraftFields,
  });
  const latestSignatureRef = useRef(signature);
  const savedSignatureRef = useRef(signature);
  const enabledRef = useRef(isDraftAutoSaveEnabled);
  const ensureOrderCodeRef = useRef(ensureOrderCode);
  latestSignatureRef.current = signature;
  enabledRef.current = isDraftAutoSaveEnabled;
  ensureOrderCodeRef.current = ensureOrderCode;
  const { validateAndRun: validateOrderDraft } = useZodForm(orderDraftFormSchema, {
    status: 'draft', date: orderDate, seller, items, shipping, payments, customerData,
  });

  useEffect(() => () => {
    if (saveWarningTimerRef.current) clearTimeout(saveWarningTimerRef.current);
  }, []);

  const cancelAutoSave = useCallback(() => {
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }
  }, []);

  const markLoadedDraftBaseline = useCallback(() => {
    cancelAutoSave();
    generationRef.current += 1;
    creationKeyRef.current = undefined;
    savedDraftContentSignatureRef.current = null;
    resetBaselineRef.current = true;
  }, [cancelAutoSave]);

  const getDraftCreationKey = useCallback(() => creationKeyRef.current, []);

  const getSavedDraftIdForOrder = useCallback((order: Order): string | undefined => {
    const orderId = latestStateRef.current.currentOrderId as string | undefined;
    if (
      !orderId ||
      order.id !== orderId ||
      order.is_test === true ||
      latestStateRef.current.status !== 'draft' ||
      latestSignatureRef.current !== savedSignatureRef.current ||
      savedDraftContentSignatureRef.current !== serializeOrderContent(order)
    ) {
      return undefined;
    }
    return orderId;
  }, [latestStateRef]);

  const resumeAutoSave = useCallback(() => setResumeRevision((current) => current + 1), []);

  const waitForActiveSave = useCallback(async (): Promise<boolean> => {
    cancelAutoSave();
    if (!activeSavePromiseRef.current) return true;
    const result = await withTimeout<boolean | null>(
      activeSavePromiseRef.current, 15000, null, 'pedido:confirmar-rascunho'
    );
    if (result === null) setDraftAutoSaveStatus('error');
    return result === true;
  }, [cancelAutoSave]);

  const saveLatestDraft = useCallback(async (): Promise<boolean> => {
    while (activeSavePromiseRef.current) await activeSavePromiseRef.current;

    if (!enabledRef.current || latestStateRef.current.status !== 'draft') return true;
    if (latestStateRef.current.isSaving || latestStateRef.current.submissionInFlight) {
      setDraftAutoSaveStatus('idle');
      return false;
    }

    const saveSignature = latestSignatureRef.current;
    if (saveSignature === savedSignatureRef.current) {
      setDraftAutoSaveStatus((current) => current === 'pending' ? 'idle' : current);
      return true;
    }
    if (!latestStateRef.current.orderIndex && !latestStateRef.current.currentOrderId && !latestStateRef.current.isTestMode) {
      setDraftAutoSaveStatus('error');
      return false;
    }

    const generation = generationRef.current;
    let draft: Order;
    try {
      draft = getOrderData('draft');
    } catch (error) {
      console.error('Erro ao preparar o rascunho:', error);
      setDraftAutoSaveStatus('error');
      return false;
    }
    if (!draft.id && !creationKeyRef.current) creationKeyRef.current = crypto.randomUUID();
    const creationKey = creationKeyRef.current;
    activeSignatureRef.current = saveSignature;
    setDraftAutoSaveStatus('saving');
    const warningTimer = setTimeout(() => {
      if (generation === generationRef.current && activeSignatureRef.current === saveSignature) {
        setDraftAutoSaveStatus('error');
      }
    }, 15000);
    saveWarningTimerRef.current = warningTimer;
    const pending = (async () => {
      try {
        let validatedDraftContentSignature: string | null = null;
        const savedId = await validateOrderDraft(
          draft as unknown as z.input<typeof orderDraftFormSchema>,
          (data) => {
            const orderToSave = data as unknown as Order;
            validatedDraftContentSignature = serializeOrderContent(orderToSave);
            return data.id || !creationKey
              ? saveOrder(orderToSave)
              : saveOrder(orderToSave, { idempotencyKey: creationKey });
          },
          (errors) => {
            const fields = Object.fromEntries(
              Object.entries(flattenFormErrors(errors)).map(([key, message]) => [
                key.replace(/^items_(\d+)_/, 'item_$1_').replace(/^payments_(\d+)_/, 'payment_$1_'),
                message,
              ])
            );
            setErrors?.((previous) => ({ ...previous, ...fields }));
          }
        );
        if (!savedId) throw new Error('Confira os campos inválidos do rascunho.');
        if (generation === generationRef.current) {
          savedSignatureRef.current = saveSignature;
          savedDraftContentSignatureRef.current = validatedDraftContentSignature;
          if (!latestStateRef.current.currentOrderId) {
            latestStateRef.current.currentOrderId = savedId;
            setCurrentOrderId(savedId);
          }
          setDraftAutoSaveStatus(
            saveSignature === latestSignatureRef.current ? 'saved' : 'pending'
          );
        }
        return true;
      } catch (error) {
        console.error('Erro no salvamento automático:', error);
        if (generation === generationRef.current) {
          setDraftAutoSaveStatus(
            saveSignature === latestSignatureRef.current ? 'error' : 'pending'
          );
        }
        return false;
      } finally {
        clearTimeout(warningTimer);
        if (saveWarningTimerRef.current === warningTimer) saveWarningTimerRef.current = null;
        activeSignatureRef.current = null;
        activeSavePromiseRef.current = null;
      }
    })();
    activeSavePromiseRef.current = pending;
    return pending;
  }, [getOrderData, latestStateRef, setCurrentOrderId, setErrors, validateOrderDraft]);

  const flushDraftAutoSave = useCallback(async (): Promise<boolean> => {
    cancelAutoSave();
    const flush = (async () => {
      while (enabledRef.current && latestStateRef.current.status === 'draft') {
        while (activeSavePromiseRef.current) {
          if (!(await activeSavePromiseRef.current)) return false;
        }
        if (latestSignatureRef.current === savedSignatureRef.current) return true;
        if (!latestStateRef.current.orderIndex && !latestStateRef.current.currentOrderId && !latestStateRef.current.isTestMode) {
          const code = await ensureOrderCode?.();
          if (!code) {
            setDraftAutoSaveStatus('error');
            return false;
          }
        }
        if (!(await saveLatestDraft())) return false;
      }
      return true;
    })();
    const result = await withTimeout<boolean | null>(flush, 15000, null, 'pedido:salvar-antes-de-fechar');
    if (result === null) setDraftAutoSaveStatus('error');
    return result === true;
  }, [cancelAutoSave, ensureOrderCode, latestStateRef, saveLatestDraft]);

  useEffect(() => {
    cancelAutoSave();

    if (resetBaselineRef.current) {
      resetBaselineRef.current = false;
      savedSignatureRef.current = signature;
      setDraftAutoSaveStatus('idle');
      return;
    }

    if (!isDraftAutoSaveEnabled || status !== 'draft') {
      savedSignatureRef.current = signature;
      setDraftAutoSaveStatus('idle');
      return;
    }

    const isDirty = signature !== savedSignatureRef.current ||
      (activeSignatureRef.current !== null && activeSignatureRef.current !== signature);
    if (!isDirty) {
      if (!activeSavePromiseRef.current) {
        setDraftAutoSaveStatus((current) => current === 'pending' ? 'idle' : current);
      }
      return;
    }

    setDraftAutoSaveStatus('pending');
    autoSaveTimerRef.current = setTimeout(() => {
      autoSaveTimerRef.current = null;
      void (async () => {
        const generation = generationRef.current;
        if (!latestStateRef.current.orderIndex && !latestStateRef.current.currentOrderId && !latestStateRef.current.isTestMode) {
          try {
            const code = await withTimeout(
              ensureOrderCodeRef.current?.() ?? Promise.resolve(null), 15000, null, 'pedido:codigo-do-rascunho'
            );
            if (generation !== generationRef.current) return;
            if (!code) {
              setDraftAutoSaveStatus('error');
              return;
            }
          } catch (error) {
            if (generation !== generationRef.current) return;
            console.error('Erro ao gerar código para o rascunho:', error);
            setDraftAutoSaveStatus('error');
            return;
          }
        }
        await saveLatestDraft();
      })();
    }, 3000);
    return cancelAutoSave;
  }, [
    signature, status, orderIndex, isDraftAutoSaveEnabled, resumeRevision,
    cancelAutoSave, latestStateRef, saveLatestDraft,
  ]);

  return {
    isSavingDraft: draftAutoSaveStatus === 'saving',
    draftAutoSaveStatus,
    autoSaveTimerRef,
    waitForActiveSave,
    cancelAutoSave,
    flushDraftAutoSave,
    markLoadedDraftBaseline,
    getSavedDraftIdForOrder,
    resumeAutoSave,
    getDraftCreationKey,
  };
}
