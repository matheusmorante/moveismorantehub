import { useState, useEffect, useMemo } from "react";
import Order, { IsButtonsClicked } from "../../../types/order.type";
import { subscribeToOrders, restoreOrder, permanentDeleteDraftOrder, permanentDeleteOrder, updateOrder } from "../../../utils/orderHistoryService";
import { actionsMap, buttons } from "../OrderActions/orderActionsConfig";
import { toast } from "react-toastify";
import { useWindowSize } from "../../../../hooks/useWindowSize";

const PAGE_SIZE = 30;
const CARD_VIEW_BREAKPOINT = 1024;

export const useOrderHistory = (filters?: any) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [totalDatabaseItems, setTotalDatabaseItems] = useState(0);
    const [loadingMore, setLoadingMore] = useState(false);
    const [pendingReturnFulfillment, setPendingReturnFulfillment] = useState<Order | null>(null);
    const { width } = useWindowSize();
    const isMobile = width < CARD_VIEW_BREAKPOINT;
    // Cards view uses infinite scroll (mobile + desktop cards), table view uses classic pagination
    const isCardView = isMobile ||
        (typeof window !== 'undefined' && (
            window.location.search.includes('auth_email') ||
            window.location.pathname.includes('/mobile') ||
            Boolean((window as any).ReactNativeWebView)
        ));
    const [useInfiniteScroll, setUseInfiniteScroll] = useState(isCardView);

    // Sync useInfiniteScroll with isCardView changes
    useEffect(() => {
        setUseInfiniteScroll(isCardView);
    }, [isCardView]);

    const refresh = () => setRefreshSignal(prev => prev + 1);

    const loadMore = () => {
        if (!useInfiniteScroll || loadingMore || (currentPage * PAGE_SIZE) >= totalDatabaseItems) return;
        setLoadingMore(true);
        setCurrentPage(prev => prev + 1);
    };

    useEffect(() => {
        let active = true;
        setLoading(true);

        const unsub = subscribeToOrders((allOrders) => {
            if (!active) return;
            setOrders(allOrders);
            setTotalDatabaseItems(allOrders.length);
            setLoading(false);
            setLoadingMore(false);
        });

        return () => {
            active = false;
            unsub();
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

    const hasActiveFilter = Boolean(
        filters?.customerName ||
        filters?.productName ||
        filters?.seller ||
        filters?.status ||
        filters?.orderType ||
        filters?.showTrash ||
        filters?.isDraft ||
        filters?.dateRange?.start ||
        filters?.dateRange?.end
    );

    const totalItems = filteredOrders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));
    const hasMore = useInfiniteScroll && (currentPage * PAGE_SIZE) < totalItems;

    const displayedOrders = useMemo(() => {
        if (useInfiniteScroll) {
            return filteredOrders.slice(0, currentPage * PAGE_SIZE);
        }
        const startIndex = (currentPage - 1) * PAGE_SIZE;
        return filteredOrders.slice(startIndex, startIndex + PAGE_SIZE);
    }, [filteredOrders, currentPage, useInfiniteScroll]);

    const handleDelete = async (id: string) => {
        const order = orders.find((item) => item.id === id);
        if (order?.status !== 'draft') {
            toast.warning("Somente pedidos em rascunho podem ser excluídos.");
            return;
        }
        await permanentDeleteDraftOrder(id);
        toast.success("Rascunho excluído da lista.");
        refresh();
    };

    const handleRestore = async (id: string) => {
        await restoreOrder(id);
        toast.success("Pedido restaurado com sucesso!");
        refresh();
    };

    const handlePermanentDelete = async (id: string) => {
        if (window.confirm("Certeza que deseja excluir DEFINITIVAMENTE este pedido? Esta ação não pode ser desfeita.")) {
            await permanentDeleteOrder(id);
            toast.success("Pedido excluído permanentemente.");
            refresh();
        }
    };

    const handleBulkTrash = async () => {
        if (selectedOrders.length === 0) return;
        const selected = orders.filter((order) => selectedOrders.includes(order.id || ''));
        if (selected.some((order) => order.status !== 'draft')) {
            toast.warning("Somente pedidos em rascunho podem ser excluídos.");
            return;
        }
        setLoading(true);
        try {
            await Promise.all(selectedOrders.map(id => permanentDeleteOrder(id)));
            toast.success(`${selectedOrders.length} rascunho(s) excluído(s) permanentemente.`);
            setSelectedOrders([]);
            refresh();
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
            refresh();
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
                refresh();
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
        const allIdsOnPage = displayedOrders.map(o => o.id!).filter(Boolean);
        const allSelected = allIdsOnPage.every(id => selectedOrders.includes(id));

        if (allSelected) {
            setSelectedOrders(prev => prev.filter(id => !allIdsOnPage.includes(id)));
        } else {
            const newSelections = allIdsOnPage.filter(id => !selectedOrders.includes(id));
            setSelectedOrders(prev => [...prev, ...newSelections]);
        }
    };

    const clearSelection = () => setSelectedOrders([]);

    const commitStatusUpdate = async (currentOrder: Order, newStatus: Order['status']) => {
        const id = currentOrder.id!;
        const expectedStockProcessed = currentOrder.stockProcessed;

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === id ? { ...o, status: newStatus, stockProcessed: expectedStockProcessed } : o));
        try {
            // Pass currentOrder so updateOrder skips the SELECT entirely
            await updateOrder(id, { status: newStatus }, currentOrder);
            toast.success("Status do pedido atualizado!");
        } catch (error) {
            // Rollback on failure
            setOrders(prev => prev.map(o => o.id === id ? { ...o, status: currentOrder.status, stockProcessed: currentOrder.stockProcessed, returnStockProcessed: currentOrder.returnStockProcessed } : o));
            console.error("Erro ao atualizar status:", error);
            toast.error("Erro ao atualizar status do pedido.");
        }
    };

    const handleStatusUpdate = async (id: string, newStatus: Order['status']) => {
        const currentOrder = orders.find(order => order.id === id);
        if (!currentOrder) return;
        if (currentOrder.status === 'draft') {
            toast.warning("Pedidos em rascunho devem ter seu cadastro finalizado através do formulário para serem agendados.");
            return;
        }
        if (currentOrder.status === 'cancelled' && newStatus !== 'cancelled') {
            toast.warning("Pedido cancelado não pode ser reaberto. Duplique-o para criar uma nova venda.");
            return;
        }
        if (currentOrder.orderType === 'return' && currentOrder.status === 'fulfilled' && newStatus === 'cancelled') {
            toast.warning("Uma devolução atendida não pode ser cancelada ou desfeita.");
            return;
        }
        if (currentOrder.orderType === 'return' && currentOrder.status === 'scheduled' && newStatus === 'fulfilled') {
            setPendingReturnFulfillment(currentOrder);
            return;
        }
        await commitStatusUpdate(currentOrder, newStatus);
    };

    const confirmReturnFulfillment = async () => {
        if (!pendingReturnFulfillment) return;
        const order = pendingReturnFulfillment;
        setPendingReturnFulfillment(null);
        await commitStatusUpdate(order, 'fulfilled');
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
                await updateOrder(order.id!, { isButtonsClicked: newClicks }, order);
                
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
        orders: displayedOrders,
        totalItems,
        hasMore,
        loadMore,
        currentPage,
        itemsPerPage: PAGE_SIZE,
        totalPages,
        setCurrentPage,
        isMobile,
        isCardView,
        useInfiniteScroll,
        loadingMore,
        loading,
        handleDelete,
        handleRestore,
        handlePermanentDelete,
        handleAction,
        handleStatusUpdate,
        pendingReturnFulfillment,
        confirmReturnFulfillment,
        cancelReturnFulfillment: () => setPendingReturnFulfillment(null),
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
