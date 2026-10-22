import React, { useState, useRef, useEffect } from 'react';
import OrderHistoryList, { OrderHistoryListRef } from './OrderHistoryList';
import OrderFilters from './components/OrderFilters';
import { useAuth } from '@/context/AuthContext';
import { hasFiscalOperationRole } from '@/pages/utils/nfe/fiscalAuthorization';
import { prefetchNfeNumberPreviews } from '@/pages/utils/nfe/nfeNumberPreviewPrefetch';
import { useSalesOrderRoutingFilters } from './hooks/useSalesOrderRoutingFilters';
import { useSalesOrderModals } from './hooks/useSalesOrderModals';
import SalesOrderModalsContainer from './modals/SalesOrderModalsContainer';
import { SalesOrderTopToolbar } from './components/SalesOrderTopToolbar';
import { OrderCollectionOverlayModal } from './modals/OrderCollectionOverlayModal';

const SalesOrder = () => {
  const [highlightOrderId, setHighlightOrderId] = useState<string | null>(null);
  const orderListRef = useRef<OrderHistoryListRef>(null);
  const trashListRef = useRef<OrderHistoryListRef>(null);
  const draftsListRef = useRef<OrderHistoryListRef>(null);

  const { profile, isAdministrator } = useAuth();
  const canOperateFiscal = hasFiscalOperationRole(profile);

  const modals = useSalesOrderModals({
    orderListRef,
    draftsListRef,
    setHighlightOrderId,
  });

  const routingFilters = useSalesOrderRoutingFilters({
    setHighlightOrderId,
    setOrderModalType: modals.setOrderModalType,
    isAdministrator,
  });

  const {
    isBudgetRoute,
    isAssistanceRoute,
    isReturnRoute,
    isSalesOrderRoute,
    showOrderFilters,
    filters,
    setFilters,
    customerSearchInput,
    handleCustomerSearchChange,
    handleClearCustomerSearch,
    handleCustomerSearchKeyDown,
    clearCustomerSearchDebounceTimer,
    handleCustomerSearchBlur,
    visibilitySettings,
    toggleVisibility,
    handleSort,
    showTestOrders,
    setShowTestOrders,
    activeFilters,
    trashFilters,
    draftFilters,
  } = routingFilters;

  useEffect(() => {
    if (!isSalesOrderRoute || !canOperateFiscal) return;
    void prefetchNfeNumberPreviews();
  }, [canOperateFiscal, isSalesOrderRoute]);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [isDraftsOpen, setIsDraftsOpen] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  return (
    <div className="flex min-h-screen transition-colors duration-300 relative pb-16">
      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col min-w-0 ${
          isAssistanceRoute
            ? 'px-2 pt-3 pb-2 sm:px-4 sm:pt-3 sm:pb-4 lg:px-6 lg:pt-3 lg:pb-6'
            : isSalesOrderRoute
              ? 'px-2 pt-1 pb-2 sm:px-4 sm:pt-2 sm:pb-4 lg:px-6 lg:pt-2 lg:pb-6'
              : 'p-2 sm:p-4 lg:p-6'
        }`}
      >
        <SalesOrderTopToolbar
          isSalesOrderRoute={isSalesOrderRoute}
          isBudgetRoute={isBudgetRoute}
          isAssistanceRoute={isAssistanceRoute}
          isReturnRoute={isReturnRoute}
          isAdministrator={Boolean(isAdministrator)}
          showTestOrders={showTestOrders}
          onToggleShowTestOrders={setShowTestOrders}
          customerSearchInput={customerSearchInput}
          onCustomerSearchChange={handleCustomerSearchChange}
          onCustomerSearchFocus={clearCustomerSearchDebounceTimer}
          onCustomerSearchBlur={handleCustomerSearchBlur}
          onCustomerSearchKeyDown={handleCustomerSearchKeyDown}
          onCustomerSearchClear={handleClearCustomerSearch}
          showSettings={showSettings}
          onToggleShowSettings={() => setShowSettings((prev) => !prev)}
          onCloseSettings={() => setShowSettings(false)}
          visibilitySettings={visibilitySettings}
          onToggleVisibility={toggleVisibility}
          showOrderFilters={showOrderFilters}
          isSidebarOpen={isSidebarOpen}
          onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
          onCreateOrder={(type) => modals.setOrderModalType(type)}
        />

        <div className="flex flex-col gap-3 flex-1">
          <div className="bg-transparent transition-colors flex-1 flex flex-col overflow-visible">
            <div className="flex flex-1 min-w-0 gap-4 items-start">
              {showOrderFilters && (
                <div
                  className={`transition-all duration-300 ease-in-out border border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900/50 fixed inset-0 lg:relative lg:inset-auto z-50 h-full rounded-2xl ${
                    isSidebarOpen
                      ? 'w-full lg:w-80 shadow-2xl lg:shadow-none'
                      : 'w-0 opacity-0 overflow-hidden border-none'
                  } min-[1701px]:!sticky min-[1701px]:!top-20 min-[1701px]:!inset-auto min-[1701px]:!z-auto min-[1701px]:!w-80 min-[1701px]:!opacity-100 min-[1701px]:!overflow-hidden min-[1701px]:!border min-[1701px]:!shadow-none min-[1701px]:!shrink-0`}
                >
                  <div className="lg:hidden flex justify-end p-4 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
                    <button
                      onClick={() => setIsSidebarOpen(false)}
                      className="text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100 p-2"
                    >
                      <i className="bi bi-x-lg text-xl" />
                    </button>
                  </div>
                  <OrderFilters filters={filters} setFilters={setFilters} />
                </div>
              )}
              {showOrderFilters && isSidebarOpen && (
                <div
                  className="lg:hidden fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-sm"
                  onClick={() => setIsSidebarOpen(false)}
                />
              )}

              <div className="flex-1 min-w-0 flex flex-col">
                <OrderHistoryList
                  onEdit={(order, initialStep, highlightTemporary, reconciliationMode) => {
                    modals.setEditingInitialStep(initialStep);
                    modals.setEditingHighlightTemporary(!!highlightTemporary);
                    modals.setEditingReconciliationMode(!!reconciliationMode);
                    modals.setEditingOrder(order);
                  }}
                  onViewDetails={modals.setDetailsOrder}
                  onViewFiscalDocument={(documentId, environment) =>
                    modals.setFiscalDocumentToView({ documentId, environment })
                  }
                  filters={activeFilters}
                  visibilitySettings={visibilitySettings}
                  onToggleColumn={toggleVisibility}
                  onSort={handleSort}
                  highlightOrderId={highlightOrderId}
                  ref={orderListRef}
                  onFilterByOrderId={(id) => setFilters((prev) => ({ ...prev, searchId: id }))}
                  customerSearchInput={isSalesOrderRoute ? undefined : customerSearchInput}
                  onCustomerSearchChange={
                    isSalesOrderRoute
                      ? undefined
                      : handleCustomerSearchChange
                  }
                  onCustomerSearchClear={isSalesOrderRoute ? undefined : handleClearCustomerSearch}
                  onCustomerSearchKeyDown={isSalesOrderRoute ? undefined : handleCustomerSearchKeyDown}
                  onAction={modals.handleOrderAction}
                  onIssueNfe={modals.handleDirectIssueNfe}
                  onShowPostSaleActions={modals.setPostOrderDetails}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trash Modal */}
      <OrderCollectionOverlayModal
        isOpen={isTrashOpen}
        onClose={() => setIsTrashOpen(false)}
        variant="trash"
        listRef={trashListRef}
        filters={trashFilters}
        visibilitySettings={visibilitySettings}
        onToggleColumn={toggleVisibility}
        onSort={handleSort}
        highlightOrderId={highlightOrderId}
        onFilterByOrderId={(id) => setFilters((prev) => ({ ...prev, searchId: id }))}
        onAction={modals.handleOrderAction}
        onViewFiscalDocument={(documentId, environment) =>
          modals.setFiscalDocumentToView({ documentId, environment })
        }
        onEdit={(order, initialStep, highlightTemporary, reconciliationMode) => {
          modals.setEditingInitialStep(initialStep);
          modals.setEditingHighlightTemporary(!!highlightTemporary);
          modals.setEditingReconciliationMode(!!reconciliationMode);
          modals.setEditingOrder(order);
        }}
      />

      {/* Drafts Modal */}
      <OrderCollectionOverlayModal
        isOpen={isDraftsOpen}
        onClose={() => setIsDraftsOpen(false)}
        variant="drafts"
        listRef={draftsListRef}
        filters={draftFilters}
        visibilitySettings={visibilitySettings}
        onToggleColumn={toggleVisibility}
        onSort={handleSort}
        highlightOrderId={highlightOrderId}
        onFilterByOrderId={(id) => setFilters((prev) => ({ ...prev, searchId: id }))}
        onAction={modals.handleOrderAction}
        onViewFiscalDocument={(documentId, environment) =>
          modals.setFiscalDocumentToView({ documentId, environment })
        }
        onEdit={(order) => {
          modals.setEditingOrder(order);
        }}
      />

      {/* Contêiner Modularizado dos Modais */}
      <SalesOrderModalsContainer
        modals={modals}
        orderListRef={orderListRef}
        draftsListRef={draftsListRef}
        setHighlightOrderId={setHighlightOrderId}
      />
    </div>
  );
};

export default SalesOrder;
