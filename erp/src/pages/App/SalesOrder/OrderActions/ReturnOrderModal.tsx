import React, { useState, useEffect } from "react";
import Order from "../../../types/order.type";
import { Item } from "../../../types/items.type";
import Shipping from "../../../types/Shipping.type";
import { saveOrder } from "../../../utils/orderHistoryService";
import { formatOrderCode } from "../../../utils/orderCode";
import { toast } from "react-toastify";
import { Undo2 } from "lucide-react";
import ReturnItemsSelection from "./ReturnItemsSelection";
import ReturnCollectionSection from "./ReturnCollectionSection";
import ReturnFormTabs, { ReturnFormTab } from "../ReturnFormTabs";
import { supabase } from "../../../utils/supabaseConfig";
import { getReturnLineKey, getReturnableQuantities } from "../../../utils/returnQuantityRules";
import { allocateReturnQuantityAcrossInvoices, getBilledCapacityByOrderLine, type AvailableInvoiceLine } from "../../../utils/nfe/invoiceLineSnapshot";

type Props = {
    readonly order: Order;
    readonly onClose: () => void;
    readonly onSuccess: (id: string) => void;
};

const EMPTY_SCHEDULING: Shipping["scheduling"] = {
    dateType: "fixed",
    date: "",
    endDate: "",
    time: "",
    type: "fixed",
    startTime: "",
    endTime: "",
    notInformed: false
};

const ReturnOrderModal = ({ order, onClose, onSuccess }: Props) => {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [returnUnitPrices, setReturnUnitPrices] = useState<Record<string, number>>({});
    const [collectAtAddress, setCollectAtAddress] = useState<boolean | null>(null);
    const [scheduling, setScheduling] = useState<Shipping["scheduling"]>(EMPTY_SCHEDULING);
    const [observations, setObservations] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<ReturnFormTab>("items");
    const [returnableQuantities, setReturnableQuantities] = useState<Record<string, number>>({});
    const [returnsLoaded, setReturnsLoaded] = useState(false);
    const [fiscalCapacityLines, setFiscalCapacityLines] = useState<AvailableInvoiceLine[]>([]);
    const [fiscalCapacityLoaded, setFiscalCapacityLoaded] = useState(false);
    const [fiscalCapacityError, setFiscalCapacityError] = useState<string | null>(null);
    const [hasAuthorizedProductionInvoice, setHasAuthorizedProductionInvoice] = useState(false);
    const [returnRequestId] = useState(() => crypto.randomUUID());

    useEffect(() => {
        let active = true;
        const loadPriorReturns = async () => {
            if (!order.id) {
                setReturnsLoaded(true);
                setFiscalCapacityLoaded(true);
                setReturnableQuantities(Object.fromEntries(order.items.map((item, index) => [getReturnLineKey(item, index), Number(item.quantity || 0)])));
                return;
            }
            setReturnsLoaded(false);
            setFiscalCapacityLoaded(false);
            setFiscalCapacityError(null);
            let loadedHasAuthorizedInvoice = false;
            let loadedFiscalLines: AvailableInvoiceLine[] = [];
            try {
                const { data: session, error: sessionError } = await supabase.auth.getSession();
                if (sessionError || !session.session?.access_token) throw new Error("Faça login novamente para conferir as NF-e de origem.");
                const response = await fetch('/api/nfe/return-capacity', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${session.session.access_token}` },
                    body: JSON.stringify({ orderId: order.id }),
                });
                const result = await response.json();
                if (!response.ok || !result.success) throw new Error(result.error || 'Não foi possível conferir o saldo faturado.');
                if (!active) return;
                loadedHasAuthorizedInvoice = Boolean(result.hasAuthorizedProductionInvoice);
                loadedFiscalLines = result.lines || [];
                setHasAuthorizedProductionInvoice(loadedHasAuthorizedInvoice);
                setFiscalCapacityLines(loadedFiscalLines);
            } catch (error: any) {
                if (!active) return;
                setFiscalCapacityError(error.message || 'Não foi possível conferir o saldo fiscal.');
                toast.error('O saldo fiscal das NF-e não pôde ser conferido. A devolução ficará bloqueada até a consulta ser concluída.');
            } finally {
                if (active) setFiscalCapacityLoaded(true);
            }
            const { data, error } = await supabase
                .from("orders")
                .select("status,items,order_data")
                .eq("order_type", "return")
                .or(`linked_order_id.eq.${order.id},order_data->>linkedOrderId.eq.${order.id}`);
            if (!active) return;
            if (error) {
                console.error("Erro ao consultar devoluções anteriores:", error);
                toast.error("Não foi possível conferir o saldo já devolvido. Tente novamente.");
                return;
            }
            const priorReturns = (data || []).map((row: any) => ({
                status: row.status || row.order_data?.status,
                items: row.items || row.order_data?.items || [],
            }));
            const remaining = getReturnableQuantities(order.items || [], priorReturns);
            const billedCapacity = loadedHasAuthorizedInvoice
                ? getBilledCapacityByOrderLine(order.items || [], loadedFiscalLines)
                : null;
            setReturnableQuantities(Object.fromEntries(remaining.map((quantity, index) => [
                getReturnLineKey(order.items[index], index),
                billedCapacity ? Math.min(quantity, billedCapacity[index] || 0) : quantity,
            ])));
            setReturnsLoaded(true);
        };
        void loadPriorReturns();
        return () => { active = false; };
    }, [order.id, order.items]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") {
                onClose();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [onClose]);

    const selectedTotal = order.items.reduce((total, item, index) => {
        const itemId = getReturnLineKey(item, index);
        const qty = quantities[itemId] || 0;
        const unitPrice = returnUnitPrices[itemId] !== undefined ? returnUnitPrices[itemId] : item.unitPrice;
        return total + (qty * unitPrice);
    }, 0);

    const toggleItem = (id: string, max: number, defaultUnitPrice: number) => {
        setQuantities((current) => {
            if (current[id]) {
                const next = { ...current };
                delete next[id];
                return next;
            }
            return { ...current, [id]: max };
        });
        setReturnUnitPrices((current) => {
            if (current[id] !== undefined) {
                const next = { ...current };
                delete next[id];
                return next;
            }
            return { ...current, [id]: defaultUnitPrice };
        });
    };

    const updateQuantity = (id: string, quantity: number, max: number) =>
        setQuantities((current) => ({ ...current, [id]: Math.max(1, Math.min(quantity, max)) }));

    const updateUnitPrice = (id: string, unitPrice: number) =>
        setReturnUnitPrices((current) => ({ ...current, [id]: Math.max(0, unitPrice) }));

    const generateReturn = async () => {
        if (!returnsLoaded || !fiscalCapacityLoaded) return toast.warning("Aguarde a conferência do saldo devolvível e fiscal.");
        if (fiscalCapacityError) return toast.error(`Não foi possível validar a NF-e de origem: ${fiscalCapacityError}`);
        if (!Object.keys(quantities).length) return toast.warning("Selecione pelo menos um item para devolver.");
        if (order.items.some((item, index) => (quantities[getReturnLineKey(item, index)] || 0) > (returnableQuantities[getReturnLineKey(item, index)] || 0))) {
            return toast.error("Uma quantidade excede o saldo ainda disponível para devolução.");
        }
        if (collectAtAddress === null) return toast.warning("Informe se a devolução foi entregue na loja ou se será coletada no endereço.");

        const items = order.items.reduce<Item[]>((selected, item) => {
            const originalOrderItemIndex = order.items.indexOf(item);
            const itemId = getReturnLineKey(item, originalOrderItemIndex);
            const quantity = quantities[itemId];
            if (!quantity) return selected;

            const returnedUnitPrice = returnUnitPrices[itemId] !== undefined ? returnUnitPrices[itemId] : item.unitPrice;
            const returnedTotalValue = quantity * returnedUnitPrice;
            const originalUnitPrice = item.unitPrice;
            const originalTotalValue = quantity * originalUnitPrice;

            return [...selected, {
                ...item,
                quantity,
                originalOrderItemIndex,
                returnedQuantity: quantity,
                unitPrice: returnedUnitPrice,
                returnedUnitPrice,
                returnedTotalValue,
                originalUnitPrice,
                originalTotalValue,
            }];
        }, []);

        const total = items.reduce((sum, item) => sum + (item.returnedTotalValue ?? item.quantity * item.unitPrice), 0);
        let fiscalAllocations: Order['fiscalReturnAllocations'] = [];
        if (hasAuthorizedProductionInvoice) {
            try {
                fiscalAllocations = allocateReturnQuantityAcrossInvoices(items.map((item, returnItemIndex) => ({
                    returnItemIndex,
                    originalOrderItemIndex: Number(item.originalOrderItemIndex),
                    productId: item.productId,
                    code: item.code,
                    description: item.description,
                    quantity: Number(item.returnedQuantity || item.quantity),
                })), fiscalCapacityLines);
            } catch (error: any) {
                return toast.error(error.message || 'Não foi possível vincular todos os itens às NF-e autorizadas.');
            }
        }
        const originalSoldTotal = items.reduce((sum, item) => sum + (item.originalTotalValue ?? item.quantity * (item.originalUnitPrice ?? item.unitPrice)), 0);
        const isCompleteReturn = order.items.every((item, index) =>
            (quantities[getReturnLineKey(item, index)] || 0) >= (returnableQuantities[getReturnLineKey(item, index)] || 0)
        );

        const returnOrder: Order = {
            ...order,
            id: undefined,
            orderIndex: undefined,
            orderNumber: undefined,
            orderType: "return",
            status: collectAtAddress ? "scheduled" : "fulfilled",
            returnStockProcessed: false,
            date: new Date().toISOString(),
            items,
            linkedOrderId: order.id,
            returnRequestId,
            fiscalReturnAllocations: fiscalAllocations,
            linkedOrderCode: formatOrderCode(order),
            returnedTotalAmount: total,
            originalSoldTotal: originalSoldTotal,
            returnKind: isCompleteReturn ? 'complete' : 'partial',
            observation: `Devolução vinculada ao pedido #${formatOrderCode(order)}. ${order.observation || ""}`,
            collectionObservation: collectAtAddress ? observations.join("\n") : undefined,
            itemsSummary: {
                totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0),
                itemsSubtotal: total,
                totalFixedDiscount: 0,
                itemsTotalValue: total,
                totalItemsCost: items.reduce((sum, item) => sum + item.quantity * (item.costPrice || 0), 0)
            },
            shipping: {
                ...order.shipping,
                deliveryMethod: collectAtAddress ? order.shipping.deliveryMethod : "pickup",
                scheduling: collectAtAddress ? scheduling : EMPTY_SCHEDULING
            },
            payments: [],
            paymentsSummary: {
                totalPaymentsFee: 0,
                totalOrderValue: total,
                totalPaid: 0,
                totalAmountPaid: 0,
                amountRemaining: total
            }
        };

        setSubmitting(true);
        try {
            const id = await saveOrder(returnOrder);
            toast.success("Pedido de devolução gerado com sucesso!");
            onSuccess(id);
        } catch (error: unknown) {
            console.error("Erro ao gerar devolução:", error);
            toast.error("Erro ao processar devolução.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999999] flex items-stretch justify-center p-0 xl:items-center xl:p-4">
            <button
                type="button"
                aria-label="Fechar modal de devolução"
                className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            />
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby="return-order-title"
                className="relative z-10 flex h-full w-full max-w-none flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-2xl xl:rounded-3xl"
                onClick={(e) => e.stopPropagation()}
            >
                <header className="flex shrink-0 items-center justify-between border-b border-slate-50 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                    <div className="flex items-center gap-4">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30">
                            <Undo2 className="h-5 w-5" />
                        </div>
                        <div>
                            <h2 id="return-order-title" className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Gerar pedido de devolução</h2>
                            <p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido #{formatOrderCode(order)} • {order.customerData?.fullName}</p>
                        </div>
                    </div>
                    <button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </header>
                <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6">
                    <ReturnFormTabs activeTab={activeTab} onChange={setActiveTab} />
                    {activeTab === "items" ? (
                        <ReturnItemsSelection
                            order={order}
                            quantities={quantities}
                            returnableQuantities={returnableQuantities}
                            returnUnitPrices={returnUnitPrices}
                            onToggle={toggleItem}
                            onQuantityChange={updateQuantity}
                            onUnitPriceChange={updateUnitPrice}
                        />
                    ) : (
                        <ReturnCollectionSection collectAtAddress={collectAtAddress} onCollectChange={setCollectAtAddress} scheduling={scheduling} onSchedulingChange={(key, value) => setScheduling((current) => ({ ...current, [key]: value }))} observations={observations} onObservationsChange={setObservations} />
                    )}
                </div>
                <footer className="shrink-0 border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900">
                    <div className="mb-6 flex items-center justify-between px-2">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total da devolução</span>
                            <div className="text-2xl font-black text-amber-600">R$ {selectedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div>
                        </div>
                        <div className="text-right text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">
                            {Object.keys(quantities).length} itens selecionados
                            <span className="mt-1 block text-[9px] text-slate-400">Vínculo: #{formatOrderCode(order)}</span>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-2xl border border-slate-200 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">
                            Cancelar
                        </button>
                        <button type="button" onClick={generateReturn} disabled={submitting || !returnsLoaded || !fiscalCapacityLoaded || Boolean(fiscalCapacityError) || !Object.keys(quantities).length || collectAtAddress === null} className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-amber-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-amber-500/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">
                            {submitting || !returnsLoaded || !fiscalCapacityLoaded ? "Conferindo saldos..." : <><Undo2 className="h-4 w-4" />Gerar pedido de devolução</>}
                        </button>
                    </div>
                </footer>
            </div>
        </div>
    );
};

export default ReturnOrderModal;
