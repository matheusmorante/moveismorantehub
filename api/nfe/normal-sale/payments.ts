import type { FiscalModelDecision } from '../../../shared-utils/fiscalDocumentModel';
import {
  classifyOrderPaymentSettlement,
  getOrderFulfillmentPaymentCondition,
  getOrderPaymentActualDate,
  getOrderPaymentDueDate,
  isPromissoryPaymentMethod,
} from '../../../shared-utils/orderPaymentState';
import type { FiscalDecisionTrace, FiscalSnapshotCandidate } from '../fiscalSnapshot';
import { money, normalize, obj } from './values';

type ReadyFiscalModelDecision = Extract<FiscalModelDecision, { status: 'ready' }>;

export function resolveNormalSalePayments(params: {
  snapshot: FiscalSnapshotCandidate;
  data: FiscalSnapshotCandidate['order']['data'];
  shipping: Record<string, any>;
  modelDecision: ReadyFiscalModelDecision;
  traces: FiscalDecisionTrace[];
  invoice: number;
}) {
  const { snapshot, data, shipping, modelDecision, traces, invoice } = params;
  const rawPayments = Array.isArray(data.payments) ? data.payments.map(obj) : [];
  const resolvedPayments: Array<{
    methodCode: string;
    amountCents: number;
    settlement: 'paid' | 'pending';
    description?: string;
    paymentDate?: string;
    dueDate?: string;
    installments: number;
    card?: {
      integrationType: '1' | '2';
      acquirerCnpj?: string;
      brand?: string;
      authorization?: string;
    };
  }> = [];
  let paidCents = 0;
  let pendingCents = 0;

  for (let index = 0; index < rawPayments.length; index += 1) {
    const payment = rawPayments[index];
    const amountValue = Number(payment.amount ?? 0);
    if (!Number.isFinite(amountValue) || amountValue < 0)
      throw new Error(`Valor do pagamento ${index + 1} inválido.`);
    if (amountValue === 0) continue;
    const amountCents = money(amountValue, `Pagamento ${index + 1}`, true);
    const settlement = classifyOrderPaymentSettlement(payment.status);
    if (settlement === 'unconfirmed')
      throw new Error(
        `Pagamento ${index + 1} está como “${String(payment.status)}”; confirme se foi recebido ou permanece pendente antes de transmitir.`
      );

    const originalMethod = typeof payment.method === 'string' ? payment.method.trim() : '';
    const method = normalize(originalMethod);
    const isPromissory = isPromissoryPaymentMethod(originalMethod);
    const fulfillmentCondition = getOrderFulfillmentPaymentCondition(shipping.deliveryMethod);
    let methodCode = method.includes('PIX')
      ? '17'
      : method.includes('CREDITO') || method.includes('CREDIT')
        ? '03'
        : method.includes('DEBITO') || method.includes('DEBIT')
          ? '04'
          : method.includes('DINHEIRO') || method.includes('CASH')
            ? '01'
            : method.includes('BOLETO')
              ? '15'
              : isPromissory
                ? '99'
                : undefined;
    let description = methodCode === '99' ? originalMethod : undefined;
    if (!methodCode && settlement === 'pending' && (!method || method === 'VERIFICAR')) {
      if (!fulfillmentCondition)
        throw new Error('O pedido pendente não informa se a entrega será por entrega ou retirada.');
      methodCode = '99';
      description = fulfillmentCondition;
    }
    if (!methodCode)
      throw new Error(
        `Meio de pagamento “${originalMethod || 'não informado'}” do item ${index + 1} exige mapeamento fiscal específico.`
      );

    const paymentCard = payment.fiscalCard;
    const rawInstallments = Number(payment.installments ?? 1);
    if (!Number.isInteger(rawInstallments) || rawInstallments < 1 || rawInstallments > 120)
      throw new Error(`Quantidade de parcelas inválida no pagamento ${index + 1}.`);
    const canDeclareNotIntegrated =
      settlement === 'pending' ||
      snapshot.emissionRequest.cardNotIntegrated ||
      (modelDecision.model === '65' && methodCode === '17');
    const card =
      paymentCard ||
      (canDeclareNotIntegrated && ['03', '04', '17'].includes(methodCode)
        ? { integrationType: '2' as const }
        : undefined);
    if (
      modelDecision.model === '65' &&
      ['03', '04', '17'].includes(methodCode) &&
      (!card ||
        !['1', '2'].includes(card.integrationType) ||
        (card.integrationType === '1' &&
          ['03', '04'].includes(methodCode) &&
          (!/^\d{14}$/.test(card.acquirerCnpj || '') || !card.authorization)))
    )
      throw new Error(
        `Pagamento ${index + 1}: informe a integração e os dados fiscais reais do cartão/PIX para NFC-e.`
      );

    const resolved = {
      methodCode,
      amountCents,
      settlement,
      ...(description ? { description } : {}),
      ...(settlement === 'paid' && getOrderPaymentActualDate(payment)
        ? { paymentDate: getOrderPaymentActualDate(payment) }
        : {}),
      ...(settlement === 'pending' ? { dueDate: getOrderPaymentDueDate(payment, shipping) } : {}),
      installments: rawInstallments,
      ...(card ? { card } : {}),
    };
    resolvedPayments.push(resolved);
    if (settlement === 'paid') paidCents += amountCents;
    else pendingCents += amountCents;
  }

  const orderPaymentSummary =
    data.paymentsSummary &&
    typeof data.paymentsSummary === 'object' &&
    !Array.isArray(data.paymentsSummary)
      ? data.paymentsSummary
      : {};
  const summaryPaid = Number(orderPaymentSummary.totalAmountPaid ?? 0);
  if (!resolvedPayments.length && Number.isFinite(summaryPaid) && summaryPaid > 0)
    throw new Error(
      'O Pedido de Venda informa valor recebido, mas não tem os meios de pagamento correspondentes; revise os pagamentos antes de transmitir.'
    );
  const amountDueCents = invoice - paidCents;
  if (amountDueCents < 0)
    throw new Error('Os valores marcados como pagos excedem o total fiscal da nota.');
  if (pendingCents > amountDueCents)
    throw new Error('Os valores pendentes do pedido excedem o saldo ainda devido da nota.');

  if (pendingCents < amountDueCents) {
    if (
      resolvedPayments.some(
        (payment) =>
          payment.settlement === 'pending' &&
          payment.methodCode === '99' &&
          isPromissoryPaymentMethod(payment.description)
      )
    )
      throw new Error(
        'O valor pendente da promissória não cobre todo o saldo da nota; revise as parcelas registradas no Pedido de Venda.'
      );
    const fulfillmentCondition = getOrderFulfillmentPaymentCondition(shipping.deliveryMethod);
    if (!fulfillmentCondition)
      throw new Error(
        'O saldo pendente não tem condição de retirada ou entrega definida no pedido.'
      );
    const fallbackDueDate = getOrderPaymentDueDate({}, shipping);
    resolvedPayments.push({
      methodCode: '99',
      amountCents: amountDueCents - pendingCents,
      settlement: 'pending',
      description: fulfillmentCondition,
      ...(fallbackDueDate ? { dueDate: fallbackDueDate } : {}),
      installments: 1,
    });
    pendingCents = amountDueCents;
  }

  if (paidCents + pendingCents !== invoice)
    throw new Error('Os valores recebidos e pendentes não reconciliam com o total fiscal da nota.');

  const payments = resolvedPayments.map((payment) => ({
    methodCode: payment.methodCode,
    amount: payment.amountCents / 100,
    paymentIndicator: payment.settlement === 'paid' ? ('0' as const) : ('1' as const),
    ...(payment.description ? { description: payment.description } : {}),
    ...(payment.paymentDate ? { paymentDate: payment.paymentDate } : {}),
    ...(payment.card ? { card: payment.card } : {}),
    decision: traces[0],
  }));
  const payment = paidCents + pendingCents;
  const pendingPayments = resolvedPayments.filter((item) => item.settlement === 'pending');
  const billingParts: Array<{ dueDate?: string; amountCents: number }> = [];
  for (const pendingPayment of pendingPayments) {
    if (isPromissoryPaymentMethod(pendingPayment.description) && pendingPayment.installments > 1) {
      const perInstallment = Math.floor(pendingPayment.amountCents / pendingPayment.installments);
      const remainder = pendingPayment.amountCents % pendingPayment.installments;
      if (perInstallment < 1)
        throw new Error('O valor da promissória não cobre a quantidade de parcelas registrada.');
      for (let index = 0; index < pendingPayment.installments; index += 1)
        billingParts.push({
          amountCents: perInstallment + (index < remainder ? 1 : 0),
        });
    } else {
      billingParts.push({
        ...(pendingPayment.dueDate ? { dueDate: pendingPayment.dueDate } : {}),
        amountCents: pendingPayment.amountCents,
      });
    }
  }
  if (billingParts.length > 120)
    throw new Error('A condição a prazo excede o limite fiscal de 120 parcelas.');
  const billingInstallments =
    modelDecision.model === '55' && billingParts.length > 0
      ? billingParts
          .sort((left, right) => {
            if (!left.dueDate) return right.dueDate ? 1 : 0;
            if (!right.dueDate) return -1;
            return left.dueDate.localeCompare(right.dueDate);
          })
          .map((part, index) => ({
            number: String(index + 1).padStart(3, '0'),
            ...(part.dueDate ? { dueDate: part.dueDate } : {}),
            amount: part.amountCents / 100,
          }))
      : undefined;
  return { payments, payment, billingInstallments };
}
