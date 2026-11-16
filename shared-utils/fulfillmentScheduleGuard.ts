type FulfillmentItem = { orderItemId?: string; quantity?: number };
type FulfillmentSchedule = {
  appointments?: Array<{ itemIds?: string[]; itemQuantities?: Record<string, number> }>;
};

/** A conclusão atual altera o pedido inteiro, sem distinguir os agendamentos. */
export const hasSeparateFulfillments = (
  scheduling?: FulfillmentSchedule | null,
  items?: readonly FulfillmentItem[] | null,
): boolean => {
  const appointments = scheduling?.appointments;
  if (!Array.isArray(appointments) || appointments.length === 0) return false;
  if (appointments.length > 1 || !items?.length) return true;

  const appointment = appointments[0];
  const selected = Array.isArray(appointment?.itemIds) ? appointment.itemIds : [];
  return items.some((item) => {
    const itemId = item.orderItemId;
    if (!itemId || !selected.includes(itemId)) return true;
    const quantity = appointment.itemQuantities?.[itemId];
    return quantity !== undefined && (!Number.isFinite(quantity) || quantity < Number(item.quantity));
  });
};
