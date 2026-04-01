import React from "react";
import Order from "../../../types/order.type";
import { stringifyFullAddressWithObservation, stringifyItems } from "../../../utils/formatters";
import { getSettings } from '@/pages/utils/settingsService';
import { getOrderTypeClasses, resolveOrderColor, getPrimaryHandlingInfo } from "../../../utils/orderTypeColorUtils";

import { OrderTypeFilter } from "../useDeliverySchedule";

interface Props {
    order: Order;
    duration: number;
    onOrderClick: (order: Order) => void;
}

const TableCell = ({ order, duration, onOrderClick }: Props) => {
    const settings = getSettings();
    const [showAssemblyTooltip, setShowAssemblyTooltip] = React.useState(false);
    const [showOrderTooltip, setShowOrderTooltip] = React.useState(false);

    const isAssemblyTask = (order as any).taskType === 'assembly';
    const hasLinkedAssembly = (order as any).hasLinkedAssembly;
    const hasLinkedDelivery = (order as any).hasLinkedDelivery;
    const assemblyItems = (order as any).assemblyItems || [];

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = isAssemblyTask ? 'rose' : resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const cls = getOrderTypeClasses(colorKey);

    const isAssistance = order.orderType === 'assistance';
    const isPickup = (order as any).taskType === 'pickup';
    const isAssembly = (order as any).taskType === 'assembly';
    const typeLabel = isAssembly ? 'MONTAGEM' : (isAssistance ? 'ASSISTÊNCIA' : (isPickup ? 'RETIRADA' : 'ENTREGA'));

    return (
        <td
            colSpan={duration}
            className="p-3 align-middle bg-transparent transition-colors duration-300"
        >
            <div
                onClick={() => onOrderClick(order)}
                className={`w-[380px] min-h-[190px] h-auto mx-auto border-2 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all group overflow-visible flex flex-col gap-2 cursor-pointer relative ${cls.cardBg} ${cls.cardBorder} ${order.status === 'cancelled' ? 'opacity-50 grayscale' : ''} ${order.status === 'draft' ? 'border-dashed opacity-80' : ''}`}
            >
                {/* Hammer Button Overlay */}
                {hasLinkedAssembly && (
                    <div className="absolute -top-3 -right-3 z-[60]">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                setShowAssemblyTooltip(!showAssemblyTooltip);
                            }}
                            className="bg-rose-600 text-white w-12 h-12 rounded-full border-4 border-white dark:border-slate-950 shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95"
                            title="Ver itens de montagem"
                        >
                            <i className="bi bi-hammer text-xl" />
                        </button>

                        {showAssemblyTooltip && (
                            <div className="absolute bottom-full right-0 mb-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-4 animate-slide-up-custom overflow-hidden">
                                <div className="flex items-center gap-2 mb-3 border-b pb-2 dark:border-slate-800">
                                    <i className="bi bi-hammer text-rose-500" />
                                    <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produtos para Montagem</span>
                                </div>
                                <div className="flex flex-wrap gap-2">
                                    {assemblyItems.map((item: any, i: number) => (
                                        <div key={i} className="flex items-center gap-2 bg-rose-50/50 dark:bg-rose-900/10 border border-rose-100/50 dark:border-rose-800/50 px-2 py-1.5 rounded-xl">
                                            <span className="text-[10px] font-black text-rose-700 dark:text-rose-400">
                                                {item.quantity}x
                                            </span>
                                            <span className="text-[10px] font-bold text-slate-700 dark:text-slate-300 uppercase leading-none">
                                                {item.description}
                                            </span>
                                        </div>
                                    ))}
                                    {assemblyItems.length === 0 && (
                                         <p className="text-[10px] text-slate-400 font-bold uppercase py-2">Consultar informações no pedido</p>
                                    )}
                                </div>
                                <div className="absolute top-0 right-0 w-16 h-16 bg-rose-600/5 rotate-45 translate-x-8 -translate-y-8" />
                            </div>
                        )}
                    </div>
                )}

                {/* Order Button Overlay (on Assembly tasks) */}
                {isAssemblyTask && hasLinkedDelivery && (() => {
                    const linkedColorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
                    const isLinkedPickup = order.shipping?.deliveryMethod === 'pickup';
                    const linkedIcon = isLinkedPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck';
                    const linkedLabel = isLinkedPickup ? 'Detalhes da Retirada' : 'Detalhes da Entrega';
                    const linkedIconColor = isLinkedPickup ? 'text-purple-500' : 'text-emerald-500';
                    const linkedBtnBg = isLinkedPickup ? 'bg-purple-600' : 'bg-emerald-600';

                    return (
                        <div className="absolute -top-3 -right-3 z-[60]">
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setShowOrderTooltip(!showOrderTooltip);
                                }}
                                className={`${linkedBtnBg} text-white w-12 h-12 rounded-full border-4 border-white dark:border-slate-950 shadow-xl flex items-center justify-center transition-transform hover:scale-110 active:scale-95`}
                                title={`Ver ${linkedLabel.toLowerCase()}`}
                            >
                                <i className={`bi ${linkedIcon} text-xl`} />
                            </button>

                            {showOrderTooltip && (
                                <div className="absolute bottom-full right-0 mb-4 w-72 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl z-[100] p-4 animate-slide-up-custom overflow-hidden">
                                    <div className="flex items-center gap-2 mb-3 border-b pb-2 dark:border-slate-800">
                                        <i className={`bi ${linkedIcon} ${linkedIconColor}`} />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">{linkedLabel}</span>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <div className="flex flex-col gap-1">
                                            <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Cliente</span>
                                            <p className="text-xs font-black text-slate-800 dark:text-slate-100 uppercase">{order.customerData?.fullName || "Consumidor"}</p>
                                        </div>
                                        <div className="flex flex-col gap-1 mt-1">
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
                <div className="flex justify-between items-center mb-1">
                    <span className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-widest border shadow-sm transition-all text-white border-white/20 ${isAssemblyTask ? 'bg-rose-600' : cls.dotBg}`}>
                        {typeLabel}
                    </span>
                </div>



                <div className="flex justify-between items-start mb-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className={`font-black text-[12px] uppercase tracking-widest whitespace-nowrap ${cls.timeText}`}>
                        {order.shipping.scheduling.startTime || order.shipping.scheduling.time}
                        {order.shipping.scheduling.type === 'range' && ` → ${order.shipping.scheduling.endTime}`}
                    </span>
                    {order.status === 'draft' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase tracking-widest border border-slate-300">
                            Rascunho
                        </span>
                    )}
                </div>

                {!isAssemblyTask && (
                    <div className="font-black text-slate-800 dark:text-slate-100 text-[16px] uppercase truncate leading-none flex items-center gap-2">
                        {order.customerData?.fullName || "Consumidor"}
                    </div>
                )}

                {!isPickup && !isAssemblyTask && (
                    <div className="flex flex-col gap-1.5">
                        <div
                            className="text-[12px] text-slate-500 dark:text-slate-400 font-black leading-snug truncate"
                            title={stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                        >
                            <i className="bi bi-geo-alt-fill text-red-500 mr-1" />
                            {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                        </div>
                        
                        {(order.shipping?.distance || order.shipping?.durationMinutes) && (
                            <div className="flex items-center gap-2 group-hover:gap-3 transition-all duration-300">
                                {order.shipping?.distance !== undefined && (
                                    <span className="flex items-center gap-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase">
                                        <i className="bi bi-map-fill" />
                                        {order.shipping.distance.toFixed(1)} KM
                                    </span>
                                )}
                                {order.shipping?.durationMinutes !== undefined && (
                                    <span className="flex items-center gap-1.5 text-[11px] font-black text-blue-600 dark:text-blue-400 uppercase">
                                        <i className="bi bi-hourglass-fill" />
                                        {order.shipping.durationMinutes} MIN
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                )}

                {isAssembly && (
                    <div className="flex flex-col gap-1.5">
                        <div className="text-[12px] text-slate-500 dark:text-slate-400 font-black truncate">
                            <i className="bi bi-geo-alt-fill text-red-500 mr-1" />
                            {stringifyFullAddressWithObservation(order.customerData?.fullAddress)}
                        </div>
                    </div>
                )}

                <div className={`mt-1 bg-slate-50/80 dark:bg-slate-800/50 p-2.5 rounded-2xl border border-slate-100 dark:border-slate-800 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/20 transition-all flex-1 overflow-y-auto`}>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 opacity-60">
                        {isAssemblyTask ? 'Necessita Montar:' : (isAssistance ? 'Peças / Materiais' : 'Itens do Pedido')}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                        {[...(order.items || []), ...(order.assistanceItems || [])].map((item, i) => (
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
                
                <style dangerouslySetInnerHTML={{
                    __html: `
                    @keyframes slide-up-custom {
                        from { transform: translateY(10px); opacity: 0; }
                        to { transform: translateY(0); opacity: 1; }
                    }
                    .animate-slide-up-custom { animation: slide-up-custom 0.3s ease-out forwards; }
                `}} />
            </div>
        </td>
    );
};

export default TableCell;
