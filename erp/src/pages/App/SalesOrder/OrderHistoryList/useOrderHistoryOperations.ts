import Order, { type AssistanceItem } from '../../../types/order.type';
import type { Item } from '../../../types/items.type';
import {
  restoreOrder,
  permanentDeleteDraftOrder,
  permanentDeleteOrder,
  updateOrder,
} from '../../../utils/orderHistoryService';
import { toast } from 'react-toastify';
import { getFulfillmentLabels } from '@/pages/utils/orderStatusPresentation';
import { processOrderCancellationFiscalEffects } from '@/pages/utils/nfe/nfeService';

interface OrderHistoryOperationsParams {
  orders: Order[];
  setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
  selectedOrders: string[];
  setSelectedOrders: React.Dispatch<React.SetStateAction<string[]>>;
  setLoading: React.Dispatch<React.SetStateAction<boolean>>;
  refresh: () => Promise<void>;
}

export const createOrderHistoryOperations = ({
  orders,
  setOrders,
  selectedOrders,
  setSelectedOrders,
  setLoading,
  refresh,
}: OrderHistoryOperationsParams) => {
  const handleDelete = async (id: string) => {
    const order = orders.find((item) => item.id === id);
    if (order?.status !== 'draft') {
      toast.warning('Somente pedidos em rascunho podem ser excluídos.');
      return;
    }
    await permanentDeleteDraftOrder(id);
    toast.success('Rascunho excluído da lista.');
    refresh();
  };

  const handleRestore = async (id: string) => {
    await restoreOrder(id);
    toast.success('Pedido restaurado com sucesso!');
    refresh();
  };

  const handlePermanentDelete = async (id: string) => {
    if (
      window.confirm(
        'Certeza que deseja excluir DEFINITIVAMENTE este pedido? Esta ação não pode ser desfeita.'
      )
    ) {
      await permanentDeleteOrder(id);
      toast.success('Pedido excluído permanentemente.');
      refresh();
    }
  };

  const handleBulkTrash = async () => {
    if (selectedOrders.length === 0) return;
    const selected = orders.filter((order) => selectedOrders.includes(order.id || ''));
    if (selected.some((order) => order.status !== 'draft')) {
      toast.warning('Somente pedidos em rascunho podem ser excluídos.');
      return;
    }
    setLoading(true);
    try {
      await Promise.all(selectedOrders.map((id) => permanentDeleteOrder(id)));
      toast.success(`${selectedOrders.length} rascunho(s) excluído(s) permanentemente.`);
      setSelectedOrders([]);
      refresh();
    } catch {
      toast.error('Erro ao mover alguns pedidos para a lixeira.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkRestore = async () => {
    if (selectedOrders.length === 0) return;
    setLoading(true);
    try {
      await Promise.all(selectedOrders.map((id) => restoreOrder(id)));
      toast.success(`${selectedOrders.length} pedido(s) restaurado(s) com sucesso!`);
      setSelectedOrders([]);
      refresh();
    } catch {
      toast.error('Erro ao restaurar alguns pedidos.');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkPermanentDelete = async () => {
    if (selectedOrders.length === 0) return;
    if (
      window.confirm(
        `Certeza que deseja excluir DEFINITIVAMENTE ${selectedOrders.length} pedido(s)? Esta ação não pode ser desfeita.`
      )
    ) {
      setLoading(true);
      try {
        await Promise.all(selectedOrders.map((id) => permanentDeleteOrder(id)));
        toast.success(`${selectedOrders.length} pedido(s) excluído(s) permanentemente.`);
        setSelectedOrders([]);
        refresh();
      } catch {
        toast.error('Erro ao excluir alguns pedidos.');
      } finally {
        setLoading(false);
      }
    }
  };

  const commitStatusUpdate = async (
    currentOrder: Order,
    newStatus: Order['status'],
    fiscalOptions: { productionConfirmed?: boolean } = {}
  ) => {
    const id = currentOrder.id!;
    const isCancelled = newStatus === 'cancelled';
    const expectedStockProcessed = isCancelled ? false : currentOrder.stockProcessed;
    const expectedStockReversed = isCancelled ? true : currentOrder.stockReversed || false;
    const expectedReturnStockProcessed = isCancelled ? false : currentOrder.returnStockProcessed;
    const expectedReturnStockReversed = isCancelled
      ? true
      : currentOrder.returnStockReversed || false;

    const isUndoFulfillment = currentOrder.status === 'fulfilled' && newStatus === 'scheduled';
    const payload: Partial<Order> = { status: newStatus };
    if (isUndoFulfillment) {
      payload.autoFulfillExempt = true;
    }

    // Optimistic update
    setOrders((prev) =>
      prev.map((o) =>
        o.id === id
          ? {
              ...o,
              status: newStatus,
              stockProcessed: expectedStockProcessed,
              stockReversed: expectedStockReversed,
              returnStockProcessed: expectedReturnStockProcessed,
              returnStockReversed: expectedReturnStockReversed,
              ...(isUndoFulfillment ? { autoFulfillExempt: true } : {}),
            }
          : o
      )
    );
    try {
      await updateOrder(id, payload, currentOrder);
      if (isUndoFulfillment) {
        const labels = getFulfillmentLabels(currentOrder);
        toast.success(
          `${labels.correctionAction} concluída. Pedido retornado para ${labels.preFulfillmentStatus}.`
        );
      } else if (newStatus === 'fulfilled') {
        toast.success(getFulfillmentLabels(currentOrder).successMessage);
      } else if (!isCancelled) {
        toast.success('Status do pedido atualizado!');
      }
    } catch (error) {
      // Rollback only when the commercial transaction failed to commit.
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                status: currentOrder.status,
                stockProcessed: currentOrder.stockProcessed,
                stockReversed: currentOrder.stockReversed,
                returnStockProcessed: currentOrder.returnStockProcessed,
                returnStockReversed: currentOrder.returnStockReversed,
              }
            : o
        )
      );
      console.error('Erro ao atualizar status:', error);
      toast.error('Erro ao atualizar status do pedido.');
      return;
    }

    if (isCancelled) {
      try {
        const result = await processOrderCancellationFiscalEffects(
          id,
          String(currentOrder.orderIndex || currentOrder.orderNumber || id),
          { productionConfirmed: fiscalOptions.productionConfirmed }
        );
        if (result.action === 'batch') {
          const outcomes = result.results || [];
          const failed = outcomes.filter((item) => item.action === 'failed');
          const pending = outcomes.filter((item) => item.action === 'reconcile');
          if (failed.length || pending.length) {
            toast.warning(
              `Pedido cancelado e estoque atualizado. ${failed.length} nota(s) com falha e ${pending.length} pendente(s) de confirmação. Consulte NF/NFH no card para resolver cada documento.`
            );
          } else {
            toast.success('Pedido cancelado; tratamento fiscal de todas as notas autorizadas concluído.');
          }
        } else if (result.action === 'reconcile') {
          toast.warning(
            result.reconciliationState === 'authorized'
              ? 'Pedido cancelado e estoque restituído. A consulta confirmou a NF autorizada; o cancelamento não foi registrado nem retransmitido.'
              : 'Pedido cancelado e estoque restituído. O resultado fiscal ainda precisa ser verificado; nenhum novo evento foi enviado.'
          );
        } else if (result.action === 'cancel' && result.reconciliationRequired) {
          toast.warning(
            'A SEFAZ confirmou o cancelamento, mas a situação local precisa ser reconciliada.'
          );
        } else {
          toast.success(
            result.action === 'cancel'
              ? 'Pedido cancelado; cancelamento fiscal confirmado pela SEFAZ.'
              : result.action === 'estorno'
                ? 'Pedido cancelado; estorno fiscal preparado para conferência.'
                : 'Pedido cancelado sem documento fiscal autorizado.'
          );
        }
      } catch (error) {
        console.error('Pedido cancelado; efeito fiscal pendente de reconciliação:', error);
        toast.error(
          `Pedido cancelado e estoque revertido. Tratamento fiscal pendente: ${error instanceof Error ? error.message : 'tente novamente.'}`
        );
      }
    }

    try {
      if (isCancelled || (currentOrder.status === 'fulfilled' && newStatus === 'scheduled')) {
        await refresh();
      }
    } catch {
      toast.warning('O pedido foi atualizado, mas a lista não pôde ser recarregada.');
    }
  };

  const retryFiscalCancellation = async (order: Order, documentId?: string) => {
    if (!order.id || order.status !== 'cancelled') return;
    try {
      const result = await processOrderCancellationFiscalEffects(
        order.id,
        String(order.orderIndex || order.orderNumber || order.id),
        {
          ...(documentId ? { documentId } : {}),
          confirmProduction: () =>
            window.confirm(
              'Confirmo o reprocessamento do cancelamento fiscal desta nota em Produção na SEFAZ.'
            ),
        }
      );
      if (result.action === 'reconcile') {
        toast.warning(
          result.reconciliationState === 'authorized'
            ? 'Consulta confirmou a NF autorizada; o cancelamento não foi registrado. Clique novamente para iniciar outra tentativa, se ainda elegível.'
            : 'A consulta não confirmou o resultado final. Nenhum novo evento foi enviado; consulte novamente antes de tentar cancelar.'
        );
      } else if (result.action === 'cancel' && result.reconciliationRequired) {
        toast.warning('Cancelamento confirmado pela SEFAZ; reconciliação local ainda necessária.');
      } else {
        toast.success(
          result.action === 'cancel'
            ? 'Cancelamento fiscal confirmado pela SEFAZ.'
            : result.action === 'estorno'
              ? 'Estorno fiscal preparado para conferência.'
              : 'Não há documento fiscal autorizado pendente neste pedido.'
        );
      }
    } catch (error) {
      toast.error(
        `Tratamento fiscal pendente: ${error instanceof Error ? error.message : 'tente novamente.'}`
      );
    } finally {
      try {
        await refresh();
      } catch {
        toast.warning('A nota foi processada, mas a tela não pôde ser atualizada.');
      }
    }
  };

  const handleBlingUpdate = async (id: string, value: boolean) => {
    const currentOrder = orders.find((o) => o.id === id);
    if (!currentOrder) return;

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, isRegisteredInBling: value } : o)));
    try {
      await updateOrder(id, { isRegisteredInBling: value }, currentOrder);
      toast.success(
        value ? 'Pedido marcado como lançado no Bling!' : 'Enviado para pendência do Bling.'
      );
    } catch (error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id ? { ...o, isRegisteredInBling: currentOrder.isRegisteredInBling } : o
        )
      );
      console.error('Erro ao atualizar flag do Bling:', error);
      toast.error('Erro ao atualizar status do Bling.');
    }
  };

  const handleStockCheckUpdate = async (
    id: string,
    value: boolean,
    updatedItems?: readonly Item[],
    updatedAssistanceItems?: readonly AssistanceItem[]
  ) => {
    const currentOrder = orders.find((o) => o.id === id);
    if (!currentOrder) return;

    const updatePayload: any = { isStockChecked: value };
    if (updatedItems) updatePayload.items = [...updatedItems];
    if (updatedAssistanceItems) updatePayload.assistanceItems = [...updatedAssistanceItems];

    setOrders((prev) => prev.map((o) => (o.id === id ? { ...o, ...updatePayload } : o)));
    try {
      await updateOrder(id, updatePayload, currentOrder);
      toast.success(value ? 'Estoque checado com sucesso!' : 'Checagem parcial salva!');
    } catch (error) {
      setOrders((prev) =>
        prev.map((o) =>
          o.id === id
            ? {
                ...o,
                isStockChecked: currentOrder.isStockChecked,
                items: currentOrder.items,
                assistanceItems: currentOrder.assistanceItems,
              }
            : o
        )
      );
      console.error('Erro ao atualizar status do estoque:', error);
      toast.error('Erro ao atualizar status do estoque.');
    }
  };

  return {
    handleDelete,
    handleRestore,
    handlePermanentDelete,
    handleBulkTrash,
    handleBulkRestore,
    handleBulkPermanentDelete,
    commitStatusUpdate,
    retryFiscalCancellation,
    handleBlingUpdate,
    handleStockCheckUpdate,
  };
};
