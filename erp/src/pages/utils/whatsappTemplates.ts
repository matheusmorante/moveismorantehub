import Order from '../types/order.type';
import { getSettings } from '@/pages/utils/settingsService';
import {
  stringifyFullAddressWithObservation,
  stringifyPayments,
  stringifyItemsWithValues,
  formatDate,
  formatCurrency,
  toTitleCase,
} from './formatters';
import { formatOrderCode } from './orderCode';
import {
  getEffectiveOrderDeliveryAddress,
  getEffectiveOrderDeliveryMapUrl,
} from './orderDeliveryAddress';
import { splitNoticeTags } from './noticeTags';
import {
  DELIVERY_NOTICE_OPTIONS,
  normalizeNotice,
} from '@/pages/App/SalesOrder/components/steps/logisticsNoticeRules';

export const stringifyAdditionalContacts = (contacts?: { name: string; phone: string }[]) => {
  if (!contacts || contacts.length === 0) return '';
  return contacts.map((c) => `• ${c.name}: ${c.phone}`).join('\n');
};

const removeOptionalRouteUrlSection = (template: string) => {
  const lines = template.split(/\r?\n/);
  const visibleLines: string[] = [];

  for (const line of lines) {
    if (!line.includes('{{routeUrl}}')) {
      visibleLines.push(line);
      continue;
    }

    if (line.trim() === '{{routeUrl}}') {
      let headingIndex = visibleLines.length - 1;
      while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
      const heading = visibleLines[headingIndex] || '';
      if (/(?:rota|route|google\s*maps|maps?|mapa|localiza|url)/i.test(heading)) {
        visibleLines.splice(headingIndex);
      }
    }
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n');
};

const removeLegacyOperationSections = (template: string) => {
  const lines = template.split(/\r?\n/);
  const visibleLines: string[] = [];

  for (const line of lines) {
    const hasSchedulePlaceholder = /{{deliveryDate}}|{{deliveryTime}}/.test(line);
    const hasAddressPlaceholder = line.includes('{{address}}');
    if (!hasSchedulePlaceholder && !hasAddressPlaceholder) {
      visibleLines.push(line);
      continue;
    }

    let headingIndex = visibleLines.length - 1;
    while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
    const heading = visibleLines[headingIndex] || '';
    const isScheduleHeading = hasSchedulePlaceholder &&
      /(agendamento|programação|horário|data|período|agendad[oa]|entrega|retirada)/i.test(heading);
    const isAddressHeading = hasAddressPlaceholder && /(endereço|local|destino)/i.test(heading);
    if (isScheduleHeading || isAddressHeading) visibleLines.splice(headingIndex, 1);
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
};

const removeLegacyLogisticsHeadings = (template: string) =>
  template
    .split(/\r?\n/)
    .filter(
      (line) =>
        !/^\s*(?:📦\s*)?\*{0,2}(?:operações(?: do pedido)?|logística)\*{0,2}:?\*{0,2}\s*$/i.test(line)
    )
    .join('\n')
    .replace(/\n{3,}/g, '\n\n');

const removeLegacyGlobalItemsSection = (template: string) => {
  const lines = template.split(/\r?\n/);
  const visibleLines: string[] = [];

  for (const line of lines) {
    if (!line.includes('{{items}}')) {
      visibleLines.push(line);
      continue;
    }

    let headingIndex = visibleLines.length - 1;
    while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
    if (headingIndex >= 0 && /itens/i.test(visibleLines[headingIndex])) {
      visibleLines.splice(headingIndex, 1);
    }
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n');
};

const moveLegacyNoticesIntoOperations = (template: string) => {
  const lines = template.split(/\r?\n/);
  const hasOperationsPlaceholder = lines.some((line) => line.includes('{{operations}}'));
  const visibleLines: string[] = [];
  let insertedOperationsPlaceholder = hasOperationsPlaceholder;

  for (const line of lines) {
    if (!line.includes('{{observation}}')) {
      visibleLines.push(line);
      continue;
    }

    let headingIndex = visibleLines.length - 1;
    while (headingIndex >= 0 && !visibleLines[headingIndex].trim()) headingIndex -= 1;
    if (
      headingIndex >= 0 &&
      /avisos? importantes?|importante|𝐈𝐌𝐏𝐎𝐑𝐓𝐀𝐍𝐓𝐄/i.test(visibleLines[headingIndex])
    ) {
      visibleLines.splice(headingIndex, 1);
    }
    if (!insertedOperationsPlaceholder) {
      visibleLines.push('{{operations}}');
      insertedOperationsPlaceholder = true;
    }
  }

  return visibleLines.join('\n').replace(/\n{3,}/g, '\n\n');
};

type OperationScheduleOption = {
  date?: string;
  endDate?: string;
  dateType?: 'fixed' | 'range';
  time?: string;
  startTime?: string;
  endTime?: string;
  type?: 'fixed' | 'range';
};

type OperationSchedule = OperationScheduleOption & {
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

const buildCustomerOrderStagesBlock = (order: Order) => {
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
    const icon = method === 'pickup' ? '🏬' : '🚚';
    const ordinal = operationCount > 1 ? ` ${operationPosition}` : '';
    const schedule =
      operation.scheduling.immediatePickup && method === 'pickup'
        ? 'Retirada imediata'
        : operation.scheduling.pendingScheduling
          ? 'Agendamento pendente'
          : operation.scheduling.notInformed
            ? 'Agendamento não informado'
            : formatOperationScheduleOption(operation.scheduling);
    const lines = [`${icon} *${methodLabel}${ordinal}:*`, `🗓️ *Agendamento:* ${schedule}`];

    if (method === 'delivery') {
      const address = operation.useCustomerAddress
        ? order.customerData?.fullAddress
        : operation.deliveryAddress;
      const addressText = !shipping?.noAddress
        ? stringifyFullAddressWithObservation(address)
        : '';
      lines.push(`🏠 *Endereço:* ${addressText || 'Endereço não informado'}`);
    }

    return lines.join('\n');
  });

  const operationsText = operationBlocks.join('\n\n');
  return operations.length > 1
    ? `📋 *Etapas do pedido:*\n${operationsText}`
    : operationsText;
};

const prepareCustomerOrderTemplate = (template: string) => {
  const normalizedLines = removeLegacyOperationSections(template)
    .split(/\r?\n/)
    .map((line) => {
      if (/^\s*(?:📋\s*)?\*{0,2}etapas do pedido:?\*{0,2}\s*$/i.test(line)) return '';
      if (/^\s*\*{0,2}vendedor:?\*{0,2}\s*$/i.test(line)) return '👤 *Vendedor:*';
      if (/^\s*(?:🛒\s*)?\*{0,2}itens:?\*{0,2}\s*$/i.test(line)) return '🛒 *Itens:*';
      const totalValueLine = line.match(
        /^(\s*)(?:💰\s*)?\*{0,2}valor total(?: da compra| do pedido)?:?\*{0,2}(.*)$/i
      );
      if (totalValueLine) return `${totalValueLine[1]}💰 *Valor total da compra:*${totalValueLine[2]}`;
      if (/^\s*(?:💳\s*)?\*{0,2}pagamento:?\*{0,2}\s*$/i.test(line)) return '💳 *Pagamento:*';
      return line;
    });

  if (!normalizedLines.some((line) => line.includes('{{operations}}'))) {
    const itemsPlaceholderIndex = normalizedLines.findIndex((line) => line.includes('{{items}}'));
    if (itemsPlaceholderIndex >= 0) {
      let insertIndex = itemsPlaceholderIndex;
      while (insertIndex > 0 && !normalizedLines[insertIndex - 1].trim()) insertIndex -= 1;
      if (insertIndex > 0 && /\*Itens:?\*/i.test(normalizedLines[insertIndex - 1])) insertIndex -= 1;
      normalizedLines.splice(insertIndex, 0, '{{operations}}');
    } else {
      normalizedLines.push('{{operations}}');
    }
  }

  return normalizedLines.join('\n').replace(/\n{3,}/g, '\n\n').trim();
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

const buildDeliveryOperationsBlock = (order: Order) => {
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

  const sections: string[] = [];

  sections.push(...operationAddresses.map((operation) => {
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
  }));

  return `*Logística:*\n\n${sections.join('\n\n')}`;
};

export const buildDeliveryMessage = (order: Order) => {
  const settings = getSettings();
  const appointments = order.shipping?.scheduling?.appointments || [];
  const operationBlock = buildDeliveryOperationsBlock(order);
  const sched = order.shipping?.scheduling;
  const date =
    sched?.dateType === 'range' && sched?.endDate
      ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
      : formatDate(order.shipping.scheduling.date);

  let time = 'Não informado';
  if (sched) {
    if (sched.notInformed) time = 'Não informado';
    else if (sched.type === 'range' && sched.startTime && sched.endTime)
      time = `${sched.startTime} às ${sched.endTime}`;
    else if (sched.startTime) time = sched.startTime;
    else if (sched.time) time = sched.time;
  }
  const customer = order.customerData;
  const customerNameFormatted = toTitleCase(customer?.fullName || 'Cliente');
  const deliveryAddress = getEffectiveOrderDeliveryAddress(order);
  const deliveryAddressText = order.shipping?.noAddress
    ? ''
    : stringifyFullAddressWithObservation(deliveryAddress);

  let message = settings.whatsappTemplates?.deliveryInfo || '';

  if (!message) {
    message =
      order.shipping?.deliveryMethod === 'pickup'
        ? `*Nova venda para retirada de ${customerNameFormatted}* 📦`
        : `*Nova venda para ${customerNameFormatted}* 📦`;
  }

  message = message
    .replace(/^\s*(?:🗓️\s*)?\*{0,2}Programação por operação\*{0,2}:?\*{0,2}\s*$/gim, '')
    .replace(/\n{3,}/g, '\n\n');

  const templateWithOperationNotices = moveLegacyNoticesIntoOperations(message);
  const templateWithoutLegacySections = removeLegacyOperationSections(templateWithOperationNotices);
  const normalizedTemplate = removeLegacyLogisticsHeadings(
    removeLegacyGlobalItemsSection(templateWithoutLegacySections)
  ).replace(/novo pedido/gi, 'Nova venda');
  message = normalizedTemplate.includes('{{operations}}')
    ? normalizedTemplate.replace(/{{operations}}/g, () => operationBlock)
    : `${normalizedTemplate}\n\n${operationBlock}`;

  const routeUrl = getEffectiveOrderDeliveryMapUrl(order);
  if (!routeUrl) message = removeOptionalRouteUrlSection(message);

  let finalMessage = message
    .replace(/{{customerName}}/g, () => customerNameFormatted)
    .replace(/{{deliveryDate}}/g, () => date)
    .replace(/{{deliveryTime}}/g, () => time)
    .replace(/{{phone}}/g, () => customer.phone || 'Não informado')
    .replace(/{{additionalContacts}}/g, () =>
      stringifyAdditionalContacts(customer.additionalContacts)
    )
    .replace(/{{customerObservations}}/g, () => customer.observations || '')
    .replace(/{{address}}/g, () => {
      if (order.shipping?.noAddress)
        return order.shipping?.deliveryMethod === 'pickup' ? 'Retirada em loja' : 'Não informado';
      return deliveryAddressText || 'Endereço não informado';
    })
    .replace(/{{items}}/g, '')
    .replace(/{{payments}}/g, () => stringifyPayments(order.payments || []))
    .replace(/{{totalValue}}/g, () => formatCurrency(order.paymentsSummary?.totalOrderValue || 0))
    .replace(/{{observation}}/g, '')
    .replace(/{{seller}}/g, () => order.seller || 'Não informado')
    .replace(/{{routeUrl}}/g, () => routeUrl);

  if (order.shipping?.deliveryMethod === 'pickup' && appointments.length === 0) {
    finalMessage = finalMessage
      .replace(/Entrega/g, 'Retirada')
      .replace(/entrega/g, 'retirada')
      .replace(/ENTREGA/g, 'RETIRADA');
  }

  finalMessage = finalMessage.replace(/R\$\s*R\$/g, 'R$');

  return finalMessage;
};

const repairCustomerMessageEmojis = (message: string) => {
  const emojiForLabel = (label: string) => {
    const normalized = label.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
    if (normalized.startsWith('etapas')) return '📋';
    if (normalized.startsWith('valor total')) return '💰';

    const emojiByLabel: Record<string, string> = {
      entrega: '🚚',
      retirada: '🏬',
      agendamento: '🗓️',
      agendamentos: '🗓️',
      programacao: '🗓️',
      endereco: '🏠',
      itens: '🛒',
      pagamento: '💳',
      contato: '📞',
      vendedor: '👤',
      frete: '🚚',
      distancia: '📍',
      'avisos importantes': '⚠️',
    };
    return emojiByLabel[normalized] || '';
  };

  const withRestoredGreetingEmoji = message.replace(
    /^(\s*\*Olá\b[^\r\n]*?\*)[ \t]*(?:\uFFFD[ \t]*)+/i,
    '$1 📦'
  );
  const withRestoredLabelEmojis = withRestoredGreetingEmoji.replace(
    /(?:\uFFFD[ \t]*)+(?=\*{0,2}[ \t]*(Etapas do pedido|Entrega|Retirada|Agendamento|Agendamentos|Programação|Endereço|Itens(?: desta operação)?|Valor total(?: da compra| do pedido)?|Pagamento|Contato|Vendedor|Frete|Distância|Avisos importantes)[ \t]*:)/giu,
    (_replacement, label: string) => {
      const emoji = emojiForLabel(label);
      return emoji ? `${emoji} ` : '';
    }
  );

  // Replacement characters that were standalone emoji glyphs in legacy templates
  // should not leak into the WhatsApp message when their original glyph is unknown.
  return withRestoredLabelEmojis
    .replace(/(^|[ \t])(?:\uFFFD[ \t]*)+(?=$|\n)/gm, '$1')
    .replace(/[ \t]+\n/g, '\n');
};

export const buildCustomerOrderMessage = (order: Order) => {
  const settings = getSettings();
  const customer = order.customerData;
  const defaultTemplate =
    '*Olá {{customerName}}, seu pedido foi confirmado!* 📦\n\n👤 *Vendedor:* {{seller}}\n\n{{operations}}\n\n🛒 *Itens:*\n{{items}}\n\n💰 *Valor total da compra:* {{totalValue}}\n\n💳 *Pagamento:*\n{{payments}}';
  const template = settings.whatsappTemplates?.orderConfirmation || defaultTemplate;
  const message = prepareCustomerOrderTemplate(template);
  const operationsBlock = buildCustomerOrderStagesBlock(order);

  let itemsBlock = stringifyItemsWithValues(order.items || []);
  if (order.shipping?.value && order.shipping.value > 0) {
    itemsBlock += `\n*Frete:* ${formatCurrency(order.shipping.value)}`;
  }

  let finalMessage = message
    .replace(/{{customerName}}/g, () => customer.fullName || 'Cliente')
    .replace(/{{operations}}/g, () => operationsBlock)
    .replace(/{{deliveryDate}}|{{deliveryTime}}|{{address}}/g, '')
    .replace(/{{items}}/g, () => itemsBlock)
    .replace(/{{totalValue}}/g, () => formatCurrency(order.paymentsSummary?.totalOrderValue || 0))
    .replace(/{{seller}}/g, () => order.seller || 'Não informado')
    .replace(/{{payments}}/g, () => stringifyPayments(order.payments || []));

  return repairCustomerMessageEmojis(
    finalMessage
      .replace(/R\$\s*R\$/g, 'R$')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  );
};

export const buildAssistanceMessage = (order: Order) => {
  const customer = order.customerData;

  // Format date
  const sched = order.shipping?.scheduling;
  const formattedDate =
    sched?.dateType === 'range' && sched?.endDate
      ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
      : sched?.date
        ? formatDate(sched.date)
        : 'data a confirmar';

  // Format time/period
  let scheduledTime = '';
  if (sched) {
    if (sched.notInformed) {
      scheduledTime = '(horário a combinar)';
    } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
      scheduledTime = `das ${sched.startTime} às ${sched.endTime}`;
    } else if (sched.startTime) {
      scheduledTime = `às ${sched.startTime}`;
    } else if (sched.time) {
      scheduledTime = `às ${sched.time}`;
    }
  }

  // Capture products
  const itemsToUse =
    order.assistanceItems && order.assistanceItems.length > 0 ? order.assistanceItems : order.items;
  const produtos =
    itemsToUse && itemsToUse.length > 0
      ? itemsToUse.map((i) => i.description || 'Produto').join(', ')
      : 'produto';

  const firstName = customer.fullName?.split(' ')[0] || 'Cliente';

  return (
    `Olá ${firstName}, a assistência do(s) ${produtos} foi agendada para dia ${formattedDate} ${scheduledTime}`.trim() +
    '.'
  );
};

export const buildAssistanceOrderDetailsMessage = (order: Order) => {
  const customer = order.customerData;

  // date
  const sched = order.shipping?.scheduling;
  const date =
    sched?.dateType === 'range' && sched?.endDate
      ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
      : sched?.date
        ? formatDate(sched.date)
        : 'A confirmar';

  // time
  let time = '';
  if (sched) {
    if (sched.notInformed) {
      time = 'Não informado';
    } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
      time = `${sched.startTime} às ${sched.endTime}`;
    } else if (sched.startTime) {
      time = sched.startTime;
    } else if (sched.time) {
      time = sched.time;
    }
  }

  let message = `*PEDIDO DE ASSISTÊNCIA TÉCNICA*\n\n`;
  message += `*Cliente:* ${customer.fullName || 'Não informado'}\n`;
  const address = order.shipping?.noAddress
    ? order.shipping?.deliveryMethod === 'pickup'
      ? 'Retirada em loja'
      : 'Não informado'
    : stringifyFullAddressWithObservation(customer.fullAddress);
  message += `*Endereço:* ${address}\n\n`;

  message += `*Data Agendada:* ${date}\n`;
  message += `*Horário:* ${time || 'Não informado'}\n\n`;

  message += `*Itens da Assistência:*\n`;
  const itemsToUse =
    order.assistanceItems && order.assistanceItems.length > 0 ? order.assistanceItems : order.items;
  if (itemsToUse && itemsToUse.length > 0) {
    itemsToUse.forEach((item) => {
      const obs = (item as any).observation?.trim() ? ` - ${(item as any).observation.trim()}` : '';
      message += `• ${item.quantity}x ${item.description}${obs}\n`;
    });
  } else {
    message += `• Nenhum item especificado\n`;
  }

  if (order.observation) {
    message += `\n*Observações:*\n${order.observation}\n`;
  }

  message += `\n*Vendedor:* ${order.seller || 'Não informado'}`;

  return message;
};

export const buildGroupInviteMessage = (order: Order) => {
  const customer = order.customerData;
  const settings = getSettings();
  const defaults = {
    groupInviteMessage:
      'Se quiser ficar por dentro de novas ofertas e promoções, clique nesse grupo, estarei sempre enviando por lá: {{groupLink}}',
    groupInviteLink: 'https://chat.whatsapp.com/FtqlGwW7pdI9Jzgl8VRia6?mode=gi_t',
  };

  const message =
    (settings.whatsappTemplates as any)?.groupInviteMessage || defaults.groupInviteMessage;
  const link = (settings.whatsappTemplates as any)?.groupInviteLink || defaults.groupInviteLink;

  return message
    .replace(/{{customerName}}/g, customer.fullName?.split(' ')[0] || 'Cliente')
    .replace(/{{groupLink}}/g, link);
};

export const buildPersonGroupInviteMessage = (person: any) => {
  const settings = getSettings();
  const defaults = {
    groupInviteMessage:
      'Se quiser ficar por dentro de novas ofertas e promoções, clique nesse grupo, estarei sempre enviando por lá: {{groupLink}}',
    groupInviteLink: 'https://chat.whatsapp.com/FtqlGwW7pdI9Jzgl8VRia6?mode=gi_t',
  };

  const message =
    (settings.whatsappTemplates as any)?.groupInviteMessage || defaults.groupInviteMessage;
  const link = (settings.whatsappTemplates as any)?.groupInviteLink || defaults.groupInviteLink;

  return message
    .replace(/{{customerName}}/g, person.fullName?.split(' ')[0] || 'Cliente')
    .replace(/{{groupLink}}/g, link);
};

export const buildAssistanceServiceOrderMessage = (order: Order) => {
  const customer = order.customerData;

  // date
  const sched = order.shipping?.scheduling;
  const date =
    sched?.dateType === 'range' && sched?.endDate
      ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
      : sched?.date
        ? formatDate(sched.date)
        : 'A confirmar';

  // time
  let time = '';
  if (sched) {
    if (sched.notInformed) {
      time = 'A combinar';
    } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
      time = `${sched.startTime} às ${sched.endTime}`;
    } else if (sched.startTime) {
      time = sched.startTime;
    } else if (sched.time) {
      time = sched.time;
    }
  }

  let message = `🛠️ *ORDEM DE SERVIÇO - ASSISTÊNCIA*\n____________________\n\n`;
  message += `👤 *Cliente:* ${customer.fullName || 'Não informado'}\n`;
  message += `📞 *Fone:* ${customer.phone || 'Não informado'}\n`;
  const address = order.shipping?.noAddress
    ? order.shipping?.deliveryMethod === 'pickup'
      ? 'Retirada em loja'
      : 'Não informado'
    : stringifyFullAddressWithObservation(customer.fullAddress);
  message += `🏠 *Endereço:* ${address}\n\n`;

  message += `🗓️ *Agendamento:* ${date}\n`;
  message += `🕒 *Janela:* ${time || 'A combinar'}\n`;
  if (Array.isArray(order.shipping?.scheduling?.alternatives) && order.shipping.scheduling.alternatives.length > 0) {
    const altText = order.shipping.scheduling.alternatives
      .filter((a: any) => a?.date)
      .map((a: any) => `${a.date}${a.startTime || a.time ? ` (${a.startTime || a.time})` : ''}`)
      .join(' • ');
    if (altText) {
      message += `🗓️ *Datas Alternativas:* ${altText}\n`;
    }
  }
  message += `\n`;

  message += `📦 *Itens do Chamado:*\n`;
  const hasAssistanceItems = order.assistanceItems && order.assistanceItems.length > 0;
  const hasItems = order.items && order.items.length > 0;

  if (hasAssistanceItems) {
    order.assistanceItems!.forEach((item) => {
      const obs = (item as any).observation?.trim() ? ` - ${(item as any).observation.trim()}` : '';
      message += `• ${item.quantity}x ${item.description}${obs}\n`;
    });
  } else if (hasItems) {
    order.items.forEach((item) => {
      const obs = (item as any).observation?.trim() ? ` - ${(item as any).observation.trim()}` : '';
      message += `• ${item.quantity}x ${item.description}${obs}\n`;
    });
  } else {
    message += `• Nenhum item especificado\n`;
  }

  if (order.assistanceDescription) {
    message += `\n📝 *Defeito Relatado:*\n${order.assistanceDescription}\n`;
  }

  if (order.observation) {
    message += `\n💡 *Obs Interna:*\n${order.observation}\n`;
  }

  message += `\n👤 *Vendedor:* ${order.seller || 'Não informado'}`;

  return message;
};

export const buildBudgetWhatsappMessage = (order: Order) => {
  const customer = order.customerData;
  const firstName = customer.fullName?.split(' ')[0] || 'Cliente';

  let message = `*ORÇAMENTO - MÓVEIS MORANTE*\n\n`;
  message += `Olá ${firstName}, segue o orçamento solicitado:\n\n`;

  const addrStr = stringifyFullAddressWithObservation(customer.fullAddress);
  if (addrStr) {
    message += `*Endereço:* ${addrStr}\n\n`;
  }

  message += `*Itens:*\n`;
  if (order.items && order.items.length > 0) {
    order.items.forEach((item) => {
      const unitPrice = item.unitPrice || 0;
      const qty = item.quantity || 1;
      const unitDisc = item.unitDiscount || 0;

      const subtotal = unitPrice * qty;
      const unitDiscount = item.discountType === 'fixed' ? unitDisc : (unitPrice * unitDisc) / 100;
      const totalDiscount = unitDiscount * qty;
      const finalValue = subtotal - totalDiscount;

      const obs = (item as any).observation?.trim() ? ` - ${(item as any).observation.trim()}` : '';
      let itemLine = `• *${qty}x ${item.description}${obs}* | Subtotal: ${formatCurrency(subtotal)}`;
      if (totalDiscount > 0) {
        itemLine += ` | Desconto: -${formatCurrency(totalDiscount)}`;
      }
      itemLine += ` | Valor Final: ${formatCurrency(finalValue)}\n`;

      message += itemLine;
    });
  }

  message += `\n*Valor Total:* ${formatCurrency(order.paymentsSummary.totalOrderValue || 0)}\n\n`;

  if (order.observation) {
    message += `*Observações:*\n${order.observation}\n\n`;
  }

  message += `Fico à disposição para qualquer dúvida!\n`;
  message += `*Atendente:* ${order.seller || 'Morante'}`;

  return message;
};

export const buildReturnServiceOrderMessage = (
  order: Order,
  audience: 'customer' | 'team'
) => {
  const customer = order.customerData;
  const isCollection =
    order.returnMethod === 'store_collection' ||
    (order.returnMethod == null && order.status === 'scheduled');
  const scheduling = order.shipping?.scheduling;
  const date = scheduling?.date ? formatDate(scheduling.date) : 'A definir';
  const time =
    scheduling?.type === 'range' && scheduling.endTime
      ? `${scheduling.startTime || ''} às ${scheduling.endTime}`.trim()
      : scheduling?.startTime || scheduling?.time || 'A definir';
  const items = (order.items || []).map((item) => `• ${item.quantity}x ${item.description}`);

  let message = `*PEDIDO DE DEVOLUÇÃO - MÓVEIS MORANTE*\n\n`;
  message += `*Pedido de devolução:* #${formatOrderCode(order)}\n`;
  message += `*Pedido de venda:* #${order.linkedOrderCode || 'não informado'}\n`;
  message += `*Cliente:* ${customer?.fullName || 'Não informado'}\n`;
  message += `*Situação:* ${isCollection ? 'Coleta agendada' : 'Devolvido'}\n`;

  if (isCollection) {
    message += `*Data da coleta:* ${date}\n*Horário:* ${time}\n`;
  }

  message += `\n*Itens da devolução:*\n${items.length ? items.join('\n') : '• Nenhum item informado'}\n`;

  if (audience === 'team') {
    const address = stringifyFullAddressWithObservation(
      order.shipping?.deliveryAddress || customer?.fullAddress
    );
    message += `\n*Telefone do cliente:* ${customer?.phone || 'Não informado'}\n`;
    if (address) message += `*Endereço:* ${address}\n`;
    if (order.collectionObservation?.trim()) {
      message += `*Observações da coleta:* ${order.collectionObservation.trim()}\n`;
    }
    if (order.seller) message += `*Vendedor:* ${order.seller}\n`;
  } else {
    message += '\nEsta mensagem contém os dados do seu pedido de devolução.';
  }

  return message;
};
