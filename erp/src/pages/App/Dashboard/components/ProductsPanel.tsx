import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '@/pages/utils/formatters';
import { ProductsData } from '../hooks/useDashboardProducts';

type Tab = 'topByRevenue' | 'topByQuantity' | 'topByProfit' | 'stalled';

const TABS: { key: Tab; label: string }[] = [
    { key: 'topByRevenue', label: 'Faturamento' },
    { key: 'topByQuantity', label: 'Pedidos' },
    { key: 'topByProfit', label: 'Lucro' },
    { key: 'stalled', label: 'Parados' },
];

interface ProductsPanelProps {
    data: ProductsData;
}

const ProductsPanel: React.FC<ProductsPanelProps> = ({ data }) => {
    const [tab, setTab] = useState<Tab>('topByRevenue');

    const items = tab === 'stalled' ? data.stalled :
        tab === 'topByQuantity' ? data.topByQuantity :
        tab === 'topByProfit' ? data.topByProfit : data.topByRevenue;

    const formatValue = (item: any) => {
        if (tab === 'topByQuantity') return `${item.quantity} un.`;
        if (tab === 'topByProfit') return formatCurrency(item.profit);
        if (tab === 'stalled') return `${item.quantity} un. vendidas`;
        return formatCurrency(item.revenue);
    };

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Produtos</h3>
                <Link to="/sales-order" className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-wider">
                    Relatório →
                </Link>
            </div>

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-50 dark:bg-slate-800/50 rounded-xl p-1">
                {TABS.map(t => (
                    <button
                        key={t.key}
                        id={`products-tab-${t.key}`}
                        onClick={() => setTab(t.key)}
                        className={`flex-1 py-1.5 text-[9px] font-black uppercase tracking-wider rounded-lg transition-all ${
                            tab === t.key
                                ? 'bg-white dark:bg-slate-700 text-slate-800 dark:text-slate-100 shadow-sm'
                                : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                        }`}
                    >
                        {t.label}
                    </button>
                ))}
            </div>

            {/* Stalled period selector */}
            {tab === 'stalled' && (
                <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-semibold">Sem venda em:</span>
                    {([30, 60, 90] as const).map(p => (
                        <button
                            key={p}
                            id={`stalled-period-${p}`}
                            onClick={() => data.setStalledPeriod(p)}
                            className={`px-2 py-0.5 rounded-lg text-[10px] font-black transition-all ${
                                data.stalledPeriod === p
                                    ? 'bg-slate-800 dark:bg-white text-white dark:text-slate-900'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'
                            }`}
                        >
                            {p} dias
                        </button>
                    ))}
                </div>
            )}

            {/* Items list */}
            {items.length === 0 ? (
                <div className="text-center py-8">
                    <i className="bi bi-inbox text-3xl text-slate-200 dark:text-slate-700 block mb-2" />
                    <p className="text-xs text-slate-400 font-semibold">
                        {tab === 'stalled' ? 'Nenhum produto parado' : 'Sem vendas no período'}
                    </p>
                </div>
            ) : (
                <div className="space-y-2">
                    {items.map((item, idx) => (
                        <div key={item.productId + (item.variationId || '')} className="flex items-center gap-3">
                            <span className={`text-[11px] font-black w-5 text-center ${idx === 0 ? 'text-amber-400' : idx === 1 ? 'text-slate-400' : idx === 2 ? 'text-orange-400' : 'text-slate-300 dark:text-slate-600'}`}>
                                {idx + 1}
                            </span>
                            <p className="flex-1 text-xs text-slate-700 dark:text-slate-300 font-semibold truncate">{item.name}</p>
                            <span className={`text-xs font-black ${tab === 'stalled' ? 'text-slate-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                {formatValue(item)}
                            </span>
                            {tab !== 'stalled' && tab !== 'topByQuantity' && (
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${item.margin >= 30 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40' : item.margin >= 10 ? 'text-amber-600 bg-amber-50 dark:bg-amber-950/40' : 'text-rose-600 bg-rose-50 dark:bg-rose-950/40'}`}>
                                    {item.margin.toFixed(0)}%
                                </span>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default ProductsPanel;
