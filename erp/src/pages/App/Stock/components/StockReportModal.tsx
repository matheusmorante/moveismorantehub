import React, { useState, useEffect } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';
import Order from '@/pages/types/order.type';

interface StockReportModalProps {
    isOpen: boolean;
    onClose: () => void;
}

interface StockStats {
    totalSoldItems: number;
    scheduledOrdersCount: number;
    draftOrdersCount: number;
    scheduledItemsCount: number;
    draftItemsCount: number;
}

const StockReportModal = ({ isOpen, onClose }: StockReportModalProps) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StockStats>({
        totalSoldItems: 0,
        scheduledOrdersCount: 0,
        draftOrdersCount: 0,
        scheduledItemsCount: 0,
        draftItemsCount: 0
    });

    useEffect(() => {
        if (isOpen) {
            fetchStats();
        }
    }, [isOpen]);

    const fetchStats = async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('order_data');

            if (error) throw error;

            let totalSold = 0;
            let scheduledCount = 0;
            let draftCount = 0;
            let schedItems = 0;
            let draftItems = 0;

            if (data) {
                data.forEach((row: any) => {
                    const order = row.order_data as Order;
                    if (order.deleted) return;
                    if (order.orderType === 'budget') return;

                    const itemsQty = order.items?.reduce((acc, item) => acc + (Number(item.quantity) || 0), 0) || 0;

                    if (order.status === 'fulfilled') {
                        totalSold += itemsQty;
                    } else if (order.status === 'scheduled') {
                        scheduledCount++;
                        schedItems += itemsQty;
                    } else if (order.status === 'draft' || !order.status) {
                        draftCount++;
                        draftItems += itemsQty;
                    }
                });
            }

            setStats({
                totalSoldItems: totalSold,
                scheduledOrdersCount: scheduledCount,
                draftOrdersCount: draftCount,
                scheduledItemsCount: schedItems,
                draftItemsCount: draftItems
            });
        } catch (error) {
            console.error("Erro ao gerar relatório de estoque:", error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
            
            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium-lg overflow-hidden animate-reveal">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                <i className="bi bi-bar-chart-fill text-xl"></i>
                            </div>
                            Relatório de Giro e Reservas
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-13">Inteligência de Estoque</p>
                    </div>
                    <button onClick={onClose} className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all">
                        <i className="bi bi-x-lg text-lg"></i>
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-12 h-12 border-4 border-slate-100 dark:border-slate-800 border-t-orange-500 rounded-full animate-spin"></div>
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">Processando dados...</span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Produtos Vendidos */}
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                        <i className="bi bi-check-circle-fill"></i>
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">Vendas Finalizadas</span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-emerald-900 dark:text-emerald-100 tabular-nums">
                                        {stats.totalSoldItems}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600 mb-1.5 uppercase">Unidades</span>
                                </div>
                                <p className="text-[10px] text-emerald-600/70 font-bold mt-2 uppercase tracking-wide">Total de itens que já saíram do estoque</p>
                            </div>

                            {/* Espaço reservado para métrica de giro ou algo similar se precisar no futuro */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-4 text-slate-400">
                                    <i className="bi bi-info-circle"></i>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Contexto</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Este relatório consolida os itens vendidos e aqueles que estão comprometidos em pedidos que ainda não foram finalizados.
                                </p>
                            </div>

                            {/* Pedidos Agendados */}
                            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                            <i className="bi bi-calendar-event-fill"></i>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">Agendados</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-3xl font-black text-amber-900 dark:text-amber-100 tabular-nums">
                                                {stats.scheduledOrdersCount}
                                            </span>
                                            <span className="text-[10px] font-bold text-amber-600 ml-2 uppercase">Pedidos</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-amber-800 dark:text-amber-200 tabular-nums font-mono">
                                                {stats.scheduledItemsCount}
                                            </span>
                                            <p className="text-[8px] font-black text-amber-500 uppercase">Unidades</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                            <i className="bi bi-journal-text"></i>
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400">Rascunhos</span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-3xl font-black text-indigo-900 dark:text-indigo-100 tabular-nums">
                                                {stats.draftOrdersCount}
                                            </span>
                                            <span className="text-[10px] font-bold text-indigo-600 ml-2 uppercase">Pedidos</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-indigo-800 dark:text-indigo-200 tabular-nums font-mono">
                                                {stats.draftItemsCount}
                                            </span>
                                            <p className="text-[8px] font-black text-indigo-500 uppercase">Unidades</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-8 border-t border-slate-100 dark:border-slate-800 flex justify-end bg-slate-50/50 dark:bg-slate-950/20">
                    <button 
                        onClick={onClose}
                        className="px-8 py-4 bg-slate-950 dark:bg-slate-800 hover:bg-slate-800 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-lg active:scale-95"
                    >
                        Fechar Relatório
                    </button>
                </div>
            </div>
        </div>
    );
};

export default StockReportModal;
