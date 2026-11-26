import Order from '../../types/order.type';
import { getSettings } from '@/pages/utils/settingsService';
import {
  stringifyFullAddressWithObservation,
  stringifyPayments,
  stringifyItemsWithValues,
  formatDate,
  formatCurrency,
  toTitleCase,
} from '../shared/formatters';
import {
  getEffectiveOrderDeliveryAddress,
  getEffectiveOrderDeliveryMapUrl,
} from '../orderDeliveryAddress';
import {
  cleanOrderConfirmationText,
  DEFAULT_ORDER_CONFIRMATION_TEMPLATE,
} from './orderConfirmationText';
import {
  moveLegacyNoticesIntoOperations,
  prepareCustomerOrderTemplate,
  removeLegacyGlobalItemsSection,
  removeLegacyLogisticsHeadings,
  removeLegacyOperationSections,
  removeOptionalRouteUrlSection,
} from './legacyTemplateMigration';
import {
  buildCustomerOrderStagesBlock,
  buildDeliveryOperationsBlock,
} from './orderOperationsMessageBlocks';

export {
  buildAssistanceMessage,
  buildAssistanceOrderDetailsMessage,
  buildAssistanceServiceOrderMessage,
  buildBudgetWhatsappMessage,
  buildGroupInviteMessage,
  buildPersonGroupInviteMessage,
  buildReturnServiceOrderMessage,
} from './assistanceAndBudgetTemplates';

export const stringifyAdditionalContacts = (contacts?: { name: string; phone: string }[]) => {
  if (!contacts || contacts.length === 0) return '';
  return contacts.map((c) => `• ${c.name}: ${c.phone}`).join('\n');
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

export const buildCustomerOrderMessage = (order: Order) => {
  const settings = getSettings();
  const customer = order.customerData;
  const configuredTemplate = cleanOrderConfirmationText(
    settings.whatsappTemplates?.orderConfirmation || ''
  ).trim();
  const message = prepareCustomerOrderTemplate(
    configuredTemplate || DEFAULT_ORDER_CONFIRMATION_TEMPLATE
  );
  const operationsBlock = buildCustomerOrderStagesBlock(order);

  let itemsBlock = stringifyItemsWithValues(order.items || []);
  if (order.shipping?.value && order.shipping.value > 0) {
    itemsBlock += `\n*Frete:* ${formatCurrency(order.shipping.value)}`;
  }

  const finalMessage = message
    .replace(/{{customerName}}/g, () => customer.fullName || 'Cliente')
    .replace(/{{operations}}/g, () => operationsBlock)
    .replace(/{{deliveryDate}}|{{deliveryTime}}|{{address}}/g, '')
    .replace(/{{items}}/g, () => itemsBlock)
    .replace(/{{totalValue}}/g, () => formatCurrency(order.paymentsSummary?.totalOrderValue || 0))
    .replace(/{{seller}}/g, () => order.seller || 'Não informado')
    .replace(/{{payments}}/g, () => stringifyPayments(order.payments || []));

  return cleanOrderConfirmationText(finalMessage)
    .replace(/R\$\s*R\$/g, 'R$')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};
