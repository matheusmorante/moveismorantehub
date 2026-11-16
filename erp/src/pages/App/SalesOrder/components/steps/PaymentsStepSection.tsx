import React from 'react';
import SectionCard from '@/components/SectionCard';
import PaymentsTable from '../../PaymentsTable/Index';
import { useSalesOrderForm } from '../../hooks/useSalesOrderForm';

type FormInstance = ReturnType<typeof useSalesOrderForm>;

interface PaymentsStepSectionProps {
  form: FormInstance;
  isBudget: boolean;
}

export const PaymentsStepSection: React.FC<PaymentsStepSectionProps> = ({
  form,
  isBudget,
}) => {
  const { state, actions } = form;
  const paymentsError = state.errors.payments_summary;

  return (
    <div className="max-w-5xl mx-auto animate-fade-in">
      <SectionCard
        icon={isBudget ? 'bi bi-calculator' : 'bi bi-credit-card-2-front'}
        iconBg="bg-indigo-600 shadow-indigo-100 dark:shadow-indigo-900/20"
        title="Pagamentos"
        action={
          <button
            type="button"
            onClick={() =>
              actions.setPayments((payments) => [
                ...payments,
                {
                  method: '',
                  amount: 0,
                  fee: 0,
                  feeType: 'fixed',
                  status: '',
                },
              ])
            }
            aria-invalid={Boolean(paymentsError && state.payments.length === 0)}
            aria-describedby={paymentsError ? 'payments-summary-error' : undefined}
            className={`flex items-center gap-2 rounded-xl bg-indigo-600 px-3 py-2 text-[10px] font-black uppercase tracking-wider text-white transition-all hover:bg-indigo-700 active:scale-95 ${paymentsError && state.payments.length === 0 ? 'ring-2 ring-red-500 ring-offset-2 dark:ring-offset-slate-900' : ''}`}
          >
            <i className="bi bi-plus-lg" />
            <span className="hidden sm:inline">Adicionar pagamento</span>
          </button>
        }
      >
        <div className={`overflow-x-auto rounded-3xl border bg-white transition-colors duration-300 dark:bg-slate-900 ${paymentsError ? 'border-red-300 dark:border-red-800' : 'border-slate-100 dark:border-slate-800'}`}>
          {paymentsError && (
            <p id="payments-summary-error" role="alert" className="border-b border-red-200 bg-red-50 px-4 py-3 text-xs font-bold text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
              {paymentsError}
            </p>
          )}
          {isBudget && state.payments.length === 0 && (
            <div className="p-8 bg-slate-50/50 dark:bg-slate-800/30 border-b border-slate-100 dark:border-slate-800 flex flex-col items-center gap-4 text-center">
              <div className="flex flex-col gap-1">
                <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest">
                  Apenas orçamento de valores?
                </p>
                <p className="text-[11px] text-slate-400 font-medium">
                  Você pode pular esta etapa se não precisar definir as formas de pagamento agora.
                </p>
              </div>
              <button
                type="button"
                onClick={actions.goToNextStep}
                className="px-6 py-2.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-indigo-200 transition-all flex items-center gap-3 shadow-sm hover:shadow-md active:scale-95"
              >
                <i className="bi bi-fast-forward-fill text-sm" /> Não Informar Pagamento / Ir para
                Resumo
              </button>
            </div>
          )}
          <PaymentsTable
            payments={state.payments}
            setPayments={actions.setPayments}
            summary={state.paymentsSummary}
            errors={state.errors}
            deliveryMethod={state.shipping.deliveryMethod}
          />
        </div>
      </SectionCard>
    </div>
  );
};
