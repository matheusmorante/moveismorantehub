const BudgetPaymentConditions = () => {
    return (
        <div className="space-y-2">
            <div className="text-[11px] font-black uppercase tracking-widest text-slate-400 ml-2">CONDIÇÕES DE PAGAMENTO</div>
            <div className="bg-slate-50 border border-slate-200 rounded-3xl p-5 flex flex-col justify-center gap-4 print-exact-bg">
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 print-exact-bg">
                        <i className="bi bi-credit-card-2-front-fill text-base leading-none"></i>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-0.5">Opções de Parcelamento</h4>
                        <p className="text-xs text-slate-700 leading-normal">
                            Parcelamos em até <strong className="text-indigo-700 font-black">10x sem juros</strong> no <strong className="font-bold text-slate-800">Visa, Master, Elo e Hiper</strong>.
                        </p>
                        <p className="text-[10px] text-slate-500 mt-0.5">
                            * Senff com juros.
                        </p>
                    </div>
                </div>
                <div className="h-[1px] bg-slate-200"></div>
                <div className="flex items-start gap-3">
                    <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 print-exact-bg">
                        <i className="bi bi-cash-coin text-base leading-none"></i>
                    </div>
                    <div>
                        <h4 className="text-[11px] font-black text-slate-800 uppercase tracking-wider mb-0.5">Pagamento à Vista</h4>
                        <p className="text-xs text-slate-700 leading-normal">
                            Desconto especial para pagamento no <strong className="text-emerald-700 font-black">Débito, Pix e Dinheiro</strong>.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BudgetPaymentConditions;
