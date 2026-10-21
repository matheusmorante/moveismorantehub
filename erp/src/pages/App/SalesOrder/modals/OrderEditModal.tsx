import React, { useState, useRef } from 'react';
import type { z } from 'zod';
import { useSalesOrderForm } from '../hooks/useSalesOrderForm';
import { useZodForm } from '@/hooks/useZodForm';
import {
  createOrderDomainSchema,
  orderReconciliationFormSchema,
} from '../../../../../../shared-utils/orderDomainValidation';
import { getSettings } from '@/pages/utils/settingsService';
import OrderSavingOverlay from '../components/OrderSavingOverlay';
import OrderEditFiscalContinuation from './OrderEditFiscalContinuation';
import {
  useOrderEditLoader,
  useOrderEditPersistence,
  useOrderEditJsonImport,
  useOrderEditSubModalsState,
  useOrderEditActions,
  useOrderEditFiscalFlow,
  OrderEditReissueModal,
  OrderEditModalContent,
  type OrderEditModalProps,
  type FiscalReissueState,
} from './order-edit-modal';

const OrderEditModal: React.FC<OrderEditModalProps> = ({
  order,
  orderId,
  onClose: propOnClose,
  onSaveSuccess: propOnSaveSuccess,
  initialStep,
  highlightTemporaryItems,
  reconciliationMode,
}) => {
  const form = useSalesOrderForm();
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [view] = useState<'form' | 'timeline'>('form');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [fiscalReissue, setFiscalReissue] = useState<FiscalReissueState | null>(null);

  // Carregamento do pedido e sincronização com formulário
  const { effectiveOrder, isLoadingOrder, onClose, onSaveSuccess } = useOrderEditLoader({
    order,
    orderId,
    propOnClose,
    propOnSaveSuccess,
    initialStep,
    formActions: form.actions,
  });

  // Callbacks de persistência e preparação de reemissão fiscal
  const { persistUpdate } = useOrderEditPersistence({
      effectiveOrder,
      onClose,
      onSaveSuccess,
      setFiscalReissue,
    });

  // Validação Zod estrita do pedido editado
  const editSchema = reconciliationMode
    ? orderReconciliationFormSchema
    : createOrderDomainSchema(getSettings().requiredFields);

  const { validateAndRun: validateEditedOrder } = useZodForm(
    editSchema,
    form.state.currentOrder as unknown as z.input<typeof editSchema>
  );

  // Orquestrador do fluxo fiscal da edição
  const {
    pendingFiscalReplacements,
    fiscalContinuationOrder,
    saveWithFiscalAudit,
  } = useOrderEditFiscalFlow({
    effectiveOrder,
    validateEditedOrder,
    persistUpdate,
    setIsSavingOrder,
  });

  // Importação e preenchimento via JSON
  const {
    isCustomerRegistrationOpen,
    setIsCustomerRegistrationOpen,
    pendingCustomerData,
    handleLoadJSON,
    handleCustomerRegistered,
  } = useOrderEditJsonImport({ formActions: form.actions });

  // Estado e controle dos sub-modais auxiliares
  const subModals = useOrderEditSubModalsState({
    formActions: form.actions,
    saveWithFiscalAudit,
  });

  // Ações de atualização, conciliação e finalização
  const { handleUpdate, handleSaveReconciliation, handleFinalize } = useOrderEditActions({
    effectiveOrder,
    formState: form.state,
    formActions: form.actions,
    saveWithFiscalAudit,
    setPendingUpdate: subModals.setPendingUpdate,
    onSaveSuccess,
    onClose,
  });

  // 1. Estado de Carregamento
  if (isLoadingOrder || !effectiveOrder) {
    return (
      <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4">
        <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
        <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-pulse">
          Carregando Pedido...
        </p>
      </div>
    );
  }

  // 2. Fluxo de Reemissão Fiscal Imediata
  if (fiscalReissue) {
    return (
      <OrderEditReissueModal
        fiscalReissue={fiscalReissue}
        setFiscalReissue={setFiscalReissue}
        onSaveSuccess={onSaveSuccess}
        onClose={onClose}
      />
    );
  }

  // 3. Fluxo de Continuação Fiscal com Pendência
  if (fiscalContinuationOrder) {
    return (
      <OrderEditFiscalContinuation
        order={fiscalContinuationOrder}
        replacements={pendingFiscalReplacements}
        autoContinue
        onClose={(currentOrder) => {
          onSaveSuccess(currentOrder.id, currentOrder);
          onClose();
        }}
      />
    );
  }

  // 4. Exibição Principal do Modal de Edição
  return (
    <div
      className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden"
      onClick={onClose}
    >
      <OrderEditModalContent
        effectiveOrder={effectiveOrder}
        form={form}
        reconciliationMode={reconciliationMode}
        highlightTemporaryItems={highlightTemporaryItems}
        view={view}
        onClose={onClose}
        scrollContainerRef={scrollContainerRef}
        isSellerSearchOpen={subModals.isSellerSearchOpen}
        isSellerRegistrationOpen={subModals.isSellerRegistrationOpen}
        sellerRef={subModals.sellerRef}
        isCustomerRegistrationOpen={isCustomerRegistrationOpen}
        pendingCustomerData={pendingCustomerData}
        pendingUpdate={subModals.pendingUpdate}
        isReconciliationConfirmationOpen={subModals.isReconciliationConfirmationOpen}
        onSelectSeller={subModals.handleSelectSeller}
        onCloseSellerSearch={() => subModals.setIsSellerSearchOpen(false)}
        onAddNewSeller={subModals.handleAddNewSeller}
        onCloseSellerRegistration={() => subModals.setIsSellerRegistrationOpen(false)}
        onSellerRegistered={subModals.handleSellerRegistered}
        onCloseCustomerRegistration={() => setIsCustomerRegistrationOpen(false)}
        onCustomerRegistered={handleCustomerRegistered}
        onCancelPendingUpdate={() => subModals.setPendingUpdate(null)}
        onConfirmPendingUpdate={subModals.handleConfirmPendingUpdate}
        onOpenSellerSearch={() => subModals.setIsSellerSearchOpen(true)}
        onOpenReconciliationConfirmation={() => subModals.setIsReconciliationConfirmationOpen(true)}
        onCloseReconciliationConfirmation={() =>
          subModals.setIsReconciliationConfirmationOpen(false)
        }
        onConfirmReconciliation={() => {
          subModals.setIsReconciliationConfirmationOpen(false);
          void handleSaveReconciliation();
        }}
        onLoadJSON={handleLoadJSON}
        handleUpdate={handleUpdate}
        handleFinalize={handleFinalize}
      />
      {(isSavingOrder || form.state.isSaving) && <OrderSavingOverlay />}
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { transform: translateY(30px); opacity: 0; to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `,
        }}
      />
    </div>
  );
};

export default OrderEditModal;
