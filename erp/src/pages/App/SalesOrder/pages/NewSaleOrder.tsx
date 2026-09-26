import React, { useCallback, useRef, useState, useEffect } from "react";
import { useSalesOrderForm } from '../useSalesOrderForm';
import Order from '@/pages/types/order.type';
import SalesOrderFormSection from '../SalesOrderFormSection';
import OrderStepper from '../OrderStepper';
import { toast } from "react-toastify";
import SellerSearchModal from '../SellerSearchModal';
import PersonFormModal from '@/pages/App/Registrations/shared/modals/PersonFormModal';
import { useSearchParams } from "react-router-dom";

type NewSaleOrderProps = {
    onClose?: () => void;
    onSaveSuccess?: (orderId?: string, orderData?: Order) => void;
    initialOrder?: Order;
    defaultDeliveryMethod?: 'delivery' | 'pickup';
    defaultOrderType?: Order['orderType'];
};

const NewSaleOrder = ({
    onClose: propOnClose,
    onSaveSuccess = () => {},
    initialOrder,
    defaultDeliveryMethod = 'delivery',
    defaultOrderType = 'sale'
}: NewSaleOrderProps) => {
    useEffect(() => {
        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, []);

    const [searchParams] = useSearchParams();
    const typeFromQuery = searchParams.get("type") as Order['orderType'] | null;
    const initialType = defaultOrderType || typeFromQuery || 'sale';

    const form = useSalesOrderForm(defaultDeliveryMethod, initialType);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const [isScrolled, setIsScrolled] = useState(false);

    // Modal de Busca/Seleção de Vendedores
    const [isSellerSearchOpen, setIsSellerSearchOpen] = useState(false);
    const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = useState(false);
    const sellerRef = useRef<HTMLButtonElement>(null);

    // Modal de Cadastro Rápido de Cliente (via Preenchimento IA)
    const [isCustomerRegistrationOpen, setIsCustomerRegistrationOpen] = useState(false);
    const [pendingCustomerData, setPendingCustomerData] = useState<any>(null);
    const [pendingOrderData, setPendingOrderData] = useState<any>(null);

    const isBudget = form.state.currentOrder.orderType === 'budget';
    const isReturn = form.state.currentOrder.orderType === 'return';
    const isPickup = form.state.shipping.deliveryMethod === 'pickup';

    const onClose = useCallback(() => {
        if (propOnClose) {
            propOnClose();
        } else {
            window.history.back();
        }
    }, [propOnClose]);

    const applyOrderData = useCallback((migrated: any) => {
        if (migrated.seller) form.actions.setSeller(migrated.seller);
        if (migrated.customerData) form.actions.setCustomerData(migrated.customerData);
        if (migrated.observation) form.actions.setObservation(migrated.observation);
        if (migrated.marketingOrigin) form.actions.setMarketingOrigin(migrated.marketingOrigin);
        if (migrated.shipping) {
            form.actions.setShipping(prev => ({
                ...prev,
                ...migrated.shipping,
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
                orderItemId: item.orderItemId || crypto.randomUUID(),
                linkedProductOrderItemId: item.linkedProductOrderItemId || undefined,
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
                        complement: clientData.fullAddress?.complement || "",
                        observation: clientData.fullAddress?.observation || "",
                    },
                    additionalContacts: clientData.additionalContacts || [],
                };

                setPendingCustomerData(personObj);
                setPendingOrderData(jsonData);
                setIsCustomerRegistrationOpen(true);
                return;
            }

            applyOrderData(jsonData);
            toast.success("Pedido preenchido com sucesso via JSON!");
        } catch (err: any) {
            toast.error("Erro ao carregar JSON: " + err.message);
        }
    }, [applyOrderData]);

    const loadedInitialRef = React.useRef(false);
    React.useEffect(() => {
        if (loadedInitialRef.current) return;
        if (initialOrder) {
            loadedInitialRef.current = true;
            form.actions.loadOrderForEditing(initialOrder);
        } else if (searchParams.get("duplicate") === "true") {
            const dupData = sessionStorage.getItem("pdv_duplicate_order");
            if (dupData) {
                try {
                    loadedInitialRef.current = true;
                    const parsed = JSON.parse(dupData);
                    // Garante que duplicações nunca herdem o código nem ID do pedido original
                    delete parsed.id;
                    delete parsed.orderIndex;
                    delete parsed.orderNumber;
                    delete (parsed as any).order_index;
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
            const savedId = typeof result === 'string' ? result : (result as any)?.id;
            const completedOrder = typeof result === 'object' && result !== null
                ? result
                : { ...form.state.currentOrder, id: savedId };
            onSaveSuccess(savedId, completedOrder);
            onClose();
        }
        return result;
    }, [form.actions, form.state.currentOrder, onSaveSuccess, onClose]);

    const handleComplete = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();
        const result = await form.actions.handleCompleteOrder(e);
        if (result) {
            const savedId = typeof result === 'string' ? result : (result as any)?.id;
            const completedOrder = typeof result === 'object' && result !== null
                ? result
                : { ...form.state.currentOrder, id: savedId, status: 'scheduled' };
            onSaveSuccess(savedId, completedOrder);
            onClose();
        }
        return result;
    }, [form.actions, form.state.currentOrder, onSaveSuccess, onClose]);

    const isPageRoute = !propOnClose;

    const renderContent = () => (
        <div
            className="relative bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {form.state.isSaving && (
                <div className="absolute inset-0 z-[120] flex flex-col items-center justify-center gap-3 bg-slate-950/30 backdrop-blur-[1px]" aria-live="polite" aria-busy="true">
                    <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 text-sm font-black text-slate-800 shadow-2xl dark:bg-slate-900 dark:text-white">
                        <i className="bi bi-arrow-repeat animate-spin text-lg text-emerald-600" />
                        Salvando pedido com segurança…
                    </div>
                    <span className="text-xs font-bold text-white">O formulário permanecerá aberto até a confirmação.</span>
                </div>
            )}
            <div className={`sticky top-0 z-50 transition-all duration-300 border-b flex flex-row justify-between items-center gap-4 px-2 py-2 sm:gap-6 sm:px-4 sm:py-2.5 lg:px-6 shrink-0 ${isScrolled ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-md border-slate-200 dark:border-slate-800' : isBudget ? 'bg-indigo-50/40 border-indigo-100/60 dark:bg-indigo-950/20 dark:border-indigo-900/30' : isReturn ? 'bg-amber-50/40 border-amber-100/60 dark:bg-amber-950/20 dark:border-amber-900/30' : isPickup ? 'bg-purple-50/40 border-purple-100/60 dark:bg-purple-950/20 dark:border-purple-900/30' : 'bg-emerald-50/40 border-emerald-100/60 dark:bg-emerald-950/20 dark:border-emerald-900/30'}`}>
                {/* Esquerda: Identificação */}
                <div className="flex min-w-0 items-center shrink-0">
                    <div className="flex min-w-0 items-center gap-1.5 sm:gap-3">
                        <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg shadow-md transition-all sm:h-10 sm:w-10 sm:rounded-xl ${isBudget ? 'bg-indigo-600 shadow-indigo-500/20' : isReturn ? 'bg-amber-600 shadow-amber-500/20' : isPickup ? 'bg-purple-600 shadow-purple-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
                            <i className={`bi ${isBudget ? 'bi-calculator-fill' : isReturn ? 'bi-arrow-return-left' : isPickup ? 'bi-shop' : 'bi-truck'} text-white text-xs sm:text-base`} />
                        </div>
                        <div className="min-w-0">
                            <div className="flex min-w-0 items-center gap-1 sm:gap-2">
                                <h2 className={`truncate text-xs font-black tracking-tight sm:text-base ${isBudget ? 'text-indigo-900 dark:text-indigo-100' : isReturn ? 'text-amber-900 dark:text-amber-100' : isPickup ? 'text-purple-900 dark:text-purple-100' : 'text-emerald-900 dark:text-emerald-100'}`}>
                                    {isBudget ? 'Novo Orçamento' : isReturn ? 'Nova devolução sem venda vinculada' : 'Novo Pedido'}
                                </h2>
                                {form.state.orderIndex ? (
                                    <span className="inline-flex shrink-0 items-center rounded-md border border-slate-700/50 bg-slate-900 px-1.5 py-0.5 font-mono text-[8px] font-black text-white shadow-sm dark:bg-white dark:text-slate-900 sm:rounded-lg sm:px-2.5 sm:text-[11px]">
                                        #{String(form.state.orderIndex).padStart(6, '0')}
                                    </span>
                                ) : form.state.isGeneratingCode ? (
                                    <span className="inline-flex shrink-0 items-center gap-1 rounded-md bg-blue-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 sm:rounded-lg sm:px-2 sm:text-[10px] animate-pulse">
                                        <i className="bi bi-arrow-repeat animate-spin text-[10px]" /> Gerando código...
                                    </span>
                                ) : (
                                    <span className="inline-flex shrink-0 items-center rounded-md bg-rose-100 px-1.5 py-0.5 font-mono text-[8px] font-bold text-rose-700 dark:bg-rose-900/40 dark:text-rose-300 sm:rounded-lg sm:px-2 sm:text-[10px]">
                                        Sem código
                                    </span>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Centro: Stepper */}
                <div className="flex flex-1 min-w-0 justify-center px-1 sm:px-3 2xl:max-w-4xl mx-auto">
                    <OrderStepper 
                        currentStep={form.state.currentStep} 
                        jumpToStep={form.actions.jumpToStep} 
                        errors={form.state.errors}
                        isBudget={isBudget}
                    />
                </div>

                <button type="button" onClick={onClose} className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-500 dark:bg-slate-800 dark:hover:bg-rose-950/30 sm:h-9 sm:w-9 sm:rounded-xl" title="Fechar" aria-label="Fechar pedido">
                    <i className="bi bi-x-lg text-xs" />
                </button>
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

    return (
        <div
            className="fixed inset-0 z-[999999] w-screen h-screen flex flex-col bg-slate-900/60 backdrop-blur-sm animate-fade-in overflow-hidden"
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
