import React from 'react';
import { useNavigate } from 'react-router-dom';
import { OperationalData } from '../hooks/useDashboardOperational';

interface CardProps {
    id: string;
    label: string;
    count: number;
    icon: string;
    color: string;
    iconBg: string;
    href: string;
    urgency?: boolean;
}

const OpCard: React.FC<CardProps> = ({ id, label, count, icon, color, iconBg, href, urgency }) => {
    const navigate = useNavigate();
    return (
        <button
            id={id}
            onClick={() => navigate(href)}
            className={`bg-white dark:bg-slate-900 border ${urgency && count > 0 ? 'border-rose-200 dark:border-rose-900/40' : 'border-slate-100 dark:border-slate-800'} rounded-2xl p-4 text-left hover:shadow-md active:scale-95 transition-all duration-200 group flex flex-col gap-3`}
        >
            <div className="flex items-center justify-between">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg} group-hover:scale-110 transition-transform duration-200`}>
                    <i className={`bi ${icon} ${color} text-base`} />
                </div>
                {urgency && count > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                )}
            </div>
            <div>
                <p className={`text-3xl font-black tracking-tighter ${urgency && count > 0 ? 'text-rose-600 dark:text-rose-400' : 'text-slate-800 dark:text-slate-100'}`}>
                    {count}
                </p>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider mt-0.5">{label}</p>
            </div>
        </button>
    );
};

interface OperationPanelProps {
    data: OperationalData;
}

const OperationPanel: React.FC<OperationPanelProps> = ({ data }) => (
    <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
            <h3 className="text-lg font-black text-slate-800 dark:text-slate-100 tracking-tight">Central Operacional</h3>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Situação geral</span>
        </div>
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-3">
            <OpCard id="op-open" label="Em Aberto" count={data.openOrders.length} icon="bi-bag-check-fill"
                color="text-blue-600" iconBg="bg-blue-50 dark:bg-blue-950/40" href="/sales-order" />
            <OpCard id="op-scheduled" label="Agendados" count={data.scheduledOrders.length} icon="bi-calendar-event-fill"
                color="text-indigo-600" iconBg="bg-indigo-50 dark:bg-indigo-950/40" href="/sales-order?status=scheduled" />
            <OpCard id="op-today" label="Entregas Hoje" count={data.deliveriesToday.length} icon="bi-truck-front-fill"
                color="text-teal-600" iconBg="bg-teal-50 dark:bg-teal-950/40" href="/delivery-schedule" />
            <OpCard id="op-late" label="Atrasadas" count={data.lateDeliveries.length} icon="bi-alarm-fill"
                color="text-rose-600" iconBg="bg-rose-50 dark:bg-rose-950/40" href="/delivery-schedule"
                urgency />
            <OpCard id="op-assembly" label="Montagens" count={data.pendingAssemblies.length} icon="bi-tools"
                color="text-amber-600" iconBg="bg-amber-50 dark:bg-amber-950/40" href="/logistics/assembly-list" />
            <OpCard id="op-receipts" label="Recebimentos" count={data.pendingReceiptsCount} icon="bi-box-arrow-in-down"
                color="text-emerald-600" iconBg="bg-emerald-50 dark:bg-emerald-950/40" href="/stock/receipts" />
        </div>
    </div>
);

export default OperationPanel;
