import Order from "../../../types/order.type";
import { 
    restoreOrder, 
    permanentDeleteDraftOrder, 
    permanentDeleteOrder, 
    updateOrder, 
    undoReturn 
} from "../../../utils/orderHistoryService";
import { toast } from "react-toastify";

interface OrderHistoryOperationsParams {
    orders: Order[];
    setOrders: React.Dispatch<React.SetStateAction<Order[]>>;
    selectedOrders: string[];
    setSelectedOrders: React.Dispatch<React.SetStateAction<string[]>>;
    setLoading: React.Dispatch<React.SetStateAction<boolean>>;
    refresh: () => void;
}

export const createOrderHistoryOperations = ({
    orders,
    setOrders,
    selectedOrders,
    setSelectedOrders,
    setLoading,
    refresh,
}: OrderHistoryOperationsParams) => {
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

    const commitStatusUpdate = async (currentOrder: Order, newStatus: Order['status']) => {
        const id = currentOrder.id!;
        const isCancelled = newStatus === 'cancelled';
        const expectedStockProcessed = isCancelled ? false : currentOrder.stockProcessed;
        const expectedStockReversed = isCancelled ? true : (currentOrder.stockReversed || false);
        const expectedReturnStockProcessed = isCancelled ? false : currentOrder.returnStockProcessed;
        const expectedReturnStockReversed = isCancelled ? true : (currentOrder.returnStockReversed || false);

        // Optimistic update
        setOrders(prev => prev.map(o => o.id === id ? { 
            ...o, 
            status: newStatus, 
            stockProcessed: expectedStockProcessed,
            stockReversed: expectedStockReversed,
            returnStockProcessed: expectedReturnStockProcessed,
            returnStockReversed: expectedReturnStockReversed
        } : o));
        try {
            await updateOrder(id, { status: newStatus }, currentOrder);
            toast.success("Status do pedido atualizado!");
            if (isCancelled) {
                await refresh();
            }
        } catch (error) {
            // Rollback on failure
            setOrders(prev => prev.map(o => o.id === id ? { 
                ...o, 
                status: currentOrder.status, 
                stockProcessed: currentOrder.stockProcessed, 
                stockReversed: currentOrder.stockReversed,
                returnStockProcessed: currentOrder.returnStockProcessed,
                returnStockReversed: currentOrder.returnStockReversed
            } : o));
            console.error("Erro ao atualizar status:", error);
            toast.error("Erro ao atualizar status do pedido.");
        }
    };

    const handleBlingUpdate = async (id: string, value: boolean) => {
        const currentOrder = orders.find(o => o.id === id);
        if (!currentOrder) return;

        setOrders(prev => prev.map(o => o.id === id ? { ...o, isRegisteredInBling: value } : o));
        try {
            await updateOrder(id, { isRegisteredInBling: value }, currentOrder);
            toast.success(value ? "Pedido marcado como lançado no Bling!" : "Enviado para pendência do Bling.");
        } catch (error) {
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

        setOrders(prev => prev.map(o => o.id === id ? { ...o, ...updatePayload } : o));
        try {
            await updateOrder(id, updatePayload, currentOrder);
            toast.success(value ? "Estoque checado com sucesso!" : "Checagem parcial salva!");
        } catch (error) {
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
        handleDelete,
        handleRestore,
        handlePermanentDelete,
        handleBulkTrash,
        handleBulkRestore,
        handleBulkPermanentDelete,
        commitStatusUpdate,
        handleBlingUpdate,
        handleStockCheckUpdate,
    };
};
