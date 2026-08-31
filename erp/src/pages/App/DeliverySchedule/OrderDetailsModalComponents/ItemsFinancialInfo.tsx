import React from "react";

const getOpportunityLabel = (item: any) => {
    const opportunity = item.opportunityName || item.opportunity?.name || item.opportunity;
    return typeof opportunity === 'string' && opportunity.trim() ? opportunity : null;
};

export const ItemsTable = ({ items }: { items: any[] }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
            <i className="bi bi-box-seam-fill" /> Lista de Itens
        </h3>
        <div className="bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800 overflow-x-auto shadow-sm transition-colors duration-300">
            <table className="w-full min-w-[440px] text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Qtd</th>
                        <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Produto</th>
                        <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {items?.map((item: any, idx: number) => {
                        const opportunityLabel = getOpportunityLabel(item);
                        return (
                        <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                            <td className="px-4 sm:px-6 py-4 text-xs font-black text-slate-800 dark:text-slate-200">{item.quantity}x</td>
                            <td className="px-4 sm:px-6 py-4 flex flex-col gap-1 items-start">
                                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.description}</span>
                                {item.variationLabel && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{item.variationLabel}</span>}
                                <div className="flex flex-wrap gap-2 items-center">
                                    {item.condition && item.condition !== 'novo' && (
                                        <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${item.condition === 'novo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' :
                                            item.condition === 'usado' ? 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-900/30' :
                                                'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:text-amber-400 dark:border-amber-900/30'
                                            }`}>
                                            {item.condition}
                                        </span>
                                    )}
                                    {opportunityLabel && (
                                        <span className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300">
                                            {opportunityLabel}
                                        </span>
                                    )}
                                    {item.isAssistanceItem && (
                                        <span className="bg-indigo-50 text-indigo-600 border border-indigo-100 dark:bg-indigo-900/20 dark:text-indigo-400 dark:border-indigo-900/30 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest">
                                            Peça sob Assistência
                                            {item.originalOrderId && ` (#${item.originalOrderId.slice(-5)})`}
                                        </span>
                                    )}
                                    {item.handlingType && (
                                        <div className="flex items-center gap-1.5 mt-2">
                                            <span className="px-2.5 py-1 rounded-xl bg-blue-50 dark:bg-blue-900/30 text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 flex items-center gap-2">
                                                <i className={`bi ${item.handlingType.toLowerCase().includes('montagem') ? 'bi-hammer' : 'bi-box-seam'} text-blue-500`} />
                                                {item.handlingType}
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </td>
                            <td className="px-4 sm:px-6 py-4 text-xs font-black text-slate-800 dark:text-slate-200 text-right">
                                {(item.unitPrice * item.quantity).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </td>
                        </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </section>
);

export const FinancialSummary = ({ itemsSummary, shippingValue, totalValue }: { itemsSummary: any, shippingValue: number, totalValue: number }) => (
    <section>
        <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-5 flex items-center gap-2">
            <i className="bi bi-wallet2" /> Resumo Financeiro
        </h3>
        <div className="bg-slate-900 dark:bg-slate-950 p-8 rounded-[2rem] shadow-xl text-white space-y-4 transition-colors duration-300 border border-transparent dark:border-slate-800">
            <div className="flex justify-between items-center opacity-60">
                <span className="text-[10px] font-black uppercase tracking-widest">Subtotal</span>
                <span className="text-sm font-bold">
                    {itemsSummary?.itemsTotalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
            <div className="flex justify-between items-center opacity-60">
                <span className="text-[10px] font-black uppercase tracking-widest">Frete</span>
                <span className="text-sm font-bold">
                    {shippingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
            <div className="h-px bg-white/10 my-4"></div>
            <div className="flex justify-between items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400">Total Geral</span>
                <span className="text-2xl font-black text-blue-400">
                    {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </span>
            </div>
        </div>
    </section>
);

export const PaymentDetails = ({ payments = [], totalPaid = 0, amountRemaining = 0 }: { payments?: any[], totalPaid?: number, amountRemaining?: number }) => (
    <section>
        <h3 className="mb-5 flex items-center gap-2 text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400">
            <i className="bi bi-credit-card-2-front-fill" /> Pagamentos
        </h3>
        <div className="space-y-2 rounded-3xl border border-slate-100 bg-slate-50/50 p-4 dark:border-slate-800 dark:bg-slate-800/20 sm:p-5">
            {payments.length ? payments.map((payment, index) => (
                <div key={`${payment.method}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 dark:bg-slate-900">
                    <div className="min-w-0">
                        <p className="truncate text-xs font-black text-slate-700 dark:text-slate-200">{payment.method || 'Forma não informada'}</p>
                        <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{payment.status || 'Registrado'}</p>
                    </div>
                    <span className="shrink-0 text-sm font-black text-slate-700 dark:text-slate-200">{Number(payment.amount || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</span>
                </div>
            )) : <p className="py-2 text-xs font-bold text-slate-400">Nenhuma forma de pagamento informada.</p>}
            <div className="grid grid-cols-2 gap-3 border-t border-slate-200 pt-3 text-xs dark:border-slate-700">
                <span className="font-bold text-slate-500">Pago: <strong className="text-slate-700 dark:text-slate-200">{Number(totalPaid || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
                <span className="text-right font-bold text-slate-500">Em aberto: <strong className="text-slate-700 dark:text-slate-200">{Number(amountRemaining || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}</strong></span>
            </div>
        </div>
    </section>
);
