import { useState, useEffect, useMemo } from "react";
import Order, { IsButtonsClicked } from "../../../types/order.type";
import { subscribeToOrders, moveToTrash, restoreOrder, permanentDeleteOrder, updateOrder } from "../../../utils/orderHistoryService";
import { actionsMap, buttons } from "../OrderActions/orderActionsConfig";
import { toast } from "react-toastify";

export const useOrderHistory = (filters?: any) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage, setItemsPerPage] = useState(50);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [refreshSignal, setRefreshSignal] = useState(0);

    const refresh = () => setRefreshSignal(prev => prev + 1);

    useEffect(() => {
        let active = true; // Will be set to false on cleanup

        console.log('[Orders] Hook Start');

        // Failsafe: force loading false after 8 seconds if data never arrives
        const failsafe = setTimeout(() => {
            if (active) {
                console.warn('[Orders] Failsafe timer fired - no data received');
                setLoading(false);
            }
        }, 8000);

        const unsubscribe = subscribeToOrders((data) => {
            // Only update state if this effect instance is still active
            if (!active) return;

            if (Array.isArray(data)) {
                console.log('[Orders] Data received, count:', data.length);
                setOrders(data);
            } else {
                console.error('[Orders] Data is not an array:', data);
                setOrders([]);
            }

            setLoading(false);
            clearTimeout(failsafe);
        });

        return () => {
            console.log('[Orders] Hook Cleanup');
            active = false;
            clearTimeout(failsafe);
            unsubscribe();
        };
    }, [refreshSignal]);

    // Reset pagination and selection when filters change
    useEffect(() => {
        setCurrentPage(1);
        setSelectedOrders([]);
    }, [filters]);

    const filteredOrders = useMemo(() => {
        const showTrash = filters?.showTrash || false;
        const isDraft = filters?.isDraft || false;

        const toComparableDate = (dateStr: string) => {
            if (!dateStr || !dateStr.includes('/')) return dateStr;
            // Format can be "DD/MM/YYYY" or "DD/MM/YYYY, HH:mm:ss"
            const [datePart, timePart] = dateStr.split(', ');
            const [day, month, year] = datePart.split('/');
            const dateNormalized = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
            if (timePart) {
                return `${dateNormalized}T${timePart}`;
            }
            return dateNormalized;
        };

        return orders
            .filter(order => {
                const customerNameQuery = filters?.customerName?.toLowerCase() || '';
                const orderCustomerName = order.customerData?.fullName?.toLowerCase() || '';
                const isSearchingCustomer = customerNameQuery.length > 0;
                const matchesCustomer = orderCustomerName.includes(customerNameQuery);

                // Filter by Deleted or Draft status
                if (showTrash) {
                    if (!order.deleted) return false;
                } else if (isDraft) {
                    if (order.status !== 'draft' || order.deleted) return false;
                } else {
                    // MAIN LIST LOGIC: Hide deleted. Drafts and other statuses remain visible.
                    if (order.deleted) return false;
                }

                if (!filters) return true;

                const orderDateComp = toComparableDate(order.date);
                let dateMatch = (!filters.dateRange.start || orderDateComp >= filters.dateRange.start) &&
                    (!filters.dateRange.end || orderDateComp <= (filters.dateRange.end + 'T23:59:59'));

                if (isDraft) {
                    // Drafts should always be visible in the Drafts modal regardless of creation date
                    dateMatch = true;
                } else if (!dateMatch && (order.status === 'scheduled' || order.orderType === 'assistance') && order.shipping?.scheduling?.date) {
                    // For scheduled or assistance orders, check if the delivery date falls within the range
                    const deliveryDateComp = toComparableDate(order.shipping.scheduling.date);
                    const isAfterStart = !filters.dateRange.start || deliveryDateComp >= filters.dateRange.start;
                    const isBeforeEnd = !filters.dateRange.end || deliveryDateComp <= (filters.dateRange.end + 'T23:59:59');
                    
                    if (isAfterStart && isBeforeEnd) {
                        dateMatch = true;
                    }
                }

                const customerMatch = !filters.customerName || matchesCustomer;

                const productMatch = !filters.productName ||
                    (order.items?.some(item => item.description.toLowerCase().includes(filters.productName.toLowerCase()))) ||
                    (order.assistanceDescription?.toLowerCase().includes(filters.productName.toLowerCase()));

                const isBudgetView = filters?.isBudgetView || false;
                const isAssistanceView = filters?.isAssistanceView || false;
                const isReturnView = filters?.isReturnView || false;
                const statusMatch = !filters.status || order.status === filters.status;
                
                // Strict Type Separation
                let typeMatch = true;
                if (isBudgetView) {
                    typeMatch = order.orderType === 'budget';
                } else if (isAssistanceView) {
                    typeMatch = order.orderType === 'assistance';
                } else if (isReturnView) {
                    typeMatch = order.orderType === 'return';
                } else {
                    // Sales view: Only show sale or showroom, exclude budget, assistance and return
                    typeMatch = filters.orderType 
                        ? order.orderType === filters.orderType 
                        : (order.orderType !== 'budget' && order.orderType !== 'assistance' && order.orderType !== 'return');
                }

                const sellerMatch = !filters.seller || order.seller?.toLowerCase().includes(filters.seller.toLowerCase());

                const totalOrderValue = order.paymentsSummary?.totalOrderValue || 0;
                const valueMatch = totalOrderValue >= filters.valueRange.min &&
                    totalOrderValue <= filters.valueRange.max;

                return dateMatch && customerMatch && productMatch && statusMatch && typeMatch && sellerMatch && valueMatch;
            })
            .sort((a, b) => {
                // Multi-column sorting logic
                const multiSort = filters?.multiSort || []; // Array of { key: string, order: 'asc' | 'desc' }
                
                // If no multiSort, fallback to single sortBy for backward compatibility
                const sortRules = multiSort.length > 0 
                  ? multiSort 
                  : [{ key: filters?.sortBy || 'date', order: filters?.sortOrder || 'desc' }];

                for (const rule of sortRules) {
                    const { key: sortBy, order: sortOrder } = rule;
                    let comparison = 0;

                    if (sortBy === "customer") {
                        comparison = (a.customerData?.fullName || "").localeCompare(b.customerData?.fullName || "");
                    } else if (sortBy === "totalValue") {
                        comparison = (a.paymentsSummary?.totalOrderValue || 0) - (b.paymentsSummary?.totalOrderValue || 0);
                    } else if (sortBy === "status") {
                        comparison = (a.status || "").localeCompare(b.status || "");
                    } else if (sortBy === "deliveryDate") {
                        const dateA = toComparableDate(a.shipping?.scheduling?.date || "");
                        const dateB = toComparableDate(b.shipping?.scheduling?.date || "");
                        comparison = dateA.localeCompare(dateB);
                    } else {
                        // Default strictly handles 'date' (order date) which now includes time
                        const dateA = toComparableDate(a.date || "");
                        const dateB = toComparableDate(b.date || "");
                        comparison = dateA.localeCompare(dateB);
                    }

                    if (comparison !== 0) {
                        return sortOrder === "asc" ? comparison : -comparison;
                    }
                }

                return 0;
            });
    }, [orders, filters]);

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const totalItems = filteredOrders.length;

    const paginatedOrders = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return filteredOrders.slice(start, start + itemsPerPage);
    }, [filteredOrders, currentPage, itemsPerPage]);

    const handleDelete = async (id: string) => {
        await moveToTrash(id);
        toast.info("Pedido movido para a lixeira.");
    };

    const handleRestore = async (id: string) => {
        await restoreOrder(id);
        toast.success("Pedido restaurado com sucesso!");
    };

    const handlePermanentDelete = async (id: string) => {
        if (window.confirm("Certeza que deseja excluir DEFINITIVAMENTE este pedido? Esta ação não pode ser desfeita.")) {
            await permanentDeleteOrder(id);
            toast.success("Pedido excluído permanentemente.");
        }
    };

    const handleBulkTrash = async () => {
        if (selectedOrders.length === 0) return;
        setLoading(true);
        try {
            await Promise.all(selectedOrders.map(id => moveToTrash(id)));
            toast.info(`${selectedOrders.length} pedido(s) movido(s) para a lixeira.`);
            setSelectedOrders([]);
        } catch (error) {
            toast.error("Erro ao mover alguns pedidos para a lixeira.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkRestore = async () => {
        if (selectedOrders.length === 0) return;
        setLoading(true);
        try {
            await Promise.all(selectedOrders.map(id => restoreOrder(id)));
            toast.success(`${selectedOrders.length} pedido(s) restaurado(s) com sucesso!`);
            setSelectedOrders([]);
        } catch (error) {
            toast.error("Erro ao restaurar alguns pedidos.");
        } finally {
            setLoading(false);
        }
    };

    const handleBulkPermanentDelete = async () => {
        if (selectedOrders.length === 0) return;
        if (window.confirm(`Certeza que deseja excluir DEFINITIVAMENTE ${selectedOrders.length} pedido(s)? Esta ação não pode ser desfeita.`)) {
            setLoading(true);
            try {
                await Promise.all(selectedOrders.map(id => permanentDeleteOrder(id)));
                toast.success(`${selectedOrders.length} pedido(s) excluído(s) permanentemente.`);
                setSelectedOrders([]);
            } catch (error) {
                toast.error("Erro ao excluir alguns pedidos.");
            } finally {
                setLoading(false);
            }
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        const allIdsOnPage = paginatedOrders.map(o => o.id!).filter(Boolean);
        const allSelected = allIdsOnPage.every(id => selectedOrders.includes(id));

        if (allSelected) {
            setSelectedOrders(prev => prev.filter(id => !allIdsOnPage.includes(id)));
        } else {
            const newSelections = allIdsOnPage.filter(id => !selectedOrders.includes(id));
            setSelectedOrders(prev => [...prev, ...newSelections]);
        }
    };

    const clearSelection = () => setSelectedOrders([]);

    const handleStatusUpdate = async (id: string, newStatus: Order['status']) => {
        // Find full order in local state to avoid a pre-fetch (which was returning 400)
        const currentOrder = orders.find(o => o.id === id);

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus } : o));
        try {
            // Pass currentOrder so updateOrder skips the SELECT entirely
            await updateOrder(id, { status: newStatus }, currentOrder);
            toast.success("Status do pedido atualizado!");
        } catch (error) {
            // Rollback on failure
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: currentOrder?.status } as Order : o));
            console.error("Erro ao atualizar status:", error);
            toast.error("Erro ao atualizar status do pedido.");
        }
    };

    const handleAction = async (actionKey: string, order: Order) => {
        const actionDef = buttons.find(b => b.key === actionKey);
        if (actionDef && order.id) {
            // 1. Perform original action
            sessionStorage.setItem("order", JSON.stringify(order));
            actionsMap[actionDef.action](order);

            // 2. Track button click persistently
            const currentClicks = order.isButtonsClicked || {
                printReceipt: false,
                printShippingOrder: false,
                printWarrantyTerm: false,
                sendShippingOrder: false,
                sendCustomerOrder: false,
                sendCustomerReviews: false,
                printShippingLabel: false,
                printProductLabel: false,
                generatePaymentLink: false,
                printBudget: false,
                sendCustomerOrderDetails: false,
                sendAssistanceOS: false,
                sendBudget: false
            };
            const newClicks: IsButtonsClicked = { ...currentClicks, [actionKey]: true };

            // Optimistic update
            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, isButtonsClicked: newClicks } : o));

            try {
                await updateOrder(order.id!, { isButtonsClicked: newClicks });
                
                // Special case: reviewRequested is also updated for the reviews button
                if (actionKey === "sendCustomerReviews" && !order.reviewRequested) {
                    await updateOrder(order.id, { reviewRequested: true });
                }
            } catch (error) {
                // Rollback optimistic update
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, isButtonsClicked: currentClicks } : o));
                console.error("Erro ao registrar clique na ação:", error);
            }
        }
    };

    const handleBlingUpdate = async (id: string, value: boolean) => {
        const currentOrder = orders.find(o => o.id === id);
        if (!currentOrder) return;

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === id ? { ...o, isRegisteredInBling: value } : o));
        
        try {
            await updateOrder(id, { isRegisteredInBling: value }, currentOrder);
            toast.success(value ? "Pedido marcado como lançado no Bling!" : "Enviado para pendência do Bling.");
        } catch (error) {
            // Rollback
            setOrders(prev => prev.map(o => o.id === id ? { ...o, isRegisteredInBling: currentOrder.isRegisteredInBling } : o));
            console.error("Erro ao atualizar flag do Bling:", error);
            toast.error("Erro ao atualizar status do Bling.");
        }
    };

    const handleStockCheckUpdate = async (
        id: string, 
        value: boolean, 
        updatedItems?: any[], 
        updatedAssistanceItems?: any[]
    ) => {
        const currentOrder = orders.find(o => o.id === id);
        if (!currentOrder) return;

        const updatePayload: any = { isStockChecked: value };
        if (updatedItems) updatePayload.items = updatedItems;
        if (updatedAssistanceItems) updatePayload.assistanceItems = updatedAssistanceItems;

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatePayload } : o));
        
        try {
            await updateOrder(id, updatePayload, currentOrder);
            toast.success(value ? "Estoque checado com sucesso!" : "Checagem parcial salva!");
        } catch (error) {
            // Rollback
            setOrders(prev => prev.map(o => o.id === id ? { 
                ...o, 
                isStockChecked: currentOrder.isStockChecked,
                items: currentOrder.items,
                assistanceItems: currentOrder.assistanceItems
            } : o));
            console.error("Erro ao atualizar status do estoque:", error);
            toast.error("Erro ao atualizar status do estoque.");
        }
    };

    return {
        orders: paginatedOrders,
        totalItems,
        currentPage,
        itemsPerPage,
        totalPages,
        setCurrentPage,
        setItemsPerPage,
        loading,
        handleDelete,
        handleRestore,
        handlePermanentDelete,
        handleAction,
        handleStatusUpdate,
        selectedOrders,
        toggleSelection,
        selectAll,
        clearSelection,
        handleBulkTrash,
        handleBulkRestore,
        handleBulkPermanentDelete,
        handleDeleteDrafts: handleBulkPermanentDelete, // Alias for drafts modal
        handleBlingUpdate,
        handleStockCheckUpdate,
        refresh
    };
};
