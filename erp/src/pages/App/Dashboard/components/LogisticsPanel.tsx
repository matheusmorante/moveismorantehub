import React from 'react';
import Order from '../../../types/order.type';

interface LogisticsPanelProps {
    filteredOrders: Order[];
    allActiveOrders: Order[];
}

const MetricLine: React.FC<{ label: string; value: string | number; icon: string; color: string }> = ({ label, value, icon, color }) => (
    <div className="flex items-center justify-between py-3 border-b border-slate-50 dark:border-slate-800/50 last:border-0">
        <div className="flex items-center gap-2.5">
            <i className={`bi ${icon} text-sm ${color}`} />
            <span className="text-xs text-slate-600 dark:text-slate-400 font-semibold">{label}</span>
        </div>
        <span className="text-sm font-black text-slate-800 dark:text-slate-100">{value}</span>
    </div>
);

const LogisticsPanel: React.FC<LogisticsPanelProps> = ({ filteredOrders, allActiveOrders }) => {
    const saleOrders = filteredOrders.filter(o =>
        ['scheduled', 'fulfilled'].includes(o.status || '') && o.orderType !== 'return'
    );

    const totalKm = saleOrders.reduce((acc, o) => {
        const dist = o.shipping?.distance;
        const v = typeof dist === 'number' ? dist : parseFloat(String(dist || '0').replace(',', '.')) || 0;
        return acc + v;
    }, 0);

    const fulfilled = filteredOrders.filter(o => o.status === 'fulfilled' && o.orderType !== 'return').length;
    const pending = allActiveOrders.filter(o =>
        o.status === 'scheduled' && o.orderType !== 'return' && !!o.shipping?.scheduling?.date
    ).length;

    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const late = allActiveOrders.filter(o => {
        if (o.status !== 'scheduled' || !o.shipping?.scheduling?.date) return false;
        try {
            const d = new Date(o.shipping.scheduling.date + 'T00:00:00');
            return d < today;
        } catch { return false; }
    }).length;

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl p-5 space-y-1">
            <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-teal-50 dark:bg-teal-950/40 flex items-center justify-center">
                    <i className="bi bi-truck-front-fill text-teal-600 text-sm" />
                </div>
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Logística</h3>
            </div>
            <MetricLine label="Entregas realizadas" value={fulfilled} icon="bi-check-circle-fill" color="text-emerald-500" />
            <MetricLine label="Pendentes de entrega" value={pending} icon="bi-clock-fill" color="text-blue-500" />
            <MetricLine label="Atrasadas" value={late} icon="bi-alarm-fill" color="text-rose-500" />
            <MetricLine label="KM percorridos" value={`${totalKm.toFixed(1)} km`} icon="bi-pin-map-fill" color="text-slate-400" />
        </div>
    );
};

export default LogisticsPanel;
