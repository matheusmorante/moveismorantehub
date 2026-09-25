import React, { useState, useEffect } from 'react';
import type { AuditItem } from "../modals/InventoryAuditModal";
import { supabase } from '@/pages/utils/supabaseConfig';
import type InventoryMove from '@/pages/types/inventoryMove.type';

interface InventoryReviewModalProps {
    readonly items: AuditItem[];
    readonly startDate: string; // The date when the inventory was created (snapshot)
    readonly hasStages?: boolean;
    readonly onCancel: () => void;
    readonly onConfirm: (itemsWithAdjustment: Array<AuditItem & { reconciledExpected: number, difference: number }>) => void;
}

export const InventoryReviewModal: React.FC<InventoryReviewModalProps> = ({
    items,
    startDate,
    hasStages,
    onCancel,
    onConfirm,
}) => {
    const [loading, setLoading] = useState(true);
    const [reconcileError, setReconcileError] = useState(false);
    const [reconciledItems, setReconciledItems] = useState<Array<AuditItem & { reconciledExpected: number, difference: number }>>([]);
    const [uncountedCount, setUncountedCount] = useState(0);

    useEffect(() => {
        const reconcile = async () => {
            setReconcileError(false);
            try {
                const moves: Array<{ product_id: string; variation_id: string | null; type: string; quantity: number | null; observation: string | null; status: string | null }> = [];
                const productIds = [...new Set(items.map(item => item.productId).filter(Boolean))];
                for (let offset = 0; offset < productIds.length; offset += 50) {
                    const chunk = productIds.slice(offset, offset + 50);
                    for (let from = 0; ; from += 200) {
                        const { data, error } = await supabase.from('inventory_moves')
                            .select('product_id, variation_id, type, quantity, observation, status')
                            .in('product_id', chunk).gte('date', startDate)
                            .order('date', { ascending: true }).range(from, from + 199);
                        if (error) throw error;
                        moves.push(...(data || []));
                        if (!data || data.length < 200) break;
                    }
                }
                let uncounted = 0;

                const reconciled = items.map(item => {
                    if (item.physicalCount === null) {
                        uncounted++;
                        return { ...item, reconciledExpected: item.systemStock, difference: 0 };
                    }

                    // Find moves for this variation
                    const variationMoves = moves.filter(m => String(m.product_id) === item.productId && (item.variationId ? String(m.variation_id) === item.variationId : !m.variation_id));
                    
                    // Filter out any moves that are from THIS inventory session (they shouldn't exist yet, but just in case)
                    // and filter only entry/exit moves that actually change the physical amount during the count
                    const validMoves = variationMoves.filter(m => {
                        try {
                            const meta = JSON.parse(m.observation || '{}');
                            if (m.status === 'reversed' || m.status === 'cancelled' || meta.status === 'reversed' || meta.status === 'cancelled') return false;
                            return !meta.inventoryAudit && m.type !== 'adjustment'; // we assume adjustments are absolute anchors, but let's stick to entry/exit
                        } catch {
                            return m.status !== 'reversed' && m.status !== 'cancelled' && (m.type === 'entry' || m.type === 'exit');
                        }
                    });

                    let delta = 0;
                    for (const m of validMoves) {
                        if (m.type === 'entry') delta += Number(m.quantity || 0);
                        else if (m.type === 'exit') delta -= Number(m.quantity || 0);
                    }

                    const reconciledExpected = item.systemStock + delta;
                    const difference = item.physicalCount - reconciledExpected;

                    return {
                        ...item,
                        reconciledExpected,
                        difference
                    };
                });

                setUncountedCount(uncounted);
                setReconciledItems(reconciled);
            } catch (error) {
                console.error("Error reconciling inventory:", error);
                setReconcileError(true);
            } finally {
                setLoading(false);
            }
        };

        void reconcile();
    }, [items, startDate]);

    const itemsToAdjust = reconciledItems.filter(item => item.physicalCount !== null && item.difference !== 0);

    return (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
            <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-xl w-full max-w-3xl flex flex-col max-h-full overflow-hidden animate-slide-up">
                <header className="px-6 py-4 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between bg-slate-50 dark:bg-slate-800/50">
                    <div>
                        <h2 className="text-xl font-black text-slate-800 dark:text-slate-100">Revisão do Inventário</h2>
                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 font-medium">Verifique as divergências e itens não contados antes de concluir.</p>
                    </div>
                    <button onClick={onCancel} className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors">
                        <i className="bi bi-x-lg"></i>
                    </button>
                </header>

                <main className="flex-1 overflow-y-auto p-6 bg-slate-50 dark:bg-slate-900">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center py-12">
                            <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
                            <p className="text-slate-500 font-medium">Reconciliando movimentações com o estoque inicial...</p>
                        </div>
                    ) : (
                        <div className="space-y-6">
                            {reconcileError && <p role="alert" className="rounded-xl bg-rose-50 p-4 text-sm font-bold text-rose-700">Não foi possível validar as movimentações. A contagem está salva neste navegador; tente concluir quando a conexão voltar.</p>}
                            {uncountedCount > 0 && (
                                <div className="bg-amber-50 dark:bg-amber-900/20 border-l-4 border-amber-500 p-4 rounded-r-xl">
                                    <div className="flex items-start gap-3">
                                        <i className="bi bi-exclamation-triangle text-amber-600 dark:text-amber-500 text-xl mt-0.5"></i>
                                        <div>
                                            <h4 className="font-bold text-amber-800 dark:text-amber-400">Itens não contados</h4>
                                            <p className="text-sm text-amber-700 dark:text-amber-500 mt-1">
                                                Há <strong>{uncountedCount}</strong> variações no escopo que não receberam nenhuma contagem. 
                                                Eles permanecerão com o saldo intacto no sistema.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl overflow-hidden shadow-sm">
                                <div className="px-4 py-3 bg-slate-100 dark:bg-slate-900/50 border-b border-slate-200 dark:border-slate-700 flex justify-between items-center">
                                    <h4 className="font-bold text-slate-700 dark:text-slate-300">Divergências Encontradas ({itemsToAdjust.length})</h4>
                                </div>
                                {itemsToAdjust.length === 0 ? (
                                    <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                                        <i className="bi bi-check-circle text-4xl text-emerald-500 mb-3 block"></i>
                                        <p className="font-bold">Nenhuma divergência encontrada!</p>
                                        <p className="text-sm mt-1">Todos os itens contados batem exatamente com o estoque reconciliado.</p>
                                    </div>
                                ) : (
                                    <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
                                        {itemsToAdjust.map(item => (
                                            <div key={item.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                                                <div className="flex-1 min-w-0">
                                                    <div className="font-bold text-slate-800 dark:text-slate-200 truncate">{item.name}</div>
                                                    <div className="text-xs text-slate-500 truncate">{item.supplierNames}</div>
                                                </div>
                                                <div className="flex items-center gap-6 text-sm shrink-0 bg-slate-50 dark:bg-slate-900 p-2 rounded-lg">
                                                    <div className="text-center">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase">Esperado</div>
                                                        <div className="font-bold text-slate-600 dark:text-slate-400">{item.reconciledExpected}</div>
                                                    </div>
                                                    <i className="bi bi-arrow-right text-slate-300 dark:text-slate-600"></i>
                                                    <div className="text-center">
                                                        <div className="text-[10px] font-black text-emerald-600/70 uppercase">Contado</div>
                                                        <div className="font-black text-emerald-600 dark:text-emerald-400 text-lg">{item.physicalCount}</div>
                                                    </div>
                                                    <div className="text-center w-12">
                                                        <div className="text-[10px] font-black text-slate-400 uppercase">Ajuste</div>
                                                        <div className={`font-black text-lg ${item.difference > 0 ? 'text-blue-500' : 'text-rose-500'}`}>
                                                            {item.difference > 0 ? '+' : ''}{item.difference}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </main>

                <footer className="p-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 flex items-center justify-between">
                    <button
                        onClick={onCancel}
                        disabled={loading}
                        className="px-6 py-2.5 font-bold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                        Voltar para contagem
                    </button>
                    <button
                        onClick={() => onConfirm(itemsToAdjust)}
                        disabled={loading || reconcileError || (hasStages && uncountedCount > 0)}
                        title={hasStages && uncountedCount > 0 ? "Finalize todas as etapas para confirmar o inventário." : ""}
                        className="px-6 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black rounded-lg shadow-sm transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Concluir Inventário
                        <i className="bi bi-check2-all"></i>
                    </button>
                </footer>
            </div>
        </div>
    );
};

export default InventoryReviewModal;
