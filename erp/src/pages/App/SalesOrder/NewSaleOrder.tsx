import React, { useCallback } from "react";
import SalesOrderFormSection from "./SalesOrderFormSection";
import { useSalesOrderForm } from "./useSalesOrderForm";
import OrderStepper from "./OrderStepper";
import SellerSearchModal from "./SellerSearchModal";

interface NewSaleOrderProps {
    onClose: () => void;
    onSaveSuccess: (id?: string) => void;
    initialDeliveryMethod?: 'delivery' | 'pickup';
}

const NewSaleOrder = ({ onClose, onSaveSuccess, initialDeliveryMethod }: NewSaleOrderProps) => {
    const form = useSalesOrderForm(initialDeliveryMethod);
    const isPickup = form.state.shipping.deliveryMethod === 'pickup';
    const isEditing = false;
    const [isSellerSearchOpen, setIsSellerSearchOpen] = React.useState(false);

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
                                Novo Pedido de Venda
                            </h2>
                        </div>
                    </div>

                    <div className="flex-1 max-w-2xl mx-12">
                        <OrderStepper 
                            currentStep={form.state.currentStep} 
                            jumpToStep={form.actions.jumpToStep} 
                        />
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Seller & Date Section - Larger and Interactive */}
                        <div className="hidden xl:flex items-center bg-white/50 dark:bg-slate-800/50 rounded-3xl p-1.5 gap-2 border border-slate-100 dark:border-slate-800/50 shadow-premium-sm">
                            {/* Seller Selection */}
                            <button 
                                onClick={() => setIsSellerSearchOpen(true)}
                                className="group flex items-center gap-4 px-5 py-2 hover:bg-white dark:hover:bg-slate-700 rounded-2xl transition-all duration-300 border border-transparent hover:border-slate-100 dark:hover:border-slate-600 hover:shadow-premium-sm"
                            >
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500 ${isPickup ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
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
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500 ${isPickup ? 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400'}`}>
                                    <i className="bi bi-calendar-event-fill text-lg" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-0.5">Data do Pedido</span>
                                    <input
                                        type="datetime-local"
                                        value={form.state.orderDate}
                                        onChange={(e) => form.actions.setOrderDate?.(e.target.value)}
                                        className="bg-transparent border-0 p-0 focus:ring-0 text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100 [color-scheme:light] dark:[color-scheme:dark]"
                                    />
                                </div>
                            </div>

                            {form.state.isSavingDraft && (
                                <div className="px-5 py-2 flex items-center gap-3 border-l border-slate-100 dark:border-slate-800 animate-pulse bg-blue-50/30 dark:bg-blue-950/10 rounded-r-2xl">
                                    <div className="relative">
                                        <div className="w-2 h-2 rounded-full bg-blue-500" />
                                        <div className="absolute inset-0 w-2 h-2 rounded-full bg-blue-500 animate-ping opacity-75" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase text-blue-600 dark:text-blue-400 tracking-tighter">Sincronizando</span>
                                </div>
                            )}
                        </div>

                        <button
                            onClick={onClose}
                            className="w-14 h-14 flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-[1.5rem] transition-all shadow-premium-sm border border-slate-100 dark:border-slate-700 active:scale-90"
                        >
                            <i className="bi bi-x-lg text-xl" />
                        </button>
                    </div>
                </div>

                {isSellerSearchOpen && (
                    <SellerSearchModal 
                        onSelect={(name) => form.actions.setSeller(name)}
                        onClose={() => setIsSellerSearchOpen(false)}
                    />
                )}

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
