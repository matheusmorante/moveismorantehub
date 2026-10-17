import Order, { IsButtonsClicked } from '../../../types/order.type';
import { buttons } from './orderActionsConfig';
import { validateOrder } from '../../../utils/validations';
import { canGenerateReturn } from '../../../utils/returnPolicy';
import { canGenerateAssistance } from '../../../utils/assistancePolicy';

export const DEFAULT_CLICKED_BUTTONS: IsButtonsClicked = {
  printReceipt: false,
  printShippingOrder: false,
  printWarrantyTerm: false,
  sendShippingOrder: false,
  sendCustomerOrder: false,
  sendCustomerReviews: false,
  printShippingLabel: false,
  printProductLabel: false,
  generatePaymentLink: false,
  printBudget: false,
  sendCustomerOrderDetails: false,
  sendAssistanceOS: false,
};

export interface OrderValidationStatItem {
  label: string;
  icon: string;
  valid: boolean;
  error?: string;
}

export function filterVisibleOrderActionButtons(
  order: Order,
  context: 'form' | 'list'
): (typeof buttons)[number][] {
  const orderType = order.orderType || 'sale';

  return buttons.filter((btn) => {
    if (btn.orderTypes && !btn.orderTypes.includes(orderType)) return false;
    if (btn.key === 'generateReturn' && !canGenerateReturn(order)) return false;
    if (btn.key === 'generateAssistance' && !canGenerateAssistance(order)) return false;

    if (context === 'form') {
      if (
        [
          'PRINT_SHIPPING_LABEL',
          'PRINT_PRODUCT_LABEL',
          'DUPLICATE_ORDER',
          'GENERATE_SALE_FROM_BUDGET',
          'GENERATE_RETURN',
          'GENERATE_ASSISTANCE',
        ].includes(btn.action)
      ) {
        return false;
      }

      if (btn.action === 'SEND_SHIPPING_ORDER') {
        const isDelivery = order.shipping?.deliveryMethod === 'delivery';
        if (!isDelivery) return false;
      }

      if (btn.action === 'SEND_CUSTOMER_REVIEWS') return false;
    }

    return true;
  });
}

export function getOrderValidationStats(order: Order): OrderValidationStatItem[] {
  const errors = validateOrder(order);

  return [
    {
      label: 'Produtos / Serviços',
      icon: 'bi-box-seam',
      valid: !errors.items_summary && !Object.keys(errors).some((k) => k.startsWith('item_')),
      error:
        errors.items_summary ||
        Object.entries(errors).find(([k]) => k.startsWith('item_'))?.[1],
    },
    {
      label: 'Dados do Cliente',
      icon: 'bi-person-badge',
      valid: !errors.customer_fullName && !errors.customer_phone && !errors.customer_cpfCnpj,
      error: errors.customer_fullName || errors.customer_phone || errors.customer_cpfCnpj,
    },
    {
      label: 'Logística / Data',
      icon: 'bi-truck',
      valid:
        !errors.shipping_date &&
        !errors.shipping_time &&
        !errors.shipping_scheduling &&
        !errors.customer_street &&
        !errors.customer_number &&
        !errors.customer_city,
      error:
        errors.shipping_date ||
        errors.shipping_time ||
        errors.shipping_scheduling ||
        errors.customer_street ||
        errors.customer_number ||
        errors.customer_city,
    },
    {
      label: 'Pagamento / Total',
      icon: 'bi-credit-card-2-front',
      valid:
        !errors.payments_summary && !Object.keys(errors).some((k) => k.startsWith('payment_')),
      error: errors.payments_summary,
    },
    {
      label: 'Atendente Principal',
      icon: 'bi-person-check',
      valid: !errors.seller,
      error: errors.seller,
    },
  ];
}

export function evaluateOrderActionButtonState(
  btn: (typeof buttons)[number],
  order: Order
): {
  isPrintAction: boolean;
  isSendAction: boolean;
  hasErrors: boolean;
  isDisabled: boolean;
  disabledReason: string;
  validationStats: OrderValidationStatItem[];
} {
  const isPrintAction =
    btn.action === 'PRINT_RECEIPT' || btn.action === 'PRINT_SHIPPING_ORDER';
  const isSendAction =
    btn.action === 'SEND_SHIPPING_ORDER' ||
    btn.action === 'SEND_CUSTOMER_ORDER' ||
    btn.action === 'SEND_ASSISTANCE_CUSTOMER' ||
    btn.action === 'SEND_ASSISTANCE_ORDER_DETAILS' ||
    btn.action === 'SEND_ASSISTANCE_OS';

  const orderErrors = isPrintAction || isSendAction ? validateOrder(order) : {};
  const hasErrors = Object.keys(orderErrors).length > 0;

  const isPrintReceipt = btn.key === 'printReceipt';
  const noCustomer =
    isPrintReceipt &&
    (!order.customerData?.fullName ||
      order.customerData.fullName === 'Nenhum' ||
      order.customerData.fullName === 'Ao Consumidor');

  const isDisabled =
    noCustomer || (isPrintAction && hasErrors) || (isSendAction && hasErrors);

  const labelText = typeof btn.label === 'function' ? btn.label(order) : btn.label;
  const disabledReason = noCustomer
    ? 'Não é possível imprimir recibo sem cliente associado'
    : (isPrintAction || isSendAction) && hasErrors
      ? 'Campos obrigatórios faltando. Verifique o formulário.'
      : labelText;

  const validationStats = isPrintAction || isSendAction ? getOrderValidationStats(order) : [];

  return {
    isPrintAction,
    isSendAction,
    hasErrors,
    isDisabled,
    disabledReason,
    validationStats,
  };
}
