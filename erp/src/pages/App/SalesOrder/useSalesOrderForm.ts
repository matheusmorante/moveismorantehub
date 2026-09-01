import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Order, { AssistanceItem } from "../../types/order.type";
import Item from "../../types/items.type";
import Product, { Variation } from "../../types/product.type";
import useItems from "./hooks/useItems";
import useShipping from "./hooks/useShipping";
import usePaymentsData from "./hooks/usePayments";
import { useCustomerData } from "./hooks/useCustomerData";
import { calcPaymentsSummary, calcItemsSummary } from "../../utils/calculations";
import { toast } from "react-toastify";
import { saveOrder, resolveCompletedOrderStatus } from "../../utils/orderHistoryService";
import { validateBase, validateOrder, ValidationErrors } from "../../utils/validations";
import { dateNow } from "../../utils/formatters";
import Shipping from "../../types/Shipping.type";
import CustomerData from "../../types/customerData.type";
import { autoCalculateRouteDistance } from "../../utils/maps";
import { migrateOrderHandlings } from '@/pages/utils/handlingMigration';
import { calculateFreightByDistance } from "../../utils/shippingPricing";
import { getNextOrderIndex, getOrderIndex } from "../../utils/orderCode";

const getCurrentDatetimeLocal = () => {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatToStorageDate = (datetimeLocalStr: string) => {
    if (!datetimeLocalStr) return new Date().toISOString();
    const date = new Date(datetimeLocalStr);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

export const parseStorageDateToLocal = (dateStr: string) => {
    if (!dateStr) return getCurrentDatetimeLocal();
    
    let date: Date;
    if (dateStr.includes('T') && dateStr.includes('-')) {
        date = new Date(dateStr);
    } else {
        try {
            const [datePart, timePart] = dateStr.split(', ');
            const [d, m, y] = datePart.split('/');
            const [hh, mm] = (timePart || '00:00').split(':');
            date = new Date(Number(y), Number(m) - 1, Number(d), Number(hh), Number(mm));
        } catch {
            return getCurrentDatetimeLocal();
        }
    }

    if (isNaN(date.getTime())) return getCurrentDatetimeLocal();

    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}T${h}:${mi}`;
};

export const useSalesOrderForm = (initialDeliveryMethod?: 'delivery' | 'pickup', initialOrderType: Order['orderType'] = 'sale') => {
    const { items, setItems } = useItems();
    const { shipping, setShipping } = useShipping(initialDeliveryMethod);
    
    const { payments, setPayments } = usePaymentsData();
    const { customerData, setCustomerData } = useCustomerData();
    const [observation, setObservation] = useState("");
    const [seller, setSeller] = useState("");
    const [marketingOrigin, setMarketingOrigin] = useState("organic");
    const [orderDate, setOrderDate] = useState(() => getCurrentDatetimeLocal());
    const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(undefined);
    const [orderIndex, setOrderIndex] = useState<number | null>(null);
    const [isGeneratingCode, setIsGeneratingCode] = useState(false);
    const [status, setStatus] = useState<string>('draft');
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [orderType, setOrderType] = useState<Order['orderType']>(initialOrderType);
    const [assistanceItems, setAssistanceItems] = useState<AssistanceItem[]>([]);
    const [assistanceServiceValue, setAssistanceServiceValue] = useState(0);
    const [assistanceCost, setAssistanceCost] = useState(0);
    const [linkedOrderId, setLinkedOrderId] = useState("");
    const [currentStep, setCurrentStep] = useState(1);
    const lastCalculatedAddressRef = useRef<string>("");
    const prevDeliveryMethodRef = useRef(shipping.deliveryMethod);
    const prevGlobalOrderTypeRef = useRef(shipping.orderType);
    const prevFirstItemHandlingRef = useRef(items[0]?.handlingType);

    // Gerar código sequencial único imediatamente ao abrir novo formulário
    useEffect(() => {
        if (!currentOrderId && orderIndex === null && !isGeneratingCode) {
            let isMounted = true;
            setIsGeneratingCode(true);
            getNextOrderIndex()
                .then(code => {
                    if (isMounted) {
                        setOrderIndex(code);
                    }
                })
                .catch(err => {
                    if (isMounted) {
                        console.error("[useSalesOrderForm] Erro ao gerar código sequencial do pedido:", err);
                        toast.error(`Erro ao gerar código do pedido: ${err.message || 'Falha de comunicação'}. Não é permitido cadastrar sem código.`);
                    }
                })
                .finally(() => {
                    if (isMounted) setIsGeneratingCode(false);
                });
            return () => { isMounted = false; };
        }
    }, [currentOrderId, orderIndex, isGeneratingCode]);

    // Auto-save control
    const autoSaveTimerRef = useRef<any>(null);
    const isInitialMount = useRef(true);

    const itemsSummary = calcItemsSummary(items);
    const paymentsSummary = calcPaymentsSummary(payments, itemsSummary, shipping.value);

    // Stable state ref for callbacks
    const latestState = useRef({
        currentOrderId, orderIndex, isGeneratingCode, status, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, orderDate, isSaving, isSavingDraft,
        orderType, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, currentStep
    });

    useEffect(() => {
        latestState.current = {
            currentOrderId, orderIndex, isGeneratingCode, status, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, orderDate, isSaving, isSavingDraft,
            orderType, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, currentStep
        };
    }, [currentOrderId, orderIndex, isGeneratingCode, status, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, orderDate, isSaving, isSavingDraft, orderType, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, currentStep]);

    const getOrderData = useCallback((newStatus?: 'draft' | 'scheduled' | 'fulfilled' | 'cancelled'): Order => {
        const s = latestState.current;
        const currentItemsSummary = calcItemsSummary(s.items);

        return {
            id: s.currentOrderId,
            orderIndex: s.orderIndex || undefined,
            orderNumber: s.orderIndex || undefined,
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
            marketingOrigin: s.marketingOrigin,
            date: formatToStorageDate(s.orderDate),
            assistanceItems: s.assistanceItems,
            assistanceServiceValue: s.assistanceServiceValue,
            assistanceCost: s.assistanceCost,
            linkedOrderId: s.linkedOrderId || undefined,
        };
    }, []);

    // AUTO-SAVE LOGIC
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        // Disable auto-save for already finalized orders (not draft)
        if (status !== 'draft' && currentOrderId) return;

        // Não executa auto-save sem código válido gerado
        if (!latestState.current.orderIndex) return;

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        // Check if there's any meaningful changes from the default state
        const isDefaultState = (() => {
            if (customerData.fullName || customerData.phone || customerData.fullAddress.street || customerData.fullAddress.cep) return false;
            if (items.length > 1) return false;
            if (items.length === 1 && (items[0].description !== '' || items[0].unitPrice !== 0)) return false;
            if (shipping.value !== 0 || shipping.distance !== undefined || shipping.scheduling.date !== '' || shipping.scheduling.notInformed) return false;
            if (payments.length > 1) return false;
            if (payments.length === 1 && payments[0].amount !== 0) return false;
            if (observation !== '' || seller !== '' || (marketingOrigin !== 'organic' && marketingOrigin !== 'Direto na Loja')) return false;

            return true;
        })();

        if (isDefaultState) return;

        const isSavingRef = { current: false };

        autoSaveTimerRef.current = setTimeout(async () => {
            if (latestState.current.isSaving || latestState.current.isSavingDraft || isSavingRef.current) return;
            
            if (!latestState.current.orderIndex) {
                console.warn("[useSalesOrderForm] Auto-save bloqueado: pedido sem código.");
                return;
            }

            const currentStatus = latestState.current.status;
            const saveStatus = (currentStatus === 'draft' || !latestState.current.currentOrderId) ? 'draft' : currentStatus;
            const draft = getOrderData(saveStatus as any); 
            try {
                isSavingRef.current = true;
                setIsSavingDraft(true);
                const savedId = await saveOrder(draft);
                if (!latestState.current.currentOrderId && savedId) {
                    setCurrentOrderId(savedId);
                }
            } catch (error) {
                console.error("Erro no salvamento automático:", error);
            } finally {
                isSavingRef.current = false;
                setTimeout(() => setIsSavingDraft(false), 1000);
            }
        }, 3000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [items, shipping, payments, customerData, observation, seller, marketingOrigin, orderDate, getOrderData, status, currentOrderId, orderIndex]);

    const loadOrderForEditing = useCallback((order: Order) => {
        const migratedOrder = migrateOrderHandlings(order);
        const existingIndex = getOrderIndex(order);

        if (order.id && existingIndex) {
            setOrderIndex(existingIndex);
            setCurrentOrderId(order.id);
        } else {
            setCurrentOrderId(undefined);
            setOrderIndex(null);
            setIsGeneratingCode(true);
            getNextOrderIndex()
                .then(newCode => {
                    setOrderIndex(newCode);
                })
                .catch(err => {
                    console.error("[useSalesOrderForm] Erro ao gerar novo código para cópia do pedido:", err);
                    toast.error(`Erro ao gerar novo código para a cópia do pedido: ${err.message || 'Falha de comunicação'}.`);
                })
                .finally(() => {
                    setIsGeneratingCode(false);
                });
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
            autoCalculateValue: false,
            useCustomerAddress: true,
            deliveryAddress: {
                cep: '',
                street: '',
                number: '',
                complement: '',
                observation: '',
                neighborhood: '',
                city: ''
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
                    ...(migratedOrder.shipping.deliveryAddress || {})
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
                fullName: '',
                phone: '',
                noPhone: false,
                noAddress: false,
                fullAddress: {
                    cep: '',
                    street: '',
                    number: '',
                    complement: '',
                    observation: '',
                    neighborhood: '',
                    city: ''
                },
                additionalContacts: []
            });
        }
        setObservation(order.observation || "");
        setSeller((order as any).seller || "");
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
    }, [setItems, setShipping, setPayments, setCustomerData]);

    const handleAutoCalculateDistance = useCallback(async () => {
        if (!shipping.useCustomerAddress && !shipping.deliveryAddress?.cep && !shipping.deliveryAddress?.street) {
            toast.warn("Preencha o endereço de entrega para calcular a distância.");
            return;
        }

        const addressObj = shipping.useCustomerAddress ? customerData.fullAddress : shipping.deliveryAddress;
        if (!addressObj) {
            toast.warn("Endereço não informado.");
            return;
        }

        const currentAddrStr = `${addressObj.street || ''}, ${addressObj.number || ''}, ${addressObj.neighborhood || ''}, ${addressObj.city || ''}, ${addressObj.cep || ''}`;
        if (currentAddrStr.trim() === ", , , ,") {
            toast.warn("Preencha os campos do endereço.");
            return;
        }

        setIsCalculatingDistance(true);
        try {
            const distance = await autoCalculateRouteDistance(addressObj);
            if (distance !== null && distance !== undefined) {
                lastCalculatedAddressRef.current = currentAddrStr;
                const calculatedFreight = calculateFreightByDistance(distance);
                setShipping(prev => ({
                    ...prev,
                    distance: distance,
                    value: calculatedFreight,
                    autoCalculateValue: true
                }));
                toast.success(`Distância calculada: ${distance.toFixed(1)} km (Frete: R$ ${calculatedFreight.toFixed(2)})`);
            } else {
                toast.error("Não foi possível calcular a rota para o endereço informado.");
            }
        } catch (error) {
            console.error("Erro ao calcular distância:", error);
            toast.error("Erro ao calcular a distância via Google Maps.");
        } finally {
            setIsCalculatingDistance(false);
        }
    }, [shipping.useCustomerAddress, shipping.deliveryAddress, customerData.fullAddress, setShipping]);

    const handleSelectProduct = useCallback((index: number, product: Product, variation?: Variation) => {
        const selectedPrice = variation 
            ? (variation.syncUnitPrice ? (product.unitPrice ?? variation.unitPrice) : (variation.unitPrice ?? product.unitPrice))
            : (product.unitPrice ?? 0);

        const selectedCost = variation
            ? (variation.costPrice ?? product.costPrice ?? 0)
            : (product.costPrice ?? 0);

        const defaultHandling = (product.itemType === 'service' ? "Execução no local" : items[0]?.handlingType) || "";

        let resolvedCode = "";
        if (variation) {
            resolvedCode = variation.sku || "";
        }
        if (!resolvedCode) {
            resolvedCode = product.code && product.code !== '000000' 
                ? product.code 
                : (product.sku || "");
        }

        let fullDescription = product.name || "";
        if (variation && variation.name && variation.name !== product.name) {
            fullDescription = `${product.name} - ${variation.name}`;
        }

        setItems(currentItems => currentItems.map((item, i) => {
            if (i === index) {
                return {
                    ...item,
                    productId: product.id,
                    variationId: variation?.id,
                    isTemporaryProduct: false,
                    code: resolvedCode,
                    description: fullDescription,
                    unitPrice: Number(selectedPrice) || 0,
                    costPrice: Number(selectedCost) || 0,
                    handlingType: defaultHandling,
                    condition: variation?.condition || product.condition || "novo"
                };
            }
            return item;
        }));
    }, [items, setItems]);

    const handleItemChange = useCallback((index: number, field: keyof Item, value: any) => {
        setItems(currentItems => currentItems.map((item, i) => {
            if (i === index) {
                const updated = { ...item, [field]: value };
                if (field === 'unitPrice' || field === 'quantity' || field === 'unitDiscount') {
                    const price = field === 'unitPrice' ? Number(value) : (item.unitPrice || 0);
                    const qty = field === 'quantity' ? Number(value) : (item.quantity || 1);
                    const disc = field === 'unitDiscount' ? Number(value) : (item.unitDiscount || 0);
                    updated.total = Math.max(0, (price - disc) * qty);
                }
                return updated;
            }
            return item;
        }));
    }, [setItems]);

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
        if (shipping.deliveryMethod !== prevDeliveryMethodRef.current) {
            const isPickup = shipping.deliveryMethod === 'pickup';
            setItems(currentItems => currentItems.map(item => ({
                ...item,
                handlingType: isPickup ? 'Retirada no depósito' : item.handlingType
            })));
        }
        prevDeliveryMethodRef.current = shipping.deliveryMethod;
    }, [shipping.deliveryMethod, setItems]);

    const handleSaveOrder = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        // Validar / Assegurar código sequencial
        let currentIdx = latestState.current.orderIndex;
        if (!currentIdx) {
            try {
                setIsGeneratingCode(true);
                currentIdx = await getNextOrderIndex();
                setOrderIndex(currentIdx);
                latestState.current.orderIndex = currentIdx;
            } catch (codeErr: any) {
                toast.error(`Não foi possível gerar um código único para o pedido: ${codeErr.message || 'Erro no banco'}. O pedido não pode ser salvo.`);
                return false;
            } finally {
                setIsGeneratingCode(false);
            }
        }

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
    }, [getOrderData]);

    const handleCompleteOrder = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        // Validar / Assegurar código sequencial
        let currentIdx = latestState.current.orderIndex;
        if (!currentIdx) {
            try {
                setIsGeneratingCode(true);
                currentIdx = await getNextOrderIndex();
                setOrderIndex(currentIdx);
                latestState.current.orderIndex = currentIdx;
            } catch (codeErr: any) {
                toast.error(`Não foi possível gerar um código único para o pedido: ${codeErr.message || 'Erro no banco'}. O pedido não pode ser cadastrado.`);
                return false;
            } finally {
                setIsGeneratingCode(false);
            }
        }

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
            const savedId = await saveOrder(orderData);
            if (!latestState.current.currentOrderId && savedId) {
                setCurrentOrderId(savedId);
            }
            setStatus(resolvedStatus);
            if (resolvedStatus === 'fulfilled') {
                toast.success("Pedido CADASTRADO e ATENDIDO com sucesso! ✨");
            } else {
                toast.success("Pedido CADASTRADO com sucesso!");
            }
            return savedId;
        } catch (error: any) {
            toast.error(error?.message || "Erro ao cadastrar pedido.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [getOrderData]);

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
    }), [items, shipping, payments, customerData, observation, seller, marketingOrigin, currentOrderId, orderIndex, isGeneratingCode, status, isSaving, isSavingDraft, isCalculatingDistance, itemsSummary, paymentsSummary, currentOrder, isValidForCompletion, errors, orderDate, currentStep]);

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
    }), [setItems, setShipping, setPayments, setCustomerData, setObservation, handleItemChange, setSeller, setMarketingOrigin, setOrderIndex, loadOrderForEditing, handleAutoCalculateDistance, handleSelectProduct, handleSaveOrder, handleCompleteOrder, clearForm, orderType]);

    return { state, actions };
};
