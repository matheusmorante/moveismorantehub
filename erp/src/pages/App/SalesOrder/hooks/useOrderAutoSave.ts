import { useState, useRef, useEffect } from 'react';
import Order from '../../../types/order.type';
import Item from '../../../types/items.type';
import Shipping from '../../../types/Shipping.type';
import Payment from '../../../types/payments.type';
import CustomerData from '../../../types/customerData.type';
import { saveOrder } from '../../../utils/orderHistoryService';

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
    currentOrderId: string | undefined,
    orderIndex: number | null,
    getOrderData: (newStatus?: 'draft' | 'scheduled' | 'fulfilled' | 'cancelled') => Order,
    setCurrentOrderId: (id: string | undefined) => void,
    latestStateRef: React.MutableRefObject<any>
) {
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const autoSaveTimerRef = useRef<any>(null);
    const isInitialMount = useRef(true);

    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Disable auto-save for already finalized orders (not draft)
        if (status !== 'draft' && currentOrderId) return;

        // Não executa auto-save sem código válido gerado
        if (!latestStateRef.current.orderIndex) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        // Check if there's any meaningful changes from the default state
        const isDefaultState = (() => {
            if (customerData.fullName || customerData.phone || customerData.fullAddress.street || customerData.fullAddress.cep) return false;
            if (items.length > 1) return false;
            if (items.length === 1 && (items[0].description !== '' || items[0].unitPrice !== 0)) return false;
            if (shipping.value !== 0 || shipping.distance !== undefined || shipping.scheduling.date !== '' || shipping.scheduling.notInformed) return false;
            if (payments.length > 1) return false;
            if (payments.length === 1 && payments[0].amount !== 0) return false;
            if (observation !== '' || seller !== '' || (marketingOrigin !== 'organic' && marketingOrigin !== 'Direto na Loja')) return false;

            return true;
        })();

        if (isDefaultState) return;

        const isSavingRef = { current: false };

        autoSaveTimerRef.current = setTimeout(async () => {
            if (latestStateRef.current.isSaving || latestStateRef.current.isSavingDraft || isSavingRef.current) return;
            
            if (!latestStateRef.current.orderIndex) {
                console.warn("[useOrderAutoSave] Auto-save bloqueado: pedido sem código.");
                return;
            }

            const currentStatus = latestStateRef.current.status;
            const saveStatus = (currentStatus === 'draft' || !latestStateRef.current.currentOrderId) ? 'draft' : currentStatus;
            const draft = getOrderData(saveStatus as any); 
            try {
                isSavingRef.current = true;
                setIsSavingDraft(true);
                const savedId = await saveOrder(draft);
                if (!latestStateRef.current.currentOrderId && savedId) {
                    setCurrentOrderId(savedId);
                }
            } catch (error) {
                console.error("Erro no salvamento automático:", error);
            } finally {
                isSavingRef.current = false;
                setTimeout(() => setIsSavingDraft(false), 1000);
            }
        }, 3000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [items, shipping, payments, customerData, observation, seller, marketingOrigin, orderDate, getOrderData, status, currentOrderId, orderIndex, setCurrentOrderId, latestStateRef]);

    return {
        isSavingDraft,
        setIsSavingDraft,
        autoSaveTimerRef,
    };
}
