import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/pages/utils/supabaseConfig';
import { getSettings } from '@/pages/utils/settingsService';
import { getShowcaseAssemblies } from '@/pages/utils/showcaseAssemblyService';
import { formatToBRDate } from '@/pages/utils/formatters';
import Order from '@/pages/types/order.type';

const AssemblyPrintPage = () => {
    const [searchParams] = useSearchParams();
    const [loading, setLoading] = useState(true);
    const [items, setItems] = useState<any[]>([]);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            const settings = getSettings();
            
            // 1. Fetch Orders
            const { data: dbOrders } = await supabase
                .from('orders')
                .select('id, order_data')
                .order('id', { ascending: false });

            const allOrders = (dbOrders as any[] || []).map(row => ({
                ...(row.order_data || {}),
                id: String(row.id)
            })) as Order[];

            const orderTasks = allOrders.filter(order => {
                if (order.deleted || order.status === 'cancelled') return false;
                const isPickup = order.shipping?.deliveryMethod === 'pickup';
                const modalityOptions = isPickup ? (settings.pickupHandlingOptions || []) : (settings.deliveryHandlingOptions || []);
                
                return order.items?.some(i => {
                    const opt = modalityOptions.find(o => o.label === (i.handlingType || "").trim());
                    return opt?.includeInAssemblySchedule;
                });
            }).map(order => ({
                id: order.id,
                type: 'PEDIDO',
                title: order.customerData.fullName,
                date: order.shipping?.scheduling?.date || "",
                endDate: order.shipping?.scheduling?.dateType === 'range' ? order.shipping?.scheduling?.endDate : null,
                time: (() => {
                    const s = order.shipping?.scheduling;
                    if (!s) return "";
                    if (s.type === 'range' && s.startTime && s.endTime) return `${s.startTime} às ${s.endTime}`;
                    return s.startTime || s.time || "";
                })(),
                items: order.items.filter(i => {
                    const isPickup = order.shipping?.deliveryMethod === 'pickup';
                    const modalityOptions = isPickup ? (settings.pickupHandlingOptions || []) : (settings.deliveryHandlingOptions || []);
                    const opt = modalityOptions.find(o => o.label === (i.handlingType || "").trim());
                    return opt?.includeInAssemblySchedule;
                }).map(i => `${i.quantity} un ${i.description}`).join(', '),
                observation: order.shipping?.deliveryAddress?.observation || order.observation || "",
                status: order.status === 'fulfilled' ? 'FINALIZADO' : 'PENDENTE'
            }));

            // 2. Fetch Showcase
            const showcaseData = await getShowcaseAssemblies();
            const showcaseTasks = showcaseData.map(as => ({
                id: as.id || "",
                type: 'MOSTRUÁRIO',
                title: as.description,
                date: as.date,
                items: `${as.quantity} un ${as.description}`,
                observation: as.observation || "",
                status: as.status === 'completed' ? 'FINALIZADO' : 'PENDENTE'
            }));

            // Unified & Initial Sort (for grouping)
            const yesterday = new Date();
            yesterday.setDate(yesterday.getDate() - 1);
            yesterday.setHours(0, 0, 0, 0);
            const yesterdayStr = yesterday.toISOString().split('T')[0];

            const unified = [...orderTasks, ...showcaseTasks]
                .filter(item => !item.date || item.date >= yesterdayStr)
                .sort((a, b) => {
                    if (a.date !== b.date) return a.date.localeCompare(b.date);
                    return (a.id || "").localeCompare(b.id || "");
                });

            setItems(unified);
            
            // Trigger print after a short delay
            setTimeout(() => {
                window.print();
            }, 1000);

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="p-10 text-center font-bold">Gerando Lista de Montagem...</div>;

    // Group items by date
    const groupedItems: Record<string, any[]> = items.reduce((acc, item) => {
        const dateKey = item.date || 'sem-prazu';
        if (!acc[dateKey]) acc[dateKey] = [];
        acc[dateKey].push(item);
        return acc;
    }, {});

    const sortedDates = Object.keys(groupedItems).sort((a, b) => a.localeCompare(b));

    return (
        <div className="p-8 bg-white text-slate-900 min-h-screen font-sans printable-area">
            {/* Minimal Header */}
            <div className="flex justify-between items-end border-b-2 border-slate-900 pb-4 mb-8">
                <div>
                    <h1 className="text-xl font-black uppercase tracking-tight">Móveis Morante</h1>
                    <p className="text-[9px] font-black uppercase tracking-widest text-slate-400">Lista de Montagem Consolidada</p>
                </div>
                <div className="text-right">
                    <p className="text-[10px] font-bold">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
            </div>

            {/* Grouped List */}
            <div className="space-y-10">
                {sortedDates.map((dateKey) => (
                    <div key={dateKey} className="space-y-4">
                        <div className="bg-slate-900 text-white px-4 py-2 rounded-lg flex justify-between items-center">
                            <h2 className="text-sm font-black uppercase tracking-widest">
                                Prazo: {dateKey === 'sem-prazu' ? 'SEM DATA DEFINIDA' : (() => {
                                    const firstItem = groupedItems[dateKey][0];
                                    if (firstItem?.endDate) {
                                        return `De ${formatToBRDate(dateKey)} até ${formatToBRDate(firstItem.endDate)}`;
                                    }
                                    return formatToBRDate(dateKey);
                                })()}
                            </h2>
                            <span className="text-[10px] font-bold opacity-70">{groupedItems[dateKey].length} montagem(ns)</span>
                        </div>

                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-200">
                                    <th className="py-2 text-[9px] font-black uppercase tracking-widest w-24">Tipo</th>
                                    <th className="py-2 text-[9px] font-black uppercase tracking-widest">Responsável / Descrição</th>
                                    <th className="py-2 text-[9px] font-black uppercase tracking-widest">Itens Detalhados</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {groupedItems[dateKey].map((item, idx) => (
                                    <tr key={idx} className="align-top">
                                        <td className="py-4">
                                            <span className={`text-[8px] font-black px-1.5 py-0.5 rounded border ${
                                                item.type === 'PEDIDO' ? 'text-blue-600 border-blue-200 bg-blue-50' : 'text-amber-600 border-amber-200 bg-amber-50'
                                            }`}>
                                                {item.type}
                                            </span>
                                        </td>
                                        <td className="py-4 pr-6">
                                            <div className="flex flex-col">
                                                <span className="text-xs font-bold tracking-tight uppercase">{item.title}</span>
                                                <div className="flex items-center gap-2 mt-0.5">
                                                    {item.type === 'PEDIDO' && <span className="text-[8px] font-black text-slate-400 uppercase tracking-tighter">#{item.id.slice(-8).toUpperCase()}</span>}
                                                    {item.time && <span className="text-[8px] font-black text-blue-600 bg-blue-50 px-1 rounded border border-blue-100 uppercase tracking-tighter italic">Janela: {item.time}</span>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="py-4 pr-6">
                                            <p className="text-[11px] font-medium text-slate-600 leading-tight">{item.items}</p>
                                            {item.observation && (
                                                <p className="text-[9px] text-slate-500 mt-1.5 italic bg-slate-50 p-1.5 rounded border border-slate-100">
                                                    OBS: {item.observation}
                                                </p>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))}
            </div>

            <style dangerouslySetInnerHTML={{ __html: `
                @media print {
                    @page { margin: 1cm; }
                    body { -webkit-print-color-adjust: exact; }
                    .no-print { display: none !important; }
                    .printable-area { padding: 0 !important; }
                }
            ` }} />
        </div>
    );
};

export default AssemblyPrintPage;
