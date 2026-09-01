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
            <table className="w-full min-w-[620px] text-left border-collapse">
                <thead>
                    <tr className="bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-800">
                        <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 w-16">Qtd</th>
                        <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Produto</th>
                        <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Valor Unitário</th>
                        <th className="px-4 sm:px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 text-right">Total do Item</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                    {items?.map((item: any, idx: number) => {
                        const opportunityLabel = getOpportunityLabel(item);
                        const qty = Number(item.quantity) || 1;
                        const unitPrice = Number(item.unitPrice) || 0;
                        const rawDiscount = Number(item.unitDiscount) || 0;
                        const isPercentage = item.discountType === 'percentage';
                        const fixedUnitDiscount = isPercentage ? (unitPrice * rawDiscount) / 100 : rawDiscount;
                        const hasDiscount = fixedUnitDiscount > 0;
                        const unitPriceWithDiscount = Math.max(0, unitPrice - fixedUnitDiscount);
                        const grossTotal = unitPrice * qty;
                        const netTotal = unitPriceWithDiscount * qty;
                        const totalDiscount = fixedUnitDiscount * qty;

                        return (
                            <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                <td className="px-4 sm:px-6 py-4 text-xs font-black text-slate-800 dark:text-slate-200 align-top">
                                    <span className="inline-block bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                        {qty}x
                                    </span>
                                </td>
                                <td className="px-4 sm:px-6 py-4 flex flex-col gap-1 items-start align-top">
                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">{item.description}</span>
                                    {item.variationLabel && <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500">{item.variationLabel}</span>}
                                    <div className="flex flex-wrap gap-2 items-center mt-1">
                                        {item.condition && item.condition !== 'novo' && (
                                            <span className={`flex items-center gap-1 px-2 py-0.5 rounded-lg text-[8px] font-black uppercase tracking-widest border transition-all ${
                                                item.condition === 'novo' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900/30' :
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
                                            <div className="flex items-center gap-1.5">
                                                <span className="px-2 py-0.5 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-[9px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400 border border-blue-100/50 dark:border-blue-900/30 flex items-center gap-1.5">
                                                    <i className={`bi ${item.handlingType.toLowerCase().includes('montagem') ? 'bi-hammer' : 'bi-box-seam'} text-blue-500 text-[10px]`} />
                                                    {item.handlingType}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </td>

                                {/* Valor Unitário (Preço anterior tachado e novo) */}
                                <td className="px-4 sm:px-6 py-4 text-right align-top">
                                    {hasDiscount ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[11px] line-through text-slate-400 dark:text-slate-500">
                                                {unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                {unitPriceWithDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                                            {unitPrice.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    )}
                                </td>

                                {/* Total do Item (Total anterior tachado e novo) */}
                                <td className="px-4 sm:px-6 py-4 text-right align-top">
                                    {hasDiscount ? (
                                        <div className="flex flex-col items-end">
                                            <span className="text-[11px] line-through text-slate-400 dark:text-slate-500">
                                                {grossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                            <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                                {netTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                            </span>
                                        </div>
                                    ) : (
                                        <span className="text-xs font-black text-slate-800 dark:text-slate-200">
                                            {grossTotal.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                        </span>
                                    )}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    </section>
);

export const FinancialSummary = ({ itemsSummary, shippingValue, totalValue }: { itemsSummary: any, shippingValue: number, totalValue: number }) => {
    const totalDiscount = Number(itemsSummary?.totalFixedDiscount) || 0;
    const subtotalBruto = Number(itemsSummary?.itemsSubtotal) || (Number(itemsSummary?.itemsTotalValue) + totalDiscount) || 0;

    return (
        <section className="-mt-2">
            <div className="bg-slate-50/70 dark:bg-slate-800/30 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 sm:p-5 transition-colors duration-300">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="flex flex-wrap items-center gap-6 sm:gap-8 text-xs">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Subtotal Itens</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                {subtotalBruto.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>

                        {totalDiscount > 0 && (
                            <div>
                                <span className="text-[9px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400 block mb-0.5">Desconto</span>
                                <span className="font-black text-emerald-600 dark:text-emerald-400">
                                    - {totalDiscount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                                </span>
                            </div>
                        )}

                        <div>
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 block mb-0.5">Frete</span>
                            <span className="font-bold text-slate-700 dark:text-slate-200">
                                {shippingValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                            </span>
                        </div>
                    </div>

                    <div className="flex items-center gap-3 border-t sm:border-t-0 sm:border-l border-slate-200 dark:border-slate-700 pt-3 sm:pt-0 sm:pl-6">
                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">Total Geral</span>
                        <span className="text-xl sm:text-2xl font-black text-blue-600 dark:text-blue-400">
                            {totalValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                        </span>
                    </div>
                </div>
            </div>
        </section>
    );
};

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
