import { calcPaymentsSummary, calcPaymentsTotalValue, calcItemsSummary } from './orderCalculations';
import type { CommercialRequiredFields } from './commercialDomainTypes';
import type { Item } from '../erp/src/pages/types/items.type';
import type { Payment } from '../erp/src/pages/types/payments.type';
import type Order from '../erp/src/pages/types/order.type';
import { validateCustomerData, validateShipping } from './commercialShippingRules';
import { validateAssistanceOrder, validateReviews } from './commercialAssistanceRules';
import type { ValidationErrors } from './commercialSchedulingRules';

export type { ValidationErrors } from './commercialSchedulingRules';
export * from './commercialShippingRules';
export { validateAssistanceOrder, validateReviews };

export const validateItems = (
  items: Item[],
  isBudget: boolean = false,
  isReturn: boolean = false,
  requireStockOrigin: boolean = false
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!items || !Array.isArray(items)) return errors;
  const hideHandling = isBudget || isReturn;

  items.forEach((item, idx) => {
    if (!item) return;
    if (!item.description || item.description.trim() === '') {
      errors[`item_${idx}_description`] = 'A descricao do item e obrigatoria.';
    }
    const isService = item.itemType === 'service';
    if (!hideHandling && !isService && (!item.handlingType || item.handlingType.trim() === '')) {
      errors[`item_${idx}_handlingType`] = 'O manuseio do item e obrigatorio.';
    }
    if (
      requireStockOrigin &&
      !isService &&
      !item.isComboItem &&
      item.condition !== 'novo' &&
      item.condition !== 'salvado' &&
      item.condition !== 'usado'
    ) {
      errors[`item_${idx}_stockOrigin`] = 'Selecione a origem do estoque.';
    }
  });

  return errors;
};

export const validatePayments = (
  payments: Payment[],
  paymentCoverageDifference: number
): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!payments || !Array.isArray(payments)) return errors;

  payments.forEach((payment, idx) => {
    if (!payment) return;
    if (!payment.method?.trim()) {
      errors[`payment_${idx}_method`] = 'Selecione uma forma de pagamento.';
    }
    if (!payment.status) {
      errors[`payment_${idx}_status`] = 'O status do pagamento é obrigatório.';
    }
  });

  if (payments.length === 0) {
    errors['payments_summary'] = 'Informe ao menos uma forma de pagamento.';
  } else if (Math.abs(paymentCoverageDifference) > 0.01) {
    errors['payments_summary'] =
      paymentCoverageDifference > 0
        ? `Ainda há R$ ${paymentCoverageDifference.toFixed(2).replace('.', ',')} a ser declarado.`
        : `A soma dos valores informados ultrapassou o total em R$ ${Math.abs(paymentCoverageDifference).toFixed(2).replace('.', ',')}.`;
  }

  return errors;
};

export const validateSeller = (seller: Order['seller']): ValidationErrors => {
  const errors: ValidationErrors = {};
  if (!seller) {
    errors['seller'] = 'Selecione o atendente responsável.';
  }
  return errors;
};

export const validateOrder = (
  order: Order,
  requiredFields: CommercialRequiredFields = {}
): ValidationErrors => {
  if (!order) return { order: 'Pedido não encontrado.' };

  const isDraft = order.status === 'draft';
  const isAssistance =
    order.orderType === 'assistance' || Boolean(order.assistanceItems?.length);
  const isPickup = order.shipping?.deliveryMethod === 'pickup';
  const isBudget = order.orderType === 'budget';
  const isReturn = order.orderType === 'return';

  const items = (order.items || []).filter((item) => item.productId || item.description);
  const payments = order.payments || [];
  const shippingValue = order.shipping?.value || 0;
  const itemsSummary = calcItemsSummary(items);

  const effectiveItemsTotalValue =
    order.orderType === 'assistance' && order.assistanceServiceValue
      ? itemsSummary.itemsTotalValue + order.assistanceServiceValue
      : itemsSummary.itemsTotalValue;

  const paymentSummary = calcPaymentsSummary(
    payments,
    { ...itemsSummary, itemsTotalValue: effectiveItemsTotalValue },
    shippingValue
  );
  const paymentCoverageDifference = Number(
    (
      paymentSummary.paymentAllocationDifference ??
      paymentSummary.totalOrderValue - calcPaymentsTotalValue(payments)
    ).toFixed(2)
  );

  const requireStockOrigin =
    ['scheduled', 'fulfilled'].includes(order.status || '') && !isBudget && !isReturn;

  const errors: ValidationErrors = {
    ...validateItems(items, isBudget, isReturn, requireStockOrigin),
    ...(!isBudget ? validateCustomerData(order.customerData, isPickup, requiredFields) : {}),
    ...validateSeller(order.seller),
  };

  if (!isDraft) {
    Object.assign(errors, validateShipping(order.shipping, order.customerData, isBudget));
    if (!isBudget) {
      Object.assign(errors, validatePayments(payments, paymentCoverageDifference));
    }

    const hasRegularItems = items.length > 0;
    const hasAssistanceItems = Boolean(order.assistanceItems?.length);
    const isLinkedAssistance =
      isAssistance && Boolean(order.linkedOrderId && order.linkedOrderId.trim() !== '');

    if (!isAssistance && !hasRegularItems) {
      errors['items_summary'] = 'O pedido/orçamento deve conter pelo menos um produto.';
    } else if (isLinkedAssistance && !hasRegularItems && !hasAssistanceItems) {
      errors['items_summary'] =
        'Como há um pedido vinculado, selecione pelo menos um item do pedido original ou adicione uma peça/serviço.';
    }
  }

  if (!order.date || order.date.trim() === '') {
    errors['order_date'] = 'A data do pedido é obrigatória.';
  }

  return errors;
};

export const validateBase = (order: Order, requiredFields: CommercialRequiredFields = {}) => {
  const errors = validateOrder(order, requiredFields);
  return Object.keys(errors).length === 0;
};

export const isOrderIncomplete = (
  order: Order,
  requiredFields: CommercialRequiredFields = {}
) => {
  if (!order) return true;
  const isAssistance =
    order.orderType === 'assistance' || Boolean(order.assistanceItems?.length);

  if (isAssistance) {
    return Object.keys(validateAssistanceOrder(order, requiredFields)).length > 0;
  }
  return !validateBase(order, requiredFields);
};
