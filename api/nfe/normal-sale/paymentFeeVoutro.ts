import type { FiscalSnapshotCandidate } from '../fiscalSnapshot';
import { normalize } from './values';

export type PaymentFeeRows = {
  feeCentsByPayment: number[];
  totalFeeCents: number;
};

export type PaymentFeeComposition = PaymentFeeRows & {
  itemFeeCents: number[];
  additionalInformation?: string;
};

function record(value: unknown): Record<string, any> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, any>)
    : {};
}

function exactFeeCents(payment: Record<string, any>, index: number): number {
  const fee = payment.fee ?? 0;
  if (typeof fee !== 'number' || !Number.isFinite(fee) || fee < 0)
    throw new Error(`Taxa do pagamento ${index + 1} inválida.`);
  if (fee === 0) return 0;

  const amount = payment.amount;
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0)
    throw new Error(`Taxa do pagamento ${index + 1} não tem valor-base válido.`);
  const amountCents = Math.round(amount * 100);
  if (!Number.isSafeInteger(amountCents) || Math.abs(amount * 100 - amountCents) > 0.000001)
    throw new Error(`Valor do pagamento ${index + 1} está fora da precisão de centavos.`);

  const feeType = payment.feeType ?? 'fixed';
  if (feeType === 'fixed') {
    const feeCents = Math.round(fee * 100);
    if (Math.abs(fee * 100 - feeCents) > 0.000001)
      throw new Error(`Taxa fixa do pagamento ${index + 1} está fora da precisão de centavos.`);
    return feeCents;
  }
  if (feeType !== 'percentage')
    throw new Error(`Tipo da taxa do pagamento ${index + 1} inválido.`);
  const exactCents = (amountCents * fee) / 100;
  if (!Number.isFinite(exactCents) || exactCents > Number.MAX_SAFE_INTEGER)
    throw new Error(`Taxa percentual do pagamento ${index + 1} inválida.`);
  return exactCents;
}

function allocateRoundedRows(exactCents: number[], targetCents: number): number[] {
  if (targetCents <= 0) return exactCents.map(() => 0);
  const rows = exactCents.map((exact, index) => ({
    index,
    cents: Math.floor(exact),
    remainder: exact - Math.floor(exact),
  }));
  const remaining = targetCents - rows.reduce((sum, row) => sum + row.cents, 0);
  const order = [...rows].sort(
    (left, right) => right.remainder - left.remainder || left.index - right.index
  );
  for (let index = 0; index < remaining; index += 1) order[index].cents += 1;
  return rows.sort((left, right) => left.index - right.index).map((row) => row.cents);
}

/** Uses the order's consolidated fee total while reconciling it to payment rows to the cent. */
export function resolvePaymentFeeRows(data: FiscalSnapshotCandidate['order']['data']): PaymentFeeRows {
  const payments = Array.isArray(data.payments) ? data.payments.map(record) : [];
  const exactCents = payments.map(exactFeeCents);
  const exactTotalCents = exactCents.reduce((sum, value) => sum + value, 0);
  const rawSummary = record(data.paymentsSummary).totalPaymentsFee;
  if (exactTotalCents === 0 && (rawSummary === undefined || rawSummary === null))
    return { feeCentsByPayment: exactCents.map(() => 0), totalFeeCents: 0 };
  if (typeof rawSummary !== 'number' || !Number.isFinite(rawSummary) || rawSummary < 0)
    throw new Error('O resumo consolidado das taxas de pagamento está ausente ou inválido.');

  const totalFeeCents = Math.round(rawSummary * 100);
  if (
    Math.abs(rawSummary * 100 - exactTotalCents) > 0.0001 ||
    totalFeeCents !== Math.round(exactTotalCents)
  )
    throw new Error(
      'As taxas dos pagamentos não reconciliam com o total consolidado do pedido; revise o resumo antes de emitir.'
    );
  return {
    feeCentsByPayment: allocateRoundedRows(exactCents, totalFeeCents),
    totalFeeCents,
  };
}

function fiscalPaymentMethodCode(method: unknown): '03' | '04' | undefined {
  if (typeof method !== 'string') return undefined;
  const normalized = normalize(method);
  if (normalized.includes('CREDITO') || normalized.includes('CREDIT')) return '03';
  if (normalized.includes('DEBITO') || normalized.includes('DEBIT')) return '04';
  return undefined;
}

function paymentInstallments(payment: Record<string, any>): number {
  if (payment.installments !== undefined && payment.installments !== null)
    return Number(payment.installments);
  const label = typeof payment.method === 'string' ? payment.method : '';
  const fromLabel = label.match(/\b(\d{1,3})\s*x\b/i);
  return fromLabel ? Number(fromLabel[1]) : 1;
}

function formatBrl(cents: number): string {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })
    .format(cents / 100)
    .replace(/\u00a0/g, ' ');
}

function paymentFeeInformation(
  data: FiscalSnapshotCandidate['order']['data'],
  feeCentsByPayment: number[],
  totalFeeCents: number,
  model: '55' | '65'
): string {
  const payments = Array.isArray(data.payments) ? data.payments.map(record) : [];
  const groups = new Map<string, { cents: number; description: string }>();
  payments.forEach((payment, index) => {
    const cents = feeCentsByPayment[index] || 0;
    if (!cents) return;
    const method = fiscalPaymentMethodCode(payment.method);
    if (!method) throw new Error(`Origem da taxa do pagamento ${index + 1} não está classificada.`);
    const installments = paymentInstallments(payment);
    const key = method === '03' && installments > 1 ? 'credit_installments' : method;
    const description =
      key === 'credit_installments'
        ? 'processamento do cartão de crédito e às condições de parcelamento escolhidas'
        : method === '03'
          ? 'processamento do cartão de crédito'
          : 'processamento do cartão de débito';
    const current = groups.get(key) || { cents: 0, description };
    current.cents += cents;
    groups.set(key, current);
  });
  const origins = [...groups.values()]
    .map(({ cents, description }) => `${formatBrl(cents)} referentes aos custos de ${description}`)
    .join('; ');
  return `O valor total desta ${model === '65' ? 'NFC-e' : 'NF-e'} inclui ${formatBrl(totalFeeCents)} em acréscimos da modalidade de pagamento, já considerados no total do pedido e repassados ao comprador: ${origins}. As taxas de maquininha foram rateadas proporcionalmente ao valor líquido dos produtos, compondo as outras despesas acessórias de cada item.`;
}

function allocateAcrossItems(totalCents: number, weights: number[]): number[] {
  if (!totalCents) return weights.map(() => 0);
  const eligibleWeights = weights.map((weight) => Math.max(0, Math.round(weight)));
  const weightTotal = eligibleWeights.reduce((sum, weight) => sum + weight, 0);
  if (!eligibleWeights.length || weightTotal <= 0)
    throw new Error('Não há itens fiscais com valor líquido para ratear as taxas de pagamento.');
  const exact = eligibleWeights.map((weight) => (totalCents * weight) / weightTotal);
  const roundedDown = exact.map(Math.floor);
  let remaining = totalCents - roundedDown.reduce((sum, cents) => sum + cents, 0);
  const order = exact
    .map((share, index) => ({ index, remainder: share - roundedDown[index] }))
    .sort((left, right) => right.remainder - left.remainder || left.index - right.index);
  for (let index = 0; index < remaining; index += 1) roundedDown[order[index].index] += 1;
  return roundedDown;
}

export function composePaymentFeeVoutro(params: {
  snapshot: FiscalSnapshotCandidate;
  model: '55' | '65';
  itemNetCents: number[];
  paymentFees?: PaymentFeeRows;
}): PaymentFeeComposition {
  const { snapshot, model, itemNetCents } = params;
  const paymentFees = params.paymentFees || resolvePaymentFeeRows(snapshot.order.data);
  const itemFeeCents = itemNetCents.map(() => 0);
  if (!paymentFees.totalFeeCents)
    return { ...paymentFees, itemFeeCents };
  const payments = Array.isArray(snapshot.order.data.payments)
    ? snapshot.order.data.payments.map(record)
    : [];
  payments.forEach((payment, index) => {
    if (!(paymentFees.feeCentsByPayment[index] > 0)) return;
    const method = fiscalPaymentMethodCode(payment.method);
    if (!method)
      throw new Error(
        `A taxa do pagamento ${index + 1} não está vinculada a uma modalidade de cartão aprovada para classificação fiscal.`
      );
    const installments = paymentInstallments(payment);
    if (!Number.isInteger(installments) || installments < 1 || (method === '04' && installments > 1))
      throw new Error(`Parcelamento do pagamento ${index + 1} não suportado para esta decisão fiscal.`);
  });

  const allocations = allocateAcrossItems(paymentFees.totalFeeCents, itemNetCents);
  const additionalInformation = paymentFeeInformation(
    snapshot.order.data,
    paymentFees.feeCentsByPayment,
    paymentFees.totalFeeCents,
    model
  );
  if (additionalInformation.length > 5000)
    throw new Error('A explicação das taxas excede o limite de informações adicionais da NF-e.');
  return {
    ...paymentFees,
    itemFeeCents: allocations,
    additionalInformation,
  };
}

export function joinFiscalAdditionalInformation(...sections: Array<string | undefined>): string | undefined {
  const value = sections.filter((section): section is string => Boolean(section?.trim())).join('; ');
  if (value.length > 5000)
    throw new Error('As informações adicionais excedem o limite fiscal da NF-e.');
  return value || undefined;
}
