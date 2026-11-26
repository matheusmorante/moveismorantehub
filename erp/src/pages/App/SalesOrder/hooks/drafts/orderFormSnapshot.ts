import Order from '@/pages/types/order.type';
import Shipping from '@/pages/types/Shipping.type';
import type Item from '@/pages/types/items.type';
import CustomerData from '@/pages/types/customerData.type';
import { calcItemsSummary } from '@/pages/utils/sales/calculations';
import { migrateOrderHandlings } from '@/pages/utils/sales/handlingMigration';
import { getOrderIndex } from '@/pages/utils/orderCode';
import { formatToStorageDate, parseStorageDateToLocal } from '../form-flow/orderDateFormatting';
import { resolveInitialUseCustomerAddress } from '../customer-shipping/customerAddressRules';
import { getSaoPauloDayInfo } from '../../../../../../../shared-utils/commercialOrderRules';
import type { SchedulingSessionMemory } from '../../ShippingComponents/Agendamento';
import { resolveFirstItemHandlingType } from '../../orderItemHandling';
import { getOperationsFreightTotal, getPrimaryOperationDistance, normalizeOperationFreight } from '../../ShippingComponents/operationFreight';
import { normalizeSingleOperationMethod } from '../../ShippingComponents/normalizeSingleOperationMethod';

type CurrentOrderFormValues = Pick<
  Order,
  | 'orderType'
  | 'items'
  | 'itemsSummary'
  | 'shipping'
  | 'payments'
  | 'paymentsSummary'
  | 'customerData'
  | 'observation'
  | 'seller'
  | 'marketingOrigin'
  | 'assistanceItems'
  | 'assistanceServiceValue'
  | 'assistanceCost'
  | 'linkedOrderId'
  | 'isButtonsClicked'
  | 'fiscalContext'
> & {
  currentOrderId: Order['id'];
  orderIndex: number | null;
  status: string;
  orderDate: string;
  testModeFields: Pick<Order, 'is_test' | 'testArtifact'>;
};

export const buildCurrentOrder = (state: CurrentOrderFormValues): Order => {
  const firstHandling = resolveFirstItemHandlingType(state.items);
  return {
    id: state.currentOrderId,
    orderIndex: state.orderIndex || undefined,
    orderNumber: state.orderIndex || undefined,
    orderType: state.orderType,
    status: state.status as any,
    items: state.items,
    itemsSummary: state.itemsSummary,
    shipping: {
      ...state.shipping,
      orderType: firstHandling || state.shipping.orderType || '',
    },
    payments: state.payments,
    paymentsSummary: state.paymentsSummary,
    customerData: state.customerData,
    observation: state.observation,
    seller: state.seller,
    marketingOrigin: state.marketingOrigin,
    date: formatToStorageDate(state.orderDate),
    assistanceItems: state.assistanceItems,
    assistanceServiceValue: state.assistanceServiceValue,
    assistanceCost: state.assistanceCost,
    linkedOrderId: state.linkedOrderId,
    isButtonsClicked: state.isButtonsClicked,
    fiscalContext: state.fiscalContext,
    ...state.testModeFields,
  };
};

export const buildSalesOrderSnapshot = (
  stateSnapshot: any,
  orderIndex: number | null | undefined,
  schedulingSession: SchedulingSessionMemory | null,
  newStatus?: Order['status']
): Order => {
  const s = stateSnapshot;
  const currentItemsSummary = calcItemsSummary(s.items);
  const isTestArtifact = s.isTestMode === true;

  let resolvedScheduling = s.shipping?.scheduling;
  if (
    s.orderType === 'sale' && resolvedScheduling && !resolvedScheduling.appointments?.length &&
    Array.isArray(s.items) && s.items.length > 0 && s.items.every((item: Item) => Boolean(item.orderItemId))
  ) {
    const scheduledItems = (s.items || []).filter((item: Item) => item.orderItemId && item.description?.trim());
    const { appointments: _appointments, ...legacySchedule } = resolvedScheduling;
    resolvedScheduling = {
      ...legacySchedule,
      appointments: [{
        id: 'principal',
        deliveryMethod: s.isNewSaleFlow ? undefined : s.shipping.deliveryMethod,
        itemIds: scheduledItems.map((item: Item) => item.orderItemId!),
        itemQuantities: Object.fromEntries(scheduledItems.map((item: Item) => [item.orderItemId!, item.quantity])),
        ...(s.isNewSaleFlow ? {
          itemHandlings: Object.fromEntries(scheduledItems
            .filter((item: Item) => item.itemType !== 'service' && !item.isComboItem)
            .map((item: Item) => [item.orderItemId!, { handlingType: '', assemblyResponsible: '' }]))
        } : {}),
        notices: {
          ...(s.shipping?.callBeforeDelivery === undefined ? {} : { callBeforeDelivery: s.shipping.callBeforeDelivery }),
          ...(s.shipping?.bringCardMachine === undefined ? {} : { bringCardMachine: s.shipping.bringCardMachine }),
          ...(s.shipping?.callOnArrival === undefined ? {} : { callOnArrival: s.shipping.callOnArrival }),
        },
        scheduling: legacySchedule,
      }],
    };
  }
  if (s.orderType === 'sale' && !s.isNewSaleFlow && s.shipping?.deliveryMethod && resolvedScheduling?.appointments?.length === 1) {
    resolvedScheduling = normalizeSingleOperationMethod({
      ...s.shipping,
      scheduling: resolvedScheduling,
    } as Shipping).scheduling;
  }
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
      appointments: resolvedScheduling.appointments?.map((
        appointment: NonNullable<Shipping['scheduling']['appointments']>[number],
        index: number
      ) =>
        index === 0
          ? {
              ...appointment,
              scheduling: {
                ...appointment.scheduling,
                date: dayInfo.isoDate,
                endDate: '',
                dateType: 'fixed',
              },
            }
          : appointment
      ),
    };
  }

  let operationFreightTotal: number | undefined;
  let operationDistance: number | undefined;
  if (s.orderType === 'sale' && resolvedScheduling?.appointments?.length) {
    const defaultDeliveryMethod = s.shipping?.deliveryMethod || 'delivery';
    const operationAppointments = resolvedScheduling.appointments.map((appointment: NonNullable<Shipping['scheduling']['appointments']>[number]) => ({
      ...appointment,
      ...(!s.isNewSaleFlow && !appointment.deliveryMethod
        ? { deliveryMethod: defaultDeliveryMethod }
        : {}),
    }));
    const appointments = normalizeOperationFreight(
      operationAppointments,
      defaultDeliveryMethod,
      s.shipping?.value,
      s.shipping?.distance,
    );
    resolvedScheduling = { ...resolvedScheduling, appointments };
    operationFreightTotal = getOperationsFreightTotal(appointments, defaultDeliveryMethod);
    operationDistance = getPrimaryOperationDistance(appointments, defaultDeliveryMethod);
  }

  const snapshotItems = (s.items || []).map((item: Item) => {
    const appointment = resolvedScheduling?.appointments?.find((entry: NonNullable<Shipping['scheduling']['appointments']>[number]) =>
      item.orderItemId && entry.itemIds.includes(item.orderItemId)
    );
    const handling = item.orderItemId && appointment?.itemHandlings?.[item.orderItemId];
    return handling ? { ...item, ...handling } : item;
  });
  const firstHandling = resolveFirstItemHandlingType(snapshotItems);

  return {
    id: s.currentOrderId,
    orderIndex: isTestArtifact ? undefined : orderIndex || s.orderIndex || undefined,
    orderNumber: isTestArtifact ? undefined : orderIndex || s.orderIndex || undefined,
    orderType: s.orderType,
    status: newStatus || s.status,
    items: snapshotItems,
    itemsSummary: currentItemsSummary,
    shipping: {
      ...s.shipping,
      ...(operationFreightTotal === undefined ? {} : { value: operationFreightTotal, distance: operationDistance }),
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
    fiscalContext: s.fiscalContext,
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
  const loadedStatus = order.status || 'draft';
  const isExistingOrder = Boolean(order.id && (existingIndex || isLoadedTestArtifact || loadedStatus === 'draft'));

  const normalizedItems = (migratedOrder.items || []).map((item) => ({
    ...item,
    orderItemId: item.orderItemId || crypto.randomUUID(),
  }));

  const resolvedUseCustomerAddress = resolveInitialUseCustomerAddress(
    order.customerData,
    migratedOrder.shipping?.useCustomerAddress
  );

  const defaultShipping = createDefaultFormShipping(resolvedUseCustomerAddress);
  let normalizedShipping: Shipping = migratedOrder.shipping
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

  if (order.orderType === 'sale') {
    normalizedShipping = normalizeSingleOperationMethod(normalizedShipping);
  }

  if (order.orderType === 'sale' && normalizedShipping.scheduling.appointments?.length) {
    const deliveryMethod = normalizedShipping.deliveryMethod || 'delivery';
    const appointments = normalizeOperationFreight(
      normalizedShipping.scheduling.appointments.map((appointment) => ({
        ...appointment,
        deliveryMethod: appointment.deliveryMethod || deliveryMethod,
      })),
      deliveryMethod,
      normalizedShipping.value,
      normalizedShipping.distance,
    );
    normalizedShipping = {
      ...normalizedShipping,
      value: getOperationsFreightTotal(appointments, deliveryMethod),
      distance: getPrimaryOperationDistance(appointments, deliveryMethod),
      scheduling: { ...normalizedShipping.scheduling, appointments },
    };
  }

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
