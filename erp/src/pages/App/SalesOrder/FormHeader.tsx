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
    currentOrderId
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

                {(currentOrder || currentOrderId) && (
                    <button
                        onClick={(e) => {
                            e.preventDefault();
                            onClearForm();
                        }}
                        className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all hover:bg-blue-50 dark:hover:bg-blue-900/20 active:scale-95 shadow-sm"
                    >
                        <i className="bi bi-plus-lg" /> Novo Pedido
                    </button>
                )}
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
