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
