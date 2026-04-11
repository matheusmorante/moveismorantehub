import CustomerData from "../types/customerData.type"

interface Props {
    customerData: CustomerData;
    isPickup?: boolean;
}

const CustomerDataInputs = ({ customerData, isPickup }: Props) => {
    const addr = customerData.fullAddress || {};
    const hasAnyAddress = !!(addr.street || addr.neighborhood || addr.city);
    const showAddress = !isPickup && hasAnyAddress;

    return (
        <section className="my-4">
            <h2 className="text-[10px] font-black uppercase text-slate-400 tracking-[0.2em] mb-2 flex items-center gap-3 after:h-[1px] after:bg-slate-100 after:flex-1">Informações do Cliente</h2>
            <div className="flex flex-wrap gap-y-3 gap-x-10">
                <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cliente</span>
                    <span className="text-sm font-black text-slate-800 uppercase tracking-tight">{customerData.fullName}</span>
                </div>
                
                {customerData.phone && (
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Contato</span>
                        <span className="text-sm font-black text-slate-800">{customerData.phone}</span>
                    </div>
                )}

                {customerData.cpfCnpj && (
                    <div className="flex flex-col">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Documento</span>
                        <span className="text-sm font-black text-slate-800">{customerData.cpfCnpj}</span>
                    </div>
                )}
            </div>

            {showAddress && (
                <div className="mt-4 pt-4 border-t border-slate-50 flex flex-wrap gap-y-3 gap-x-8 animate-fade-in">
                    {addr.street && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Endereço</span>
                            <span className="text-sm font-bold text-slate-800">{addr.street}{addr.number ? `, ${addr.number}` : ''}</span>
                        </div>
                    )}
                    
                    {addr.neighborhood && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Bairro</span>
                            <span className="text-sm font-bold text-slate-800">{addr.neighborhood}</span>
                        </div>
                    )}

                    {addr.city && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Cidade</span>
                            <span className="text-sm font-bold text-slate-800">{addr.city}</span>
                        </div>
                    )}

                    {addr.complement && (
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider">Complemento</span>
                            <span className="text-sm font-bold text-slate-800">{addr.complement}</span>
                        </div>
                    )}
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }` }} />
        </section>
    )
}
export default CustomerDataInputs