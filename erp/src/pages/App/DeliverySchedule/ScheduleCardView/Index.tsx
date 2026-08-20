import React from "react";
import Order from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { stringifyFullAddressWithObservation, formatCurrency, formatDate } from "../../../utils/formatters";
import { getOrderTypeClasses, resolveOrderColor, getPrimaryHandlingInfo } from "../../../utils/orderTypeColorUtils";
import { calcItemTotalValue } from "../../../utils/calculations";
import { updateOrder } from "../../../utils/orderHistoryService";
import { toast } from "react-toastify";

import { OrderTypeFilter } from "../useDeliverySchedule";

interface Props {
    schedule: Record<string, Order[]>;
    onOrderClick: (order: Order) => void;
    isReadOnly?: boolean;
    hasInitialScrolled?: React.MutableRefObject<boolean>;
    pendingOrders?: Order[];
}

/**
 * Renders an individual delivery order as a card
 */
const DeliveryOrderCard = ({ order, index, onOrderClick, isReadOnly, hasInitialScrolled }: { order: Order; index: number; onOrderClick: (order: Order) => void; isReadOnly?: boolean; hasInitialScrolled?: React.MutableRefObject<boolean> }) => {
    const settings = getSettings();
    const [showStatusPicker, setShowStatusPicker] = React.useState(false);
    const [showAssemblyTooltip, setShowAssemblyTooltip] = React.useState(false);
    const [showOrderTooltip, setShowOrderTooltip] = React.useState(false);

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

    const isAssistance = order.orderType === 'assistance' || (order as any).taskType === 'assistance';
    const isShowroom = order.orderType === 'showroom' as any;
    const isPickupTask = (order as any).taskType === 'pickup';
    const isDeliveryTask = (order as any).taskType === 'delivery';
    const isAssemblyTask = (order as any).taskType === 'assembly';

    const typeLabel = isAssemblyTask ? 'MONTAGEM' : (isAssistance ? 'ASSISTÊNCIA' : (isPickupTask ? 'RETIRADA' : 'ENTREGA'));

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

    const isLinked = (order as any).hasLinkedAssembly;
    const hasLinkedDelivery = (order as any).hasLinkedDelivery;
    const assemblyItems = (order as any).assemblyItems || [];

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = isAssemblyTask ? 'rose' : resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const cls = getOrderTypeClasses(colorKey);

    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    const allItems = [...(order.items || []), ...(order.assistanceItems as any || [])];
    
    const isAssemblyOutside = allItems.some(item => {
        if (!item) return false;
        const hLabel = (item.handlingType || "").trim().toLowerCase();
        if (!hLabel) return false;
        const foundOpt = allOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
        return foundOpt?.isAssemblyOutside === true;
    });

    const isOnlyInternalAssembly = allItems.some(item => {
        if (!item) return false;
        const hLabel = (item.handlingType || "").trim().toLowerCase();
        if (!hLabel) return false;
        const foundOpt = allOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
        return foundOpt?.includeInAssemblySchedule === true && !foundOpt?.isAssemblyOutside;
    });

    const getHandlingColor = (label?: string) => {
        if (!label) return undefined;
        return allOptions.find(o => o.label === label)?.color;
    };

    return (
        <div
            onClick={() => onOrderClick(order)}
            className={`group border rounded-2xl shadow-sm overflow-hidden transition-all duration-300 cursor-pointer ${cls.cardBg} ${cls.cardBorder} hover:-translate-y-0.5 hover:shadow-md ${order.status === 'cancelled' ? 'opacity-50 grayscale hover:grayscale-0' : ''}`}
        >
            {/* Card Header: Type & Link Indicator */}
            <div className={`px-3.5 py-2 border-b dark:border-slate-800 flex justify-between items-center ${isAssemblyTask ? 'bg-rose-50/50 dark:bg-rose-900/10' : 'bg-slate-50/50 dark:bg-slate-900/10'}`}>
                <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider border transition-all text-white border-white/20 ${isAssemblyTask ? 'bg-rose-600 shadow-sm' : cls.dotBg + ' shadow-sm'}`}>
                        {typeLabel}
                    </span>
                    {isAssemblyOutside && (
                        <div className="flex items-center gap-0.5 bg-red-600 text-white px-2 py-0.5 rounded-full shadow-sm border border-white/20 ml-0.5 animate-blink" title="Montagem Fora - Realizada fora da morante">
                            <i className="bi bi-hammer text-[9px]" />
                            <i className="bi bi-house-door-fill text-[8px]" />
                        </div>
                    )}
                    {isOnlyInternalAssembly && (
                        <div className="flex items-center gap-1 bg-yellow-500 text-white px-2 py-0.5 rounded-full shadow-sm border border-white/20 ml-0.5 animate-blink" title="Montagem agendada">
                            <i className="bi bi-hammer text-[9px]" />
                        </div>
                    )}
                </div>
                {/* Hammer Button Overlay */}
                {isLinked && (
                    <div className="relative group/hammer">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAssemblyTooltip(!showAssemblyTooltip);
                            }}
                            className="bg-rose-600 text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow flex items-center gap-1 transition-transform hover:scale-105 active:scale-95"
                        >
                            <i className="bi bi-hammer text-xs" />
                            <span>Montagem</span>
                        </button>
                        
                        {showAssemblyTooltip && (
                            <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium-lg z-[100] p-3 animate-slide-up-custom overflow-hidden">
                                <div className="flex items-center gap-2 mb-2 border-b pb-2 dark:border-slate-800">
                                    <i className="bi bi-hammer text-rose-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produtos para Montagem</span>
                                </div>
                                <div className="flex flex-wrap gap-1.5">
                                    {assemblyItems.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-1.5 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-800/50 px-2 py-1 rounded-xl">
                                            <span className="text-[10px] font-black text-rose-700 dark:text-rose-400">
                                                {item.quantity}x
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">
                                                {item.description}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-600/5 rotate-45 translate-x-8 -translate-y-8" />
                            </div>
                        )}
                    </div>
                )}

                {/* Order Button Overlay (on Assembly tasks) */}
                {isAssemblyTask && hasLinkedDelivery && (() => {
                    const isLinkedPickup = order.shipping?.deliveryMethod === 'pickup';
                    const linkedIcon = isLinkedPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck';
                    const linkedLabel = isLinkedPickup ? 'Detalhes da Retirada' : 'Detalhes da Entrega';
                    const linkedIconColor = isLinkedPickup ? 'text-purple-500' : 'text-emerald-500';
                    const linkedBtnBg = isLinkedPickup ? 'bg-purple-600' : 'bg-emerald-600';

                    return (
                        <div className="relative group/truck">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowOrderTooltip(!showOrderTooltip);
                                }}
                                className={`${linkedBtnBg} text-white px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider shadow flex items-center gap-1 transition-transform hover:scale-105 active:scale-95`}
                                title={`Ver ${linkedLabel.toLowerCase()}`}
                            >
                                <i className={`bi ${linkedIcon} text-xs`} />
                                <span>{isLinkedPickup ? 'Retirada' : 'Entrega'}</span>
                            </button>

                            {showOrderTooltip && (
                                <div className="absolute top-full right-0 mt-2 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-premium-lg z-[100] p-3 animate-slide-up-custom overflow-hidden">
                                    <div className="flex items-center gap-2 mb-2 border-b pb-2 dark:border-slate-800">
                                        <i className={`bi ${linkedIcon} ${linkedIconColor}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{linkedLabel}</span>
                                    </div>
                                    <div className="flex flex-col gap-1.5">
                                        <div className="flex flex-col gap-0.5 text-left">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</span>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase">{order.customerData?.fullName || "Consumidor"}</p>
                                        </div>
                                        <div className="flex flex-col gap-0.5 mt-0.5 text-left">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Endereço</span>
                                            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 leading-tight">
                                                {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                                            </p>
                                        </div>
                                    </div>
                                    <div className={`absolute top-0 right-0 w-16 h-16 ${isLinkedPickup ? 'bg-purple-600/5' : 'bg-emerald-600/5'} rotate-45 translate-x-8 -translate-y-8`} />
                                </div>
                            )}
                        </div>
                    );
                })()}
            </div>

            {/* Combined Header: Time & Status Picker */}
            <div className={`px-3.5 py-2.5 border-b dark:border-slate-800 flex justify-between items-center transition-colors ${cls.headerBg}`}>
                <div className="flex items-center gap-2">
                    <span className="font-black text-xs sm:text-sm tracking-tight flex items-center text-slate-800 dark:text-slate-200">
                        <i className={`bi bi-clock-fill mr-1.5 ${cls.timeText}`} />
                        {displayTime}
                    </span>
                    {scheduling?.dateType === 'range' && scheduling?.endDate && (
                        <span className="text-[9px] font-bold text-blue-600 dark:text-blue-400 uppercase px-1.5 py-0.5 bg-blue-50 dark:bg-blue-900/20 rounded-md border border-blue-100 dark:border-blue-900/30">
                            Até {formatDate(scheduling.endDate)}
                        </span>
                    )}
                </div>

                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button
                        onClick={(e) => { e.stopPropagation(); setShowStatusPicker(!showStatusPicker); }}
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${order.status === 'fulfilled' 
                            ? 'bg-emerald-500 text-white border-emerald-400' 
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-blue-400'}`}
                    >
                        <i className={`bi ${getStatusIcon(order.status || 'draft')} ${order.status === 'fulfilled' ? 'text-white' : `text-${currentStatus.color}-500`} text-[9px]`} />
                        <span className="text-[9px] font-black uppercase tracking-wider">
                            {currentStatus.label}
                        </span>
                        <i className="bi bi-chevron-down text-[8px] opacity-50" />
                    </button>

                    {!isReadOnly && showStatusPicker && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowStatusPicker(false)} />
                            <div className="absolute top-full right-0 mt-2 w-60 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-2 flex flex-col gap-1 animate-slide-up">
                                <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest px-2 mb-1">Status do Pedido</p>
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
                                        className={`flex items-start gap-2.5 w-full p-2 rounded-xl transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${order.status === s.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                    >
                                        <i className={`bi ${getStatusIcon(s.id)} text-${s.color}-500 text-sm mt-0.5`} />
                                        <div className="flex flex-col text-left">
                                            <span className={`text-[10px] font-black uppercase tracking-widest ${order.status === s.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-700 dark:text-slate-200'}`}>
                                                {s.label}
                                            </span>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </>
                    )}
                </div>
            </div>

            <div className="p-3 sm:p-3.5 text-sm flex flex-col gap-2.5 text-left">
                {!isAssemblyTask && (
                    <div>
                        <div className="font-black text-slate-900 dark:text-slate-100 text-base leading-tight uppercase tracking-tight transition-colors">
                            {order.customerData?.fullName || "Consumidor"}
                        </div>
                    </div>
                )}

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
                    {isOnlyInternalAssembly && (
                        <div className="flex items-start gap-3 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-4 rounded-[1.5rem] border-2 border-orange-100 dark:border-orange-900/30 animate-pulse shadow-lg">
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
                        <div className="flex items-start gap-3 bg-red-600 text-white p-4 rounded-[1.5rem] border-2 border-red-700 animate-pulse shadow-lg">
                            <i className="bi bi-hammer text-white text-xl shrink-0" />
                            <div className="flex flex-col">
                                <span className="text-[11px] font-black uppercase tracking-[0.1em] leading-tight">
                                    Montagem FORA
                                </span>
                                <span className="text-[9px] font-bold opacity-80 uppercase">Realizada no cliente</span>
                            </div>
                        </div>
                    )}
                    {!isPickupTask && !isAssemblyTask && (
                        <>
                            <div className="flex items-start gap-4 p-3.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl group/addr hover:bg-white dark:hover:bg-slate-950 transition-all duration-300">
                                <i className="bi bi-geo-alt-fill text-red-500 mt-0.5 group-hover/addr:scale-110 transition-transform" />
                                <span className="leading-snug text-xs font-bold text-slate-500 dark:text-slate-400">
                                    {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                                </span>
                            </div>

                            {(order.shipping?.distance || order.shipping?.durationMinutes) ? (
                                <div className="flex items-center gap-6 px-4 py-2 bg-blue-50/40 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30 dark:border-blue-900/20">
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
                            ) : (
                                <div className="flex items-center gap-2 px-4 py-2 bg-slate-100/30 dark:bg-slate-800/20 rounded-xl border border-dashed border-slate-200 dark:border-slate-800">
                                    <i className="bi bi-geo-fill text-slate-300 dark:text-slate-600 text-[10px]" />
                                    <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest leading-none">
                                        Percurso não calculado
                                    </span>
                                </div>
                            )}
                        </>
                    )}
                </div>

                {((order.items && order.items.length > 0) || (order.assistanceItems && order.assistanceItems.length > 0)) && (
                <div className={`mt-1 bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 transition-all overflow-hidden`}>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 opacity-60">
                        {isAssemblyTask ? 'Necessita Montar:' : (isAssistance ? 'Peças / Materiais' : 'Itens do Pedido')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {[...(order.items || []), ...(order.assistanceItems || [])].filter(Boolean).map((item, i) => (
                            <div key={i} className="flex items-center gap-1.5 px-2 py-1 bg-white/60 dark:bg-slate-900/40 border border-slate-200/60 dark:border-slate-700/40 rounded-lg shadow-sm">
                                <span className={`text-[10px] font-black ${isAssemblyTask ? 'text-rose-600 dark:text-rose-400' : 'text-blue-600 dark:text-blue-400'}`}>
                                    {item.quantity}x
                                </span>
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">
                                    {item.description}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
                )}

                {settings.showScheduleNoticeLabels && order.observation && (
                    <div className="text-red-800 dark:text-red-200/70 bg-red-50/50 dark:bg-red-900/10 p-3 rounded-xl text-xs border border-red-100/50 dark:border-red-900/30 flex items-start gap-3 transition-colors">
                        <i className="bi bi-exclamation-octagon-fill text-red-500 mt-0.5" />
                        <div className="flex flex-col gap-1.5 w-full">
                            <strong className="uppercase font-black text-[9px] tracking-widest text-red-600 dark:text-red-500">Observações:</strong>
                            <div className="flex flex-wrap gap-1.5 w-full">
                                {order.observation.split(';').filter((t: string) => t.trim() !== "").map((tag: string, i: number) => (
                                    <span key={i} className="px-2 py-0.5 bg-red-100/50 dark:bg-red-900/40 text-[10px] font-bold rounded-lg border border-red-200/50 dark:border-red-800/50 text-red-800 dark:text-red-200 uppercase tracking-tight">
                                        {tag}
                                    </span>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
            
            <style dangerouslySetInnerHTML={{
                __html: `
                @keyframes slide-up-custom {
                    from { transform: translateY(10px); opacity: 0; }
                    to { transform: translateY(0); opacity: 1; }
                }
                .animate-slide-up-custom { animation: slide-up-custom 0.3s ease-out forwards; }
            `}} />
        </div>
    );
};

/**
 * Main component for the Card Visualization of the Delivery Schedule
 */
const ScheduleCardView = ({ schedule, onOrderClick, isReadOnly, hasInitialScrolled, pendingOrders = [] }: Props) => {
    const scrollContainerRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        if (hasInitialScrolled?.current) return;

        const today = new Date();
        const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

        // Find the closest date (today or future)
        const availableDates = Object.keys(schedule).sort();
        const targetDate = availableDates.find(d => d >= todayStr) || availableDates[0];

        if (!targetDate) return;

        setTimeout(() => {
            const element = document.getElementById(`date-${targetDate}`);
            if (element) {
                element.scrollIntoView({ behavior: 'smooth', block: 'start' });
                if (hasInitialScrolled) hasInitialScrolled.current = true;
            }
        }, 300);
    }, [schedule, hasInitialScrolled]);

    return (
        <div ref={scrollContainerRef} className="flex flex-col gap-6 w-full custom-scrollbar">
            {pendingOrders.length > 0 && (
                <div className="w-full scroll-mt-4">
                    {/* Pending Section Header */}
                    <div className="sticky top-0 z-20 py-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between mb-3 px-3.5 py-2.5 rounded-2xl border border-orange-200/60 dark:border-orange-900/40 shadow-sm">
                        <div className="flex items-center gap-2">
                            <span className="w-2.5 h-2.5 rounded-full bg-orange-500 animate-pulse" />
                            <h3 className="text-xs font-black uppercase text-orange-600 dark:text-orange-400 tracking-wider">
                                Entregas a Agendar
                            </h3>
                        </div>
                        <span className="text-[10px] font-black text-orange-600 dark:text-orange-400 bg-orange-50 dark:bg-orange-900/30 px-2.5 py-0.5 rounded-full border border-orange-200 dark:border-orange-900/40 uppercase">
                            {pendingOrders.length} {pendingOrders.length === 1 ? 'pendente' : 'pendentes'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {pendingOrders.map((order, index) => (
                            <DeliveryOrderCard
                                key={order.id || `pending-${index}`}
                                order={order}
                                index={index}
                                onOrderClick={onOrderClick}
                                isReadOnly={isReadOnly}
                            />
                        ))}
                    </div>
                </div>
            )}

            {Object.entries(schedule).map(([date, orders]) => (
                <div key={date} id={`date-${date}`} className="w-full scroll-mt-4">
                    {/* Compact Sticky Date Divider */}
                    <div className="sticky top-0 z-20 py-2 bg-slate-50/95 dark:bg-slate-900/95 backdrop-blur-md flex items-center justify-between mb-3 px-3.5 py-2 rounded-2xl border border-slate-200/60 dark:border-slate-800 shadow-sm">
                        <div className="flex items-center gap-2">
                            <i className="bi bi-calendar-event text-blue-600 dark:text-blue-400 text-xs" />
                            <h3 className="text-xs sm:text-sm font-black uppercase text-slate-800 dark:text-slate-100 tracking-wider">
                                {new Date(date + "T00:00:00").toLocaleDateString("pt-BR", {
                                    weekday: 'short',
                                    day: '2-digit',
                                    month: 'short'
                                })}
                            </h3>
                        </div>
                        <span className="text-[10px] font-black text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 px-2.5 py-0.5 rounded-full border border-blue-100 dark:border-blue-900/40 uppercase">
                            {orders.length} {orders.length === 1 ? 'pedido' : 'pedidos'}
                        </span>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                        {orders.map((order, index) => (
                            <DeliveryOrderCard
                                key={order.id || `order-${index}`}
                                order={order}
                                index={index}
                                onOrderClick={onOrderClick}
                                isReadOnly={isReadOnly}
                            />
                        ))}
                    </div>
                </div>
            ))}
        </div>
    );
};

const styles = `
    @keyframes blink {
        0% { opacity: 1; transform: scale(1); }
        50% { opacity: 0.4; transform: scale(0.92); }
        100% { opacity: 1; transform: scale(1); }
    }
    .animate-blink { animation: blink 1.2s ease-in-out infinite; }
`;

if (typeof document !== 'undefined') {
    const styleTag = document.createElement('style');
    styleTag.innerHTML = styles;
    document.head.appendChild(styleTag);
}


export default ScheduleCardView;

