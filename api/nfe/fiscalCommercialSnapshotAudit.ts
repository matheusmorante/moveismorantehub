import {
  composeServiceFiscalValues,
} from '../../erp/src/pages/utils/nfe/serviceFiscalComposition';
import {
  composePaymentFeeVoutro,
  joinFiscalAdditionalInformation,
  resolvePaymentFeeRows,
} from './normal-sale/paymentFeeVoutro';
import { resolveNormalSalePayments } from './normal-sale/payments';
import type { FiscalXmlAuditMismatch } from './fiscalXmlAuditHelpers';
import {
  FiscalXmlAuditError,
  addNumberMismatch,
  addOptionalTextMismatch,
  addTextMismatch,
  normalizeTaxId,
} from './fiscalXmlAuditHelpers';
import type { FiscalDocument, FiscalSnapshotCandidate } from './fiscalSnapshot';

function objectValue(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

/** Ensures the server-resolved fiscal document still represents the frozen commercial order. */
export function assertFiscalDocumentMatchesCommercialSnapshot(
  snapshot: FiscalSnapshotCandidate,
  document: FiscalDocument
): void {
  const orderItems = snapshot.order.data.items;
  if (!Array.isArray(orderItems)) throw new Error('Snapshot comercial sem itens do pedido.');
  const composition = composeServiceFiscalValues(orderItems as never[], document.model);
  const paymentFeeComposition = composePaymentFeeVoutro({
    snapshot,
    model: document.model,
    itemNetCents: composition.products.map((item) => item.vProdCents - item.vDescCents),
  });
  const mismatches: FiscalXmlAuditMismatch[] = [];
  if (composition.products.length !== document.items.length)
    mismatches.push({ field: 'itens.count', expected: composition.products.length, actual: document.items.length });

  composition.products.forEach(({ item, vProdCents, vDescCents }, index) => {
    const fiscalItem = document.items[index];
    if (!fiscalItem) return;
    const n = index + 1;
    const code = String(item.code || (item as unknown as { sku?: string }).sku || `ITEM-${n}`).slice(0, 60);
    const description = String(item.description || '').trim();
    const quantity = Number(item.quantity) || 1;
    const gross = vProdCents / 100;
    const freight = index === 0 ? Number((snapshot.order.data.shipping as Record<string, unknown> | undefined)?.value || 0) : 0;
    const otherExpenses =
      ((index === 0 ? composition.vOutroCents : 0) +
        (paymentFeeComposition.itemFeeCents[index] || 0)) /
      100;
    const fields: Array<[string, string | number, string | number, number?]> = [
      [`itens[${n}].codigo`, code, fiscalItem.product.code],
      [`itens[${n}].descricao`, description, fiscalItem.product.description],
      [`itens[${n}].quantidade`, quantity, fiscalItem.product.quantity, 0.000001],
      [`itens[${n}].valorBruto`, gross, fiscalItem.product.gross],
      [`itens[${n}].desconto`, vDescCents / 100, fiscalItem.product.discount],
      [`itens[${n}].valorUnitario`, gross / quantity, fiscalItem.product.unitValue, 0.000001],
      [`itens[${n}].frete`, freight, fiscalItem.product.freight],
      [`itens[${n}].outrasDespesas`, otherExpenses, fiscalItem.product.otherExpenses],
    ];
    for (const [field, expected, actual, tolerance = 0.005] of fields) {
      const matches =
        typeof expected === 'string'
          ? expected === actual
          : typeof actual === 'number' && Math.abs(expected - actual) <= tolerance;
      if (!matches) mismatches.push({ field, expected, actual });
    }
  });

  const shipping = objectValue(snapshot.order.data.shipping);
  const freight = Number(shipping.value || 0);
  const expectedCommercialTotal =
    (composition.products.reduce((sum, item) => sum + item.vProdCents - item.vDescCents, 0) +
      composition.vOutroCents +
      paymentFeeComposition.totalFeeCents) /
      100 +
    freight;
  if (Math.abs(expectedCommercialTotal - document.totals.invoice) > 0.005)
    mismatches.push({
      field: 'total.valorPedidoCalculado',
      expected: expectedCommercialTotal,
      actual: document.totals.invoice,
    });

  const expectedAdditionalInformation =
    joinFiscalAdditionalInformation(
      composition.additionalInformation,
      paymentFeeComposition.additionalInformation
    ) || '';
  if ((document.additionalInformation || '') !== expectedAdditionalInformation)
    mismatches.push({
      field: 'informacoesAdicionais.infCpl',
      expected: expectedAdditionalInformation || '(ausente)',
      actual: document.additionalInformation || '(ausente)',
    });

  if (document.modelDecision?.status === 'ready') {
    const expectedPayments = resolveNormalSalePayments({
      snapshot,
      data: snapshot.order.data,
      shipping: objectValue(snapshot.order.data.shipping),
      modelDecision: document.modelDecision,
      traces: [...document.decisions],
      invoice: Math.round(document.totals.invoice * 100),
      feeCentsByPayment: resolvePaymentFeeRows(snapshot.order.data).feeCentsByPayment,
    }).payments;
    const paymentCount = Math.max(expectedPayments.length, document.payments.length);
    for (let index = 0; index < paymentCount; index += 1) {
      const expected = expectedPayments[index];
      const actual = document.payments[index];
      if (!expected || !actual) {
        mismatches.push({
          field: `pagamentos[${index + 1}]`,
          expected: expected ? 'presente' : '(ausente)',
          actual: actual ? 'presente' : '(ausente)',
        });
        continue;
      }
      if (expected.methodCode !== actual.methodCode)
        mismatches.push({ field: `pagamentos[${index + 1}].meio`, expected: expected.methodCode, actual: actual.methodCode });
      if (Math.abs(expected.amount - actual.amount) > 0.005)
        mismatches.push({ field: `pagamentos[${index + 1}].valor`, expected: expected.amount, actual: actual.amount });
      if (expected.paymentIndicator !== actual.paymentIndicator)
        mismatches.push({ field: `pagamentos[${index + 1}].indicador`, expected: expected.paymentIndicator || '', actual: actual.paymentIndicator || '' });
      if ((expected.description || '') !== (actual.description || ''))
        mismatches.push({ field: `pagamentos[${index + 1}].descrição`, expected: expected.description || '', actual: actual.description || '' });
      if ((expected.paymentDate || '') !== (actual.paymentDate || ''))
        mismatches.push({ field: `pagamentos[${index + 1}].data`, expected: expected.paymentDate || '', actual: actual.paymentDate || '' });
      if (JSON.stringify(expected.card || null) !== JSON.stringify(actual.card || null))
        mismatches.push({ field: `pagamentos[${index + 1}].cartão`, expected: 'dados do pedido', actual: 'dados divergentes' });
    }
  }

  const orderCustomer = objectValue(snapshot.order.data.customerData);
  const fiscalCustomer = objectValue(snapshot.fiscalInputs?.customer);
  const selectedTaxId = normalizeTaxId(
    String(
      snapshot.emissionRequest.recipientTaxId ??
        orderCustomer.cpfCnpj ??
        fiscalCustomer.cpfCnpj ??
        ''
    )
  );
  const resolvedTaxId = normalizeTaxId(document.recipient.cpfCnpj);
  if (selectedTaxId && selectedTaxId !== resolvedTaxId)
    mismatches.push({ field: 'cliente.CPF_CNPJ', expected: selectedTaxId, actual: resolvedTaxId || '(ausente)' });
  const orderCustomerName = String(orderCustomer.fullName || orderCustomer.name || '').trim();
  if (orderCustomerName && orderCustomerName !== document.recipient.name)
    mismatches.push({ field: 'cliente.nome', expected: orderCustomerName, actual: document.recipient.name });
  const orderCustomerId = String(snapshot.order.data.customerId || orderCustomer.id || '');
  const fiscalCustomerId = String(fiscalCustomer.id || '');
  if (orderCustomerId && fiscalCustomerId && orderCustomerId !== fiscalCustomerId)
    mismatches.push({ field: 'cliente.id', expected: orderCustomerId, actual: fiscalCustomerId });
  if (
    snapshot.emissionRequest.finalConsumer !== undefined &&
    document.operation.finalConsumer !== (snapshot.emissionRequest.finalConsumer ? '1' : '0')
  )
    mismatches.push({
      field: 'operacao.consumidorFinal',
      expected: snapshot.emissionRequest.finalConsumer ? '1' : '0',
      actual: document.operation.finalConsumer,
    });
  if (
    snapshot.emissionRequest.freightMode !== undefined &&
    document.operation.freightMode !== snapshot.emissionRequest.freightMode
  )
    mismatches.push({
      field: 'transporte.modalidadeFrete',
      expected: snapshot.emissionRequest.freightMode,
      actual: document.operation.freightMode,
    });

  const sourceTotal = Number(objectValue(snapshot.order.data.paymentsSummary).totalOrderValue);
  if (Number.isFinite(sourceTotal) && Math.abs(sourceTotal - document.totals.invoice) > 0.005)
    mismatches.push({ field: 'total.valorPedido', expected: sourceTotal, actual: document.totals.invoice });

  if (mismatches.length) throw new FiscalXmlAuditError(mismatches);
}
