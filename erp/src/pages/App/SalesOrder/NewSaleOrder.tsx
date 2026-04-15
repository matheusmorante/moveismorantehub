import React, { useCallback } from "react";
import SalesOrderFormSection from "./SalesOrderFormSection";
import { useSalesOrderForm } from "./useSalesOrderForm";
import OrderStepper from "./OrderStepper";
import Order from "../../types/order.type";
import SellerSearchModal from "./SellerSearchModal";
import PersonFormModal from "../Registrations/shared/PersonFormModal";

interface NewSaleOrderProps {
    onClose: () => void;
    onSaveSuccess: (id?: string, order?: Order) => void;
    initialDeliveryMethod?: 'delivery' | 'pickup';
    orderType?: Order['orderType'];
}

const NewSaleOrder = ({ onClose, onSaveSuccess, initialDeliveryMethod, orderType = 'sale' }: NewSaleOrderProps) => {
    const form = useSalesOrderForm(initialDeliveryMethod, orderType);
    const isBudget = orderType === 'budget';
    const isPickup = form.state.shipping.deliveryMethod === 'pickup';
    const isEditing = false;
    const [isSellerSearchOpen, setIsSellerSearchOpen] = React.useState(false);
    const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
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

    // Wrap save actions to include onClose and onSaveSuccess
    const handleSave = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const result = await form.actions.handleSaveOrder(e);
        if (result) {
            onSaveSuccess(typeof result === 'string' ? result : undefined, { ...form.state.currentOrder, id: typeof result === 'string' ? result : undefined });
            onClose();
        }
        return result;
    }, [form.actions, form.state.currentOrder, onSaveSuccess, onClose]);

    const handleComplete = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const result = await form.actions.handleCompleteOrder(e);
        if (result) {
            onSaveSuccess(typeof result === 'string' ? result : undefined, { ...form.state.currentOrder, id: typeof result === 'string' ? result : undefined });
            onClose();
        }
        return result;
    }, [form.actions, form.state.currentOrder, onSaveSuccess, onClose]);

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
                <div className={`sticky top-0 z-50 transition-all duration-300 border-b flex flex-wrap justify-between items-center shrink-0 ${isScrolled ? 'px-8 py-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-md border-slate-200 dark:border-slate-800' : isPickup ? 'px-12 py-7 bg-purple-50/30 border-purple-100/50 dark:bg-purple-950/20 dark:border-purple-900/30' : 'px-12 py-7 bg-emerald-50/30 border-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-900/30'}`}>
                    <div className="flex items-center gap-4 group cursor-pointer" onClick={() => setIsScrolled(false)}>
                        <div className={`flex items-center justify-center rounded-2xl shadow-premium transition-all duration-500 overflow-hidden ${isScrolled ? 'w-10 h-10' : 'w-14 h-14'} ${isBudget ? 'bg-indigo-600 shadow-indigo-500/20' : isPickup ? 'bg-purple-600 shadow-purple-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
                            <i className={`bi ${isBudget ? 'bi-calculator-fill' : isPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck'} text-white ${isScrolled ? 'text-lg' : 'text-2xl'}`} />
                        </div>
                        <div className={`transition-all duration-300 ${isScrolled ? 'opacity-0 w-0 scale-95 overflow-hidden' : 'opacity-100 scale-100'}`}>
                            <h2 className={`text-2xl font-black tracking-tight ${isBudget ? 'text-indigo-900 dark:text-indigo-100' : isPickup ? 'text-purple-900 dark:text-purple-100' : 'text-emerald-900 dark:text-emerald-100'}`}>
                                {isBudget ? 'Novo Orçamento' : 'Novo Pedido de Venda'}
                            </h2>
                            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 group-hover:text-blue-500 transition-colors">
                                {isBudget ? 'Simulação de Venda' : isPickup ? 'Retirada na Loja' : 'Entrega em Domicílio'}
                            </p>
                        </div>
                    </div>

                    <div className={`flex-1 transition-all duration-500 min-w-full lg:min-w-0 order-last lg:order-none mt-4 lg:mt-0 ${isScrolled ? 'max-w-xl mx-4' : 'max-w-2xl mx-6 lg:mx-12'}`}>
                        <OrderStepper 
                            currentStep={form.state.currentStep} 
                            jumpToStep={form.actions.jumpToStep} 
                            errors={form.state.errors}
                        />
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Compact Seller Selection for Scrolled State */}
                        <div className={`flex items-center bg-slate-50 dark:bg-slate-800/50 rounded-2xl p-1 gap-1 border border-slate-100 dark:border-slate-800 shadow-premium-sm transition-all duration-300 ${isScrolled ? 'opacity-100 translate-x-0' : 'hidden'}`}>
                            <button 
                                ref={sellerRef}
                                onClick={() => setIsSellerSearchOpen(true)}
                                className="flex items-center gap-3 px-3 py-1.5 hover:bg-white dark:hover:bg-slate-700 rounded-xl transition-all border border-transparent hover:border-slate-100 dark:hover:border-slate-600"
                            >
                                <div className={`w-7 h-7 rounded-lg flex items-center justify-center ${isPickup ? 'bg-emerald-100 text-emerald-600' : 'bg-blue-50 text-blue-600'}`}>
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
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500 ${isPickup ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
                                    <i className="bi bi-person-badge-fill text-lg" />
                                </div>
                                <div className="flex flex-col text-left">
                                    <span className="text-[10px] font-black uppercase text-slate-400 dark:text-slate-500 tracking-[0.2em] mb-0.5 group-hover:text-blue-500 transition-colors">Vendedor</span>
                                    <span className={`text-xs font-black uppercase tracking-widest ${form.state.seller ? 'text-slate-800 dark:text-slate-100' : 'text-slate-400 italic'}`}>
                                        {form.state.seller || "Selecionar..."}
                                    </span>
                                </div>
                            </button>

                            <div className="w-[1px] h-8 bg-slate-100 dark:bg-slate-800 mx-1" />

                            {/* Date Selection */}
                            <div className="group flex items-center gap-4 px-5 py-2">
                                <div className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors duration-500 ${isPickup ? 'bg-purple-100 text-purple-600 dark:bg-purple-950/40 dark:text-purple-400' : 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400'}`}>
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

                        <div className={`flex items-center gap-2 transition-all duration-500 ${isScrolled ? 'opacity-100 scale-100' : 'opacity-0 scale-90 pointer-events-none w-0'}`}>
                            <button
                                type="button"
                                onClick={handleSave}
                                disabled={form.state.isSaving}
                                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-blue-500/20"
                            >
                                {form.state.isSaving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="bi bi-cloud-arrow-up text-xs" />}
                                {isBudget ? 'Salvar Orçamento' : 'Cadastrar Venda'}
                            </button>
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
                <div className="flex-1 overflow-hidden bg-white dark:bg-slate-900">
                    <SalesOrderFormSection 
                        scrollRef={scrollContainerRef}
                        form={{
                            ...form,
                            actions: {
                                ...form.actions,
                                handleSaveOrder: handleSave,
                                handleCompleteOrder: handleComplete
                            }
                        }} 
                    />
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
