import React, { useEffect, useCallback, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import SalesOrderFormSection from "./SalesOrderFormSection";
import { useSalesOrderForm, parseStorageDateToLocal } from "./useSalesOrderForm";
import Order from "../../types/order.type";
import { updateOrder, fetchOrderById } from "../../utils/orderHistoryService";
import { toast } from "react-toastify";
import OrderStatusTimeline from "./OrderStatusTimeline";
import OrderStepper from "./OrderStepper";
import SellerSearchModal from "./SellerSearchModal";
import PersonFormModal from "../Registrations/shared/PersonFormModal";
import { migrateOrderHandlings } from '@/pages/utils/handlingMigration';

interface OrderEditModalProps {
    order?: Order;
    orderId?: string;
    onClose?: () => void;
    onSaveSuccess?: (id?: string, order?: Order) => void;
}

const OrderEditModal = ({ order, orderId, onClose: propOnClose, onSaveSuccess: propOnSaveSuccess }: OrderEditModalProps) => {
    const { id: paramId } = useParams();
    const navigate = useNavigate();

    const id = orderId || paramId;
    const [loadedOrder, setLoadedOrder] = useState<Order | null>(null);
    const [isLoadingOrder, setIsLoadingOrder] = useState(!!id && !order);

    const effectiveOrder = order || loadedOrder;
    const onClose = propOnClose || (() => navigate("/sales-order"));
    const onSaveSuccess = propOnSaveSuccess || (() => {
        navigate("/sales-order");
    });

    const form = useSalesOrderForm();
    const [view, setView] = useState<'form' | 'timeline'>('form');
    const [isSellerSearchOpen, setIsSellerSearchOpen] = useState(false);
    const [isSellerRegistrationOpen, setIsSellerRegistrationOpen] = useState(false);
    const [isScrolled, setIsScrolled] = useState(false);
    const sellerRef = React.useRef<HTMLButtonElement>(null);
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    const [isCustomerRegistrationOpen, setIsCustomerRegistrationOpen] = useState(false);
    const [pendingCustomerData, setPendingCustomerData] = useState<any>(null);
    const [pendingOrderData, setPendingOrderData] = useState<any>(null);

    const applyOrderData = useCallback((orderData: any) => {
        const migrated = migrateOrderHandlings(orderData);
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
            form.actions.setShipping((prev: any) => ({
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
        const el = scrollContainerRef.current;
        if (!el) return;
        const handleScroll = () => {
            setIsScrolled(el.scrollTop > 50);
        };
        el.addEventListener('scroll', handleScroll);
        return () => el.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        if (id && !order) {
            setIsLoadingOrder(true);
            fetchOrderById(id).then((ord) => {
                if (ord) {
                    setLoadedOrder(ord);
                } else {
                    toast.error("Pedido não encontrado.");
                    if (!orderId) navigate("/sales-order");
                }
                setIsLoadingOrder(false);
            });
        }
    }, [id, order, navigate, orderId]);

    const loadedOrderIdRef = useRef<string | null>(null);

    useEffect(() => {
        if (effectiveOrder && effectiveOrder.id && loadedOrderIdRef.current !== effectiveOrder.id) {
            loadedOrderIdRef.current = effectiveOrder.id;
            form.actions.loadOrderForEditing(effectiveOrder);
        }
    }, [effectiveOrder, form.actions]);

    const handleUpdate = useCallback(async (e?: React.MouseEvent) => {
        e?.preventDefault();

        if (!effectiveOrder) return false;
        const updatedOrder = { ...form.state.currentOrder, id: effectiveOrder.id };

        const validationErrors = form.actions.validateOrder(updatedOrder);
        if (Object.keys(validationErrors).length > 0) {
            form.actions.setErrors(validationErrors);
            toast.error("Existem campos obrigatórios não preenchidos.");
            return false;
        }

        try {
            await updateOrder(effectiveOrder.id!, updatedOrder, effectiveOrder);
            toast.success("Edição salva com sucesso!");
            onSaveSuccess(effectiveOrder.id, updatedOrder);
            onClose();
            return effectiveOrder.id;
        } catch (error) {
            console.error("Erro ao atualizar pedido:", error);
            toast.error("Falha ao atualizar pedido.");
            return false;
        }
    }, [form.actions, form.state.currentOrder, effectiveOrder, onSaveSuccess, onClose]);

    const handleFinalize = useCallback(async (e?: React.MouseEvent) => {
        const result = await form.actions.handleCompleteOrder(e);
        if (result && effectiveOrder) {
            const updatedOrder = { ...form.state.currentOrder, id: form.state.currentOrder.id || effectiveOrder.id || String(result) };
            onSaveSuccess(String(result), updatedOrder);
            onClose();
            return String(result);
        }
        return false;
    }, [form.actions, onSaveSuccess, onClose, form.state.currentOrder, effectiveOrder]);

    const isPageRoute = !propOnClose;

    if (isLoadingOrder || !effectiveOrder) {
        return (
            <div className="w-full min-h-[60vh] flex flex-col items-center justify-center gap-4">
                <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-400 dark:text-slate-500 animate-pulse">Carregando Pedido...</p>
            </div>
        );
    }

    const renderContent = () => (
        <div
            className="bg-white dark:bg-slate-900 w-full h-full flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
        >
            {/* Header */}
            <div className="px-4 py-3 sm:px-6 sm:py-3.5 border-b border-slate-100 dark:border-slate-800 flex flex-col lg:flex-row justify-between items-center bg-white/80 dark:bg-slate-900/80 backdrop-blur-md transition-colors duration-300 shrink-0 gap-3">
                {/* Esquerda: Identificação */}
                <div className="flex w-full lg:w-auto justify-between items-center shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="bg-blue-600 p-2 sm:p-2.5 rounded-xl shadow-md shadow-blue-500/20 text-white flex items-center justify-center">
                            <i className="bi bi-pencil-square text-sm sm:text-base" />
                        </div>
                        <div>
                            <h2 className="text-sm sm:text-base font-black text-slate-800 dark:text-slate-100 tracking-tight">Editar Pedido</h2>
                            <p className="text-[9px] uppercase font-bold text-slate-400 dark:text-slate-500 tracking-wider">
                                Pedido de Venda
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

                {/* Centro: Stepper de Etapas */}
                <div className="w-full lg:flex-1 max-w-2xl px-1 sm:px-4 flex justify-center min-w-0">
                    <OrderStepper
                        currentStep={form.state.currentStep}
                        jumpToStep={form.actions.jumpToStep}
                        errors={form.state.errors}
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

            {/* Seller Search Modal */}
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

            {/* Seller Registration Modal */}
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

            {/* Customer Registration Modal */}
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

            {/* Content */}
            <div className="flex-1 overflow-auto bg-white dark:bg-slate-900 custom-scrollbar" ref={scrollContainerRef}>
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
                        onLoadJSON={handleLoadJSON}
                        onOpenSellerSearch={() => setIsSellerSearchOpen(true)}
                        sellerRef={sellerRef}
                    />
                ) : (
                    <OrderStatusTimeline orderId={effectiveOrder.id!} />
                )}
            </div>
        </div>
    );

    if (isPageRoute) {
        return (
            <div className="w-full h-[calc(100vh-64px)] xl:h-[calc(100vh-80px)] overflow-hidden animate-fade-in">
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
                @keyframes slide-up { from { transform: translateY(30px); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
                .animate-fade-in { animation: fade-in 0.3s ease-out forwards; }
                .animate-slide-up { animation: slide-up 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};

export default OrderEditModal;
