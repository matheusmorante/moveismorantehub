export const PaymentDetails = ({ payments = [], totalPaid = 0, amountRemaining = 0 }: { payments?: any[], totalPaid?: number, amountRemaining?: number }) => (
    <section>
        <h3 className="mb-3 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            <i className="bi bi-credit-card-2-front-fill" /> Pagamentos
        </h3>

        {payments.length ? (
            <div className="flex flex-col divide-y divide-slate-100 dark:divide-slate-800">
                {payments.map((payment, index) => (
                    <div key={`${payment.method}-${index}`} className="flex items-center justify-between gap-3 py-2.5">
                        <div className="min-w-0">
                            <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">{payment.method || 'Forma não informada'}</p>
                            {payment.status && <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{payment.status}</p>}
                        </div>
                        <span className="shrink-0 text-sm font-black text-slate-700 dark:text-slate-200">
                            {Number(payment.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                ))}
            </div>
        ) : (
            <p className="py-2 text-xs font-bold text-slate-400">Nenhuma forma de pagamento informada.</p>
        )}

        <div className="flex justify-between items-center pt-3 mt-1 border-t border-slate-200 dark:border-slate-700 text-xs">
            <span className="font-bold text-slate-500">
                Pago: <strong className="text-slate-700 dark:text-slate-200">{Number(totalPaid || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </span>
            <span className="font-bold text-slate-500">
                Em aberto: <strong className="text-slate-700 dark:text-slate-200">{Number(amountRemaining || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong>
            </span>
        </div>
    </section>
);
