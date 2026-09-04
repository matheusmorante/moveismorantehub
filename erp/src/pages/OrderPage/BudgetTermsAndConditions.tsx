const BudgetTermsAndConditions = () => {
    return (
        <div className="mt-8 pt-6 border-t border-slate-100">
            <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 mb-6 flex items-center gap-4 print-exact-bg">
                <i className="bi bi-info-circle-fill text-amber-500 text-xl"></i>
                <p className="text-[11px] font-black uppercase tracking-tight text-amber-800 leading-tight">
                    Atenção: Os preços e condições descritos nesta proposta são válidos por 7 dias e podem sofrer alterações sem aviso prévio após este período ou em caso de variações de estoque.
                </p>
            </div>

            <div className="space-y-4">
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Termos e Condições</h3>
                <ul className="text-[9px] text-slate-500 space-y-1 font-medium leading-tight list-disc pl-3">
                    <li>Prazo de entrega contado após a confirmação do pedido.</li>
                    <li>O agendamento da entrega ao realizar o pedido pode variar conforme as vagas disponíveis no momento de fazer o pedido. Mas geralmente há vagas entre 1 a 4 dias úteis.</li>
                    <li>A montagem está inclusa apenas nos itens devidamente sinalizados.</li>
                    <li>Este documento não garante reserva de estoque até a efetivação do pedido.</li>
                    <li className="font-bold text-slate-700">Preços sujeitos a alteração sem aviso prévio.</li>
                </ul>
            </div>
        </div>
    );
};

export default BudgetTermsAndConditions;
