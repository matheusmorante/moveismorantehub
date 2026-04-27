import React, { useState } from "react";
import Order, { Item } from "../../../types/order.type";
import { saveOrder, updateOrder } from "../../../utils/orderHistoryService";
import { dateNow } from "../../../utils/formatters";
import { toast } from "react-toastify";
import Agendamento from "../ShippingComponents/Agendamento";
import Shipping from "../../../types/Shipping.type";

interface ReturnOrderModalProps {
    order: Order;
    onClose: () => void;
    onSuccess: (newOrderId: string) => void;
}

const EMPTY_SCHEDULING: Shipping["scheduling"] = {
    dateType: 'fixed',
    date: '',
    endDate: '',
    type: 'fixed',
    startTime: '',
    endTime: '',
    notInformed: false
};

const ReturnOrderModal: React.FC<ReturnOrderModalProps> = ({ order, onClose, onSuccess }) => {
    // State for selected quantities: { [itemId]: quantity }
    const [selectedQuantities, setSelectedQuantities] = useState<Record<string, number>>({});
    const [collectAtAddress, setCollectAtAddress] = useState(false);
    const [scheduling, setScheduling] = useState<Shipping["scheduling"]>(EMPTY_SCHEDULING);
    const [collectionObservation, setCollectionObservation] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const toggleItem = (itemId: string, maxQty: number) => {
        setSelectedQuantities(prev => {
            const next = { ...prev };
            if (next[itemId]) {
                delete next[itemId];
            } else {
                next[itemId] = maxQty;
            }
            return next;
        });
    };

    const updateQuantity = (itemId: string, qty: number, maxQty: number) => {
        const validQty = Math.max(1, Math.min(qty, maxQty));
        setSelectedQuantities(prev => ({
            ...prev,
            [itemId]: validQty
        }));
    };

    const handleGenerateReturn = async () => {
        const itemIds = Object.keys(selectedQuantities);
        if (itemIds.length === 0) {
            toast.warning("Selecione pelo menos um item para devolver.");
            return;
        }

        setSubmitting(true);
        try {
            const itemsToReturn: Item[] = [];
            const remainingItems: Item[] = [];

            order.items.forEach(item => {
                const itemId = item.productId || item.description;
                const returnQty = selectedQuantities[itemId];

                if (returnQty) {
                    // Create returned item
                    itemsToReturn.push({
                        ...item,
                        quantity: returnQty,
                        totalValue: returnQty * item.unitPrice
                    });

                    // If partial return, keep a part in the original order
                    const remainingQty = item.quantity - returnQty;
                    if (remainingQty > 0) {
                        remainingItems.push({
                            ...item,
                            quantity: remainingQty,
                            totalValue: remainingQty * item.unitPrice
                        });
                    }
                } else {
                    // Item not returned, keep it all
                    remainingItems.push(item);
                }
            });

            // 1. Create Return Order
            const totalReturnItemsValue = itemsToReturn.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
            
            const returnOrder: Order = {
                ...order,
                id: undefined,
                orderType: 'return',
                status: 'finalized',
                date: dateNow(),
                items: itemsToReturn,
                linkedOrderId: order.id,
                observation: `Devolução vinculada ao pedido #${order.id}. ${order.observation || ''}`,
                collectionObservation: collectAtAddress ? collectionObservation : undefined,
                itemsSummary: {
                    totalItems: itemsToReturn.length,
                    totalQuantity: itemsToReturn.reduce((acc, curr) => acc + curr.quantity, 0),
                    totalValue: totalReturnItemsValue
                },
                shipping: collectAtAddress ? {
                    ...order.shipping,
                    scheduling: scheduling
                } : undefined,
                payments: [], 
                paymentsSummary: {
                    totalOrderValue: totalReturnItemsValue,
                    totalPaid: 0,
                    remainingValue: totalReturnItemsValue
                }
            };

            const newId = await saveOrder(returnOrder);

            // 2. Update Original Order
            const totalRemainingItemsValue = remainingItems.reduce((acc, curr) => acc + (curr.totalValue || 0), 0);
            const originalSubtotal = totalRemainingItemsValue + (order.shipping?.value || 0);
            const originalTotalOrderValue = originalSubtotal - (order.paymentsSummary?.discount || 0);

            const originalUpdate: Partial<Order> = {
                items: remainingItems,
                itemsSummary: {
                    totalItems: remainingItems.length,
                    totalQuantity: remainingItems.reduce((acc, curr) => acc + curr.quantity, 0),
                    totalValue: totalRemainingItemsValue
                },
                paymentsSummary: {
                    ...order.paymentsSummary,
                    totalItemsValue: totalRemainingItemsValue,
                    subtotal: originalSubtotal,
                    totalOrderValue: originalTotalOrderValue,
                },
                returnOrderId: newId
            };

            if (remainingItems.length === 0) {
                originalUpdate.status = 'cancelled';
                originalUpdate.observation = `${order.observation || ''}\n[CANCELADO POR DEVOLUÇÃO TOTAL]`;
            } else {
                const returnedDesc = itemsToReturn.map(i => `${i.quantity}x ${i.description}`).join(', ');
                originalUpdate.observation = `${order.observation || ''}\n[ITENS DEVOLVIDOS: ${returnedDesc}]`;
            }

            await updateOrder(order.id!, originalUpdate, order);

            toast.success("Devolução gerada com sucesso!");
            onSuccess(newId);
        } catch (error) {
            console.error("Erro ao gerar devolução:", error);
            toast.error("Erro ao processar devolução.");
        } finally {
            setSubmitting(false);
        }
    };

    const totalReturnItemsValue = order.items
        .filter(i => !!selectedQuantities[i.productId || i.description])
        .reduce((acc, i) => acc + (selectedQuantities[i.productId || i.description] * i.unitPrice), 0);

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-white dark:bg-slate-900 shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <i className="bi bi-arrow-return-left text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white uppercase tracking-tight">Gerar Devolução</h2>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Pedido #{order.id} • {order.customerData?.fullName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    {/* Items Section */}
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-4 ml-1">Itens do Pedido</span>
                        <div className="space-y-3">
                            {order.items.map((item, idx) => {
                                const itemId = item.productId || item.description;
                                const isSelected = !!selectedQuantities[itemId];
                                return (
                                    <div 
                                        key={idx}
                                        className={`flex flex-col p-4 rounded-3xl border transition-all ${
                                            isSelected 
                                            ? 'bg-amber-50/50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/40 shadow-premium-sm' 
                                            : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800'
                                        }`}
                                    >
                                        <div className="flex items-center justify-between gap-4">
                                            <button 
                                                onClick={() => toggleItem(itemId, item.quantity)}
                                                className="flex items-center gap-3 flex-1 text-left outline-none"
                                            >
                                                <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all ${
                                                    isSelected 
                                                    ? 'bg-amber-500 border-amber-500 text-white shadow-lg shadow-amber-500/20' 
                                                    : 'border-slate-200 dark:border-slate-700'
                                                }`}>
                                                    {isSelected && <i className="bi bi-check-lg text-xs" />}
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className={`text-[11px] font-black uppercase tracking-wide leading-tight ${isSelected ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                        {item.description}
                                                    </span>
                                                    <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">
                                                        Total Original: {item.quantity} {item.unit || 'un'}
                                                    </span>
                                                </div>
                                            </button>

                                            <div className="text-right">
                                                <div className={`text-xs font-black ${isSelected ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                                                    R$ {((isSelected ? selectedQuantities[itemId] : item.quantity) * item.unitPrice).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                                </div>
                                            </div>
                                        </div>

                                        {isSelected && (
                                            <div className="mt-4 pt-4 border-t border-amber-200/50 dark:border-amber-900/20 flex items-center justify-between gap-4">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-amber-600/70">Quantidade a Devolver:</span>
                                                <div className="flex items-center gap-1 bg-white dark:bg-slate-950 p-1 rounded-2xl border border-amber-100 dark:border-amber-900/40">
                                                    <button 
                                                        onClick={() => updateQuantity(itemId, selectedQuantities[itemId] - 1, item.quantity)}
                                                        className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-slate-600 dark:text-slate-400 transition-all active:scale-90"
                                                    >
                                                        <i className="bi bi-dash-lg" />
                                                    </button>
                                                    <input 
                                                        type="number"
                                                        value={selectedQuantities[itemId]}
                                                        onChange={(e) => updateQuantity(itemId, parseInt(e.target.value) || 1, item.quantity)}
                                                        className="w-12 text-center bg-transparent font-black text-sm text-slate-700 dark:text-slate-200 outline-none"
                                                    />
                                                    <button 
                                                        onClick={() => updateQuantity(itemId, selectedQuantities[itemId] + 1, item.quantity)}
                                                        className="w-8 h-8 rounded-xl bg-slate-50 dark:bg-slate-900 hover:bg-amber-100 dark:hover:bg-amber-900/50 text-slate-600 dark:text-slate-400 transition-all active:scale-90"
                                                    >
                                                        <i className="bi bi-plus-lg" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Logistics Section */}
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-3xl border border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-4">
                                <div className="w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
                                    <i className="bi bi-truck text-xl" />
                                </div>
                                <div className="flex flex-col">
                                    <span className="text-[11px] font-black uppercase text-slate-700 dark:text-slate-200 tracking-tight">Coleta no Endereço</span>
                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">Retirar itens na casa do cliente</span>
                                </div>
                            </div>
                            <button 
                                onClick={() => setCollectAtAddress(!collectAtAddress)}
                                className={`w-14 h-7 rounded-full p-1 transition-all duration-300 flex items-center ${collectAtAddress ? 'bg-blue-600' : 'bg-slate-200 dark:bg-slate-700'}`}
                            >
                                <div className={`w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${collectAtAddress ? 'translate-x-7' : 'translate-x-0'}`} />
                            </button>
                        </div>

                        {collectAtAddress && (
                            <div className="animate-fade-in space-y-4">
                                <Agendamento 
                                    scheduling={scheduling}
                                    onChangeScheduling={(k, v) => setScheduling(prev => ({ ...prev, [k]: v }))}
                                    errors={{}}
                                    isPickup={true}
                                />
                                
                                <div className="p-4 bg-white dark:bg-slate-800 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-2 px-1">Observações sobre a Coleta</label>
                                    <textarea 
                                        value={collectionObservation}
                                        onChange={(e) => setCollectionObservation(e.target.value)}
                                        placeholder="Ex: Tocar interfone 102, portão lateral, etc..."
                                        className="w-full bg-slate-50 dark:bg-slate-950/50 border border-slate-100 dark:border-slate-800 rounded-2xl p-4 text-sm font-medium text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-amber-500/20 outline-none transition-all placeholder:text-slate-400 min-h-[100px] resize-none uppercase"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-6 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 shrink-0">
                    <div className="flex items-center justify-between mb-6 px-2">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 mb-1">Total da Devolução</span>
                            <div className="text-2xl font-black text-amber-600">
                                R$ {totalReturnItemsValue.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="text-right">
                             <div className="flex items-center gap-2 justify-end">
                                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                                <span className="text-[10px] font-black uppercase text-slate-700 dark:text-slate-300">{Object.keys(selectedQuantities).length} Itens Selecionados</span>
                             </div>
                             <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mt-1 block">Vínculo: Pedido #{order.id}</span>
                        </div>
                    </div>

                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            disabled={submitting}
                            className="flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
                        >
                            Cancelar
                        </button>
                        <button
                            onClick={handleGenerateReturn}
                            disabled={submitting || Object.keys(selectedQuantities).length === 0}
                            className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-[10px] text-white shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${
                                submitting || Object.keys(selectedQuantities).length === 0 
                                ? 'bg-slate-300 cursor-not-allowed shadow-none' 
                                : 'bg-amber-600 hover:bg-amber-700 shadow-amber-500/20'
                            }`}
                        >
                            {submitting ? (
                                <>
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Processando...
                                </>
                            ) : (
                                <>
                                    <i className="bi bi-arrow-return-left" />
                                    Confirmar Devolução
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ReturnOrderModal;

