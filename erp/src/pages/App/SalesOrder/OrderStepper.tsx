import React from "react";

interface Step {
    step: number;
    icon: string;
    label: string;
}

interface OrderStepperProps {
    currentStep: number;
    jumpToStep: (step: number) => void;
}

const steps: Step[] = [
    { step: 1, icon: 'bi-box-seam', label: 'Itens' },
    { step: 2, icon: 'bi-person-badge', label: 'Cliente' },
    { step: 3, icon: 'bi-truck', label: 'Entrega' },
    { step: 4, icon: 'bi-credit-card-2-front', label: 'Pagamento' },
    { step: 5, icon: 'bi-check2-circle', label: 'Resumo' }
];

const OrderStepper = ({ currentStep, jumpToStep }: OrderStepperProps) => {
    return (
        <div className="flex items-center gap-2 md:gap-8 transition-all duration-500">
            {steps.map((s) => (
                <div 
                    key={s.step}
                    onClick={() => jumpToStep(s.step)}
                    className={`flex items-center gap-2 cursor-pointer transition-all duration-300 ${
                        currentStep === s.step 
                        ? 'text-blue-600 dark:text-blue-400 scale-105' 
                        : currentStep > s.step 
                        ? 'text-emerald-500' 
                        : 'text-slate-300 dark:text-slate-700 hover:text-slate-400'
                    }`}
                >
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all duration-300 ${
                        currentStep === s.step 
                        ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm' 
                        : currentStep > s.step 
                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                        : 'border-slate-100 dark:border-slate-800 bg-transparent'
                    }`}>
                        <i className={`bi ${s.icon} ${currentStep === s.step ? 'text-lg' : 'text-md'}`} />
                    </div>
                    <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest whitespace-nowrap">
                        {s.label}
                    </span>
                </div>
            ))}
        </div>
    );
};

export default OrderStepper;
