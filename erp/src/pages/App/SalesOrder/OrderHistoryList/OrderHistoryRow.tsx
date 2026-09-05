import React from "react";
import Order, { VisibilitySettings } from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { formatCurrency, formatToBRDate, toTitleCase } from "../../../utils/formatters";
import { formatOrderCode } from "../../../utils/orderCode";
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";
import { getOrderAssemblyFlags, isPaidTrafficOrder } from "./orderItemHandlingUtils";
import { OrderAssemblyBadges } from "./OrderAssemblyBadges";
import { OrderDeliveryPrompt } from "./OrderDeliveryPrompt";
import { OrderOperationalBadges } from "./OrderOperationalBadges";
import { OrderOptionsMenu } from "./OrderOptionsMenu";

interface OrderHistoryRowProps {
    order: Order;
    onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean, reconciliationMode?: boolean) => void;
    onDelete: (id: string) => void;
    onRestore: (id: string) => void;
    onPermanentDelete: (id: string) => void;
    onAction: (actionKey: string, order: Order) => void;
    onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    visibilitySettings: VisibilitySettings;
    showTrash?: boolean;
    orderedColumnKeys?: string[];
    isSelected?: boolean;
    onToggleSelection?: () => void;
    onBlingUpdate?: (id: string, value: boolean) => void;
    onStockCheckUpdate?: (id: string, value: boolean, updatedItems?: any[], updatedAssistanceItems?: any[]) => void;
    onViewDetails?: (order: Order) => void;
    isHighlighted?: boolean;
    id?: string;
    onFilterByOrderId?: (id: string) => void;
    onShowPostSaleActions?: (order: Order) => void;
}

const OrderHistoryRow = ({
    order,
    onEdit,
    onDelete,
    onRestore,
    onPermanentDelete,
    onAction,
    onStatusUpdate,
    visibilitySettings,
    showTrash,
    orderedColumnKeys,
    isSelected,
    onBlingUpdate,
    onStockCheckUpdate,
    isHighlighted,
    id,
    onFilterByOrderId,
    onViewDetails,
    onShowPostSaleActions,
}: OrderHistoryRowProps) => {
    const settings = getSettings();
    const isDraft = order.status === 'draft';
    const isCancelled = order.status === 'cancelled';
    const canViewDetails = ['scheduled', 'fulfilled', 'cancelled'].includes(order.status || '');
    const isEditLocked = (order.status === 'fulfilled' || isCancelled) && ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');

    const statuses = (settings.orderStatuses || [
        { id: 'draft', label: 'Rascunho', color: 'slate', isCore: true },
        { id: 'scheduled', label: 'Agendado', color: 'amber', isCore: true },
        { id: 'fulfilled', label: 'Atendido', color: 'emerald', isCore: true },
        { id: 'cancelled', label: 'Cancelado', color: 'rose', isCore: true },
    ]).map(s => (s.id === 'draft' ? { ...s, label: 'Rascunho', color: 'slate' } : s))
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
    if (!statusConfig.draft) statusConfig.draft = { label: 'Rascunho', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
    if (!statusConfig.fulfilled) statusConfig.fulfilled = { label: 'Atendido', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' };

    const rowColors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const rowColorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, rowColors);
    const cls = getOrderTypeClasses(isDraft ? 'slate' : rowColorKey as any);

    const { hasAssemblyDepot, hasAssemblyOutside } = getOrderAssemblyFlags(order, settings);
    const isPaidTraffic = isPaidTrafficOrder(order);

    const cellBgClass = 'bg-white dark:bg-slate-900';
    const rowAccentWidthClass = order.orderType === 'return' || order.orderType === 'assistance'
        ? ''
        : (isDraft ? 'border-l-[12px]' : 'border-l-[6px]');
    const rowBorderClass = order.status === 'draft'
        ? 'border-l-slate-300 dark:border-l-slate-600'
        : rowColorKey === 'green'
            ? 'border-l-green-600 dark:border-l-green-500'
            : rowColorKey === 'purple'
                ? 'border-l-purple-600 dark:border-l-purple-500'
                : rowColorKey === 'orange'
                    ? 'border-l-orange-500 dark:border-l-orange-400'
                    : 'border-l-slate-300 dark:border-l-slate-600';

    const baseTdClass = `px-1 py-1 ${cellBgClass} border-b border-white dark:border-slate-800/50 align-middle relative`;

    const renderCell = (key: string) => {
        if (visibilitySettings[key as keyof VisibilitySettings] === false) return null;

        switch (key) {
            case 'id':
                return (
                    <td key={key} className={`${baseTdClass} whitespace-nowrap`}>
                        <div className="flex flex-col gap-1 items-start">
                            <span className="font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                {formatOrderCode(order)}
                            </span>
                            {order.linkedOrderId && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onFilterByOrderId?.(order.linkedOrderId!); }}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase text-blue-500 hover:text-blue-600 transition-colors tracking-widest bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-1.5 py-0.5 rounded-md mt-0.5 w-fit cursor-pointer"
                                    title="Filtrar por pedido vinculado"
                                >
                                    <i className="bi bi-link-45deg" />
                                    Pedido #{order.linkedOrderCode || formatOrderCode(order)}
                                </button>
                            )}
                        </div>
                    </td>
                );
            case 'orderDate':
                return (
                    <td key={key} className={`${baseTdClass} whitespace-nowrap`}>
                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                            {showTrash ? formatToBRDate(order.deletedAt || order.date) : formatToBRDate(order.date)}
                        </span>
                    </td>
                );
            case 'deliveryDate':
                const sched = order.shipping?.scheduling;
                const deliveryDateStr = sched?.date;
                let timeDisplay = "-";
                if (sched) {
                    if (sched.notInformed) timeDisplay = "Não informado";
                    else if (sched.type === 'range' && sched.startTime && sched.endTime) timeDisplay = `${sched.startTime} às ${sched.endTime}`;
                    else if (sched.startTime) timeDisplay = sched.startTime;
                    else if (sched.time) timeDisplay = sched.time;
                }

                return (
                    <td key={key} className={`${baseTdClass} whitespace-nowrap`}>
                        <div className="flex flex-col gap-0.5 relative">
                            <span className={`text-sm font-bold ${sched?.pendingScheduling ? 'text-slate-400 dark:text-slate-500' : 'text-slate-700 dark:text-slate-200'}`}>
                                {sched?.pendingScheduling 
                                    ? 'AGENDAMENTO PENDENTE'
                                    : (sched?.dateType === 'range' && sched?.endDate 
                                       ? `${formatToBRDate(deliveryDateStr)} até ${formatToBRDate(sched.endDate)}` 
                                       : formatToBRDate(deliveryDateStr))}
                            </span>
                            <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                                {timeDisplay}
                            </span>
                            <OrderDeliveryPrompt
                                order={order}
                                showTrash={showTrash}
                                showManualPrompt={settings.showManualFulfillmentPrompt}
                                onStatusUpdate={onStatusUpdate}
                                fulfilledLabel={statuses.find(s => s.id === 'fulfilled')?.label || 'Atendido'}
                            />
                        </div>
                    </td>
                );
            case 'customer':
                return (
                    <td key={key} className={`${baseTdClass} relative`}>
                        <div className="flex flex-col py-1">
                            <span 
                                className="text-[13px] font-black text-slate-700 dark:text-slate-200 tracking-tight leading-tight mb-1 truncate"
                                title={order.customerData?.fullName || "Não informado"}
                            >
                                {toTitleCase(order.customerData?.fullName || "Não informado")}
                            </span>
                            <div className="flex flex-wrap items-center gap-1">
                                <OrderOperationalBadges
                                    order={order}
                                    showTrash={showTrash}
                                    isPaidTraffic={isPaidTraffic}
                                    statusConfig={statusConfig}
                                    onStatusUpdate={onStatusUpdate}
                                    onBlingUpdate={onBlingUpdate}
                                    onStockCheckUpdate={onStockCheckUpdate}
                                    layout="row"
                                />
                                <OrderAssemblyBadges
                                    hasAssemblyDepot={hasAssemblyDepot}
                                    hasAssemblyOutside={hasAssemblyOutside}
                                    size="sm"
                                />
                            </div>
                        </div>
                    </td>
                );
            case 'totalValue':
                const displayTotal = order.paymentsSummary?.totalOrderValue || order.paymentsSummary?.totalValue || 0;
                return (
                    <td key={key} className={`${baseTdClass} text-right whitespace-nowrap`}>
                        <span className="text-sm font-black text-blue-600 dark:text-blue-400">{formatCurrency(displayTotal)}</span>
                    </td>
                );
            case 'actions':
                return (
                    <td key={key} className={`${baseTdClass} text-center`} onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-2 relative z-20">
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
                    </td>
                );
            default:
                return null;
        }
    };

    return (
        <tr
            id={id}
            onClick={isDraft ? () => onEdit(order) : (canViewDetails ? () => onViewDetails?.(order) : undefined)}
            className={`relative transition-colors group ${isDraft || canViewDetails ? 'cursor-pointer' : 'cursor-default'} border-b border-white dark:border-slate-800/50 ${rowAccentWidthClass} ${rowBorderClass} ${cellBgClass} ${isSelected ? cls.rowActive : ''} ${isHighlighted ? 'animate-highlight' : ''}`}
        >
            {orderedColumnKeys ? orderedColumnKeys.map(key => renderCell(key)) : (
                <>
                    {renderCell('id')}
                    {renderCell('orderDate')}
                    {renderCell('deliveryDate')}
                    {renderCell('customer')}
                    {renderCell('totalValue')}
                    {renderCell('actions')}
                </>
            )}
            {isCancelled && (
                <div 
                    aria-hidden="true" 
                    className="pointer-events-none absolute inset-0 z-10 bg-slate-950/35 flex items-center justify-center"
                >
                    <span className="max-w-[82%] truncate whitespace-nowrap rounded-md border-2 border-white bg-red-600 font-black uppercase tracking-[0.2em] text-white opacity-100 shadow-2xl drop-shadow-md px-4 py-1.5 text-xs">
                        Cancelado
                    </span>
                </div>
            )}
        </tr>
    );
};

export default OrderHistoryRow;
