import React from 'react';
import { useNavigate } from 'react-router-dom';

interface Action {
    id: string;
    label: string;
    icon: string;
    href: string;
    color: string;
}

const ACTIONS: Action[] = [
    { id: 'new-sale', label: 'Nova Venda', icon: 'bi-cart-plus-fill', href: '/sales-order', color: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40 hover:bg-blue-100 dark:hover:bg-blue-900/50' },
    { id: 'new-receipt', label: 'Recebimento', icon: 'bi-box-arrow-in-down', href: '/stock/receipts', color: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50' },
    { id: 'new-product', label: 'Novo Produto', icon: 'bi-box2-fill', href: '/registrations/products', color: 'text-violet-600 bg-violet-50 dark:bg-violet-950/40 hover:bg-violet-100 dark:hover:bg-violet-900/50' },
    { id: 'schedule', label: 'Cronograma', icon: 'bi-calendar3-week-fill', href: '/delivery-schedule', color: 'text-teal-600 bg-teal-50 dark:bg-teal-950/40 hover:bg-teal-100 dark:hover:bg-teal-900/50' },
    { id: 'inventory', label: 'Inventário', icon: 'bi-clipboard2-check-fill', href: '/stock', color: 'text-amber-600 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 dark:hover:bg-amber-900/50' },
];

const QuickActions: React.FC = () => {
    const navigate = useNavigate();
    return (
        <div className="flex items-center gap-2 flex-wrap">
            {ACTIONS.map(a => (
                <button
                    key={a.id}
                    id={`quick-action-${a.id}`}
                    onClick={() => navigate(a.href)}
                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${a.color}`}
                >
                    <i className={`bi ${a.icon} text-sm`} />
                    <span className="hidden sm:inline">{a.label}</span>
                </button>
            ))}
        </div>
    );
};

export default QuickActions;
