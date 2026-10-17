import { useState, useEffect, useRef, useMemo } from 'react';
import type Order from '@/pages/types/order.type';
import type CustomerData from '@/pages/types/customerData.type';
import type Item from '@/pages/types/items.type';
import type { AssistanceItem } from '@/pages/types/order.type';
import type { Scheduling } from '@/pages/types/shipping.type';
import { toast } from 'react-toastify';
import { subscribeToOrders, fetchOrderById, saveOrder } from '@/pages/utils/orderHistoryService';
import { getSettings } from '@/pages/utils/settingsService';
import { flattenFormErrors, useZodForm } from '@/hooks/useZodForm';
import { createAssistanceOrderFormSchema } from '@/../../shared-utils/orderDomainValidation';
import { buildAssistanceOrderPayload, isAssistanceFormBlank } from '../services/assistanceOrderService';
import type { AssistanceOrderModalProps } from '../types/assistance.types';
import type { z } from 'zod';

const EMPTY_CUSTOMER: CustomerData = {
  fullName: '',
  phone: '',
  noPhone: false,
  fullAddress: {
    cep: '',
    street: '',
    number: '',
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
  const [status, setStatus] = useState<Order['status']>(order?.status || 'draft');
  const [customerData, setCustomerData] = useState<CustomerData>(
    order?.customerData || sourceOrder?.customerData || EMPTY_CUSTOMER
  );
  const [description, setDescription] = useState(order?.assistanceDescription || '');
  const [observation, setObservation] = useState(order?.observation || '');
  const [scheduling, setScheduling] = useState<Scheduling>(
    order?.shipping?.scheduling || {
      date: order?.scheduledDate || '',
      startTime: order?.scheduledTime || '',
      endTime: '',
      type: 'fixed',
      notInformed: false,
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

  // Submodals visibility
  const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
  const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);

  // Sync state when order or sourceOrder prop updates
  useEffect(() => {
    if (order) {
      setCurrentOrderId(order.id);
      setStatus(order.status || 'draft');
      setCustomerData(order.customerData || EMPTY_CUSTOMER);
      setDescription(order.assistanceDescription || '');
      setObservation(order.observation || '');
      if (order.shipping?.scheduling) {
        setScheduling(order.shipping.scheduling);
      } else {
        setScheduling({
          date: order.scheduledDate || '',
          startTime: order.scheduledTime || '',
          endTime: '',
          type: 'fixed',
          notInformed: false,
        });
      }
      setIsLinked(Boolean(order.linkedOrderId));
      setLinkedOrderId(order.linkedOrderId || '');
      setSelectedAssistanceItems(order.assistanceItems || []);
      setExtraItems(order.items || []);
      setAssistanceCost(order.assistanceCost || 0);
      setAssistanceServiceValue(order.assistanceServiceValue || 0);
      setSeller(order.seller || '');
    } else if (sourceOrder) {
      setCurrentOrderId(undefined);
      setStatus('draft');
      setIsLinked(true);
      setLinkedOrderId(sourceOrder.id || '');
      setSelectedLinkedOrder(sourceOrder);
      setCustomerData(sourceOrder.customerData || EMPTY_CUSTOMER);
      setSeller(sourceOrder.seller || '');
      setSelectedAssistanceItems([]);
      setExtraItems([]);
      setDescription('');
      setObservation('');
      setAssistanceCost(0);
      setAssistanceServiceValue(0);
    }
  }, [order, sourceOrder]);

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

  // Resolve linked order details
  useEffect(() => {
    let isCurrent = true;
    if (linkedOrderId) {
      if (sourceOrder && sourceOrder.id === linkedOrderId) {
        setSelectedLinkedOrder(sourceOrder);
        return;
      }
      if (selectedLinkedOrder?.id === linkedOrderId) return;
      const found = saleOrders.find((o) => o.id === linkedOrderId);
      if (found) {
        setSelectedLinkedOrder(found);
      } else {
        Promise.resolve(fetchOrderById(linkedOrderId))
          .then((ord) => {
            if (isCurrent && ord) setSelectedLinkedOrder(ord);
          })
          .catch(() => {});
      }
    } else {
      setSelectedLinkedOrder(null);
    }
    return () => {
      isCurrent = false;
    };
  }, [linkedOrderId, saleOrders, selectedLinkedOrder?.id, sourceOrder]);

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
    return buildAssistanceOrderPayload({
      baseOrder: order,
      currentOrderId,
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
  };

  const form = useZodForm(createAssistanceOrderFormSchema(getSettings().requiredFields), {
    status: 'draft',
    date: '',
    seller,
    assistanceDescription: description,
    assistanceCost,
    assistanceServiceValue,
    items: extraItems,
  });

  // Autosave debounced
  useEffect(() => {
    if (!initialDataFetched.current && !isEditing && !sourceOrder) return;
    if (status !== 'draft' && currentOrderId) return;

    if (isAssistanceFormBlank(customerData, description, observation, extraItems, selectedAssistanceItems)) {
      return;
    }

    if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

    autoSaveTimerRef.current = setTimeout(async () => {
      if (loading) return;
      const draftOrder = getOrderData(true);
      try {
        const savedId = await form.validateAndRun(
          draftOrder as unknown as z.input<ReturnType<typeof createAssistanceOrderFormSchema>>,
          (data) => saveOrder(data as unknown as Order)
        );
        if (!currentOrderId && savedId) {
          setCurrentOrderId(savedId);
        }
      } catch (error) {
        console.error('Auto-save failed', error);
      }
    }, 2000);

    return () => {
      if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
    };
  }, [
    customerData,
    description,
    observation,
    scheduling,
    isLinked,
    linkedOrderId,
    seller,
    selectedAssistanceItems,
    extraItems,
    assistanceCost,
    assistanceServiceValue,
    sourceOrder,
  ]);

  const handleSaveBase = async (isDraft: boolean) => {
    setLoading(true);
    setValidationErrors({});

    try {
      const assistanceOrder = await form.validateAndRun(
        getOrderData(isDraft) as unknown as z.input<ReturnType<typeof createAssistanceOrderFormSchema>>,
        (data) => data as unknown as Order,
        (errors) => {
          const messages = flattenFormErrors(errors);
          setValidationErrors(messages);
          const firstMessage = Object.values(messages)[0];
          if (firstMessage) toast.warning(`Campos obrigatórios: ${firstMessage}`);
        }
      );

      if (!assistanceOrder) {
        setLoading(false);
        return;
      }

      const savedId = await saveOrder(assistanceOrder);
      toast.success(isEditing ? 'Assistência atualizada!' : 'Assistência finalizada!');
      onSaveSuccess(savedId, assistanceOrder);
      onClose();
    } catch (error: any) {
      console.error('Erro ao salvar assistência:', error);
      toast.error(`Erro: ${error?.message || 'Erro desconhecido'}`);
      setLoading(false);
    }
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    handleSaveBase(false);
  };

  return {
    isEditing,
    loading,
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
