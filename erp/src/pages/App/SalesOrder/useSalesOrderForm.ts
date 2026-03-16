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
import { saveOrder } from "../../utils/orderHistoryService";
import { validateBase, validateOrder, ValidationErrors } from "../../utils/validations";
import { dateNow } from "../../utils/formatters";
import Shipping from "../../types/Shipping.type";
import CustomerData from "../../types/customerData.type";
import { autoCalculateRouteDistance } from "../../utils/maps";
import { getSettings } from '@/pages/utils/settingsService';

const getCurrentDatetimeLocal = () => {
    const now = new Date();
    // Retorna YYYY-MM-DDTHH:mm (formato exigido pelo input datetime-local)
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
};

const formatToStorageDate = (datetimeLocalStr: string) => {
    if (!datetimeLocalStr) return new Date().toISOString();
    // Converte YYYY-MM-DDTHH:mm do input para ISO real (UTC)
    const date = new Date(datetimeLocalStr);
    return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
};

const parseStorageDateToLocal = (dateStr: string) => {
    if (!dateStr) return getCurrentDatetimeLocal();
    
    let date: Date;
    if (dateStr.includes('T') && dateStr.includes('-')) {
        // Formato ISO
        date = new Date(dateStr);
    } else {
        // Tenta converter formato antigo PT-BR (DD/MM/YYYY, HH:mm:ss)
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

    // Converte para YYYY-MM-DDTHH:mm para o input
    const y = date.getFullYear();
    const mo = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    const h = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    return `${y}-${mo}-${d}T${h}:${mi}`;
};

export const useSalesOrderForm = (initialDeliveryMethod: 'delivery' | 'pickup' = 'delivery') => {
    const { items, setItems } = useItems();
    const { shipping, setShipping } = useShipping(initialDeliveryMethod);
    const { payments, setPayments } = usePaymentsData();
    const { customerData, setCustomerData } = useCustomerData();
    const [observation, setObservation] = useState("");
    const [seller, setSeller] = useState("");
    const [marketingOrigin, setMarketingOrigin] = useState("Direto na Loja");
    const [orderDate, setOrderDate] = useState(() => getCurrentDatetimeLocal());
    const [currentOrderId, setCurrentOrderId] = useState<string | undefined>(undefined);
    const [status, setStatus] = useState<string>('draft');
    const [isSaving, setIsSaving] = useState(false);
    const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);
    const [errors, setErrors] = useState<ValidationErrors>({});
    const [isSavingDraft, setIsSavingDraft] = useState(false);
    const [orderType, setOrderType] = useState<Order['orderType']>('sale');
    const [assistanceItems, setAssistanceItems] = useState<AssistanceItem[]>([]);
    const [assistanceServiceValue, setAssistanceServiceValue] = useState(0);
    const [assistanceCost, setAssistanceCost] = useState(0);
    const [linkedOrderId, setLinkedOrderId] = useState("");
    const [currentStep, setCurrentStep] = useState(1);
    const lastCalculatedAddressRef = useRef<string>("");

    // Auto-save control
    const autoSaveTimerRef = useRef<any>(null);
    const isInitialMount = useRef(true);

    const itemsSummary = calcItemsSummary(items);
    const paymentsSummary = calcPaymentsSummary(payments, itemsSummary, shipping.value);

    // Stable state ref for callbacks
    const latestState = useRef({
        currentOrderId, status, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, orderDate, isSaving, isSavingDraft,
        orderType, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, currentStep
    });

    useEffect(() => {
        latestState.current = {
            currentOrderId, status, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, orderDate, isSaving, isSavingDraft,
            orderType, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, currentStep
        };
    }, [currentOrderId, status, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, orderDate, isSaving, isSavingDraft, orderType, assistanceItems, assistanceServiceValue, assistanceCost, linkedOrderId, currentStep]);

    const getOrderData = useCallback((newStatus?: 'draft' | 'scheduled' | 'fulfilled' | 'cancelled'): Order => {
        const s = latestState.current;
        // Recalculate itemsSummary to ensure it's up-to-date with the latest items and includes totalItemsCost
        const currentItemsSummary = calcItemsSummary(s.items);

        return {
            id: s.currentOrderId,
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
            linkedOrderId: s.linkedOrderId,
        };
    }, []);

    // AUTO-SAVE LOGIC
    useEffect(() => {
        if (isInitialMount.current) {
            isInitialMount.current = false;
            return;
        }

        if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);

        // Check if there's any meaningful changes from the default state
        const isDefaultState = (() => {
            // Check Customer
            if (customerData.fullName || customerData.phone || customerData.fullAddress.street || customerData.fullAddress.cep) return false;
            // Check Items
            if (items.length > 1) return false;
            if (items.length === 1 && (items[0].description !== '' || items[0].unitPrice !== 0)) return false;
            // Check Shipping
            if (shipping.value !== 0 || shipping.distance !== undefined || shipping.scheduling.date !== '') return false;
            // Check Payments
            if (payments.length > 1) return false;
            if (payments.length === 1 && payments[0].amount !== 0) return false;
            // Check Observation and Seller
            if (observation !== '' || seller !== '' || marketingOrigin !== 'Direto na Loja') return false;

            return true;
        })();

        if (isDefaultState) return;

        autoSaveTimerRef.current = setTimeout(async () => {
            const draft = getOrderData('draft'); // Forçar status draft no rascunho
            try {
                setIsSavingDraft(true);
                const savedId = await saveOrder(draft);
                // After first auto-save, update currentOrderId so all subsequent
                // saves update the same doc instead of creating new ones.
                if (!latestState.current.currentOrderId && savedId) {
                    setCurrentOrderId(savedId);
                }
            } catch (error) {
                console.error("Erro no salvamento automático:", error);
            } finally {
                setTimeout(() => setIsSavingDraft(false), 1000);
            }
        }, 3000);

        return () => {
            if (autoSaveTimerRef.current) clearTimeout(autoSaveTimerRef.current);
        };
    }, [items, shipping, payments, customerData, observation, seller, marketingOrigin, orderDate, getOrderData]);

    const loadOrderForEditing = useCallback((order: Order) => {
        setItems(order.items || []);
        const defaultScheduling = {
            date: "",
            time: "",
            startTime: "",
            endTime: "",
            type: "range" as const
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

        if (order.shipping) {
            setShipping({
                ...defaultShipping,
                ...order.shipping,
                scheduling: {
                    ...defaultScheduling,
                    ...(order.shipping.scheduling || {})
                },
                deliveryAddress: {
                    ...defaultShipping.deliveryAddress!,
                    ...(order.shipping.deliveryAddress || {})
                }
            });
        } else {
            setShipping(defaultShipping);
        }
        setPayments(order.payments || []);
        setCustomerData(order.customerData || {
            fullName: '',
            phone: '',
            noPhone: false,
            fullAddress: {
                cep: '',
                street: '',
                number: '',
                complement: '',
                observation: '',
                neighborhood: '',
                city: ''
            }
        });
        setObservation(order.observation || "");
        setSeller((order.seller as string) || "");
        setMarketingOrigin(order.marketingOrigin || 'Direto na Loja');
        setOrderDate(parseStorageDateToLocal(order.date));
        setCurrentOrderId(order.id);
        setOrderType(order.orderType || 'sale');
        setAssistanceItems(order.assistanceItems || []);
        setAssistanceServiceValue(order.assistanceServiceValue || 0);
        setAssistanceCost(order.assistanceCost || 0);
        setLinkedOrderId(order.linkedOrderId || "");
        setStatus(order.status || 'draft');
        setErrors({});
        // Initialize calculation ref to prevent instant recalculation if address exists
        if (order.customerData?.fullAddress) {
            lastCalculatedAddressRef.current = JSON.stringify(order.customerData.fullAddress);
        }
    }, [setItems, setShipping, setPayments, setCustomerData, setObservation, setSeller, setMarketingOrigin]);

    const handleAutoCalculateDistance = useCallback(async (address: CustomerData['fullAddress']) => {
        if (!address.street || !address.city) return;

        setIsCalculatingDistance(true);
        try {
            const settings = getSettings();
            const routeResult = await autoCalculateRouteDistance(address);
            if (routeResult !== null) {
                const { distanceKm, destinationCoords, routeGeoJSON } = routeResult;

                setShipping(prev => {
                    let value = prev.value;
                    // Auto-calculate freight if rate is configured AND auto-calculate is enabled
                    if (prev.autoCalculateValue && settings.freightPerKm > 0) {
                        value = distanceKm * settings.freightPerKm;
                    }
                    return {
                        ...prev,
                        distance: distanceKm,
                        value,
                        destinationCoords,
                        routeGeoJSON
                    };
                });
            }
        } catch (e) {
            console.error("Erro ao calcular rota automática:", e);
        } finally {
            setIsCalculatingDistance(false);
        }
    }, [setShipping]);

    const handleSelectProduct = useCallback((idx: number, product: Product, variation?: Variation) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[idx] = {
                ...newItems[idx],
                productId: product.id,
                variationId: variation?.id,
                code: variation?.sku || product.code,
                description: variation ? `${product.description} - ${variation.name}` : product.description,
                unitPrice: (variation?.unitPrice || product.unitPrice) || 0,
                costPrice: (variation?.costPrice || product.costPrice) || 0,
                handlingType: product.itemType === 'service' ? 'Execução no local' : 'Entrega com montagem no local',
                condition: product.condition || 'novo'
            };
            return newItems;
        });
    }, [setItems]);

    const handleItemChange = useCallback((idx: number, key: keyof Item, value: any) => {
        setItems(prev => {
            const newItems = [...prev];
            newItems[idx] = { ...newItems[idx], [key]: value };
            return newItems;
        });
    }, [setItems]);

    // Automatic calculation when address changes
    useEffect(() => {
        const addr = customerData.fullAddress;
        if (addr.street && addr.city && (addr.number || addr.cep)) {
            const addrStr = JSON.stringify(addr);
            if (addrStr === lastCalculatedAddressRef.current) return;

            const timer = setTimeout(() => {
                handleAutoCalculateDistance(addr);
                lastCalculatedAddressRef.current = addrStr;
            }, 1000); // Debounce to avoid excessive API calls
            return () => clearTimeout(timer);
        }
    }, [customerData.fullAddress, handleAutoCalculateDistance]);

    const handleSaveOrder = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        const orderData = getOrderData('draft'); // Save as draft
        const validationErrors = validateOrder(orderData); // Get actual error object

        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            toast.error("Existem campos obrigatórios não preenchidos para salvar como rascunho.");
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
            setStatus('draft');
            toast.success("Pedido salvo como rascunho!");
            return true;
        } catch (error: any) {
            toast.error(error?.message || "Erro ao salvar pedido como rascunho.");
            return false;
        } finally {
            setIsSaving(false);
        }
    }, [getOrderData]);

    const handleCompleteOrder = useCallback(async (e?: React.MouseEvent) => {
        if (e) e.preventDefault();

        const orderData = getOrderData('scheduled');
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
            await saveOrder(orderData);
            setStatus('scheduled');
            toast.success("Pedido FINALIZADO com sucesso!");
            return true;
        } catch (error: any) {
            toast.error(error?.message || "Erro ao efetivar pedido.");
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
        orderType: 'sale',
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
    }), [currentOrderId, items, itemsSummary, shipping, payments, paymentsSummary, customerData, observation, seller, marketingOrigin, status, orderDate]);

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
    }), [items, shipping, payments, customerData, observation, seller, marketingOrigin, currentOrderId, status, isSaving, isSavingDraft, isCalculatingDistance, itemsSummary, paymentsSummary, currentOrder, isValidForCompletion, errors, orderDate, currentStep]);

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
        loadOrderForEditing,
        handleAutoCalculateDistance,
        handleSelectProduct,
        handleSaveOrder,
        handleCompleteOrder,
        clearForm,
        setErrors,
        validateOrder,
        setOrderDate,
        goToNextStep: () => setCurrentStep(prev => Math.min(prev + 1, 4)),
        goToPrevStep: () => setCurrentStep(prev => Math.max(prev - 1, 1)),
        jumpToStep: (step: number) => setCurrentStep(step),
    }), [setItems, setShipping, setPayments, setCustomerData, setObservation, handleItemChange, setSeller, setMarketingOrigin, loadOrderForEditing, handleAutoCalculateDistance, handleSelectProduct, handleSaveOrder, handleCompleteOrder, clearForm]);

    return { state, actions };
};
