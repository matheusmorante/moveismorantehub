export type DeliveryChecklistItem = { id: string; label: string };

const normalize = (value: unknown) => String(value || '')
  .normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();

/**
 * O pedido pode trazer os mesmos itens tanto em `order_data.items` quanto em
 * `order.items`. Usamos a lista interna como fonte principal e removemos
 * repetições antes de montar o checklist.
 */
const collectOrderItems = (order: any): any[] => {
  const data = order.order_data || order;
  const dataItems = Array.isArray(data.items) ? data.items : [];
  const orderItems = Array.isArray(order.items) ? order.items : [];
  const primaryItems = dataItems.length > 0 ? dataItems : orderItems;
  const assistanceItems = Array.isArray(data.assistanceItems) ? data.assistanceItems : [];
  const uniqueItems = new Map<string, any>();

  [...primaryItems, ...assistanceItems].forEach((item, index) => {
    const productId = item?.id || item?.product_id || item?.productId || item?.variation_id || item?.variationId;
    const name = normalize(item?.description || item?.name || item?.title);
    const quantity = Number(item?.quantity || item?.qty || 1);
    const key = productId
      ? `id:${productId}`
      : `item:${name}|${quantity}|${String(item?.volumes || '')}`;

    if (!uniqueItems.has(key)) uniqueItems.set(key, item || { description: `Item ${index + 1}` });
  });

  return [...uniqueItems.values()];
};

const collectRawNotes = (order: any): string => {
  const data = order.order_data || order;
  const shipping = data.shipping || {};
  const address = shipping.deliveryAddress || shipping.address || {};
  const customer = data.customerData || {};
  return [
    data.observation, data.observations, data.notes,
    shipping.observation, shipping.observations, shipping.notes,
    shipping.deliveryObservation, address.observation, address.notes,
    customer.observation, customer.notes,
  ].filter(Boolean).join(' ');
};

const extractCallAdvanceTime = (rawText: string): string | null => {
  if (!rawText) return null;
  // Procura padrões de tempo antes da entrega (ex: "30 min antes", "1 hora antes", "15 minutos antes")
  const match = rawText.match(/(\d+\s*(?:minutos?|mins?|m\b|horas?|hrs?|h\b))\s*(?:antes|de anteced[eê]ncia)/i) ||
                rawText.match(/(?:com|em|de)\s*(\d+\s*(?:minutos?|mins?|m\b|horas?|hrs?|h\b))\s*antes/i) ||
                rawText.match(/(\d+)\s*(?:minutos?|mins?|m\b|horas?|hrs?|h\b)\s*antes/i);
  if (match && match[1]) {
    let t = match[1].trim();
    if (/^\d+\s*m$/i.test(t) || /^\d+\s*min$/i.test(t)) {
      t = t.replace(/\D/g, '') + ' minutos';
    } else if (/^\d+\s*h$/i.test(t)) {
      t = t.replace(/\D/g, '') + ' hora(s)';
    }
    return t;
  }
  return null;
};

const getPendingCardInfo = (order: any): { hasPending: boolean; methods: string[]; pendingAmount: number } => {
  const data = order.order_data || order;
  const payments = Array.isArray(data.payments) ? data.payments : [];
  let pendingAmount = 0;
  const methodsFound: string[] = [];

  payments.forEach((payment: any) => {
    const method = normalize(payment.method || payment.paymentMethod || payment.type);
    const status = normalize(payment.status || payment.paymentStatus);
    const amount = Number(payment.amount || payment.value || 0);

    const isCard = /credito|debito|cartao|credit|debit/.test(method);
    const isPending = /pendente|pending|a receber|aguardando/.test(status) || (!/pago|recebido|concluido|aprovado/.test(status) && status.length > 0);

    if (isCard && isPending) {
      methodsFound.push(String(payment.method || payment.paymentMethod || 'Cartão').trim());
      if (amount > 0) pendingAmount += amount;
    }
  });

  if (methodsFound.length === 0 && payments.length === 0) {
    const fallbackMethod = normalize(data.paymentMethod || data.payment_method);
    const orderStatus = normalize(data.status || order.status);
    if (/credito|debito|cartao/.test(fallbackMethod) && !/pago|recebido|concluido/.test(orderStatus)) {
      methodsFound.push(String(data.paymentMethod || data.payment_method || 'Cartão').trim());
      pendingAmount = Number(data.total || order.total || 0);
    }
  }

  const uniqueMethods = [...new Set(methodsFound)];
  return {
    hasPending: uniqueMethods.length > 0,
    methods: uniqueMethods,
    pendingAmount
  };
};

const checkHoleSawRequirement = (order: any, rawNotes: string): { needed: boolean; detail?: string } => {
  const normalizedNotes = normalize(rawNotes);
  if (/serra[ -]?copo|cerra[ -]?copo/.test(normalizedNotes)) {
    return { needed: true, detail: 'solicitado nas observações' };
  }

  const items = collectOrderItems(order);

  for (const item of items) {
    const desc = normalize([
      item.description,
      item.name,
      item.handlingType,
      item.observation,
      item.notes
    ].filter(Boolean).join(' '));

    if (/serra[ -]?copo|cerra[ -]?copo/.test(desc)) {
      return { needed: true, detail: String(item.description || item.name || 'item do pedido') };
    }
    if (/passa[ -]?fio|passa fio|recorte/.test(desc)) {
      return { needed: true, detail: `recorte/passa-fio (${item.description || item.name || 'item'})` };
    }
  }

  return { needed: false };
};

export const buildDeliveryChecklist = (order: any): DeliveryChecklistItem[] => {
  const rawNotes = collectRawNotes(order);
  const normalizedNotes = normalize(rawNotes);
  const itemsList = collectOrderItems(order);

  const checklist: DeliveryChecklistItem[] = [];

  // 1. Checkbox individual para cada item/volume que precisa ser carregado
  if (itemsList.length > 0) {
    itemsList.forEach((it, idx) => {
      const qty = Number(it.quantity || it.qty || 1);
      const name = String(it.description || it.name || it.title || `Item ${idx + 1}`).trim();
      const qtyText = qty > 1 ? `${qty}x ` : '';
      const volText = it.volumes ? ` (${it.volumes} vol)` : '';
      
      checklist.push({
        id: `item_${it.id || idx}_${name.slice(0, 12)}`,
        label: `Carregado: ${qtyText}${name}${volText}`
      });
    });
  } else {
    checklist.push({
      id: 'loaded',
      label: 'Conferir e carregar os itens do pedido'
    });
  }

  // 2. Maquininha de Cartão se houver débito/crédito pendente
  const cardInfo = getPendingCardInfo(order);
  if (cardInfo.hasPending) {
    const amountText = cardInfo.pendingAmount > 0
      ? ` (R$ ${cardInfo.pendingAmount.toLocaleString('pt-BR', { minimumFractionDigits: 2 })})`
      : '';
    checklist.push({
      id: 'card_machine',
      label: `Levar maquininha de cartão — pendente: ${cardInfo.methods.join(' / ')}${amountText}`
    });
  }

  // 3. Ligar / Avisar antes de ir com mensuração de tempo
  const hasCallRequest = /ligar antes|avisar antes|chamar antes|whatsapp antes|msg antes|mensagem antes/.test(normalizedNotes);
  if (hasCallRequest) {
    const advanceTime = extractCallAdvanceTime(rawNotes);
    const label = advanceTime
      ? `Ligar / Avisar o cliente com ${advanceTime} de antecedência`
      : 'Ligar / Avisar o cliente antes de ir (solicitado nas observações)';
    checklist.push({ id: 'call_customer', label });
  }

  // 4. Serra-copo se mencionado nos itens ou observações
  const holeSaw = checkHoleSawRequirement(order, rawNotes);
  if (holeSaw.needed) {
    checklist.push({
      id: 'hole_saw',
      label: holeSaw.detail
        ? `Levar serra-copo — ${holeSaw.detail}`
        : 'Levar serra-copo para recortes / montagem'
    });
  }

  return checklist;
};
