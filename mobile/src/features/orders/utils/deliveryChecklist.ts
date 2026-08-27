export type DeliveryChecklistItem = { id: string; label: string };

const normalize = (value: unknown) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

const collectNotes = (order: any) => {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const address = shipping.deliveryAddress || shipping.address || {};
  const customer = data.customerData || {};
  return normalize([
    data.observation, data.observations, data.notes,
    shipping.observation, shipping.observations, shipping.notes,
    shipping.deliveryObservation, address.observation, address.notes,
    customer.observation, customer.notes,
  ].filter(Boolean).join(' '));
};

const pendingCardMethods = (order: any): string[] => {
  const data = order.order_data || order;
  const payments = Array.isArray(data.payments) ? data.payments : [];
  return [...new Set(payments.filter((payment: any) => {
    const method = normalize(payment.method || payment.paymentMethod || payment.type);
    const status = normalize(payment.status || payment.paymentStatus);
    return /credito|debito|cartao|credit|debit/.test(method) && /pendente|pending/.test(status);
  }).map((payment: any) => String(payment.method || payment.paymentMethod || payment.type).trim()))];
};

export const buildDeliveryChecklist = (order: any): DeliveryChecklistItem[] => {
  const notes = collectNotes(order);
  const cardMethods = pendingCardMethods(order);
  const items: DeliveryChecklistItem[] = [{ id: 'loaded', label: 'Itens carregados' }];

  if (/serra[ -]?copo|cerra[ -]?copo/.test(notes)) {
    items.push({ id: 'hole_saw', label: 'Levar serra-copo' });
  }

  if (cardMethods.length > 0) {
    items.push({ id: 'card_machine', label: `Levar maquininha de cartão — pagamento pendente: ${cardMethods.join(', ')}` });
  }

  const requestedCall = /ligar antes|avisar antes|chamar antes|whatsapp antes/.test(notes);
  if (requestedCall) {
    items.push({ id: 'call_customer', label: 'Ligar antes de ir porque o cliente pediu' });
  }

  return items;
};
