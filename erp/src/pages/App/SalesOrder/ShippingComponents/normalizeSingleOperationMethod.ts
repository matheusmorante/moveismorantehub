import type Shipping from '@/pages/types/Shipping.type';

/** Keeps a sale's only operation aligned with the order-level modality and schedule. */
export const normalizeSingleOperationMethod = (shipping: Shipping): Shipping => {
  const appointments = shipping.scheduling.appointments;
  if (appointments?.length !== 1 || !shipping.deliveryMethod) return shipping;

  const [appointment] = appointments;
  if (appointment.deliveryMethod === shipping.deliveryMethod) return shipping;

  const { appointments: _appointments, ...orderSchedule } = shipping.scheduling;
  return {
    ...shipping,
    scheduling: {
      ...shipping.scheduling,
      appointments: [{
        ...appointment,
        deliveryMethod: shipping.deliveryMethod,
        scheduling: orderSchedule,
      }],
    },
  };
};
