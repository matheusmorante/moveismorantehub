import CustomerData from "../types/customerData.type"

interface Props {
    customerData: CustomerData;
    isPickup?: boolean;
}

const CustomerDataInputs = ({ customerData, isPickup }: Props) => {
    const addr = customerData.fullAddress || {};
    const hasAnyAddress = !!(addr.street || addr.neighborhood || addr.city);

    // If it's a pickup or COMPLETELY missing address fields, hide the address section.
    const showAddress = !isPickup && hasAnyAddress;

    return (
        <div className="flex flex-col my-1 gap-1 font-sans border-2 border-slate-200 rounded-2xl overflow-hidden shadow-md bg-white">
            <div className="bg-slate-900 px-4 py-0.5">
                <span className="text-[11px] font-black uppercase tracking-[0.3em] text-white/70">Dados do Destinatário</span>
            </div>
            
            <div className="px-4 pb-1 pt-0">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <div className="flex flex-col flex-grow min-w-[200px]">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">Nome Completo</span>
                        <span className="text-lg font-bold text-slate-900 leading-tight uppercase">{customerData.fullName}</span>
                    </div>
                    
                    {customerData.phone && (
                        <div className="flex flex-col border-l border-slate-100 pl-4 min-w-[180px]">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">WhatsApp / Telefone</span>
                            <span className="text-lg font-bold text-slate-900">{customerData.phone}</span>
                        </div>
                    )}
                </div>

                {showAddress && (
                    <div className="mt-1 pt-1 border-t border-slate-100 flex flex-wrap gap-x-6 gap-y-1">
                        <div className="flex flex-col flex-grow min-w-[250px]">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">Logradouro</span>
                            <span className="text-lg font-bold text-slate-900 uppercase">
                                {addr.street}{addr.number ? `, ${addr.number}` : ''}
                                {addr.complement && <span className="text-slate-400 ml-2 font-medium text-sm">({addr.complement})</span>}
                            </span>
                        </div>
                        
                        {addr.neighborhood && (
                            <div className="flex flex-col border-l border-slate-100 pl-4 min-w-[120px]">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">Bairro</span>
                                <span className="text-lg font-bold text-slate-900 uppercase">{addr.neighborhood}</span>
                            </div>
                        )}

                        {addr.city && (
                            <div className="flex flex-col border-l border-slate-100 pl-4 min-w-[150px]">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">Cidade / UF</span>
                                <span className="text-lg font-bold text-slate-900 uppercase">{addr.city}{addr.state ? ` - ${addr.state}` : ''}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
export default CustomerDataInputs