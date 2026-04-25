import React, { useState } from "react";
import Order, { Item } from "../../../types/order.type";
import { saveOrder, updateOrder } from "../../../utils/orderHistoryService";
import { dateNow, formatDate } from "../../../utils/formatters";
import { toast } from "react-toastify";

interface ReturnOrderModalProps {
    order: Order;
    onClose: () => void;
    onSuccess: (newOrderId: string) => void;
}

const ReturnOrderModal: React.FC<ReturnOrderModalProps> = ({ order, onClose, onSuccess }) => {
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());
    const [submitting, setSubmitting] = useState(false);

    const toggleItem = (itemId: string) => {
        const next = new Set(selectedItems);
        if (next.has(itemId)) next.delete(itemId);
        else next.add(itemId);
        setSelectedItems(next);
    };

    const handleGenerateReturn = async () => {
        if (selectedItems.size === 0) {
            toast.warning("Selecione pelo menos um item para devolver.");
            return;
        }

        setSubmitting(true);
        try {
            const itemsToReturn = order.items.filter(i => selectedItems.has(i.productId || i.description));
            const remainingItems = order.items.filter(i => !selectedItems.has(i.productId || i.description));

            // 1. Create Return Order
            const returnOrder: Order = {
                ...order,
                id: undefined,
                orderType: 'return',
                status: 'finalized',
                date: dateNow(),
                items: itemsToReturn,
                linkedOrderId: order.id,
                observation: `Devolução vinculada ao pedido #${order.id}. ${order.observation || ''}`,
                itemsSummary: {
                    totalItems: itemsToReturn.length,
                    totalQuantity: itemsToReturn.reduce((acc, curr) => acc + curr.quantity, 0),
                    totalValue: itemsToReturn.reduce((acc, curr) => acc + (curr.totalValue || 0), 0)
                },
                payments: [], // Usually returns don't have new payments, or have a reversal
                paymentsSummary: {
                    totalOrderValue: itemsToReturn.reduce((acc, curr) => acc + (curr.totalValue || 0), 0),
                    totalPaid: 0,
                    remainingValue: itemsToReturn.reduce((acc, curr) => acc + (curr.totalValue || 0), 0)
                }
            };

            const newId = await saveOrder(returnOrder);

            // 2. Update Original Order
            const originalUpdate: Partial<Order> = {
                items: remainingItems,
                itemsSummary: {
                    totalItems: remainingItems.length,
                    totalQuantity: remainingItems.reduce((acc, curr) => acc + curr.quantity, 0),
                    totalValue: remainingItems.reduce((acc, curr) => acc + (curr.totalValue || 0), 0)
                },
                paymentsSummary: {
                    ...order.paymentsSummary,
                    totalOrderValue: remainingItems.reduce((acc, curr) => acc + (curr.totalValue || 0), 0),
                }
            };

            if (remainingItems.length === 0) {
                originalUpdate.status = 'cancelled';
                originalUpdate.observation = `${order.observation || ''}\n[CANCELADO POR DEVOLUÇÃO TOTAL]`;
            } else {
                originalUpdate.observation = `${order.observation || ''}\n[ITENS DEVOLVIDOS: ${itemsToReturn.map(i => i.description).join(', ')}]`;
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

    return (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 w-full max-w-2xl rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                <div className="p-6 border-b border-slate-50 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600 dark:text-amber-400">
                            <i className="bi bi-arrow-return-left text-xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 dark:text-white">Gerar Devolução</h2>
                            <p className="text-[10px] font-black uppercase text-slate-400 tracking-widest mt-0.5">Pedido #{order.id} • {order.customerData?.fullName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors flex items-center justify-center">
                        <i className="bi bi-x-lg text-lg" />
                    </button>
                </div>

                <div className="p-6">
                    <div className="mb-6">
                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 block mb-3">Selecione os itens que serão devolvidos:</span>
                        <div className="space-y-2 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                            {order.items.map((item, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => toggleItem(item.productId || item.description)}
                                    className={`w-full flex items-center justify-between p-4 rounded-2xl border transition-all text-left group ${
                                        selectedItems.has(item.productId || item.description)
                                        ? 'bg-amber-50 border-amber-200 dark:bg-amber-900/10 dark:border-amber-900/40 shadow-sm'
                                        : 'bg-white dark:bg-slate-800 border-slate-100 dark:border-slate-800 hover:border-amber-100 dark:hover:border-amber-900/30'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${
                                            selectedItems.has(item.productId || item.description)
                                            ? 'bg-amber-500 border-amber-500 text-white'
                                            : 'border-slate-200 dark:border-slate-700'
                                        }`}>
                                            {selectedItems.has(item.productId || item.description) && <i className="bi bi-check-lg text-xs" />}
                                        </div>
                                        <div>
                                            <div className={`text-xs font-black uppercase transition-colors ${selectedItems.has(item.productId || item.description) ? 'text-amber-700 dark:text-amber-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {item.description}
                                            </div>
                                            <div className="text-[10px] font-bold text-slate-400 mt-0.5">
                                                {item.quantity} {item.unit || 'un'} • R$ {item.unitPrice?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className={`text-xs font-black ${selectedItems.has(item.productId || item.description) ? 'text-amber-600' : 'text-slate-900 dark:text-white'}`}>
                                            R$ {item.totalValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </div>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-slate-950/50 rounded-2xl p-4 border border-slate-100 dark:border-slate-800 flex justify-between items-center">
                        <div>
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Total da Devolução</span>
                            <div className="text-xl font-black text-amber-600">
                                R$ {order.items
                                    .filter(i => selectedItems.has(i.productId || i.description))
                                    .reduce((acc, curr) => acc + (curr.totalValue || 0), 0)
                                    .toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 block mb-1">Itens Selecionados</span>
                            <div className="text-lg font-black text-slate-700 dark:text-slate-300">{selectedItems.size} de {order.items.length}</div>
                        </div>
                    </div>
                </div>

                <div className="p-6 bg-slate-50/50 dark:bg-slate-900/50 border-t border-slate-50 dark:border-slate-800 flex gap-3">
                    <button
                        onClick={onClose}
                        disabled={submitting}
                        className="flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all border border-slate-200 dark:border-slate-800"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleGenerateReturn}
                        disabled={submitting || selectedItems.size === 0}
                        className={`flex-1 py-4 px-6 rounded-2xl font-black uppercase tracking-widest text-xs text-white shadow-lg shadow-amber-200 dark:shadow-none transition-all active:scale-95 flex items-center justify-center gap-3 ${
                            submitting || selectedItems.size === 0 ? 'bg-slate-300 cursor-not-allowed shadow-none' : 'bg-amber-600 hover:bg-amber-700'
                        }`}
                    >
                        {submitting ? (
                            <>
                                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                Processando...
                            </>
                        ) : (
                            <>
                                <i className="bi bi-arrow-return-left text-sm" />
                                Confirmar Devolução
                            </>
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ReturnOrderModal;
