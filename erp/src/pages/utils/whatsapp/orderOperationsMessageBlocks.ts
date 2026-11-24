import Order from '../../types/order.type';
import {
  formatCurrency,
  formatDate,
  stringifyFullAddressWithObservation,
  stringifyItemsWithValues,
} from '../formatters';
import { splitNoticeTags } from '../noticeTags';
import {
  DELIVERY_NOTICE_OPTIONS,
  normalizeNotice,
} from '@/pages/App/SalesOrder/components/steps/logisticsNoticeRules';

export type OperationScheduleOption = {
  date?: string;
  endDate?: string;
  dateType?: 'fixed' | 'range';
  time?: string;
  startTime?: string;
  endTime?: string;
  type?: 'fixed' | 'range';
};

export type OperationSchedule = OperationScheduleOption & {
  pendingScheduling?: boolean;
  immediatePickup?: boolean;
  notInformed?: boolean;
  alternatives?: OperationScheduleOption[];
};

const formatOperationScheduleOption = (schedule: OperationScheduleOption) => {
  const date = schedule.dateType === 'range' && schedule.date && schedule.endDate
    ? `de ${formatDate(schedule.date)} até ${formatDate(schedule.endDate)}`
    : schedule.date
      ? formatDate(schedule.date)
      : 'Data não definida';
  const time = schedule.type === 'range' && schedule.startTime && schedule.endTime
    ? `${schedule.startTime} às ${schedule.endTime}`
    : schedule.startTime || schedule.time || 'Horário não definido';
  return `${date} | ${time}`;
};

export const buildCustomerOrderStagesBlock = (order: Order): string => {
  const shipping = order.shipping;
  const appointments = shipping?.scheduling?.appointments || [];
  const operations = appointments.length
    ? appointments.map((appointment, index) => ({
        deliveryMethod: appointment.deliveryMethod ?? shipping.deliveryMethod ?? 'delivery',
        scheduling: appointment.scheduling as OperationSchedule,
        useCustomerAddress: appointment.useCustomerAddress ?? (
          index === 0 ? shipping.useCustomerAddress !== false : true
        ),
        deliveryAddress: appointment.deliveryAddress ?? (
          index === 0 && shipping.useCustomerAddress === false ? shipping.deliveryAddress : undefined
        ),
      }))
    : [{
        deliveryMethod: shipping.deliveryMethod ?? 'delivery',
        scheduling: shipping.scheduling as OperationSchedule,
        useCustomerAddress: shipping.useCustomerAddress !== false,
        deliveryAddress: shipping.deliveryAddress,
      }];

  const operationCounts = operations.reduce(
    (counts, operation) => {
      if (operation.deliveryMethod === 'pickup') counts.pickup += 1;
      else counts.delivery += 1;
      return counts;
    },
    { delivery: 0, pickup: 0 }
  );
  const operationPositions = { delivery: 0, pickup: 0 };

  const operationBlocks = operations.map((operation) => {
    const method = operation.deliveryMethod;
    if (method === 'pickup') operationPositions.pickup += 1;
    else operationPositions.delivery += 1;
    const operationPosition = method === 'pickup'
      ? operationPositions.pickup
      : operationPositions.delivery;
    const operationCount = method === 'pickup' ? operationCounts.pickup : operationCounts.delivery;
    const methodLabel = method === 'pickup' ? 'Retirada' : 'Entrega';
    const ordinal = operationCount > 1 ? ` ${operationPosition}` : '';
    const schedule =
      operation.scheduling.immediatePickup && method === 'pickup'
        ? 'Retirada imediata'
        : operation.scheduling.pendingScheduling
          ? 'Agendamento pendente'
          : operation.scheduling.notInformed
            ? 'Agendamento não informado'
            : formatOperationScheduleOption(operation.scheduling);
    const lines = [`*${methodLabel}${ordinal}:*`, `*Agendamento:* ${schedule}`];

    if (method === 'delivery') {
      const address = operation.useCustomerAddress
        ? order.customerData?.fullAddress
        : operation.deliveryAddress;
      const addressText = !shipping?.noAddress
        ? stringifyFullAddressWithObservation(address)
        : '';
      lines.push(`*Endereço:* ${addressText || 'Endereço não informado'}`);
    }

    return lines.join('\n');
  });

  const operationsText = operationBlocks.join('\n\n');
  return operations.length > 1
    ? `*Etapas do pedido:*\n${operationsText}`
    : operationsText;
};

const buildOperationImportantNotices = (
  order: Order,
  operation: { deliveryMethod?: string; notices?: {
    callBeforeDelivery?: boolean;
    bringCardMachine?: boolean;
    callOnArrival?: boolean;
    instructions?: string;
  } },
  operationIndex: number
) => {
  const legacyNotices = operationIndex === 0
    ? (order.observation || '').split(/[;\r\n\t]+/).map((notice) => notice.trim()).filter(Boolean)
    : [];
  const selectedNotices = operation.deliveryMethod === 'delivery'
    ? DELIVERY_NOTICE_OPTIONS
        .filter((option) => operation.notices?.[option.field] === true)
        .map((option) => option.notice)
    : [];
  const selectedNoticeKeys = new Set(selectedNotices.map(normalizeNotice));
  const customNotices = splitNoticeTags(operation.notices?.instructions)
    .flatMap((notice) => notice.split(/\t+/).map((part) => part.trim()).filter(Boolean))
    .filter((notice) => !selectedNoticeKeys.has(normalizeNotice(notice)));
  const allNotices = [...legacyNotices, ...selectedNotices, ...customNotices];
  const seen = new Set<string>();
  return allNotices
    .filter((notice) => {
      const key = normalizeNotice(notice);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .join('; ');
};

export const buildDeliveryOperationsBlock = (order: Order): string => {
  const shipping = order.shipping;
  const appointments = shipping?.scheduling?.appointments || [];
  const operations = appointments.length
    ? appointments.map((appointment, index) => {
        const itemIds = new Set(appointment.itemIds || []);
        const operationItems = appointments.length === 1 && itemIds.size === 0
          ? order.items || []
          : (order.items || []).flatMap((item) => {
              const itemId = item.orderItemId;
              if (!itemId || !itemIds.has(itemId)) return [];
              return [{
                ...item,
                quantity: appointment.itemQuantities?.[itemId] ?? item.quantity,
              }];
            });

        return {
          id: appointment.id,
          index: order.operationContext ? order.operationContext.operationNumber - 1 : index,
          deliveryMethod: appointment.deliveryMethod ?? shipping.deliveryMethod ?? 'delivery',
          scheduling: appointment.scheduling as OperationSchedule,
          notices: appointment.notices ?? (index === 0 ? {
            callBeforeDelivery: shipping.callBeforeDelivery,
            bringCardMachine: shipping.bringCardMachine,
            callOnArrival: shipping.callOnArrival,
          } : undefined),
          useCustomerAddress: appointment.useCustomerAddress ?? (index === 0 ? shipping.useCustomerAddress !== false : true),
          deliveryAddress: appointment.deliveryAddress ?? (index === 0 && shipping.useCustomerAddress === false ? shipping.deliveryAddress : undefined),
          freightValue: appointment.freightValue ?? (index === 0 ? shipping.value : 0),
          distance: appointment.distance ?? (index === 0 ? shipping.distance : undefined),
          items: operationItems,
        };
      })
    : [{
        id: 'legacy-operation',
        index: 0,
        deliveryMethod: shipping.deliveryMethod ?? 'delivery',
        scheduling: shipping.scheduling as OperationSchedule,
        useCustomerAddress: shipping.useCustomerAddress !== false,
        deliveryAddress: shipping.deliveryAddress,
        freightValue: shipping.value,
        distance: shipping.distance,
        notices: {
          callBeforeDelivery: shipping.callBeforeDelivery,
          bringCardMachine: shipping.bringCardMachine,
          callOnArrival: shipping.callOnArrival,
        },
        items: order.items || [],
      }];

  const operationAddresses = operations.map((operation) => {
    const address = operation.useCustomerAddress
      ? order.customerData?.fullAddress
      : operation.deliveryAddress;
    const addressText = !shipping?.noAddress && operation.deliveryMethod === 'delivery'
      ? stringifyFullAddressWithObservation(address)
      : '';
    return {
      ...operation,
      addressText,
    };
  });

  const sections = operationAddresses.map((operation) => {
    const methodLabel = operation.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega';
    const schedule = operation.scheduling.immediatePickup && operation.deliveryMethod === 'pickup'
      ? 'Retirada imediata'
      : operation.scheduling.pendingScheduling
        ? 'Agendamento pendente'
        : operation.scheduling.notInformed
          ? 'Programação não informada'
          : formatOperationScheduleOption(operation.scheduling);
    const lines = [
      `*Operação ${operation.index + 1} - ${methodLabel}*`,
      `🗓️ *Agendamento:* ${schedule}`,
    ];
    if (operation.deliveryMethod === 'delivery' && operation.addressText) {
      lines.push(`🏠 *Endereço:* ${operation.addressText}`);
    }
    if (operation.deliveryMethod === 'delivery' && (operation.freightValue || 0) > 0) {
      lines.push(`🚚 *Frete:* ${formatCurrency(operation.freightValue)}`);
    }
    if (operation.deliveryMethod === 'delivery' && operation.distance) {
      lines.push(`📍 *Distância:* ${operation.distance} km`);
    }
    const alternatives = operation.scheduling.pendingScheduling
      ? []
      : (operation.scheduling.alternatives || []).map(formatOperationScheduleOption);
    if (alternatives.length > 0) lines.push(`🗓️ *Alternativas:* ${alternatives.join(' • ')}`);
    const importantNotices = buildOperationImportantNotices(order, operation, operation.index);
    if (importantNotices) lines.push(`⚠️ *Avisos importantes:* ${importantNotices}`);
    const operationItems = stringifyItemsWithValues(operation.items || []);
    if (operationItems) lines.push(`🛒 *Itens desta operação:*\n${operationItems}`);
    return lines.join('\n\n');
  });

  return `*Logística:*\n\n${sections.join('\n\n')}`;
};
