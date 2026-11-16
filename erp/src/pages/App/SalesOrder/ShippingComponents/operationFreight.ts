type OperationFreight = {
  deliveryMethod?: 'delivery' | 'pickup';
  freightValue?: number;
  distance?: number;
};

const asNonNegativeNumber = (value: unknown): number | undefined => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
};

/** Moves legacy order-wide freight onto the first delivery operation when needed. */
export const normalizeOperationFreight = <T extends OperationFreight>(
  appointments: T[],
  defaultDeliveryMethod: 'delivery' | 'pickup',
  legacyFreightValue: unknown,
  legacyDistance?: unknown,
): Array<T & { freightValue: number }> => {
  if (appointments.length === 0) return [];

  const hasOperationFreight = appointments.some(
    (appointment) => typeof appointment.freightValue === 'number' && Number.isFinite(appointment.freightValue),
  );
  const deliveryIndex = appointments.findIndex(
    (appointment) => (appointment.deliveryMethod || defaultDeliveryMethod) === 'delivery',
  );
  const legacyIndex = deliveryIndex;
  const legacyFreight = asNonNegativeNumber(legacyFreightValue) ?? 0;
  const fallbackDistance = asNonNegativeNumber(legacyDistance);

  return appointments.map((appointment, index) => {
    const existingFreight = asNonNegativeNumber(appointment.freightValue);
    const freightValue = hasOperationFreight
      ? existingFreight ?? 0
      : index === legacyIndex
        ? legacyFreight
        : 0;
    const distance = asNonNegativeNumber(appointment.distance) ??
      (!hasOperationFreight && index === legacyIndex ? fallbackDistance : undefined);

    return {
      ...appointment,
      freightValue,
      ...(distance === undefined ? {} : { distance }),
    };
  });
};

export const getOperationsFreightTotal = (
  appointments: OperationFreight[],
  defaultDeliveryMethod: 'delivery' | 'pickup' = 'delivery',
): number => appointments.reduce((total, appointment) => {
  if ((appointment.deliveryMethod || defaultDeliveryMethod) !== 'delivery') return total;
  return total + (asNonNegativeNumber(appointment.freightValue) ?? 0);
}, 0);

export const getPrimaryOperationDistance = (
  appointments: OperationFreight[],
  defaultDeliveryMethod: 'delivery' | 'pickup',
): number | undefined => {
  const primaryDelivery = appointments.find(
    (appointment) => (appointment.deliveryMethod || defaultDeliveryMethod) === 'delivery' && asNonNegativeNumber(appointment.distance) !== undefined,
  );
  return asNonNegativeNumber(primaryDelivery?.distance);
};
