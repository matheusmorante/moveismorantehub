import React, { useCallback } from "react";
import SalesOrderFormSection from "./SalesOrderFormSection";
import { useSalesOrderForm } from "./useSalesOrderForm";
import OrderStepper from "./OrderStepper";

interface NewSaleOrderProps {
    onClose: () => void;
    onSaveSuccess: (id?: string) => void;
    initialDeliveryMethod?: 'delivery' | 'pickup';
}

const NewSaleOrder = ({ onClose, onSaveSuccess, initialDeliveryMethod }: NewSaleOrderProps) => {
    const form = useSalesOrderForm(initialDeliveryMethod);
    const isPickup = form.state.shipping.deliveryMethod === 'pickup';
    const isEditing = false; // We can add an isEditing prop later if NewSaleOrder handles edit, but currently OrderEditModal does it.

    // Wrap save actions to include onClose and onSaveSuccess
    const handleSave = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const result = await form.actions.handleSaveOrder(e);
        if (result) {
            onSaveSuccess(typeof result === 'string' ? result : undefined);
            onClose();
        }
        return result;
    }, [form.actions, onSaveSuccess, onClose]);

    const handleComplete = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const result = await form.actions.handleCompleteOrder(e);
        if (result) {
            onSaveSuccess(typeof result === 'string' ? result : undefined);
            onClose();
        }
        return result;
    }, [form.actions, onSaveSuccess, onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-10 bg-slate-900/60 backdrop-blur-md animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-2xl w-full h-full md:w-[98vw] md:h-[96vh] rounded-none md:rounded-[3.5rem] shadow-premium-lg flex flex-col overflow-hidden animate-reveal border-0 md:border md:border-white/20 dark:md:border-slate-800"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header */}
                <div className={`px-12 py-7 border-b flex justify-between items-center transition-all duration-500 shrink-0 ${isPickup ? 'bg-emerald-50/30 border-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-900/30' : 'bg-slate-50/30 border-slate-100/50 dark:bg-slate-900/30 dark:border-slate-800/50'}`}>
                    <div className="flex items-center gap-6">
                        <div className={`w-14 h-14 flex items-center justify-center rounded-[1.5rem] shadow-premium transition-all duration-500 ${isPickup ? 'bg-emerald-600 shadow-emerald-500/20' : 'bg-blue-600 shadow-blue-500/20'}`}>
                            <i className={`bi ${isPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck'} text-white text-2xl`} />
                        </div>
                        <div>
                            <h2 className={`text-2xl font-black tracking-tight transition-colors duration-500 ${isPickup ? 'text-emerald-900 dark:text-emerald-100' : 'text-slate-900 dark:text-slate-100'}`}>
                                {isPickup ? 'Novo Pedido de Retirada' : 'Novo Pedido de Entrega'}
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                                <span className={`text-[9px] uppercase font-black tracking-[0.2em] px-2 py-0.5 rounded-full ${isPickup ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400' : 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400'}`}>
                                    Fluxo Pro Master
                                </span>
                                <span className="text-[9px] uppercase font-bold tracking-widest text-slate-400">
                                    • {isPickup ? 'REGISTRAR RETIRADA EM LOJA' : 'VENDA DIRETA COM ENTREGA'}
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 max-w-2xl mx-12">
                        <OrderStepper 
                            currentStep={form.state.currentStep} 
                            jumpToStep={form.actions.jumpToStep} 
                        />
                    </div>

                    <div className="flex items-center gap-4">
                        <button
                            onClick={onClose}
                            className="w-12 h-12 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-2xl transition-all shadow-premium-sm border border-slate-100 dark:border-slate-700 active:scale-90"
                        >
                            <i className="bi bi-x-lg text-lg" />
                        </button>
                    </div>
                </div>

                {/* Modal Content - Internal Scroll handled by PdvFormSection */}
                <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
                    <SalesOrderFormSection form={{
                        ...form,
                        actions: {
                            ...form.actions,
                            handleSaveOrder: handleSave,
                            handleCompleteOrder: handleComplete
                        }
                    }} />
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(20px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.2s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.3s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};

export default NewSaleOrder;
