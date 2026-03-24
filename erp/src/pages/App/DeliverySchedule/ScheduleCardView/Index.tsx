import React from "react";
import Order from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { stringifyFullAddressWithObservation, formatCurrency } from "../../../utils/formatters";
import { getOrderTypeClasses, resolveOrderColor, getPrimaryHandlingInfo } from "../../../utils/orderTypeColorUtils";
import { calcItemTotalValue } from "../../../utils/calculations";
import { updateOrder } from "../../../utils/orderHistoryService";
import { toast } from "react-toastify";

interface Props {
    schedule: Record<string, Order[]>;
    onOrderClick: (order: Order) => void;
}

/**
 * Renders an individual delivery order as a card
 */
const DeliveryOrderCard = ({ order, index, onOrderClick }: { order: Order; index: number; onOrderClick: (order: Order) => void }) => {
    const settings = getSettings();
    const [showStatusPicker, setShowStatusPicker] = React.useState(false);

    const statuses = settings.orderStatuses?.map(s => ({
        ...s,
        description: s.id === 'draft' ? 'Pedido em elaboração, sem agendamento definitivo.' :
                    s.id === 'scheduled' ? 'Pedido confirmado e pronto para logística.' :
                    s.id === 'fulfilled' ? 'Entrega concluída ou serviço prestado com sucesso.' :
                    s.id === 'cancelled' ? 'Pedido cancelado ou com entrega abortada.' : ''
    })) || [
        { id: 'draft', label: 'Rascunho', color: 'slate', description: 'Pedido em elaboração, sem agendamento definitivo.' },
        { id: 'scheduled', label: 'Agendado', color: 'amber', description: 'Pedido confirmado e pronto para logística.' },
        { id: 'fulfilled', label: 'Atendido', color: 'emerald', description: 'Entrega concluída ou serviço prestado com sucesso.' },
        { id: 'cancelled', label: 'Cancelado', color: 'rose', description: 'Pedido cancelado ou com entrega abortada.' },
    ];

    const getStatusIcon = (id: string) => {
        switch (id) {
            case 'draft': return 'bi-file-earmark-text-fill';
            case 'scheduled': return 'bi-calendar-check-fill';
            case 'fulfilled': return 'bi-check-circle-fill';
            case 'cancelled': return 'bi-x-circle-fill';
            default: return 'bi-circle-fill';
        }
    };

    const currentStatus = statuses.find(s => s.id === (order.status || 'draft')) || statuses[0];

    const isAssistance = order.orderType === 'assistance';
    const isShowroom = order.orderType === 'showroom' as any;
    const isPickup = order.shipping?.deliveryMethod === 'pickup';

    // Assistance orders store time at top level; regular orders use shipping.scheduling
    const scheduling = order.shipping?.scheduling;
    let displayTime = "Horário não definido";
    if (isAssistance) {
        const t = (order as any).scheduledTime;
        displayTime = t || "Horário não definido";
    } else if (scheduling) {
        const isRangeVisible = scheduling.type === "range";
        displayTime = isRangeVisible
            ? `${scheduling.startTime} - ${scheduling.endTime}`
            : (scheduling.startTime || scheduling.time || "Horário não definido");
    }
    const isRange = scheduling?.type === "range" && !isAssistance;

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const cls = getOrderTypeClasses(colorKey);

    const { hasAssembly, label: primaryHandlingLabel } = getPrimaryHandlingInfo(order, settings);

    const typeLabel = isShowroom 
        ? "Montagem Mostruário"
        : (isAssistance
            ? settings.orderTypeLabels.assistance
            : (isPickup ? settings.orderTypeLabels.pickup : settings.orderTypeLabels.delivery));

    return (
        <div
            onClick={() => onOrderClick(order)}
            className={`group border rounded-[2rem] shadow-sm overflow-hidden transition-all duration-300 cursor-pointer ${cls.cardBg} ${cls.cardBorder} hover:-translate-y-1 hover:shadow-premium-lg ${order.status === 'cancelled' ? 'opacity-50 grayscale hover:grayscale-0' : ''}`}
        >
            {/* Card Header: Time */}
            <div className={`px-5 py-4 border-b dark:border-slate-800 flex justify-between items-center transition-colors ${cls.headerBg}`}>
                <div className="flex items-center gap-4">
                    <div className="flex flex-col">
                        <span className="font-black text-sm tracking-tight flex items-center text-slate-800 dark:text-slate-200">
                            <i className={`bi bi-clock-fill mr-2 ${cls.timeText}`} />
                            {displayTime}
                        </span>
                    </div>
                </div>
                {isRange && (
                    <span className={`text-[8px] uppercase font-black px-3 py-1 rounded-full tracking-widest shadow-sm ${cls.dotBg}`}>
                        Período
                    </span>
                )}
            </div>

            <div className="flex items-center justify-end px-5 pt-4">
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all active:scale-95 ${order.status === 'fulfilled' 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                    >
                        <i className={`bi ${getStatusIcon(order.status || 'draft')} ${order.status === 'fulfilled' ? 'text-white' : `text-${currentStatus.color}-500`} text-[10px]`} />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            {currentStatus.label}
                        </span>
                        <i className="bi bi-chevron-down text-[8px] opacity-50" />
                    </button>

                    {showStatusPicker && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusPicker(false)} />
                            <div className="absolute top-full right-0 mt-3 w-64 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[1.5rem] shadow-2xl z-[100] p-3 flex flex-col gap-1.5 animate-slide-up">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">Alterar Status do Pedido</p>
                                {statuses.map((s) => (
                                    <button
                                        key={s.id}
                                        onClick={async (e) => {
                                            e.stopPropagation();
                                            try {
                                                await updateOrder(order.id!, { status: s.id as any }, order);
                                                toast.success(`Pedido #${order.id?.slice(-4)} alterado para ${s.label}`);
                                            } catch (err: any) {
                                                toast.error(`Falha: ${err.message}`);
                                            }
                                            setShowStatusPicker(false);
                                        }}
                                        className={`flex items-start gap-3 w-full p-3 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${order.status === s.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <i className={`bi ${getStatusIcon(s.id)} text-${s.color}-500 text-base mt-0.5`} />
                                        <div className="flex flex-col text-left">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${order.status === s.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {s.label}
                                            </span>
                                            {s.description && (
                                                <span className="text-[9px] text-slate-400 dark:text-slate-500 font-medium leading-tight">
                                                    {s.description}
                                                </span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Card Content: Customer & Details */}
            <div className="p-5 text-sm flex flex-col gap-4 text-left">
                <div>
                    <span className="text-[9px] uppercase font-black text-slate-300 dark:text-slate-600 tracking-[0.2em] block mb-1">
                        Cliente
                    </span>
                    <div className="font-black text-slate-900 dark:text-slate-100 text-xl leading-tight uppercase tracking-tighter transition-colors">
                        {order.customerData?.fullName || "Consumidor"}
                    </div>
                </div>

                {/* Assistance: show description */}
                {isAssistance && (order as any).assistanceDescription && (
                    <div className="flex items-start gap-3 bg-amber-50/60 dark:bg-amber-900/10 p-3 rounded-xl border border-amber-100 dark:border-amber-900/20">
                        <i className="bi bi-tools text-amber-500 mt-0.5 shrink-0" />
                        <span className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-snug">
                            {(order as any).assistanceDescription}
                        </span>
                    </div>
                )}

                <div className="flex flex-col gap-2">
                    {!isPickup && (
                        <div className="flex items-start gap-4 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group/addr hover:bg-white dark:hover:bg-slate-950 transition-all duration-300">
                            <i className="bi bi-geo-alt-fill text-red-500 mt-0.5 group-hover/addr:scale-110 transition-transform" />
                            <span className="leading-snug text-xs font-bold text-slate-500 dark:text-slate-400">
                                {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                            </span>
                        </div>
                    )}
                    
                    {(order.shipping?.distance || order.shipping?.durationMinutes) && (
                        <div className="flex items-center gap-6 px-4 py-2.5 bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl border border-blue-100/40 dark:border-blue-900/20">
                            {order.shipping?.distance !== undefined && (
                                <div className="flex items-center gap-2 min-w-fit">
                                    <i className="bi bi-map-fill text-blue-500 text-xs" />
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">
                                        {order.shipping.distance.toFixed(1)} KM
                                    </span>
                                </div>
                            )}
                            {order.shipping?.durationMinutes !== undefined && (
                                <div className="flex items-center gap-2 min-w-fit border-l border-blue-100 dark:border-blue-900 pl-6 ml-auto">
                                    <i className="bi bi-hourglass-fill text-blue-500 text-xs" />
                                    <span className="text-[10px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest leading-none">
                                        ~ {order.shipping.durationMinutes} MIN
                                    </span>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {((order.items && order.items.length > 0) || (order.assistanceItems && order.assistanceItems.length > 0)) && (
                <div className="border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/60 border-b border-slate-100 dark:border-slate-800">
                        <i className="bi bi-box-seam text-[10px] text-slate-400 dark:text-slate-500" />
                        <span className="text-[9px] font-black uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500">
                            {isAssistance ? 'Peças / Materiais' : 'Lista de Itens'}
                        </span>
                        <span className="ml-auto text-[9px] font-black text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-full px-2 py-0.5">
                            {(order.items?.length ?? 0) + (order.assistanceItems?.length ?? 0)}
                        </span>
                    </div>
                    {/* Item rows */}
                    <div className="divide-y divide-slate-50 dark:divide-slate-800/50">
                        {[...(order.items || []), ...(order.assistanceItems || [])].map((item, i) => (
                            <div key={i} className="flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors">
                                {/* Qty badge */}
                                <span className={`flex-shrink-0 min-w-[2rem] text-center text-[10px] font-black px-1.5 py-0.5 rounded-md ${cls.dotBg}`}>
                                    {item.quantity} Un
                                </span>
                                {/* Description */}
                                <div className="flex-1 flex flex-col">
                                    <span className="text-xs font-bold text-slate-700 dark:text-slate-200 leading-snug">
                                        {item.description}
                                        {(item as any).supplierName && ` - ${(item as any).supplierName}`}
                                        {(item as any).originalOrderId && (
                                            <span className="ml-2 text-[8px] opacity-60">
                                                (Pedido #{ (item as any).originalOrderId.slice(-5) })
                                            </span>
                                        )}
                                    </span>
                                    {(item as any).handlingType && (
                                        <span className="text-[9px] font-black uppercase tracking-widest text-blue-500 dark:text-blue-400 mt-0.5">
                                            {(item as any).handlingType}
                                        </span>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {settings.showScheduleNoticeLabels && order.observation && (
                    <div className="text-amber-800 dark:text-amber-200/70 bg-amber-50/50 dark:bg-amber-900/10 p-3 rounded-xl text-xs border border-amber-100/50 dark:border-amber-900/30 flex items-start gap-3 transition-colors">
                        <i className="bi bi-info-circle-fill text-amber-500 mt-0.5" />
                        <div className="flex flex-col gap-1.5 w-full">
                            <strong className="uppercase font-black text-[9px] tracking-widest text-amber-600 dark:text-amber-500">Observações:</strong>
                            <div className="flex flex-wrap gap-1.5 w-full">
                                {order.observation.split(';').filter((t: string) => t.trim() !== "").map((tag: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-amber-100/50 dark:bg-amber-900/40 text-[10px] font-bold rounded-lg border border-amber-200/50 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 capitalize">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

/**
 * Main component for the Card Visualization of the Delivery Schedule
 */
const ScheduleCardView = ({ schedule, onOrderClick }: Props) => {
    return (
        <div className="flex flex-col gap-12 max-h-[80vh] overflow-y-auto pr-2 custom-scrollbar">
            {Object.entries(schedule).map(([date, orders]) => (
                <div key={date} className="w-full">
                    {/* Date Divider */}
                    <div className="flex items-center gap-6 mb-8">
                        <div className="h-0.5 flex-1 bg-gradient-to-r from-transparent to-slate-200 dark:to-slate-800"></div>
                        <div className="flex flex-col items-center">
                            <span className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 dark:text-slate-600 mb-2">
                                Cronograma Logístico
                            </span>
                            <h3 className="text-sm font-black uppercase text-blue-600 dark:text-blue-400 tracking-widest bg-blue-50 dark:bg-blue-900/20 px-6 py-2 rounded-2xl border-2 border-blue-100 dark:border-blue-900/30 shadow-sm shadow-blue-50 dark:shadow-none transition-colors">
                                {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
                                    weekday: 'long',
                                    day: '2-digit',
                                    month: 'long'
                                })}
                            </h3>
                        </div>
                        <div className="h-0.5 flex-1 bg-gradient-to-l from-transparent to-slate-200 dark:to-slate-800"></div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        {orders.map((order, index) => (
                            <DeliveryOrderCard
                                key={order.id || `order-${index}`}
                                order={order}
                                index={index}
                                onOrderClick={onOrderClick}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};


export default ScheduleCardView;

