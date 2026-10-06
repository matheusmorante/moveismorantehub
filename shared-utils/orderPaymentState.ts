export type OrderPaymentSettlement = 'paid' | 'pending' | 'unconfirmed';

export type OrderPaymentLike = {
  amount?: unknown;
  status?: unknown;
  method?: unknown;
  installments?: unknown;
  dueDate?: unknown;
  paymentDate?: unknown;
};

export type OrderPaymentAssessment = {
  state: 'paid' | 'partial' | 'pending' | 'unconfirmed' | 'inconsistent';
  totalCents: number;
  paidCents: number;
  pendingCents: number;
  unallocatedCents: number;
  unconfirmedCount: number;
  invalidAmountCount: number;
};

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim()
    .toLowerCase();

/** Older order snapshots omitted status and historically treated listed rows as paid. */
export function classifyOrderPaymentSettlement(status: unknown): OrderPaymentSettlement {
  if (status === undefined || status === null) return 'paid';
  const normalized = normalize(String(status));
  if (normalized.startsWith('pago')) return 'paid';
  if (normalized.startsWith('pendente')) return 'pending';
  return 'unconfirmed';
}

export function isPaidOrderPayment(status: unknown): boolean {
  return classifyOrderPaymentSettlement(status) === 'paid';
}

export function assessOrderPayments(
  payments: readonly OrderPaymentLike[] | null | undefined,
  invoiceTotal: number
): OrderPaymentAssessment {
  const totalCents = Number.isFinite(invoiceTotal) ? Math.max(0, Math.round(invoiceTotal * 100)) : 0;
  let paidCents = 0;
  let pendingCents = 0;
  let unconfirmedCount = 0;
  let invalidAmountCount = 0;

  for (const payment of payments || []) {
    const amount = Number(payment?.amount);
    if (!Number.isFinite(amount) || amount < 0) {
      invalidAmountCount += 1;
      continue;
    }
    const amountCents = Math.round(amount * 100);
    const settlement = classifyOrderPaymentSettlement(payment?.status);
    if (settlement === 'paid') paidCents += amountCents;
    else if (settlement === 'pending') pendingCents += amountCents;
    else unconfirmedCount += 1;
  }

  const allocatedCents = paidCents + pendingCents;
  const unallocatedCents = Math.max(0, totalCents - allocatedCents);
  const inconsistent =
    invalidAmountCount > 0 || paidCents > totalCents || allocatedCents > totalCents;
  const state = inconsistent
    ? 'inconsistent'
    : unconfirmedCount > 0
      ? 'unconfirmed'
      : paidCents === totalCents
        ? 'paid'
        : paidCents > 0
          ? 'partial'
          : 'pending';

  return {
    state,
    totalCents,
    paidCents,
    pendingCents,
    unallocatedCents,
    unconfirmedCount,
    invalidAmountCount,
  };
}

export function isPromissoryPaymentMethod(method: unknown): boolean {
  return typeof method === 'string' && normalize(method).includes('promissoria');
}

export function getOrderFulfillmentPaymentCondition(deliveryMethod: unknown): string | undefined {
  if (deliveryMethod === 'pickup') return 'Pagamento na retirada';
  if (deliveryMethod === 'delivery') return 'Pagamento na entrega';
  return undefined;
}

function parseDateOnly(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const match = value.trim().match(/^(\d{4}-\d{2}-\d{2})(?:$|T|\s)/);
  if (!match) return undefined;
  const date = new Date(`${match[1]}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || date.toISOString().slice(0, 10) !== match[1]
    ? undefined
    : match[1];
}

export function getOrderPaymentDueDate(
  payment: OrderPaymentLike,
  shipping: {
    deliveryMethod?: unknown;
    scheduling?: {
      date?: unknown;
      endDate?: unknown;
      dateType?: unknown;
      type?: unknown;
      pendingScheduling?: unknown;
    };
  } | null | undefined
): string | undefined {
  const explicitDate = parseDateOnly(payment.dueDate);
  if (explicitDate) return explicitDate;
  if (isPromissoryPaymentMethod(payment.method)) return undefined;

  const scheduling = shipping?.scheduling;
  if (
    !getOrderFulfillmentPaymentCondition(shipping?.deliveryMethod) ||
    scheduling?.pendingScheduling === true ||
    scheduling?.dateType === 'range' ||
    scheduling?.type === 'range'
  )
    return undefined;
  return parseDateOnly(scheduling?.date);
}

export function getOrderPaymentActualDate(payment: OrderPaymentLike): string | undefined {
  return parseDateOnly(payment.paymentDate);
}
