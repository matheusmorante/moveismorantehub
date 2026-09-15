import React, { useState, useEffect } from "react";
import { supabase } from '@/pages/utils/supabaseConfig';
import { formatDateTime } from "../../utils/formatters";

interface StatusHistoryEntry {
    id: string;
    old_status: string;
    new_status: string;
    changed_by: string;
    created_at: string;
}

interface Props {
    orderId: string;
}

const OrderStatusTimeline = ({ orderId }: Props) => {
    const [history, setHistory] = useState<StatusHistoryEntry[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchHistory = async () => {
            setLoading(true);
            try {
                const { data, error } = await supabase
                    .from('order_status_history')
                    .select('*')
                    .eq('order_id', orderId)
                    .order('created_at', { ascending: true });

                if (error) throw error;
                setHistory(data || []);
            } catch (err) {
                console.error("Erro ao buscar histórico de status:", err);
            } finally {
                setLoading(false);
            }
        };

        if (orderId) fetchHistory();
    }, [orderId]);

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { label: string, color: string, icon: string }> = {
            'draft': { label: 'Rascunho', color: 'slate', icon: 'bi-pencil' },
            'scheduled': { label: 'Agendado', color: 'blue', icon: 'bi-calendar-event' },
            'confirmed': { label: 'Confirmado', color: 'emerald', icon: 'bi-check-circle' },
            'shipped': { label: 'Enviado', color: 'indigo', icon: 'bi-truck' },
            'delivered': { label: 'Entregue', color: 'emerald', icon: 'bi-house-check' },
            'cancelled': { label: 'Cancelado', color: 'red', icon: 'bi-x-circle' },
            'returned': { label: 'Devolvido', color: 'orange', icon: 'bi-arrow-return-left' }
        };
        return configs[status] || { label: status, color: 'slate', icon: 'bi-app' };
    };

    if (loading) return (
        <div className="flex justify-center p-8">
            <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
    );

    if (history.length === 0) return (
        <div className="p-8 text-center opacity-40">
            <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Nenhuma transição registrada</p>
        </div>
    );

    return (
        <div className="p-6 relative">
            {/* Vertical Line */}
            <div className="absolute left-[39px] top-10 bottom-10 w-0.5 bg-slate-100 dark:bg-slate-800" />

            <div className="flex flex-col gap-8">
                {history.map((entry, idx) => {
                    const config = getStatusConfig(entry.new_status);
                    return (
                        <div key={entry.id} className="flex gap-6 relative z-10 group animate-slide-right" style={{ animationDelay: `${idx * 0.1}s` }}>
                            {/* Icon Circle */}
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg transition-transform group-hover:scale-110
                                ${config.color === 'blue' ? 'bg-blue-600 shadow-blue-200 dark:shadow-none' : 
                                  config.color === 'emerald' ? 'bg-emerald-600 shadow-emerald-200 dark:shadow-none' :
                                  config.color === 'red' ? 'bg-red-600 shadow-red-200 dark:shadow-none' :
                                  'bg-slate-600 shadow-slate-200 dark:shadow-none'}
                            `}>
                                <i className={`bi ${config.icon} text-white text-xl`} />
                            </div>

                            <div className="flex flex-col">
                                <div className="flex items-center gap-3">
                                    <span className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-100">
                                        {config.label}
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                        {formatDateTime(entry.created_at)}
                                    </span>
                                </div>
                                <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase tracking-tight">
                                    Alterado por: <span className="text-blue-600 dark:text-blue-400 font-black">{entry.changed_by}</span>
                                    {entry.old_status && (
                                        <> • De: <span className="opacity-60">{getStatusConfig(entry.old_status).label}</span></>
                                    )}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @keyframes slide-right {
                    from { opacity: 0; transform: translateX(-20px); }
                    to { opacity: 1; transform: translateX(0); }
                }
                .animate-slide-right { animation: slide-right 0.4s cubic-bezier(0.16, 1, 0.3, 1) forwards; }
            `}} />
        </div>
    );
};

export default OrderStatusTimeline;
