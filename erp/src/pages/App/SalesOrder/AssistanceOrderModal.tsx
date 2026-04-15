import React, { useState, useEffect, useMemo, useRef } from "react";
import { toast } from "react-toastify";
import Order, { AssistanceItem } from "../../types/order.type";
import Item from "../../types/items.type";
import CustomerData from "../../types/customerData.type";
import { saveOrder, subscribeToOrders } from "../../utils/orderHistoryService";
import { validateAssistanceOrder } from "../../utils/validations";

// Sub-modals
import ProductSearchModal from "./ProductSearchModal";
import OrderSelectionModal from "./OrderSelectionModal";
import CustomerSearchModal from "./CustomerSearchModal";

// Modular Components
import AssistanceOrderHeader from "./AssistanceOrderModalComponents/AssistanceOrderHeader";
import AssistanceCustomerSection from "./AssistanceOrderModalComponents/AssistanceCustomerSection";
import AssistanceLinkedOrderSection from "./AssistanceOrderModalComponents/AssistanceLinkedOrderSection";
import AssistanceDescriptionSection from "./AssistanceOrderModalComponents/AssistanceDescriptionSection";
import AssistanceExtraItemsSection from "./AssistanceOrderModalComponents/AssistanceExtraItemsSection";
import Agendamento from "./ShippingComponents/Agendamento";
import AssistanceActions from "./AssistanceOrderModalComponents/AssistanceActions";
import Seller from "./Seller";

interface AssistanceOrderModalProps {
    onClose: () => void;
    onSaveSuccess: (id?: string, order?: Order) => void;
    order?: Order | null;
    initialData?: {
        customerName?: string;
        customerPhone?: string;
        description?: string;
        matchedProductId?: string;
    };
}

const EMPTY_CUSTOMER: CustomerData = {
    fullName: "",
    phone: "",
    noPhone: false,
    fullAddress: {
        cep: "",
        street: "",
        number: "",
        complement: "",
        neighborhood: "",
        city: "",
        observation: "",
    },
};

const DEFAULT_SHIPPING: any = {
    value: 0,
    deliveryMethod: 'pickup',
    orderType: 'Standard',
    scheduling: {
        date: "",
        time: "",
        type: 'fixed'
    }
};

const AssistanceOrderModal = ({ onClose, onSaveSuccess, order, initialData }: AssistanceOrderModalProps) => {
    const [customerData, setCustomerData] = useState<CustomerData>(order?.customerData || {
        ...EMPTY_CUSTOMER,
        fullName: initialData?.customerName || "",
        phone: initialData?.customerPhone || ""
    });
    const [description, setDescription] = useState(order?.assistanceDescription || initialData?.description || "");
    const [observation, setObservation] = useState(order?.observation || "");
    const [scheduling, setScheduling] = useState<any>(order?.shipping?.scheduling || {
        date: order?.scheduledDate || "",
        startTime: order?.scheduledTime || "",
        endTime: "",
        type: 'fixed',
        notInformed: false
    });
    const [isLinked, setIsLinked] = useState(!!order?.linkedOrderId);
    const [linkedOrderId, setLinkedOrderId] = useState(order?.linkedOrderId || "");
    const [seller, setSeller] = useState(order?.seller || "");
    const [selectedAssistanceItems, setSelectedAssistanceItems] = useState<AssistanceItem[]>(order?.assistanceItems || []);
    const [extraItems, setExtraItems] = useState<Item[]>(order?.items || []);
    const [assistanceCost, setAssistanceCost] = useState(order?.assistanceCost || 0); 
    const [assistanceServiceValue, setAssistanceServiceValue] = useState(order?.assistanceServiceValue || 0); 
    const [saleOrders, setSaleOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(false);
    const [isProductSearchOpen, setIsProductSearchOpen] = useState(false);
    const [isCustomerSearchOpen, setIsCustomerSearchOpen] = useState(false);
    const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
    const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});
    const [currentOrderId, setCurrentOrderId] = useState(order?.id);
    const [status, setStatus] = useState(order?.status || 'draft');

    const isEditing = !!order;
    const initialDataFetched = useRef(false);

    // Sync state when order prop changes (important for editing existing orders)
    useEffect(() => {
        if (order) {
            setCustomerData(order.customerData || EMPTY_CUSTOMER);
            setDescription(order.assistanceDescription || "");
            setObservation(order.observation || "");
            if (order.shipping?.scheduling) {
                setScheduling(order.shipping.scheduling);
            } else {
                setScheduling({
                    date: order.scheduledDate || "",
                    startTime: order.scheduledTime || "",
                    endTime: "",
                    type: 'fixed',
                    notInformed: false
                });
            }
            setIsLinked(!!order.linkedOrderId);
            setLinkedOrderId(order.linkedOrderId || "");
            setSelectedAssistanceItems(order.assistanceItems || []);
            setExtraItems(order.items || []);
            setAssistanceCost(order.assistanceCost || 0);
            setAssistanceServiceValue(order.assistanceServiceValue || 0);
            setSeller(order.seller || "");
        }
    }, [order]);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((data) => {
            const filtered = data.filter(o => o.orderType !== 'assistance' && !o.deleted);
            setSaleOrders(filtered);

            if (initialData?.matchedProductId && !isEditing && !initialDataFetched.current && filtered.length > 0) {
                const sourceOrder = filtered.find(o => o.items.some(item => item.productId === initialData.matchedProductId));
                if (sourceOrder) {
                    setLinkedOrderId(sourceOrder.id || "");
                    setIsLinked(true);
                    setSeller(sourceOrder.seller || "");
                    setCustomerData(sourceOrder.customerData || EMPTY_CUSTOMER);
                    const item = sourceOrder.items.find(i => i.productId === initialData.matchedProductId);
                    if (item) {
                        setSelectedAssistanceItems([{
                            id: Math.random().toString(36).substr(2, 9),
                            description: item.description,
                            quantity: 1,
                            originalOrderId: sourceOrder.id || ""
                        }]);
                    }
                    initialDataFetched.current = true;
                    toast.info(`Vínculo automático: Pedido #${sourceOrder.id} detectado.`);
                }
            }
        });
        return () => unsubscribe();
    }, [initialData, isEditing]);

    const currentLinkedOrder = useMemo(() =>
        saleOrders.find(o => o.id === linkedOrderId),
        [saleOrders, linkedOrderId]
    );

    const handleChangeScheduling = (key: string, value: any) => {
        setScheduling((prev: any) => ({
            ...prev,
            [key]: value
        }));
    };

    const handleToggleItem = (itemDescription: string, maxQty: number) => {
        const exists = selectedAssistanceItems.find(i => i.description === itemDescription);
        if (exists) {
            setSelectedAssistanceItems(prev => prev.filter(i => i.description !== itemDescription));
        } else {
            setSelectedAssistanceItems(prev => [...prev, {
                id: Math.random().toString(36).substr(2, 9),
                description: itemDescription,
                quantity: 1,
                originalOrderId: linkedOrderId
            }]);
        }
    };

    const handleUpdateItemQty = (description: string, qty: number, maxQty: number) => {
        if (qty < 1) return;
        if (qty > maxQty) {
            toast.warning(`Quantidade máxima disponível: ${maxQty}`);
            return;
        }
        setSelectedAssistanceItems(prev => prev.map(i =>
            i.description === description ? { ...i, quantity: qty } : i
        ));
    };

    const handleUpdateItemHandling = (description: string, handling: string) => {
        setSelectedAssistanceItems(prev => prev.map(i =>
            i.description === description ? { ...i, handlingType: handling } : i
        ));
    };



    const handleSelectOrder = (selectedOrder: Order) => {
        setLinkedOrderId(selectedOrder.id || "");
        setSelectedAssistanceItems([]);
        setCustomerData(selectedOrder.customerData);
        setSeller(selectedOrder.seller || "");
        setIsSelectionModalOpen(false);
        toast.info(`Pedido #${selectedOrder.id} selecionado.`);
    };

    const getOrderData = (isDraft: boolean): Order => {
        const assistanceOrder: Order = {
            ...(order || {}),
            id: currentOrderId,
            orderType: 'assistance',
            status: isDraft ? 'draft' : ((status && status !== 'draft') ? status : (scheduling.date ? 'scheduled' : 'fulfilled')),
            customerData: {
                ...customerData,
                fullName: customerData.fullName.trim(),
                phone: customerData.phone.trim()
            },
            assistanceDescription: description.trim(),
            observation: observation.trim(),
            assistanceItems: isLinked ? selectedAssistanceItems : [],
            items: extraItems,
            itemsSummary: {
                totalQuantity: extraItems.reduce((acc, i) => acc + i.quantity, 0),
                itemsSubtotal: extraItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0),
                totalFixedDiscount: 0,
                itemsTotalValue: extraItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0),
                totalItemsCost: extraItems.reduce((acc, i) => acc + (i.quantity * (i.costPrice || 0)), 0),
            },
            assistanceCost,
            assistanceServiceValue,
            payments: order?.payments || [],
            paymentsSummary: order?.paymentsSummary || {
                totalPaymentsFee: 0,
                totalOrderValue: extraItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0) + assistanceServiceValue,
                totalAmountPaid: 0,
                amountRemaining: extraItems.reduce((acc, i) => acc + (i.quantity * i.unitPrice), 0) + assistanceServiceValue
            },
            shipping: {
                ...(order?.shipping || DEFAULT_SHIPPING),
                scheduling: scheduling
            },
            seller: seller.trim(),
            date: order?.date || new Date().toISOString(),
            scheduledDate: scheduling.date,
            scheduledTime: scheduling.startTime || ""
        };

        if (isLinked) {
            assistanceOrder.linkedOrderId = linkedOrderId;
        } else {
            assistanceOrder.linkedOrderId = undefined;
        }

        return assistanceOrder;
    };

    const autoSaveTimerRef = useRef<any>(null);

    useEffect(() => {
        if (!initialDataFetched.current && !isEditing) return;
        if (status !== 'draft' && currentOrderId) return;
        
        const isDefaultState = !customerData.fullName && !description && !observation && extraItems.length === 0 && selectedAssistanceItems.length === 0;
        if (isDefaultState) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        
        autoSaveTimerRef.current = setTimeout(async () => {
            if (loading) return;
            const draftOrder = getOrderData(true);
            try {
                const savedId = await saveOrder(draftOrder);
                if (!currentOrderId && savedId) {
                    setCurrentOrderId(savedId);
                }
            } catch (error) {
                console.error("Auto-save failed", error);
            }
        }, 2000);
        
        return () => clearTimeout(autoSaveTimerRef.current);
    }, [customerData, description, observation, scheduling, isLinked, linkedOrderId, seller, selectedAssistanceItems, extraItems, assistanceCost, assistanceServiceValue]);

    const handleSaveBase = async (isDraft: boolean) => {
        setLoading(true);
        setValidationErrors({});

        try {
            const assistanceOrder = getOrderData(isDraft);

            const errors = validateAssistanceOrder(assistanceOrder);
            if (!isDraft && Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                const firstError = Object.values(errors)[0] as string;
                toast.warning(`Campos obrigatórios: ${firstError}`);
                setLoading(false);
                return;
            }

            const savedId = await saveOrder(assistanceOrder);
            toast.success(isEditing ? "Assistência atualizada!" : "Assistência finalizada!");
            onSaveSuccess(savedId, assistanceOrder);
            onClose();
        } catch (error: any) {
            console.error("Erro ao salvar assistência:", error);
            toast.error(`Erro: ${error?.message || "Erro desconhecido"}`);
            setLoading(false);
        }
    };

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        handleSaveBase(false);
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-[3px] animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-t-[2.5rem] sm:rounded-[2.5rem] shadow-2xl flex flex-col overflow-hidden animate-slide-up border-t sm:border border-slate-100 dark:border-slate-800" style={{ height: '90vh', maxHeight: '90vh' }} onClick={e => e.stopPropagation()}>
                
                <AssistanceOrderHeader isEditing={isEditing} onClose={onClose} />

                <form onSubmit={handleSave} className="p-8 flex flex-col gap-6 overflow-y-auto custom-scrollbar">
                    
                    <AssistanceLinkedOrderSection 
                        isLinked={isLinked}
                        setIsLinked={setIsLinked}
                        linkedOrderId={linkedOrderId}
                        onOpenSearch={() => setIsSelectionModalOpen(true)}
                        currentLinkedOrder={currentLinkedOrder}
                        selectedAssistanceItems={selectedAssistanceItems}
                        handleToggleItem={handleToggleItem}
                        handleUpdateItemQty={handleUpdateItemQty}
                        handleUpdateItemHandling={handleUpdateItemHandling}
                    />

                    <AssistanceCustomerSection 
                        customerData={customerData}
                        setCustomerData={setCustomerData}
                        onOpenSearch={() => setIsCustomerSearchOpen(true)}
                        errors={validationErrors}
                        isLinked={isLinked}
                    />

                    <div className="flex flex-col gap-4">
                        <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500 flex items-center gap-2">
                            <i className="bi bi-person-badge-fill text-amber-500" />
                            Vendedor
                        </h3>
                        <Seller 
                            seller={seller}
                            setSeller={setSeller}
                            errors={validationErrors}
                        />
                    </div>

                    <AssistanceDescriptionSection 
                        description={description}
                        setDescription={setDescription}
                        observation={observation}
                        setObservation={setObservation}
                        assistanceServiceValue={assistanceServiceValue}
                        setAssistanceServiceValue={setAssistanceServiceValue}
                        assistanceCost={assistanceCost}
                        setAssistanceCost={setAssistanceCost}
                        errors={validationErrors}
                    />

                    <div className="flex flex-col gap-4">
                        <Agendamento 
                            scheduling={scheduling}
                            onChangeScheduling={handleChangeScheduling}
                            errors={validationErrors}
                            isPickup={false}
                        />
                    </div>

                    <AssistanceActions onClose={onClose} isLoading={loading} isEditing={isEditing} />
                </form>
            </div>

            {isSelectionModalOpen && (
                <OrderSelectionModal 
                    orders={saleOrders}
                    onClose={() => setIsSelectionModalOpen(false)}
                    onSelect={handleSelectOrder}
                />
            )}

            {isProductSearchOpen && (
                <ProductSearchModal 
                    onClose={() => setIsProductSearchOpen(false)}
                    onSelect={(p, v) => {
                        const desc = v ? `${p.description} (${v.name})` : p.description;
                        setExtraItems(prev => [...prev, {
                            productId: p.id!,
                            variationId: v?.id,
                            description: desc,
                            quantity: 1,
                            unitPrice: (v ? v.unitPrice : p.unitPrice) || 0,
                            unitDiscount: 0,
                            discountType: 'fixed',
                            handlingType: 'Standard'
                        }]);
                        setIsProductSearchOpen(false);
                    }}
                />
            )}

            {isCustomerSearchOpen && (
                <CustomerSearchModal 
                    onClose={() => setIsCustomerSearchOpen(false)}
                    onSelect={(c) => {
                        setCustomerData(c);
                        setIsCustomerSearchOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default AssistanceOrderModal;
