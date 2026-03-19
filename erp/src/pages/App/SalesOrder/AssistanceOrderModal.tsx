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
import AssistanceSchedulingSection from "./AssistanceOrderModalComponents/AssistanceSchedulingSection";
import AssistanceActions from "./AssistanceOrderModalComponents/AssistanceActions";

interface AssistanceOrderModalProps {
    onClose: () => void;
    onSaveSuccess: (id?: string) => void;
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
    const [customerName, setCustomerName] = useState(order?.customerData?.fullName || initialData?.customerName || "");
    const [customerPhone, setCustomerPhone] = useState(order?.customerData?.phone || initialData?.customerPhone || "");
    const [customerNoPhone, setCustomerNoPhone] = useState(!!order?.customerData?.noPhone);
    const [description, setDescription] = useState(order?.assistanceDescription || initialData?.description || "");
    const [observation, setObservation] = useState(order?.observation || "");
    const [scheduledDate, setScheduledDate] = useState(order?.scheduledDate || "");
    const [scheduledTime, setScheduledTime] = useState(order?.scheduledTime || "");
    const [isLinked, setIsLinked] = useState(!!order?.linkedOrderId);
    const [linkedOrderId, setLinkedOrderId] = useState(order?.linkedOrderId || "");
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

    const isEditing = !!order;
    const initialDataFetched = useRef(false);

    useEffect(() => {
        const unsubscribe = subscribeToOrders((data) => {
            const filtered = data.filter(o => o.orderType !== 'assistance' && !o.deleted);
            setSaleOrders(filtered);

            if (initialData?.matchedProductId && !isEditing && !initialDataFetched.current && filtered.length > 0) {
                const sourceOrder = filtered.find(o => o.items.some(item => item.productId === initialData.matchedProductId));
                if (sourceOrder) {
                    setLinkedOrderId(sourceOrder.id || "");
                    setIsLinked(true);
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

    const handleSelectOrder = (selectedOrder: Order) => {
        setLinkedOrderId(selectedOrder.id || "");
        setSelectedAssistanceItems([]);
        setCustomerName(selectedOrder.customerData.fullName);
        setCustomerPhone(selectedOrder.customerData.phone || "");
        setCustomerNoPhone(!!(selectedOrder.customerData as any).noPhone);
        setIsSelectionModalOpen(false);
        toast.info(`Pedido #${selectedOrder.id} selecionado.`);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setValidationErrors({});

        try {
            const assistanceOrder: Order = {
                ...(order || {}),
                orderType: 'assistance',
                status: order?.status || (scheduledDate ? 'scheduled' : 'fulfilled'),
                customerData: {
                    ...(order?.customerData || EMPTY_CUSTOMER),
                    fullName: customerName.trim(),
                    phone: customerPhone.trim(),
                    noPhone: customerNoPhone,
                },
                assistanceDescription: description.trim(),
                observation: observation.trim(),
                assistanceItems: selectedAssistanceItems,
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
                    scheduling: {
                        ...(order?.shipping?.scheduling || DEFAULT_SHIPPING.scheduling),
                        date: scheduledDate,
                        time: scheduledTime,
                        startTime: scheduledTime,
                        type: 'fixed'
                    }
                },
                seller: order?.seller || "",
                date: order?.date || new Date().toISOString(),
                scheduledDate,
                scheduledTime
            };

            if (isLinked) {
                assistanceOrder.linkedOrderId = linkedOrderId;
                assistanceOrder.assistanceItems = selectedAssistanceItems;
            }

            const errors = validateAssistanceOrder(assistanceOrder);
            if (Object.keys(errors).length > 0) {
                setValidationErrors(errors);
                const firstError = Object.values(errors)[0] as string;
                toast.warning(`Campos obrigatórios: ${firstError}`);
                setLoading(false);
                return;
            }

            const savedId = await saveOrder(assistanceOrder);
            toast.success(isEditing ? "Assistência atualizada!" : "Assistência criada!");
            onSaveSuccess(savedId);
            onClose();
        } catch (error: any) {
            console.error("Erro ao salvar assistência:", error);
            toast.error(`Erro: ${error?.message || "Erro desconhecido"}`);
            setLoading(false);
        }
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
                    />

                    <AssistanceCustomerSection 
                        customerName={customerName}
                        setCustomerName={setCustomerName}
                        customerPhone={customerPhone}
                        setCustomerPhone={setCustomerPhone}
                        customerNoPhone={customerNoPhone}
                        setCustomerNoPhone={setCustomerNoPhone}
                        onOpenSearch={() => setIsCustomerSearchOpen(true)}
                        errors={validationErrors}
                        isLinked={isLinked}
                    />

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

                    <AssistanceSchedulingSection 
                        scheduledDate={scheduledDate}
                        setScheduledDate={setScheduledDate}
                        scheduledTime={scheduledTime}
                        setScheduledTime={setScheduledTime}
                        errors={validationErrors}
                    />

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
                        setCustomerName(c.fullName);
                        setCustomerPhone(c.phone || "");
                        setCustomerNoPhone(!!c.noPhone);
                        setIsCustomerSearchOpen(false);
                    }}
                />
            )}
        </div>
    );
};

export default AssistanceOrderModal;
