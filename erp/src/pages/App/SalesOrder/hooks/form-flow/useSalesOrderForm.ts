import type React from 'react';
import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Order, { AssistanceItem } from '@/pages/types/order.type';
import useItems from '../items-pricing/useItems';
import useShipping from '../customer-shipping/useShipping';
import usePaymentsData from '../items-pricing/usePayments';
import { useCustomerData } from '../customer-shipping/useCustomerData';
import { calcPaymentsSummary, calcItemsSummary } from '@/pages/utils/sales/calculations';
import { validateBase, ValidationErrors } from '@/pages/utils/sales/validations';
import {
  getCurrentDatetimeLocal,
  parseStorageDateToLocal,
} from './orderDateFormatting';
import { useOrderCodeGenerator } from '../drafts/useOrderCodeGenerator';
import { useOrderDistanceCalculator } from '../customer-shipping/useOrderDistanceCalculator';
import { useOrderProductSelection } from '../items-pricing/useOrderProductSelection';
import { useOrderItemHandlingByDeliveryMethod } from '../customer-shipping/useOrderItemHandlingByDeliveryMethod';
import { useOrderAutoSave } from '../drafts/useOrderAutoSave';
import { useOrderCustomerSelection } from '../customer-shipping/useOrderCustomerSelection';
import { useOrderFormStepNavigation } from './useOrderFormStepNavigation';
import { canCustomerAccessLogistics } from '../../components/customer/customerSelectionRules';
import {
  buildCurrentOrder,
  buildSalesOrderSnapshot,
} from '../drafts/orderFormSnapshot';
import { hydrateOrderFormForEditing } from '../drafts/orderFormHydration';
import { useOrderFormSubmission } from './useOrderFormSubmission';
import type { SchedulingSessionMemory } from '../../ShippingComponents/Agendamento';
import { resolveFirstItemHandlingType } from '../../orderItemHandling';
import { useSalesOrderFormActions } from './useSalesOrderFormActions';

export { parseStorageDateToLocal };

export const useSalesOrderForm = (
  initialDeliveryMethod?: 'delivery' | 'pickup',
  initialOrderType: Order['orderType'] = 'sale',
  options: { autoSaveExistingDrafts?: boolean } = {}
) => {
  const autoSaveExistingDrafts = options.autoSaveExistingDrafts ?? true;
  const { items, setItems } = useItems();
  const { shipping, setShipping } = useShipping(initialDeliveryMethod);
  const { payments, setPayments } = usePaymentsData();
  const { customerData, setCustomerData } = useCustomerData();
  const canAccessLogistics = canCustomerAccessLogistics(customerData);

  const [observation, setObservation] = useState('');
  const [seller, setSeller] = useState('');
  const [sellerId, setSellerId] = useState<string | undefined>(undefined);
  const [marketingOrigin, setMarketingOrigin] = useState('organic');
  const [orderDate, setOrderDate] = useState(() => getCurrentDatetimeLocal());
  const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(undefined);
  const [isNewSaleFlow, setIsNewSaleFlow] = useState(true);
  const [status, setStatus] = useState<string>('draft');
  const [isDraftAutoSaveEnabled, setIsDraftAutoSaveEnabled] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [errors, setErrors] = useState<ValidationErrors>({});
  const [orderType, setOrderType] = useState<Order['orderType']>(initialOrderType);
  const [assistanceItems, setAssistanceItems] = useState<AssistanceItem[]>([]);
  const [assistanceServiceValue, setAssistanceServiceValue] = useState(0);
  const [assistanceCost, setAssistanceCost] = useState(0);
  const [linkedOrderId, setLinkedOrderId] = useState('');
  const [isButtonsClicked, setIsButtonsClicked] = useState<Order['isButtonsClicked']>(undefined);
  const { currentStep, setCurrentStep, goToNextStep, goToPrevStep } =
    useOrderFormStepNavigation(orderType, canAccessLogistics);
  const [testModeFields, setTestModeFields] = useState<Pick<Order, 'is_test' | 'testArtifact'>>({});
  const [fiscalContext, setFiscalContext] = useState<Order['fiscalContext']>();
  const isTestMode = testModeFields.is_test === true;
  const schedulingSessionRef = useRef<SchedulingSessionMemory | null>(null);
  const prevDeliveryMethodRef = useRef(shipping.deliveryMethod);
  const {
    rememberItemHandlings,
    resetItemHandlingMemory,
    setDeliveryMethod,
    setItemsWithHandlingReset,
  } = useOrderItemHandlingByDeliveryMethod({ items, shipping, setItems, setShipping, setErrors });

  const itemsSummary = calcItemsSummary(items);
  const paymentsSummary = calcPaymentsSummary(payments, itemsSummary, shipping.value);

  // Stable state ref for callbacks and async operations
  const latestState = useRef<any>({});

  // Sub-hooks modularizados
  const { orderIndex, setOrderIndex, isGeneratingCode, generateCodeForCopyOrNew, ensureOrderCode } =
    useOrderCodeGenerator(currentOrderId, latestState);

  useEffect(() => {
    latestState.current = {
      currentOrderId,
      isNewSaleFlow,
      orderIndex,
      isGeneratingCode,
      status,
      isDraftAutoSaveEnabled,
      items,
      itemsSummary,
      shipping,
      payments,
      paymentsSummary,
      customerData,
      observation,
      seller,
      sellerId,
      marketingOrigin,
      orderDate,
      isSaving,
      isSavingDraft: false,
      orderType,
      assistanceItems,
      assistanceServiceValue,
      assistanceCost,
      linkedOrderId,
      isButtonsClicked,
      currentStep,
      isTestMode,
      testModeFields,
      fiscalContext,
    };
  });

  const { isCalculatingDistance, handleAutoCalculateDistance, cancelPendingDistanceCalculation } =
    useOrderDistanceCalculator(shipping, customerData, setShipping);
  const handleCustomerDataChange = useOrderCustomerSelection({
    customerData,
    shipping,
    setCustomerData,
    setShipping,
    setErrors,
    handleAutoCalculateDistance,
  });

  const { handleSelectProduct, handleItemChange } = useOrderProductSelection(items, setItems);

  useEffect(() => {
    rememberItemHandlings(shipping.deliveryMethod, items);
  }, [items, rememberItemHandlings, shipping.deliveryMethod]);

  const getOrderData = useCallback(
    (newStatus?: Order['status']): Order =>
      buildSalesOrderSnapshot(
        latestState.current,
        orderIndex,
        schedulingSessionRef.current,
        newStatus
      ),
    [orderIndex]
  );

  const {
    isSavingDraft, draftAutoSaveStatus, waitForActiveSave, cancelAutoSave,
    flushDraftAutoSave, markLoadedDraftBaseline, resumeAutoSave, getOrderCreationKey,
    getSavedDraftIdForOrder,
  } =
    useOrderAutoSave(
      items,
      shipping,
      payments,
      customerData,
      observation,
      seller,
      marketingOrigin,
      orderDate,
      status,
      orderIndex,
      getOrderData,
      setCurrentOrderId,
      latestState,
      isDraftAutoSaveEnabled,
      testModeFields,
      {
        sellerId, orderType, assistanceItems, assistanceServiceValue, assistanceCost,
        linkedOrderId, isButtonsClicked, fiscalContext,
      },
      ensureOrderCode,
      setErrors
    );

  const { handleSaveOrder, handleCompleteOrder } = useOrderFormSubmission({
    orderDate,
    seller,
    orderType,
    items,
    payments,
    shipping,
    customerData,
    latestState,
    getOrderData,
    ensureOrderCode,
    cancelAutoSave,
    waitForActiveSave,
    resumeAutoSave,
    getOrderCreationKey,
    getSavedDraftIdForOrder,
    setIsSaving,
    setCurrentOrderId,
    setStatus,
    setErrors,
    setCurrentStep,
  });

  const loadOrderForEditing = useCallback(
    (order: Order) =>
      hydrateOrderFormForEditing(order, {
        autoSaveExistingDrafts,
        markLoadedDraftBaseline,
        cancelPendingDistanceCalculation,
        schedulingSessionRef,
        resetItemHandlingMemory,
        setIsDraftAutoSaveEnabled,
        setOrderIndex,
        setCurrentOrderId,
        setIsNewSaleFlow,
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
      }),
    [
      setItems,
      setShipping,
      setPayments,
      setCustomerData,
      setOrderIndex,
      setIsNewSaleFlow,
      setIsDraftAutoSaveEnabled,
      generateCodeForCopyOrNew,
      cancelPendingDistanceCalculation,
      resetItemHandlingMemory,
      autoSaveExistingDrafts,
      markLoadedDraftBaseline,
    ]
  );

  // Sincronizar o manuseio operacional (shipping.orderType) a partir dos itens selecionados
  useEffect(() => {
    const firstHandling = resolveFirstItemHandlingType(items);
    if (firstHandling && firstHandling !== shipping.orderType) {
      setShipping((prev) => ({
        ...prev,
        orderType: firstHandling,
      }));
    }
  }, [items, shipping.orderType, setShipping]);

  useEffect(() => {
    prevDeliveryMethodRef.current = shipping.deliveryMethod;
  }, [shipping.deliveryMethod]);

  const currentOrder = useMemo(
    () =>
      buildCurrentOrder({
        currentOrderId,
        orderIndex,
        orderType,
        status,
        items,
        itemsSummary,
        shipping,
        payments,
        paymentsSummary,
        customerData,
        observation,
        seller,
        marketingOrigin,
        orderDate,
        assistanceItems,
        assistanceServiceValue,
        assistanceCost,
        linkedOrderId,
        isButtonsClicked,
        fiscalContext,
        testModeFields,
      }),
    [
    currentOrderId,
    orderIndex,
    items,
    itemsSummary,
    shipping,
    payments,
    paymentsSummary,
    customerData,
    observation,
    seller,
    marketingOrigin,
    status,
    orderDate,
    assistanceItems,
    assistanceServiceValue,
    assistanceCost,
    linkedOrderId,
    isButtonsClicked,
    orderType,
    testModeFields,
    fiscalContext,
    ]
  );

  const isValidForCompletion = useMemo(
    () => validateBase(getOrderData('scheduled')),
    [getOrderData]
  );

  const state = useMemo(
    () => ({
      items,
      shipping,
      payments,
      customerData,
      observation,
      seller,
      sellerId,
      marketingOrigin,
      currentOrderId,
      isNewSaleFlow,
      orderIndex,
      isGeneratingCode,
      status,
      isSaving,
      isSavingDraft,
      draftAutoSaveStatus,
      isDraftAutoSaveEnabled,
      isCalculatingDistance,
      itemsSummary,
      paymentsSummary,
      currentOrder,
      isValidForCompletion,
      errors,
      orderDate,
      currentStep,
      isTestMode,
      schedulingSessionRef,
    }),
    [
      items,
      shipping,
      payments,
      customerData,
      observation,
      seller,
      sellerId,
      marketingOrigin,
      currentOrderId,
      isNewSaleFlow,
      orderIndex,
      isGeneratingCode,
      status,
      isSaving,
      isSavingDraft,
      draftAutoSaveStatus,
      isDraftAutoSaveEnabled,
      isCalculatingDistance,
      itemsSummary,
      paymentsSummary,
      currentOrder,
      isValidForCompletion,
      errors,
      orderDate,
      currentStep,
      isTestMode,
    ]
  );

  const actions = useSalesOrderFormActions({
    latestState,
    canAccessLogistics,
    setItemsWithHandlingReset,
    setShipping,
    setDeliveryMethod,
    setPayments,
    handleCustomerDataChange,
    setObservation,
    handleItemChange,
    handleSelectProduct,
    setSeller,
    setSellerId,
    setTestModeFields,
    setMarketingOrigin,
    setOrderIndex,
    loadOrderForEditing,
    handleAutoCalculateDistance,
    handleSaveOrder,
    handleCompleteOrder,
    flushDraftAutoSave,
    setErrors,
    setOrderDate,
    setCurrentStep,
    goToNextStep,
    goToPrevStep,
  });

  return { state, actions };
};
