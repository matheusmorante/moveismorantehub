import { useState, useRef, useEffect } from 'react';
import Order from '@/pages/types/order.type';
import Item from '@/pages/types/items.type';
import Shipping from '@/pages/types/Shipping.type';
import type { Payment } from '@/pages/types/payments.type';
import CustomerData from '@/pages/types/customerData.type';
import { saveOrder } from '@/pages/utils/orderHistoryService';

export type DraftAutoSaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error';

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
  getOrderData: (newStatus?: 'draft' | 'scheduled' | 'fulfilled' | 'cancelled') => Order,
  setCurrentOrderId: (id: string | undefined) => void,
  latestStateRef: React.MutableRefObject<any>,
  isDraftAutoSaveEnabled: boolean
) {
  const [draftAutoSaveStatus, setDraftAutoSaveStatus] = useState<DraftAutoSaveStatus>('idle');
  const autoSaveTimerRef = useRef<any>(null);
  const isInitialMount = useRef(true);
  const isSavingRef = useRef(false);
  const saveRevisionRef = useRef(0);
  const isSavingDraft = draftAutoSaveStatus === 'saving';

  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    if (!isDraftAutoSaveEnabled || status !== 'draft') {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
      setDraftAutoSaveStatus('idle');
      return;
    }

    // Não executa auto-save sem código válido gerado
    if (!latestStateRef.current.orderIndex) {
      setDraftAutoSaveStatus('idle');
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    // Check if there's any meaningful changes from the default state
    const isDefaultState = (() => {
      if (
        customerData.fullName ||
        customerData.phone ||
        customerData.fullAddress.street ||
        customerData.fullAddress.cep
      )
        return false;
      if (items.length > 1) return false;
      if (items.length === 1 && (items[0].description !== '' || items[0].unitPrice !== 0))
        return false;
      if (
        shipping.value !== 0 ||
        shipping.distance !== undefined ||
        shipping.scheduling.date !== '' ||
        shipping.scheduling.notInformed
      )
        return false;
      if (payments.length > 1) return false;
      if (payments.length === 1 && payments[0].amount !== 0) return false;
      if (
        observation !== '' ||
        seller !== '' ||
        (marketingOrigin !== 'organic' && marketingOrigin !== 'Direto na Loja')
      )
        return false;

      return true;
    })();

    if (isDefaultState) {
      setDraftAutoSaveStatus('idle');
      return;
    }

    saveRevisionRef.current += 1;
    setDraftAutoSaveStatus('pending');

    const saveDraft = async () => {
      if (latestStateRef.current.status !== 'draft') {
        setDraftAutoSaveStatus('idle');
        return;
      }

      if (latestStateRef.current.isSaving || isSavingRef.current) {
        setDraftAutoSaveStatus('pending');
        autoSaveTimerRef.current = setTimeout(saveDraft, 250);
        return;
      }

      if (!latestStateRef.current.orderIndex) {
        console.warn('[useOrderAutoSave] Auto-save bloqueado: pedido sem código.');
        setDraftAutoSaveStatus('error');
        return;
      }

      const draft = getOrderData('draft');
      const saveRevision = saveRevisionRef.current;
      try {
        isSavingRef.current = true;
        setDraftAutoSaveStatus('saving');
        const savedId = await saveOrder(draft);
        if (!latestStateRef.current.currentOrderId && savedId) {
          setCurrentOrderId(savedId);
        }
        setDraftAutoSaveStatus(saveRevision === saveRevisionRef.current ? 'saved' : 'pending');
      } catch (error) {
        console.error('Erro no salvamento automático:', error);
        setDraftAutoSaveStatus(saveRevision === saveRevisionRef.current ? 'error' : 'pending');
      } finally {
        isSavingRef.current = false;
      }
    };

    autoSaveTimerRef.current = setTimeout(saveDraft, 3000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    items,
    shipping,
    payments,
    customerData,
    observation,
    seller,
    marketingOrigin,
    orderDate,
    getOrderData,
    status,
    orderIndex,
    setCurrentOrderId,
    latestStateRef,
    isDraftAutoSaveEnabled,
  ]);

  return {
    isSavingDraft,
    draftAutoSaveStatus,
    autoSaveTimerRef,
  };
}
