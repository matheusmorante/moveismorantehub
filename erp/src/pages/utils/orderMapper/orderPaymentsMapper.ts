import { isPaidOrderPayment } from '../../../../../shared-utils/orderPaymentState';
import { OrderDatabaseRow } from './orderMapperTypes';

export interface MappedPaymentsResult {
  payments: any[];
  paymentsSummary: {
    totalOrderValue: number;
    totalItemsCost: number;
    itemsSubtotal: number;
    totalFixedDiscount: number;
    itemsTotalValue: number;
    totalAmountPaid: number;
    amountRemaining: number;
    totalPaymentsFee: number;
  };
}

export function mapPaymentsAndSummary(
  row: OrderDatabaseRow,
  rawLegacy: any,
  totalAmount: number
): MappedPaymentsResult {
  // Pagamentos: Prioriza tabela normalizada order_payments, com fallback para o JSON legado.
  let payments: any[] = [];
  if (Array.isArray(row.order_payments) && row.order_payments.length > 0) {
    payments = row.order_payments.map((p: any) => ({
      method: p.payment_method || p.method || '',
      amount: Number(p.amount || 0),
      fee: Number(p.fee || 0),
      feeType: p.fee_type || p.feeType || 'fixed',
      status: p.status || 'PAGO',
      installments: p.installments != null ? Number(p.installments) : 1,
    }));
  } else if (Array.isArray(rawLegacy.payments) && rawLegacy.payments.length > 0) {
    payments = rawLegacy.payments;
  }

  const paymentTotals = payments.reduce(
    (totals, payment) => {
      const amount = Number(payment.amount || 0);
      const fee = Number(payment.fee || 0);
      const feeAmount = payment.feeType === 'percentage' ? (amount * fee) / 100 : fee;
      return {
        paid: totals.paid + (isPaidOrderPayment(payment.status) ? amount + feeAmount : 0),
        fee: totals.fee + feeAmount,
      };
    },
    { paid: 0, fee: 0 }
  );

  // Resumo de pagamentos
  const legacySummary = rawLegacy.paymentsSummary || {};
  const paymentsSummary = {
    totalOrderValue: totalAmount,
    totalItemsCost:
      row.total_cost != null ? Number(row.total_cost) : (legacySummary.totalItemsCost ?? 0),
    itemsSubtotal:
      row.items_subtotal != null
        ? Number(row.items_subtotal)
        : (legacySummary.itemsSubtotal ?? totalAmount),
    totalFixedDiscount:
      row.total_discount != null
        ? Number(row.total_discount)
        : (legacySummary.totalFixedDiscount ?? 0),
    itemsTotalValue: totalAmount,
    totalAmountPaid: paymentTotals.paid,
    amountRemaining: Math.max(0, totalAmount - paymentTotals.paid),
    totalPaymentsFee: legacySummary.totalPaymentsFee ?? paymentTotals.fee,
  };

  return { payments, paymentsSummary };
}
