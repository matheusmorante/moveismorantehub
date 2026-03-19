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
        <div className="flex flex-wrap my-6 gap-x-8 gap-y-3 font-sans">
            <div className="flex items-center gap-2">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Nome Completo:</span>
                <span className="text-sm font-bold text-slate-800">{customerData.fullName}</span>
            </div>
            
            {customerData.phone && (
                <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Celular:</span>
                    <span className="text-sm font-bold text-slate-800">{customerData.phone}</span>
                </div>
            )}

            {showAddress && (
                <div className="flex flex-wrap gap-x-8 gap-y-3 w-full animate-fade-in pt-2 border-t border-slate-50 dark:border-slate-800/50">
                    {addr.street && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Endereço:</span>
                            <span className="text-sm font-bold text-slate-800">{addr.street}{addr.number ? `, ${addr.number}` : ''}</span>
                        </div>
                    )}
                    
                    {addr.neighborhood && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Bairro:</span>
                            <span className="text-sm font-bold text-slate-800">{addr.neighborhood}</span>
                        </div>
                    )}

                    {addr.city && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Cidade:</span>
                            <span className="text-sm font-bold text-slate-800">{addr.city}</span>
                        </div>
                    )}

                    {addr.complement && (
                        <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Compl.:</span>
                            <span className="text-sm font-bold text-slate-800">{addr.complement}</span>
                        </div>
                    )}
                </div>
            )}

            <style dangerouslySetInnerHTML={{ __html: `.animate-fade-in { animation: fadeIn 0.4s ease-out forwards; } @keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }` }} />
        </div>
    )
}
export default CustomerDataInputs