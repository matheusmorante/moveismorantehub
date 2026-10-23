import React, { forwardRef, useImperativeHandle } from 'react';
import Order, { VisibilitySettings } from '../../../types/order.type';
import { useOrderHistory } from './useOrderHistory';
import OrderHistoryTable from './OrderHistoryTable';
import StockActionModal from '../OrderActions/StockActionModal';
import ConfirmModal from '@/components/shared/ConfirmModal';
import ReturnFulfillmentConfirmModal from './ReturnFulfillmentConfirmModal';
import CancelReturnModal from './CancelReturnModal';
import OrderPagination from './OrderPagination';
import OrderCustomerSearchBar from './OrderCustomerSearchBar';
import {
  OrderHistoryEmptyPageNotice,
  OrderHistoryEmptyView,
  OrderHistoryErrorView,
  OrderHistoryLoadingView,
} from './OrderHistoryStateViews';
import { useOrderHistoryConfirmations } from './useOrderHistoryConfirmations';

type OrderHistoryListProps = {
  onEdit: (
    order: Order,
    initialStep?: number,
    highlightTemporary?: boolean,
    reconciliationMode?: boolean
  ) => void;
  onViewDetails?: (order: Order) => void;
  onViewFiscalDocument?: (documentId: string, environment: 1 | 2) => void;
  onShowPostSaleActions?: (order: Order) => void;
  filters?: any;
  visibilitySettings: VisibilitySettings;
  onToggleColumn: (column: keyof VisibilitySettings) => void;
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  highlightOrderId?: string | null;
  onFilterByOrderId?: (id: string) => void;
  customerSearchInput?: string;
  onCustomerSearchChange?: (name: string) => void;
  onCustomerSearchClear?: () => void;
  onCustomerSearchKeyDown?: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  onAction?: (actionKey: string, order: Order) => void;
  onIssueNfe?: (order: Order, environment: 1 | 2) => void;
};

export interface OrderHistoryListRef {
  refresh: () => void;
  markFiscalDocumentAuthorized: (
    orderId: string,
    environment: 1 | 2,
    documentId: string
  ) => void;
}

const OrderHistoryList = forwardRef<OrderHistoryListRef, OrderHistoryListProps>(
  (
    {
      onEdit,
      onViewDetails,
      onViewFiscalDocument,
      onShowPostSaleActions,
      filters,
      visibilitySettings,
      onToggleColumn,
      onSort,
      highlightOrderId,
      onFilterByOrderId,
      customerSearchInput,
      onCustomerSearchChange,
      onCustomerSearchClear,
      onCustomerSearchKeyDown,
      onAction: onActionProp,
      onIssueNfe,
    },
    ref
  ) => {
    const {
      orders,
      fiscalBadgeStatusByOrderId,
      fiscalBadgeLoadingByOrderId,
      loading,
      error,
      handleDelete: onDelete,
      handleRestore,
      handlePermanentDelete: onPermanentDelete,
      handleAction,
      handleStatusUpdate,
      pendingReturnFulfillment,
      returnFulfillmentBusy,
      confirmReturnFulfillment,
      cancelReturnFulfillment,
      pendingReturnCancellation,
      returnCancellationBusy,
      confirmReturnCancellation,
      cancelReturnCancellation,
      totalItems,
      selectedOrders,
      toggleSelection,
      selectAll,
      clearSelection,
      handleBulkTrash: onBulkTrash,
      handleBulkRestore,
      handleBulkPermanentDelete: onBulkPermanentDelete,
      handleStockCheckUpdate,
      refresh,
      markFiscalDocumentAuthorized,
      currentPage,
      totalPages,
      setCurrentPage,
    } = useOrderHistory(filters);

    const {
      confirmModal,
      closeConfirmModal,
      handleDelete,
      handlePermanentDelete,
      handleBulkTrash,
      handleBulkPermanentDelete,
    } = useOrderHistoryConfirmations({
      onDelete,
      onPermanentDelete,
      onBulkTrash,
      onBulkPermanentDelete,
      selectedOrdersCount: selectedOrders.length,
    });

    // Auto-scroll para o início da lista ao mudar de página
    React.useEffect(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
      const scrollContainers = document.querySelectorAll('.overflow-y-auto, .overflow-auto, main');
      scrollContainers.forEach((el) => {
        el.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }, [currentPage]);

    useImperativeHandle(ref, () => ({
      refresh,
      markFiscalDocumentAuthorized,
    }));

    const [stockModal, setStockModal] = React.useState<{
      order: Order;
      type: 'withdrawal' | 'entry';
    } | null>(null);

    const onAction = (actionKey: string, order: Order) => {
      if (onActionProp) {
        onActionProp(actionKey, order);
      }

      if (actionKey === 'stockWithdrawal') {
        setStockModal({ order, type: 'withdrawal' });
        return;
      }
      if (actionKey === 'stockReversal') {
        setStockModal({ order, type: 'entry' });
        return;
      }
      handleAction(actionKey, order);
    };

    const [showTroubleshoot, setShowTroubleshoot] = React.useState(false);

    React.useEffect(() => {
      if (loading) {
        const timer = setTimeout(() => setShowTroubleshoot(true), 3000);
        return () => clearTimeout(timer);
      } else {
        setShowTroubleshoot(false);
      }
    }, [loading]);

    const renderContent = () => {
      if (loading && orders.length === 0) {
        return <OrderHistoryLoadingView showTroubleshoot={showTroubleshoot} />;
      }

      if (error && orders.length === 0) {
        return <OrderHistoryErrorView onRetry={() => void refresh()} />;
      }

      if (orders.length === 0 && !(!filters?.showTestOrders && totalItems > 0)) {
        return <OrderHistoryEmptyView isTrash={Boolean(filters?.showTrash)} />;
      }

      return (
        <div className="flex flex-col gap-4 flex-1">
          {orders.length === 0 ? (
            <OrderHistoryEmptyPageNotice />
          ) : (
            <OrderHistoryTable
              orders={orders}
              fiscalBadgeStatusByOrderId={fiscalBadgeStatusByOrderId}
              fiscalBadgeLoadingByOrderId={fiscalBadgeLoadingByOrderId}
              onEdit={onEdit}
              onViewDetails={onViewDetails}
              onViewFiscalDocument={onViewFiscalDocument}
              onShowPostSaleActions={onShowPostSaleActions}
              onIssueNfe={onIssueNfe}
              onDelete={handleDelete}
              onRestore={handleRestore}
              onPermanentDelete={handlePermanentDelete}
              onAction={onAction}
              onStatusUpdate={handleStatusUpdate}
              visibilitySettings={visibilitySettings}
              onToggleColumn={onToggleColumn}
              showTrash={filters?.showTrash}
              filters={filters}
              onSort={onSort}
              selectedOrders={selectedOrders}
              onToggleSelection={toggleSelection}
              onSelectAll={selectAll}
              onClearSelection={clearSelection}
              onBulkTrash={handleBulkTrash}
              onBulkRestore={handleBulkRestore}
              onBulkPermanentDelete={handleBulkPermanentDelete}
              onStockCheckUpdate={handleStockCheckUpdate}
              highlightOrderId={highlightOrderId}
              onFilterByOrderId={onFilterByOrderId}
            />
          )}

          {/* Controles de Paginação (Lá em baixo, para tabela e cards) */}
          <OrderPagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalItems}
            itemsPerPage={15}
            onPageChange={setCurrentPage}
            loading={loading}
          />
        </div>
      );
    };

    return (
      <div className="w-full flex flex-col gap-4 flex-1 min-h-0">
        {onCustomerSearchChange && (
          <div className="w-full">
            <OrderCustomerSearchBar
              value={customerSearchInput !== undefined ? customerSearchInput : (filters?.customerName || '')}
              onChange={onCustomerSearchChange}
              onClear={onCustomerSearchClear}
              onKeyDown={onCustomerSearchKeyDown}
              placeholder="Buscar pedido pelo nome do cliente (mín. 3 caracteres)..."
            />
          </div>
        )}

        {renderContent()}

        {stockModal && (
          <StockActionModal
            isOpen={!!stockModal}
            order={stockModal.order}
            type={stockModal.type}
            onClose={() => setStockModal(null)}
          />
        )}

        {pendingReturnFulfillment && (
          <ReturnFulfillmentConfirmModal
            order={pendingReturnFulfillment}
            isBusy={returnFulfillmentBusy}
            onCancel={cancelReturnFulfillment}
            onConfirm={confirmReturnFulfillment}
          />
        )}

        {pendingReturnCancellation && (
          <CancelReturnModal
            order={pendingReturnCancellation}
            isBusy={returnCancellationBusy}
            onCancel={cancelReturnCancellation}
            onConfirm={confirmReturnCancellation}
          />
        )}

        <ConfirmModal
          isOpen={confirmModal.isOpen}
          onClose={closeConfirmModal}
          onConfirm={confirmModal.onConfirm}
          title={confirmModal.title}
          message={confirmModal.message}
          type={confirmModal.type}
          confirmLabel="Confirmar"
          cancelLabel="Cancelar"
        />
      </div>
    );
  }
);

export default OrderHistoryList;
