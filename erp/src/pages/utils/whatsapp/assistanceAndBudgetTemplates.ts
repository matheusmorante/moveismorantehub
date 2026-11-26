import Order from '../../types/order.type';
import { getSettings } from '@/pages/utils/settingsService';
import {
  formatCurrency,
  formatDate,
  stringifyFullAddressWithObservation,
} from '../shared/formatters';
import { formatOrderCode } from '../orderCode';
import type { OperationScheduleOption } from './orderOperationsMessageBlocks';

type ItemWithOptionalObservation = {
  description?: string;
  quantity?: number;
  observation?: string | null;
};

const getItemObservationSuffix = (item: ItemWithOptionalObservation): string =>
  item.observation?.trim() ? ` - ${item.observation.trim()}` : '';

const formatGroupInviteMessage = (fullName?: string | null): string => {
  const settings = getSettings();
  const defaults = {
    groupInviteMessage:
      'Se quiser ficar por dentro de novas ofertas e promoções, clique nesse grupo, estarei sempre enviando por lá: {{groupLink}}',
    groupInviteLink: 'https://chat.whatsapp.com/FtqlGwW7pdI9Jzgl8VRia6?mode=gi_t',
  };

  const message = settings.whatsappTemplates?.groupInviteMessage || defaults.groupInviteMessage;
  const link = settings.whatsappTemplates?.groupInviteLink || defaults.groupInviteLink;

  return message
    .replace(/{{customerName}}/g, fullName?.split(' ')[0] || 'Cliente')
    .replace(/{{groupLink}}/g, link);
};

export const buildAssistanceMessage = (order: Order) => {
  const customer = order.customerData;
  const sched = order.shipping?.scheduling;
  const formattedDate =
    sched?.dateType === 'range' && sched?.endDate
      ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
      : sched?.date
        ? formatDate(sched.date)
        : 'A confirmar';

  let scheduledTime = '';
  if (sched) {
    if (sched.notInformed) {
      scheduledTime = 'A combinar';
    } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
      scheduledTime = `das ${sched.startTime} às ${sched.endTime}`;
    } else if (sched.startTime) {
      scheduledTime = `às ${sched.startTime}`;
    } else if (sched.time) {
      scheduledTime = `às ${sched.time}`;
    }
  }

  const itemsToUse =
    order.assistanceItems && order.assistanceItems.length > 0 ? order.assistanceItems : order.items;
  const products =
    itemsToUse && itemsToUse.length > 0
      ? itemsToUse.map((item) => `• ${item.description || 'Produto'}`).join('\n')
      : '• Produto';

  const firstName = customer.fullName?.split(' ')[0] || 'Cliente';

  return [
    '🛠️ *AGENDAMENTO DE ASSISTÊNCIA TÉCNICA*',
    '',
    `Olá, ${firstName}! Sua assistência está agendada para estes itens:`,
    products,
    '',
    `📅 *Data:* ${formattedDate}`,
    `🕒 *Horário:* ${scheduledTime || 'A combinar'}`,
    '',
    'Se precisar de ajuda, estamos à disposição.',
  ].join('\n');
};

export const buildAssistanceOrderDetailsMessage = (order: Order) => {
  const customer = order.customerData;
  const sched = order.shipping?.scheduling;
  const firstName = customer.fullName?.split(' ')[0] || 'Cliente';
  const date =
    sched?.dateType === 'range' && sched?.endDate
      ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
      : sched?.date
        ? formatDate(sched.date)
        : 'A confirmar';

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

  let message = `🛠️ *ASSISTÊNCIA TÉCNICA — MÓVEIS MORANTE*\n\n`;
  message += `Olá, ${firstName}! Seguem os dados do seu atendimento:\n\n`;
  const address = order.shipping?.noAddress
    ? order.shipping?.deliveryMethod === 'pickup'
      ? 'Retirada em loja'
      : 'Não informado'
    : stringifyFullAddressWithObservation(customer.fullAddress);
  message += `🏠 *Endereço:* ${address || 'Não informado'}\n\n`;

  message += `📅 *Agendamento*\n`;
  message += `• *Data:* ${date}\n`;
  message += `• *Horário:* ${time || 'A combinar'}\n\n`;

  message += `📦 *Itens da assistência*\n`;
  const itemsToUse: ItemWithOptionalObservation[] =
    order.assistanceItems && order.assistanceItems.length > 0 ? order.assistanceItems : order.items;
  if (itemsToUse && itemsToUse.length > 0) {
    itemsToUse.forEach((item) => {
      message += `• ${item.quantity}x ${item.description || 'Produto'}${getItemObservationSuffix(item)}\n`;
    });
  } else {
    message += `• Nenhum item especificado\n`;
  }

  if (order.observation?.trim()) {
    message += `\n📝 *Observações:*\n${order.observation.trim()}\n`;
  }

  message += `\nSe precisar de ajuda, estamos à disposição.\n`;
  message += `*Atendente:* ${order.seller || 'Não informado'}`;

  return message;
};

export const buildGroupInviteMessage = (order: Order) =>
  formatGroupInviteMessage(order.customerData?.fullName);

export const buildPersonGroupInviteMessage = (person: { fullName?: string | null }) =>
  formatGroupInviteMessage(person.fullName);

export const buildAssistanceServiceOrderMessage = (order: Order) => {
  const customer = order.customerData;
  const sched = order.shipping?.scheduling;
  const date =
    sched?.dateType === 'range' && sched?.endDate
      ? `de ${formatDate(sched.date)} até ${formatDate(sched.endDate)}`
      : sched?.date
        ? formatDate(sched.date)
        : 'A confirmar';

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

  let message = `🛠️ *ORDEM DE SERVIÇO — ASSISTÊNCIA TÉCNICA*\n\n`;
  message += `📋 *Dados do atendimento*\n`;
  message += `👤 *Cliente:* ${customer.fullName || 'Não informado'}\n`;
  message += `📞 *Fone:* ${customer.phone || 'Não informado'}\n`;
  const address = order.shipping?.noAddress
    ? order.shipping?.deliveryMethod === 'pickup'
      ? 'Retirada em loja'
      : 'Não informado'
    : stringifyFullAddressWithObservation(customer.fullAddress);
  message += `🏠 *Endereço:* ${address || 'Não informado'}\n\n`;

  message += `🗓️ *Agendamento*\n`;
  message += `• *Data:* ${date}\n`;
  message += `• *Horário:* ${time || 'A combinar'}\n`;
  if (Array.isArray(order.shipping?.scheduling?.alternatives) && order.shipping.scheduling.alternatives.length > 0) {
    const altText = (order.shipping.scheduling.alternatives as OperationScheduleOption[])
      .filter((a) => Boolean(a?.date))
      .map((a) => {
        const alternativeDate =
          a.dateType === 'range' && a.endDate
            ? `de ${formatDate(a.date!)} até ${formatDate(a.endDate)}`
            : formatDate(a.date!);
        const alternativeTime =
          a.type === 'range' && a.startTime && a.endTime
            ? `${a.startTime} às ${a.endTime}`
            : a.startTime || a.time;
        return `${alternativeDate}${alternativeTime ? ` (${alternativeTime})` : ''}`;
      })
      .join(' • ');
    if (altText) {
      message += `• *Datas alternativas:* ${altText}\n`;
    }
  }
  message += `\n`;

  message += `📦 *Itens do chamado*\n`;
  const hasAssistanceItems = order.assistanceItems && order.assistanceItems.length > 0;
  const hasItems = order.items && order.items.length > 0;

  if (hasAssistanceItems) {
    (order.assistanceItems as ItemWithOptionalObservation[]).forEach((item) => {
      message += `• ${item.quantity}x ${item.description}${getItemObservationSuffix(item)}\n`;
    });
  } else if (hasItems) {
    (order.items as ItemWithOptionalObservation[]).forEach((item) => {
      message += `• ${item.quantity}x ${item.description}${getItemObservationSuffix(item)}\n`;
    });
  } else {
    message += `• Nenhum item especificado\n`;
  }

  if (order.assistanceDescription) {
    message += `\n📝 *Problema relatado*\n${order.assistanceDescription}\n`;
  }

  if (order.observation?.trim()) {
    message += `\n💡 *Observações internas*\n${order.observation.trim()}\n`;
  }

  message += `\n👤 *Atendente responsável:* ${order.seller || 'Não informado'}`;

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

      const obs = getItemObservationSuffix(item as ItemWithOptionalObservation);
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
