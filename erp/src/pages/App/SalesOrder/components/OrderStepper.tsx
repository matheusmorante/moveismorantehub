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
    { step: 5, icon: 'bi-credit-card-2-front', label: 'Pagamento' }
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
        }[step as 1 | 2 | 3 | 4 | 5];

        if (hasError) return 'error';
        if (step === currentStep) return 'active';
        if (step < currentStep) return 'done';
        return 'pending';
    };

    const visibleSteps = isBudget ? steps.filter(s => s.step !== 5) : steps;

    return (
        <div className="w-full max-w-full overflow-x-auto xl:overflow-x-visible no-scrollbar py-1">
            <div className="flex items-center justify-start md:justify-center xl:justify-between gap-1.5 sm:gap-2.5 md:gap-3 xl:gap-2 min-w-max xl:min-w-0 w-full px-1 sm:px-2">
                {visibleSteps.map((s, idx) => {
                    const status = getStepStatus(s.step);
                    return (
                        <React.Fragment key={s.step}>
                            <button
                                type="button"
                                onClick={() => jumpToStep(s.step)}
                                className={`flex items-center gap-1.5 sm:gap-2 cursor-pointer group transition-all duration-300 shrink-0 xl:shrink outline-none ${
                                    status === 'active' ? 'scale-105' : 'hover:scale-105'
                                }`}
                                title={`Passo ${s.step}: ${s.label}`}
                            >
                                {/* Step Icon Box */}
                                <div className={`relative w-8 h-8 sm:w-9 sm:h-9 md:w-9 md:h-9 xl:w-9 xl:h-9 2xl:w-10 2xl:h-10 rounded-xl sm:rounded-2xl flex items-center justify-center border-2 transition-all duration-300 shadow-sm shrink-0 ${
                                    status === 'error' 
                                    ? 'border-rose-600 bg-rose-600 text-white shadow-rose-500/40'
                                    : status === 'active' 
                                    ? 'border-blue-600 bg-blue-600 text-white shadow-lg shadow-blue-500/30' 
                                    : status === 'done'
                                    ? 'border-emerald-500 bg-emerald-500 text-white shadow-md shadow-emerald-500/20' 
                                    : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-400 group-hover:border-blue-300 dark:group-hover:border-blue-700'
                                }`}>
                                    <i className={`bi ${s.icon} text-sm sm:text-base md:text-base xl:text-base transition-transform duration-300`} />
                                    
                                    {status === 'error' && (
                                        <div className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-white dark:bg-slate-900 rounded-full flex items-center justify-center border border-rose-500 shadow-sm">
                                            <i className="bi bi-exclamation-triangle-fill text-rose-500 text-[7px]" />
                                        </div>
                                    )}
                                </div>

                                {/* Text Label */}
                                <div className={`flex flex-col text-left transition-all duration-300 ${
                                    status === 'active' 
                                    ? 'flex' 
                                    : 'hidden xl:flex'
                                }`}>
                                    <span className={`text-[8px] font-black uppercase tracking-widest leading-none ${status === 'error' ? 'text-rose-500' : status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                        {status === 'error' ? 'Atenção' : `Passo ${s.step}`}
                                    </span>
                                    <span className={`text-[10px] sm:text-[11px] xl:text-[10px] 2xl:text-[11px] font-black uppercase tracking-tight whitespace-nowrap ${status === 'error' ? 'text-rose-600 italic' : status === 'active' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>
                                        {s.label}
                                    </span>
                                </div>
                            </button>

                            {/* Connector Line */}
                            {idx < visibleSteps.length - 1 && (
                                <div className={`hidden sm:block h-[2px] min-w-[8px] w-2 sm:w-3 md:w-4 xl:w-full max-w-[28px] transition-all duration-500 shrink ${
                                    status === 'done' ? 'bg-emerald-500/40' : status === 'error' ? 'bg-rose-500/30' : 'bg-slate-200 dark:bg-slate-800'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
};

export default OrderStepper;
