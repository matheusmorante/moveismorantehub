import React from "react";

interface OrderCustomerSearchBarProps {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    className?: string;
}

export const OrderCustomerSearchBar: React.FC<OrderCustomerSearchBarProps> = ({
    value,
    onChange,
    placeholder = "Buscar pedido pelo nome do cliente...",
    className = ""
}) => {
    return (
        <div className={`relative flex items-center w-full ${className}`}>
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 dark:text-slate-500 pointer-events-none flex items-center">
                <i className="bi bi-search text-sm" />
            </div>

            <input
                type="text"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                placeholder={placeholder}
                className="w-full pl-10 pr-10 py-2.5 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-2xl text-xs font-bold text-slate-800 dark:text-slate-100 placeholder-slate-400 dark:placeholder-slate-500 shadow-sm focus:outline-none focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/10 transition-all"
            />

            {value && (
                <button
                    type="button"
                    onClick={() => onChange("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                    title="Limpar busca de cliente"
                >
                    <i className="bi bi-x-lg text-xs" />
                </button>
            )}
        </div>
    );
};

export default OrderCustomerSearchBar;
