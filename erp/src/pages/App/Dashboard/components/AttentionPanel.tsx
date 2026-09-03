import React from 'react';
import { Link } from 'react-router-dom';
import { StockData } from '../hooks/useDashboardStock';

interface AttentionPanelProps {
    stockData: StockData;
}

const AttentionPanel: React.FC<AttentionPanelProps> = ({ stockData }) => {
    const { zeroStockCount, lowStockCount, lowStockItems, pendingInventory, loading } = stockData;
    const hasAlerts = zeroStockCount > 0 || lowStockCount > 0 || pendingInventory !== null;

    if (loading) return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 animate-pulse">
            <div className="h-5 bg-slate-100 dark:bg-slate-800 rounded w-1/3 mb-4" />
            <div className="space-y-3">
                {[1, 2].map(i => <div key={i} className="h-14 bg-slate-100 dark:bg-slate-800 rounded-xl" />)}
            </div>
        </div>
    );

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${hasAlerts ? 'bg-rose-50 dark:bg-rose-950/40' : 'bg-emerald-50 dark:bg-emerald-950/40'}`}>
                    <i className={`bi ${hasAlerts ? 'bi-exclamation-circle-fill text-rose-500' : 'bi-check-circle-fill text-emerald-500'} text-base`} />
                </div>
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Central de Atenção</h3>
                    <p className="text-[10px] text-slate-400 font-semibold">Estoque · Inventário</p>
                </div>
            </div>

            {!hasAlerts && (
                <div className="flex flex-col items-center justify-center py-6 text-center">
                    <i className="bi bi-shield-check text-3xl text-emerald-400 dark:text-emerald-600 mb-2" />
                    <p className="text-xs font-black text-slate-400 uppercase tracking-wider">Tudo em ordem</p>
                    <p className="text-[10px] text-slate-300 dark:text-slate-600 mt-0.5">Nenhum alerta de estoque ou inventário</p>
                </div>
            )}

            {/* Estoque Zerado */}
            {zeroStockCount > 0 && (
                <div className="bg-rose-50 dark:bg-rose-950/20 border border-rose-100 dark:border-rose-900/30 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-exclamation-octagon-fill text-rose-500 text-lg" />
                            <div>
                                <p className="text-xs font-black text-rose-700 dark:text-rose-400">Sem Estoque</p>
                                <p className="text-[10px] text-rose-400 dark:text-rose-600">{zeroStockCount} produto{zeroStockCount !== 1 ? 's' : ''} zerado{zeroStockCount !== 1 ? 's' : ''}</p>
                            </div>
                        </div>
                        <Link to="/stock" className="text-[10px] font-black text-rose-500 hover:text-rose-700 uppercase tracking-wider shrink-0">
                            Ver →
                        </Link>
                    </div>
                    <div className="space-y-1.5">
                        {lowStockItems.filter(i => i.isZero).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="text-[11px] text-rose-600 dark:text-rose-400 font-medium truncate">
                                · {item.name}
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Estoque Mínimo */}
            {lowStockCount > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-2xl p-4">
                    <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-exclamation-triangle-fill text-amber-500 text-lg" />
                            <div>
                                <p className="text-xs font-black text-amber-700 dark:text-amber-400">Estoque Mínimo</p>
                                <p className="text-[10px] text-amber-400 dark:text-amber-600">{lowStockCount} produto{lowStockCount !== 1 ? 's' : ''} no limite</p>
                            </div>
                        </div>
                        <Link to="/stock" className="text-[10px] font-black text-amber-500 hover:text-amber-700 uppercase tracking-wider shrink-0">
                            Ver →
                        </Link>
                    </div>
                    <div className="space-y-1.5">
                        {lowStockItems.filter(i => !i.isZero).slice(0, 3).map((item, idx) => (
                            <div key={idx} className="flex items-center justify-between gap-2">
                                <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium truncate">· {item.name}</span>
                                <span className="text-[10px] text-amber-400 shrink-0">{item.stock}/{item.minStock}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* Inventário em andamento */}
            {pendingInventory && (
                <div className="bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/30 rounded-2xl p-4 flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                        <i className="bi bi-clipboard2-check-fill text-blue-500 text-lg" />
                        <div>
                            <p className="text-xs font-black text-blue-700 dark:text-blue-400">Inventário em Andamento</p>
                            <p className="text-[10px] text-blue-400 dark:text-blue-600">
                                #{pendingInventory.code}
                                {pendingInventory.responsibleName ? ` · ${pendingInventory.responsibleName}` : ''}
                            </p>
                        </div>
                    </div>
                    <Link to="/stock" className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-wider shrink-0">
                        Continuar →
                    </Link>
                </div>
            )}
        </div>
    );
};

export default AttentionPanel;
