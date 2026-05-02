import React from "react";
import Order from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { formatCurrency, stringifyFullAddressWithObservation } from "../../../utils/formatters";
import { getOrderTypeClasses, resolveOrderColor, translateStatus } from "../../../utils/orderTypeColorUtils";

interface Props {
    schedule: Record<string, Order[]>;
    onOrderClick: (order: Order) => void;
    isReadOnly?: boolean;
    hasInitialScrolled?: React.MutableRefObject<boolean>;
}

const TimelineNode = ({ order, onOrderClick }: { order: Order; onOrderClick: (order: Order) => void }) => {
    const settings = getSettings();
    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    
    const isAssistance = order.orderType === 'assistance';
    const isAssemblyTask = (order as any).taskType === 'assembly';
    const isPickupTask = (order as any).taskType === 'pickup';
    
    const colorKey = isAssemblyTask ? 'rose' : resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const cls = getOrderTypeClasses(colorKey);

    const scheduling = order.shipping?.scheduling;
    let displayTime = "N/D";
    if (isAssistance) {
        displayTime = (order as any).scheduledTime || "N/D";
    } else if (scheduling) {
        displayTime = scheduling.type === "range" 
            ? `${scheduling.startTime} - ${scheduling.endTime}` 
            : (scheduling.startTime || scheduling.time || "N/D");
    }

    const typeLabel = isAssemblyTask ? 'Montagem' : (isAssistance ? 'Assistência' : (isPickupTask ? 'Retirada' : 'Entrega'));

    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    const allItems = [...(order.items || []), ...(order.assistanceItems as any || [])];
    
    const isAssemblyOutside = allItems.some(item => {
        const hLabel = (item.handlingType || "").trim().toLowerCase();
        if (!hLabel) return false;
        const foundOpt = allOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
        return foundOpt?.isAssemblyOutside === true;
    });

    const isOnlyInternalAssembly = allItems.some(item => {
        const hLabel = (item.handlingType || "").trim().toLowerCase();
        if (!hLabel) return false;
        const foundOpt = allOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
        return foundOpt?.includeInAssemblySchedule === true && !foundOpt?.isAssemblyOutside;
    });

    return (
        <div className="relative pl-16 pb-16 group last:pb-8" onClick={() => onOrderClick(order)}>
            {/* The Dot on the timeline - Centered with the first row of the card */}
            <div className={`absolute left-0 top-8 w-6 h-6 -ml-3 rounded-full border-4 border-white dark:border-slate-900 z-10 shadow-lg transition-all duration-300 group-hover:scale-125 ${isAssemblyTask ? 'bg-rose-500' : cls.dotBg}`} />
            
            {/* Connecting line segment (vertical) */}
            <div className="absolute left-0 top-14 bottom-0 w-0.5 bg-slate-100 dark:bg-slate-800 -ml-0.25 group-last:hidden" />

            <div className={`p-8 rounded-[2.5rem] border transition-all duration-300 cursor-pointer ${cls.cardBg} ${cls.cardBorder} hover:shadow-premium-lg group-hover:border-blue-300 dark:group-hover:border-blue-800 relative overflow-hidden`}>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
                    <div className="flex items-center gap-3">
                        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-white shadow-sm ${isAssemblyTask ? 'bg-rose-600' : cls.dotBg}`}>
                            {typeLabel}
                        </div>
                        <div className="flex items-center gap-2 text-slate-800 dark:text-slate-200">
                            <i className="bi bi-clock-fill text-xs opacity-50" />
                            <span className="text-xs font-black tracking-tight">{displayTime}</span>
                        </div>
                    </div>
                    
                    <div className={`px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${
                        order.status === 'fulfilled' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        order.status === 'scheduled' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                        {translateStatus(order.status)}
                    </div>
                </div>

                <div className="flex flex-col gap-1">
                    <h4 className="text-xl font-black text-slate-900 dark:text-slate-100 uppercase tracking-tighter leading-none">
                        {order.customerData?.fullName || "Consumidor"}
                    </h4>
                    <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 flex items-center gap-2 mt-2">
                        <i className="bi bi-geo-alt-fill text-red-500" />
                        {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                    </p>
                </div>

                {/* Assembly Badges */}
                <div className="flex flex-col gap-2 mt-4">
                    {isOnlyInternalAssembly && (
                        <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-4 rounded-[1.5rem] border-2 border-orange-100 dark:border-orange-900/30 animate-pulse shadow-lg w-fit">
                            <i className="bi bi-hammer text-orange-500 text-xl shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.1em] leading-tight">
                                    Montagem no Depósito
                                </span>
                                <span className="text-[9px] font-bold opacity-70 uppercase">Agendado para o depósito</span>
                            </div>
                        </div>
                    )}

                    {isAssemblyOutside && (
                        <div className="flex items-start gap-3 bg-red-600 text-white p-4 rounded-[1.5rem] border-2 border-red-700 animate-pulse shadow-lg w-fit">
                            <i className="bi bi-hammer text-white text-xl shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.1em] leading-tight">
                                    Montagem FORA
                                </span>
                                <span className="text-[9px] font-bold opacity-80 uppercase">Realizada no cliente</span>
                            </div>
                        </div>
                    )}
                </div>

                {/* Items Summary */}
                <div className="mt-4 flex flex-wrap gap-2">
                    {[...(order.items || []), ...(order.assistanceItems || [])].slice(0, 4).map((item, i) => (
                        <div key={i} className="px-2.5 py-1 bg-white/50 dark:bg-slate-900/50 border border-slate-200/50 dark:border-slate-800/50 rounded-lg text-[9px] font-black text-slate-600 dark:text-slate-400 uppercase tracking-widest">
                            {item.quantity}x {item.description}
                        </div>
                    ))}
                    {[...(order.items || []), ...(order.assistanceItems || [])].length > 4 && (
                        <div className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-[9px] font-black text-slate-400 uppercase tracking-widest">
                            + {([...(order.items || []), ...(order.assistanceItems || [])].length - 4)} itens
                        </div>
                    )}
                </div>

                {/* Accent shape */}
                <div className={`absolute top-0 right-0 w-24 h-24 rotate-45 translate-x-12 -translate-y-12 opacity-5 pointer-events-none ${isAssemblyTask ? 'bg-rose-500' : cls.dotBg}`} />
            </div>
        </div>
    );
};

const ScheduleTimelineView = ({ schedule, onOrderClick, hasInitialScrolled }: Props) => {
    React.useEffect(() => {
        if (hasInitialScrolled?.current) return;
        
        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
        
        // Find the closest date (today or future)
        const availableDates = Object.keys(schedule).sort();
        const targetDate = availableDates.find(d => d >= todayStr) || availableDates[0];

        if (!targetDate) return;

        setTimeout(() => {
            const element = document.getElementById(`timeline-date-${targetDate}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (hasInitialScrolled) hasInitialScrolled.current = true;
            }
        }, 300);
    }, [schedule, hasInitialScrolled]);

    return (
        <div className="max-h-[80vh] overflow-y-auto pr-4 custom-scrollbar py-12">
            <div className="max-w-[95%] mx-auto px-4 sm:px-10">
                {Object.entries(schedule).map(([date, orders]) => (
                    <div key={date} id={`timeline-date-${date}`} className="mb-24">
                        {/* Date Header */}
                        <div className="sticky top-0 z-20 flex items-center gap-6 mb-12 bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl px-8 py-6 rounded-[2rem] border border-slate-100 dark:border-slate-800 shadow-premium-sm">
                            <div className="flex flex-col">
                                <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 uppercase tracking-[0.3em]">
                                    {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { weekday: 'long' })}
                                </span>
                                <h3 className="text-3xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">
                                    {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", { day: '2-digit', month: 'long' })}
                                </h3>
                            </div>
                            <div className="h-px flex-1 bg-gradient-to-r from-slate-200 to-transparent dark:from-slate-800"></div>
                            <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {orders.length} {orders.length === 1 ? 'Pedido' : 'Pedidos'}
                            </div>
                        </div>

                        <div className="relative border-l-2 border-slate-100 dark:border-slate-800 ml-3">
                            {orders.map((order, i) => (
                                <TimelineNode 
                                    key={order.id || i} 
                                    order={order} 
                                    onOrderClick={onOrderClick} 
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ScheduleTimelineView;
