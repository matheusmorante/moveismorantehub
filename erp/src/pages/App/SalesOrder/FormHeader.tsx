import React from "react";
import Order from "../../types/order.type";
import { subscribeToPeople } from "../../utils/personService";

interface FormHeaderProps {
    currentOrder?: Order | null;
    onClearForm: () => void;
    currentOrderId?: string | null;
    orderDate: string;
    setOrderDate: (date: string) => void;
    seller: string;
    setSeller: (seller: string) => void;
    isSavingDraft: boolean;
    errors: Record<string, string>;
    deliveryMethod: 'delivery' | 'pickup';
    setDeliveryMethod: (method: 'delivery' | 'pickup') => void;
}

const FormHeader = ({ 
    currentOrder, 
    onClearForm, 
    orderDate, 
    setOrderDate, 
    seller, 
    setSeller, 
    isSavingDraft,
    errors,
    currentOrderId,
    deliveryMethod,
    setDeliveryMethod
}: FormHeaderProps) => {
    const [employeeNames, setEmployeeNames] = React.useState<string[]>([]);
    const [showSellers, setShowSellers] = React.useState(false);

    React.useEffect(() => {
        const unsubscribe = subscribeToPeople('employees', (people) => {
            const names = people
                .map(p => p.fullName)
                .filter(name => name && name.trim() !== "");
            setEmployeeNames(names);
        });
        return unsubscribe;
    }, []);

    return (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pb-6 border-b border-slate-100 dark:border-slate-800 mb-8 pt-4">
            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto">
                <div className="flex flex-col gap-1">
                    {/* Title removed as requested, now in Modal Header */}
                </div>

                {currentOrderId && (
                    <div className="flex items-center gap-3">
                        <div className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-lg text-[10px] font-black uppercase tracking-widest border border-blue-100 dark:border-blue-800">
                             #{currentOrderId.slice(-4).toUpperCase()}
                        </div>
                    </div>
                )}

                <div className="flex bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl border border-slate-200 dark:border-slate-700/50">
                    <button
                        type="button"
                        onClick={() => setDeliveryMethod('delivery')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'delivery'
                            ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/20'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        <i className="bi bi-truck text-xs" /> Entrega
                    </button>
                    <button
                        type="button"
                        onClick={() => setDeliveryMethod('pickup')}
                        className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${deliveryMethod === 'pickup'
                            ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
                            : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                            }`}
                    >
                        <i className="bi bi-hand-index-thumb-fill text-xs" /> Retirada
                    </button>
                </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 w-full md:w-auto justify-end">
                {/* Internal status/saving indicators only */}
                {isSavingDraft && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse border border-slate-200/50 dark:border-slate-700/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest">Salvando...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormHeader;
