import { useState, useEffect, useMemo } from "react";
import Order, { IsButtonsClicked } from "../../../types/order.type";
import { 
    subscribeToOrders, 
    fetchOrdersPage, 
    updateOrder, 
    undoReturn 
} from "../../../utils/orderHistoryService";
import { actionsMap, buttons } from "../OrderActions/orderActionsConfig";
import { autoFulfillExpiredOrders } from "@/pages/utils/orderFulfillmentCountdown";
import { toast } from "react-toastify";
import { useWindowSize } from "../../../../hooks/useWindowSize";
import { filterOrder, sortOrders } from "./useOrderHistoryFilters";
import { createOrderHistoryOperations } from "./useOrderHistoryOperations";

const PAGE_SIZE = 30;
const CARD_VIEW_BREAKPOINT = 1024;

export const useOrderHistory = (filters?: any) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [selectedOrders, setSelectedOrders] = useState<string[]>([]);
    const [refreshSignal, setRefreshSignal] = useState(0);
    const [totalDatabaseItems, setTotalDatabaseItems] = useState(0);
    const [pendingReturnFulfillment, setPendingReturnFulfillment] = useState<Order | null>(null);
    const [pendingReturnCancellation, setPendingReturnCancellation] = useState<Order | null>(null);
    
    const { width } = useWindowSize();
    const isMobile = width < CARD_VIEW_BREAKPOINT;
    const isCardView = isMobile ||
        (typeof window !== 'undefined' && (
            window.location.search.includes('auth_email') ||
            window.location.pathname.includes('/mobile') ||
            Boolean((window as any).ReactNativeWebView)
        ));

    const refresh = () => setRefreshSignal(prev => prev + 1);

    useEffect(() => {
        let active = true;
        setLoading(true);

        fetchOrdersPage(currentPage, PAGE_SIZE, filters).then(({ orders: pageOrders, total }) => {
            if (!active) return;
            setOrders(pageOrders);
            setTotalDatabaseItems(total);
            setLoading(false);
            autoFulfillExpiredOrders(pageOrders);
        }).catch(err => {
            if (!active) return;
            console.error('[useOrderHistory] Erro ao buscar pedidos paginados:', err);
            setLoading(false);
        });

        return () => {
            active = false;
        };
    }, [currentPage, filters, refreshSignal]);

    useEffect(() => {
        const unsub = subscribeToOrders(() => {
            refresh();
        });
        return () => unsub();
    }, []);

    useEffect(() => {
        setCurrentPage(1);
        setSelectedOrders([]);
    }, [filters]);

    const filteredOrders = useMemo(() => {
        return sortOrders(orders.filter(order => filterOrder(order, filters)), filters);
    }, [orders, filters]);

    const totalItems = totalDatabaseItems || filteredOrders.length;
    const totalPages = Math.max(1, Math.ceil(totalItems / PAGE_SIZE));

    const operations = useMemo(() => {
        return createOrderHistoryOperations({
            orders,
            setOrders,
            selectedOrders,
            setSelectedOrders,
            setLoading,
            refresh,
        });
    }, [orders, selectedOrders]);

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
        await operations.commitStatusUpdate(currentOrder, newStatus);
    };

    const confirmReturnFulfillment = async () => {
        if (!pendingReturnFulfillment) return;
        const order = pendingReturnFulfillment;
        setPendingReturnFulfillment(null);
        await operations.commitStatusUpdate(order, 'fulfilled');
    };

    const confirmReturnCancellation = async () => {
        if (!pendingReturnCancellation) return;
        const order = pendingReturnCancellation;
        setPendingReturnCancellation(null);
        try {
            await undoReturn(order);
            const returnId = order.orderType === "return" ? order.id : order.returnOrderId;
            setOrders(prev => prev.map(item => item.id === returnId
                ? { ...item, status: "cancelled", returnStockProcessed: false, returnStockReversed: true }
                : item.id === order.id && order.orderType !== "return"
                    ? { ...item, returnOrderId: undefined, returnKind: undefined }
                    : item));
            const msg = order.status === "fulfilled" ? "Devolução estornada com sucesso!" : "Devolução cancelada com sucesso!";
            toast.success(msg);
            refresh();
        } catch (error: any) {
            toast.error(`Erro ao processar devolução: ${error?.message || "tente novamente"}`);
        }
    };

    const handleAction = async (actionKey: string, order: Order) => {
        if (actionKey === "undoReturn") {
            setPendingReturnCancellation(order);
            return;
        }

        const actionDef = buttons.find(b => b.key === actionKey);
        if (actionDef && order.id) {
            sessionStorage.setItem("order", JSON.stringify(order));
            actionsMap[actionDef.action](order);

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

            setOrders(prev => prev.map(o => o.id === order.id ? { ...o, isButtonsClicked: newClicks } : o));

            try {
                await updateOrder(order.id!, { isButtonsClicked: newClicks }, order);
                if (actionKey === "sendCustomerReviews" && !order.reviewRequested) {
                    await updateOrder(order.id, { reviewRequested: true });
                }
            } catch (error) {
                setOrders(prev => prev.map(o => o.id === order.id ? { ...o, isButtonsClicked: currentClicks } : o));
                console.error("Erro ao registrar clique na ação:", error);
            }
        }
    };

    const toggleSelection = (id: string) => {
        setSelectedOrders(prev =>
            prev.includes(id) ? prev.filter(selectedId => selectedId !== id) : [...prev, id]
        );
    };

    const selectAll = () => {
        const allIdsOnPage = filteredOrders.map(o => o.id!).filter(Boolean);
        const allSelected = allIdsOnPage.every(id => selectedOrders.includes(id));
        if (allSelected) {
            setSelectedOrders(prev => prev.filter(id => !allIdsOnPage.includes(id)));
        } else {
            const newSelections = allIdsOnPage.filter(id => !selectedOrders.includes(id));
            setSelectedOrders(prev => [...prev, ...newSelections]);
        }
    };

    const clearSelection = () => setSelectedOrders([]);

    return {
        orders: filteredOrders,
        totalItems,
        currentPage,
        itemsPerPage: PAGE_SIZE,
        totalPages,
        setCurrentPage,
        isMobile,
        isCardView,
        loading,
        handleDelete: operations.handleDelete,
        handleRestore: operations.handleRestore,
        handlePermanentDelete: operations.handlePermanentDelete,
        handleAction,
        handleStatusUpdate,
        pendingReturnFulfillment,
        confirmReturnFulfillment,
        cancelReturnFulfillment: () => setPendingReturnFulfillment(null),
        pendingReturnCancellation,
        confirmReturnCancellation,
        cancelReturnCancellation: () => setPendingReturnCancellation(null),
        selectedOrders,
        toggleSelection,
        selectAll,
        clearSelection,
        handleBulkTrash: operations.handleBulkTrash,
        handleBulkRestore: operations.handleBulkRestore,
        handleBulkPermanentDelete: operations.handleBulkPermanentDelete,
        handleDeleteDrafts: operations.handleBulkPermanentDelete,
        handleBlingUpdate: operations.handleBlingUpdate,
        handleStockCheckUpdate: operations.handleStockCheckUpdate,
        refresh
    };
};
