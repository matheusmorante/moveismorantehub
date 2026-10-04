import type React from 'react';
import type Order from '@/pages/types/order.type';
import type { Payment } from '@/pages/types/payments.type';

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
  const totalPaid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  const diff = Math.abs(totalPaid - invoiceTotal);
  const isReconciled = diff < 0.01;

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
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
              isReconciled
                ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/60 dark:text-emerald-300'
                : 'bg-amber-50 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300'
            }`}
          >
            <i
              className={`bi ${isReconciled ? 'bi-check-circle-fill' : 'bi-exclamation-circle-fill'}`}
            />
            {isReconciled ? 'Pagamentos Reconciliados' : 'Divergência de Pagamento'}
          </span>
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

      {/* Detalhamento dos Meios de Pagamento */}
      <section className="rounded-2xl border border-slate-200 bg-white p-5 dark:border-slate-800 dark:bg-slate-900 shadow-sm">
        <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 dark:text-slate-100 mb-1">
          Formas de Pagamento Vinculadas ao Pedido
        </h4>
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
          Discriminação dos meios de pagamento utilizados para liquidação do pedido.
        </p>

        {payments.length === 0 ? (
          <div className="p-4 rounded-xl border border-amber-200 bg-amber-50 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
            Nenhum pagamento registrado no pedido. A emissão fiscal exige meios de pagamento
            válidos.
          </div>
        ) : (
          <div className="space-y-2.5">
            {payments.map((p, idx) => {
              const paymentKey = `payment-${p.method}-${p.amount}-${p.status || 'done'}-${idx}`;
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
            Total dos Pagamentos Registrados:
          </span>
          <span className="font-black text-slate-900 dark:text-slate-100 text-sm">
            {formatCurrency(totalPaid)}
          </span>
        </div>
      </section>
    </div>
  );
};
