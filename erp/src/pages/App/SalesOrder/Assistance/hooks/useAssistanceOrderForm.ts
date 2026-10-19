import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import type Order from '@/pages/types/order.type';
import type CustomerData from '@/pages/types/customerData.type';
import type Item from '@/pages/types/items.type';
import type { AssistanceItem } from '@/pages/types/order.type';
type Scheduling = NonNullable<Order['shipping']>['scheduling'];
import { toast } from 'react-toastify';
import { subscribeToOrders, fetchOrderById, saveOrder } from '@/pages/utils/orderHistoryService';
import { getSettings } from '@/pages/utils/settingsService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createAssistanceOrderFormSchema, assistanceOrderDraftFormSchema, assistanceSavedIdSchema, assistanceLinkedOrderLookupSchema } from '@/../../shared-utils/orderDomainValidation';
import { buildAssistanceOrderPayload, isAssistanceFormBlank } from '../services/assistanceOrderService';
import type { AssistanceOrderModalProps } from '../types/assistance.types';
import type { z } from 'zod';
import { withTimeout } from '@/../../shared-utils/withTimeout';

const EMPTY_CUSTOMER: CustomerData = {
  fullName: '',
  phone: '',
  noPhone: false,
  fullAddress: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    observation: '',
    neighborhood: '',
    city: '',
    state: '',
  },
};

export const useAssistanceOrderForm = ({
  order,
  sourceOrder,
  initialData,
  onClose,
  onSaveSuccess,
}: AssistanceOrderModalProps) => {
  const isEditing = !!order && !!order.id;
  const initialDataFetched = useRef(false);
  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(order?.id);
  const [status] = useState<Order['status']>(order?.status || 'draft');
  const [customerData, setCustomerData] = useState<CustomerData>(
    order?.customerData || sourceOrder?.customerData || EMPTY_CUSTOMER
  );
  const [description, setDescription] = useState(order?.assistanceDescription || '');
  const [observation, setObservation] = useState(order?.observation || '');
  const [scheduling, setScheduling] = useState<Scheduling>(
    order?.shipping?.scheduling ? { ...order.shipping.scheduling, time: order.shipping.scheduling.time || '' } : {
      date: order?.scheduledDate || '',
      startTime: order?.scheduledTime || '',
      endTime: '',
      type: 'fixed',
      notInformed: false,
      time: '',
    }
  );
  const [isLinked, setIsLinked] = useState(Boolean(order?.linkedOrderId || sourceOrder?.id));
  const [linkedOrderId, setLinkedOrderId] = useState(order?.linkedOrderId || sourceOrder?.id || '');
  const [selectedLinkedOrder, setSelectedLinkedOrder] = useState<Order | null>(sourceOrder || null);
  const [seller, setSeller] = useState(order?.seller || sourceOrder?.seller || '');
  const [selectedAssistanceItems, setSelectedAssistanceItems] = useState<AssistanceItem[]>(
    order?.assistanceItems || []
  );
  const [extraItems, setExtraItems] = useState<Item[]>(order?.items || []);
  const [assistanceCost, setAssistanceCost] = useState(order?.assistanceCost || 0);
  const [assistanceServiceValue, setAssistanceServiceValue] = useState(
    order?.assistanceServiceValue || 0
  );
  const [saleOrders, setSaleOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(false);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  type AssistanceInput = z.input<ReturnType<typeof createAssistanceOrderFormSchema>>;
  const active = useRef(true), confirmedId = useRef(order?.id);
  const creationDate = useRef(new Date().toISOString()), creationKey = useRef(crypto.randomUUID());
  const writeInFlight = useRef(false), manualPending = useRef(false), uncertain = useRef(false);
  const operationQueue = useRef<Promise<unknown>>(Promise.resolve());
  const autosaveRevision = useRef(0);
  const [autoSaving, setAutoSaving] = useState(false), [operationError, setOperationError] = useState('');
  const [saveBlocked, setSaveBlocked] = useState(false), [hasSavedFinal, setHasSavedFinal] = useState(false);
  useEffect(() => { active.current = true; return () => { active.current = false; if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); }; }, []);

  // Submodals visibility
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  // Order stream and auto-match by initialData
  useEffect(() => {
    const unsubscribe = subscribeToOrders((data) => {
      const filtered = data.filter((o) => o.orderType !== 'assistance' && !o.deleted);
      setSaleOrders(filtered);

      if (
        initialData?.matchedProductId &&
        !isEditing &&
        !initialDataFetched.current &&
        filtered.length > 0 &&
        !sourceOrder
      ) {
        const matched = filtered.find((o) =>
          o.items.some((item) => item.productId === initialData.matchedProductId)
        );
        if (matched) {
          setLinkedOrderId(matched.id || '');
          setIsLinked(true);
          setSeller(matched.seller || '');
          setCustomerData(matched.customerData || EMPTY_CUSTOMER);
          const item = matched.items.find((i) => i.productId === initialData.matchedProductId);
          if (item) {
            setSelectedAssistanceItems([
              {
                id: Math.random().toString(36).substring(2, 11),
                description: item.description,
                quantity: 1,
                originalOrderId: matched.id || '',
              },
            ]);
          }
          initialDataFetched.current = true;
          toast.info(`Vínculo automático: Pedido #${matched.id} detectado.`);
        }
      }
    });
    return () => unsubscribe();
  }, [initialData, isEditing, sourceOrder]);

  const [linkedOrderLoading, setLinkedOrderLoading] = useState(false);
  const [linkedOrderError, setLinkedOrderError] = useState('');
  const [lookupRevision, setLookupRevision] = useState(0);
  const lookupForm = useZodForm(assistanceLinkedOrderLookupSchema, { orderId: linkedOrderId });
  const lookupRunner = useRef(lookupForm.validateValues); lookupRunner.current = lookupForm.validateValues;
  useEffect(() => {
    let accepting = true;
    const isCurrent = () => accepting && active.current;
    setLinkedOrderError('');
    const available = sourceOrder?.id === linkedOrderId ? sourceOrder : saleOrders.find(item => item.id === linkedOrderId);
    if (!linkedOrderId) { setSelectedLinkedOrder(null); setLinkedOrderLoading(false); return; }
    if (available) { setSelectedLinkedOrder(available); setLinkedOrderLoading(false); return; }
    if (selectedLinkedOrder?.id === linkedOrderId) { setLinkedOrderLoading(false); return; }
    setSelectedLinkedOrder(null); setLinkedOrderLoading(true);
    void (async () => {
      const values = await lookupRunner.current({ orderId: linkedOrderId }, errors => { if (isCurrent()) setLinkedOrderError(Object.values(flattenFormErrors(errors))[0] || 'Confira a venda vinculada.'); });
      if (!values || !isCurrent()) return false;
      const found = await withTimeout(fetchOrderById(values.orderId), 15_000, null, 'assistencia:consultar-venda-vinculada');
      if (!isCurrent()) return false;
      if (!found || found.id !== values.orderId) throw new Error('A venda vinculada não foi encontrada ou não respondeu no prazo. Confira o vínculo e consulte novamente.');
      setLinkedOrderId(values.orderId); setSelectedLinkedOrder(found); return true;
    })().catch(() => { if (isCurrent()) setLinkedOrderError('Não foi possível consultar a venda vinculada. Tente novamente.'); })
      .finally(() => { if (isCurrent()) setLinkedOrderLoading(false); });
    return () => { accepting = false; };
  }, [linkedOrderId, saleOrders, selectedLinkedOrder?.id, sourceOrder, lookupRevision]);
  const retryLinkedOrder = () => { if (!writeInFlight.current && !manualPending.current) setLookupRevision(value => value + 1); };

  const currentLinkedOrder = useMemo(() => {
    if (sourceOrder && (!linkedOrderId || sourceOrder.id === linkedOrderId)) {
      return sourceOrder;
    }
    if (selectedLinkedOrder && selectedLinkedOrder.id === linkedOrderId) {
      return selectedLinkedOrder;
    }
    return saleOrders.find((o) => o.id === linkedOrderId);
  }, [sourceOrder, selectedLinkedOrder, saleOrders, linkedOrderId]);

  const handleChangeScheduling = (key: string, value: any) => {
    setScheduling((prev: any) => {
      const newScheduling = { ...prev, [key]: value };
      if (newScheduling.type === 'fixed') {
        newScheduling.time = newScheduling.startTime || '';
      } else {
        newScheduling.time = `${newScheduling.startTime || ''} às ${newScheduling.endTime || ''}`;
      }
      return newScheduling;
    });
  };

  const handleToggleItem = (itemDescription: string, maxQty: number) => {
    const exists = selectedAssistanceItems.find((i) => i.description === itemDescription);
    if (exists) {
      setSelectedAssistanceItems((prev) => prev.filter((i) => i.description !== itemDescription));
    } else {
      setSelectedAssistanceItems((prev) => [
        ...prev,
        {
          id: Math.random().toString(36).substring(2, 11),
          description: itemDescription,
          quantity: 1,
          originalOrderId: linkedOrderId,
        },
      ]);
    }
  };

  const handleUpdateItemQty = (descriptionText: string, qty: number, maxQty: number) => {
    if (qty < 1) return;
    if (qty > maxQty) {
      toast.warning(`Quantidade máxima disponível: ${maxQty}`);
      return;
    }
    setSelectedAssistanceItems((prev) =>
      prev.map((i) => (i.description === descriptionText ? { ...i, quantity: qty } : i))
    );
  };

  const handleSelectOrder = (selectedOrder: Order) => {
    setLinkedOrderId(selectedOrder.id || '');
    setSelectedLinkedOrder(selectedOrder);
    setSelectedAssistanceItems([]);
    setCustomerData(selectedOrder.customerData);
    setSeller(selectedOrder.seller || '');
    setIsSelectionModalOpen(false);
    toast.info(`Pedido #${selectedOrder.id} selecionado.`);
  };

  const handleUnlinkOrder = () => {
    setLinkedOrderId('');
    setSelectedLinkedOrder(null);
    setSelectedAssistanceItems([]);
    toast.info('Vínculo com o pedido removido.');
  };

  const handleToggleIsLinked = (val: boolean) => {
    setIsLinked(val);
    if (!val) {
      setLinkedOrderId('');
      setSelectedLinkedOrder(null);
      setSelectedAssistanceItems([]);
    }
  };

  const getOrderData = (isDraft: boolean): Order => {
    const payload = buildAssistanceOrderPayload({
      baseOrder: order,
      currentOrderId: confirmedId.current || currentOrderId,
      isDraft,
      status,
      customerData,
      description,
      observation,
      scheduling,
      isLinked,
      linkedOrderId,
      selectedAssistanceItems,
      extraItems,
      assistanceCost,
      assistanceServiceValue,
      seller,
    });
    return { ...payload, date: order?.date || creationDate.current };
  };

  const signature = (data: Order) => JSON.stringify({ ...data, id: undefined, date: undefined });
  const draftPayload = getOrderData(true);
  const draftSignature = signature(draftPayload);
  const form = useZodForm(createAssistanceOrderFormSchema(getSettings().requiredFields), draftPayload as unknown as AssistanceInput);
  const draftForm = useZodForm(assistanceOrderDraftFormSchema, { ...draftPayload, status: 'draft' } as unknown as z.input<typeof assistanceOrderDraftFormSchema>);
  const lastSavedSignature = useRef(isEditing ? draftSignature : '');
  const receipt = useRef<{ id: string; data: Order; signature: string } | null>(null);
  const forms = useRef({ form, draftForm }); forms.current = { form, draftForm };
  const enqueue = useCallback((operation: () => Promise<boolean>) => {
    const queued = operationQueue.current.then(operation);
    operationQueue.current = queued.catch(() => false);
    return queued;
  }, []);

  const notifySaved = async (saved: NonNullable<typeof receipt.current>) => {
    if (!active.current) return false;
    const accepted = await withTimeout(Promise.resolve(onSaveSuccess(saved.id, saved.data)).then(result => result !== false), 15_000, false, 'assistencia:confirmar-painel');
    if (!accepted) throw new Error('A assistência já foi gravada, mas o painel não confirmou a atualização. Tente concluir novamente sem repetir o salvamento.');
    if (!active.current) return true;
    toast.success(isEditing ? 'Assistência atualizada!' : 'Assistência finalizada!');
    onClose(); return true;
  };
  const persist = async (snapshot: Order, intent: 'draft' | 'final', revision = 0): Promise<boolean> => {
    if (!active.current || uncertain.current || (intent === 'draft' && (manualPending.current || receipt.current || revision !== autosaveRevision.current))) return false;
    const snapshotSignature = signature(snapshot);
    if (intent === 'draft' && snapshotSignature === lastSavedSignature.current) return true;
    writeInFlight.current = true;
    if (intent === 'draft') setAutoSaving(true);
    let dispatched = false; let acknowledged = false; let caughtFailure: unknown = null;
    try {
      if (intent === 'final' && receipt.current) {
        if (receipt.current.signature !== snapshotSignature) throw new Error('A assistência já foi gravada com os dados anteriores. Confira o histórico antes de alterar este pedido.');
        return await notifySaved(receipt.current);
      }
      const input = { ...snapshot, id: confirmedId.current || undefined } as unknown as AssistanceInput;
      const run = intent === 'draft' ? forms.current.draftForm.validateAndRun : forms.current.form.validateAndRun;
      const ran = await run(input as z.input<typeof assistanceOrderDraftFormSchema>, async (values) => {
        try {
          if (!active.current || (intent === 'draft' && (manualPending.current || revision !== autosaveRevision.current))) return false;
          dispatched = true;
          const saved = await withTimeout(saveOrder(values as unknown as Order, { idempotencyKey: creationKey.current }), 30_000, null, 'assistencia:confirmar-gravacao');
          const savedId = assistanceSavedIdSchema.safeParse(saved);
          if (!savedId.success || (values.id && savedId.data !== values.id)) throw new Error('O serviço não confirmou a identidade da assistência. Consulte o histórico antes de repetir.');
          acknowledged = true; confirmedId.current = savedId.data; lastSavedSignature.current = snapshotSignature;
          if (intent === 'final') receipt.current = { id: savedId.data, data: { ...values, id: savedId.data } as unknown as Order, signature: snapshotSignature };
          if (!active.current) return true;
          setCurrentOrderId(savedId.data);
          if (intent === 'draft') return true;
          setHasSavedFinal(true); return await notifySaved(receipt.current!);
        } catch (err) {
          caughtFailure = err;
          throw err;
        }
      }, errors => {
        if (!active.current) return;
        const messages = flattenFormErrors(errors); setValidationErrors(messages);
        setOperationError((intent === 'draft' ? 'Rascunho não salvo: ' : '') + (Object.values(messages)[0] || 'Confira os dados da assistência.'));
      });
      if (caughtFailure) throw caughtFailure;
      return Boolean(ran);
    } catch (failure) {
      const known = Boolean(failure && typeof failure === 'object' && ('code' in failure && /^(22|23|42)/.test(String(failure.code))));
      if (dispatched && !acknowledged && !known) { uncertain.current = true; if (active.current) setSaveBlocked(true); }
      if (active.current) {
        const message = failure instanceof Error ? failure.message : 'Não foi possível confirmar a assistência.';
        setOperationError(receipt.current ? 'Assistência já gravada. ' + message : uncertain.current ? message + ' Confira o histórico antes de repetir.' : message);
      }
      return false;
    } finally { writeInFlight.current = false; if (active.current && intent === 'draft') setAutoSaving(false); }
  };
  const persistRef = useRef(persist); persistRef.current = persist;
  const autosaveEnabled = Boolean(isEditing || sourceOrder || initialDataFetched.current) && status === 'draft';
  useEffect(() => {
    if (!autosaveEnabled || manualPending.current || uncertain.current || receipt.current || draftSignature === lastSavedSignature.current || isAssistanceFormBlank(customerData, description, observation, extraItems, selectedAssistanceItems)) return;
    const revision = ++autosaveRevision.current;
    const snapshot = draftPayload;
    autoSaveTimerRef.current = setTimeout(() => { void enqueue(() => persistRef.current(snapshot, 'draft', revision)); }, 2000);
    return () => { if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current); };
  // draftSignature contains every editable draft field; ref updates alone do not resubmit it.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autosaveEnabled, draftSignature, enqueue]);

  const handleSaveBase = async () => {
    if (manualPending.current || uncertain.current || !active.current) return false;
    if (isLinked && linkedOrderId && !currentLinkedOrder) { setOperationError('Aguarde a consulta da venda vinculada ou consulte novamente antes de finalizar.'); return false; }
    manualPending.current = true; ++autosaveRevision.current;
    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    const snapshot = getOrderData(false);
    setLoading(true); setValidationErrors({}); setOperationError('');
    try { return await enqueue(() => persistRef.current(snapshot, 'final')); }
    finally { manualPending.current = false; if (active.current) setLoading(false); }
  };
  const handleSave = (event: React.FormEvent) => { event.preventDefault(); return handleSaveBase(); };
  const handleClose = () => { if (!manualPending.current && !writeInFlight.current) onClose(); };

  return {
    isEditing,
    loading,
    autoSaving, operationError, saveBlocked, hasSavedFinal, handleClose,
    linkedOrderLoading, linkedOrderError, retryLinkedOrder,
    customerData,
    setCustomerData,
    seller,
    setSeller,
    description,
    setDescription,
    observation,
    setObservation,
    assistanceServiceValue,
    setAssistanceServiceValue,
    assistanceCost,
    setAssistanceCost,
    scheduling,
    handleChangeScheduling,
    isLinked,
    handleToggleIsLinked,
    linkedOrderId,
    currentLinkedOrder,
    handleSelectOrder,
    handleUnlinkOrder,
    selectedAssistanceItems,
    handleToggleItem,
    handleUpdateItemQty,
    extraItems,
    setExtraItems,
    validationErrors,
    handleSave,
    // Modals
    isSelectionModalOpen,
    setIsSelectionModalOpen,
    isProductSearchOpen,
    setIsProductSearchOpen,
    isCustomerSearchOpen,
    setIsCustomerSearchOpen,
  };
};
