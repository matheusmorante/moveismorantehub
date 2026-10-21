import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type Order from '@/pages/types/order.type';
import { flattenFormErrors } from '@/hooks/useZodForm';
import { getPostSaleActionsStaleAfterEdit } from '@/pages/utils/postSaleActions';
import {
  resumeFiscalOrderEdit,
  type FiscalOrderEditReplacement,
} from '@/pages/utils/nfe/orderEditFiscalService';
import { withTimeout } from '../../../../../../shared-utils/withTimeout';

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
  const [pendingFiscalReplacements, setPendingFiscalReplacements] = useState<
    FiscalOrderEditReplacement[]
  >([]);
  const [fiscalContinuationOrder, setFiscalContinuationOrder] = useState<Order | null>(null);

  // Monitora e carrega pendência fiscal ativa ao abrir o pedido
  useEffect(() => {
    if (!effectiveOrder?.id) return;
    let isCurrent = true;
    setPendingFiscalReplacements([]);
    setFiscalContinuationOrder(null);
    void withTimeout(
      resumeFiscalOrderEdit(effectiveOrder.id),
      15_000,
      null,
      'pedido:carregar-pendencia-fiscal-ao-abrir'
    )
      .then((followUp) => {
        if (!followUp) {
          if (isCurrent) {
            toast.warning(
              'A pendência fiscal não carregou agora. A edição comercial continua disponível.'
            );
          }
          return;
        }
        if (isCurrent) {
          setPendingFiscalReplacements(followUp.replacements);
          setFiscalContinuationOrder(null);
          if (followUp.pendingReviews.length) toast.info(followUp.pendingReviews[0].reason);
        }
      })
      .catch(() => {
        if (isCurrent)
          toast.warning(
            'A pendência fiscal não carregou agora. A edição comercial continua disponível.'
          );
      });
    return () => {
      isCurrent = false;
    };
  }, [effectiveOrder?.id]);

  const loadFiscalFollowUpInBackground = useCallback(async (orderId: string) => {
    try {
      const followUp = await withTimeout(
        resumeFiscalOrderEdit(orderId),
        15_000,
        null,
        'pedido:carregar-pendencia-fiscal-apos-salvar'
      );
      if (!followUp) {
        toast.warning(
          'A edição comercial foi salva. A situação fiscal não carregou agora; a pendência continua registrada para conferência.'
        );
        return;
      }

      if (followUp.pendingReviews.length) {
        toast.warning(followUp.pendingReviews[0].reason);
      } else if (followUp.replacements.length) {
        toast.info(
          'A edição comercial foi salva. Há uma etapa de reversão fiscal pendente para este pedido.'
        );
      } else {
        toast.success('A edição comercial foi salva e não há pendência fiscal para este pedido.');
      }
    } catch {
      toast.warning(
        'A edição comercial foi salva. A situação fiscal será conferida quando o pedido for reaberto.'
      );
    }
  }, []);

  const saveWithFiscalAudit = useCallback(
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

            toast.info('Edição comercial salva. Conferindo a situação fiscal em segundo plano.');
            void loadFiscalFollowUpInBackground(savedId);
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
      loadFiscalFollowUpInBackground,
      setIsSavingOrder,
      validateEditedOrder,
    ]
  );

  return {
    pendingFiscalReplacements,
    fiscalContinuationOrder,
    saveWithFiscalAudit,
  };
}
