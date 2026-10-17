import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SalesOrderFormSection from '../components/SalesOrderFormSection';
import { useSalesOrderForm } from '../hooks/useSalesOrderForm';
import Order from '@/pages/types/order.type';
import {
  updateOrder,
  fetchOrderById,
  shouldAutoFulfillScheduledSaleOnEdit,
} from '@/pages/utils/orderHistoryService';
import { toast } from 'react-toastify';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import {
  createOrderDomainSchema,
  orderReconciliationFormSchema,
} from '../../../../../../shared-utils/orderDomainValidation';
import { getSettings } from '@/pages/utils/settingsService';
import type { z } from 'zod';
import OrderStatusTimeline from '../components/OrderStatusTimeline';
import SellerSearchModal from './SellerSearchModal';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import ItemMovementChangeConfirmModal, {
  getInventorySensitiveItemChanges,
} from './ItemMovementChangeConfirmModal';
import ProductReconciliationItems from '../components/ProductReconciliationItems';
import ConfirmModal from '@/components/shared/ConfirmModal';
import {
  auditFiscalOrderEdit,
  confirmFiscalOrderEdit as commitFiscalOrderEdit,
  resumeFiscalOrderEdit,
  type FiscalOrderEditReplacement,
  type FiscalOrderEditAudit,
} from '@/pages/utils/nfe/orderEditFiscalService';
import OrderEditFiscalContinuation from './OrderEditFiscalContinuation';
import {
  applyImportedOrderDataToForm,
  buildImportedClientDraft,
} from './orderEditJsonHelpers';
import { OrderEditModalHeader } from './OrderEditModalHeader';
import { FiscalOrderEditConfirmDialog } from './FiscalOrderEditConfirmDialog';

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
  const [pendingFiscalEdit, setPendingFiscalEdit] = useState<{
    requestId: string;
    order: Order;
    audit: FiscalOrderEditAudit;
  } | null>(null);
  const [isFiscalEditConfirmationOpen, setIsFiscalEditConfirmationOpen] = useState(false);
  const [isConfirmingFiscalEdit, setIsConfirmingFiscalEdit] = useState(false);
  const [pendingFiscalReplacements, setPendingFiscalReplacements] = useState<
    FiscalOrderEditReplacement[]
  >([]);
  const [fiscalContinuationOrder, setFiscalContinuationOrder] = useState<Order | null>(null);

  useEffect(() => {
    if (!effectiveOrder?.id) return;
    let isCurrent = true;
    void resumeFiscalOrderEdit(effectiveOrder.id)
      .then(({ replacements, order: currentOrder }) => {
        if (isCurrent) {
          setPendingFiscalReplacements(replacements);
          setFiscalContinuationOrder(replacements.length ? currentOrder : null);
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

  const saveWithFiscalAudit = useCallback(
    async (updatedOrder: Order): Promise<string | false> => {
      const targetOrderId = effectiveOrder?.id;
      if (!targetOrderId) return false;
      const result = await validateEditedOrder(
        updatedOrder as unknown as z.input<typeof editSchema>,
        async (validatedData) => {
          const validated = validatedData as unknown as Order;
          try {
            const audit = await auditFiscalOrderEdit(targetOrderId, validated);
            if (audit.status === 'blocked') {
              toast.error(audit.error || 'A edição fiscal exige revisão antes de salvar.');
              return false;
            }
            if (audit.status === 'confirmation_required') {
              if (!audit.orderUpdatedAt || !audit.documents.length) {
                toast.error(
                  'A conferência fiscal retornou incompleta; o pedido permanece sem alteração.'
                );
                return false;
              }
              setPendingFiscalEdit({ requestId: crypto.randomUUID(), order: validated, audit });
              setIsFiscalEditConfirmationOpen(true);
              return false;
            }
            if (!audit.orderUpdatedAt) {
              toast.error(
                'Não foi possível fixar a versão atual do pedido; nenhuma alteração foi salva.'
              );
              return false;
            }
            return await persistUpdate(validated, audit.orderUpdatedAt);
          } catch (error) {
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
    },
    [effectiveOrder?.id, persistUpdate, validateEditedOrder]
  );

  const confirmFiscalOrderEdit = useCallback(async () => {
    if (!pendingFiscalEdit || !effectiveOrder?.id || isConfirmingFiscalEdit) return;
    setIsConfirmingFiscalEdit(true);
    try {
      const committed = await commitFiscalOrderEdit({
        requestId: pendingFiscalEdit.requestId,
        orderId: effectiveOrder.id,
        proposedOrder: pendingFiscalEdit.order,
        audit: pendingFiscalEdit.audit,
      });
      setPendingFiscalEdit(null);
      setIsFiscalEditConfirmationOpen(false);
      setPendingFiscalReplacements(committed.replacements);
      setFiscalContinuationOrder(committed.order);
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'A confirmação não foi concluída; o pedido permanece inalterado até a reversão fiscal.'
      );
    } finally {
      setIsConfirmingFiscalEdit(false);
    }
  }, [effectiveOrder?.id, isConfirmingFiscalEdit, pendingFiscalEdit]);

  const handleUpdate = useCallback(
    async (e?: React.MouseEvent) => {
      e?.preventDefault();
      if (!effectiveOrder) return false;
      const firstHandling =
        (form.state.items || []).find((i: any) => i.handlingType?.trim())?.handlingType || '';
      const currentShipping = form.state.shipping || ({} as any);
      let resolvedScheduling = currentShipping.scheduling;
      const sessionDateMode = form.state.schedulingSessionRef?.current?.dateMode;
      if (
        resolvedScheduling &&
        !resolvedScheduling.pendingScheduling &&
        !resolvedScheduling.notInformed &&
        !resolvedScheduling.immediatePickup &&
        (sessionDateMode === 'today' || sessionDateMode === 'tomorrow')
      ) {
        const { getSaoPauloDayInfo } = await import(
          '../../../../../../shared-utils/commercialOrderRules'
        );
        const dayInfo = getSaoPauloDayInfo(sessionDateMode === 'today' ? 0 : 1);
        resolvedScheduling = {
          ...resolvedScheduling,
          date: dayInfo.isoDate,
          endDate: '',
          dateType: 'fixed',
        };
      }
      const updatedOrder = {
        ...form.state.currentOrder,
        id: effectiveOrder.id,
        items: form.state.items,
        shipping: {
          ...currentShipping,
          scheduling: resolvedScheduling,
          orderType: firstHandling || currentShipping.orderType || '',
        },
        isButtonsClicked:
          effectiveOrder.isButtonsClicked || form.state.currentOrder.isButtonsClicked,
      } as Order;
      if (shouldAutoFulfillScheduledSaleOnEdit(effectiveOrder, updatedOrder)) {
        updatedOrder.status = 'fulfilled';
      }
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
    [
      effectiveOrder,
      form.actions,
      form.state.currentOrder,
      form.state.currentStep,
      form.state.items,
      form.state.schedulingSessionRef,
      form.state.shipping,
      saveWithFiscalAudit,
    ]
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

      {/* Seller Search Modal */}
      {isSellerSearchOpen && (
        <SellerSearchModal
          anchorRef={sellerRef}
          onSelect={(name) => form.actions.setSeller(name)}
          onClose={() => setIsSellerSearchOpen(false)}
          onAddNew={() => {
            setIsSellerSearchOpen(false);
            setIsSellerRegistrationOpen(true);
          }}
        />
      )}

      {/* Seller Registration Modal */}
      <PersonFormModal
        isOpen={isSellerRegistrationOpen}
        onClose={() => setIsSellerRegistrationOpen(false)}
        collectionName="employees"
        title="Vendedor"
        onSuccess={(newSeller) => {
          form.actions.setSeller(newSeller.nickname || newSeller.fullName);
          setIsSellerRegistrationOpen(false);
        }}
      />

      {/* Customer Registration Modal */}
      <PersonFormModal
        isOpen={isCustomerRegistrationOpen}
        onClose={() => setIsCustomerRegistrationOpen(false)}
        collectionName="customers"
        title="Cliente"
        person={pendingCustomerData}
        onSuccess={(person) => {
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
      {pendingUpdate && (
        <ItemMovementChangeConfirmModal
          changes={getInventorySensitiveItemChanges(effectiveOrder!, pendingUpdate)}
          onCancel={() => setPendingUpdate(null)}
          onConfirm={() => {
            const orderToSave = pendingUpdate;
            setPendingUpdate(null);
            void saveWithFiscalAudit(orderToSave);
          }}
        />
      )}
      <ConfirmModal
        isOpen={isReconciliationConfirmationOpen}
        onClose={() => setIsReconciliationConfirmationOpen(false)}
        onConfirm={() => void handleSaveReconciliation()}
        title="Confirmar conciliação comercial?"
        message="A conciliação comercial serve apenas para o relatório de vendas, indexando o produto cadastrado no lugar daquele que não estava cadastrado antes da conciliação. Ela NÃO gera movimentação de estoque (nem saída na venda, nem entrada na devolução). Deseja continuar?"
        confirmLabel="Confirmar conciliação comercial"
        type="info"
      />
      {isFiscalEditConfirmationOpen && pendingFiscalEdit && (
        <FiscalOrderEditConfirmDialog
          audit={pendingFiscalEdit.audit}
          isConfirmingFiscalEdit={isConfirmingFiscalEdit}
          onCancel={() => {
            setIsFiscalEditConfirmationOpen(false);
            setPendingFiscalEdit(null);
          }}
          onConfirm={() => void confirmFiscalOrderEdit()}
        />
      )}
    </div>
  );

  if (fiscalContinuationOrder) {
    return (
      <OrderEditFiscalContinuation
        order={fiscalContinuationOrder}
        replacements={pendingFiscalReplacements}
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
      <style
        dangerouslySetInnerHTML={{
          __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `,
        }}
      />
    </div>
  );
};

export default OrderEditModal;
