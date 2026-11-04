import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import Order, { AssistanceItem } from '@/pages/types/order.type';
import type Item from '@/pages/types/items.type';
import useItems from './useItems';
import useShipping from './useShipping';
import usePaymentsData from './usePayments';
import { useCustomerData } from './useCustomerData';
import { calcPaymentsSummary, calcItemsSummary } from '@/pages/utils/calculations';
import { toast } from 'react-toastify';
import { getTestArtifactContext } from '../../../../../../shared-utils/testArtifactContext';
import { testArtifactMetadata } from '../../../../../../shared-utils/testArtifactPolicy';
import { validateBase, validateOrder, ValidationErrors } from '@/pages/utils/validations';
import Shipping from '@/pages/types/Shipping.type';
import {
  getCurrentDatetimeLocal,
  formatToStorageDate,
  parseStorageDateToLocal,
} from './orderDateFormatting';
import { useOrderCodeGenerator } from './useOrderCodeGenerator';
import { useOrderDistanceCalculator } from './useOrderDistanceCalculator';
import { useOrderProductSelection } from './useOrderProductSelection';
import { useOrderItemHandlingByDeliveryMethod } from './useOrderItemHandlingByDeliveryMethod';
import { useOrderAutoSave } from './useOrderAutoSave';
import { useOrderCustomerSelection } from './useOrderCustomerSelection';
import { useOrderFormStepNavigation } from './useOrderFormStepNavigation';
import { buildSalesOrderSnapshot, prepareOrderForFormEditing } from './orderFormSnapshot';
import { useOrderFormSubmission } from './useOrderFormSubmission';
import type { SchedulingSessionMemory } from '../ShippingComponents/Agendamento';
import { requestConfirmation } from '@/components/shared/confirmationService';
import { resolveFirstItemHandlingType } from '../orderItemHandling';

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

  const [observation, setObservation] = useState('');
  const [seller, setSeller] = useState('');
  const [sellerId, setSellerId] = useState<string | undefined>(undefined);
  const [marketingOrigin, setMarketingOrigin] = useState('organic');
  const [orderDate, setOrderDate] = useState(() => getCurrentDatetimeLocal());
  const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(undefined);
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
    useOrderFormStepNavigation(orderType);
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

  const { isSavingDraft, draftAutoSaveStatus, waitForActiveSave, cancelAutoSave } =
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
      testModeFields
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
    setIsSaving,
    setCurrentOrderId,
    setStatus,
    setErrors,
    setCurrentStep,
  });

  const loadOrderForEditing = useCallback(
    (order: Order) => {
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
    },
    [
      setItems,
      setShipping,
      setPayments,
      setCustomerData,
      setOrderIndex,
      setIsDraftAutoSaveEnabled,
      generateCodeForCopyOrNew,
      cancelPendingDistanceCalculation,
      resetItemHandlingMemory,
      autoSaveExistingDrafts,
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

  const clearForm = useCallback(async () => {
    if (await requestConfirmation({
      title: 'Limpar formulário do pedido?',
      message: 'Os dados não salvos deste pedido serão descartados.',
      confirmLabel: 'Limpar formulário',
      type: 'warning',
    })) {
      window.location.reload();
    }
  }, []);

  const currentOrder = useMemo((): Order => {
    const firstHandling = resolveFirstItemHandlingType(items);
    return {
      id: currentOrderId,
      orderIndex: orderIndex || undefined,
      orderNumber: orderIndex || undefined,
      orderType,
      status: status as any,
      items,
      itemsSummary,
      shipping: {
        ...shipping,
        orderType: firstHandling || shipping.orderType || '',
      },
      payments,
      paymentsSummary,
      customerData,
      observation,
      seller,
      marketingOrigin,
      date: formatToStorageDate(orderDate),
      assistanceItems,
      assistanceServiceValue,
      assistanceCost,
      linkedOrderId,
      isButtonsClicked,
      fiscalContext,
      ...testModeFields,
    };
  }, [
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
  ]);

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

  const setTestMode = useCallback((enabled: boolean) => {
    const identity = getTestArtifactContext();
    if (enabled && !identity) {
      toast.error('O modo de teste exige operador autorizado nesta execução.');
      return;
    }
    latestState.current.isTestMode = enabled;
    const fields: Pick<Order, 'is_test' | 'testArtifact'> =
      enabled && identity
        ? {
            is_test: true,
            testArtifact: testArtifactMetadata(identity) as NonNullable<Order['testArtifact']>,
          }
        : { is_test: false, testArtifact: null };
    latestState.current.testModeFields = fields;
    setTestModeFields(fields);
  }, []);

  const actions = useMemo(
    () => ({
      setItems: setItemsWithHandlingReset,
      setShipping: (val: React.SetStateAction<Shipping>) => {
        setShipping(val);
        setErrors((prev) => {
          const next = { ...prev };
          Object.keys(next).forEach((key) => {
            if (key.startsWith('shipping_')) delete next[key];
          });
          return next;
        });
      },
      setDeliveryMethod,
      setPayments,
      setCustomerData: handleCustomerDataChange,
      setObservation,
      handleItemChange,
      setSeller: (val: string) => {
        setSeller(val);
        setErrors((prev) => {
          const next = { ...prev };
          delete next['seller'];
          return next;
        });
      },
      setSellerId,
      setSellerData: (data: { name: string; id?: string }) => {
        setSeller(data.name);
        setSellerId(data.id);
        setErrors((prev) => {
          const next = { ...prev };
          delete next['seller'];
          return next;
        });
      },
      setTestMode,
      setMarketingOrigin,
      setOrderIndex,
      loadOrderForEditing,
      handleAutoCalculateDistance,
      handleSelectProduct,
      handleSaveOrder,
      handleCompleteOrder,
      clearForm,
      setErrors,
      validateOrder,
      setOrderDate,
      goToNextStep,
      goToPrevStep,
      jumpToStep: (step: number) => {
        setCurrentStep(step);
      },
    }),
    [
      setItems,
      setItemsWithHandlingReset,
      setShipping,
      setDeliveryMethod,
      setPayments,
      handleCustomerDataChange,
      setObservation,
      handleItemChange,
      setSeller,
      setSellerId,
      setTestMode,
      setMarketingOrigin,
      setOrderIndex,
      loadOrderForEditing,
      handleAutoCalculateDistance,
      handleSelectProduct,
      handleSaveOrder,
      handleCompleteOrder,
      clearForm,
      goToNextStep,
      goToPrevStep,
    ]
  );

  return { state, actions };
};
