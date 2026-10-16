import Order from '../../types/order.type';
import { getSettings } from '@/pages/utils/settingsService';
import {
  buildDeliveryMessage,
  buildCustomerOrderMessage,
  buildAssistanceMessage,
  buildAssistanceOrderDetailsMessage,
  buildGroupInviteMessage,
  buildPersonGroupInviteMessage,
  buildAssistanceServiceOrderMessage,
  buildBudgetWhatsappMessage,
  buildReturnServiceOrderMessage,
} from '../whatsappTemplates';

export const shippingOrderWhatsappUrl = (order: Order) => {
  const message = buildDeliveryMessage(order);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const customerOrderWhatsappUrl = (order: Order) => {
  const message = buildCustomerOrderMessage(order);
  const customer = order.customerData;
  const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const customerReviewsWhatsappUrl = (order: Order) => {
  const customer = order.customerData;
  const phone = customer?.phone ? customer.phone.replace(/[^0-9]/g, '') : '';
  const settings = getSettings();
  const reviewUrl = settings.googleReviewUrl || 'https://g.page/r/CctxeFYzY2o8EBE/review';

  let message = settings.whatsappTemplates?.reviewRequest || '';

  message = message
    .replace(/{{cliente}}/g, customer?.fullName?.split(' ')[0] || 'Cliente')
    .replace(/{{reviewUrl}}/g, reviewUrl);

  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const assistanceCustomerWhatsappUrl = (order: Order) => {
  const customer = order.customerData;
  const phone = customer?.phone?.replace(/[^0-9]/g, '') || '';
  const message = buildAssistanceMessage(order);

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const assistanceOrderDetailsWhatsappUrl = (order: Order) => {
  const customer = order.customerData;
  const phone = customer?.phone?.replace(/[^0-9]/g, '') || '';
  const message = buildAssistanceOrderDetailsMessage(order);

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const assistanceServiceOrderWhatsappUrl = (order: Order) => {
  const message = buildAssistanceServiceOrderMessage(order);
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const groupInviteWhatsappUrl = (order: Order) => {
  const customer = order.customerData;
  const phone = customer?.phone?.replace(/[^0-9]/g, '') || '';
  const message = buildGroupInviteMessage(order);

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const personGroupInviteWhatsappUrl = (person: any) => {
  const phone = person?.phone?.replace(/[^0-9]/g, '') || '';
  const message = buildPersonGroupInviteMessage(person);

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const returnOSCustomerWhatsappUrl = (order: Order) => {
  const customer = order.customerData;
  const phone = customer?.phone?.replace(/[^0-9]/g, '') || '';
  const message = buildReturnServiceOrderMessage(order, 'customer');
  return phone
    ? `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
    : `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};

export const returnOSTeamWhatsappUrl = (order: Order) =>
  `https://api.whatsapp.com/send?text=${encodeURIComponent(buildReturnServiceOrderMessage(order, 'team'))}`;

export const budgetWhatsappUrl = (order: Order) => {
  const customer = order.customerData;
  const phone = customer?.phone?.replace(/[^0-9]/g, '') || '';
  const message = buildBudgetWhatsappMessage(order);

  if (phone) {
    return `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
  }
  return `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`;
};
