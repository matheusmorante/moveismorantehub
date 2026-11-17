import { useCallback } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { updateOrder } from '@/pages/utils/orderHistoryService';

interface UseOrderEditPersistenceParams {
  readonly effectiveOrder: Order | null;
  readonly onClose: () => void;
  readonly onSaveSuccess: (savedId?: string, savedOrder?: Order) => void;
}

export function useOrderEditPersistence({
  effectiveOrder,
  onClose,
  onSaveSuccess,
}: UseOrderEditPersistenceParams) {
  const persistUpdate = useCallback(
    async (updatedOrder: Order, expectedUpdatedAt?: string): Promise<string | false> => {
      const targetOrderId = effectiveOrder?.id;
      if (!targetOrderId) return false;
      try {
        await updateOrder(targetOrderId, updatedOrder, effectiveOrder, expectedUpdatedAt);
        toast.success('Edição salva com sucesso!');
        onSaveSuccess(targetOrderId, updatedOrder);
        onClose();
        return targetOrderId;
      } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        toast.error('Falha ao atualizar pedido.');
        return false;
      }
    },
    [effectiveOrder, onSaveSuccess, onClose]
  );

  return { persistUpdate };
}
