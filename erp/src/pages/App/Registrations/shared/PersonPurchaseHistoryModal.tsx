import React, { useState, useEffect } from "react";
import Order from "../../../types/order.type";
import Person from "../../../types/person.type";
import { getOrdersByCustomerInfo } from "../../../utils/orderHistoryService";
import { formatCurrency, formatToBRDate } from "../../../utils/formatters";
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";
import { getSettings } from '@/pages/utils/settingsService';

interface Props {
    isOpen: boolean;
    onClose: () => void;
    person: Person;
}

const PersonPurchaseHistoryModal = ({ isOpen, onClose, person }: Props) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [loading, setLoading] = useState(true);
    const settings = getSettings();

    useEffect(() => {
        if (!isOpen) return;

        setLoading(true);
        getOrdersByCustomerInfo(person.fullName, person.phone, person.email)
            .then((data) => {
                setOrders(data);
                setLoading(false);
            })
            .catch((e) => {
                console.error("Erro ao buscar histórico do cliente:", e);
                setOrders([]);
                setLoading(false);
            });
    }, [isOpen, person]);


    if (!isOpen) return null;

    const totalSpent = orders.reduce((acc, o) => acc + (o.paymentsSummary?.totalOrderValue || 0), 0);

    return (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose}>
            <div className="bg-white dark:bg-slate-900 w-full max-w-4xl max-h-[85vh] rounded-[2.5rem] shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800 flex flex-col" onClick={e => e.stopPropagation()}>
                
                {/* Header */}
                <div className="p-8 bg-blue-600 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="bg-white/20 p-2.5 rounded-2xl">
                            <i className="bi bi-clock-history text-2xl" />
                        </div>
                        <div>
                            <h2 className="text-xl font-black tracking-tight">Histórico de Pedidos</h2>
                            <p className="text-[10px] uppercase font-bold opacity-70 tracking-widest mt-0.5">{person.fullName}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full transition-colors">
                        <i className="bi bi-x-lg text-xl" />
                    </button>
                </div>

                {/* Sub-header with summary */}
                <div className="px-8 py-4 bg-slate-50 dark:bg-slate-950/50 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between shrink-0">
                    <div className="flex gap-6">
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Total de Pedidos</span>
                            <span className="text-sm font-black text-slate-700 dark:text-slate-200">{orders.length}</span>
                        </div>
                        <div className="flex flex-col">
                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Total Gasto</span>
                            <span className="text-sm font-black text-blue-600 dark:text-blue-400">{formatCurrency(totalSpent)}</span>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin" />
                            <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando histórico...</p>
                        </div>
                    ) : orders.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4 opacity-40">
                            <i className="bi bi-search text-5xl text-slate-200" />
                            <p className="text-sm font-bold text-slate-400">Nenhum pedido encontrado para este cliente.</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 gap-4">
                            {orders.map((order) => {
                                const typeColors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
                                const typeCls = getOrderTypeClasses(resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, typeColors));
                                
                                return (
                                    <div key={order.id} className="group p-5 bg-slate-50 dark:bg-slate-950/30 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] hover:border-blue-200 dark:hover:border-blue-900/30 transition-all flex items-center justify-between gap-6">
                                        <div className="flex items-center gap-5">
                                            <div className="flex flex-col items-center shrink-0 w-16 px-2 py-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-sm">
                                                <span className="text-[10px] font-black text-slate-400 uppercase leading-none mb-1">Ped #</span>
                                                <span className="text-xs font-black text-slate-700 dark:text-slate-200">{order.id?.slice(-6).toUpperCase()}</span>
                                            </div>
                                            
                                            <div className="flex flex-col gap-1">
                                                <div className="flex items-center gap-3">
                                                    <span className="text-sm font-bold text-slate-800 dark:text-slate-100">{formatToBRDate(order.date)}</span>
                                                    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${typeCls.badge}`}>
                                                        {order.orderType === 'assistance' ? 'Assistência' : (order.shipping?.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega')}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-3">
                                                    <span className="text-[10px] font-bold text-slate-400">Status: <span className="text-slate-600 dark:text-slate-400 uppercase">{order.status}</span></span>
                                                    <span className="text-[10px] font-bold text-slate-400">•</span>
                                                    <span className="text-[10px] font-bold text-slate-400 italic truncate max-w-[200px]">{order.items?.map(i => i.description).join(', ')}</span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="text-right flex flex-col gap-1 shrink-0">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Valor</span>
                                            <span className="text-lg font-black text-blue-600 dark:text-blue-400">{formatCurrency(order.paymentsSummary?.totalOrderValue || 0)}</span>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-8 py-3 bg-slate-800 text-white rounded-xl font-black text-xs uppercase tracking-widest transition-all active:scale-95 shadow-lg shadow-slate-200 dark:shadow-none"
                    >
                        Fechar
                    </button>
                </div>
            </div>
            
            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar { width: 6px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
                `
            }} />
        </div>
    );
};

export default PersonPurchaseHistoryModal;
