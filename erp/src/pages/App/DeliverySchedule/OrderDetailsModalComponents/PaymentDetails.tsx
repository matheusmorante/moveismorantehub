import type { Payment } from '../../../types/payments.type';
import { getFixedFee } from '../../../utils/calculations';

const formatCurrency = (value: number) =>
  Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const getPaymentFeeAmount = (payment: Payment) =>
  Number(
    getFixedFee({
      ...payment,
      amount: Number(payment.amount) || 0,
      feeType: payment.feeType || 'fixed',
    })
  ) || 0;

const getTotalPaymentsFee = (payments: Payment[]) =>
  payments.reduce((total, payment) => total + getPaymentFeeAmount(payment), 0);

const PaymentAmount = ({ payment }: { payment: Payment }) => {
  const amount = Number(payment.amount) || 0;
  const feeAmount = getPaymentFeeAmount(payment);

  return (
    <div className="flex min-w-0 flex-1 flex-wrap items-baseline justify-end gap-x-2 text-right">
      <span className="text-sm font-black text-slate-700 dark:text-slate-200">
        {formatCurrency(amount)}
      </span>
      {feeAmount > 0 && (
        <span className="text-[10px] font-semibold text-slate-500 dark:text-slate-400">
          Taxa: {formatCurrency(feeAmount)} · Total com taxa:{' '}
          <strong className="text-slate-700 dark:text-slate-200">
            {formatCurrency(amount + feeAmount)}
          </strong>
        </span>
      )}
    </div>
  );
};

export const PaymentDetails = ({
  payments = [],
  totalPaid = 0,
  amountRemaining = 0,
}: {
  payments?: Payment[];
  totalPaid?: number;
  amountRemaining?: number;
}) => (
  <section>
    <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
      <i className="bi bi-credit-card-2-front-fill" /> Pagamentos
    </h3>

    {payments.length ? (
      <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
        {payments.map((payment, index) => (
          <div
            key={`${payment.method}-${index}`}
            className="flex items-center justify-between gap-3 py-2.5"
          >
            <div className="min-w-0">
              <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">
                {payment.method || 'Forma não informada'}
              </p>
              {payment.status && (
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                  {payment.status}
                </p>
              )}
            </div>
            <PaymentAmount payment={payment} />
          </div>
        ))}
      </div>
    ) : (
      <p className="py-2 text-xs font-bold text-slate-400">Nenhuma forma de pagamento informada.</p>
    )}

    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 text-xs">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 font-bold text-slate-500">
        {getTotalPaymentsFee(payments) > 0 && (
          <span>
            Taxas:{' '}
            <strong className="text-slate-700 dark:text-slate-200">
              {formatCurrency(getTotalPaymentsFee(payments))}
            </strong>
          </span>
        )}
        <span>
          Pago:{' '}
          <strong className="text-slate-700 dark:text-slate-200">
            {formatCurrency(totalPaid)}
          </strong>
        </span>
      </div>
      <span className="font-bold text-slate-500">
        Em aberto:{' '}
        <strong className="text-slate-700 dark:text-slate-200">
          {formatCurrency(amountRemaining)}
        </strong>
      </span>
    </div>
  </section>
);
