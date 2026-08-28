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
    isBudget?: boolean;
}

const steps: Step[] = [
    { step: 1, icon: 'bi-info-circle', label: 'Informações básicas' },
    { step: 2, icon: 'bi-box-seam', label: 'Itens' },
    { step: 3, icon: 'bi-person-badge', label: 'Cliente' },
    { step: 4, icon: 'bi-truck', label: 'Logística' },
    { step: 5, icon: 'bi-credit-card-2-front', label: 'Pagamento' },
    { step: 6, icon: 'bi-check2-circle', label: 'Resumo' }
];

const OrderStepper = ({ currentStep, jumpToStep, errors = {}, isBudget = false }: OrderStepperProps) => {
    const errorKeys = Object.keys(errors);
    const getStepStatus = (step: number) => {
        const hasError = {
            1: errorKeys.includes('seller') || errorKeys.includes('order_date'),
            2: errorKeys.some(k => k.startsWith('item_') || k === 'items_summary'),
            3: errorKeys.some(k => k.startsWith('customer_')),
            4: errorKeys.some(k => k.startsWith('shipping_')),
            5: errorKeys.some(k => k.startsWith('payment_') || k === 'payments_summary'),
            6: false
        }[step as 1 | 2 | 3 | 4 | 5 | 6];

        if (hasError) return 'error';
        if (step === currentStep) return 'active';
        if (step < currentStep) return 'done';
        return 'pending';
    };

    const visibleSteps = isBudget ? steps.filter(s => s.step !== 5) : steps;

    return (
        <div className="w-full flex flex-nowrap items-center justify-center lg:justify-between gap-1.5 md:gap-4 lg:gap-2 2xl:gap-4 transition-all duration-500 py-1">
            {visibleSteps.map((s, idx) => {
                const status = getStepStatus(s.step);
                return (
                    <React.Fragment key={s.step}>
                        <div 
                            onClick={() => jumpToStep(s.step)}
                            className={`flex items-center gap-1.5 md:gap-3 cursor-pointer group transition-all duration-500 relative shrink-0 ${
                                status === 'active' ? 'scale-105 md:scale-110' : 'hover:scale-105'
                            }`}
                        >
                            {/* Step Icon Hexagon/Box */}
                            <div className={`relative w-8 h-8 md:w-10 md:h-10 rounded-xl md:rounded-2xl flex items-center justify-center border-2 transition-all duration-500 shadow-sm shrink-0 ${
                                status === 'error' 
                                ? 'border-rose-600 bg-rose-600 text-white shadow-gradient-rose shadow-rose-500/40'
                                : status === 'active' 
                                ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/40 rotate-[22.5deg]' 
                                : status === 'done'
                                ? 'border-emerald-500 bg-emerald-500 text-white shadow-lg shadow-emerald-500/20' 
                                : 'border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 shadow-none text-slate-400 group-hover:border-blue-200'
                            }`}>
                                <i className={`bi ${s.icon} text-sm md:text-lg transition-transform duration-500 ${status === 'active' ? '-rotate-[22.5deg]' : ''}`} />
                                
                                {status === 'error' && (
                                    <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border border-rose-500 shadow-sm">
                                        <i className="bi bi-exclamation-triangle-fill text-rose-500 text-[6px]" />
                                    </div>
                                )}
                            </div>

                            {/* Text Label */}
                            <div className={`flex flex-col transition-all duration-300 overflow-hidden ${
                                status === 'active' 
                                ? 'opacity-100 w-auto translate-x-0' 
                                : 'opacity-0 w-0 -translate-x-4 md:opacity-100 md:w-auto md:overflow-visible md:translate-x-0'
                            }`}>
                                <span className={`text-[7px] md:text-[8px] font-black uppercase tracking-widest leading-none ${status === 'error' ? 'text-rose-500' : status === 'active' ? 'text-blue-500' : 'text-slate-400'}`}>
                                    {status === 'error' ? 'Atenção' : `Passo ${s.step}`}
                                </span>
                                <span className={`text-[9px] md:text-[10px] font-black uppercase tracking-tight whitespace-nowrap ${status === 'error' ? 'text-rose-600 font-black italic' : status === 'active' ? 'text-slate-800 dark:text-slate-100' : 'text-slate-500'}`}>
                                    {s.label}
                                </span>
                            </div>
                        </div>

                        {/* Connector Line */}
                        {idx < visibleSteps.length - 1 && (
                            <div className={`hidden lg:block h-[2px] w-4 md:w-6 transition-all duration-1000 shrink-0 ${
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
