import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/pages/utils/supabaseConfig';

export interface StockReportModalProps {
    readonly isOpen: boolean;
    readonly onClose: () => void;
}

export interface StockStats {
    readonly totalSoldItems: number;
    readonly scheduledOrdersCount: number;
    readonly draftOrdersCount: number;
    readonly scheduledItemsCount: number;
    readonly draftItemsCount: number;
}

interface OrderDbRow {
    readonly id: string;
    readonly status: string | null;
    readonly order_type: string | null;
    readonly deleted: boolean | null;
    readonly order_data: {
        readonly status?: string;
        readonly items?: readonly {
            readonly quantity?: number;
        }[];
    } | null;
}

/**
 * Modal de inteligência de estoque: consolida vendas finalizadas, agendamentos e rascunhos.
 */
export const StockReportModal: React.FC<StockReportModalProps> = ({ isOpen, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [stats, setStats] = useState<StockStats>({
        totalSoldItems: 0,
        scheduledOrdersCount: 0,
        draftOrdersCount: 0,
        scheduledItemsCount: 0,
        draftItemsCount: 0,
    });

    const fetchStats = useCallback(async () => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('orders')
                .select('id, status, order_type, deleted, order_data')
                .eq('deleted', false)
                .neq('order_type', 'budget');

            if (error) throw error;

            let totalSold = 0;
            let scheduledCount = 0;
            let draftCount = 0;
            let schedItems = 0;
            let draftItems = 0;

            if (data) {
                const rows = data as unknown as readonly OrderDbRow[];
                rows.forEach((row) => {
                    const status = row.status ?? row.order_data?.status ?? 'draft';
                    const items = row.order_data?.items || [];
                    const itemsQty = items.reduce(
                        (acc: number, item) => acc + (Number(item.quantity) || 0),
                        0
                    );

                    if (status === 'fulfilled') {
                        totalSold += itemsQty;
                    } else if (status === 'scheduled') {
                        scheduledCount++;
                        schedItems += itemsQty;
                    } else if (status === 'draft' || !status) {
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
                draftItemsCount: draftItems,
            });
        } catch (error: unknown) {
            console.error('Erro ao gerar relatório de estoque:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        fetchStats();

        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, fetchStats, onClose]);

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-[100] flex items-center justify-center p-4"
            role="dialog"
            aria-modal="true"
            aria-label="Relatório de Giro e Reservas"
        >
            <div
                className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm animate-fade-in cursor-pointer"
                onClick={onClose}
                aria-hidden="true"
            />

            <div className="relative w-full max-w-2xl bg-white dark:bg-slate-900 rounded-[2.5rem] shadow-premium-lg overflow-hidden animate-reveal border border-slate-100 dark:border-slate-800">
                {/* Header */}
                <div className="p-8 border-b border-slate-100 dark:border-slate-800 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/20">
                    <div>
                        <h2 className="text-2xl font-black text-slate-800 dark:text-slate-100 tracking-tight flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center text-orange-600">
                                <i className="bi bi-bar-chart-fill text-xl" aria-hidden="true" />
                            </div>
                            Relatório de Giro e Reservas
                        </h2>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mt-1 ml-13">
                            Inteligência de Estoque
                        </p>
                    </div>
                    <button
                        type="button"
                        onClick={onClose}
                        className="w-10 h-10 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200 transition-all"
                        aria-label="Fechar relatório"
                    >
                        <i className="bi bi-x-lg text-lg" aria-hidden="true" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-8">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12 gap-4">
                            <div className="w-12 h-12 border-4 border-slate-100 dark:border-slate-800 border-t-orange-500 rounded-full animate-spin" />
                            <span className="text-xs font-black uppercase tracking-widest text-slate-400">
                                Processando dados...
                            </span>
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {/* Produtos Vendidos */}
                            <div className="bg-emerald-50 dark:bg-emerald-900/10 p-6 rounded-3xl border border-emerald-100 dark:border-emerald-900/30">
                                <div className="flex items-center gap-3 mb-4">
                                    <div className="w-8 h-8 rounded-lg bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600">
                                        <i className="bi bi-check-circle-fill" aria-hidden="true" />
                                    </div>
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-700 dark:text-emerald-400">
                                        Vendas Finalizadas
                                    </span>
                                </div>
                                <div className="flex items-end gap-2">
                                    <span className="text-4xl font-black text-emerald-900 dark:text-emerald-100 tabular-nums">
                                        {stats.totalSoldItems}
                                    </span>
                                    <span className="text-xs font-bold text-emerald-600 mb-1.5 uppercase">
                                        Unidades
                                    </span>
                                </div>
                                <p className="text-[10px] text-emerald-600/70 font-bold mt-2 uppercase tracking-wide">
                                    Total de itens que já saíram do estoque
                                </p>
                            </div>

                            {/* Contexto do Relatório */}
                            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-3xl border border-slate-100 dark:border-slate-800">
                                <div className="flex items-center gap-3 mb-4 text-slate-400">
                                    <i className="bi bi-info-circle" aria-hidden="true" />
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em]">Contexto</span>
                                </div>
                                <p className="text-xs text-slate-500 font-medium leading-relaxed">
                                    Este relatório consolida os itens vendidos e aqueles que estão comprometidos em pedidos que ainda não foram finalizados.
                                </p>
                            </div>

                            {/* Pedidos Agendados e Rascunhos */}
                            <div className="col-span-1 md:col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 mt-2">
                                <div className="bg-amber-50 dark:bg-amber-900/10 p-6 rounded-3xl border border-amber-100 dark:border-amber-900/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center text-amber-600">
                                            <i className="bi bi-calendar-event-fill" aria-hidden="true" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-700 dark:text-amber-400">
                                            Agendados
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-3xl font-black text-amber-900 dark:text-amber-100 tabular-nums">
                                                {stats.scheduledOrdersCount}
                                            </span>
                                            <span className="text-[10px] font-bold text-amber-600 ml-2 uppercase">
                                                Pedidos
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-amber-800 dark:text-amber-200 tabular-nums font-mono">
                                                {stats.scheduledItemsCount}
                                            </span>
                                            <p className="text-[8px] font-black text-amber-500 uppercase">
                                                Unidades
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="bg-indigo-50 dark:bg-indigo-900/10 p-6 rounded-3xl border border-indigo-100 dark:border-indigo-900/30">
                                    <div className="flex items-center gap-3 mb-4">
                                        <div className="w-8 h-8 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600">
                                            <i className="bi bi-journal-text" aria-hidden="true" />
                                        </div>
                                        <span className="text-[10px] font-black uppercase tracking-[0.2em] text-indigo-700 dark:text-indigo-400">
                                            Rascunhos
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-end">
                                        <div>
                                            <span className="text-3xl font-black text-indigo-900 dark:text-indigo-100 tabular-nums">
                                                {stats.draftOrdersCount}
                                            </span>
                                            <span className="text-[10px] font-bold text-indigo-600 ml-2 uppercase">
                                                Pedidos
                                            </span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xl font-bold text-indigo-800 dark:text-indigo-200 tabular-nums font-mono">
                                                {stats.draftItemsCount}
                                            </span>
                                            <p className="text-[8px] font-black text-indigo-500 uppercase">
                                                Unidades
                                            </p>
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
                        type="button"
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
