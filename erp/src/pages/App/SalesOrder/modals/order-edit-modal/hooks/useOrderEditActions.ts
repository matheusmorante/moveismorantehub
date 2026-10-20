import React, { useCallback } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { getInventorySensitiveItemChanges } from '../../ItemMovementChangeConfirmModal';
import { buildUpdatedOrder } from '../utils/orderEditPayload';
import type { useSalesOrderForm } from '../../../hooks/useSalesOrderForm';

interface UseOrderEditActionsParams {
  readonly effectiveOrder: Order | null;
  readonly formState: ReturnType<typeof useSalesOrderForm>['state'];
  readonly formActions: ReturnType<typeof useSalesOrderForm>['actions'];
  readonly saveWithFiscalAudit: (updatedOrder: Order) => Promise<string | false>;
  readonly setPendingUpdate: (order: Order | null) => void;
  readonly onSaveSuccess: (savedId?: string, savedOrder?: Order) => void;
  readonly onClose: () => void;
}

export function useOrderEditActions({
  effectiveOrder,
  formState,
  formActions,
  saveWithFiscalAudit,
  setPendingUpdate,
  onSaveSuccess,
  onClose,
}: UseOrderEditActionsParams) {
  const handleUpdate = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (!effectiveOrder) return false;
      const updatedOrder = buildUpdatedOrder({
        effectiveOrder,
        formState,
      });

      const validationErrors = formActions.validateOrder(updatedOrder);
      if (Object.keys(validationErrors).length > 0) {
        formActions.setErrors(validationErrors);
        const shippingError = validationErrors.shipping_date || validationErrors.shipping_time;
        const firstKey = Object.keys(validationErrors)[0];
        if (formState.currentStep === 4 && shippingError) {
          toast.error(shippingError);
          return false;
        }
        if (firstKey?.startsWith('shipping_') || firstKey?.startsWith('deliveryAddress_')) {
          formActions.jumpToStep(4);
        }
        toast.error(
          Object.values(validationErrors)[0] || 'Existem campos obrigatórios não preenchidos.'
        );
        return false;
      }

      const needsConfirmation =
        ['scheduled', 'fulfilled'].includes(effectiveOrder.status || '') &&
        getInventorySensitiveItemChanges(effectiveOrder, updatedOrder).length > 0;
      if (needsConfirmation) {
        setPendingUpdate(updatedOrder);
        return false;
      }
      return saveWithFiscalAudit(updatedOrder);
    },
    [effectiveOrder, formActions, formState, saveWithFiscalAudit, setPendingUpdate]
  );

  const handleSaveReconciliation = useCallback(async () => {
    if (!effectiveOrder) return;
    const temporaryIndexes = (effectiveOrder.items || []).flatMap((item, index) =>
      !item.productId?.trim() || item.isTemporaryProduct ? [index] : []
    );
    const hasMissingProduct = temporaryIndexes.some(
      (index) => !formState.items[index]?.productId?.trim()
    );
    if (hasMissingProduct) {
      toast.error('Selecione um produto cadastrado para todos os produtos sem cadastro.');
      return;
    }
    await saveWithFiscalAudit({ ...formState.currentOrder, id: effectiveOrder.id } as Order);
  }, [effectiveOrder, formState.currentOrder, formState.items, saveWithFiscalAudit]);

  const handleFinalize = useCallback(
    async (e?: React.MouseEvent) => {
      const result = await formActions.handleCompleteOrder(e);
      if (result && effectiveOrder) {
        const updatedOrder = {
          ...formState.currentOrder,
          id: formState.currentOrder.id || effectiveOrder.id || String(result),
        };
        onSaveSuccess(String(result), updatedOrder);
        onClose();
        return String(result);
      }
      return false;
    },
    [formActions, onSaveSuccess, onClose, formState.currentOrder, effectiveOrder]
  );

  return {
    handleUpdate,
    handleSaveReconciliation,
    handleFinalize,
  };
}
