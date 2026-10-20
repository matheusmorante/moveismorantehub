import React from 'react';
import type Order from '@/pages/types/order.type';
import { OrderEditModalHeader } from './OrderEditModalHeader';
import { OrderEditSubModals } from './OrderEditSubModals';
import SalesOrderFormSection from '../../../components/SalesOrderFormSection';
import ProductReconciliationItems from '../../../components/ProductReconciliationItems';
import OrderStatusTimeline from '../../../components/OrderStatusTimeline';
import type { useSalesOrderForm } from '../../../hooks/useSalesOrderForm';

interface OrderEditModalContentProps {
  readonly effectiveOrder: Order;
  readonly form: ReturnType<typeof useSalesOrderForm>;
  readonly reconciliationMode?: boolean;
  readonly highlightTemporaryItems?: boolean;
  readonly view: 'form' | 'timeline';
  readonly onClose: () => void;
  readonly scrollContainerRef: React.RefObject<HTMLDivElement>;

  // Submodals & handlers
  readonly isSellerSearchOpen: boolean;
  readonly isSellerRegistrationOpen: boolean;
  readonly sellerRef: React.RefObject<HTMLButtonElement>;
  readonly isCustomerRegistrationOpen: boolean;
  readonly pendingCustomerData: any;
  readonly pendingUpdate: Order | null;
  readonly isReconciliationConfirmationOpen: boolean;
  readonly onSelectSeller: (name: string) => void;
  readonly onCloseSellerSearch: () => void;
  readonly onAddNewSeller: () => void;
  readonly onCloseSellerRegistration: () => void;
  readonly onSellerRegistered: (newSeller: any) => void;
  readonly onCloseCustomerRegistration: () => void;
  readonly onCustomerRegistered: (person: any) => void;
  readonly onCancelPendingUpdate: () => void;
  readonly onConfirmPendingUpdate: () => void;
  readonly onOpenSellerSearch: () => void;
  readonly onOpenReconciliationConfirmation: () => void;
  readonly onCloseReconciliationConfirmation: () => void;
  readonly onConfirmReconciliation: () => void;

  // Form actions
  readonly onLoadJSON: (json: any) => boolean;
  readonly handleUpdate: (e?: React.MouseEvent) => Promise<string | false>;
  readonly handleFinalize: (e?: React.MouseEvent) => Promise<string | false>;
}

export const OrderEditModalContent: React.FC<OrderEditModalContentProps> = ({
  effectiveOrder,
  form,
  reconciliationMode,
  highlightTemporaryItems,
  view,
  onClose,
  scrollContainerRef,
  isSellerSearchOpen,
  isSellerRegistrationOpen,
  sellerRef,
  isCustomerRegistrationOpen,
  pendingCustomerData,
  pendingUpdate,
  isReconciliationConfirmationOpen,
  onSelectSeller,
  onCloseSellerSearch,
  onAddNewSeller,
  onCloseSellerRegistration,
  onSellerRegistered,
  onCloseCustomerRegistration,
  onCustomerRegistered,
  onCancelPendingUpdate,
  onConfirmPendingUpdate,
  onOpenSellerSearch,
  onOpenReconciliationConfirmation,
  onCloseReconciliationConfirmation,
  onConfirmReconciliation,
  onLoadJSON,
  handleUpdate,
  handleFinalize,
}) => {
  return (
    <div
      className="bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden"
      onClick={(e) => e.stopPropagation()}
    >
      <OrderEditModalHeader
        reconciliationMode={reconciliationMode}
        currentStep={form.state.currentStep}
        jumpToStep={form.actions.jumpToStep}
        errors={form.state.errors}
        onClose={onClose}
      />

      <OrderEditSubModals
        isSellerSearchOpen={isSellerSearchOpen}
        sellerRef={sellerRef}
        onSelectSeller={onSelectSeller}
        onCloseSellerSearch={onCloseSellerSearch}
        onAddNewSeller={onAddNewSeller}
        isSellerRegistrationOpen={isSellerRegistrationOpen}
        onCloseSellerRegistration={onCloseSellerRegistration}
        onSellerRegistered={onSellerRegistered}
        isCustomerRegistrationOpen={isCustomerRegistrationOpen}
        pendingCustomerData={pendingCustomerData}
        onCloseCustomerRegistration={onCloseCustomerRegistration}
        onCustomerRegistered={onCustomerRegistered}
        effectiveOrder={effectiveOrder}
        pendingUpdate={pendingUpdate}
        onCancelPendingUpdate={onCancelPendingUpdate}
        onConfirmPendingUpdate={onConfirmPendingUpdate}
        isReconciliationConfirmationOpen={isReconciliationConfirmationOpen}
        onCloseReconciliationConfirmation={onCloseReconciliationConfirmation}
        onConfirmReconciliation={onConfirmReconciliation}
      />

      {/* Content */}
      <div
        className="flex-1 overflow-auto bg-white dark:bg-slate-900 custom-scrollbar"
        ref={scrollContainerRef}
      >
        {reconciliationMode ? (
          <ProductReconciliationItems
            items={form.state.items}
            temporaryIndexes={(effectiveOrder.items || []).flatMap((item, index) =>
              !item.productId?.trim() || item.isTemporaryProduct ? [index] : []
            )}
            isSaving={form.state.isSaving}
            onSelectProduct={form.actions.handleSelectProduct}
            onSave={onOpenReconciliationConfirmation}
          />
        ) : view === 'form' ? (
          <SalesOrderFormSection
            scrollRef={scrollContainerRef}
            form={{
              ...form,
              actions: {
                ...form.actions,
                handleSaveOrder: handleUpdate,
                handleCompleteOrder: handleFinalize,
              },
            }}
            onLoadJSON={onLoadJSON}
            onOpenSellerSearch={onOpenSellerSearch}
            sellerRef={sellerRef}
            highlightTemporaryItems={highlightTemporaryItems}
          />
        ) : (
          <OrderStatusTimeline orderId={effectiveOrder.id!} order={effectiveOrder} />
        )}
      </div>
    </div>
  );
};
