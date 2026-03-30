import React from "react";
import Order from "../../../types/order.type";
import { stringifyFullAddressWithObservation, stringifyItems } from "../../../utils/formatters";
import { getSettings } from '@/pages/utils/settingsService';
import { getOrderTypeClasses, resolveOrderColor, getPrimaryHandlingInfo } from "../../../utils/orderTypeColorUtils";

interface Props {
    order: Order;
    duration: number;
    onOrderClick: (order: Order) => void;
}

const TableCell = ({ order, duration, onOrderClick }: Props) => {
    const settings = getSettings();

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const cls = getOrderTypeClasses(colorKey);

    const isPickup = order.shipping?.deliveryMethod === 'pickup';
    const isAssistance = order.orderType === 'assistance';

    const { hasAssembly, label: primaryHandlingLabel } = getPrimaryHandlingInfo(order, settings);

    const typeLabel = isAssistance
        ? settings.orderTypeLabels.assistance
        : (isPickup ? settings.orderTypeLabels.pickup : settings.orderTypeLabels.delivery);

    return (
        <td
            colSpan={duration}
            className="p-3 align-middle bg-transparent transition-colors duration-300"
        >
            <div
                onClick={() => onOrderClick(order)}
                className={`w-[380px] h-[190px] mx-auto border-2 rounded-2xl p-4 shadow-sm hover:shadow-lg transition-all group overflow-hidden flex flex-col gap-2 cursor-pointer ${cls.cardBg} ${cls.cardBorder} ${order.status === 'cancelled' ? 'opacity-50 grayscale' : ''} ${order.status === 'draft' ? 'border-dashed opacity-80' : ''}`}
            >
                <div className="flex justify-between items-start mb-1 pb-1 border-b border-slate-100 dark:border-slate-800">
                    <span className={`font-black text-[12px] uppercase tracking-widest whitespace-nowrap ${cls.timeText}`}>
                        {order.shipping.scheduling.startTime || order.shipping.scheduling.time}
                        {order.shipping.scheduling.type === 'range' && ` → ${order.shipping.scheduling.endTime}`}
                    </span>
                    {order.shipping.scheduling.type === 'range' && (
                        <span className={`text-[10px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter ${cls.dotBg}`}>
                            Período
                        </span>
                    )}
                    {order.status === 'draft' && (
                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 uppercase tracking-widest border border-slate-300">
                            Rascunho
                        </span>
                    )}
                </div>

                <div className="font-black text-slate-800 dark:text-slate-100 text-[16px] uppercase truncate leading-none flex items-center gap-2">
                    {hasAssembly && <i className="bi bi-hammer text-red-500 animate-pulse" title="Exige Montagem" />}
                    {order.customerData?.fullName || "Consumidor"}
                </div>

                {!isPickup && (
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

                <div className="flex flex-wrap gap-1.5 mt-1">
                    {settings.showScheduleNoticeLabels && order.observation && order.observation.split(';').filter((t: string) => t.trim() !== "").map((tag: string, i: number) => (
                        <span key={i} className="text-[11px] font-black px-2 py-1 rounded border bg-amber-100/50 dark:bg-amber-900/40 border-amber-200/50 dark:border-amber-800/50 text-amber-800 dark:text-amber-200 capitalize max-w-[120px] truncate" title={tag}>
                            {tag}
                        </span>
                    ))}
                </div>

                <div className="mt-1 bg-slate-50/80 dark:bg-slate-800/50 p-2 rounded-xl border border-slate-100 dark:border-slate-800 group-hover:bg-blue-50/30 dark:group-hover:bg-blue-900/20 transition-colors">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1 opacity-60">Lista de Itens</p>
                    <p className="text-[12px] font-mono text-slate-700 dark:text-slate-300 font-bold leading-tight line-clamp-2">
                        {stringifyItems([...(order.items || []), ...(order.assistanceItems || [])] as any[])}
                    </p>
                </div>
            </div>
        </td>
    );
};

export default TableCell;
