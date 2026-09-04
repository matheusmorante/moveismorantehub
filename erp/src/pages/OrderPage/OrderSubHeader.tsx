interface OrderSubHeaderProps {
    seller?: string;
    isBudget: boolean;
}

const OrderSubHeader = ({ seller, isBudget }: OrderSubHeaderProps) => {
    return (
        <div className="flex justify-between items-center px-4 py-1 bg-slate-50 rounded-2xl border border-slate-100 mb-2 print-exact-bg">
            <div className="flex items-center gap-2">
                <i className="bi bi-person-badge text-slate-400 text-base"></i>
                <span className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-400">Atendente:</span>
                <span className="text-sm font-black text-slate-800 ml-1 uppercase">{seller || "Não Informado"}</span>
            </div>
            {isBudget && (
                <div className="flex items-center gap-2">
                    <span className="text-[11px] font-black uppercase tracking-[0.2em] text-indigo-500">Validade:</span>
                    <span className="text-sm font-black text-slate-800 ml-1">7 DIAS CORRIDOS APÓS A DATA DE EMISSÃO</span>
                </div>
            )}
        </div>
    );
};

export default OrderSubHeader;
