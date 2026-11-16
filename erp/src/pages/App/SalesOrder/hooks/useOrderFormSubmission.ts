import React, { useCallback, useRef } from 'react';
import { toast } from 'react-toastify';
import type { z } from 'zod';
import type { FieldErrors } from 'react-hook-form';
import Order from '@/pages/types/order.type';
import { ValidationErrors } from '@/pages/utils/validations';
import { getFulfillmentLabels } from '@/pages/utils/orderStatusPresentation';
import { saveOrder, updateOrder, resolveCompletedOrderStatus } from '@/pages/utils/orderHistoryService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { getSettings } from '@/pages/utils/settingsService';
import {
  createOrderDomainSchema,
  orderDraftFormSchema,
} from '../../../../../../shared-utils/orderDomainValidation';

export interface UseOrderFormSubmissionParams {
  orderDate: string;
  seller: string;
  orderType: Order['orderType'];
  items: Order['items'];
  payments: Order['payments'];
  shipping: Order['shipping'];
  customerData: Order['customerData'];
  latestState: React.MutableRefObject<any>;
  getOrderData: (newStatus?: Order['status']) => Order;
  ensureOrderCode: () => Promise<number | null>;
  cancelAutoSave: () => void;
  waitForActiveSave: () => Promise<boolean>;
  resumeAutoSave: () => void;
  getDraftCreationKey: () => string | undefined;
  getSavedDraftIdForOrder: (order: Order) => string | undefined;
  setIsSaving: React.Dispatch<React.SetStateAction<boolean>>;
  setCurrentOrderId: React.Dispatch<React.SetStateAction<string | undefined>>;
  setStatus: React.Dispatch<React.SetStateAction<string>>;
  setErrors: React.Dispatch<React.SetStateAction<ValidationErrors>>;
  setCurrentStep: React.Dispatch<React.SetStateAction<number>>;
}

export const useOrderFormSubmission = ({
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
  getDraftCreationKey,
  getSavedDraftIdForOrder,
  setIsSaving,
  setCurrentOrderId,
  setStatus,
  setErrors,
  setCurrentStep,
}: UseOrderFormSubmissionParams) => {
  // Estado React só é refletido após o próximo render. Esta trava síncrona
  // protege o intervalo entre o clique e a confirmação do insert no banco.
  const submissionInFlightRef = useRef(false);

  const { validateAndRun: validateOrderForm } = useZodForm(
    createOrderDomainSchema(getSettings().requiredFields),
    {
      date: orderDate,
      seller,
      orderType,
      items,
      payments,
      shipping,
      customerData,
    }
  );

  const { validateAndRun: validateOrderDraft } = useZodForm(orderDraftFormSchema, {
    status: 'draft',
    date: orderDate,
    seller,
    orderType,
    items,
    payments,
    shipping,
    customerData,
  });

  const showOrderValidationErrors = useCallback(
    (validationErrors: FieldErrors) => {
      const fields = Object.fromEntries(
        Object.entries(flattenFormErrors(validationErrors)).map(([key, value]) => [
          key.replace(/^items_(\d+)_/, 'item_$1_').replace(/^payments_(\d+)_/, 'payment_$1_'),
          value,
        ])
      );
      setErrors(fields);
      const hasShippingError = Object.keys(fields).some(
        (key) => key.startsWith('shipping_') || key.startsWith('deliveryAddress_')
      );
      if (hasShippingError) {
        setCurrentStep(4);
        const firstNonShippingError = Object.entries(fields).find(
          ([key]) => !key.startsWith('shipping_') && !key.startsWith('deliveryAddress_')
        )?.[1];
        if (firstNonShippingError) toast.error(firstNonShippingError);
        return;
      }
      if (Object.keys(fields).some((key) => key.startsWith('payment_') || key === 'payments_summary')) {
        setCurrentStep(5);
      }
      toast.error(Object.values(fields)[0] || 'Confira os dados do pedido.');
    },
    [setCurrentStep, setErrors]
  );

  const handleSaveOrder = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (submissionInFlightRef.current) return false;
      submissionInFlightRef.current = true;
      latestState.current.submissionInFlight = true;
      cancelAutoSave();
      latestState.current.isSaving = true;
      setIsSaving(true);
      let succeeded = false;
      try {
        if (!(await waitForActiveSave())) {
          toast.error('Não foi possível confirmar o salvamento do rascunho. Tente novamente.');
          return false;
        }
        cancelAutoSave();
        const savedStatus =
          latestState.current.currentOrderId && latestState.current.status !== 'draft'
            ? latestState.current.status
            : 'draft';
        const snapshot = getOrderData(savedStatus);
        const persistValidatedOrder = async (
          data: z.output<ReturnType<typeof createOrderDomainSchema>>
        ) => {
          const orderData = data as unknown as Order;
          setErrors({});
          if (orderData.is_test !== true) {
            const currentIdx = await ensureOrderCode();
            if (!currentIdx) return false;
            orderData.orderIndex = currentIdx;
            orderData.orderNumber = currentIdx;
          }
          try {
            const creationKey = getDraftCreationKey();
            const savedId = !orderData.id && creationKey
              ? await saveOrder(orderData, { idempotencyKey: creationKey })
              : await saveOrder(orderData);
            if (savedId) {
              setCurrentOrderId(savedId);
              latestState.current.currentOrderId = savedId;
            }
            setStatus(savedStatus);
            latestState.current.status = savedStatus;
            toast.success(
              savedStatus === 'draft'
                ? orderData.orderType === 'budget'
                  ? 'Orçamento salvo com sucesso!'
                  : 'Pedido salvo como rascunho!'
                : 'Alterações do pedido salvas!'
            );
            return savedId;
          } catch (error: unknown) {
            const message = (error as { message?: unknown } | null)?.message;
            toast.error(
              typeof message === 'string' && message
                ? message
                : 'Não foi possível salvar o pedido.'
            );
            return false;
          }
        };
        const result = savedStatus === 'draft'
          ? await validateOrderDraft(
              snapshot as unknown as z.input<typeof orderDraftFormSchema>,
              persistValidatedOrder,
              showOrderValidationErrors
            )
          : await validateOrderForm(
              snapshot as unknown as z.input<ReturnType<typeof createOrderDomainSchema>>,
              persistValidatedOrder,
              showOrderValidationErrors
            );
        succeeded = Boolean(result);
        return result;
      } finally {
        cancelAutoSave();
        latestState.current.isSaving = false;
        latestState.current.submissionInFlight = false;
        setIsSaving(false);
        submissionInFlightRef.current = false;
        if (!succeeded) resumeAutoSave();
      }
    },
    [
      getOrderData,
      ensureOrderCode,
      cancelAutoSave,
      waitForActiveSave,
      resumeAutoSave,
      getDraftCreationKey,
      validateOrderForm,
      validateOrderDraft,
      showOrderValidationErrors,
      latestState,
      setCurrentOrderId,
      setErrors,
      setIsSaving,
      setStatus,
    ]
  );

  const handleCompleteOrder = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (submissionInFlightRef.current) return false;
      submissionInFlightRef.current = true;
      latestState.current.submissionInFlight = true;
      cancelAutoSave();
      latestState.current.isSaving = true;
      setIsSaving(true);
      let succeeded = false;
      try {
        // Validação e código podem avançar enquanto um autosave já iniciado termina.
        const activeDraftSave = waitForActiveSave();
        const savedStatus = resolveCompletedOrderStatus(latestState.current);
        const snapshot = getOrderData(savedStatus);
        const persistValidatedOrder = async (
          data: z.output<ReturnType<typeof createOrderDomainSchema>>
        ) => {
          const orderData = data as unknown as Order;
          setErrors({});
          const [currentIdx, activeSaveConfirmed] = await Promise.all([
            orderData.is_test === true ? Promise.resolve(null) : ensureOrderCode(),
            activeDraftSave,
          ]);
          if (!activeSaveConfirmed) {
            toast.error('Não foi possível confirmar o salvamento do rascunho. Tente novamente.');
            return false;
          }
          if (orderData.is_test !== true) {
            if (!currentIdx) return false;
            orderData.orderIndex = currentIdx;
            orderData.orderNumber = currentIdx;
          }
          if (!orderData.id && latestState.current.currentOrderId) {
            orderData.id = latestState.current.currentOrderId;
          }
          try {
            const creationKey = getDraftCreationKey();
            const savedDraftId = getSavedDraftIdForOrder(orderData);
            const canFinalizeSavedDraft = Boolean(
              typeof updateOrder === 'function' &&
              savedDraftId &&
              orderData.id === savedDraftId &&
              savedStatus !== 'draft' &&
              latestState.current.status === 'draft'
            );
            let savedId: string;
            if (canFinalizeSavedDraft && savedDraftId) {
              await updateOrder(savedDraftId, { status: savedStatus });
              savedId = savedDraftId;
            } else {
              savedId = !orderData.id && creationKey
                ? await saveOrder(orderData, { idempotencyKey: creationKey })
                : await saveOrder(orderData);
            }
            if (savedId) {
              setCurrentOrderId(savedId);
              latestState.current.currentOrderId = savedId;
            }
            setStatus(savedStatus);
            latestState.current.status = savedStatus;
            if (savedStatus === 'fulfilled') {
              toast.success(
                'Pedido cadastrado. ' + getFulfillmentLabels(orderData).successMessage + ' ✨'
              );
            } else if (savedStatus === 'quoted') {
              toast.success('Orçamento cadastrado com sucesso!');
            } else {
              toast.success('Pedido CADASTRADO com sucesso!');
            }
            return { ...orderData, id: savedId, status: savedStatus };
          } catch (error: unknown) {
            const message = (error as { message?: unknown } | null)?.message;
            toast.error(
              typeof message === 'string' && message
                ? message
                : 'Não foi possível salvar o pedido.'
            );
            return false;
          }
        };
        const result = savedStatus === 'draft'
          ? await validateOrderDraft(
              snapshot as unknown as z.input<typeof orderDraftFormSchema>,
              persistValidatedOrder,
              showOrderValidationErrors
            )
          : await validateOrderForm(
              snapshot as unknown as z.input<ReturnType<typeof createOrderDomainSchema>>,
              persistValidatedOrder,
              showOrderValidationErrors
            );
        succeeded = Boolean(result);
        return result;
      } finally {
        cancelAutoSave();
        latestState.current.isSaving = false;
        latestState.current.submissionInFlight = false;
        setIsSaving(false);
        submissionInFlightRef.current = false;
        if (!succeeded) resumeAutoSave();
      }
    },
    [
      getOrderData,
      ensureOrderCode,
      cancelAutoSave,
      waitForActiveSave,
      resumeAutoSave,
      getDraftCreationKey,
      getSavedDraftIdForOrder,
      validateOrderForm,
      validateOrderDraft,
      showOrderValidationErrors,
      latestState,
      setCurrentOrderId,
      setErrors,
      setIsSaving,
      setStatus,
    ]
  );

  return {
    handleSaveOrder,
    handleCompleteOrder,
  };
};
