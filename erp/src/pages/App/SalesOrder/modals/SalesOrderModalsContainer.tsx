import React from 'react';
import Order from '@/pages/types/order.type';
import { OrderHistoryListRef } from '../OrderHistoryList';
import { SalesOrderModalsManager } from '../hooks/useSalesOrderModals';
import NewSaleOrder from '../pages/NewSaleOrder.tsx';
import UnlinkedReturnOrderModal from './UnlinkedReturnOrderModal';
import AssistanceOrderModal from './AssistanceOrderModal';
import OrderEditModal from './OrderEditModal';
import PostOrderActionsModal from '../OrderActions/PostOrderActionsModal';
import ReturnOrderModal from '../OrderActions/ReturnOrderModal';
import NfeEmissionModal from '../OrderActions/NfeEmissionModal';
import NfeEnvironmentChoiceModal from '../OrderActions/nfe-modal/NfeEnvironmentChoiceModal';
import OrderDetailsModal from '../../DeliverySchedule/OrderDetailsModal';
import { IssuedFiscalDocumentDetailsModal } from '../../FiscalDocuments/modals/IssuedFiscalDocumentDetailsModal';
import NfeOperationDraftModal from '../../FiscalDocuments/modals/NfeOperationDraftModal';
import { ReturnFiscalSourcePickerModal } from '../../FiscalDocuments/modals/ReturnFiscalSourcePickerModal';
import { fetchOrderById } from '@/pages/utils/orderHistoryService';

interface SalesOrderModalsContainerProps {
  modals: SalesOrderModalsManager;
  orderListRef: React.RefObject<OrderHistoryListRef | null>;
  draftsListRef: React.RefObject<OrderHistoryListRef | null>;
  setHighlightOrderId: (id: string | null) => void;
}

export const SalesOrderModalsContainer: React.FC<SalesOrderModalsContainerProps> = ({
  modals,
  orderListRef,
  draftsListRef,
  setHighlightOrderId,
}) => {
  const {
    orderModalType,
    setOrderModalType,
    editingOrder,
    setEditingOrder,
    editingInitialStep,
    setEditingInitialStep,
    editingHighlightTemporary,
    setEditingHighlightTemporary,
    editingReconciliationMode,
    setEditingReconciliationMode,
    detailsOrder,
    setDetailsOrder,
    postOrderDetails,
    setPostOrderDetails,
    returningOrder,
    setReturningOrder,
    nfeChoiceOrder,
    setNfeChoiceOrder,
    chosenNfeEnvironment,
    setChosenNfeEnvironment,
    nfeModalOrder,
    setNfeModalOrder,
    nfeEmissionOpenedAt,
    setNfeEmissionOpenedAt,
    nfeSnapshotPreparationOrderId,
    issuedFiscalDocument,
    setIssuedFiscalDocument,
    fiscalDocumentToView,
    setFiscalDocumentToView,
    returnFiscalEligibility,
    setReturnFiscalEligibility,
    returnFiscalSelection,
    setReturnFiscalSelection,
    duplicatingOrder,
    setDuplicatingOrder,
    assistanceSourceOrder,
    setAssistanceSourceOrder,
  } = modals;

  const triggerSaveHighlight = (id?: string, order?: Order) => {
    if (id) {
      setHighlightOrderId(id);
      orderListRef.current?.refresh();
      draftsListRef.current?.refresh();
      if (order && (order.orderType === 'sale' || order.orderType === 'assistance')) {
        setPostOrderDetails(order);
      }
      setTimeout(() => setHighlightOrderId(null), 5000);
    }
  };

  return (
    <>
      {orderModalType && orderModalType !== 'assistance' && orderModalType !== 'return' && (
        <NewSaleOrder
          orderType={orderModalType}
          onClose={() => {
            setOrderModalType(null);
            orderListRef.current?.refresh();
            draftsListRef.current?.refresh();
          }}
          onSaveSuccess={(id, order) => {
            setOrderModalType(null);
            triggerSaveHighlight(id, order);
          }}
        />
      )}

      {orderModalType === 'return' && (
        <UnlinkedReturnOrderModal
          onClose={() => {
            setOrderModalType(null);
            orderListRef.current?.refresh();
            draftsListRef.current?.refresh();
          }}
          onSaveSuccess={(id) => {
            setOrderModalType(null);
            if (id) {
              setHighlightOrderId(id);
              orderListRef.current?.refresh();
              setTimeout(() => setHighlightOrderId(null), 5000);
            }
          }}
        />
      )}

      {orderModalType === 'assistance' && (
        <AssistanceOrderModal
          onClose={() => {
            setOrderModalType(null);
            orderListRef.current?.refresh();
            draftsListRef.current?.refresh();
          }}
          onSaveSuccess={(id, order) => {
            setOrderModalType(null);
            triggerSaveHighlight(id, order);
          }}
        />
      )}

      {assistanceSourceOrder && (
        <AssistanceOrderModal
          sourceOrder={assistanceSourceOrder}
          onClose={() => {
            setAssistanceSourceOrder(null);
            orderListRef.current?.refresh();
            draftsListRef.current?.refresh();
          }}
          onSaveSuccess={(id, order) => {
            setAssistanceSourceOrder(null);
            triggerSaveHighlight(id, order);
          }}
        />
      )}

      {editingOrder && editingOrder.orderType !== 'assistance' && (
        <OrderEditModal
          order={editingOrder}
          orderId={editingOrder.id}
          initialStep={editingInitialStep}
          highlightTemporaryItems={editingHighlightTemporary}
          reconciliationMode={editingReconciliationMode}
          onClose={() => {
            setEditingOrder(null);
            setEditingInitialStep(undefined);
            setEditingHighlightTemporary(false);
            setEditingReconciliationMode(false);
            orderListRef.current?.refresh();
            draftsListRef.current?.refresh();
          }}
          onSaveSuccess={(id, order) => {
            setEditingOrder(null);
            setEditingInitialStep(undefined);
            setEditingHighlightTemporary(false);
            setEditingReconciliationMode(false);
            triggerSaveHighlight(id, order);
          }}
        />
      )}

      {editingOrder && editingOrder.orderType === 'assistance' && (
        <AssistanceOrderModal
          order={editingOrder}
          onClose={() => {
            setEditingOrder(null);
            orderListRef.current?.refresh();
            draftsListRef.current?.refresh();
          }}
          onSaveSuccess={(id, order) => {
            triggerSaveHighlight(id, order);
          }}
        />
      )}

      {duplicatingOrder && duplicatingOrder.orderType === 'assistance' && (
        <AssistanceOrderModal
          order={duplicatingOrder}
          onClose={() => {
            setDuplicatingOrder(null);
            orderListRef.current?.refresh();
            draftsListRef.current?.refresh();
          }}
          onSaveSuccess={(id, order) => {
            triggerSaveHighlight(id, order);
          }}
        />
      )}

      {postOrderDetails && (
        <PostOrderActionsModal
          order={postOrderDetails}
          onClose={() => setPostOrderDetails(null)}
          onIssueNfe={(order) => setNfeChoiceOrder(order)}
        />
      )}

      {detailsOrder && (
        <OrderDetailsModal order={detailsOrder} isReadOnly onClose={() => setDetailsOrder(null)} />
      )}

      {returningOrder && (
        <ReturnOrderModal
          order={returningOrder}
          onClose={() => setReturningOrder(null)}
          onSuccess={(newId) => {
            setReturningOrder(null);
            orderListRef.current?.refresh();
            void fetchOrderById(newId).then((savedReturn) => {
              if (savedReturn) setPostOrderDetails(savedReturn);
            });
          }}
        />
      )}

      {nfeChoiceOrder && (
        <NfeEnvironmentChoiceModal
          isOpen={Boolean(nfeChoiceOrder)}
          order={nfeChoiceOrder}
          onClose={() => setNfeChoiceOrder(null)}
          onSelectEnvironment={(env, preparedOrder) => {
            setNfeChoiceOrder(null);
            setChosenNfeEnvironment(env);
            setNfeEmissionOpenedAt(performance.now());
            setNfeModalOrder(preparedOrder);
          }}
        />
      )}

      {nfeSnapshotPreparationOrderId && (
        <div
          role="status"
          aria-live="polite"
          className="fixed inset-0 z-[10000000] flex items-center justify-center bg-slate-900/40 p-4"
        >
          <div className="flex items-center gap-3 rounded-2xl bg-white px-6 py-5 text-sm font-semibold text-slate-700 shadow-2xl dark:bg-slate-900 dark:text-slate-200">
            <i className="bi bi-arrow-repeat animate-spin text-xl text-blue-600" />
            <span>Preparando os dados fiscais do pedido...</span>
          </div>
        </div>
      )}

      {nfeModalOrder && (
        <NfeEmissionModal
          isOpen={Boolean(nfeModalOrder)}
          order={nfeModalOrder}
          initialEnvironment={chosenNfeEnvironment}
          emissionOpenedAt={nfeEmissionOpenedAt}
          onClose={() => {
            setNfeModalOrder(null);
            setNfeEmissionOpenedAt(undefined);
          }}
          onSuccess={(result) => {
            const emittedOrder = nfeModalOrder;
            setNfeModalOrder(null);
            setNfeEmissionOpenedAt(undefined);
            const emittedOrderId = emittedOrder?.id || result.orderId;
            if (emittedOrderId && result.documentId && result.environment) {
              orderListRef.current?.markFiscalDocumentAuthorized(
                emittedOrderId,
                result.environment,
                result.documentId
              );
            } else {
              orderListRef.current?.refresh();
            }
            if (emittedOrder) setIssuedFiscalDocument({ result, order: emittedOrder });
          }}
        />
      )}

      {issuedFiscalDocument && (
        <IssuedFiscalDocumentDetailsModal
          emissionResult={issuedFiscalDocument.result}
          order={issuedFiscalDocument.order}
          onClose={() => setIssuedFiscalDocument(null)}
          onIssueNfe={(targetOrder, env) => {
            setIssuedFiscalDocument(null);
            setChosenNfeEnvironment(env);
            setNfeEmissionOpenedAt(performance.now());
            setNfeModalOrder(targetOrder);
          }}
        />
      )}

      {fiscalDocumentToView && (
        <IssuedFiscalDocumentDetailsModal
          documentId={fiscalDocumentToView.documentId}
          initialEnvironment={fiscalDocumentToView.environment}
          fullScreen={fiscalDocumentToView.environment === 1}
          onClose={() => setFiscalDocumentToView(null)}
          onIssueNfe={(targetOrder, env) => {
            setFiscalDocumentToView(null);
            setChosenNfeEnvironment(env);
            setNfeEmissionOpenedAt(performance.now());
            setNfeModalOrder(targetOrder);
          }}
        />
      )}

      {returnFiscalEligibility && !returnFiscalSelection && (
        <ReturnFiscalSourcePickerModal
          eligibility={returnFiscalEligibility}
          onClose={() => setReturnFiscalEligibility(null)}
          onSelect={(source, draftId) => {
            setReturnFiscalSelection({
              source,
              draftId,
              returnOrderId: returnFiscalEligibility.returnOrderId,
              returnOrderIndex: returnFiscalEligibility.returnOrderIndex ?? null,
            });
            setReturnFiscalEligibility(null);
          }}
          onView={(documentId, environment) => {
            setFiscalDocumentToView({ documentId, environment });
            setReturnFiscalEligibility(null);
          }}
        />
      )}

      {returnFiscalSelection && (
        <NfeOperationDraftModal
          sourceDocument={returnFiscalSelection.source}
          initialDraftId={returnFiscalSelection.draftId}
          mode="return"
          returnOrderId={returnFiscalSelection.returnOrderId}
          returnOrderIndex={returnFiscalSelection.returnOrderIndex}
          onClose={() => setReturnFiscalSelection(null)}
          onAuthorized={() => {
            setReturnFiscalSelection(null);
            orderListRef.current?.refresh();
          }}
        />
      )}
    </>
  );
};

export default SalesOrderModalsContainer;
