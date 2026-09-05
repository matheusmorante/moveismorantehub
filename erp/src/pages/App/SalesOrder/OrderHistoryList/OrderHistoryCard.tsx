import React from "react";
import Order from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { formatCurrency, formatToBRDate, toTitleCase } from "../../../utils/formatters";
import { formatOrderCode } from "../../../utils/orderCode";
import { resolveOrderColor } from "../../../utils/orderTypeColorUtils";
import CancelledOrderBadge from "./CancelledOrderBadge";
import { getOrderAssemblyFlags, isPaidTrafficOrder } from "./orderItemHandlingUtils";
import { OrderAssemblyBadges } from "./OrderAssemblyBadges";
import { OrderDeliveryPrompt } from "./OrderDeliveryPrompt";
import { OrderOperationalBadges } from "./OrderOperationalBadges";
import { OrderOptionsMenu } from "./OrderOptionsMenu";

interface OrderHistoryCardProps {
    order: Order;
    onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean, reconciliationMode?: boolean) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onAction: (actionKey: string, order: Order) => void;
    onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    showTrash?: boolean;
    isSelected?: boolean;
    onToggleSelection?: () => void;
    isHighlighted?: boolean;
    id?: string;
    onFilterByOrderId?: (id: string) => void;
    onBlingUpdate?: (id: string, value: boolean) => void;
    onStockCheckUpdate?: (id: string, value: boolean, updatedItems?: any[], updatedAssistanceItems?: any[]) => void;
    onViewDetails?: (order: Order) => void;
    onShowPostSaleActions?: (order: Order) => void;
}

const OrderHistoryCard = ({
    order,
    onEdit,
    onDelete,
    onRestore,
    onPermanentDelete,
    onAction,
    onStatusUpdate,
    showTrash,
    onBlingUpdate,
    onStockCheckUpdate,
    isHighlighted,
    id,
    onFilterByOrderId,
    onViewDetails,
    onShowPostSaleActions,
}: OrderHistoryCardProps) => {
    const settings = getSettings();
    const canViewDetails = ['scheduled', 'fulfilled', 'cancelled'].includes(order.status || '');
    const isDraft = order.status === 'draft';
    const isCancelled = order.status === 'cancelled';
    const isEditLocked = (order.status === 'fulfilled' || isCancelled) && ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');

    const statuses = (settings.orderStatuses || [
        { id: 'draft', label: 'Rascunho', color: 'slate' },
        { id: 'scheduled', label: 'Agendado', color: 'amber' },
        { id: 'fulfilled', label: 'Atendido', color: 'emerald' },
        { id: 'cancelled', label: 'Cancelado', color: 'rose' },
    ]).map(s => (s.id === 'draft' ? { ...s, label: 'Rascunho' } : s))
      .filter(s => s.id !== 'chargeback' && s.id !== 'disputed');

    const statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }> = {};
    statuses.forEach(s => {
        statusConfig[s.id] = {
            label: s.label,
            bg: `bg-${s.color}-${s.color === 'slate' ? '100' : '50'}`,
            text: `text-${s.color}-${s.color === 'slate' ? '500' : '600'}`,
            dot: `bg-${s.color}-${s.color === 'slate' ? '400' : '500'}`,
        };
    });

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);

    const { hasAssemblyDepot, hasAssemblyOutside } = getOrderAssemblyFlags(order, settings);
    const isPaidTraffic = isPaidTrafficOrder(order);

    const headerAccentClass =
        order.orderType === 'budget'
            ? (isDraft ? 'bg-indigo-50/60 dark:bg-indigo-950/30 border-b border-indigo-100 dark:border-indigo-900/30' : 'bg-indigo-100/70 dark:bg-indigo-900/30 border-b border-indigo-200/60 dark:border-indigo-900/40')
            : isDraft
                ? 'bg-slate-100/80 dark:bg-slate-800/40 border-b border-slate-200 dark:border-slate-700'
                : colorKey === 'green'
                    ? 'bg-emerald-200/90 dark:bg-emerald-950/80 border-b border-emerald-300 dark:border-emerald-800'
                    : colorKey === 'purple'
                        ? 'bg-purple-50/80 dark:bg-purple-900/20 border-b border-purple-100 dark:border-purple-900/30'
                        : colorKey === 'orange'
                            ? 'bg-orange-50/80 dark:bg-orange-950/20 border-b border-orange-100 dark:border-orange-900/30'
                            : 'bg-slate-50 dark:bg-slate-800/40 border-b border-slate-100 dark:border-slate-700';

    const sched = order.shipping?.scheduling;
    let timeDisplay = "";
    if (sched) {
        if (sched.notInformed) timeDisplay = "Não informado";
        else if (sched.type === 'range' && sched.startTime && sched.endTime) timeDisplay = `${sched.startTime} às ${sched.endTime}`;
        else if (sched.startTime) timeDisplay = sched.startTime;
        else if (sched.time) timeDisplay = sched.time;
    }

    return (
        <div 
            id={id}
            onClick={isDraft ? () => onEdit(order) : (canViewDetails ? () => onViewDetails?.(order) : undefined)}
            className={`bg-white dark:bg-slate-900 min-h-fit border border-slate-200 dark:border-slate-800 ${isHighlighted ? 'animate-highlight' : ''} rounded-xl shadow-none transition-all relative overflow-visible ${isDraft || canViewDetails ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {order.status === 'cancelled' && <CancelledOrderBadge tilted large />}

            {/* Header com faixa colorida + badges operacionais */}
            <div className={`${headerAccentClass} rounded-t-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap`}>
                <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                        #{formatOrderCode(order)}
                    </span>
                </div>

                <div className={`flex items-center gap-1.5 flex-wrap justify-end ml-auto ${isCancelled ? 'opacity-70 pointer-events-none' : ''}`} onClick={isCancelled ? undefined : (e) => e.stopPropagation()}>
                    <OrderOperationalBadges
                        order={order}
                        showTrash={showTrash}
                        isPaidTraffic={isPaidTraffic}
                        statusConfig={statusConfig}
                        onStatusUpdate={onStatusUpdate}
                        onBlingUpdate={onBlingUpdate}
                        onStockCheckUpdate={onStockCheckUpdate}
                        layout="card"
                    />
                    <OrderAssemblyBadges
                        hasAssemblyDepot={hasAssemblyDepot}
                        hasAssemblyOutside={hasAssemblyOutside}
                        size="sm"
                    />
                </div>
            </div>

            {/* Corpo do card */}
            <div className="px-3 pt-2.5 pb-3">
                <h3 
                    className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight w-fit"
                    title={order.customerData?.fullName || "Cliente não informado"}
                >
                    {toTitleCase(order.customerData?.fullName || "Cliente não informado")}
                </h3>

                {order.linkedOrderId && (
                    <button
                        type="button"
                        disabled={isCancelled}
                        onClick={isCancelled ? undefined : (event) => { event.stopPropagation(); onFilterByOrderId?.(order.linkedOrderId!); }}
                        className="mt-2 flex items-center gap-1.5 rounded-lg border border-blue-100 bg-blue-50 px-2 py-1 text-[9px] font-black uppercase tracking-widest text-blue-600 transition-colors hover:bg-blue-100 dark:border-blue-900/30 dark:bg-blue-900/20 dark:text-blue-400"
                        title={isCancelled ? "Pedido cancelado" : "Abrir pedido de venda vinculado"}
                    >
                        <i className="bi bi-link-45deg" />
                        Pedido #{order.linkedOrderCode || formatOrderCode(order)}
                    </button>
                )}

                {sched?.pendingScheduling && (
                    <div className="mt-2 flex items-center gap-2 bg-orange-500 text-white p-2 rounded-lg border border-orange-600 shadow-sm">
                        <i className="bi bi-clock-history text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            AGENDAMENTO PENDENTE
                        </span>
                    </div>
                )}

                <OrderDeliveryPrompt
                    order={order}
                    showTrash={showTrash}
                    showManualPrompt={settings.showManualFulfillmentPrompt}
                    onStatusUpdate={onStatusUpdate}
                    fulfilledLabel="Atendido"
                />

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">Pedido</span>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                            <i className="bi bi-calendar3 text-[10px]" />
                            <span className="text-[10px]">{formatToBRDate(order.date)}</span>
                        </div>
                    </div>

                    {(sched?.date || sched?.pendingScheduling) && (
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">
                                {order.orderType === 'return' ? 'Data de coleta' : (order.shipping?.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega')}
                            </span>
                            <div className={`flex items-center justify-end gap-1.5 font-bold ${sched?.pendingScheduling ? 'text-slate-400 dark:text-slate-500' : 'text-blue-500 dark:text-blue-400'}`}>
                                <i className={`bi ${sched?.pendingScheduling ? 'bi-clock-history text-orange-500' : 'bi-truck'} text-[11px]`} />
                                <span className="text-[10px]">
                                    {sched?.pendingScheduling 
                                        ? 'PENDENTE'
                                        : (sched.dateType === 'range' && sched.endDate 
                                            ? `${formatToBRDate(sched.date)} até ${formatToBRDate(sched.endDate)}`
                                            : formatToBRDate(sched.date))}
                                </span>
                            </div>
                        </div>
                    )}

                    {timeDisplay && (
                        <div className="col-span-2 mt-0.5 flex justify-end">
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-900/30">
                                <i className="bi bi-clock-history text-[10px]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">{timeDisplay}</span>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Rodapé do card */}
            <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 px-3 pt-2.5 pb-3">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5">
                        {order.orderType === 'return' ? 'Total devolvido' : 'Total'}
                    </span>
                    <span className="text-base font-black text-blue-600 dark:text-blue-400">
                        {formatCurrency(order.paymentsSummary?.totalOrderValue || 0)}
                    </span>
                </div>

                <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                    {!isEditLocked && !isCancelled && !isDraft && !showTrash && (
                        <button
                            onClick={() => onEdit(order)}
                            className="p-2 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 cursor-pointer"
                            title="Editar pedido"
                        >
                            <i className="bi bi-pencil-fill text-lg" />
                        </button>
                    )}
                    
                    <OrderOptionsMenu
                        order={order}
                        showTrash={showTrash}
                        onEdit={onEdit}
                        onDelete={onDelete}
                        onRestore={onRestore}
                        onPermanentDelete={onPermanentDelete}
                        onAction={onAction}
                        onStatusUpdate={onStatusUpdate}
                        onShowPostSaleActions={onShowPostSaleActions}
                    />
                </div>
            </div>
        </div>
    );
};

export default OrderHistoryCard;
