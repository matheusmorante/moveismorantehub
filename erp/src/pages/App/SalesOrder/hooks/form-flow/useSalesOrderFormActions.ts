import type React from 'react';
import { useCallback, useMemo } from 'react';
import type Order from '@/pages/types/order.type';
import type Item from '@/pages/types/items.type';
import type Shipping from '@/pages/types/Shipping.type';
import { validateOrder, type ValidationErrors } from '@/pages/utils/sales/validations';
import { toast } from 'react-toastify';
import { getTestArtifactContext } from '../../../../../../../shared-utils/testing/testArtifactContext';
import { testArtifactMetadata } from '../../../../../../../shared-utils/testing/testArtifactPolicy';
import { requestConfirmation } from '@/components/shared/confirmationService';

interface UseSalesOrderFormActionsParams {
  latestState: React.MutableRefObject<any>;
  canAccessLogistics: boolean;
  setItemsWithHandlingReset: (update: React.SetStateAction<Item[]>) => void;
  setShipping: React.Dispatch<React.SetStateAction<Shipping>>;
  setDeliveryMethod: (method: 'delivery' | 'pickup') => void;
  setPayments: React.Dispatch<React.SetStateAction<any[]>>;
  handleCustomerDataChange: (...args: any[]) => void;
  setObservation: React.Dispatch<React.SetStateAction<string>>;
  handleItemChange: (...args: any[]) => void;
  handleSelectProduct: (...args: any[]) => void;
  setSeller: React.Dispatch<React.SetStateAction<string>>;
  setSellerId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setTestModeFields: React.Dispatch<React.SetStateAction<Pick<Order, 'is_test' | 'testArtifact'>>>;
  setMarketingOrigin: React.Dispatch<React.SetStateAction<string>>;
  setOrderIndex: React.Dispatch<React.SetStateAction<number | null>>;
  loadOrderForEditing: (order: Order) => void;
  handleAutoCalculateDistance: (...args: any[]) => any;
  handleSaveOrder: (...args: any[]) => Promise<any>;
  handleCompleteOrder: (...args: any[]) => Promise<any>;
  flushDraftAutoSave: (...args: any[]) => Promise<any>;
  setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  setOrderDate: React.Dispatch<React.SetStateAction<string>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
  goToNextStep: () => void;
  goToPrevStep: () => void;
}

/** Agrupa as ações estáveis do formulário de vendas e limpeza seletiva de erros de validação. */
export function useSalesOrderFormActions({
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
}: UseSalesOrderFormActionsParams) {
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
  }, [latestState, setTestModeFields]);

  const clearValidationErrors = useCallback((shouldClear: (key: string) => boolean) => {
    setErrors((previous) => {
      const next = { ...previous };
      Object.keys(next).forEach((key) => {
        if (shouldClear(key)) delete next[key];
      });
      return next;
    });
  }, [setErrors]);

  const jumpToStep = useCallback((step: number) => {
    if (step === 4 && !canAccessLogistics) return;
    setCurrentStep(step);
  }, [canAccessLogistics, setCurrentStep]);

  return useMemo(
    () => ({
      setItems: (update: React.SetStateAction<Item[]>) => {
        setItemsWithHandlingReset(update);
        clearValidationErrors((key) => key.startsWith('item_') || key === 'items_summary');
      },
      setShipping: (val: React.SetStateAction<Shipping>) => {
        setShipping(val);
        clearValidationErrors((key) => key.startsWith('shipping_'));
      },
      setDeliveryMethod,
      setPayments: (update: React.SetStateAction<any[]>) => {
        setPayments(update);
        clearValidationErrors((key) => key.startsWith('payment_') || key === 'payments_summary');
      },
      setCustomerData: (...args: any[]) => {
        handleCustomerDataChange(...args);
        clearValidationErrors((key) => key.startsWith('customer_') || key === 'customer');
      },
      setObservation,
      handleItemChange: (...args: any[]) => {
        handleItemChange(...args);
        const [index] = args;
        clearValidationErrors((key) => key.startsWith(`item_${index}_`));
      },
      handleSelectProduct: (...args: any[]) => {
        handleSelectProduct(...args);
        const [index] = args;
        clearValidationErrors((key) => key.startsWith(`item_${index}_`));
      },
      setSeller: (val: string) => {
        setSeller(val);
        clearValidationErrors((key) => key === 'seller');
      },
      setSellerId,
      setSellerData: (data: { name: string; id?: string }) => {
        setSeller(data.name);
        setSellerId(data.id);
        clearValidationErrors((key) => key === 'seller');
      },
      setTestMode,
      setMarketingOrigin,
      setOrderIndex,
      loadOrderForEditing,
      handleAutoCalculateDistance,
      handleSaveOrder,
      handleCompleteOrder,
      flushDraftAutoSave,
      clearForm,
      setErrors,
      validateOrder,
      setOrderDate: (value: React.SetStateAction<string>) => {
        setOrderDate(value);
        clearValidationErrors((key) => key === 'date' || key === 'order_date');
      },
      goToNextStep,
      goToPrevStep,
      jumpToStep,
    }),
    [
      setItemsWithHandlingReset,
      clearValidationErrors,
      setShipping,
      setDeliveryMethod,
      setPayments,
      handleCustomerDataChange,
      setOrderDate,
      setErrors,
      setObservation,
      handleItemChange,
      handleSelectProduct,
      setSeller,
      setSellerId,
      setTestMode,
      setMarketingOrigin,
      setOrderIndex,
      loadOrderForEditing,
      handleAutoCalculateDistance,
      handleSaveOrder,
      handleCompleteOrder,
      flushDraftAutoSave,
      clearForm,
      goToNextStep,
      goToPrevStep,
      jumpToStep,
    ]
  );
}
