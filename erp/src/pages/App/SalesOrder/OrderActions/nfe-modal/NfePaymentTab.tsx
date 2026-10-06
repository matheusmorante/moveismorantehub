import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { Payment } from '@/pages/types/payments.type';
import {
  assessOrderPayments,
  classifyOrderPaymentSettlement,
  getOrderFulfillmentPaymentCondition,
  getOrderPaymentActualDate,
  getOrderPaymentDueDate,
  isPromissoryPaymentMethod,
} from '../../../../../../../shared-utils/orderPaymentState';

interface NfePaymentTabProps {
  order: Order;
  itemsTotal: number;
  freightTotal: number;
  discountTotal: number;
  invoiceTotal: number;
}

const formatCurrency = (val: number) => {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(val);
};

const formatDate = (date: string) =>
  new Intl.DateTimeFormat('pt-BR', { timeZone: 'UTC' }).format(new Date(`${date}T00:00:00.000Z`));

const getPaymentMethodIcon = (method: string) => {
  const norm = method.toLowerCase();
  if (norm.includes('pix')) return 'bi-qr-code';
  if (norm.includes('credit') || norm.includes('crédito')) return 'bi-credit-card';
  if (norm.includes('debit') || norm.includes('débito')) return 'bi-credit-card-2-front';
  if (norm.includes('dinheiro') || norm.includes('cash')) return 'bi-cash-coin';
  if (norm.includes('boleto')) return 'bi-upc-scan';
  return 'bi-wallet2';
};

export const NfePaymentTab: React.FC<NfePaymentTabProps> = ({
  order,
  itemsTotal,
  freightTotal,
  discountTotal,
  invoiceTotal,
}) => {
  const payments: Payment[] = order.payments || [];
  const assessment = assessOrderPayments(payments, invoiceTotal);
  const totalPaid = assessment.paidCents / 100;
  const amountRemaining = Math.max(0, assessment.totalCents - assessment.paidCents) / 100;
  const pendingPayments = payments.filter(
    (payment) => classifyOrderPaymentSettlement(payment.status) === 'pending'
  );
  const pendingPromissory = pendingPayments.filter((payment) =>
    isPromissoryPaymentMethod(payment.method)
  );
  const hasFulfillmentPayment =
    amountRemaining > 0 && (pendingPayments.length === 0 || pendingPayments.length > pendingPromissory.length);
  const fulfillmentCondition = hasFulfillmentPayment
    ? getOrderFulfillmentPaymentCondition(order.shipping?.deliveryMethod)
    : undefined;
  const scheduledDueDate = fulfillmentCondition
    ? getOrderPaymentDueDate({}, order.shipping)
    : undefined;
  const promissoryCondition = Array.from(
    new Set(pendingPromissory.map((payment) => payment.method).filter(Boolean))
  ).join(', ');
  const paymentStateLabel = {
    paid: 'Pedido pago',
    partial: 'Pagamento parcial',
    pending: 'Pagamento pendente',
    unconfirmed: 'Confirmar pagamento',
    inconsistent: 'Divergência nos valores',
  }[assessment.state];
  const paymentStateClass =
    assessment.state === 'paid'
      ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
      : assessment.state === 'unconfirmed' || assessment.state === 'inconsistent'
        ? 'bg-red-50 text-red-700 dark:bg-red-950/60 dark:text-red-300'
        : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-200';

  return (
    <div className="space-y-6 animate-in fade-in duration-150">
      {/* Resumo da Composição Financeira da Nota */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100">
              Composição Financeira da Nota Fiscal
            </h4>
          </div>
          <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${paymentStateClass}`}>
            <i className={`bi ${assessment.state === 'paid' ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`} />
            {paymentStateLabel}
          </span>
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-xs dark:border-slate-800 dark:bg-slate-950/40">
          <span className="text-slate-600 dark:text-slate-300">
            Recebido: <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(totalPaid)}</strong>
          </span>
          <span className="text-slate-600 dark:text-slate-300">
            Saldo pendente: <strong className="text-slate-900 dark:text-slate-100">{formatCurrency(amountRemaining)}</strong>
          </span>
          {amountRemaining > 0 && fulfillmentCondition && (
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              {fulfillmentCondition}
              {scheduledDueDate && ` • ${formatDate(scheduledDueDate)}`}
            </span>
          )}
          {amountRemaining > 0 && promissoryCondition && (
            <span className="font-semibold text-amber-700 dark:text-amber-300">
              Condição registrada: {promissoryCondition}
            </span>
          )}
        </div>

        <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-4">
          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Produtos
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
              {formatCurrency(itemsTotal)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Frete
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
              {formatCurrency(freightTotal)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">
              Descontos
            </span>
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 mt-1">
              {formatCurrency(discountTotal)}
            </p>
          </div>

          <div className="p-3 rounded-xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-900">
            <span className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">
              Total da Nota
            </span>
            <p className="text-base font-black text-blue-700 dark:text-blue-300 mt-0.5">
              {formatCurrency(invoiceTotal)}
            </p>
          </div>
        </div>
      </section>

      {assessment.state === 'unconfirmed' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          Há pagamento com status não confirmado. Revise o Pedido de Venda; o backend bloqueará a transmissão até que cada valor esteja marcado como recebido ou pendente.
        </div>
      )}
      {assessment.state === 'inconsistent' && (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800 dark:border-red-900 dark:bg-red-950/30 dark:text-red-200">
          Os valores registrados como recebidos ou pendentes excedem o total da nota, ou há um valor inválido. Revise a composição do Pedido de Venda antes de emitir.
        </div>
      )}
      {pendingPromissory.length > 0 && assessment.unallocatedCents > 0 && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
          As parcelas de promissória registradas não cobrem todo o saldo pendente. Complete a condição no Pedido de Venda antes de emitir.
        </div>
      )}

      {/* Detalhamento dos Meios de Pagamento */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-1">
          Formas de Pagamento Vinculadas ao Pedido
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Formas registradas no Pedido de Venda, separando valores recebidos do saldo pendente.
        </p>

        {payments.length === 0 ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Nenhum recebimento registrado. O saldo será informado como pendente
            {fulfillmentCondition ? ` (${fulfillmentCondition.toLowerCase()})` : ''}.
          </div>
        ) : (
          <div className="space-y-2.5">
            {payments.map((p, idx) => {
              const paymentKey = `payment-${p.method}-${p.amount}-${p.status || 'done'}-${idx}`;
              const settlement = classifyOrderPaymentSettlement(p.status);
              const dueDate =
                settlement === 'pending' ? getOrderPaymentDueDate(p, order.shipping) : undefined;
              const actualDate =
                settlement === 'paid' ? getOrderPaymentActualDate(p) : undefined;
              return (
                <div
                  key={paymentKey}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-100 bg-slate-50/70 hover:bg-slate-50 dark:border-slate-800 dark:bg-slate-950/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-200/80 dark:bg-slate-800 text-slate-700 dark:text-slate-200 flex items-center justify-center">
                      <i className={`bi ${getPaymentMethodIcon(p.method)} text-base`} />
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-800 dark:text-slate-100 capitalize">
                        {p.method}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Status:{' '}
                        <span className="font-semibold text-slate-600 dark:text-slate-300">
                          {p.status || 'Concluído'}
                        </span>
                        {p.fiscalCard?.brand && ` • Bandeira: ${p.fiscalCard.brand}`}
                        {dueDate && ` • Previsto para ${formatDate(dueDate)}`}
                        {actualDate && ` • Recebido em ${formatDate(actualDate)}`}
                      </p>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-sm font-black text-slate-800 dark:text-slate-100">
                      {formatCurrency(Number(p.amount) || 0)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs">
          <span className="font-bold text-slate-600 dark:text-slate-300">
            Total das condições registradas:
          </span>
          <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
            {formatCurrency(payments.reduce((sum, payment) => sum + (Number(payment.amount) || 0), 0))}
          </span>
        </div>
      </section>
    </div>
  );
};
