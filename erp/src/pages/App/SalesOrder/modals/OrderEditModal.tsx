import React, { useEffect, useCallback, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import SalesOrderFormSection from '../SalesOrderFormSection';
import { useSalesOrderForm, parseStorageDateToLocal } from '../useSalesOrderForm';
import Order from '@/pages/types/order.type';
import {
  updateOrder,
  fetchOrderById,
  shouldAutoFulfillScheduledSaleOnEdit,
} from '@/pages/utils/orderHistoryService';
import { toast } from 'react-toastify';
import OrderStatusTimeline from '../OrderStatusTimeline';
import OrderStepper from '../OrderStepper';
import SellerSearchModal from './SellerSearchModal';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import { migrateOrderHandlings } from '@/pages/utils/handlingMigration';
import ItemMovementChangeConfirmModal, {
  getInventorySensitiveItemChanges,
} from './ItemMovementChangeConfirmModal';
import ProductReconciliationItems from '../ProductReconciliationItems';
import ConfirmModal from '@/components/shared/ConfirmModal';
import {
  auditFiscalOrderEdit,
  confirmFiscalOrderEdit as commitFiscalOrderEdit,
  resumeFiscalOrderEdit,
  type FiscalOrderEditReplacement,
  type FiscalOrderEditAudit,
} from '@/pages/utils/nfe/orderEditFiscalService';
import OrderEditFiscalContinuation from './OrderEditFiscalContinuation';

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
  const onSaveSuccess = useCallback((savedId?: string, savedOrder?: Order) => {
    if (propOnSaveSuccess) propOnSaveSuccess(savedId, savedOrder);
    else navigate('/sales-order');
  }, [propOnSaveSuccess, navigate]);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const form = useSalesOrderForm();
  const [view, setView] = useState<'form' | 'timeline'>('form');
  const [isSellerSearchOpen, setIsSellerSearchOpen] = useState(false);
  const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
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
  const [pendingFiscalReplacements, setPendingFiscalReplacements] = useState<FiscalOrderEditReplacement[]>([]);
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
        if (isCurrent) toast.error(error instanceof Error ? error.message : 'Não foi possível conferir a pendência fiscal.');
      });
    return () => {
      isCurrent = false;
    };
  }, [effectiveOrder?.id]);

  const applyOrderData = useCallback(
    (orderData: any) => {
      const migrated = migrateOrderHandlings(orderData);
      if (migrated.seller) {
        form.actions.setSeller(migrated.seller);
      }
      if (migrated.customerData) {
        form.actions.setCustomerData(migrated.customerData);
      }
      if (migrated.observation) {
        form.actions.setObservation(migrated.observation);
      }
      if (migrated.date) {
        form.actions.setOrderDate(parseStorageDateToLocal(migrated.date));
      }
      if (migrated.shipping) {
        form.actions.setShipping((prev: any) => ({
          ...prev,
          ...migrated.shipping,
          deliveryMethod: migrated.shipping.deliveryMethod || prev.deliveryMethod,
          orderType: migrated.shipping.orderType || prev.orderType,
          value: typeof migrated.shipping.value === 'number' ? migrated.shipping.value : prev.value,
          scheduling: migrated.shipping.scheduling
            ? {
                notInformed: !!migrated.shipping.scheduling.notInformed,
                dateType: migrated.shipping.scheduling.dateType || 'fixed',
                date: migrated.shipping.scheduling.date || '',
                endDate: migrated.shipping.scheduling.endDate || '',
                type: migrated.shipping.scheduling.type || 'fixed',
                time: migrated.shipping.scheduling.time || '',
                startTime: migrated.shipping.scheduling.startTime || '',
                endTime: migrated.shipping.scheduling.endTime || '',
              }
            : prev.scheduling,
        }));
      }
      if (migrated.items && Array.isArray(migrated.items)) {
        const mappedItems = migrated.items.map((item: any) => ({
          ...item,
          orderItemId: item.orderItemId || crypto.randomUUID(),
          linkedProductOrderItemId: item.linkedProductOrderItemId || undefined,
          productId: item.productId || undefined,
          variationId: item.variationId || undefined,
          code: item.code || '',
          description: item.description || '',
          unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
          quantity: typeof item.quantity === 'number' ? item.quantity : 1,
          costPrice: typeof item.costPrice === 'number' ? item.costPrice : 0,
          condition: item.condition || 'novo',
          handlingType: item.handlingType || '',
          observation: item.observation || '',
        }));
        form.actions.setItems(mappedItems);
      }
      if (migrated.payments && Array.isArray(migrated.payments)) {
        const mappedPayments = migrated.payments.map((pay: any) => ({
          ...pay,
          method: pay.method || '',
          amount: typeof pay.amount === 'number' ? pay.amount : 0,
          status: pay.status || '',
        }));
        form.actions.setPayments(mappedPayments);
      }
    },
    [form.actions]
  );

  const handleLoadJSON = useCallback(
    (jsonData: any) => {
      try {
        if (!jsonData || typeof jsonData !== 'object') {
          toast.error('JSON inválido.');
          return;
        }

        if (jsonData.client) {
          const clientData = jsonData.client;
          const personObj: any = {
            personType: clientData.personType || 'PF',
            fullName: clientData.fullName || '',
            cpfCnpj: clientData.cpfCnpj || '',
            phone: clientData.phone || '',
            email: clientData.email || '',
            noPhone: clientData.noPhone !== undefined ? !!clientData.noPhone : false,
            marketingOrigin: clientData.marketingOrigin || 'organic',
            fullAddress: {
              cep: clientData.fullAddress?.cep || '',
              street: clientData.fullAddress?.street || '',
              number: clientData.fullAddress?.number || '',
              neighborhood: clientData.fullAddress?.neighborhood || '',
              city: clientData.fullAddress?.city || '',
              state: clientData.fullAddress?.state || '',
              complement: clientData.fullAddress?.complement || '',
              observation: clientData.fullAddress?.observation || '',
            },
            noAddress: clientData.noAddress !== undefined ? !!clientData.noAddress : false,
          };

          setPendingCustomerData(personObj);
          if (jsonData.order) {
            setPendingOrderData(jsonData.order);
          } else {
            setPendingOrderData(null);
          }
          setIsCustomerRegistrationOpen(true);
          toast.info('Cliente identificado no JSON. Confirme o cadastro do cliente primeiro.');
        } else if (jsonData.order) {
          applyOrderData(jsonData.order);
          toast.success('Pedido preenchido com sucesso via JSON!');
        } else {
          applyOrderData(jsonData);
          toast.success('Pedido preenchido com sucesso via JSON!');
        }
      } catch (err: any) {
        toast.error('Erro ao carregar JSON: ' + err.message);
      }
    },
    [applyOrderData]
  );

  React.useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const handleScroll = () => {
      setIsScrolled(el.scrollTop > 50);
    };
    el.addEventListener('scroll', handleScroll);
    return () => el.removeEventListener('scroll', handleScroll);
  }, []);

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
      // Navegar para o step inicial solicitado (ex: step 2 = Itens)
      if (initialStep && initialStep > 1) {
        form.actions.jumpToStep(initialStep);
      }
    }
  }, [effectiveOrder, form.actions, initialStep]);

  const persistUpdate = useCallback(
    async (updatedOrder: Order, expectedUpdatedAt?: string): Promise<string | false> => {
      const orderId = effectiveOrder?.id;
      if (!orderId) return false;
      try {
        await updateOrder(orderId, updatedOrder, effectiveOrder, expectedUpdatedAt);
        toast.success('Edição salva com sucesso!');
        onSaveSuccess(orderId, updatedOrder);
        onClose();
        return orderId;
      } catch (error) {
        console.error('Erro ao atualizar pedido:', error);
        toast.error('Falha ao atualizar pedido.');
        return false;
      }
    },
    [form.actions, form.state.currentOrder, effectiveOrder, onSaveSuccess, onClose]
  );

  const saveWithFiscalAudit = useCallback(
    async (updatedOrder: Order): Promise<string | false> => {
      const orderId = effectiveOrder?.id;
      if (!orderId) return false;
      try {
        const audit = await auditFiscalOrderEdit(orderId, updatedOrder);
        if (audit.status === 'blocked') {
          toast.error(audit.error || 'A edição fiscal exige revisão antes de salvar.');
          return false;
        }
        if (audit.status === 'confirmation_required') {
          if (!audit.orderUpdatedAt || !audit.documents.length) {
            toast.error('A conferência fiscal retornou incompleta; o pedido permanece sem alteração.');
            return false;
          }
          setPendingFiscalEdit({ requestId: crypto.randomUUID(), order: updatedOrder, audit });
          setIsFiscalEditConfirmationOpen(true);
          return false;
        }
        if (!audit.orderUpdatedAt) {
          toast.error('Não foi possível fixar a versão atual do pedido; nenhuma alteração foi salva.');
          return false;
        }
        return persistUpdate(updatedOrder, audit.orderUpdatedAt);
      } catch (error) {
        toast.error(
          error instanceof Error
            ? error.message
            : 'Não foi possível conferir as notas autorizadas do pedido.'
        );
        return false;
      }
    },
    [effectiveOrder?.id, persistUpdate]
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
      const currentShipping = form.state.shipping || {};
      const updatedOrder = {
        ...form.state.currentOrder,
        id: effectiveOrder.id,
        items: form.state.items,
        shipping: {
          ...currentShipping,
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
        toast.error('Existem campos obrigatórios não preenchidos.');
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
    [effectiveOrder, form.actions, form.state.currentOrder, saveWithFiscalAudit]
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

  const isPageRoute = !propOnClose;

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
      <div className="flex shrink-0 flex-row items-center justify-between gap-3 border-b border-slate-100 bg-white/80 px-2 py-2 backdrop-blur-md transition-colors duration-300 dark:border-slate-800 dark:bg-slate-900/80 sm:gap-6 sm:px-4 sm:py-2.5 lg:px-6">
        {/* Esquerda: Identificação */}
        <div className="flex min-w-0 items-center shrink-0">
          <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600 text-white shadow-md shadow-blue-500/20 sm:h-10 sm:w-10 sm:rounded-xl">
              <i className="bi bi-pencil-square text-xs sm:text-base" />
            </div>
            <div className="min-w-0">
              <h2 className="truncate text-xs font-black tracking-tight text-slate-800 dark:text-slate-100 sm:text-base">
                {reconciliationMode ? 'Conciliação Comercial' : 'Editar Pedido'}
              </h2>
            </div>
          </div>
        </div>

        {/* Centro: Stepper de Etapas */}
        {!reconciliationMode && (
          <div className="flex flex-1 min-w-0 justify-center px-1 sm:px-3 2xl:max-w-4xl mx-auto">
            <OrderStepper
              currentStep={form.state.currentStep}
              jumpToStep={form.actions.jumpToStep}
              errors={form.state.errors}
            />
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:bg-slate-800 dark:hover:bg-rose-950/30 sm:h-9 sm:w-9 sm:rounded-xl"
          title="Fechar"
          aria-label="Fechar pedido"
        >
          <i className="bi bi-x-lg text-xs" />
        </button>
      </div>


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
        <div
          className="fixed inset-0 z-[100000] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="fiscal-order-edit-title"
        >
          <section className="max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
            <div className="border-b border-amber-100 bg-amber-50 px-6 py-5 dark:border-amber-900/50 dark:bg-amber-950/30">
              <h3 id="fiscal-order-edit-title" className="text-lg font-black text-slate-900 dark:text-white">
                Alterações na nota fiscal
              </h3>
              <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
                As alterações abaixo divergem de documento(s) autorizado(s). Para continuar, o ERP
                registrará a proposta e abrirá as etapas de reversão e nova emissão. O pedido e o
                estoque serão atualizados juntos após a confirmação da reversão fiscal.
              </p>
              {pendingFiscalEdit.audit.documents.some((document) => document.environment === 1) && (
                <p className="mt-2 text-sm font-semibold text-rose-700 dark:text-rose-300">
                  Esta substituição envolve documento em Produção. Cada transmissão será confirmada na etapa fiscal correspondente.
                </p>
              )}
            </div>
            <div className="max-h-[52vh] overflow-y-auto px-6 py-4">
              {pendingFiscalEdit.audit.documents.map((document) => (
                <div key={document.id} className="mb-4 rounded-2xl border border-slate-200 p-4 dark:border-slate-700">
                  <h4 className="mb-2 text-sm font-bold text-slate-800 dark:text-slate-100">
                    {document.model === '65' ? 'NFC-e' : 'NF-e'} · {document.environment === 2 ? 'Homologação' : 'Produção'}
                  </h4>
                  <p className="mb-2 text-xs font-semibold text-slate-600 dark:text-slate-300">
                    Procedimento: {document.action === 'cancel' ? 'cancelamento' : 'estorno, com revisão fiscal antes da transmissão'}.
                  </p>
                  <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                    {document.changes.map((change, index) => (
                      <li key={`${change.field}-${index}`}>
                        <strong>{change.field}</strong>: autorizado “{String(change.expected)}”; edição “{String(change.actual)}”
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4 dark:border-slate-800">
              <button
                type="button"
                disabled={isConfirmingFiscalEdit}
                onClick={() => {
                  setIsFiscalEditConfirmationOpen(false);
                  setPendingFiscalEdit(null);
                }}
                className="rounded-xl bg-slate-100 px-4 py-3 text-xs font-bold text-slate-700 disabled:opacity-50 dark:bg-slate-800 dark:text-slate-200"
              >
                Voltar à edição
              </button>
              <button
                type="button"
                disabled={isConfirmingFiscalEdit}
                onClick={() => void confirmFiscalOrderEdit()}
                className="rounded-xl bg-rose-600 px-4 py-3 text-xs font-bold text-white disabled:cursor-wait disabled:opacity-60"
              >
                {isConfirmingFiscalEdit ? 'Confirmando substituição…' : 'Confirmar substituição fiscal'}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  if (fiscalContinuationOrder) {
    return <OrderEditFiscalContinuation order={fiscalContinuationOrder} replacements={pendingFiscalReplacements} onClose={(currentOrder) => {
      onSaveSuccess(currentOrder.id, currentOrder);
      onClose();
    }} />;
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
