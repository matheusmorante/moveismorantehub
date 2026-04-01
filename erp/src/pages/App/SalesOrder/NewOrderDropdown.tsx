import { useState, useRef, useEffect } from "react";

type OrderTypeOption = 'sale' | 'pickup' | 'assistance' | 'budget';

interface NewOrderDropdownProps {
    onSelect: (type: OrderTypeOption) => void;
}

const ORDER_OPTIONS: { type: OrderTypeOption; label: string; icon: string; description: string; color: string }[] = [
    {
        type: 'sale',
        label: 'Pedido de Venda',
        icon: 'bi-cart-check-fill',
        description: 'Venda de produtos/serviços para entrega ou retirada',
        color: 'text-blue-600',
    },
    {
        type: 'assistance',
        label: 'Pedido de Assistência',
        icon: 'bi-tools',
        description: 'Atendimento técnico local ou em loja',
        color: 'text-amber-500',
    },
    {
        type: 'budget',
        label: 'Novo Orçamento',
        icon: 'bi-calculator-fill',
        description: 'Criação de orçamento para clientes',
        color: 'text-indigo-600',
    },
];

const NewOrderDropdown = ({ onSelect }: NewOrderDropdownProps) => {
    const [isOpen, setIsOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (e: MouseEvent) => {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setIsOpen(false);
            }
        };
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const handleSelect = (type: OrderTypeOption) => {
        setIsOpen(false);
        onSelect(type);
    };

    return (
        <div className="relative" ref={ref}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-center gap-2 xl:gap-3 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 rounded-xl font-black uppercase tracking-widest text-[10px] sm:text-xs shadow-lg shadow-blue-200 dark:shadow-none transition-all active:scale-95 w-full sm:w-auto"
                title="Criar novo pedido"
            >
                <i className="bi bi-plus-lg text-sm" />
                Novo Pedido
                <i className={`bi bi-chevron-${isOpen ? 'up' : 'down'} text-[10px] opacity-70`} />
            </button>

            {isOpen && (
                <div className="absolute right-0 top-[calc(100%+8px)] w-72 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl shadow-slate-200/60 dark:shadow-none z-50 overflow-hidden animate-slide-up">
                    <div className="p-3 border-b border-slate-50 dark:border-slate-800">
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 px-1">
                            Selecione o tipo de pedido
                        </p>
                    </div>
                    <div className="p-2 flex flex-col gap-1">
                        {ORDER_OPTIONS.map((opt) => (
                            <button
                                key={opt.type}
                                onClick={() => handleSelect(opt.type)}
                                className="w-full flex items-center gap-4 px-4 py-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800 transition-all text-left group active:scale-[0.98]"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 dark:bg-slate-800 group-hover:scale-110 transition-transform ${opt.color}`}>
                                    <i className={`bi ${opt.icon} text-lg`} />
                                </div>
                                <div>
                                    <p className="font-black text-sm text-slate-800 dark:text-slate-100">
                                        {opt.label}
                                    </p>
                                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold">
                                        {opt.description}
                                    </p>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default NewOrderDropdown;
