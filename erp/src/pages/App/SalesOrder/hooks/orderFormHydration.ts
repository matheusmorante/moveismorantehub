import type { Dispatch, MutableRefObject, SetStateAction } from 'react';
import type Order from '@/pages/types/order.type';
import type { AssistanceItem } from '@/pages/types/order.type';
import type Item from '@/pages/types/items.type';
import type Shipping from '@/pages/types/Shipping.type';
import type CustomerData from '@/pages/types/customerData.type';
import type { Payment } from '@/pages/types/payments.type';
import type { SchedulingSessionMemory } from '../ShippingComponents/Agendamento';
import { prepareOrderForFormEditing } from './orderFormSnapshot';

interface OrderFormHydrationParams {
  autoSaveExistingDrafts: boolean;
  cancelPendingDistanceCalculation: () => void;
  schedulingSessionRef: MutableRefObject<SchedulingSessionMemory | null>;
  resetItemHandlingMemory: (method: Shipping['deliveryMethod'], items: Item[]) => void;
  setIsDraftAutoSaveEnabled: Dispatch<SetStateAction<boolean>>;
  setOrderIndex: Dispatch<SetStateAction<number | null>>;
  setCurrentOrderId: Dispatch<SetStateAction<string | undefined>>;
  latestState: MutableRefObject<any>;
  generateCodeForCopyOrNew: () => Promise<number | null>;
  setItems: Dispatch<SetStateAction<Item[]>>;
  setShipping: Dispatch<SetStateAction<Shipping>>;
  setPayments: Dispatch<SetStateAction<Payment[]>>;
  setCustomerData: Dispatch<SetStateAction<CustomerData>>;
  setObservation: Dispatch<SetStateAction<string>>;
  setSeller: Dispatch<SetStateAction<string>>;
  setSellerId: Dispatch<SetStateAction<string | undefined>>;
  setMarketingOrigin: Dispatch<SetStateAction<string>>;
  setStatus: Dispatch<SetStateAction<string>>;
  setOrderType: Dispatch<SetStateAction<Order['orderType']>>;
  setTestModeFields: Dispatch<SetStateAction<Pick<Order, 'is_test' | 'testArtifact'>>>;
  setFiscalContext: Dispatch<SetStateAction<Order['fiscalContext']>>;
  setAssistanceItems: Dispatch<SetStateAction<AssistanceItem[]>>;
  setAssistanceServiceValue: Dispatch<SetStateAction<number>>;
  setAssistanceCost: Dispatch<SetStateAction<number>>;
  setLinkedOrderId: Dispatch<SetStateAction<string>>;
  setIsButtonsClicked: Dispatch<SetStateAction<Order['isButtonsClicked']>>;
  setOrderDate: Dispatch<SetStateAction<string>>;
}

export const hydrateOrderFormForEditing = (
  order: Order,
  {
    autoSaveExistingDrafts,
    cancelPendingDistanceCalculation,
    schedulingSessionRef,
    resetItemHandlingMemory,
    setIsDraftAutoSaveEnabled,
    setOrderIndex,
    setCurrentOrderId,
    latestState,
    generateCodeForCopyOrNew,
    setItems,
    setShipping,
    setPayments,
    setCustomerData,
    setObservation,
    setSeller,
    setSellerId,
    setMarketingOrigin,
    setStatus,
    setOrderType,
    setTestModeFields,
    setFiscalContext,
    setAssistanceItems,
    setAssistanceServiceValue,
    setAssistanceCost,
    setLinkedOrderId,
    setIsButtonsClicked,
    setOrderDate,
  }: OrderFormHydrationParams,
) => {
  cancelPendingDistanceCalculation();
  schedulingSessionRef.current = null;

  const {
    existingIndex,
    isLoadedTestArtifact,
    isExistingOrder,
    loadedStatus,
    normalizedItems,
    normalizedShipping,
    normalizedPayments,
    normalizedCustomerData,
    loadedTestFields,
    formattedDate,
  } = prepareOrderForFormEditing(order);

  resetItemHandlingMemory(normalizedShipping.deliveryMethod, normalizedItems);

  // O fluxo de edição pode exigir salvar usando a versão carregada do pedido.
  setIsDraftAutoSaveEnabled(
    !isExistingOrder || (autoSaveExistingDrafts && loadedStatus === 'draft')
  );

  if (isExistingOrder) {
    const loadedIndex = isLoadedTestArtifact ? null : existingIndex;
    setOrderIndex(loadedIndex);
    setCurrentOrderId(order.id);
    latestState.current.orderIndex = isLoadedTestArtifact ? undefined : existingIndex;
    latestState.current.orderNumber = isLoadedTestArtifact ? undefined : existingIndex;
    latestState.current.currentOrderId = order.id;
  } else {
    setCurrentOrderId(undefined);
    setOrderIndex(null);
    latestState.current.currentOrderId = undefined;
    latestState.current.orderIndex = null;
    generateCodeForCopyOrNew();
  }

  setItems(normalizedItems);
  setShipping(normalizedShipping);
  setPayments(normalizedPayments);
  setCustomerData(normalizedCustomerData);
  setObservation(order.observation || '');
  setSeller((order as any).seller || '');
  setSellerId((order as any).sellerId || undefined);
  setMarketingOrigin(order.marketingOrigin || 'organic');
  setStatus(loadedStatus);
  setOrderType(order.orderType || 'sale');
  setTestModeFields(loadedTestFields);
  const loadedFiscalContext = order.fiscalContext ? { ...order.fiscalContext } : undefined;
  setFiscalContext(loadedFiscalContext);
  latestState.current.fiscalContext = loadedFiscalContext;
  latestState.current.testModeFields = loadedTestFields;
  latestState.current.isTestMode = loadedTestFields.is_test === true;
  setAssistanceItems(order.assistanceItems || []);
  setAssistanceServiceValue(order.assistanceServiceValue || 0);
  setAssistanceCost(order.assistanceCost || 0);
  setLinkedOrderId(order.linkedOrderId || '');
  setIsButtonsClicked(order.isButtonsClicked);
  setOrderDate(formattedDate);
};
