import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Order, { AssistanceItem } from "../../types/order.type";
import Item from "../../types/items.type";
import useItems from "./hooks/useItems";
import useShipping from "./hooks/useShipping";
import usePaymentsData from "./hooks/usePayments";
import { useCustomerData } from "./hooks/useCustomerData";
import { calcPaymentsSummary, calcItemsSummary } from "../../utils/calculations";
import { toast } from "react-toastify";
import { saveOrder, resolveCompletedOrderStatus } from "../../utils/orderHistoryService";
import { validateBase, validateOrder, ValidationErrors } from "../../utils/validations";
import Shipping from "../../types/Shipping.type";
import CustomerData from "../../types/customerData.type";
import { migrateOrderHandlings } from '@/pages/utils/handlingMigration';
import { getOrderIndex } from "../../utils/orderCode";
import { getCurrentDatetimeLocal, formatToStorageDate, parseStorageDateToLocal } from "./hooks/orderDateFormatting";
import { useOrderCodeGenerator } from "./hooks/useOrderCodeGenerator";
import { useOrderDistanceCalculator } from "./hooks/useOrderDistanceCalculator";
import { useOrderProductSelection } from "./hooks/useOrderProductSelection";
import { useOrderAutoSave } from "./hooks/useOrderAutoSave";

export { parseStorageDateToLocal };

export const useSalesOrderForm = (initialDeliveryMethod?: 'delivery' | 'pickup', initialOrderType: Order['orderType'] = 'sale') => {
    const { items, setItems } = useItems();
    const { shipping, setShipping } = useShipping(initialDeliveryMethod);
    const { payments, setPayments } = usePaymentsData();
    const { customerData, setCustomerData } = useCustomerData();
    
    const [observation, setObservation] = useState("");
    const [seller, setSeller] = useState("");
    const [sellerId, setSellerId] = useState<string | undefined>(undefined);
    const [marketingOrigin, setMarketingOrigin] = useState("organic");
    const [orderDate, setOrderDate] = useState(() => getCurrentDatetimeLocal());
    const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(undefined);
    const [status, setStatus] = useState<string>('draft');
    const [isSaving, setIsSaving] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [orderType, setOrderType] = useState<Order['orderType']>(initialOrderType);
    const [assistanceItems, setAssistanceItems] = useState<AssistanceItem[]>([]);
    const [assistanceServiceValue, setAssistanceServiceValue] = useState(0);
    const [assistanceCost, setAssistanceCost] = useState(0);
    const [linkedOrderId, setLinkedOrderId] = useState("");
    const [currentStep, setCurrentStep] = useState(1);

    const prevDeliveryMethodRef = useRef(shipping.deliveryMethod);
    const prevGlobalOrderTypeRef = useRef(shipping.orderType);
    const prevFirstItemHandlingRef = useRef(items[0]?.handlingType);

    const itemsSummary = calcItemsSummary(items);
    const paymentsSummary = calcPaymentsSummary(payments, itemsSummary, shipping.value);

    // Stable state ref for callbacks and async operations
    const latestState = useRef<any>({});
    useEffect(() => {
        latestState.current = {
            currentOrderId, orderIndex: null, isGeneratingCode: false, status, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, sellerId, marketingOrigin, orderDate, isSaving, isSavingDraft: false,
            orderType, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, currentStep
        };
    });

    // Sub-hooks modularizados
    const {
        orderIndex,
        setOrderIndex,
        isGeneratingCode,
        generateCodeForCopyOrNew,
        ensureOrderCode,
    } = useOrderCodeGenerator(currentOrderId, latestState);

    const {
        isCalculatingDistance,
        handleAutoCalculateDistance,
    } = useOrderDistanceCalculator(shipping, customerData, setShipping);

    const {
        handleSelectProduct,
        handleItemChange,
    } = useOrderProductSelection(items, setItems);

    const getOrderData = useCallback((newStatus?: 'draft' | 'scheduled' | 'fulfilled' | 'cancelled'): Order => {
        const s = latestState.current;
        const currentItemsSummary = calcItemsSummary(s.items);

        return {
            id: s.currentOrderId,
            orderIndex: orderIndex || s.orderIndex || undefined,
            orderNumber: orderIndex || s.orderIndex || undefined,
            orderType: s.orderType,
            status: newStatus || s.status,
            items: s.items,
            itemsSummary: currentItemsSummary,
            shipping: s.shipping,
            payments: s.payments,
            paymentsSummary: s.paymentsSummary,
            customerData: s.customerData,
            observation: s.observation,
            seller: s.seller,
            sellerId: s.sellerId,
            marketingOrigin: s.marketingOrigin,
            date: formatToStorageDate(s.orderDate),
            assistanceItems: s.assistanceItems,
            assistanceServiceValue: s.assistanceServiceValue,
            assistanceCost: s.assistanceCost,
            linkedOrderId: s.linkedOrderId || undefined,
        };
    }, [orderIndex]);

    const {
        isSavingDraft,
        autoSaveTimerRef,
    } = useOrderAutoSave(
        items, shipping, payments, customerData, observation, seller, marketingOrigin, orderDate, status, currentOrderId, orderIndex,
        getOrderData, setCurrentOrderId, latestState
    );

    const loadOrderForEditing = useCallback((order: Order) => {
        const migratedOrder = migrateOrderHandlings(order);
        const existingIndex = getOrderIndex(order);

        if (order.id && existingIndex) {
            setOrderIndex(existingIndex);
            setCurrentOrderId(order.id);
            latestState.current.orderIndex = existingIndex;
            latestState.current.orderNumber = existingIndex as any;
            latestState.current.currentOrderId = order.id;
        } else {
            setCurrentOrderId(undefined);
            setOrderIndex(null);
            latestState.current.currentOrderId = undefined;
            latestState.current.orderIndex = null;
            generateCodeForCopyOrNew();
        }

        setItems(migratedOrder.items || []);
        const defaultScheduling = {
            date: "",
            endDate: "",
            dateType: "fixed" as const,
            time: "",
            startTime: "",
            endTime: "",
            type: "range" as const,
            notInformed: false
        };

        const defaultShipping: Shipping = {
            value: 0,
            deliveryMethod: 'delivery',
            orderType: '',
            scheduling: defaultScheduling,
            autoCalculateValue: true,
            useCustomerAddress: true,
            deliveryAddress: {
                cep: '', street: '', number: '', complement: '', observation: '', neighborhood: '', city: '', state: 'PR'
            }
        };

        if (migratedOrder.shipping) {
            setShipping({
                ...defaultShipping,
                ...migratedOrder.shipping,
                scheduling: {
                    ...defaultScheduling,
                    ...(migratedOrder.shipping.scheduling || {})
                },
                deliveryAddress: {
                    ...defaultShipping.deliveryAddress!,
                    ...(migratedOrder.shipping.deliveryAddress || {}),
                    state: migratedOrder.shipping.deliveryAddress?.state || 'PR'
                }
            });
        } else {
            setShipping(defaultShipping);
        }
        setPayments(order.payments || []);
        if (order.customerData) {
            setCustomerData({
                ...order.customerData,
                noAddress: order.customerData.noAddress || !!(order.customerData.fullAddress as any)?.noAddress
            });
        } else {
            setCustomerData({
                fullName: '', phone: '', noPhone: false, noAddress: false,
                fullAddress: { cep: '', street: '', number: '', complement: '', observation: '', neighborhood: '', city: '' },
                additionalContacts: []
            });
        }
        setObservation(order.observation || "");
        setSeller((order as any).seller || "");
        setSellerId((order as any).sellerId || undefined);
        setMarketingOrigin(order.marketingOrigin || "organic");
        setStatus(order.status || 'draft');
        setOrderType(order.orderType || 'sale');
        setAssistanceItems(order.assistanceItems || []);
        setAssistanceServiceValue(order.assistanceServiceValue || 0);
        setAssistanceCost(order.assistanceCost || 0);
        setLinkedOrderId(order.linkedOrderId || "");
        
        if (order.date) {
            setOrderDate(parseStorageDateToLocal(order.date));
        }
    }, [setItems, setShipping, setPayments, setCustomerData, setOrderIndex, generateCodeForCopyOrNew]);

    // Tratar mudanças de modalidade global
    useEffect(() => {
        if (shipping.orderType && shipping.orderType !== prevGlobalOrderTypeRef.current) {
            prevGlobalOrderTypeRef.current = shipping.orderType;
            setItems(currentItems => currentItems.map(item => ({
                ...item,
                handlingType: shipping.orderType
            })));
        }
    }, [shipping.orderType, setItems]);

    useEffect(() => {
        const firstItemHandling = items[0]?.handlingType;
        if (firstItemHandling && firstItemHandling !== prevFirstItemHandlingRef.current) {
            prevFirstItemHandlingRef.current = firstItemHandling;
        }
    }, [items]);

    useEffect(() => {
        prevDeliveryMethodRef.current = shipping.deliveryMethod;
    }, [shipping.deliveryMethod]);

    const handleSaveOrder = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        const currentIdx = await ensureOrderCode();
        if (!currentIdx) return false;

        const isBudgetOrder = latestState.current.orderType === 'budget';
        const savedStatus = isBudgetOrder
            ? 'draft'
            : (latestState.current.currentOrderId && latestState.current.status !== 'draft'
                ? latestState.current.status
                : 'draft');
        const orderData = getOrderData(savedStatus as 'draft' | 'scheduled' | 'fulfilled' | 'cancelled');
        const validationErrors = validateOrder(orderData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Existem campos obrigatórios não preenchidos.");
            return false;
        }

        if (latestState.current.isSaving) return;
        setIsSaving(true);
        setErrors({});

        try {
            const savedId = await saveOrder(orderData);
            if (!latestState.current.currentOrderId && savedId) {
                setCurrentOrderId(savedId);
            }
            setStatus(savedStatus);
            toast.success(savedStatus === 'draft' ? (isBudgetOrder ? "Orçamento salvo com sucesso!" : "Pedido salvo como rascunho!") : "Alterações do pedido salvas!");
            return savedId;
        } catch (error: any) {
            toast.error(error?.message || "Erro ao salvar pedido.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [getOrderData, ensureOrderCode]);

    const handleCompleteOrder = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        const currentIdx = await ensureOrderCode();
        if (!currentIdx) return false;

        const resolvedStatus = resolveCompletedOrderStatus(latestState.current);
        const orderData = getOrderData(resolvedStatus);
        const validationErrors = validateOrder(orderData);

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Existem campos obrigatórios não preenchidos.");
            return false;
        }

        if (latestState.current.isSaving) return;
        setIsSaving(true);
        setErrors({});

        try {
            if (autoSaveTimerRef.current) {
                clearTimeout(autoSaveTimerRef.current);
            }
            const savedId = await saveOrder(orderData);
            if (!latestState.current.currentOrderId && savedId) {
                setCurrentOrderId(savedId);
                latestState.current.currentOrderId = savedId;
            }
            setStatus(resolvedStatus);
            latestState.current.status = resolvedStatus;

            if (resolvedStatus === 'fulfilled') {
                toast.success("Pedido CADASTRADO e ATENDIDO com sucesso! ✨");
            } else {
                toast.success("Pedido CADASTRADO com sucesso!");
            }
            return {
                ...orderData,
                id: savedId,
                status: resolvedStatus,
                orderIndex: orderData.orderIndex || orderIndex || undefined,
                orderNumber: orderData.orderIndex || orderIndex || undefined
            } as any;
        } catch (error: any) {
            toast.error(error?.message || "Erro ao cadastrar pedido.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [getOrderData, ensureOrderCode, autoSaveTimerRef, orderIndex]);

    const clearForm = useCallback(() => {
        if (window.confirm("Deseja limpar o formulário para um novo pedido?")) {
            window.location.reload();
        }
    }, []);

    const currentOrder = useMemo((): Order => ({
        id: currentOrderId,
        orderIndex: orderIndex || undefined,
        orderNumber: orderIndex || undefined,
        orderType,
        status: status as any,
        items,
        itemsSummary,
        shipping,
        payments,
        paymentsSummary,
        customerData,
        observation,
        seller,
        marketingOrigin,
        date: formatToStorageDate(orderDate),
        assistanceItems,
        assistanceServiceValue,
        assistanceCost,
        linkedOrderId,
    }), [currentOrderId, orderIndex, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, status, orderDate, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, orderType]);

    const isValidForCompletion = useMemo(() => validateBase(getOrderData('scheduled')), [getOrderData]);

    const state = useMemo(() => ({
        items,
        shipping,
        payments,
        customerData,
        observation,
        seller,
        sellerId,
        marketingOrigin,
        currentOrderId,
        orderIndex,
        isGeneratingCode,
        status,
        isSaving,
        isSavingDraft,
        isCalculatingDistance,
        itemsSummary,
        paymentsSummary,
        currentOrder,
        isValidForCompletion,
        errors,
        orderDate,
        currentStep,
    }), [items, shipping, payments, customerData, observation, seller, sellerId, marketingOrigin, currentOrderId, orderIndex, isGeneratingCode, status, isSaving, isSavingDraft, isCalculatingDistance, itemsSummary, paymentsSummary, currentOrder, isValidForCompletion, errors, orderDate, currentStep]);

    const actions = useMemo(() => ({
        setItems,
        setShipping: (val: React.SetStateAction<Shipping>) => {
            setShipping(val);
            setErrors(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (key.startsWith('shipping_')) delete next[key];
                });
                return next;
            });
        },
        setPayments,
        setCustomerData: (val: React.SetStateAction<CustomerData>) => {
            setCustomerData(val);
            setErrors(prev => {
                const next = { ...prev };
                Object.keys(next).forEach(key => {
                    if (key.startsWith('customer_')) delete next[key];
                });
                return next;
            });
        },
        setObservation,
        handleItemChange,
        setSeller: (val: string) => {
            setSeller(val);
            setErrors(prev => {
                const next = { ...prev };
                delete next['seller'];
                return next;
            });
        },
        setSellerId,
        setSellerData: (data: { name: string; id?: string }) => {
            setSeller(data.name);
            setSellerId(data.id);
            setErrors(prev => {
                const next = { ...prev };
                delete next['seller'];
                return next;
            });
        },
        setMarketingOrigin,
        setOrderIndex,
        loadOrderForEditing,
        handleAutoCalculateDistance,
        handleSelectProduct,
        handleSaveOrder,
        handleCompleteOrder,
        clearForm,
        setErrors,
        validateOrder,
        setOrderDate,
        goToNextStep: () => {
            setCurrentStep(prev => {
                const isBudget = orderType === 'budget';
                if (isBudget && prev === 4) return 6;
                return Math.min(prev + 1, 6);
            });
        },
        goToPrevStep: () => {
            setCurrentStep(prev => {
                const isBudget = orderType === 'budget';
                if (isBudget && prev === 6) return 4;
                return Math.max(prev - 1, 1);
            });
        },
        jumpToStep: (step: number) => {
            setCurrentStep(step);
        },
    }), [setItems, setShipping, setPayments, setCustomerData, setObservation, handleItemChange, setSeller, setSellerId, setMarketingOrigin, setOrderIndex, loadOrderForEditing, handleAutoCalculateDistance, handleSelectProduct, handleSaveOrder, handleCompleteOrder, clearForm, orderType]);

    return { state, actions };
};
