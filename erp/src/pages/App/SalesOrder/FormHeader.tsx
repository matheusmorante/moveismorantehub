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
                    <h1 className="text-xl font-black text-slate-800 dark:text-slate-100 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-blue-600 flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                            <i className="bi bi-receipt" />
                        </div>
                        {currentOrderId ? `Editar Pedido #${currentOrderId.slice(-4).toUpperCase()}` : "Novo Pedido de Venda"}
                    </h1>
                </div>

                <div className="h-10 w-px bg-slate-100 dark:bg-slate-800 hidden md:block mx-2" />

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
                {/* Seller Selection */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className={`bi bi-person-badge ${errors['seller'] ? 'text-red-500' : 'text-blue-500'} text-xs`} />
                    </div>
                    <input
                        type="text"
                        value={seller}
                        onChange={(e) => setSeller(e.target.value)}
                        onFocus={() => setShowSellers(true)}
                        onBlur={() => setTimeout(() => setShowSellers(false), 200)}
                        placeholder="Vendedor"
                        className={`pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-2 ${errors['seller'] ? 'border-red-500/50' : 'border-transparent'} focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all group-hover:bg-slate-200 dark:group-hover:bg-slate-700 min-w-[200px]`}
                    />
                    {showSellers && employeeNames.length > 0 && (
                        <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2">
                            {employeeNames.filter(n => n.toLowerCase().includes(seller.toLowerCase())).map(name => (
                                <button
                                    key={name}
                                    type="button"
                                    onClick={() => setSeller(name)}
                                    className="w-full text-left px-4 py-3 text-xs font-bold hover:bg-blue-50 dark:hover:bg-blue-900/20 text-slate-700 dark:text-slate-300 border-b border-slate-50 dark:border-slate-800 last:border-0 transition-colors"
                                >
                                    {name}
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Date/Time Selection */}
                <div className="relative group">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <i className="bi bi-calendar-event text-blue-500 text-xs" />
                    </div>
                    <input
                        type="datetime-local"
                        value={orderDate}
                        onChange={(e) => setOrderDate(e.target.value)}
                        className="pl-9 pr-4 py-2 bg-slate-100 dark:bg-slate-800 border-transparent focus:ring-2 focus:ring-blue-500/20 rounded-xl text-xs font-bold text-slate-700 dark:text-slate-200 outline-none transition-all group-hover:bg-slate-200 dark:group-hover:bg-slate-700"
                    />
                </div>

                {isSavingDraft && (
                    <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 rounded-full animate-pulse border border-slate-200/50 dark:border-slate-700/50">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                        <span className="text-[9px] font-black uppercase text-slate-500 tracking-widest uppercase">Salvando...</span>
                    </div>
                )}
            </div>
        </div>
    );
};

export default FormHeader;
