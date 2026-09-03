import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Order from '../../../types/order.type';
import { formatCurrency } from '@/pages/utils/formatters';

interface RecentOrdersProps {
    orders: Order[];
}

const STATUS_STYLES: Record<string, string> = {
    scheduled: 'text-blue-600 bg-blue-50 dark:bg-blue-950/40',
    fulfilled: 'text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40',
    draft: 'text-slate-400 bg-slate-50 dark:bg-slate-800',
    cancelled: 'text-rose-600 bg-rose-50 dark:bg-rose-950/40',
};

const STATUS_LABELS: Record<string, string> = {
    scheduled: 'Agendado',
    fulfilled: 'Atendido',
    draft: 'Rascunho',
    cancelled: 'Cancelado',
};

const RecentOrders: React.FC<RecentOrdersProps> = ({ orders }) => {
    const navigate = useNavigate();
    const recent = [...orders]
        .filter(o => !o.deleted && o.orderType !== 'return' && o.status !== 'cancelled')
        .sort((a, b) => {
            const da = new Date(a.date || 0).getTime();
            const db = new Date(b.date || 0).getTime();
            return db - da;
        })
        .slice(0, 5);

    return (
        <div className="bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-3xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 dark:border-slate-800">
                <h3 className="text-sm font-black text-slate-800 dark:text-slate-100">Pedidos Recentes</h3>
                <Link to="/sales-order" className="text-[10px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-wider">
                    Ver todos →
                </Link>
            </div>

            {recent.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-10 text-slate-300 dark:text-slate-600 gap-2">
                    <i className="bi bi-receipt text-3xl" />
                    <p className="text-xs font-black uppercase tracking-wider">Nenhum pedido ainda</p>
                </div>
            ) : (
                <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                    {recent.map(order => (
                        <div
                            key={order.id}
                            onClick={() => navigate('/sales-order')}
                            className="flex items-center gap-4 px-5 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40 cursor-pointer transition-colors group"
                        >
                            <div className="text-xs font-black text-slate-400 dark:text-slate-500 w-16 shrink-0">
                                #{String(order.orderIndex || '').padStart(6, '0')}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-xs font-black text-slate-800 dark:text-slate-100 truncate">
                                    {order.customerData?.fullName || 'Cliente não informado'}
                                </p>
                                <p className="text-[10px] text-slate-400 truncate">{order.seller || '—'}</p>
                            </div>
                            <div className="text-right shrink-0">
                                <p className="text-xs font-black text-slate-800 dark:text-slate-100">
                                    {formatCurrency(order.paymentsSummary?.totalOrderValue || 0)}
                                </p>
                                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full mt-0.5 inline-block ${STATUS_STYLES[order.status || 'draft'] || STATUS_STYLES.draft}`}>
                                    {STATUS_LABELS[order.status || 'draft'] || order.status}
                                </span>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default RecentOrders;
