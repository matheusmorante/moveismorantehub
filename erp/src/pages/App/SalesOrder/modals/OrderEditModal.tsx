import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SalesOrderFormSection from '../components/SalesOrderFormSection';
import OrderSavingOverlay from '../components/OrderSavingOverlay';
import { useSalesOrderForm } from '../hooks/useSalesOrderForm';
import Order from '@/pages/types/order.type';
import { updateOrder, fetchOrderById } from '@/pages/utils/orderHistoryService';
import { toast } from 'react-toastify';
import { useZodForm } from '@/hooks/useZodForm';
import {
  createOrderDomainSchema,
  orderReconciliationFormSchema,
} from '../../../../../../shared-utils/orderDomainValidation';
import { getSettings } from '@/pages/utils/settingsService';
import type { z } from 'zod';
import OrderStatusTimeline from '../components/OrderStatusTimeline';
import { getInventorySensitiveItemChanges } from './ItemMovementChangeConfirmModal';
import ProductReconciliationItems from '../components/ProductReconciliationItems';
import {
  useOrderEditFiscalFlow,
  OrderEditSubModals,
  buildUpdatedOrder,
} from './order-edit-modal';
import OrderEditFiscalContinuation from './OrderEditFiscalContinuation';
import NfeEmissionModal from '../OrderActions/NfeEmissionModal';
import { clearFiscalEmissionRequest } from '@/pages/utils/nfe/nfeEmissionRequestState';
import { getGoodsCirculationState } from '@/pages/utils/nfe/cancellationEligibility';
import { prepareOrderFiscalSnapshotForEmission } from '@/pages/utils/nfeEmissionSnapshotService';
import type { FiscalOrderEditReplacement } from '@/pages/utils/nfe/orderEditFiscalService';
import {
  applyImportedOrderDataToForm,
  buildImportedClientDraft,
} from './orderEditJsonHelpers';
import { OrderEditModalHeader } from './OrderEditModalHeader';

interface OrderEditModalProps {
  order?: Order;
  orderId?: string;
  onClose?: () => void;
  onSaveSuccess?: (id?: string, order?: Order) => void;
  /** Abre o formulário diretamente neste step (1=Info, 2=Itens, 3=Cliente, etc.) */
  initialStep?: number;
  /** Se true, destaca visualmente os itens temporários na tabela de itens */
  highlightTemporaryItems?: boolean;
  /** Restringe a edição à conciliação de produtos temporários em pedido atendido. */
  reconciliationMode?: boolean;
}

const OrderEditModal = ({
  order,
  orderId,
  onClose: propOnClose,
  onSaveSuccess: propOnSaveSuccess,
  initialStep,
  highlightTemporaryItems,
  reconciliationMode,
}: OrderEditModalProps) => {
  const { id: paramId } = useParams();
  const navigate = useNavigate();

  const id = orderId || paramId;
  const [loadedOrder, setLoadedOrder] = useState<Order | null>(null);
  const [isLoadingOrder, setIsLoadingOrder] = useState(!!id && !order);
  const [isSavingOrder, setIsSavingOrder] = useState(false);

  const effectiveOrder = order || loadedOrder;
  const onClose = useCallback(() => {
    if (propOnClose) propOnClose();
    else navigate('/sales-order');
  }, [propOnClose, navigate]);
  const onSaveSuccess = useCallback(
    (savedId?: string, savedOrder?: Order) => {
      if (propOnSaveSuccess) propOnSaveSuccess(savedId, savedOrder);
      else navigate('/sales-order');
    },
    [propOnSaveSuccess, navigate]
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const form = useSalesOrderForm();
  const editSchema = reconciliationMode
    ? orderReconciliationFormSchema
    : createOrderDomainSchema(getSettings().requiredFields);
  const { validateAndRun: validateEditedOrder } = useZodForm(
    editSchema,
    form.state.currentOrder as unknown as z.input<typeof editSchema>
  );
  const [view] = useState<'form' | 'timeline'>('form');
  const [isSellerSearchOpen, setIsSellerSearchOpen] = useState(false);
  const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = useState(false);
  const sellerRef = React.useRef<HTMLButtonElement>(null);
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);

  const [isCustomerRegistrationOpen, setIsCustomerRegistrationOpen] = useState(false);
  const [pendingCustomerData, setPendingCustomerData] = useState<any>(null);
  const [pendingOrderData, setPendingOrderData] = useState<any>(null);
  const [pendingUpdate, setPendingUpdate] = useState<Order | null>(null);
  const [isReconciliationConfirmationOpen, setIsReconciliationConfirmationOpen] = useState(false);
  const [fiscalReissue, setFiscalReissue] = useState<{
    order: Order;
    replacement: FiscalOrderEditReplacement;
    remaining: FiscalOrderEditReplacement[];
  } | null>(null);
  const skipEmissionCloseRef = useRef(false);

  const applyOrderData = useCallback(
    (orderData: any) => {
      applyImportedOrderDataToForm(orderData, form.actions);
    },
    [form.actions]
  );

  const handleLoadJSON = useCallback(
    (jsonData: any) => {
      try {
        if (!jsonData || typeof jsonData !== 'object') {
          toast.error('JSON inválido.');
          return false;
        }

        if (jsonData.client) {
          setPendingCustomerData(buildImportedClientDraft(jsonData.client));
          setPendingOrderData(jsonData.order ? jsonData.order : null);
          setIsCustomerRegistrationOpen(true);
          toast.info('Cliente identificado no JSON. Confirme o cadastro do cliente primeiro.');
        } else if (jsonData.order) {
          applyOrderData(jsonData.order);
          toast.success('Pedido preenchido com sucesso via JSON!');
        } else {
          applyOrderData(jsonData);
          toast.success('Pedido preenchido com sucesso via JSON!');
        }
        return true;
      } catch (err: any) {
        toast.error('Erro ao carregar JSON: ' + err.message);
        return false;
      }
    },
    [applyOrderData]
  );

  useEffect(() => {
    if (id && !order) {
      setIsLoadingOrder(true);
      fetchOrderById(id).then((ord) => {
        if (ord) {
          setLoadedOrder(ord);
        } else {
          toast.error('Pedido não encontrado.');
          if (!orderId) navigate('/sales-order');
        }
        setIsLoadingOrder(false);
      });
    }
  }, [id, order, navigate, orderId]);

  const loadedOrderIdRef = useRef<string | null>(null);

  useEffect(() => {
    if (effectiveOrder && effectiveOrder.id && loadedOrderIdRef.current !== effectiveOrder.id) {
      loadedOrderIdRef.current = effectiveOrder.id;
      form.actions.loadOrderForEditing(effectiveOrder);
      if (initialStep && initialStep > 1) {
        form.actions.jumpToStep(initialStep);
      }
    }
  }, [effectiveOrder, form.actions, initialStep]);

  const persistUpdate = useCallback(
    async (updatedOrder: Order, expectedUpdatedAt?: string): Promise<string | false> => {
      const targetOrderId = effectiveOrder?.id;
      if (!targetOrderId) return false;
      try {
        await updateOrder(targetOrderId, updatedOrder, effectiveOrder, expectedUpdatedAt);
        toast.success('Edição salva com sucesso!');
        onSaveSuccess(targetOrderId, updatedOrder);
        onClose();
        return targetOrderId;
      } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        toast.error('Falha ao atualizar pedido.');
        return false;
      }
    },
    [effectiveOrder, onSaveSuccess, onClose]
  );

  const persistReadyFiscalEdit = useCallback(
    async (
      updatedOrder: Order,
      expectedUpdatedAt: string,
      replacements: FiscalOrderEditReplacement[]
    ): Promise<string | false> => {
      const targetOrderId = effectiveOrder?.id;
      if (!targetOrderId || !replacements.length) return false;
      try {
        await updateOrder(targetOrderId, updatedOrder, effectiveOrder, expectedUpdatedAt);
        toast.success('Edição salva com sucesso!');

        const [replacement, ...remaining] = replacements;
        clearFiscalEmissionRequest(targetOrderId, replacement.environment);
        try {
          const preparedOrder = await prepareOrderFiscalSnapshotForEmission(
            updatedOrder,
            replacement.environment
          );
          setFiscalReissue({ order: preparedOrder, replacement, remaining });
          toast.info(
            replacement.action === 'estorno'
              ? 'O estorno fiscal da NF anterior já foi confirmado. Prepare a nova emissão.'
              : 'O cancelamento fiscal da NF anterior já foi confirmado. Prepare a nova emissão.'
          );
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `A edição foi salva, mas não foi possível preparar a nova NF: ${error.message}`
              : 'A edição foi salva, mas não foi possível preparar a nova NF.'
          );
          onSaveSuccess(targetOrderId, updatedOrder);
          onClose();
        }
        return targetOrderId;
      } catch (error) {
        console.error('Erro ao atualizar pedido antes da reemissão fiscal:', error);
        toast.error(
          error instanceof Error ? error.message : 'Falha ao atualizar o pedido antes da nova NF.'
        );
        return false;
      }
    },
    [effectiveOrder, onClose, onSaveSuccess]
  );

  const persistBlockedFiscalEdit = useCallback(
    async (
      updatedOrder: Order,
      expectedUpdatedAt: string,
      replacements: FiscalOrderEditReplacement[],
      reason?: string
    ): Promise<{ order: Order; continueReplacement: boolean } | false> => {
      const targetOrderId = effectiveOrder?.id;
      if (!targetOrderId || !expectedUpdatedAt) return false;
      try {
        await updateOrder(targetOrderId, updatedOrder, effectiveOrder, expectedUpdatedAt);
        const savedOrder = (await fetchOrderById(targetOrderId)) || updatedOrder;
        toast.warning(
          reason
            ? `Edição comercial salva. Pendência fiscal mantida: ${reason}`
            : 'Edição comercial salva. A pendência fiscal ficou registrada para revisão.'
        );
        const canContinueReplacement =
          replacements.length > 0 &&
          savedOrder.status === 'scheduled' &&
          getGoodsCirculationState(savedOrder) === 'none';
        if (canContinueReplacement) {
          return { order: savedOrder, continueReplacement: true };
        }
        onSaveSuccess(targetOrderId, savedOrder);
        onClose();
        return { order: savedOrder, continueReplacement: false };
      } catch (error) {
        console.error('Falha ao salvar edição comercial com pendência fiscal:', error);
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível salvar a alteração comercial do pedido.'
        );
        return false;
      }
    },
    [effectiveOrder, onClose, onSaveSuccess]
  );

  const {
    pendingFiscalReplacements,
    fiscalContinuationOrder,
    saveWithFiscalAudit,
  } = useOrderEditFiscalFlow({
    effectiveOrder,
    validateEditedOrder,
    persistUpdate,
    persistReadyFiscalEdit,
    persistBlockedFiscalEdit,
    setIsSavingOrder,
  });

  const handleUpdate = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (!effectiveOrder) return false;
      const updatedOrder = buildUpdatedOrder({
        effectiveOrder,
        formState: form.state,
      });

      const validationErrors = form.actions.validateOrder(updatedOrder);
      if (Object.keys(validationErrors).length > 0) {
        form.actions.setErrors(validationErrors);
        const shippingError = validationErrors.shipping_date || validationErrors.shipping_time;
        const firstKey = Object.keys(validationErrors)[0];
        if (form.state.currentStep === 4 && shippingError) {
          toast.error(shippingError);
          return false;
        }
        if (firstKey?.startsWith('shipping_') || firstKey?.startsWith('deliveryAddress_')) {
          form.actions.jumpToStep(4);
        }
        toast.error(
          Object.values(validationErrors)[0] || 'Existem campos obrigatórios não preenchidos.'
        );
        return false;
      }

      const needsConfirmation =
        ['scheduled', 'fulfilled'].includes(effectiveOrder.status || '') &&
        getInventorySensitiveItemChanges(effectiveOrder, updatedOrder).length > 0;
      if (needsConfirmation) {
        setPendingUpdate(updatedOrder);
        return false;
      }
      return saveWithFiscalAudit(updatedOrder);
    },
    [effectiveOrder, form.actions, form.state, saveWithFiscalAudit]
  );

  const handleSaveReconciliation = useCallback(async () => {
    if (!effectiveOrder) return;
    const temporaryIndexes = (effectiveOrder.items || []).flatMap((item, index) =>
      !item.productId?.trim() || item.isTemporaryProduct ? [index] : []
    );
    const hasMissingProduct = temporaryIndexes.some(
      (index) => !form.state.items[index]?.productId?.trim()
    );
    if (hasMissingProduct) {
      toast.error('Selecione um produto cadastrado para todos os produtos sem cadastro.');
      return;
    }
    await saveWithFiscalAudit({ ...form.state.currentOrder, id: effectiveOrder.id } as Order);
  }, [effectiveOrder, form.state.currentOrder, form.state.items, saveWithFiscalAudit]);

  const handleFinalize = useCallback(
    async (e?: React.MouseEvent) => {
      const result = await form.actions.handleCompleteOrder(e);
      if (result && effectiveOrder) {
        const updatedOrder = {
          ...form.state.currentOrder,
          id: form.state.currentOrder.id || effectiveOrder.id || String(result),
        };
        onSaveSuccess(String(result), updatedOrder);
        onClose();
        return String(result);
      }
      return false;
    },
    [form.actions, onSaveSuccess, onClose, form.state.currentOrder, effectiveOrder]
  );

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

  if (fiscalReissue) {
    const { order: reissueOrder, replacement, remaining } = fiscalReissue;
    const finishOrAdvanceReissue = async () => {
      skipEmissionCloseRef.current = true;
      if (remaining.length) {
        const [nextReplacement, ...nextRemaining] = remaining;
        clearFiscalEmissionRequest(reissueOrder.id!, nextReplacement.environment);
        try {
          const preparedOrder = await prepareOrderFiscalSnapshotForEmission(
            reissueOrder,
            nextReplacement.environment
          );
          setFiscalReissue({
            order: preparedOrder,
            replacement: nextReplacement,
            remaining: nextRemaining,
          });
        } catch (error) {
          toast.error(
            error instanceof Error
              ? `Não foi possível preparar a nova NF: ${error.message}`
              : 'Não foi possível preparar a nova NF.'
          );
          setFiscalReissue(null);
          onSaveSuccess(reissueOrder.id, reissueOrder);
          onClose();
        }
        return;
      }
      setFiscalReissue(null);
      onSaveSuccess(reissueOrder.id, reissueOrder);
      onClose();
    };

    return (
      <NfeEmissionModal
        isOpen
        order={reissueOrder}
        initialEnvironment={replacement.environment}
        onClose={() => {
          if (skipEmissionCloseRef.current) {
            skipEmissionCloseRef.current = false;
            return;
          }
          setFiscalReissue(null);
          onSaveSuccess(reissueOrder.id, reissueOrder);
          onClose();
        }}
        onSuccess={() => void finishOrAdvanceReissue()}
      />
    );
  }

  const renderContent = () => (
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
        onSelectSeller={(name) => form.actions.setSeller(name)}
        onCloseSellerSearch={() => setIsSellerSearchOpen(false)}
        onAddNewSeller={() => {
          setIsSellerSearchOpen(false);
          setIsSellerRegistrationOpen(true);
        }}
        isSellerRegistrationOpen={isSellerRegistrationOpen}
        onCloseSellerRegistration={() => setIsSellerRegistrationOpen(false)}
        onSellerRegistered={(newSeller) => {
          form.actions.setSeller(newSeller.nickname || newSeller.fullName);
          setIsSellerRegistrationOpen(false);
        }}
        isCustomerRegistrationOpen={isCustomerRegistrationOpen}
        pendingCustomerData={pendingCustomerData}
        onCloseCustomerRegistration={() => setIsCustomerRegistrationOpen(false)}
        onCustomerRegistered={(person) => {
          form.actions.setCustomerData({
            id: person.id,
            fullName: person.fullName || person.tradeName || '',
            phone: person.phone || '',
            noPhone: person.noPhone || false,
            fullAddress: person.fullAddress || {
              cep: '',
              street: '',
              number: '',
              complement: '',
              neighborhood: '',
              city: '',
              observation: '',
            },
            additionalContacts: person.additionalContacts || [],
          });
          if (person.marketingOrigin) {
            form.actions.setMarketingOrigin(person.marketingOrigin);
          }
          setIsCustomerRegistrationOpen(false);
          if (pendingOrderData) {
            applyOrderData(pendingOrderData);
          }
          toast.success('Cliente cadastrado e pedido preenchido com sucesso via JSON!');
        }}
        effectiveOrder={effectiveOrder}
        pendingUpdate={pendingUpdate}
        onCancelPendingUpdate={() => setPendingUpdate(null)}
        onConfirmPendingUpdate={() => {
          const orderToSave = pendingUpdate!;
          setPendingUpdate(null);
          void saveWithFiscalAudit(orderToSave);
        }}
        isReconciliationConfirmationOpen={isReconciliationConfirmationOpen}
        onCloseReconciliationConfirmation={() => setIsReconciliationConfirmationOpen(false)}
        onConfirmReconciliation={() => void handleSaveReconciliation()}
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
            onSave={() => setIsReconciliationConfirmationOpen(true)}
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
            onLoadJSON={handleLoadJSON}
            onOpenSellerSearch={() => setIsSellerSearchOpen(true)}
            sellerRef={sellerRef}
            highlightTemporaryItems={highlightTemporaryItems}
          />
        ) : (
          <OrderStatusTimeline orderId={effectiveOrder.id!} order={effectiveOrder} />
        )}
      </div>
    </div>
  );

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

  return (
    <div
      className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden"
      onClick={onClose}
    >
      {renderContent()}
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
