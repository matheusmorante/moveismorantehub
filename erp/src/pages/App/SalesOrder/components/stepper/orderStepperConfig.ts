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

export const getVisibleOrderSteps = (isBudget: boolean = false): OrderStep[] =>
  isBudget ? ORDER_STEPS.filter((s) => s.step !== 5) : ORDER_STEPS;

export const getOrderStepStatus = (
  step: number,
  currentStep: number,
  errors: Record<string, string> = {}
): OrderStepStatus => {
  const errorKeys = Object.keys(errors);
  const hasErrorByStep: Record<number, boolean> = {
    1: errorKeys.includes('seller') || errorKeys.includes('order_date'),
    2: errorKeys.some((k) => k.startsWith('item_') || k === 'items_summary'),
    3: errorKeys.some((k) => k.startsWith('customer_')),
    4: errorKeys.some((k) => k.startsWith('shipping_') || k.startsWith('deliveryAddress_')),
    5: errorKeys.some((k) => k.startsWith('payment_') || k === 'payments_summary'),
  };

  if (hasErrorByStep[step]) return 'error';
  if (step === currentStep) return 'active';
  if (step < currentStep) return 'done';
  return 'pending';
};
