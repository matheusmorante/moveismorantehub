import { useCallback } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { updateOrder, fetchOrderById } from '@/pages/utils/orderHistoryService';
import { clearFiscalEmissionRequest } from '@/pages/utils/nfe/nfeEmissionRequestState';
import { getGoodsCirculationState } from '@/pages/utils/nfe/cancellationEligibility';
import { prepareOrderFiscalSnapshotForEmission } from '@/pages/utils/nfeEmissionSnapshotService';
import type { FiscalOrderEditReplacement } from '@/pages/utils/nfe/orderEditFiscalService';
import type { FiscalReissueState } from '../types/orderEditModal.types';

interface UseOrderEditPersistenceParams {
  readonly effectiveOrder: Order | null;
  readonly onClose: () => void;
  readonly onSaveSuccess: (savedId?: string, savedOrder?: Order) => void;
  readonly setFiscalReissue: (reissue: FiscalReissueState | null) => void;
}

export function useOrderEditPersistence({
  effectiveOrder,
  onClose,
  onSaveSuccess,
  setFiscalReissue,
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

  const persistReadyFiscalEdit = useCallback(
    async (
      updatedOrder: Order,
      expectedUpdatedAt: string,
      replacements: FiscalOrderEditReplacement[]
    ): Promise<string | false> => {
      const targetOrderId = effectiveOrder?.id;
      if (!targetOrderId || !replacements.length) return false;
      try {
        await updateOrder(targetOrderId, updatedOrder, effectiveOrder, expectedUpdatedAt);
        toast.success('Edição salva com sucesso!');

        const [replacement, ...remaining] = replacements;
        clearFiscalEmissionRequest(targetOrderId, replacement.environment);
        try {
          const preparedOrder = await prepareOrderFiscalSnapshotForEmission(
            updatedOrder,
            replacement.environment
          );
          setFiscalReissue({ order: preparedOrder, replacement, remaining });
          toast.info(
            replacement.action === 'estorno'
              ? 'O estorno fiscal da NF anterior já foi confirmado. Prepare a nova emissão.'
              : 'O cancelamento fiscal da NF anterior já foi confirmado. Prepare a nova emissão.'
          );
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `A edição foi salva, mas não foi possível preparar a nova NF: ${error.message}`
              : 'A edição foi salva, mas não foi possível preparar a nova NF.'
          );
          onSaveSuccess(targetOrderId, updatedOrder);
          onClose();
        }
        return targetOrderId;
      } catch (error) {
        console.error('Erro ao atualizar pedido antes da reemissão fiscal:', error);
        toast.error(
          error instanceof Error ? error.message : 'Falha ao atualizar o pedido antes da nova NF.'
        );
        return false;
      }
    },
    [effectiveOrder, onClose, onSaveSuccess, setFiscalReissue]
  );

  const persistBlockedFiscalEdit = useCallback(
    async (
      updatedOrder: Order,
      expectedUpdatedAt: string,
      replacements: FiscalOrderEditReplacement[],
      reason?: string
    ): Promise<{ order: Order; continueReplacement: boolean } | false> => {
      const targetOrderId = effectiveOrder?.id;
      if (!targetOrderId || !expectedUpdatedAt) return false;
      try {
        await updateOrder(targetOrderId, updatedOrder, effectiveOrder, expectedUpdatedAt);
        const savedOrder = (await fetchOrderById(targetOrderId)) || updatedOrder;
        toast.warning(
          reason
            ? `Edição comercial salva. Pendência fiscal mantida: ${reason}`
            : 'Edição comercial salva. A pendência fiscal ficou registrada para revisão.'
        );
        const canContinueReplacement =
          replacements.length > 0 &&
          savedOrder.status === 'scheduled' &&
          getGoodsCirculationState(savedOrder) === 'none';
        if (canContinueReplacement) {
          return { order: savedOrder, continueReplacement: true };
        }
        onSaveSuccess(targetOrderId, savedOrder);
        onClose();
        return { order: savedOrder, continueReplacement: false };
      } catch (error) {
        console.error('Falha ao salvar edição comercial com pendência fiscal:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a alteração comercial do pedido.'
        );
        return false;
      }
    },
    [effectiveOrder, onClose, onSaveSuccess]
  );

  return {
    persistUpdate,
    persistReadyFiscalEdit,
    persistBlockedFiscalEdit,
  };
}
