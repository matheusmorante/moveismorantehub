import React, { useState } from "react";

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
    const [isStepPickerOpen, setIsStepPickerOpen] = useState(false);
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

    const activeStep = visibleSteps.find(step => step.step === currentStep) || visibleSteps[0];
    const activeStatus = getStepStatus(activeStep.step);
    const renderIcon = (step: Step, status: string, size = 'h-8 w-8') => (
        <span className={`relative flex ${size} shrink-0 items-center justify-center rounded-xl border-2 shadow-sm transition-colors ${
            status === 'error'
                ? 'border-rose-600 bg-rose-600 text-white'
                : status === 'active'
                    ? 'border-blue-600 bg-blue-600 text-white shadow-blue-500/30'
                    : status === 'done'
                        ? 'border-emerald-500 bg-emerald-500 text-white'
                        : 'border-slate-200 bg-slate-50 text-slate-400 group-hover:border-blue-300 dark:border-slate-800 dark:bg-slate-900'
        }`}>
            <i className={`bi ${step.icon} text-sm`} />
            {status === 'error' && <i className="bi bi-exclamation-triangle-fill absolute -right-1 -top-1 rounded-full border border-rose-500 bg-white p-0.5 text-[7px] text-rose-500 dark:bg-slate-900" />}
        </span>
    );

    return (
        <div className="relative flex w-auto max-w-full min-w-0 items-center justify-center py-0.5 md:w-full">
            <button
                type="button"
                onClick={() => setIsStepPickerOpen(true)}
                className="group flex min-w-0 items-center gap-2 rounded-xl px-1 py-0.5 text-left transition-colors hover:bg-slate-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 md:hidden"
                aria-haspopup="dialog"
                aria-expanded={isStepPickerOpen}
                title="Selecionar etapa do pedido"
            >
                {renderIcon(activeStep, activeStatus, 'h-8 w-8')}
                <span className="flex min-w-0 flex-col">
                    <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${activeStatus === 'error' ? 'text-rose-500' : 'text-blue-600 dark:text-blue-400'}`}>Passo {activeStep.step}</span>
                    <span className="max-w-[118px] truncate text-[10px] font-black uppercase tracking-tight text-slate-800 dark:text-slate-100">{activeStep.label}</span>
                </span>
                <i className="bi bi-chevron-down ml-0.5 text-[10px] text-slate-400" aria-hidden="true" />
            </button>

            <div className="hidden w-full items-center justify-between gap-1 md:flex md:gap-1.5 2xl:gap-2">
                {visibleSteps.map((s, idx) => {
                    const status = getStepStatus(s.step);
                    return (
                        <React.Fragment key={s.step}>
                            <button
                                type="button"
                                onClick={() => jumpToStep(s.step)}
                                className="group flex min-w-0 shrink-0 items-center gap-1.5 rounded-xl px-0.5 py-0.5 text-left outline-none transition-colors hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-blue-500 dark:hover:bg-slate-800 2xl:flex-1 2xl:gap-2"
                                title={`Passo ${s.step}: ${s.label}`}
                            >
                                {renderIcon(s, status, 'h-8 w-8 sm:h-9 sm:w-9')}
                                <span className={`min-w-0 flex-col text-left ${status === 'active' ? 'flex' : 'hidden 2xl:flex'}`}>
                                    <span className={`text-[8px] font-black uppercase tracking-wider leading-none ${status === 'error' ? 'text-rose-500' : status === 'active' ? 'text-blue-600 dark:text-blue-400' : 'text-slate-400'}`}>
                                        Passo {s.step}
                                    </span>
                                    <span className={`max-w-[130px] truncate text-[10px] font-black uppercase tracking-tight 2xl:max-w-none 2xl:whitespace-nowrap ${status === 'error' ? 'text-rose-600 italic' : status === 'active' ? 'text-slate-900 dark:text-slate-100' : 'text-slate-500'}`}>
                                        {s.label}
                                    </span>
                                </span>
                            </button>

                            {idx < visibleSteps.length - 1 && (
                                <div className={`hidden h-0.5 min-w-2 flex-1 md:block 2xl:max-w-8 ${
                                    status === 'done' ? 'bg-emerald-500/40' : status === 'error' ? 'bg-rose-500/30' : 'bg-slate-200 dark:bg-slate-800'
                                }`} />
                            )}
                        </React.Fragment>
                    );
                })}
            </div>

            {isStepPickerOpen && (
                <div className="fixed inset-0 z-[1000000] flex items-center justify-center bg-slate-950/40 p-4 backdrop-blur-sm md:hidden" onClick={() => setIsStepPickerOpen(false)}>
                    <section
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="order-step-picker-title"
                        className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl dark:border-slate-700 dark:bg-slate-900"
                        onClick={event => event.stopPropagation()}
                    >
                        <div className="mb-3 flex items-center justify-between">
                            <div>
                                <h2 id="order-step-picker-title" className="text-sm font-black text-slate-900 dark:text-white">Ir para uma etapa</h2>
                                <p className="text-[10px] font-medium text-slate-500">Etapas do pedido</p>
                            </div>
                            <button type="button" onClick={() => setIsStepPickerOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800" aria-label="Fechar seleção de etapa">
                                <i className="bi bi-x-lg" />
                            </button>
                        </div>
                        <div className="flex flex-col gap-1">
                            {visibleSteps.map(step => {
                                const status = getStepStatus(step.step);
                                return (
                                    <button
                                        key={step.step}
                                        type="button"
                                        onClick={() => { jumpToStep(step.step); setIsStepPickerOpen(false); }}
                                        className={`flex items-center gap-3 rounded-xl p-2 text-left transition-colors ${status === 'active' ? 'bg-blue-50 dark:bg-blue-950/40' : 'hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                                    >
                                        {renderIcon(step, status, 'h-9 w-9')}
                                        <span className="flex flex-col">
                                            <span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Passo {step.step}</span>
                                            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">{step.label}</span>
                                        </span>
                                        {status === 'active' && <i className="bi bi-check2 ml-auto text-blue-600" aria-label="Etapa atual" />}
                                    </button>
                                );
                            })}
                        </div>
                    </section>
                </div>
            )}
        </div>
    );
};

export default OrderStepper;
