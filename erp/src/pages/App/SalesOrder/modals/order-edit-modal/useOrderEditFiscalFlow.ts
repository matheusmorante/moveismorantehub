import { useCallback } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { flattenFormErrors } from '@/hooks/useZodForm';
import { getPostSaleActionsStaleAfterEdit } from '@/pages/utils/postSaleActions';

interface UseOrderEditFiscalFlowParams {
  readonly effectiveOrder: Order | null;
  readonly validateEditedOrder: (
    data: unknown,
    onValid: (validatedData: unknown) => Promise<string | false>,
    onInvalid: (errors: unknown) => void
  ) => Promise<string | false>;
  readonly persistUpdate: (
    updatedOrder: Order,
    expectedUpdatedAt?: string
  ) => Promise<string | false>;
  readonly setIsSavingOrder: (saving: boolean) => void;
}

export function useOrderEditFiscalFlow({
  effectiveOrder,
  validateEditedOrder,
  persistUpdate,
  setIsSavingOrder,
}: UseOrderEditFiscalFlowParams) {
  const saveEditedOrder = useCallback(
    async (updatedOrder: Order): Promise<string | false> => {
      if (!effectiveOrder?.id) return false;
      const staleButtons = getPostSaleActionsStaleAfterEdit(effectiveOrder);
      setIsSavingOrder(true);
      try {
        const result = await validateEditedOrder(
          updatedOrder,
          async (validatedData) => {
            const validated = validatedData as unknown as Order;
            const savedId = await persistUpdate(
              { ...validated, isButtonsStale: staleButtons },
              effectiveOrder.updatedAt
            );
            if (!savedId) return false;
            return savedId;
          },
          (errors) => {
            toast.error(Object.values(flattenFormErrors(errors))[0]);
          }
        );
        return result || false;
      } finally {
        setIsSavingOrder(false);
      }
    },
    [
      effectiveOrder,
      persistUpdate,
      setIsSavingOrder,
      validateEditedOrder,
    ]
  );

  return { saveEditedOrder, saveWithFiscalAudit: saveEditedOrder };
}
