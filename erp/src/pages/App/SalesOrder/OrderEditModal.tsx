import React, { useEffect, useCallback, useMemo } from "react";
import SalesOrderFormSection from "./SalesOrderFormSection";
import { useSalesOrderForm } from "./useSalesOrderForm";
import Order from "../../types/order.type";
import { updateOrder } from "../../utils/orderHistoryService";
import { toast } from "react-toastify";
import OrderStatusTimeline from "./OrderStatusTimeline";
import { useState } from "react";
import OrderStepper from "./OrderStepper";
import SellerSearchModal from "./SellerSearchModal";
import PersonFormModal from "../Registrations/shared/PersonFormModal";

interface OrderEditModalProps {
    order: Order;
    onClose: () => void;
    onSaveSuccess: (id?: string, order?: Order) => void;
}

const OrderEditModal = ({ order, onClose, onSaveSuccess }: OrderEditModalProps) => {
    const form = useSalesOrderForm();
    const [view, setView] = useState<'form' | 'timeline'>('form');
    const [isSellerSearchOpen, setIsSellerSearchOpen] = useState(false);
    const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const sellerRef = React.useRef<HTMLButtonElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const el = scrollContainerRef.current;
        if (!el) return;
        const handleScroll = () => {
            setIsScrolled(el.scrollTop > 50);
        };
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (order && order.id) {
            form.actions.loadOrderForEditing(order);
        }
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
            await updateOrder(order.id!, updatedOrder, order);
            toast.success("Edição salva com sucesso!");
            onSaveSuccess(order.id, updatedOrder);
            onClose();
            return order.id;
        } catch (error) {
            console.error("Erro ao atualizar pedido:", error);
            toast.error("Falha ao atualizar pedido.");
            return false;
        }
    }, [form.actions, form.state.currentOrder, order.id, onSaveSuccess, onClose, order]);

    const handleFinalize = useCallback(async (e?: React.MouseEvent) => {
        const result = await form.actions.handleCompleteOrder(e);
        if (result) {
            const updatedOrder = { ...form.state.currentOrder, id: form.state.currentOrder.id || order.id || String(result) };
            onSaveSuccess(String(result), updatedOrder);
            onClose();
            return String(result);
        }
        return false;
    }, [form.actions, onSaveSuccess, onClose, form.state.currentOrder, order.id]);

    const mainAction = order.status === 'draft' ? handleFinalize : handleUpdate;

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
                    <OrderStepper 
                        currentStep={form.state.currentStep} 
                        jumpToStep={form.actions.jumpToStep} 
                        errors={form.state.errors}
                    />                    <div className="flex items-center gap-2">
                        {/* Compact Seller Selection for Scrolled State */}
                        <div className={`flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-1 gap-1 border border-slate-100 dark:border-slate-800 shadow-premium-sm transition-all duration-300 ${isScrolled ? 'opacity-100 translate-x-0' : 'hidden'}`}>
                            <button 
                                ref={sellerRef}
                                onClick={() => setIsSellerSearchOpen(true)}
                                className="flex items-center gap-3 px-3 py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                            >
                                <div className="w-7 h-7 rounded-lg flex items-center justify-center bg-blue-50 text-blue-600">
                                    <i className="bi bi-person-badge-fill text-xs" />
                                </div>
                                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-200 truncate max-w-[120px]">
                                    {form.state.seller || "Vendedor"}
                                </span>
                            </button>
                        </div>

                        {/* Full Seller & Date Section for Expanded State */}
                        <div className={`xl:flex items-center bg-white/50 dark:bg-slate-800/50 rounded-3xl p-1.5 gap-2 border border-slate-100 dark:border-slate-800/50 shadow-premium-sm ${isScrolled ? 'hidden' : 'hidden xl:flex'}`}>
                            {/* Seller Selection */}
                            <button 
                                ref={sellerRef}
                                onClick={() => setIsSellerSearchOpen(true)}
                                className="group flex items-center gap-4 px-5 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100 dark:hover:border-slate-600 hover:shadow-premium-sm"
                            >
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 transition-colors duration-500">
                                    <i className="bi bi-person-badge-fill text-lg" />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-0.5 group-hover:text-blue-500 transition-colors">Vendedor</span>
                                    <span className={`text-xs font-black uppercase tracking-widest ${form.state.seller ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 italic'}`}>
                                        {form.state.seller || "Selecionar..."}
                                    </span>
                                </div>
                                <div className="ml-2 pr-1 opacity-0 group-hover:opacity-100 -translate-x-2 group-hover:translate-x-0 transition-all">
                                    <i className="bi bi-chevron-down text-slate-400 text-xs" />
                                </div>
                            </button>

                            <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 mx-1" />

                            {/* Date Selection */}
                            <div className="group flex items-center gap-4 px-5 py-2">
                                <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400 transition-colors duration-500">
                                    <i className="bi bi-calendar-event-fill text-lg" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-0.5">Data</span>
                                    <input
                                        type="datetime-local"
                                        value={form.state.orderDate}
                                        onChange={(e) => form.actions.setOrderDate?.(e.target.value)}
                                        className="bg-transparent border-0 p-0 focus:ring-0 text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>
                            </div>
                        </div>



                        <button
                            onClick={onClose}
                            className={`flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-2xl transition-all shadow-premium-sm border border-slate-100 dark:border-slate-700 active:scale-90 ${isScrolled ? 'w-10 h-10' : 'w-14 h-14'}`}
                        >
                            <i className={`bi bi-x-lg ${isScrolled ? 'text-md' : 'text-xl'}`} />
                        </button>
                    </div>
                </div>

                {isSellerSearchOpen && (
                    <SellerSearchModal 
                        anchorRef={sellerRef}
                        onSelect={(name) => form.actions.setSeller(name)}
                        onClose={() => setIsSellerSearchOpen(false)}
                        onAddNew={() => {
                            setIsSellerSearchOpen(false);
                            setIsSellerRegistrationOpen(true);
                        }}
                    />
                )}

                <PersonFormModal
                    isOpen={isSellerRegistrationOpen}
                    onClose={() => setIsSellerRegistrationOpen(false)}
                    collectionName="employees"
                    title="Vendedor"
                    onSuccess={(newSeller) => {
                        form.actions.setSeller(newSeller.nickname || newSeller.fullName);
                        setIsSellerRegistrationOpen(false);
                    }}
                />

                {/* Modal Content - Internal Scroll handled by PdvFormSection */}
                <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 custom-scrollbar">
                    {view === 'form' ? (
                        <SalesOrderFormSection 
                            scrollRef={scrollContainerRef}
                            form={{
                                ...form,
                                actions: {
                                    ...form.actions,
                                    handleSaveOrder: handleUpdate,
                                    handleCompleteOrder: handleFinalize
                                }
                            }} 
                        />
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
