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
        <div className="flex flex-wrap my-4 gap-x-10 gap-y-4 font-sans bg-slate-50 dark:bg-slate-800/40 p-5 rounded-3xl border border-slate-100 dark:border-slate-800">
            <div className="flex flex-col">
                <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Cliente</span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{customerData.fullName}</span>
            </div>
            
            {customerData.phone && (
                <div className="flex flex-col">
                    <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">WhatsApp</span>
                    <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{customerData.phone}</span>
                </div>
            )}

            {showAddress && (
                <div className="flex flex-wrap gap-x-10 gap-y-4 w-full pt-4 border-t border-slate-200/50 dark:border-slate-700/50">
                    <div className="flex flex-col">
                        <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Logradouro</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{addr.street}{addr.number ? `, ${addr.number}` : ''}</span>
                    </div>
                    
                    {addr.neighborhood && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Bairro</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{addr.neighborhood}</span>
                        </div>
                    )}

                    {addr.city && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Cidade</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{addr.city}</span>
                        </div>
                    )}

                    {addr.complement && (
                        <div className="flex flex-col">
                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-1 leading-none">Compl.</span>
                            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">{addr.complement}</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    )
}
export default CustomerDataInputs