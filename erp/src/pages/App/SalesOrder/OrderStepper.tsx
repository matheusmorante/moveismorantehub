import React from "react";

interface Step {
    step: number;
    icon: string;
    label: string;
}

interface OrderStepperProps {
    currentStep: number;
    jumpToStep: (step: number) => void;
    errors?: Record<string, string>;
}

const steps: Step[] = [
    { step: 1, icon: 'bi-box-seam', label: 'Itens' },
    { step: 2, icon: 'bi-person-badge', label: 'Cliente' },
    { step: 3, icon: 'bi-truck', label: 'Logística' },
    { step: 4, icon: 'bi-credit-card-2-front', label: 'Pagamento' },
    { step: 5, icon: 'bi-check2-circle', label: 'Resumo' }
];

const OrderStepper = ({ currentStep, jumpToStep, errors = {} }: OrderStepperProps) => {
    const errorKeys = Object.keys(errors);
    const getStepStatus = (step: number) => {
        const hasError = {
            1: errorKeys.some(k => k.startsWith('item_') || k === 'items_summary' || k === 'seller'),
            2: errorKeys.some(k => k.startsWith('customer_')),
            3: errorKeys.some(k => k.startsWith('shipping_') || k === 'order_date'),
            4: errorKeys.some(k => k.startsWith('payment_') || k === 'payments_summary'),
            5: false
        }[step as 1 | 2 | 3 | 4 | 5];

        if (hasError) return 'error';
        if (step === currentStep) return 'active';
        if (step < currentStep) return 'done';
        return 'pending';
    };

    return (
        <div className="flex flex-wrap items-center justify-center gap-2 md:gap-4 transition-all duration-500 py-1">
            {steps.map((s, idx) => {
                const status = getStepStatus(s.step);
                return (
                    <React.Fragment key={s.step}>
                        <div 
                            onClick={() => jumpToStep(s.step)}
                            className={`flex items-center gap-3 cursor-pointer group transition-all duration-500 relative ${
                                status === 'active' ? 'scale-110' : 'hover:scale-105'
                            }`}
                        >
                            {/* Step Icon Hexagon/Box */}
                            <div className={`relative w-10 h-10 rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-sm ${
                                status === 'error' 
                                ? 'border-rose-600 bg-rose-600 text-white shadow-gradient-rose shadow-rose-500/40'
                                : status === 'active' 
                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/40 rotate-[22.5deg]' 
                                : status === 'done'
                                ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-none text-slate-400 group-hover:border-blue-200'
                            }`}>
                                <i className={`bi ${s.icon} text-lg transition-transform duration-500 ${status === 'active' ? '-rotate-[22.5deg]' : ''}`} />
                                
                                {/* Pulse for active or error step */}
                                {status === 'active' && (
                                    <div className="absolute inset-0 rounded-2xl bg-blue-500 animate-ping opacity-20" />
                                )}
                                {status === 'error' && (
                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border border-rose-500 shadow-sm">
                                        <i className="bi bi-exclamation-triangle-fill text-rose-500 text-[8px]" />
                                    </div>
                                )}
                            </div>

                            {/* Text Label */}
                            <div className={`flex flex-col transition-all duration-500 ${status === 'active' ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-4 w-0 lg:opacity-100 lg:w-auto lg:translate-x-0'}`}>
                                <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${status === 'error' ? 'text-rose-500' : status === 'active' ? 'text-blue-500' : 'text-slate-400'}`}>
                                    {status === 'error' ? 'Atenção' : `Passo ${s.step}`}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${status === 'error' ? 'text-rose-600 font-black italic' : status === 'active' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                                    {s.label}
                                </span>
                            </div>
                        </div>

                        {/* Connector Line */}
                        {idx < steps.length - 1 && (
                            <div className={`hidden md:block h-[2px] w-6 transition-all duration-1000 ${
                                status === 'done' ? 'bg-emerald-500/30' : status === 'error' ? 'bg-rose-500/20' : 'bg-slate-100 dark:bg-slate-800'
                            }`} />
                        )}
                    </React.Fragment>
                );
            })}
        </div>
    );
};

export default OrderStepper;
