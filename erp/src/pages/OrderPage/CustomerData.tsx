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
        <div className="flex flex-col my-2 gap-4 font-sans border border-slate-200 rounded-3xl overflow-hidden shadow-sm bg-white">
            <div className="bg-slate-900 px-6 py-2">
                <span className="text-[9px] font-black uppercase tracking-[0.3em] text-white/70">Dados do Destinatário</span>
            </div>
            
            <div className="px-6 pb-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Nome Completo</span>
                        <span className="text-sm font-bold text-slate-900 leading-tight uppercase">{customerData.fullName}</span>
                    </div>
                    
                    {customerData.phone && (
                        <div className="flex flex-col border-l border-slate-100 pl-6">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">WhatsApp / Telefone</span>
                            <span className="text-sm font-bold text-slate-900">{customerData.phone}</span>
                        </div>
                    )}
                </div>

                {showAddress && (
                    <div className="mt-6 pt-6 border-t border-slate-100 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <div className="flex flex-col lg:col-span-2">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Logradouro</span>
                            <span className="text-sm font-bold text-slate-900 uppercase">
                                {addr.street}{addr.number ? `, ${addr.number}` : ''}
                                {addr.complement && <span className="text-slate-400 ml-2 font-medium">({addr.complement})</span>}
                            </span>
                        </div>
                        
                        {addr.neighborhood && (
                            <div className="flex flex-col border-l border-slate-100 pl-6">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Bairro</span>
                                <span className="text-sm font-bold text-slate-900 uppercase">{addr.neighborhood}</span>
                            </div>
                        )}

                        {addr.city && (
                            <div className="flex flex-col border-l border-slate-100 pl-6">
                                <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Cidade / UF</span>
                                <span className="text-sm font-bold text-slate-900 uppercase">{addr.city}{addr.state ? ` - ${addr.state}` : ''}</span>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
export default CustomerDataInputs