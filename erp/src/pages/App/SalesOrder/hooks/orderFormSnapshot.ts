import Order from '@/pages/types/order.type';
import Shipping from '@/pages/types/Shipping.type';
import CustomerData from '@/pages/types/customerData.type';
import { calcItemsSummary } from '@/pages/utils/calculations';
import { migrateOrderHandlings } from '@/pages/utils/handlingMigration';
import { getOrderIndex } from '@/pages/utils/orderCode';
import { formatToStorageDate, parseStorageDateToLocal } from './orderDateFormatting';
import { resolveInitialUseCustomerAddress } from './customerAddressRules';
import { getSaoPauloDayInfo } from '../../../../../../shared-utils/commercialOrderRules';
import type { SchedulingSessionMemory } from '../ShippingComponents/Agendamento';

export const buildSalesOrderSnapshot = (
  stateSnapshot: any,
  orderIndex: string | null | undefined,
  schedulingSession: SchedulingSessionMemory | null,
  newStatus?: Order['status']
): Order => {
  const s = stateSnapshot;
  const currentItemsSummary = calcItemsSummary(s.items);
  const firstHandling =
    (s.items || []).find((i: any) => i.handlingType?.trim())?.handlingType || '';
  const isTestArtifact = s.isTestMode === true;

  let resolvedScheduling = s.shipping?.scheduling;
  const sessionDateMode = schedulingSession?.dateMode;
  if (
    resolvedScheduling &&
    !resolvedScheduling.pendingScheduling &&
    !resolvedScheduling.notInformed &&
    !resolvedScheduling.immediatePickup &&
    (sessionDateMode === 'today' || sessionDateMode === 'tomorrow')
  ) {
    const dayInfo = getSaoPauloDayInfo(sessionDateMode === 'today' ? 0 : 1);
    resolvedScheduling = {
      ...resolvedScheduling,
      date: dayInfo.isoDate,
      endDate: '',
      dateType: 'fixed',
    };
  }

  return {
    id: s.currentOrderId,
    orderIndex: isTestArtifact ? undefined : orderIndex || s.orderIndex || undefined,
    orderNumber: isTestArtifact ? undefined : orderIndex || s.orderIndex || undefined,
    orderType: s.orderType,
    status: newStatus || s.status,
    items: s.items,
    itemsSummary: currentItemsSummary,
    shipping: {
      ...s.shipping,
      scheduling: resolvedScheduling,
      orderType: firstHandling || s.shipping?.orderType || '',
    },
    payments: s.payments,
    paymentsSummary: s.paymentsSummary,
    customerData: s.customerData,
    observation: s.observation,
    seller: s.seller,
    sellerId: s.sellerId,
    marketingOrigin: s.marketingOrigin,
    date: formatToStorageDate(s.orderDate),
    assistanceItems: s.assistanceItems,
    assistanceServiceValue: s.assistanceServiceValue,
    assistanceCost: s.assistanceCost,
    linkedOrderId: s.linkedOrderId || undefined,
    isButtonsClicked: s.isButtonsClicked,
    ...s.testModeFields,
  };
};

export const createDefaultFormShipping = (useCustomerAddress: boolean): Shipping => ({
  value: 0,
  deliveryMethod: 'delivery',
  orderType: '',
  scheduling: {
    date: '',
    endDate: '',
    dateType: 'fixed' as const,
    time: '',
    startTime: '',
    endTime: '',
    type: 'fixed' as const,
    notInformed: false,
  },
  autoCalculateValue: true,
  useCustomerAddress,
  deliveryAddress: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    observation: '',
    neighborhood: '',
    city: '',
    state: 'PR',
  },
});

export const createDefaultFormCustomerData = (): CustomerData => ({
  fullName: '',
  phone: '',
  noPhone: false,
  noAddress: false,
  fullAddress: {
    cep: '',
    street: '',
    number: '',
    complement: '',
    observation: '',
    neighborhood: '',
    city: '',
  },
  additionalContacts: [],
});

export const prepareOrderForFormEditing = (order: Order) => {
  const migratedOrder = migrateOrderHandlings(order);
  const existingIndex = getOrderIndex(order);
  const isLoadedTestArtifact = Boolean(order.id && order.is_test === true);
  const isExistingOrder = Boolean(order.id && (existingIndex || isLoadedTestArtifact));
  const loadedStatus = order.status || 'draft';

  const normalizedItems = (migratedOrder.items || []).map((item) => ({
    ...item,
    orderItemId: item.orderItemId || crypto.randomUUID(),
  }));

  const resolvedUseCustomerAddress = resolveInitialUseCustomerAddress(
    order.customerData,
    migratedOrder.shipping?.useCustomerAddress
  );

  const defaultShipping = createDefaultFormShipping(resolvedUseCustomerAddress);
  const normalizedShipping: Shipping = migratedOrder.shipping
    ? {
        ...defaultShipping,
        ...migratedOrder.shipping,
        useCustomerAddress: resolvedUseCustomerAddress,
        scheduling: {
          ...defaultShipping.scheduling,
          ...(migratedOrder.shipping.scheduling || {}),
        },
        deliveryAddress: {
          ...defaultShipping.deliveryAddress!,
          ...(migratedOrder.shipping.deliveryAddress || {}),
          state: migratedOrder.shipping.deliveryAddress?.state || 'PR',
        },
      }
    : defaultShipping;

  const normalizedPayments = Array.isArray(order.payments) ? order.payments : [];
  const normalizedCustomerData: CustomerData = order.customerData
    ? {
        ...order.customerData,
        noAddress:
          order.customerData.noAddress || !!(order.customerData.fullAddress as any)?.noAddress,
      }
    : createDefaultFormCustomerData();

  const loadedTestFields: Pick<Order, 'is_test' | 'testArtifact'> = order.id
    ? { is_test: order.is_test, testArtifact: order.testArtifact }
    : {};

  return {
    migratedOrder,
    existingIndex,
    isLoadedTestArtifact,
    isExistingOrder,
    loadedStatus,
    normalizedItems,
    normalizedShipping,
    normalizedPayments,
    normalizedCustomerData,
    loadedTestFields,
    formattedDate: order.date ? parseStorageDateToLocal(order.date) : '',
  };
};
