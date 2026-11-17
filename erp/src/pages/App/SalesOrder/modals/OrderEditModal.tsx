import React, { useCallback, useState, useRef } from 'react';
import { toast } from 'react-toastify';
import type { z } from 'zod';
import { useSalesOrderForm } from '../hooks/useSalesOrderForm';
import { useZodForm } from '@/hooks/useZodForm';
import {
  createOrderDomainSchema,
  orderReconciliationFormSchema,
} from '../../../../../../shared-utils/orderDomainValidation';
import { getSettings } from '@/pages/utils/settingsService';
import OrderSavingOverlay from '../components/OrderSavingOverlay';
import OrderFormLoadingOverlay from '../components/OrderFormLoadingOverlay';
import {
  useOrderEditLoader,
  useOrderEditPersistence,
  useOrderEditJsonImport,
  useOrderEditSubModalsState,
  useOrderEditActions,
  useOrderEditFiscalFlow,
  OrderEditModalContent,
  type OrderEditModalProps,
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
  const form = useSalesOrderForm(undefined, 'sale', {
    autoSaveExistingDrafts: !reconciliationMode,
  });
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [view] = useState<'form' | 'timeline'>('form');
  const [isSavingOrder, setIsSavingOrder] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closingRef = useRef(false);
  // Carregamento do pedido e sincronização com formulário
  const { effectiveOrder, isLoadingOrder, loadError, onClose, onSaveSuccess } = useOrderEditLoader({
    order,
    orderId,
    propOnClose,
    propOnSaveSuccess,
    initialStep,
    formActions: form.actions,
  });

  // Persistência comercial do pedido editado
  const { persistUpdate } = useOrderEditPersistence({
      effectiveOrder,
      onClose,
      onSaveSuccess,
    });

  // Validação Zod estrita do pedido editado
  const editSchema = reconciliationMode
    ? orderReconciliationFormSchema
    : createOrderDomainSchema(getSettings().requiredFields);

  const { validateAndRun: validateEditedOrder } = useZodForm(
    editSchema,
    form.state.currentOrder as unknown as z.input<typeof editSchema>
  );

  // Validação do pedido e gravação comercial, sem fluxo fiscal automático
  const {
    saveEditedOrder,
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
    saveWithFiscalAudit: saveEditedOrder,
  });

  // Ações de atualização, conciliação e finalização
  const { handleUpdate, handleSaveReconciliation, handleFinalize } = useOrderEditActions({
    effectiveOrder,
    formState: form.state,
    formActions: form.actions,
    saveWithFiscalAudit: saveEditedOrder,
    setPendingUpdate: subModals.setPendingUpdate,
    onSaveSuccess,
    onClose,
  });

  const handleUserClose = useCallback(async () => {
    if (closingRef.current || isSavingOrder || form.state.isSaving) return;
    closingRef.current = true;
    setIsClosing(true);
    try {
      const saved = await form.actions.flushDraftAutoSave();
      if (saved) onClose();
      else toast.error('Não foi possível confirmar o salvamento do rascunho. Confira os dados e tente novamente.');
    } catch {
      toast.error('Não foi possível confirmar o salvamento do rascunho. Confira os dados e tente novamente.');
    } finally {
      closingRef.current = false;
      setIsClosing(false);
    }
  }, [form.actions.flushDraftAutoSave, form.state.isSaving, isSavingOrder, onClose]);

  if (loadError) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Falha ao carregar a venda" className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden">
        <div className="bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden animate-reveal">
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center">
            <p role="alert" className="max-w-md text-sm font-semibold text-slate-600 dark:text-slate-300">
              {loadError}
            </p>
            <button type="button" onClick={onClose} className="rounded-lg bg-slate-200 px-4 py-2 text-sm font-bold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
              Fechar
            </button>
          </div>
        </div>
      </div>
    );
  }

  // 1. Estado de Carregamento
  if (isLoadingOrder || !effectiveOrder) {
    return (
      <div role="dialog" aria-modal="true" aria-label="Formulário de venda" aria-busy="true" className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden">
        <OrderFormLoadingOverlay key="loading" />
      </div>
    );
  }

  // 2. Exibição Principal do Modal de Edição
  return (
    <div
      className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden"
      onClick={() => { void handleUserClose(); }}
    >
      <OrderEditModalContent
        effectiveOrder={effectiveOrder}
        form={form}
        reconciliationMode={reconciliationMode}
        highlightTemporaryItems={highlightTemporaryItems}
        view={view}
        onClose={() => { void handleUserClose(); }}
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
      {(isSavingOrder || form.state.isSaving || isClosing) && <OrderSavingOverlay />}
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
