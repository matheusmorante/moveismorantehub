import { useCallback, useEffect, useState } from 'react';
import { toast } from 'react-toastify';
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
  readonly persistReadyFiscalEdit: (
    updatedOrder: Order,
    expectedUpdatedAt: string,
    replacements: FiscalOrderEditReplacement[]
  ) => Promise<string | false>;
  readonly persistBlockedFiscalEdit: (
    updatedOrder: Order,
    expectedUpdatedAt: string,
    replacements: FiscalOrderEditReplacement[],
    reason?: string
  ) => Promise<{ order: Order; continueReplacement: boolean } | false>;
  readonly setIsSavingOrder: (saving: boolean) => void;
}

export function useOrderEditFiscalFlow({
  effectiveOrder,
  validateEditedOrder,
  persistUpdate,
  persistReadyFiscalEdit,
  persistBlockedFiscalEdit,
  setIsSavingOrder,
}: UseOrderEditFiscalFlowParams) {
  const [isConfirmingFiscalEdit, setIsConfirmingFiscalEdit] = useState(false);
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
    void resumeFiscalOrderEdit(effectiveOrder.id)
      .then(({ replacements, pendingReviews = [] }) => {
        if (isCurrent) {
          setPendingFiscalReplacements(replacements);
          setFiscalContinuationOrder(null);
          if (pendingReviews.length) toast.info(pendingReviews[0].reason);
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

  const saveBlockedFiscalEdit = useCallback(async (
    updatedOrder: Order,
    expectedUpdatedAt: string,
    replacements: FiscalOrderEditReplacement[],
    reason?: string
  ): Promise<string | false> => {
    const saved = await persistBlockedFiscalEdit(updatedOrder, expectedUpdatedAt, replacements, reason);
    if (!saved) return false;
    if (saved.continueReplacement) {
      setPendingFiscalReplacements(replacements);
      setFiscalContinuationOrder(saved.order);
    }
    return saved.order.id || false;
  }, [persistBlockedFiscalEdit]);

  const applyFiscalEdit = useCallback(async (
    pendingEdit: PendingFiscalEditState
  ): Promise<string | false> => {
    if (!effectiveOrder?.id || isConfirmingFiscalEdit) return false;
    setIsConfirmingFiscalEdit(true);
    try {
      const committed = await commitFiscalOrderEdit({
        requestId: pendingEdit.requestId,
        orderId: effectiveOrder.id,
        proposedOrder: pendingEdit.order,
        audit: pendingEdit.audit,
      });
      const committedOrder = {
        ...committed.order,
        isButtonsStale: pendingEdit.staleButtons,
      };
      try {
        await updateOrder(
          effectiveOrder.id,
          { isButtonsStale: pendingEdit.staleButtons },
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
      setPendingFiscalReplacements(committed.replacements);
      setFiscalContinuationOrder(committedOrder);
      toast.success('Edição comercial salva. A reversão fiscal seguirá antes da nova emissão.');
      return effectiveOrder.id;
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'A substituição fiscal não foi iniciada.');
      return false;
    } finally {
      setIsConfirmingFiscalEdit(false);
    }
  }, [effectiveOrder?.id, isConfirmingFiscalEdit]);

  const saveWithFiscalAudit = useCallback(
    async (updatedOrder: Order): Promise<string | false> => {
      if (!effectiveOrder?.id) return false;
      const targetOrderId = effectiveOrder.id;
      const staleButtons = getPostSaleActionsStaleAfterEdit(effectiveOrder);
      setIsSavingOrder(true);
      try {
        const result = await validateEditedOrder(
          updatedOrder,
          async (validatedData) => {
            const validated = validatedData as unknown as Order;
            try {
              const audit = await auditFiscalOrderEdit(targetOrderId, validated);
              if (audit.status === 'blocked') {
                const expectedUpdatedAt = audit.orderUpdatedAt || effectiveOrder.updatedAt;
                if (!expectedUpdatedAt) {
                  toast.error('Não foi possível fixar a versão do pedido; nenhuma alteração foi salva.');
                  return false;
                }
                return await saveBlockedFiscalEdit(
                  { ...validated, isButtonsStale: staleButtons },
                  expectedUpdatedAt,
                  audit.replacements || pendingFiscalReplacements,
                  audit.error
                );
              }
              if (audit.status === 'confirmation_required') {
                if (!audit.orderUpdatedAt || !audit.documents.length) {
                  return await saveBlockedFiscalEdit(
                    { ...validated, isButtonsStale: staleButtons },
                    audit.orderUpdatedAt || effectiveOrder.updatedAt || '',
                    audit.replacements || pendingFiscalReplacements,
                    'A conferência fiscal retornou incompleta. A edição comercial foi salva e a nota ficou pendente de revisão.'
                  );
                }
                const pendingEdit = {
                  requestId: crypto.randomUUID(),
                  order: validated,
                  audit,
                  staleButtons,
                };
                const committed = await applyFiscalEdit(pendingEdit);
                if (committed) return committed;
                return await saveBlockedFiscalEdit(
                  { ...validated, isButtonsStale: staleButtons },
                  audit.orderUpdatedAt,
                  audit.replacements || pendingFiscalReplacements,
                  'A edição comercial foi salva; a substituição fiscal permanece pendente de autorização ou conferência.'
                );
              }
              const readyReplacements = audit.replacements || pendingFiscalReplacements;
              if (
                audit.status === 'reissue_pending' ||
                readyReplacements.length > 0
              ) {
                if (
                  !audit.orderUpdatedAt ||
                  !readyReplacements.length ||
                  readyReplacements.some(
                    (row: FiscalOrderEditReplacement) =>
                      row.status !== 'ready_to_reissue' ||
                      !row.reversalConfirmed ||
                      Boolean(row.replacementDocumentId)
                  )
                ) {
                  toast.error(
                    'A nota anterior ainda precisa ter sua reversão fiscal confirmada antes de aplicar a edição.'
                  );
                  return false;
                }
                return await persistReadyFiscalEdit(
                  { ...validated, isButtonsStale: staleButtons },
                  audit.orderUpdatedAt,
                  readyReplacements
                );
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
              const expectedUpdatedAt = effectiveOrder?.updatedAt;
              if (expectedUpdatedAt) {
                const saved = await saveBlockedFiscalEdit(
                  { ...validated, isButtonsStale: staleButtons },
                  expectedUpdatedAt,
                  pendingFiscalReplacements,
                  'A edição comercial foi salva. A auditoria fiscal precisa ser retomada antes de qualquer nova emissão.'
                );
                if (saved) return saved;
              }
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
    [
      effectiveOrder,
      persistUpdate,
      persistReadyFiscalEdit,
      saveBlockedFiscalEdit,
      pendingFiscalReplacements,
      applyFiscalEdit,
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
