import { useEffect, useRef, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import {
  supportOrderDocumentSchema,
  type SupportOrderDocumentInput,
} from '../../../../../../../shared-utils/customerSupportFormSchemas';
import {
  getCustomerOrders,
  type SupportOrderSummary,
} from '@/pages/utils/customerSupport/supportOrdersService';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settingsService';
import { createOrderSummaryPdf, isQuoteOrder } from './supportOrderSummaryPdf';

interface UseChatComposerOrderPickerOptions {
  customerId?: string | null;
  displayName?: string;
  canSend: boolean;
  canShareCommercialInfo: boolean;
  shareOrderRequest?: { record: SupportOrderSummary; requestId: string } | null;
  onShareOrderRequestHandled?: (requestId: string) => void;
  addFiles: (files: FileList | File[], category?: 'media' | 'document', kind?: 'photo' | 'order' | 'quote' | 'document') => boolean;
}

export function useChatComposerOrderPicker({
  customerId,
  displayName = 'Cliente',
  canSend,
  canShareCommercialInfo,
  shareOrderRequest = null,
  onShareOrderRequestHandled,
  addFiles,
}: UseChatComposerOrderPickerOptions) {
  const [isOrderPickerOpen, setIsOrderPickerOpen] = useState(false);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);
  const [orders, setOrders] = useState<SupportOrderSummary[]>([]);
  const [ordersError, setOrdersError] = useState('');
  const [orderFilter, setOrderFilter] = useState<'all' | 'orders' | 'quotes'>('all');
  const [selectedOrderId, setSelectedOrderId] = useState('');
  const [isCreatingOrderPdf, setIsCreatingOrderPdf] = useState(false);
  const requestedOrderRef = useRef<SupportOrderSummary | null>(null);

  const {
    setValue: setOrderValue,
    handleSubmit: submitOrderForm,
    formState: { errors: orderErrors },
  } = useForm<SupportOrderDocumentInput>({
    resolver: zodResolver(supportOrderDocumentSchema),
    defaultValues: { orderId: '' },
  });

  useEffect(() => {
    if (!shareOrderRequest || !canSend || !canShareCommercialInfo) return;
    const { record, requestId } = shareOrderRequest;
    requestedOrderRef.current = record;
    setOrders((current) => [record, ...current.filter((order) => order.id !== record.id)]);
    setOrderFilter(isQuoteOrder(record) ? 'quotes' : 'orders');
    setSelectedOrderId(record.id);
    setOrderValue('orderId', record.id, { shouldDirty: true, shouldValidate: true });
    setOrdersError('');
    setIsOrderPickerOpen(true);
    onShareOrderRequestHandled?.(requestId);
  }, [canSend, canShareCommercialInfo, onShareOrderRequestHandled, setOrderValue, shareOrderRequest]);

  useEffect(() => {
    if (!isOrderPickerOpen || !customerId) return;
    let active = true;
    setOrders([]);
    setOrdersError('');
    setIsLoadingOrders(true);
    getCustomerOrders(supabase, customerId, orderFilter)
      .then((data) => {
        if (!active) return;
        const requestedOrder = requestedOrderRef.current;
        setOrders(
          requestedOrder
            ? [requestedOrder, ...data.filter((order) => order.id !== requestedOrder.id)]
            : data
        );
      })
      .catch(() => {
        if (active) setOrdersError('Não foi possível carregar os documentos deste cliente.');
      })
      .finally(() => {
        if (active) setIsLoadingOrders(false);
      });
    return () => {
      active = false;
    };
  }, [isOrderPickerOpen, customerId, orderFilter]);

  const addBusinessDocument = async (data: SupportOrderDocumentInput) => {
    if (isCreatingOrderPdf) return;
    const order =
      orders.find((item) => item.id === data.orderId) ||
      (requestedOrderRef.current?.id === data.orderId ? requestedOrderRef.current : undefined);
    if (!order) {
      setOrdersError('Selecione um documento disponível.');
      return;
    }
    setIsCreatingOrderPdf(true);
    try {
      const blob = await createOrderSummaryPdf(order, displayName, getSettings().companyName || 'Móveis Morante');
      const quote = isQuoteOrder(order);
      const prefix = quote ? 'Orcamento' : 'Pedido';
      const fileName = `${prefix}-${order.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '-')}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const wasAdded = addFiles([file], 'document', quote ? 'quote' : 'order');
      if (!wasAdded) {
        setOrdersError('Não foi possível adicionar o PDF ao rascunho. Remova alguns anexos e tente novamente.');
        return;
      }
      if (requestedOrderRef.current?.id === order.id) requestedOrderRef.current = null;
      setIsOrderPickerOpen(false);
      setSelectedOrderId('');
    } catch {
      setOrdersError('Não foi possível preparar o resumo em PDF. Tente novamente.');
    } finally {
      setIsCreatingOrderPdf(false);
    }
  };

  const handleSelectOrder = (id: string) => {
    setSelectedOrderId(id);
    setOrderValue('orderId', id, { shouldDirty: true, shouldValidate: true });
  };

  const submitOrderDocument = submitOrderForm(addBusinessDocument, () => {
    setOrdersError('Selecione um pedido ou orçamento antes de preparar o PDF.');
  });

  return {
    isOrderPickerOpen,
    setIsOrderPickerOpen,
    orders,
    selectedOrderId,
    setSelectedOrderId,
    handleSelectOrder,
    orderFilter,
    setOrderFilter,
    isLoadingOrders,
    ordersError: ordersError || orderErrors.orderId?.message,
    isCreatingOrderPdf,
    submitOrderDocument,
  };
}
