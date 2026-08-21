import React, { useCallback } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import SalesOrderFormSection from "./SalesOrderFormSection";
import { useSalesOrderForm, parseStorageDateToLocal } from "./useSalesOrderForm";
import OrderStepper from "./OrderStepper";
import Order from "../../types/order.type";
import SellerSearchModal from "./SellerSearchModal";
import PersonFormModal from "../Registrations/shared/PersonFormModal";
import { toast } from "react-toastify";
import { migrateOrderHandlings } from '@/pages/utils/handlingMigration';

interface NewSaleOrderProps {
    onClose?: () => void;
    onSaveSuccess?: (id?: string, order?: Order) => void;
    initialDeliveryMethod?: 'delivery' | 'pickup';
    orderType?: Order['orderType'];
    initialOrder?: Order;
}

const NewSaleOrder = ({ onClose: propOnClose, onSaveSuccess: propOnSaveSuccess, initialDeliveryMethod, orderType: propOrderType, initialOrder }: NewSaleOrderProps) => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const orderType = propOrderType || (searchParams.get("type") as Order["orderType"]) || "sale";
    const onClose = propOnClose || (() => navigate("/sales-order"));
    const onSaveSuccess = propOnSaveSuccess || (() => {
        toast.success("Pedido salvo com sucesso!");
        navigate("/sales-order");
    });

    const form = useSalesOrderForm(initialDeliveryMethod, orderType);
    const isBudget = orderType === 'budget';
    const isReturn = orderType === 'return';
    const isPickup = form.state.shipping.deliveryMethod === 'pickup';
    const isEditing = false;
    const [isSellerSearchOpen, setIsSellerSearchOpen] = React.useState(false);
    const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = React.useState(false);
    const [isScrolled, setIsScrolled] = React.useState(false);
    const sellerRef = React.useRef<HTMLButtonElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const [isCustomerRegistrationOpen, setIsCustomerRegistrationOpen] = React.useState(false);
    const [pendingCustomerData, setPendingCustomerData] = React.useState<any>(null);
    const [pendingOrderData, setPendingOrderData] = React.useState<any>(null);

    const applyOrderData = useCallback((order: any) => {
        const migrated = migrateOrderHandlings(order);
        if (migrated.seller) {
            form.actions.setSeller(migrated.seller);
        }
        if (migrated.observation) {
            form.actions.setObservation(migrated.observation);
        }
        if (migrated.date) {
            form.actions.setOrderDate(parseStorageDateToLocal(migrated.date));
        }
        if (migrated.shipping) {
            form.actions.setShipping(prev => ({
                ...prev,
                deliveryMethod: migrated.shipping.deliveryMethod || prev.deliveryMethod,
                orderType: migrated.shipping.orderType || prev.orderType,
                value: typeof migrated.shipping.value === 'number' ? migrated.shipping.value : prev.value,
                scheduling: migrated.shipping.scheduling ? {
                    notInformed: !!migrated.shipping.scheduling.notInformed,
                    dateType: migrated.shipping.scheduling.dateType || "fixed",
                    date: migrated.shipping.scheduling.date || "",
                    endDate: migrated.shipping.scheduling.endDate || "",
                    type: migrated.shipping.scheduling.type || "fixed",
                    time: migrated.shipping.scheduling.time || "",
                    startTime: migrated.shipping.scheduling.startTime || "",
                    endTime: migrated.shipping.scheduling.endTime || ""
                } : prev.scheduling
            }));
        }
        if (migrated.items && Array.isArray(migrated.items)) {
            const mappedItems = migrated.items.map((item: any) => ({
                productId: item.productId || undefined,
                variationId: item.variationId || undefined,
                code: item.code || "",
                description: item.description || "",
                unitPrice: typeof item.unitPrice === 'number' ? item.unitPrice : 0,
                quantity: typeof item.quantity === 'number' ? item.quantity : 1,
                costPrice: typeof item.costPrice === 'number' ? item.costPrice : 0,
                condition: item.condition || "novo",
                handlingType: item.handlingType || ""
            }));
            form.actions.setItems(mappedItems);
        }
        if (migrated.payments && Array.isArray(migrated.payments)) {
            const mappedPayments = migrated.payments.map((pay: any) => ({
                method: pay.method || "",
                amount: typeof pay.amount === 'number' ? pay.amount : 0,
                status: pay.status || ""
            }));
            form.actions.setPayments(mappedPayments);
        }
    }, [form.actions]);

    const handleLoadJSON = useCallback((jsonData: any) => {
        try {
            if (!jsonData || typeof jsonData !== 'object') {
                toast.error("JSON inválido.");
                return;
            }

            if (jsonData.client) {
                const clientData = jsonData.client;
                const personObj: any = {
                    personType: clientData.personType || "PF",
                    fullName: clientData.fullName || "",
                    cpfCnpj: clientData.cpfCnpj || "",
                    phone: clientData.phone || "",
                    email: clientData.email || "",
                    noPhone: clientData.noPhone !== undefined ? !!clientData.noPhone : false,
                    marketingOrigin: clientData.marketingOrigin || "organic",
                    fullAddress: {
                        cep: clientData.fullAddress?.cep || "",
                        street: clientData.fullAddress?.street || "",
                        number: clientData.fullAddress?.number || "",
                        neighborhood: clientData.fullAddress?.neighborhood || "",
                        city: clientData.fullAddress?.city || "",
                        state: clientData.fullAddress?.state || "",
                        complement: clientData.fullAddress?.complement || "",
                        observation: clientData.fullAddress?.observation || ""
                    },
                    noAddress: clientData.noAddress !== undefined ? !!clientData.noAddress : false
                };

                setPendingCustomerData(personObj);
                if (jsonData.order) {
                    setPendingOrderData(jsonData.order);
                } else {
                    setPendingOrderData(null);
                }
                setIsCustomerRegistrationOpen(true);
                toast.info("Cliente identificado no JSON. Confirme o cadastro do cliente primeiro.");
            } else if (jsonData.order) {
                applyOrderData(jsonData.order);
                toast.success("Pedido preenchido com sucesso via JSON!");
            } else {
                applyOrderData(jsonData);
                toast.success("Pedido preenchido com sucesso via JSON!");
            }
        } catch (err: any) {
            toast.error("Erro ao carregar JSON: " + err.message);
        }
    }, [applyOrderData]);

    React.useEffect(() => {
        if (initialOrder) {
            form.actions.loadOrderForEditing(initialOrder);
        } else if (searchParams.get("duplicate") === "true") {
            const dupData = sessionStorage.getItem("pdv_duplicate_order");
            if (dupData) {
                try {
                    const parsed = JSON.parse(dupData);
                    form.actions.loadOrderForEditing(parsed);
                    sessionStorage.removeItem("pdv_duplicate_order");
                } catch (e) {
                    console.error("Erro ao carregar pedido duplicado:", e);
                }
            }
        }
    }, [initialOrder, searchParams, form.actions]);

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

    const isPageRoute = !propOnClose;

    const renderContent = () => (
        <div
            className={isPageRoute ? "bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden" : "bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden"}
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`sticky top-0 z-50 transition-all duration-300 border-b flex flex-col xl:flex-row justify-between items-center gap-3 shrink-0 ${isScrolled ? 'px-3 py-1.5 sm:px-6 sm:py-2 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-md border-slate-200 dark:border-slate-800' : isBudget ? 'px-3 py-2 sm:px-6 sm:py-3 bg-indigo-50/30 border-indigo-100/50 dark:bg-indigo-950/20 dark:border-indigo-900/30' : isReturn ? 'px-3 py-2 sm:px-6 sm:py-3 bg-amber-50/30 border-amber-100/50 dark:bg-amber-950/20 dark:border-amber-900/30' : isPickup ? 'px-3 py-2 sm:px-6 sm:py-3 bg-purple-50/30 border-purple-100/50 dark:bg-purple-950/20 dark:border-purple-900/30' : 'px-3 py-2 sm:px-6 sm:py-3 bg-emerald-50/30 border-emerald-100/50 dark:bg-emerald-950/20 dark:border-emerald-900/30'}`}>
                <div className="flex w-full xl:w-auto justify-between items-center">
                    <div className="flex items-center gap-2 sm:gap-3 group cursor-pointer" onClick={() => setIsScrolled(false)}>
                        <div className={`flex items-center justify-center rounded-xl sm:rounded-2xl shadow-premium transition-all duration-500 overflow-hidden ${isScrolled ? 'w-8 h-8 sm:w-9 sm:h-9' : 'w-8 h-8 sm:w-10 sm:h-10 lg:w-11 lg:h-11'} ${isBudget ? 'bg-indigo-600 shadow-indigo-500/20' : isReturn ? 'bg-amber-600 shadow-amber-500/20' : isPickup ? 'bg-purple-600 shadow-purple-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
                            <i className={`bi ${isBudget ? 'bi-calculator-fill' : isReturn ? 'bi-arrow-return-left' : isPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck'} text-white ${isScrolled ? 'text-xs sm:text-base' : 'text-sm sm:text-lg lg:text-xl'}`} />
                        </div>
                        <div className={`transition-all duration-300 ${isScrolled ? 'opacity-0 w-0 scale-95 overflow-hidden' : 'opacity-100 scale-100'}`}>
                            <h2 className={`text-sm sm:text-base md:text-lg lg:text-xl font-black tracking-tight ${isBudget ? 'text-indigo-900 dark:text-indigo-100' : isReturn ? 'text-amber-900 dark:text-amber-100' : isPickup ? 'text-purple-900 dark:text-purple-100' : 'text-emerald-900 dark:text-emerald-100'}`}>
                                {isBudget ? 'Novo Orçamento' : isReturn ? 'Nova Devolução' : 'Novo Pedido'}
                            </h2>
                            <p className="text-[7px] sm:text-[8px] font-black uppercase tracking-[0.15em] text-slate-400 group-hover:text-blue-500 transition-colors">
                                {isBudget ? 'Simulação de Venda' : isReturn ? 'Devolução de Itens' : isPickup ? 'Retirada na Loja' : 'Entrega em Domicílio'}
                            </p>
                        </div>
                    </div>

                    <div className="flex xl:hidden items-center gap-2">
                        <button
                            type="button"
                            onClick={onClose}
                            className="flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all shadow-premium-sm border border-slate-100 dark:border-slate-700 active:scale-90 w-8 h-8 sm:w-9 sm:h-9"
                        >
                            <i className="bi bi-x-lg text-xs sm:text-sm" />
                        </button>
                    </div>
                </div>

                <div className={`transition-all duration-500 w-full xl:w-auto xl:flex-1 ${isScrolled ? 'max-w-xl mx-2 sm:mx-4' : 'max-w-xl mx-2 sm:mx-4 lg:mx-8'}`}>
                    <OrderStepper 
                        currentStep={form.state.currentStep} 
                        jumpToStep={form.actions.jumpToStep} 
                        errors={form.state.errors}
                        isBudget={isBudget}
                    />
                </div>

                <div className="flex items-center gap-1.5 sm:gap-2 w-full xl:w-auto justify-center xl:justify-end">
                    <div className="flex items-center gap-1.5">
                        <button
                            type="button"
                            onClick={handleSave}
                            disabled={form.state.isSaving}
                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-black text-[9px] uppercase tracking-widest transition-all active:scale-95 disabled:opacity-50 flex items-center gap-1.5 shadow-lg shadow-blue-500/20"
                        >
                            {form.state.isSaving ? <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <i className="bi bi-cloud-arrow-up text-xs" />}
                            {isBudget ? 'Salvar' : isReturn ? 'Salvar' : 'Cadastrar'}
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className={`hidden xl:flex items-center justify-center bg-white dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all shadow-premium-sm border border-slate-100 dark:border-slate-700 active:scale-90 w-8 h-8 sm:w-9 sm:h-9`}
                    >
                        <i className="bi bi-x-lg text-xs sm:text-base" />
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

            <PersonFormModal
                isOpen={isCustomerRegistrationOpen}
                onClose={() => setIsCustomerRegistrationOpen(false)}
                collectionName="customers"
                title="Cliente"
                person={pendingCustomerData}
                onSuccess={(person) => {
                    form.actions.setCustomerData({
                        id: person.id,
                        fullName: person.fullName || person.tradeName || '',
                        phone: person.phone || '',
                        noPhone: person.noPhone || false,
                        fullAddress: person.fullAddress || {
                            cep: '', street: '', number: '', complement: '', neighborhood: '', city: '', observation: ''
                        },
                        additionalContacts: person.additionalContacts || [],
                    });
                    if (person.marketingOrigin) {
                        form.actions.setMarketingOrigin(person.marketingOrigin);
                    }
                    setIsCustomerRegistrationOpen(false);
                    if (pendingOrderData) {
                        applyOrderData(pendingOrderData);
                    }
                    toast.success("Cliente cadastrado e pedido preenchido com sucesso via JSON!");
                }}
            />

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
                    onLoadJSON={handleLoadJSON}
                    onOpenSellerSearch={() => setIsSellerSearchOpen(true)}
                    sellerRef={sellerRef}
                />
            </div>
        </div>
    );

    if (isPageRoute) {
        return (
            <div className="w-full h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden">
                {renderContent()}
            </div>
        );
    }

    return (
        <div
            className="fixed inset-x-0 bottom-0 top-[64px] xl:top-[80px] z-[90] bg-slate-900/60 backdrop-blur-sm animate-fade-in flex"
            onClick={onClose}
        >
            {renderContent()}
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
