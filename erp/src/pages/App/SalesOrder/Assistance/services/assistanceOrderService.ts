import type Order from '@/pages/types/order.type';
import type Item from '@/pages/types/items.type';
import type CustomerData from '@/pages/types/customerData.type';
type Scheduling = NonNullable<Order['shipping']>['scheduling'];
import type { AssistanceItem } from '@/pages/types/order.type';

export interface BuildAssistancePayloadOptions {
  baseOrder?: Order;
  currentOrderId?: string;
  isDraft: boolean;
  status: Order['status'];
  customerData: CustomerData;
  description: string;
  observation: string;
  scheduling: Scheduling;
  isLinked: boolean;
  linkedOrderId: string;
  linkedOrderCode?: string;
  linkedOrderDeliveryMethod?: string;
  selectedAssistanceItems: AssistanceItem[];
  extraItems: Item[];
  assistanceCost: number;
  assistanceServiceValue: number;
  seller: string;
}

export const calcAssistanceItemsSummary = (items: Item[]) => {
  const totalQuantity = items.reduce((acc, i) => acc + (i.quantity || 0), 0);
  const itemsSubtotal = items.reduce((acc, i) => acc + (i.quantity || 0) * (i.unitPrice || 0), 0);
  const totalItemsCost = items.reduce((acc, i) => acc + (i.quantity || 0) * (i.costPrice || 0), 0);

  return {
    totalQuantity,
    itemsSubtotal,
    totalFixedDiscount: 0,
    itemsTotalValue: itemsSubtotal,
    totalItemsCost,
  };
};

export const isAssistanceFormBlank = (
  customerData: CustomerData,
  description: string,
  observation: string,
  extraItems: Item[],
  selectedAssistanceItems: AssistanceItem[]
): boolean => {
  return (
    !customerData.fullName?.trim() &&
    !description.trim() &&
    !observation.trim() &&
    extraItems.length === 0 &&
    selectedAssistanceItems.length === 0
  );
};

export const buildAssistanceOrderPayload = ({
  baseOrder,
  currentOrderId,
  isDraft,
  status,
  customerData,
  description,
  observation,
  scheduling,
  isLinked,
  linkedOrderId,
  linkedOrderCode,
  linkedOrderDeliveryMethod,
  selectedAssistanceItems,
  extraItems,
  assistanceCost,
  assistanceServiceValue,
  seller,
}: BuildAssistancePayloadOptions): Order => {
  const itemsSummary = calcAssistanceItemsSummary(extraItems);
  const totalValue = itemsSummary.itemsTotalValue + assistanceServiceValue;

  const resolvedStatus: Order['status'] = isDraft
    ? 'draft'
    : status && status !== 'draft'
      ? status
      : scheduling.date
        ? 'scheduled'
        : 'fulfilled';

  const orderPayload: Order = {
    ...(baseOrder || {}),
    id: currentOrderId,
    orderType: 'assistance',
    status: resolvedStatus,
    customerData: {
      ...customerData,
      fullName: (customerData.fullName || '').trim(),
      phone: (customerData.phone || '').trim(),
    },
    assistanceDescription: description.trim(),
    observation: observation.trim(),
    // Vínculo opcional: itens da venda original só são associados se houver pedido vinculado
    assistanceItems: isLinked && linkedOrderId.trim() ? selectedAssistanceItems : [],
    items: extraItems,
    itemsSummary,
    assistanceCost,
    assistanceServiceValue,
    payments: baseOrder?.payments || [],
    paymentsSummary: baseOrder?.paymentsSummary || {
      totalPaymentsFee: 0,
      totalOrderValue: totalValue,
      totalAmountPaid: 0,
      amountRemaining: totalValue,
    },
    shipping: {
      ...(baseOrder?.shipping || {
        deliveryMethod: 'delivery',
        distance: 0,
        value: 0,
        noAddress: false,
        noCustomer: false,
        noDate: false,
        noTime: false,
      }),
      scheduling,
    },
    seller: seller.trim(),
    date: baseOrder?.date || new Date().toISOString(),
    scheduledDate: scheduling.date,
    scheduledTime: scheduling.startTime || '',
  } as Order;

  if (isLinked && linkedOrderId.trim()) {
    orderPayload.linkedOrderId = linkedOrderId.trim();
    if (linkedOrderCode) {
      orderPayload.linkedOrderCode = linkedOrderCode;
    }
    if (linkedOrderDeliveryMethod) {
      orderPayload.linkedOrderDeliveryMethod = linkedOrderDeliveryMethod;
      if (orderPayload.shipping) {
        orderPayload.shipping.deliveryMethod = linkedOrderDeliveryMethod;
      }
    }
  } else {
    orderPayload.linkedOrderId = undefined;
    orderPayload.linkedOrderCode = undefined;
    orderPayload.linkedOrderDeliveryMethod = undefined;
  }

  return orderPayload;
};
