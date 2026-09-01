import React, { useCallback, useRef, useState } from "react";
import { useSalesOrderForm } from "./useSalesOrderForm";
import Order from "../../types/order.type";
import SalesOrderFormSection from "./SalesOrderFormSection";
import OrderStepper from "./OrderStepper";
import { toast } from "react-toastify";
import SellerSearchModal from "./SellerSearchModal";
import PersonFormModal from "../Registrations/shared/PersonFormModal";
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
            className="bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            <div className={`sticky top-0 z-50 transition-all duration-300 border-b flex flex-col lg:flex-row justify-between items-center gap-3 px-4 py-3 sm:px-6 sm:py-3.5 shrink-0 ${isScrolled ? 'bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-md border-slate-200 dark:border-slate-800' : isBudget ? 'bg-indigo-50/40 border-indigo-100/60 dark:bg-indigo-950/20 dark:border-indigo-900/30' : isReturn ? 'bg-amber-50/40 border-amber-100/60 dark:bg-amber-950/20 dark:border-amber-900/30' : isPickup ? 'bg-purple-50/40 border-purple-100/60 dark:bg-purple-950/20 dark:border-purple-900/30' : 'bg-emerald-50/40 border-emerald-100/60 dark:bg-emerald-950/20 dark:border-emerald-900/30'}`}>
                {/* Esquerda: Identificação */}
                <div className="flex w-full lg:w-auto justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className={`flex items-center justify-center w-9 h-9 sm:w-10 sm:h-10 rounded-xl shadow-md transition-all ${isBudget ? 'bg-indigo-600 shadow-indigo-500/20' : isReturn ? 'bg-amber-600 shadow-amber-500/20' : isPickup ? 'bg-purple-600 shadow-purple-500/20' : 'bg-emerald-600 shadow-emerald-500/20'}`}>
                            <i className={`bi ${isBudget ? 'bi-calculator-fill' : isReturn ? 'bi-arrow-return-left' : isPickup ? 'bi-shop' : 'bi-truck'} text-white text-sm sm:text-base`} />
                        </div>
                        <div>
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className={`text-sm sm:text-base font-black tracking-tight ${isBudget ? 'text-indigo-900 dark:text-indigo-100' : isReturn ? 'text-amber-900 dark:text-amber-100' : isPickup ? 'text-purple-900 dark:text-purple-100' : 'text-emerald-900 dark:text-emerald-100'}`}>
                                    {isBudget ? 'Novo Orçamento' : isReturn ? 'Nova devolução sem venda vinculada' : 'Novo Pedido'}
                                </h2>
                                {form.state.orderIndex ? (
                                    <span className="inline-flex items-center font-mono text-[11px] font-black px-2.5 py-0.5 rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm border border-slate-700/50">
                                        #{String(form.state.orderIndex).padStart(6, '0')}
                                    </span>
                                ) : form.state.isGeneratingCode ? (
                                    <span className="inline-flex items-center gap-1 font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300 animate-pulse">
                                        <i className="bi bi-arrow-repeat animate-spin text-[10px]" /> Gerando código...
                                    </span>
                                ) : (
                                    <span className="inline-flex items-center font-mono text-[10px] font-bold px-2 py-0.5 rounded-lg bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                                        Sem código
                                    </span>
                                )}
                            </div>
                            <p className="text-[9px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                                {isBudget ? 'Simulação de Venda' : isReturn ? 'Informe cliente e itens devolvidos; este pedido não terá vínculo com uma venda.' : isPickup ? 'Retirada na Loja' : 'Entrega em Domicílio'}
                            </p>
                        </div>
                    </div>

                    {/* Botão Fechar no Mobile */}
                    <button
                        type="button"
                        onClick={onClose}
                        className="lg:hidden flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all w-8 h-8 active:scale-90"
                        title="Fechar"
                    >
                        <i className="bi bi-x-lg text-xs" />
                    </button>
                </div>

                {/* Centro: Stepper */}
                <div className="w-full lg:flex-1 max-w-2xl px-1 sm:px-4 flex justify-center min-w-0">
                    <OrderStepper 
                        currentStep={form.state.currentStep} 
                        jumpToStep={form.actions.jumpToStep} 
                        errors={form.state.errors}
                        isBudget={isBudget}
                    />
                </div>

                {/* Direita: Botão Fechar no Desktop */}
                <div className="hidden lg:flex items-center shrink-0">
                    <button
                        type="button"
                        onClick={onClose}
                        className="flex items-center justify-center bg-slate-100 dark:bg-slate-800 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-slate-400 hover:text-rose-500 rounded-xl transition-all shadow-sm border border-slate-200/60 dark:border-slate-700/60 active:scale-90 w-9 h-9"
                        title="Fechar"
                    >
                        <i className="bi bi-x-lg text-xs" />
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
            className="fixed inset-0 z-[9000] flex bg-slate-900/60 backdrop-blur-sm animate-fade-in"
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
