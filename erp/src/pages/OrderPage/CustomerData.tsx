import CustomerData from "../types/customerData.type"

interface Props {
    customerData: CustomerData;
    isPickup?: boolean;
    noAddress?: boolean;
}

const CustomerDataInputs = ({ customerData, isPickup, noAddress }: Props) => {
    const addr = customerData.fullAddress || {};
    const hasAnyAddress = !!(addr.street || addr.neighborhood || addr.city);

    // If it's a pickup, explicitly marked as noAddress, or COMPLETELY missing address fields, hide the address section.
    const showAddress = !isPickup && !noAddress && hasAnyAddress;

    return (
        <div className="flex flex-col my-2 gap-2 font-sans border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm bg-white print-exact-bg">
            <div className="bg-slate-50 border-b border-slate-100 px-6 py-2 flex items-center gap-2">
                <i className="bi bi-person-circle text-slate-400"></i>
                <span className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-500">Informações do Cliente / Destinatário</span>
            </div>
            
            <div className="px-6 pb-4 pt-2">
                <div className="flex flex-wrap gap-x-6 gap-y-1">
                    <div className="flex flex-col flex-grow min-w-[200px]">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">Nome Completo</span>
                        <span className="text-lg font-bold text-slate-900 leading-tight uppercase">{customerData.fullName}</span>
                    </div>
                    
                    <div className="flex flex-wrap gap-x-6 gap-y-2">
                        {customerData.phone && !customerData.noPhone && (
                            <div className="flex flex-col border-l border-slate-100 pl-4 min-w-[150px]">
                                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-0.5 leading-none">WhatsApp / Principal</span>
                                <span className="text-lg font-bold text-slate-900">{customerData.phone}</span>
                            </div>
                        )}

                        {(customerData.additionalContacts || []).map((contact, idx) => (
                            <div key={idx} className="flex flex-col">
                                <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">
                                    {contact.name || 'Contato Extra'}
                                </span>
                                <span className="text-base font-medium text-slate-800">{contact.phone}</span>
                            </div>
                        ))}
                    </div>
                </div>

                {showAddress && (
                    <div className="pt-4 border-t border-slate-50 flex flex-wrap gap-x-8 gap-y-4">
                        <div className="flex flex-col">
                            <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider mb-0.5">Endereço</span>
                            <span className="text-base font-medium text-slate-800">
                                {addr.street}{addr.number ? `, ${addr.number}` : ''}
                                {addr.complement && <span className="text-slate-400 ml-2 font-normal">({addr.complement})</span>}
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

                {customerData.observations && (
                    <div className="mt-1 pt-1 border-t border-slate-100 italic">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-widest block mb-0.5">OBSERVAÇÕES SOBRE O CLIENTE:</span>
                        <p className="text-sm font-bold text-slate-800 uppercase leading-snug">
                            {customerData.observations}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
export default CustomerDataInputs