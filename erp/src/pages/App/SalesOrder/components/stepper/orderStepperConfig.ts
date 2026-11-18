export interface OrderStep {
  step: number;
  icon: string;
  label: string;
}

export type OrderStepStatus = 'error' | 'active' | 'done' | 'pending';

export const ORDER_STEPS: OrderStep[] = [
  { step: 1, icon: 'bi-info-circle', label: 'Informações básicas' },
  { step: 2, icon: 'bi-box-seam', label: 'Itens' },
  { step: 3, icon: 'bi-person-badge', label: 'Cliente' },
  { step: 4, icon: 'bi-truck', label: 'Logística' },
  { step: 5, icon: 'bi-credit-card-2-front', label: 'Pagamento' },
];

export const getVisibleOrderSteps = (isBudget: boolean = false): OrderStep[] => {
  if (!isBudget) return ORDER_STEPS;
  return ORDER_STEPS
    .filter((step) => step.step !== 5)
    .map((step) => step.step === 4 ? { ...step, label: 'Entrega' } : step);
};

export const getOrderStepStatus = (
  step: number,
  currentStep: number,
  errors: Record<string, string> = {}
): OrderStepStatus => {
  const errorKeys = Object.keys(errors);
  const hasErrorByStep: Record<number, boolean> = {
    1: errorKeys.some((key) => ['seller', 'date', 'order_date', 'status'].includes(key)),
    2: errorKeys.some(
      (key) =>
        key === 'items' ||
        key.startsWith('item_') ||
        key.startsWith('items_') ||
        key === 'items_summary'
    ),
    3: errorKeys.some(
      (key) =>
        key === 'customer' ||
        key === 'customerData' ||
        key.startsWith('customer_') ||
        key.startsWith('customerData_')
    ),
    4: errorKeys.some(
      (key) =>
        key.startsWith('shipping_') ||
        key === 'shipping' ||
        key.startsWith('deliveryAddress_') ||
        key === 'deliveryAddress'
    ),
    5: errorKeys.some(
      (key) => key.startsWith('payment_') || key === 'payments_summary' || key === 'payments'
    ),
  };

  if (hasErrorByStep[step]) return 'error';
  if (step === currentStep) return 'active';
  if (step < currentStep) return 'done';
  return 'pending';
};
