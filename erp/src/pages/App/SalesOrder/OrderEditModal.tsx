import React, { useEffect, useCallback, useMemo } from "react";
import SalesOrderFormSection from "./SalesOrderFormSection";
import { useSalesOrderForm } from "./useSalesOrderForm";
import Order from "../../types/order.type";
import { updateOrder } from "../../utils/orderHistoryService";
import { toast } from "react-toastify";
import OrderStatusTimeline from "./OrderStatusTimeline";
import { useState } from "react";

interface OrderEditModalProps {
    order: Order;
    onClose: () => void;
    onSaveSuccess: () => void;
}

const OrderEditModal = ({ order, onClose, onSaveSuccess }: OrderEditModalProps) => {
    const form = useSalesOrderForm();
    const [view, setView] = useState<'form' | 'timeline'>('form');

    // Load order data into form on mount
    useEffect(() => {
        if (order && order.id) {
            form.actions.loadOrderForEditing(order);
        }
        // We only want to load the order when the component mounts or the order ID changes.
        // Dependent on form.actions.loadOrderForEditing which is memoized and stable.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [order?.id, form.actions.loadOrderForEditing]);

    const handleUpdate = useCallback(async (e?: React.MouseEvent) => {
        e?.preventDefault();

        const updatedOrder = { ...form.state.currentOrder, id: order.id };

        // Validate before updating
        const validationErrors = form.actions.validateOrder(updatedOrder);
        if (Object.keys(validationErrors).length > 0) {
            form.actions.setErrors(validationErrors);
            toast.error("Existem campos obrigatórios não preenchidos.");
            return false;
        }

        try {
            await updateOrder(order.id!, updatedOrder);
            toast.success("Pedido atualizado com sucesso!");
            onSaveSuccess();
            onClose();
            return true;
        } catch (error) {
            console.error("Erro ao atualizar pedido:", error);
            toast.error("Falha ao atualizar pedido.");
            return false;
        }
    }, [form.actions, form.state.currentOrder, order.id, order.date, onSaveSuccess, onClose]);

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-0 md:p-6 bg-slate-900/40 backdrop-blur-[2px] animate-fade-in"
            onClick={onClose}
        >
            <div
                className="bg-white dark:bg-slate-950 w-full h-full md:w-[95vw] md:h-[95vh] rounded-none md:rounded-[3rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-0 md:border border-white/20 dark:border-slate-800/50"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Modal Header - SLIM VERSION */}
                <div className="px-10 py-5 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50 transition-colors duration-300 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-100 dark:shadow-blue-900/20">
                            <i className="bi bi-pencil-square text-white text-lg" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 tracking-tight">Editar Pedido</h2>
                            <p className="text-[9px] uppercase font-black text-slate-400 dark:text-slate-500 tracking-widest mt-0.5">
                                #{order.id} • {(() => {
                                    try {
                                        const date = new Date(order.date);
                                        return date.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
                                    } catch {
                                        return order.date;
                                    }
                                })()}
                            </p>
                        </div>
                    </div>

                    {/* Stepper Implementation */}
                    <div className="flex items-center gap-2 md:gap-8">
                        {[
                            { step: 1, icon: 'bi-box-seam', label: 'Itens' },
                            { step: 2, icon: 'bi-person-badge', label: 'Cliente' },
                            { step: 3, icon: 'bi-truck', label: 'Entrega' },
                            { step: 4, icon: 'bi-check2-circle', label: 'Resumo' }
                        ].map((s) => (
                            <div 
                                key={s.step}
                                onClick={() => form.actions.jumpToStep(s.step)}
                                className={`flex items-center gap-2 cursor-pointer transition-all ${
                                    form.state.currentStep === s.step 
                                    ? 'text-blue-600 dark:text-blue-400 scale-105' 
                                    : form.state.currentStep > s.step 
                                    ? 'text-emerald-500' 
                                    : 'text-slate-300 dark:text-slate-700 hover:text-slate-400'
                                }`}
                            >
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center border-2 transition-all ${
                                    form.state.currentStep === s.step 
                                    ? 'border-blue-600 dark:border-blue-400 bg-blue-50 dark:bg-blue-900/20 shadow-sm' 
                                    : form.state.currentStep > s.step 
                                    ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/20' 
                                    : 'border-slate-100 dark:border-slate-800 bg-transparent'
                                }`}>
                                    <i className={`bi ${s.icon} ${form.state.currentStep === s.step ? 'text-lg' : 'text-md'}`} />
                                </div>
                                <span className="hidden lg:block text-[10px] font-black uppercase tracking-widest">
                                    {s.label}
                                </span>
                            </div>
                        ))}
                    </div>

                    <div className="flex items-center gap-3">
                        <button
                            onClick={onClose}
                            className="w-10 h-10 flex items-center justify-center bg-white dark:bg-slate-900 hover:bg-red-50 dark:hover:bg-red-900/20 text-slate-400 dark:text-slate-500 hover:text-red-500 dark:hover:text-red-400 rounded-xl transition-all shadow-sm border border-slate-100 dark:border-slate-800 active:scale-95"
                        >
                            <i className="bi bi-x-lg text-lg" />
                        </button>
                    </div>
                </div>

                {/* Modal Content - Internal Scroll handled by PdvFormSection */}
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 custom-scrollbar">
                    {view === 'form' ? (
                        <SalesOrderFormSection form={{
                            ...form,
                            actions: {
                                ...form.actions,
                                handleSaveOrder: handleUpdate
                            }
                        }} />
                    ) : (
                        <OrderStatusTimeline orderId={order.id!} />
                    )}
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes fade-in { from { opacity: 0; } to { opacity: 1; } }
                @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};

export default OrderEditModal;
