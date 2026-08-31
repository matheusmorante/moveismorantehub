import React from "react";
import Order, { VisibilitySettings } from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { formatCurrency, formatToBRDate } from "../../../utils/formatters";
import { formatOrderCode } from "../../../utils/orderCode";
import { buttons } from "../OrderActions/orderActionsConfig";
import { isOrderIncomplete } from "../../../utils/validations";
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";
import { useAuth } from "../../../../context/AuthContext";
import { canPerform } from "../../../utils/permissionService";
import { handleStockAndBusinessRules, manuallyReverseStock, updateOrder, undoReturn } from "@/pages/utils/orderHistoryService";
import { toast } from "react-toastify";
import InventoryMovementBadge from "./InventoryMovementBadge";
import CancelledOrderBadge from "./CancelledOrderBadge";

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
    onToggleSelection,
    onBlingUpdate,
    onStockCheckUpdate,
    isHighlighted,
    id,
    onFilterByOrderId,
    onViewDetails
}: OrderHistoryRowProps) => {
    const [showPicker, setShowPicker] = React.useState(false);
    const [showMenu, setShowMenu] = React.useState(false);
    const [showFulfillmentConfirm, setShowFulfillmentConfirm] = React.useState(false);
    const [showStockConfirm, setShowStockConfirm] = React.useState(false);
    const [isStockLoading, setIsStockLoading] = React.useState(false);
    const { profile } = useAuth();
    const settings = getSettings();
    const isIncomplete = isOrderIncomplete(order);
    const hasTemporaryItems = order.items?.some(item => !item.productId || item.productId.trim() === '') || false;
    const canViewDetails = ['scheduled', 'fulfilled', 'cancelled'].includes(order.status || '');
    
    // DEBUG: Confirming file loaded
    React.useEffect(() => {
        if (showMenu) console.log("[OrderHistoryRow] Menu opened for order:", order.id, "StockProcessed:", order.stockProcessed);
    }, [showMenu]);

    // Reset stock confirm when menu closes
    React.useEffect(() => {
        if (!showMenu) setShowStockConfirm(false);
    }, [showMenu]);

    // Auto-dismiss the "Sim/Não" confirmation after 5 seconds with no action
    React.useEffect(() => {
        if (!showFulfillmentConfirm) return;
        const timer = setTimeout(() => setShowFulfillmentConfirm(false), 5000);
        return () => clearTimeout(timer);
    }, [showFulfillmentConfirm]);

    const statuses = (settings.orderStatuses || [
        { id: 'draft', label: 'Rascunho', color: 'slate', isCore: true },
        { id: 'scheduled', label: 'Agendado', color: 'amber', isCore: true },
        { id: 'fulfilled', label: 'Atendido', color: 'emerald', isCore: true },
        { id: 'cancelled', label: 'Cancelado', color: 'rose', isCore: true },
    ]).map(s => {
        if (s.id === 'draft') return { ...s, label: 'Rascunho', color: 'slate' };
        return s;
    }).filter(s => s.id !== 'chargeback' && s.id !== 'disputed');

    const statusConfig: Record<string, { label: string, bg: string, text: string, dot: string }> = {};
    statuses.forEach(s => {
        statusConfig[s.id] = {
            label: s.label,
            bg: `bg-${s.color}-${s.color === 'slate' ? '100' : '50'}`,
            text: `text-${s.color}-${s.color === 'slate' ? '500' : '600'}`,
            dot: `bg-${s.color}-${s.color === 'slate' ? '400' : '500'}`,
        };
    });

    // Fallbacks just in case
    if (!statusConfig.draft) statusConfig.draft = { label: 'Rascunho', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
    if (!statusConfig.fulfilled) statusConfig.fulfilled = { label: 'Atendido', bg: 'bg-emerald-50', text: 'text-emerald-600', dot: 'bg-emerald-500' };

    const rowColors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const rowColorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, rowColors);
    const isDraft = order.status === 'draft';
    const isEditLocked = order.status === 'fulfilled' && ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');
    const canReconcileTemporaryProducts = order.status === 'fulfilled' && order.orderType === 'sale' && (order.items || []).some(item => !item.productId?.trim() || item.isTemporaryProduct);
    const cls = getOrderTypeClasses(isDraft ? 'slate' : rowColorKey as any);
    
    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    const getMatchingOption = (hLabel: string) => {
        if (!hLabel) return null;
        
        // Match exato ou parcial (ex: "Montagem" em "Pedido de Montagem")
        return allOptions.find(o => {
            const sLabel = normalize(o?.label);
            return sLabel === hLabel || (sLabel && (hLabel.includes(sLabel) || sLabel.includes(hLabel)));
        });
    };

    const isHandlingDepot = (item: any) => {
        const hLabel = normalize(item?.handlingType || item?.handling);
        const opt = getMatchingOption(hLabel);
        if (opt?.includeInAssemblySchedule) return true;
        if (hLabel.includes('montagem no deposito') || hLabel.includes('montagem para retirada') || hLabel.includes('montagem no depósito')) return true;
        return false;
    };

    const isHandlingOutside = (item: any) => {
        const hLabel = normalize(item?.handlingType || item?.handling);
        const opt = getMatchingOption(hLabel);
        if (opt?.isAssemblyOutside) return true;
        if (hLabel.includes('montagem na entrega') || hLabel.includes('montagem fora') || hLabel.includes('montagem no endereco') || hLabel.includes('montagem no local')) return true;
        return false;
    };

    const allOrderItems = [...(order.items || []), ...(order.assistanceItems || [])];
    const orderHandling = normalize(
        order.handlingType || order.handling || order.shipping?.handlingType || order.shipping?.handling || ''
    );
    const isOrderAssemblyOutside = orderHandling.includes('montagem fora') || orderHandling.includes('montagem na entrega') || orderHandling.includes('montagem no endereco');
    const isOrderAssemblyDepot = orderHandling.includes('montagem no deposito') || orderHandling.includes('montagem para retirada') || orderHandling.includes('montagem no depósito');

    const hasAssemblyOutside = isOrderAssemblyOutside || allOrderItems.some(isHandlingOutside);
    const hasAssemblyDepot = isOrderAssemblyDepot || allOrderItems.some(isHandlingDepot);
    
    const cellBgClass = 'bg-white dark:bg-slate-900';
    const rowBorderClass = order.status === 'draft'
        ? 'border-l-slate-300 dark:border-l-slate-600'
        : rowColorKey === 'green'
            ? 'border-l-green-600 dark:border-l-green-500'
            : rowColorKey === 'purple'
                ? 'border-l-purple-600 dark:border-l-purple-500'
                : rowColorKey === 'orange'
                    ? 'border-l-orange-500 dark:border-l-orange-400'
                    : 'border-l-slate-300 dark:border-l-slate-600';

    const baseTdClass = `px-1 py-1 ${cellBgClass} border-b border-white dark:border-slate-800/50 align-middle`;

    const statusKey = (order.status as string) === 'completed' ? 'scheduled' : (order.status || 'draft');
    const currentStatus = statusConfig[statusKey] || statusConfig.draft;
    const isStatusBadgeReadOnly = ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');

    const getStatusLabel = (id: string) => statuses.find(s => s.id === id)?.label || id;

    const renderCell = (key: string) => {
        if (visibilitySettings[key as keyof VisibilitySettings] === false) return null;

        switch (key) {
            case 'id':
                const isAssistance = order.orderType === 'assistance';
                const isReturn = order.orderType === 'return';
                const isPickup = order.shipping?.deliveryMethod === 'pickup';
                const typeIcon = isAssistance ? 'bi-tools' : (isReturn ? 'bi-arrow-return-left' : (isPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck'));
                const typeColor = isAssistance ? 'text-orange-500' : (isReturn ? 'text-amber-500' : (isPickup ? 'text-purple-500' : 'text-green-600'));

                return (
                    <td key={key} className={`${baseTdClass} whitespace-nowrap`}>
                        <div className="flex flex-col gap-1 items-start">
                            <div className="flex items-center gap-2">
                                <span className="font-mono text-xs text-slate-400 dark:text-slate-500 bg-slate-100 dark:bg-slate-800 px-2 py-1 rounded-lg">
                                    {formatOrderCode(order)}
                                </span>
                            </div>
                            {order.linkedOrderId && (
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onFilterByOrderId?.(order.linkedOrderId!); }}
                                    className="flex items-center gap-1 text-[9px] font-black uppercase text-blue-500 hover:text-blue-600 transition-colors tracking-widest bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-1.5 py-0.5 rounded-md mt-0.5 w-fit"
                                    title="Filtrar por pedido vinculado"
                                >
                                    <i className="bi bi-link-45deg"></i>
                                    Vinc: #{order.linkedOrderCode || formatOrderCode(order)}
                                </button>
                            )}
                        </div>
                    </td>
                );
            case 'orderDate':
                return (
                    <td key={key} className={`${baseTdClass} whitespace-nowrap`}>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-slate-700 dark:text-slate-200">
                                {showTrash ? formatToBRDate(order.deletedAt || order.date) : formatToBRDate(order.date)}
                            </span>
                        </div>
                    </td>
                );
            case 'deliveryDate':
                const deliveryDateStr = order.shipping?.scheduling?.date;
                let isPastDelivery = false;
                if (deliveryDateStr) {
                    try {
                        const dateParts = deliveryDateStr.includes('/') ? deliveryDateStr.split('/') : deliveryDateStr.split('-');
                        const day = deliveryDateStr.includes('/') ? Number(dateParts[0]) : Number(dateParts[2]);
                        const month = deliveryDateStr.includes('/') ? Number(dateParts[1]) : Number(dateParts[1]);
                        const year = deliveryDateStr.includes('/') ? Number(dateParts[2]) : Number(dateParts[0]);

                        const deliveryDate = new Date(year, month - 1, day);
                        const today = new Date();
                        today.setHours(0, 0, 0, 0);
                        isPastDelivery = deliveryDate < today;
                    } catch (e) {
                        console.error("Erro ao processar data de entrega:", e);
                    }
                }

                return (
                    <td key={key} className={`${baseTdClass} whitespace-nowrap`}>
                        <div className="flex flex-col gap-0.5 relative">
                            <div className="flex flex-col">
                                <span className={`text-sm font-bold ${order.shipping?.scheduling?.pendingScheduling ? 'text-slate-400 dark:text-slate-500' : (isPastDelivery && order.status !== 'fulfilled' && order.status !== 'cancelled' ? 'text-red-600 dark:text-red-400' : 'text-slate-700 dark:text-slate-200')}`}>
                                    {order.shipping?.scheduling?.pendingScheduling 
                                        ? 'AGENDAMENTO PENDENTE'
                                        : (order.shipping?.scheduling?.dateType === 'range' && order.shipping?.scheduling?.endDate 
                                           ? `${formatToBRDate(deliveryDateStr)} até ${formatToBRDate(order.shipping.scheduling.endDate)}` 
                                           : formatToBRDate(deliveryDateStr))}
                                </span>
                                {(() => {
                                    const sched = order.shipping?.scheduling;
                                    let timeDisplay = "-";
                                    if (sched) {
                                        if (sched.notInformed) {
                                            timeDisplay = "Não informado";
                                        } else if (sched.type === 'range' && sched.startTime && sched.endTime) {
                                            timeDisplay = `${sched.startTime} às ${sched.endTime}`;
                                        } else if (sched.startTime) {
                                            timeDisplay = sched.startTime;
                                        } else if (sched.time) {
                                            timeDisplay = sched.time;
                                        }
                                    }
                                    return (
                                        <span className="text-[10px] text-slate-400 dark:text-slate-600 font-bold uppercase tracking-widest">
                                            {timeDisplay}
                                        </span>
                                    );
                                })()}
                            </div>

                            {isPastDelivery && order.status !== 'fulfilled' && order.status !== 'cancelled' && !showTrash && settings.showManualFulfillmentPrompt && (
                                <>
                                    {!showFulfillmentConfirm ? (
                                        <button
                                            onClick={(e) => { e.stopPropagation(); setShowFulfillmentConfirm(true); }}
                                            className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-500 rounded-lg border border-red-200 dark:border-red-900/30 w-fit hover:scale-105 transition-all active:scale-95 shadow-sm"
                                            title="A data de entrega passou. Este pedido já foi atendido?"
                                        >
                                            <i className="bi bi-clock-history text-[10px]" />
                                            <span className="text-[9px] font-black uppercase tracking-widest">Pedido {getStatusLabel('fulfilled')}?</span>
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-1.5 animate-slide-up">
                                                <span className="text-[9px] text-slate-500 dark:text-slate-400 font-bold">Confirmar?</span>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onStatusUpdate(order.id!, 'fulfilled');
                                                    setShowFulfillmentConfirm(false);
                                                }}
                                                className="px-2 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-md hover:bg-emerald-700 transition-colors shadow-sm"
                                            >
                                                Sim
                                            </button>
                                            <button
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setShowFulfillmentConfirm(false);
                                                }}
                                                className="px-2 py-1 bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase rounded-md hover:bg-slate-300 dark:hover:bg-slate-600 transition-colors shadow-sm"
                                            >
                                                Não
                                            </button>
                                        </div>
                                    )}
                                </>
                            )}

                            {order.status === 'fulfilled' && !order.reviewRequested && !showTrash && !(order.shipping?.deliveryMethod === 'pickup' && (order.customerData?.fullName === "Consumidor Final" || order.customerData?.fullName === "Ao Consumidor")) && (
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onAction("sendCustomerReviews", order);
                                    }}
                                    className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 rounded-lg border border-yellow-100 dark:border-yellow-900/30 w-fit hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-all active:scale-95 cursor-pointer shadow-sm"
                                    title="Enviar pedido de avaliação para o Google Maps"
                                >
                                    <i className="bi bi-star-fill text-[10px]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Enviar Avaliação</span>
                                </button>
                            )}

                            {order.status === 'fulfilled' && order.reviewRequested && !showTrash && (
                                <div className="flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900/20 w-fit shadow-sm">
                                    <i className="bi bi-star-half text-[10px]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Avaliação Solicitada</span>
                                </div>
                            )}
                        </div>
                    </td>
                );
            case 'customer':
                const isAssis = order.orderType === 'assistance';
                const isRet = order.orderType === 'return';
                const isPick = order.shipping?.deliveryMethod === 'pickup';
                const tIcon = isAssis ? 'bi-tools' : (isRet ? 'bi-arrow-return-left' : (isPick ? 'bi-hand-index-thumb-fill' : 'bi-truck'));
                const tColor = isAssis ? 'text-orange-600' : (isRet ? 'text-amber-600' : (isPick ? 'text-purple-600' : 'text-green-600'));

                const sIcons: Record<string, string> = {
                    draft: 'bi-clock',
                    scheduled: 'bi-calendar3',
                    fulfilled: 'bi-check-circle-fill',
                    cancelled: 'bi-x-circle-fill',
                };
                const sIcon = sIcons[order.status || 'draft'] || 'bi-dot';

                const mOrigin1 = (order.marketingOrigin || "").toLowerCase();
                const mOrigin2 = (((order as any).customerData?.marketingOrigin) || "").toLowerCase();
                
                const isPaidTraffic = 
                    mOrigin1 === 'paid' || mOrigin1.includes('pago') || mOrigin1.includes('ads') || mOrigin1.includes('facebook') || mOrigin1.includes('insta') || mOrigin1.includes('trafego') || mOrigin1.includes('tráfego') ||
                    mOrigin2 === 'paid' || mOrigin2.includes('pago') || mOrigin2.includes('ads') || mOrigin2.includes('facebook') || mOrigin2.includes('insta') || mOrigin2.includes('trafego') || mOrigin2.includes('tráfego');

                return (
                    <td key={key} className={baseTdClass}>
                        <div className="flex flex-col py-1 group/name">
                            <span 
                                onClick={(e) => { e.stopPropagation(); if (!isEditLocked) onEdit(order); }}
                                className={`text-[13px] font-black text-slate-700 dark:text-slate-200 uppercase tracking-tight leading-tight mb-1 truncate transition-colors flex items-center gap-1.5 w-fit ${isEditLocked ? 'cursor-default' : 'cursor-pointer group-hover/name:text-blue-600 dark:group-hover/name:text-blue-400'}`}
                                title={isEditLocked ? 'Pedido atendido não pode ser editado' : 'Clique para editar o pedido'}
                            >
                                {order.customerData?.fullName || "Não informado"}
                                <i className="bi bi-pencil text-[10px] opacity-0 group-hover/name:opacity-50 transition-opacity" />
                            </span>
                            
                            <div className="flex flex-wrap items-center gap-1">
                                {/* 1. Stock Check Badge — Selo de Etiquetado (Clicável: Bg Verde + Ícone Branco + Check no canto quando true) */}
                                {!showTrash && order.orderType !== 'assistance' && order.orderType !== 'return' && (
                                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => onStockCheckUpdate?.(order.id!, !order.isStockChecked)}
                                            className={`relative flex h-6 w-6 items-center justify-center rounded-md border cursor-pointer select-none transition-all hover:scale-105 shadow-2xs ${
                                                order.isStockChecked
                                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                                    : 'bg-slate-50 text-slate-400 border-slate-200/80 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800'
                                            }`}
                                            title={order.isStockChecked ? 'Etiquetado (Clique para desmarcar)' : 'Não Etiquetado (Clique para marcar)'}
                                        >
                                            <i className={`bi bi-tag-fill text-[11px] ${order.isStockChecked ? 'text-white' : ''}`} />
                                            {order.isStockChecked && (
                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                                    <i className="bi bi-check text-[8px] font-black leading-none" />
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 2. Bling Status Badge — Selo do Bling (Clicável: Bg Verde + Texto Branco + Check no canto quando true) */}
                                {order.orderType !== 'assistance' && order.orderType !== 'return' && !showTrash && order.status !== 'draft' && order.status !== 'cancelled' && (
                                    <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            type="button"
                                            onClick={() => onBlingUpdate?.(order.id!, !order.isRegisteredInBling)}
                                            className={`relative flex h-6 items-center justify-center px-2 rounded-md border cursor-pointer select-none transition-all hover:scale-105 shadow-2xs text-[8px] font-black uppercase ${
                                                order.isRegisteredInBling
                                                    ? 'bg-emerald-600 text-white border-emerald-700'
                                                    : 'bg-slate-50 text-slate-400 border-slate-200/80 dark:bg-slate-800/40 dark:text-slate-500 dark:border-slate-800'
                                            }`}
                                            title={order.isRegisteredInBling ? 'Lançado no Bling (Clique para alternar)' : 'Falta Lançar no Bling (Clique para marcar)'}
                                        >
                                            <span className={order.isRegisteredInBling ? 'text-white' : ''}>Bling</span>
                                            {order.isRegisteredInBling && (
                                                <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                                    <i className="bi bi-check text-[8px] font-black leading-none" />
                                                </span>
                                            )}
                                        </button>
                                    </div>
                                )}

                                {/* 3. Demais Badges Informativos */}
                                {/* Tráfego Pago Badge (Fundo Laranja Sólido + Ícone Branco) */}
                                {isPaidTraffic && order.orderType !== 'return' && (
                                    <div 
                                        className="flex items-center justify-center h-6 w-6 rounded-md bg-orange-500 text-white border border-orange-600 shadow-2xs"
                                        title="Gerado por Tráfego Pago"
                                    >
                                        <i className="bi bi-megaphone-fill text-[11px] text-white"></i>
                                    </div>
                                )}

                                {/* Status Picker Button (Fundo colorido sólido + Ícone Branco) */}
                                <div className="relative" onClick={(e) => e.stopPropagation()}>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); if (!isStatusBadgeReadOnly) setShowPicker(!showPicker); }}
                                        className={`flex items-center justify-center h-6 w-6 rounded-md ${currentStatus.bg.replace('/10', '').replace('/20', '').replace('-50', '-500')} text-white transition-all shadow-2xs border border-black/10 ${isStatusBadgeReadOnly ? 'cursor-default' : 'hover:brightness-110 active:scale-95'}`}
                                        title={`${isStatusBadgeReadOnly ? 'Status somente leitura' : 'Status'}: ${currentStatus.label} | Tipo: ${isAssis ? 'Assistência' : (isRet ? 'Devolução' : (isPick ? 'Retirada' : 'Entrega'))}`}
                                    >
                                        <i className={`bi ${sIcon} text-white text-[11px]`} />
                                    </button>

                                    {!isStatusBadgeReadOnly && showPicker && (
                                        <>
                                            <div className="fixed inset-0 z-10" onClick={(e) => { e.stopPropagation(); setShowPicker(false); }} />
                                            <div className="absolute top-full mt-1 left-0 w-40 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-2xl p-1.5 flex flex-col gap-1 z-[250] animate-slide-up">
                                                {Object.keys(statusConfig).map((k) => {
                                                    const s = statusConfig[k];
                                                    return (
                                                        <button
                                                            key={k}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onStatusUpdate(order.id!, k);
                                                                setShowPicker(false);
                                                            }}
                                                            className={`flex items-center gap-2.5 p-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-950 group/item ${order.status === k ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''}`}
                                                        >
                                                            <div className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
                                                            <span className={`text-[9px] font-black uppercase tracking-widest ${order.status === k ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500'}`}>
                                                                {s.label}
                                                            </span>
                                                        </button>
                                                    );
                                                })}
                                            </div>
                                        </>
                                    )}
                                </div>

                                {order.status === 'cancelled' && <CancelledOrderBadge />}

                                {/* Transport Type Icon (Entrega = Bg Verde + Ícone Branco / Retirada = Bg Roxo + Ícone Branco / Assistência = Laranja / Devolução = Âmbar) */}
                                <div 
                                    className={`flex items-center justify-center h-6 w-6 rounded-md border shadow-2xs ${
                                        isAssis 
                                            ? 'bg-orange-500 text-white border-orange-600'
                                            : isRet
                                                ? 'bg-amber-500 text-white border-amber-600'
                                                : isPick
                                                    ? 'bg-purple-600 text-white border-purple-700'
                                                    : 'bg-emerald-600 text-white border-emerald-700'
                                    }`}
                                    title={isAssis ? 'Assistência' : (isPick ? 'Retirada' : (isRet ? 'Devolução' : 'Entrega'))}
                                >
                                    <i className={`bi ${tIcon} text-[11px] text-white`} />
                                </div>

                                {/* Stock Processed Indicator (Saída lançada = PackageCheck verde / Não lançada = Package cinza) */}
                                {(order.orderType === 'sale' || order.orderType === 'showroom' || order.orderType === 'return') && (
                                    <InventoryMovementBadge orderType={order.orderType} hasMovement={order.orderType === 'return' ? Boolean(order.returnStockProcessed) : Boolean(order.stockProcessed)} />
                                )}

                                {/* Return Status Badge */}
                                {order.returnOrderId && (
                                    <div 
                                        className="flex items-center justify-center h-6 w-6 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-md border border-amber-100 dark:border-amber-900/20 shadow-sm" 
                                        title="Este pedido possui uma devolução vinculada"
                                    >
                                        <i className="bi bi-arrow-return-left text-[10px]" />
                                    </div>
                                )}

                                {/* Pending Scheduling Badge */}
                                {order.shipping?.scheduling?.pendingScheduling && (
                                    <div 
                                        className="flex items-center gap-1.5 px-2 h-6 bg-orange-500 text-white rounded-md border border-orange-600 shadow-sm"
                                        title="AGENDAMENTO PENDENTE"
                                    >
                                        <i className="bi bi-clock-history text-[10px]" />
                                        <span className="text-[9px] font-black uppercase tracking-widest leading-none">Agendamento Pendente</span>
                                    </div>
                                )}

                                {/* Marketing Origin Indicator (Tráfego Pago / Ads) */}
                                {order.marketingOrigin && (
                                    order.marketingOrigin.toLowerCase().includes('trafego') || 
                                    order.marketingOrigin.toLowerCase().includes('ads') ||
                                    order.marketingOrigin.toLowerCase().includes('facebook') ||
                                    order.marketingOrigin.toLowerCase().includes('instagram') ||
                                    order.marketingOrigin.toLowerCase().includes('google')
                                ) && (
                                    <div 
                                        className="flex items-center justify-center h-6 w-6 bg-orange-500 text-white rounded-md border border-orange-600 shadow-2xs" 
                                        title={`Origem: ${order.marketingOrigin}`}
                                    >
                                        <i className="bi bi-megaphone-fill text-[11px] text-white" />
                                    </div>
                                )}

                                {/* Assembly Badges: mantidos por último na sequência dos rótulos */}
                                {order.orderType !== 'return' && hasAssemblyDepot && (
                                    <div
                                        className="flex h-6 w-6 items-center justify-center bg-amber-500 text-white rounded-md border border-amber-600 shadow-sm"
                                        title="MONTAGEM NO DEPÓSITO"
                                    >
                                        <i className="bi bi-hammer text-[11px]" />
                                    </div>
                                )}

                                {/* Montagem Fora */}
                                {order.orderType !== 'return' && hasAssemblyOutside && (
                                    <div
                                        className="flex h-6 w-6 items-center justify-center bg-red-600 text-white rounded-md border border-red-700 shadow-sm"
                                        title="MONTAGEM FORA (NA CASA DO CLIENTE)"
                                    >
                                        <i className="bi bi-hammer text-[11px]" />
                                    </div>
                                )}

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
                        <div className="flex items-center justify-center gap-2">
                            {showTrash ? (
                                <>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onRestore(order.id!); }}
                                        className="p-2 text-slate-400 dark:text-slate-500 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-xl transition-all shadow-sm bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800"
                                        title="Restaurar Pedido"
                                    >
                                        <i className="bi bi-arrow-counterclockwise text-sm" />
                                    </button>
                                </>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2">
                                            <div
                                                className="relative group/menu"
                                                onMouseEnter={() => setShowMenu(true)}
                                                onMouseLeave={() => setShowMenu(false)}
                                            >
                                                <button
                                                    className={`p-2 rounded-xl transition-all border flex items-center justify-center h-7 w-7 shadow-sm ${showMenu ? 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 border-slate-200 dark:border-slate-700' : 'text-slate-400 dark:text-slate-500 bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 hover:text-slate-800 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'} group-hover/menu:bg-slate-100 dark:group-hover/menu:bg-slate-800 group-hover/menu:border-slate-200 dark:group-hover/menu:border-slate-700 group-hover/menu:text-slate-800 dark:group-hover/menu:text-slate-200`}
                                                    title="Mais ações e opções de envio"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setShowMenu(!showMenu);
                                                        setShowPicker(false);
                                                    }}
                                                >
                                                    <i className="bi bi-three-dots-vertical" />
                                                </button>

                                                {/* Dropdown Menu - Continuous hover area bridged with pt-2 instead of mt-2 */}
                                                <div className={`absolute top-full right-0 pt-2 w-64 flex-col z-[200] ${showMenu ? 'flex' : 'hidden md:group-hover/menu:flex'}`}>
                                                    <div className="w-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-2 flex flex-col gap-1 animate-slide-up max-h-[60vh] overflow-y-auto custom-scrollbar">
                                                        {/* Edit Button */}
                                                        {canReconcileTemporaryProducts && (
                                                            <button
                                                                onClick={(e) => { e.stopPropagation(); onEdit(order, 2, true, true); setShowMenu(false); }}
                                                                className="flex w-full items-center gap-3 rounded-xl p-2.5 text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30"
                                                            >
                                                                <i className="bi bi-link-45deg text-lg" />
                                                                <div className="flex flex-col text-left"><span className="text-xs font-black uppercase tracking-widest">Realizar conciliação</span><span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">Vincular produtos sem cadastro</span></div>
                                                            </button>
                                                        )}
                                                        <button
                                                            disabled={isEditLocked}
                                                            onClick={(e) => { e.stopPropagation(); if (!isEditLocked) onEdit(order); setShowMenu(false); }}
                                                            className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${isEditLocked ? 'cursor-not-allowed text-slate-400 dark:text-slate-600' : `hover:bg-slate-50 dark:hover:bg-slate-800 group/item ${order.orderType === 'assistance' ? 'text-orange-600' : order.orderType === 'budget' ? 'text-blue-600' : order.orderType === 'return' ? 'text-amber-600' : 'text-emerald-600'}`}`}
                                                            title={isEditLocked ? 'Pedido atendido não pode ser editado' : `Editar est${order.orderType === 'assistance' ? 'a assistência' : order.orderType === 'budget' ? 'e orçamento' : order.orderType === 'return' ? 'a devolução' : 'a venda'}`}
                                                        >
                                                            <i className="bi bi-pencil-fill text-lg" />
                                                            <div className="flex flex-col text-left">
                                                                <span className="text-xs font-black uppercase tracking-widest">
                                                                    {order.orderType === 'assistance' ? 'Editar Assistência' : order.orderType === 'budget' ? 'Editar Orçamento' : order.orderType === 'return' ? 'Editar Devolução' : 'Editar Venda'}
                                                                </span>
                                                                <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                                                                    Alterar dados d{order.orderType === 'assistance' ? 'a assistência' : order.orderType === 'budget' ? 'o orçamento' : order.orderType === 'return' ? 'a devolução' : 'a venda'}
                                                                </span>
                                                            </div>
                                                        </button>

                                                        <div className="h-[1px] bg-slate-100 dark:bg-slate-800 my-1" />

                                                        {buttons.filter(btn => {
                                                            if (btn.key === 'sendCustomerReviews' && order.orderType === 'assistance') return false;
                                                            if (btn.orderTypes && !btn.orderTypes.includes(order.orderType || 'sale')) return false;
                                                            
                                                            const hasReturn = !!(
                                                                order.returnOrderId ||
                                                                order.orderType === 'return' ||
                                                                order.status === 'returned' ||
                                                                (order as any).hasReturn ||
                                                                (order as any).returned ||
                                                                (order.order_data as any)?.returnOrderId ||
                                                                (order.order_data as any)?.returned ||
                                                                (order.order_data as any)?.status === 'returned'
                                                            );

                                                            if (btn.key === 'generateReturn' && hasReturn) return false;
                                                            if (btn.key === 'undoReturn' && !hasReturn) return false;
                                                            
                                                            return true;
                                                        }).map((btn) => {
                                                            const isPrintReceipt = btn.key === 'printReceipt';
                                                            const disablePrintReceipt = isPrintReceipt && (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor");
                                                            return (
                                                            <button
                                                                key={btn.key}
                                                                    disabled={disablePrintReceipt}
                                                                    onClick={async (e) => {
                                                                        e.stopPropagation();
                                                                        if (disablePrintReceipt) return;
                                                                        
                                                                        if (btn.action === 'UNDO_RETURN') {
                                                                            if (window.confirm("Deseja realmente cancelar esta devolução? Ela ainda não foi atendida e não gerou entrada no estoque.")) {
                                                                                try {
                                                                                    await undoReturn(order);
                                                                                    toast.success("Devolução cancelada com sucesso!");
                                                                                    // Refresh happens via subscription or parent refresh
                                                                                } catch (err: any) {
                                                                                    toast.error("Erro ao desfazer devolução: " + err.message);
                                                                                }
                                                                            }
                                                                        } else {
                                                                            onAction(btn.key, order);
                                                                        }
                                                                        setShowMenu(false);
                                                                    }}
                                                                    className={`flex items-center justify-between w-full p-2.5 rounded-xl transition-all ${disablePrintReceipt ? 'opacity-50 cursor-not-allowed text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900/50' : `hover:bg-slate-50 dark:hover:bg-slate-800 group/item ${btn.color}`}`}
                                                                    title={disablePrintReceipt ? 'Não é possível imprimir recibo sem cliente associado' : btn.tooltip}
                                                            >
                                                                <div className="flex items-center gap-3 text-left">
                                                                    <i className={`bi ${btn.icon} text-lg`} />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest">
                                                                        {typeof btn.label === 'function' ? btn.label(order) : btn.label}
                                                                    </span>
                                                                </div>
                                                            </button>
                                                            )
                                                        })}

                                                    </div>
                                                </div>
                                            </div>

                                        </div>
                                </>
                            )}
                        </div>
                    </td>
                );
            default:
                return null;
        }
    };


    return (
        <>
            <tr
            id={id}
                onClick={canViewDetails ? () => onViewDetails?.(order) : undefined}
                className={`relative transition-colors group ${canViewDetails ? 'cursor-pointer' : 'cursor-default'} border-b border-white dark:border-slate-800/50 ${isDraft ? 'border-l-[12px]' : 'border-l-[6px]'} ${rowBorderClass} ${showMenu || showPicker ? 'z-[150]' : ''} ${cellBgClass} ${isSelected ? cls.rowActive : ''} ${isHighlighted ? 'animate-highlight' : ''}`}
        >
            {/* Row Checkbox */}
                <td className={`p-0 w-12 text-center border-b border-white dark:border-slate-800/50 ${isDraft ? 'border-l-[12px]' : 'border-l-[6px]'} ${rowBorderClass} ${cellBgClass}`}>
                <label
                    className="flex items-center justify-center w-full h-full cursor-pointer py-1.5 px-2"
                    onClick={(e) => e.stopPropagation()}
                >
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => onToggleSelection?.()}
                        className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                    />
                </label>
            </td>

            {orderedColumnKeys ? orderedColumnKeys.map(key => renderCell(key)) : (
                <>
                    {renderCell('id')}
                    {renderCell('orderDate')}
                    {renderCell('deliveryDate')}
                    {renderCell('customer')}
                    {renderCell('totalValue')}
                    {renderCell('status')}
                    {renderCell('actions')}
                </>
            )}
        </tr>
        <style dangerouslySetInnerHTML={{ __html: `
            @keyframes blink {
                0% { opacity: 1; transform: scale(1); }
                50% { opacity: 0.4; transform: scale(0.92); }
                100% { opacity: 1; transform: scale(1); }
            }
            .animate-blink { animation: blink 1.2s ease-in-out infinite; }
        `}} />
        </>
    );
};

export default OrderHistoryRow;
