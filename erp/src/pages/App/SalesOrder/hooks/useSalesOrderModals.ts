import { useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import Order from '@/pages/types/order.type';
import { OrderHistoryListRef } from '../OrderHistoryList';
import { canGenerateReturn } from '@/pages/utils/returnPolicy';
import { canGenerateAssistance } from '@/pages/utils/assistancePolicy';
import { createSalesOrderDuplicate } from '@/pages/utils/duplicateOrder';
import { prepareOrderFiscalSnapshotForEmission } from '@/pages/utils/nfeEmissionSnapshotService';
import { fetchReturnFiscalEligibility } from '../../FiscalDocuments/services/fiscalOperationDraftService';
import type { NfeEmissionResult } from '@/pages/utils/nfe/nfeService';
import type {
  ReturnFiscalEligibility,
  SourceDocument,
} from '../../FiscalDocuments/types/fiscalOperationDraft.types';

export interface UseSalesOrderModalsProps {
  orderListRef: React.RefObject<OrderHistoryListRef | null>;
  draftsListRef: React.RefObject<OrderHistoryListRef | null>;
  setHighlightOrderId: (id: string | null) => void;
}

export function useSalesOrderModals({
  orderListRef,
  draftsListRef,
  setHighlightOrderId,
}: UseSalesOrderModalsProps) {
  const navigate = useNavigate();

  const [orderModalType, setOrderModalType] = useState<
    'sale' | 'assistance' | 'budget' | 'return' | null
  >(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingInitialStep, setEditingInitialStep] = useState<number | undefined>(undefined);
  const [editingHighlightTemporary, setEditingHighlightTemporary] = useState<boolean>(false);
  const [editingReconciliationMode, setEditingReconciliationMode] = useState<boolean>(false);
  const [detailsOrder, setDetailsOrder] = useState<Order | null>(null);
  const [postOrderDetails, setPostOrderDetails] = useState<Order | null>(null);
  const [returningOrder, setReturningOrder] = useState<Order | null>(null);
  const [nfeChoiceOrder, setNfeChoiceOrder] = useState<Order | null>(null);
  const [chosenNfeEnvironment, setChosenNfeEnvironment] = useState<1 | 2>(1);
  const [nfeModalOrder, setNfeModalOrder] = useState<Order | null>(null);
  const [nfeEmissionOpenedAt, setNfeEmissionOpenedAt] = useState<number | undefined>();
  const [nfeSnapshotPreparationOrderId, setNfeSnapshotPreparationOrderId] = useState<string | null>(null);
  const nfeSnapshotPreparationInProgress = useRef(false);
  const [issuedFiscalDocument, setIssuedFiscalDocument] = useState<{
    result: NfeEmissionResult;
    order: Order;
  } | null>(null);
  const [fiscalDocumentToView, setFiscalDocumentToView] = useState<{
    documentId: string;
    environment: 1 | 2;
  } | null>(null);
  const [returnFiscalEligibility, setReturnFiscalEligibility] = useState<ReturnFiscalEligibility | null>(null);
  const [returnFiscalSelection, setReturnFiscalSelection] = useState<{
    source: SourceDocument;
    draftId: string | null;
    returnOrderId: string;
    returnOrderIndex: number | null;
  } | null>(null);
  const [duplicatingOrder, setDuplicatingOrder] = useState<Order | null>(null);
  const [assistanceSourceOrder, setAssistanceSourceOrder] = useState<Order | null>(null);

  const refreshLists = useCallback(() => {
    orderListRef.current?.refresh();
    draftsListRef.current?.refresh();
  }, [orderListRef, draftsListRef]);

  const handleOrderAction = useCallback((key: string, order: Order) => {
    if (key === 'generateReturn') {
      if (!canGenerateReturn(order)) return;
      setReturningOrder(order);
    } else if (key === 'generateAssistance' || key === 'GENERATE_ASSISTANCE') {
      if (!canGenerateAssistance(order)) return;
      setAssistanceSourceOrder(order);
    } else if (key === 'duplicateOrder') {
      const duplicated = {
        ...createSalesOrderDuplicate(order),
        date: new Date().toISOString(),
      };
      if (duplicated.orderType === 'assistance') {
        setDuplicatingOrder({ ...duplicated });
      } else {
        sessionStorage.setItem('pdv_duplicate_order', JSON.stringify(duplicated));
        navigate(`/sales-order/new?type=${duplicated.orderType || 'sale'}&duplicate=true`);
      }
    } else if (key === 'generateSaleFromBudget') {
      const duplicated = {
        ...createSalesOrderDuplicate(order),
        orderType: 'sale' as const,
        date: new Date().toISOString(),
      };
      sessionStorage.setItem('pdv_duplicate_order', JSON.stringify(duplicated));
      navigate(`/sales-order/new?type=sale&duplicate=true`);
    } else if (key === 'issueNfe' || key === 'ISSUE_NFE') {
      setNfeChoiceOrder(order);
    } else if (key === 'openReturnNfe' && order.orderType === 'return' && order.id) {
      void fetchReturnFiscalEligibility(order.id, { reviewCancelled: true })
        .then((eligibility) => setReturnFiscalEligibility(eligibility))
        .catch((cause) => {
          setReturnFiscalEligibility({
            eligible: false,
            returnOrderId: order.id || '',
            hasAuthorizedOriginal: false,
            reason:
              cause instanceof Error
                ? cause.message
                : 'Não foi possível verificar a elegibilidade fiscal da devolução.',
            sources: [],
          });
        });
    }
  }, [navigate]);

  const handleDirectIssueNfe = useCallback(async (order: Order, environment: 1 | 2 = 1) => {
    if (nfeSnapshotPreparationInProgress.current) return;
    nfeSnapshotPreparationInProgress.current = true;
    setNfeSnapshotPreparationOrderId(order.id || 'pending');
    try {
      const preparedOrder = await prepareOrderFiscalSnapshotForEmission(order, environment);
      setChosenNfeEnvironment(environment);
      setNfeEmissionOpenedAt(performance.now());
      setNfeModalOrder(preparedOrder);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Não foi possível preparar os dados fiscais do pedido.'
      );
    } finally {
      nfeSnapshotPreparationInProgress.current = false;
      setNfeSnapshotPreparationOrderId(null);
    }
  }, []);

  return {
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
    refreshLists,
    handleOrderAction,
    handleDirectIssueNfe,
  };
}

export type SalesOrderModalsManager = ReturnType<typeof useSalesOrderModals>;
