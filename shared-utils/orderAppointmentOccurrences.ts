type OrderLike = Record<string, any>;

const asFiniteNumber = (value: unknown): number | undefined => {
  if (value === null || value === undefined || value === '') return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
};

// Delivery progress belongs to an operation; legacy orders still use the root fields.
export const DELIVERY_OPERATION_FIELDS = [
  'deliveryStatus', 'deliveryPreparationStartedAt', 'deliveryStartedAt', 'deliveryArrivedAt',
  'deliveryServiceStartedAt', 'deliveryFinishedAt', 'deliveryChecklist', 'deliveryResponsibles',
  'deliveryResponsibleName', 'deliveryResponsibleId', 'unattendedAt', 'unattendedReason',
  'unattendedNotes', 'unattendedProofUrl', 'unattendedProofUrls',
] as const;

export const projectDeliveryOperation = (data: OrderLike, appointmentId: string): OrderLike => {
  if (!data.deliveryOperations || typeof data.deliveryOperations !== 'object' || Array.isArray(data.deliveryOperations)) return { ...data };
  const projected = { ...data };
  for (const key of DELIVERY_OPERATION_FIELDS) delete projected[key];
  const operation = data.deliveryOperations[appointmentId];
  if (operation && typeof operation === 'object') {
    for (const key of DELIVERY_OPERATION_FIELDS) {
      if (operation[key] != null) projected[key] = operation[key];
    }
  }
  return projected;
};

export const getOrderOperationLabel = (order: OrderLike): string | undefined => {
  const operation = order?.scheduleAppointment;
  return operation && operation.total > 1
    ? `Operação ${operation.index}/${operation.total}`
    : undefined;
};

/** Converts one persisted order into display-only rows for its assigned appointments. */
export const expandOrderAppointments = <T extends OrderLike>(order: T): T[] => {
  const data = order.order_data && typeof order.order_data === 'object' ? order.order_data : null;
  const shipping = data?.shipping || order.shipping || {};
  const rootSchedule = shipping.scheduling || data?.schedule || data?.scheduling || order.scheduling || {};
  if (!Array.isArray(rootSchedule.appointments)) return [order];

  const items = Array.isArray(data?.items) ? data.items : Array.isArray(order.items) ? order.items : [];
  const defaultMethod = shipping.deliveryMethod || order.delivery_method || order.deliveryMethod || 'delivery';
  const appointments = rootSchedule.appointments as OrderLike[];
  const hasOperationFreight = appointments.some(
    (appointment) => asFiniteNumber(appointment?.freightValue) !== undefined,
  );
  const firstDeliveryIndex = appointments.findIndex(
    (appointment) => (appointment?.deliveryMethod || defaultMethod) === 'delivery',
  );
  const assignedAppointments: Array<{ appointment: OrderLike; originalIndex: number; items: OrderLike[] }> = rootSchedule.appointments.flatMap((appointment: OrderLike, index: number) => {
    const selectedIds = new Set([
      ...(Array.isArray(appointment?.itemIds) ? appointment.itemIds : []),
      ...Object.keys(appointment?.itemQuantities || {}),
    ].map(String));
    const itemHandlings = appointment?.itemHandlings || {};
    const appointmentItems = items.flatMap((item: OrderLike) => {
      const itemId = [item?.orderItemId, item?.id]
        .filter((id) => id != null && id !== '')
        .map(String)
        .find((id) => selectedIds.has(id));
      if (!itemId) return [];
      const quantity = Number(appointment?.itemQuantities?.[itemId] ?? item.quantity ?? 0);
      if (!Number.isFinite(quantity) || quantity <= 0) return [];
      const handling = itemHandlings[itemId];
      return [{
        ...item,
        quantity,
        ...(handling ? {
          handlingType: handling.handlingType ?? '',
          assemblyResponsible: handling.assemblyResponsible ?? '',
        } : {}),
      }];
    });

    if (appointmentItems.length === 0) return [];
    return [{ appointment, originalIndex: index, items: appointmentItems }];
  });

  return assignedAppointments.map(({ appointment, originalIndex, items: appointmentItems }) => {
    const appointmentId = String(appointment?.id || `appointment-${originalIndex + 1}`);
    const method = appointment?.deliveryMethod || defaultMethod;
    const appointmentShipping = { ...shipping };
    const hasAddressChoice = typeof appointment?.useCustomerAddress === 'boolean';
    const useCustomerAddress = hasAddressChoice
      ? appointment.useCustomerAddress
      : shipping.useCustomerAddress !== false;
    const legacyCustomAddress = shipping.useCustomerAddress === false ? shipping.deliveryAddress : undefined;
    const operationAddress = useCustomerAddress
      ? undefined
      : appointment?.deliveryAddress || legacyCustomAddress;
    const customer = data?.customerData || order.customerData || order.customer || {};
    const customerAddress = customer.fullAddress || customer.address;
    const savedFreight = asFiniteNumber(appointment?.freightValue);
    const operationFreight = savedFreight !== undefined
      ? savedFreight
      : !hasOperationFreight && originalIndex === firstDeliveryIndex
        ? asFiniteNumber(shipping.value) ?? 0
        : 0;
    const savedDistance = asFiniteNumber(appointment?.distance);
    const legacyDistance = asFiniteNumber(shipping.distance);
    const operationDistance = savedDistance !== undefined
      ? savedDistance
      : !hasOperationFreight && originalIndex === firstDeliveryIndex && legacyDistance !== undefined
        ? legacyDistance
        : undefined;

    if (hasAddressChoice) {
      appointmentShipping.useCustomerAddress = useCustomerAddress;
      if (useCustomerAddress) {
        delete appointmentShipping.deliveryAddress;
        const coords = customerAddress?.coords;
        if (Array.isArray(coords) && coords.length === 2) appointmentShipping.destinationCoords = coords;
        else delete appointmentShipping.destinationCoords;
      } else {
        if (operationAddress) appointmentShipping.deliveryAddress = operationAddress;
        else delete appointmentShipping.deliveryAddress;
        const coords = operationAddress?.coords;
        if (Array.isArray(coords) && coords.length === 2) appointmentShipping.destinationCoords = coords;
        else delete appointmentShipping.destinationCoords;
      }
      // Root map links and route estimates may belong to another operation.
      for (const key of ['mapsUrl', 'googleMapsUrl', 'mapsLink', 'durationMinutes']) delete appointmentShipping[key];
    }
    appointmentShipping.value = method === 'delivery' ? operationFreight : 0;
    if (method === 'delivery' && operationDistance !== undefined) appointmentShipping.distance = operationDistance;
    else delete appointmentShipping.distance;
    const operationNotices = appointment?.notices && typeof appointment.notices === 'object'
      ? appointment.notices
      : {};
    appointmentShipping.callBeforeDelivery = operationNotices.callBeforeDelivery ?? shipping.callBeforeDelivery;
    appointmentShipping.bringCardMachine = operationNotices.bringCardMachine ?? shipping.bringCardMachine;
    appointmentShipping.callOnArrival = operationNotices.callOnArrival ?? shipping.callOnArrival;
    appointmentShipping.operationNotices = operationNotices;
    for (const key of ['scheduledDate', 'scheduled_date', 'scheduledTime', 'scheduled_time', 'scheduledPeriod', 'scheduled_start_time', 'scheduled_end_time']) delete appointmentShipping[key];
    if (appointment?.deliveryMethod) delete appointmentShipping.deliveryType;
    appointmentShipping.deliveryMethod = method;
    appointmentShipping.scheduling = appointment?.scheduling || {};

    const occurrence = {
      id: order.id,
      index: originalIndex + 1,
      total: rootSchedule.appointments.length,
      appointmentId,
      key: `${String(order.id || 'order')}-appointment-${appointmentId}`,
    };

    const sourceData = data || order;
    const projected = projectDeliveryOperation(sourceData, appointmentId);
    if (sourceData.routeSequencesByOperation && typeof sourceData.routeSequencesByOperation === 'object') {
      delete projected.routeSequence;
      const sequence = sourceData.routeSequencesByOperation[appointmentId];
      if (typeof sequence === 'number' && Number.isFinite(sequence)) projected.routeSequence = sequence;
    }
    const result: OrderLike = data ? { ...order } : projected;
    for (const key of ['schedule', 'scheduling', 'scheduled_date', 'scheduledDate', 'scheduled_time', 'scheduledTime', 'scheduledPeriod', 'scheduled_start_time', 'scheduled_end_time', 'date', 'pending_scheduling', 'pendingScheduling']) delete result[key];

    if (data) {
      const appointmentData = projected;
      for (const key of ['schedule', 'scheduling', 'scheduled_date', 'scheduledDate', 'scheduled_time', 'scheduledTime', 'scheduledPeriod', 'scheduled_start_time', 'scheduled_end_time', 'date', 'pendingScheduling']) delete appointmentData[key];
      result.order_data = { ...appointmentData, shipping: appointmentShipping, items: appointmentItems };
    }
    if (sourceData.deliveryOperations && typeof sourceData.deliveryOperations === 'object') {
      for (const key of DELIVERY_OPERATION_FIELDS) {
        if (projected[key] == null) delete result[key];
        else result[key] = projected[key];
      }
      result.delivery_status = projected.deliveryStatus || null;
      result.deliveryStatus = projected.deliveryStatus || null;
      result.delivery_started_at = projected.deliveryStartedAt || null;
      result.delivery_arrived_at = projected.deliveryArrivedAt || null;
      result.delivery_finished_at = projected.deliveryFinishedAt || null;
    }
    if (order.shipping) result.shipping = appointmentShipping;
    if (Array.isArray(order.items)) result.items = appointmentItems;

    result.delivery_method = method;
    result.scheduleAppointment = occurrence;
    return result as T;
  });
};
