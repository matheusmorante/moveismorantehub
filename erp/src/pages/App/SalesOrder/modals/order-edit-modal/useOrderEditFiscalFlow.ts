import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
import type { z } from 'zod';
import type Order from '@/pages/types/order.type';
import { flattenFormErrors } from '@/hooks/useZodForm';
import { updateOrder } from '@/pages/utils/orderHistoryService';
import { getPostSaleActionsStaleAfterEdit } from '@/pages/utils/postSaleActions';
import {
  auditFiscalOrderEdit,
  confirmFiscalOrderEdit as commitFiscalOrderEdit,
  resumeFiscalOrderEdit,
  type FiscalOrderEditReplacement,
  type FiscalOrderEditAudit,
} from '@/pages/utils/nfe/orderEditFiscalService';

export interface PendingFiscalEditState {
  requestId: string;
  order: Order;
  audit: FiscalOrderEditAudit;
  staleButtons: Order['isButtonsStale'];
}

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
  readonly editSchema: z.ZodTypeAny;
  readonly setIsSavingOrder: (saving: boolean) => void;
}

export function useOrderEditFiscalFlow({
  effectiveOrder,
  validateEditedOrder,
  persistUpdate,
  editSchema,
  setIsSavingOrder,
}: UseOrderEditFiscalFlowParams) {
  const [pendingFiscalEdit, setPendingFiscalEdit] = useState<PendingFiscalEditState | null>(null);
  const [isFiscalEditConfirmationOpen, setIsFiscalEditConfirmationOpen] = useState(false);
  const [isConfirmingFiscalEdit, setIsConfirmingFiscalEdit] = useState(false);
  const [pendingFiscalReplacements, setPendingFiscalReplacements] = useState<
    FiscalOrderEditReplacement[]
  >([]);
  const [fiscalContinuationOrder, setFiscalContinuationOrder] = useState<Order | null>(null);

  // Monitora e carrega pendência fiscal ativa ao abrir o pedido
  useEffect(() => {
    if (!effectiveOrder?.id) return;
    let isCurrent = true;
    void resumeFiscalOrderEdit(effectiveOrder.id)
      .then(({ replacements, order: currentOrder }) => {
        if (isCurrent) {
          setPendingFiscalReplacements(replacements);
          setFiscalContinuationOrder(replacements.length ? currentOrder : null);
        }
      })
      .catch((error) => {
        if (isCurrent)
          toast.error(
            error instanceof Error
              ? error.message
              : 'Não foi possível conferir a pendência fiscal.'
          );
      });
    return () => {
      isCurrent = false;
    };
  }, [effectiveOrder?.id]);

  const closeFiscalConfirmation = useCallback(() => {
    setIsFiscalEditConfirmationOpen(false);
    setPendingFiscalEdit(null);
  }, []);

  const saveWithFiscalAudit = useCallback(
    async (updatedOrder: Order): Promise<string | false> => {
      if (!effectiveOrder?.id) return false;
      const targetOrderId = effectiveOrder.id;
      const staleButtons = getPostSaleActionsStaleAfterEdit(effectiveOrder);
      setIsSavingOrder(true);
      try {
        const result = await validateEditedOrder(
          updatedOrder as unknown as z.input<typeof editSchema>,
          async (validatedData) => {
            const validated = validatedData as unknown as Order;
            try {
              const audit = await auditFiscalOrderEdit(targetOrderId, validated);
              if (audit.status === 'blocked') {
                setPendingFiscalEdit({
                  requestId: crypto.randomUUID(),
                  order: validated,
                  audit,
                  staleButtons,
                });
                setIsFiscalEditConfirmationOpen(true);
                return false;
              }
              if (audit.status === 'confirmation_required') {
                if (!audit.orderUpdatedAt || !audit.documents.length) {
                  toast.error(
                    'A conferência fiscal retornou incompleta; o pedido permanece sem alteração.'
                  );
                  return false;
                }
                setPendingFiscalEdit({
                  requestId: crypto.randomUUID(),
                  order: validated,
                  audit,
                  staleButtons,
                });
                setIsFiscalEditConfirmationOpen(true);
                return false;
              }
              if (!audit.orderUpdatedAt) {
                toast.error(
                  'Não foi possível fixar a versão atual do pedido; nenhuma alteração foi salva.'
                );
                return false;
              }
              return await persistUpdate(
                { ...validated, isButtonsStale: staleButtons },
                audit.orderUpdatedAt
              );
            } catch (error) {
              toast.error(
                error instanceof Error
                  ? error.message
                  : 'Não foi possível conferir as notas autorizadas do pedido.'
              );
              return false;
            }
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
    [effectiveOrder, persistUpdate, setIsSavingOrder, validateEditedOrder, editSchema]
  );

  const confirmFiscalOrderEdit = useCallback(async () => {
    if (!pendingFiscalEdit || !effectiveOrder?.id || isConfirmingFiscalEdit) return;
    setIsConfirmingFiscalEdit(true);
    try {
      const committed = await commitFiscalOrderEdit({
        requestId: pendingFiscalEdit.requestId,
        orderId: effectiveOrder.id,
        proposedOrder: pendingFiscalEdit.order,
        audit: pendingFiscalEdit.audit,
      });
      const committedOrder = {
        ...committed.order,
        isButtonsStale: pendingFiscalEdit.staleButtons,
      };
      try {
        await updateOrder(
          effectiveOrder.id,
          { isButtonsStale: pendingFiscalEdit.staleButtons },
          committed.order,
          undefined,
          { metadataOnly: true }
        );
      } catch (metadataError) {
        console.error('Não foi possível salvar o estado visual das ações pós-venda:', metadataError);
        toast.warning(
          'A edição foi confirmada, mas o aviso visual das ações pós-venda não foi salvo.'
        );
      }
      setPendingFiscalEdit(null);
      setIsFiscalEditConfirmationOpen(false);
      setPendingFiscalReplacements(committed.replacements);
      setFiscalContinuationOrder(committedOrder);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'A confirmação não foi concluída; o pedido permanece inalterado até a reversão fiscal.'
      );
    } finally {
      setIsConfirmingFiscalEdit(false);
    }
  }, [effectiveOrder?.id, isConfirmingFiscalEdit, pendingFiscalEdit]);

  return {
    pendingFiscalEdit,
    isFiscalEditConfirmationOpen,
    isConfirmingFiscalEdit,
    pendingFiscalReplacements,
    fiscalContinuationOrder,
    saveWithFiscalAudit,
    confirmFiscalOrderEdit,
    closeFiscalConfirmation,
  };
}
