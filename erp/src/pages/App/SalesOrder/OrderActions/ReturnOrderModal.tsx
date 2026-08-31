import React, { useState } from "react";
import Order from "../../../types/order.type";
import { Item } from "../../../types/items.type";
import Shipping from "../../../types/Shipping.type";
import { saveOrder, updateOrder } from "../../../utils/orderHistoryService";
import { dateNow } from "../../../utils/formatters";
import { formatOrderCode } from "../../../utils/orderCode";
import { toast } from "react-toastify";
import { Undo2 } from "lucide-react";
import ReturnItemsSelection from "./ReturnItemsSelection";
import ReturnCollectionSection from "./ReturnCollectionSection";
import ReturnFormTabs, { ReturnFormTab } from "../ReturnFormTabs";

type Props = { order: Order; onClose: () => void; onSuccess: (id: string) => void };
const EMPTY_SCHEDULING: Shipping["scheduling"] = { dateType: "fixed", date: "", endDate: "", time: "", type: "fixed", startTime: "", endTime: "", notInformed: false };

const ReturnOrderModal = ({ order, onClose, onSuccess }: Props) => {
    const [quantities, setQuantities] = useState<Record<string, number>>({});
    const [collectAtAddress, setCollectAtAddress] = useState(false);
    const [scheduling, setScheduling] = useState<Shipping["scheduling"]>(EMPTY_SCHEDULING);
    const [observations, setObservations] = useState<string[]>([]);
    const [submitting, setSubmitting] = useState(false);
    const [activeTab, setActiveTab] = useState<ReturnFormTab>("items");
    const selectedTotal = order.items.reduce((total, item) => total + ((quantities[item.productId || item.description] || 0) * item.unitPrice), 0);

    const toggleItem = (id: string, max: number) => setQuantities((current) => current[id] ? Object.fromEntries(Object.entries(current).filter(([key]) => key !== id)) : { ...current, [id]: max });
    const updateQuantity = (id: string, quantity: number, max: number) => setQuantities((current) => ({ ...current, [id]: Math.max(1, Math.min(quantity, max)) }));
    const generateReturn = async () => {
        if (!Object.keys(quantities).length) return toast.warning("Selecione pelo menos um item para devolver.");
        const items = order.items.reduce<Item[]>((selected, item) => { const quantity = quantities[item.productId || item.description]; return quantity ? [...selected, { ...item, quantity }] : selected; }, []);
        const total = items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
        const isCompleteReturn = order.items.every((item) =>
            (quantities[item.productId || item.description] || 0) >= item.quantity
        );
        const returnOrder: Order = {
            ...order, id: undefined, orderIndex: undefined, orderNumber: undefined, orderType: "return", status: "scheduled", returnStockProcessed: false, date: dateNow(), items, linkedOrderId: order.id, linkedOrderCode: formatOrderCode(order),
            observation: `Devolução vinculada ao pedido #${formatOrderCode(order)}. ${order.observation || ""}`, collectionObservation: collectAtAddress ? observations.join("\n") : undefined,
            itemsSummary: { totalQuantity: items.reduce((sum, item) => sum + item.quantity, 0), itemsSubtotal: total, totalFixedDiscount: 0, itemsTotalValue: total, totalItemsCost: items.reduce((sum, item) => sum + item.quantity * (item.costPrice || 0), 0) },
            shipping: { ...order.shipping, scheduling: collectAtAddress ? scheduling : order.shipping.scheduling }, payments: [], paymentsSummary: { totalPaymentsFee: 0, totalOrderValue: total, totalPaid: 0, totalAmountPaid: 0, amountRemaining: total }
        };
        setSubmitting(true);
        try {
            const id = await saveOrder(returnOrder);
            await updateOrder(order.id!, {
                returnOrderId: id,
                returnKind: isCompleteReturn ? 'complete' : 'partial',
            }, order);
            toast.success("Pedido de devolução gerado com sucesso!");
            onSuccess(id);
        }
        catch (error) { console.error("Erro ao gerar devolução:", error); toast.error("Erro ao processar devolução."); }
        finally { setSubmitting(false); }
    };

    return <div className="fixed inset-0 z-[999999] flex items-stretch justify-center bg-slate-900/60 p-0 backdrop-blur-sm animate-fade-in xl:items-center xl:p-4"><div className="flex h-full w-full max-w-none flex-col overflow-hidden border border-slate-100 bg-white shadow-2xl animate-slide-up dark:border-slate-800 dark:bg-slate-900 xl:h-auto xl:max-h-[90vh] xl:max-w-2xl xl:rounded-3xl">
        <header className="flex shrink-0 items-center justify-between border-b border-slate-50 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="flex items-center gap-4"><div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-100 text-amber-600 dark:bg-amber-900/30"><Undo2 className="h-5 w-5" /></div><div><h2 className="text-xl font-black uppercase tracking-tight text-slate-800 dark:text-white">Gerar pedido de devolução</h2><p className="mt-0.5 text-[10px] font-black uppercase tracking-widest text-slate-400">Pedido #{formatOrderCode(order)} • {order.customerData?.fullName}</p></div></div><button type="button" onClick={onClose} className="flex h-10 w-10 items-center justify-center rounded-xl text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"><i className="bi bi-x-lg text-lg" /></button></header>
        <div className="custom-scrollbar flex-1 space-y-6 overflow-y-auto p-6"><ReturnFormTabs activeTab={activeTab} onChange={setActiveTab} />{activeTab === "items" ? <ReturnItemsSelection order={order} quantities={quantities} onToggle={toggleItem} onQuantityChange={updateQuantity} /> : <ReturnCollectionSection collectAtAddress={collectAtAddress} onCollectChange={setCollectAtAddress} scheduling={scheduling} onSchedulingChange={(key, value) => setScheduling((current) => ({ ...current, [key]: value }))} observations={observations} onObservationsChange={setObservations} />}</div>
        <footer className="shrink-0 border-t border-slate-100 bg-white p-6 dark:border-slate-800 dark:bg-slate-900"><div className="mb-6 flex items-center justify-between px-2"><div><span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400">Total da devolução</span><div className="text-2xl font-black text-amber-600">R$ {selectedTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</div></div><div className="text-right text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">{Object.keys(quantities).length} itens selecionados<span className="mt-1 block text-[9px] text-slate-400">Vínculo: #{formatOrderCode(order)}</span></div></div><div className="flex gap-3"><button type="button" onClick={onClose} disabled={submitting} className="flex-1 rounded-2xl border border-slate-200 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 hover:bg-slate-100 dark:border-slate-800 dark:hover:bg-slate-800">Cancelar</button><button type="button" onClick={generateReturn} disabled={submitting || !Object.keys(quantities).length} className="flex flex-1 items-center justify-center gap-3 rounded-2xl bg-amber-600 px-6 py-4 text-[10px] font-black uppercase tracking-widest text-white shadow-xl shadow-amber-500/20 transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:bg-slate-300 disabled:shadow-none">{submitting ? "Processando..." : <><Undo2 className="h-4 w-4" />Gerar pedido de devolução</>}</button></div></footer>
    </div></div>;
};

export default ReturnOrderModal;
