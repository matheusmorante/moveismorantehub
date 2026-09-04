import React from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { formatCurrency, formatToBRDate, toTitleCase } from "../../../utils/formatters";
import { formatOrderCode } from "../../../utils/orderCode";
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";
import { Drill } from "@/components/shared/DrillIcon";
import InventoryMovementBadge from "./InventoryMovementBadge";
import CancelledOrderBadge from "./CancelledOrderBadge";
import PostSaleActionMenuButton, { isPostSaleAction } from "./PostSaleActionMenuButton";
import CancelScheduledSaleButton from "./CancelScheduledSaleButton";
import { canGenerateReturn } from "@/pages/utils/returnPolicy";
import { buttons } from "../OrderActions/orderActionsConfig";
import { binaryOrderBadgeClass, warningOrderBadgeClass } from "./orderBadgeStyles";
import { getOrderFulfillmentCountdown } from '@/pages/utils/orderFulfillmentCountdown';

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
    isSelected,
    onToggleSelection,
    onBlingUpdate,
    onStockCheckUpdate,
    isHighlighted,
    id,
    onFilterByOrderId,
    onViewDetails,
    onShowPostSaleActions
}: OrderHistoryCardProps) => {
    const settings = getSettings();
    const [showMenu, setShowMenu] = React.useState(false);
    const [showPicker, setShowPicker] = React.useState(false);
    const [showFulfillmentConfirm, setShowFulfillmentConfirm] = React.useState(false);
    const [menuPosition, setMenuPosition] = React.useState({ top: 'auto' as number | string, bottom: 'auto' as number | string, right: 0 });
    const menuButtonRef = React.useRef<HTMLButtonElement>(null);
    const canViewDetails = ['scheduled', 'fulfilled', 'cancelled'].includes(order.status || '');

    React.useEffect(() => {
        if (showMenu) {
            const handleScroll = (e: Event) => {
                // Ignore scroll events from the menu itself to avoid instant closing
                if ((e.target as HTMLElement)?.closest?.('.portal-menu-container')) return;
                setShowMenu(false);
            }
            window.addEventListener('scroll', handleScroll, true);
            return () => window.removeEventListener('scroll', handleScroll, true);
        }
    }, [showMenu]);

    // Auto-dismiss the "Sim/Não" confirmation after 5 seconds with no action
    React.useEffect(() => {
        if (!showFulfillmentConfirm) return;
        const timer = setTimeout(() => setShowFulfillmentConfirm(false), 5000);
        return () => clearTimeout(timer);
    }, [showFulfillmentConfirm]);

    const statuses = (settings.orderStatuses || [
        { id: 'draft', label: 'Rascunho', color: 'slate' },
        { id: 'scheduled', label: 'Agendado', color: 'amber' },
        { id: 'fulfilled', label: 'Atendido', color: 'emerald' },
        { id: 'cancelled', label: 'Cancelado', color: 'rose' },
    ]).map(s => s.id === 'draft' ? { ...s, label: 'Rascunho' } : s)
      .filter(s => s.id !== 'chargeback' && s.id !== 'disputed');

    const currentStatus = statuses.find(s => s.id === (order.status || 'draft')) || statuses[0];
    const isStatusBadgeReadOnly = ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');

    const sIcons: Record<string, string> = {
        draft: 'bi-clock',
        scheduled: 'bi-calendar3',
        fulfilled: 'bi-check-circle-fill',
        cancelled: 'bi-x-circle-fill',
    };
    const sIcon = sIcons[order.status || 'draft'] || 'bi-dot';

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const isDraft = order.status === 'draft';
    const isCancelled = order.status === 'cancelled';
    const isEditLocked = (order.status === 'fulfilled' || isCancelled) && ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');
    const canReconcileTemporaryProducts = order.status === 'fulfilled' && order.orderType === 'sale' && (order.items || []).some(item => !item.productId?.trim() || item.isTemporaryProduct);
    const cls = getOrderTypeClasses(isDraft ? 'slate' : colorKey as any);

    const allOptions = [
        ...(settings.deliveryHandlingOptions || []),
        ...(settings.pickupHandlingOptions || [])
    ];

    const normalize = (str: string) => (str || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    
    const getMatchingOption = (hLabel: string) => {
        if (!hLabel) return null;
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
    const hasTemporaryItems = order.items?.some(item => !item.productId || item.productId.trim() === '') || false;
    const orderHandling = normalize(
        (order as any).handlingType || (order as any).handling ||
        (order.shipping as any)?.handlingType || (order.shipping as any)?.handling || ''
    );
    const isOrderAssemblyOutside = orderHandling.includes('montagem fora') || orderHandling.includes('montagem na entrega') || orderHandling.includes('montagem no endereco');
    const isOrderAssemblyDepot = orderHandling.includes('montagem no deposito') || orderHandling.includes('montagem para retirada') || orderHandling.includes('montagem no depósito');

    const hasAssemblyOutside = isOrderAssemblyOutside || allOrderItems.some(isHandlingOutside);
    const hasAssemblyDepot = isOrderAssemblyDepot || allOrderItems.some(isHandlingDepot);

    // Marketing Origin Logic
    const mOrigin1 = (order.marketingOrigin || "").toLowerCase();
    const mOrigin2 = (((order as any).customerData?.marketingOrigin) || "").toLowerCase();
    const isPaidTraffic = 
        mOrigin1 === 'paid' || mOrigin1.includes('pago') || mOrigin1.includes('ads') || mOrigin1.includes('facebook') || mOrigin1.includes('insta') || mOrigin1.includes('trafego') || mOrigin1.includes('tráfego') || mOrigin1.includes('google') ||
        mOrigin2 === 'paid' || mOrigin2.includes('pago') || mOrigin2.includes('ads') || mOrigin2.includes('facebook') || mOrigin2.includes('insta') || mOrigin2.includes('trafego') || mOrigin2.includes('tráfego') || mOrigin2.includes('google');

    // Fulfillment countdown e data de entrega vencida
    const countdown = getOrderFulfillmentCountdown(order);
    const isPastDelivery = countdown.isPastDelivery;

    // Card header accent colors
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

    return (
        <div 
            id={id}
            onClick={isDraft ? () => onEdit(order) : (canViewDetails ? () => onViewDetails?.(order) : undefined)}
            className={`bg-white dark:bg-slate-900 min-h-fit border border-slate-200 dark:border-slate-800 ${isHighlighted ? 'animate-highlight' : ''} rounded-xl shadow-none transition-all relative overflow-visible ${isDraft || canViewDetails ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {order.status === 'cancelled' && <CancelledOrderBadge tilted large />}

            {/* Card Header com faixa colorida + todos os badges alinhados no canto superior direito */}
            <div className={`${headerAccentClass} rounded-t-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap`}>
                {/* Lado Esquerdo: ID do Pedido */}
                <div className="flex items-center gap-2 shrink-0">
                    <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                        #{formatOrderCode(order)}
                    </span>
                </div>

                {/* Canto Superior Direito: Todos os Selos + Status Picker */}
                <div className={`flex items-center gap-1.5 flex-wrap justify-end ml-auto ${isCancelled ? 'opacity-70 pointer-events-none' : ''}`} onClick={isCancelled ? undefined : (e) => e.stopPropagation()}>
                    {/* 1. Selo de Etiquetado (Clicável: Bg Verde + Ícone Branco + Check no canto quando true) */}
                    {!showTrash && order.orderType !== 'assistance' && order.orderType !== 'return' && (
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => onStockCheckUpdate?.(order.id!, !order.isStockChecked)}
                                className={`relative flex h-6 w-6 items-center justify-center rounded-md border cursor-pointer select-none transition-all hover:scale-105 shadow-2xs ${binaryOrderBadgeClass(Boolean(order.isStockChecked))}`}
                                title={order.isStockChecked ? "Etiquetado (Clique para desmarcar)" : "Não Etiquetado (Clique para marcar)"}
                            >
                                <i className="bi bi-tag-fill text-[11px] text-white" />
                                {order.isStockChecked && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                        <i className="bi bi-check text-[8px] font-black leading-none" />
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* 2. Selo do Bling (Clicável: Bg Verde + Texto Branco + Check no canto quando true) */}
                    {order.orderType !== 'assistance' && order.orderType !== 'return' && !showTrash && order.status !== 'draft' && order.status !== 'cancelled' && (
                        <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
                            <button
                                type="button"
                                onClick={() => onBlingUpdate?.(order.id!, !order.isRegisteredInBling)}
                                className={`relative flex h-6 items-center justify-center px-2 rounded-md border cursor-pointer select-none transition-all hover:scale-105 shadow-2xs text-[8px] font-black uppercase ${binaryOrderBadgeClass(Boolean(order.isRegisteredInBling))}`}
                                title={order.isRegisteredInBling ? 'Lançado no Bling (Clique para alternar)' : 'Falta Lançar no Bling (Clique para marcar)'}
                            >
                                <span className="text-white">Bling</span>
                                {order.isRegisteredInBling && (
                                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-800 text-white shadow-2xs ring-1 ring-white dark:ring-slate-900 pointer-events-none">
                                        <i className="bi bi-check text-[8px] font-black leading-none" />
                                    </span>
                                )}
                            </button>
                        </div>
                    )}

                    {/* 3. Selo de Entrega / Retirada / Assistência */}
                    {(() => {
                        const isAssis = order.orderType === 'assistance';
                        const isRet = order.orderType === 'return';
                        const isPick = order.shipping?.deliveryMethod === 'pickup';
                        const typeIcon = isAssis ? 'bi-tools' : (isRet ? 'bi-arrow-return-left' : (isPick ? 'bi-shop' : 'bi-truck'));
                        return (
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
                                <i className={`bi ${typeIcon} text-[11px] text-white`} />
                            </div>
                        );
                    })()}

                    {/* 4. Tráfego Pago / Ads */}
                    {isPaidTraffic && order.orderType !== 'return' && (
                        <div 
                            className="flex items-center justify-center h-6 w-6 rounded-md bg-orange-500 text-white border border-orange-600 shadow-2xs"
                            title="Gerado por Tráfego Pago"
                        >
                            <i className="bi bi-megaphone-fill text-[11px] text-white" />
                        </div>
                    )}

                    {/* 5. Selo de Estoque */}
                    {(order.orderType === 'sale' || order.orderType === 'showroom' || order.orderType === 'return') && (
                        <InventoryMovementBadge 
                            orderType={order.orderType} 
                            order={order}
                            hasMovement={order.orderType === 'return' ? Boolean(order.returnStockProcessed) : Boolean(order.stockProcessed)} 
                            isReversed={order.orderType === 'return' ? Boolean(order.returnStockReversed) : Boolean(order.stockReversed)}
                            isPartial={order.isPartialStockProcessed}
                        />
                    )}

                    {/* 6. Return Status Badge */}
                    {order.returnOrderId && (
                        <div 
                            className={`flex h-6 items-center gap-1 rounded-md border px-2 shadow-sm ${warningOrderBadgeClass}`}
                            title={`Este pedido possui uma devolução ${order.returnKind === 'complete' ? 'completa' : 'parcial'} vinculada`}
                        >
                            <i className="bi bi-arrow-return-left text-[10px]" />
                            <span className="text-[8px] font-black uppercase tracking-wider">Devolução {order.returnKind === 'complete' ? 'completa' : 'parcial'}</span>
                        </div>
                    )}

                    {/* 7. Pending Scheduling Badge */}
                    {order.shipping?.scheduling?.pendingScheduling && (
                        <div 
                            className="flex items-center gap-1.5 px-2 h-6 bg-orange-500 text-white rounded-md border border-orange-600 shadow-sm"
                            title="AGENDAMENTO PENDENTE"
                        >
                            <i className="bi bi-clock-history text-[10px]" />
                            <span className="text-[9px] font-black uppercase tracking-widest leading-none">Agendamento Pendente</span>
                        </div>
                    )}

                    {order.orderType !== 'return' && hasAssemblyOutside && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-red-600 text-white border-red-700 shadow-xs" title="Montagem Fora">
                            <Drill className="h-3.5 w-3.5 text-white" />
                        </span>
                    )}

                    {order.orderType !== 'return' && hasAssemblyDepot && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-amber-500 text-white border-amber-600 shadow-xs" title="Montagem no Depósito">
                            <Drill className="h-3.5 w-3.5 text-white" />
                        </span>
                    )}

                    {/* 8. Status Picker Button */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); if (!isStatusBadgeReadOnly) setShowPicker(!showPicker); }}
                            className={`flex items-center justify-center h-6 w-6 rounded-md ${order.status === 'cancelled' ? 'bg-red-600 border border-red-700' : order.status === 'draft' ? 'bg-slate-400 dark:bg-slate-600 border border-slate-500 dark:border-slate-600' : `bg-${currentStatus.color}-500`} text-white transition-all shadow-2xs border border-black/10 ${isStatusBadgeReadOnly ? 'cursor-default' : 'hover:brightness-110 active:scale-95'}`}
                            title={`Status: ${currentStatus.label}`}
                        >
                            <i className={`bi ${sIcon} text-white text-[11px]`} />
                        </button>

                        {!isStatusBadgeReadOnly && showPicker && (
                            <>
                                <div className="fixed inset-0 z-10" onClick={(e) => setShowPicker(false)} />
                                <div className="absolute top-full right-0 mt-1 w-36 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-[100] p-1.5 flex flex-col gap-1 animate-slide-up">
                                    {statuses.map((s) => (
                                        <button
                                            key={s.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                onStatusUpdate(order.id!, s.id as any);
                                                setShowPicker(false);
                                            }}
                                            className={`flex items-center gap-2.5 w-full p-2 rounded-lg transition-all hover:bg-slate-50 dark:hover:bg-slate-800 ${order.status === s.id ? 'bg-blue-50/50 dark:bg-blue-900/10' : ''}`}
                                        >
                                            <div className={`w-1.5 h-1.5 rounded-full bg-${s.color}-500`} />
                                            <span className={`text-[9px] font-black uppercase tracking-widest ${order.status === s.id ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400'}`}>
                                                {s.label}
                                            </span>
                                        </button>
                                    ))}
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>{/* fim do header colorido */}

            {/* Corpo neutro do card */}
            <div className="px-3 pt-2.5 pb-3">
                <h3 
                    onClick={isCancelled || isEditLocked ? undefined : () => onEdit(order)}
                    className={`text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight transition-colors w-fit ${isCancelled ? 'cursor-pointer' : (isEditLocked ? 'cursor-default' : 'cursor-pointer hover:text-blue-600 dark:hover:text-blue-400')}`}
                    title={isCancelled ? 'Pedido cancelado (clique para ver detalhes)' : (isEditLocked ? 'Pedido atendido não pode ser editado' : 'Clique para editar o pedido')}
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

                {order.shipping?.scheduling?.pendingScheduling && (
                    <div className="mt-2 flex items-center gap-2 bg-orange-500 text-white p-2 rounded-lg border border-orange-600 shadow-sm">
                        <i className="bi bi-clock-history text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            AGENDAMENTO PENDENTE
                        </span>
                    </div>
                )}

                {/* Manual Fulfillment Prompt com subtítulo de contagem regressiva */}
                {isPastDelivery && order.status !== 'fulfilled' && order.status !== 'cancelled' && !showTrash && settings.showManualFulfillmentPrompt && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        {!showFulfillmentConfirm ? (
                            <button
                                onClick={() => setShowFulfillmentConfirm(true)}
                                className="flex flex-col items-start px-2.5 py-1.5 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 rounded-lg border border-amber-200 dark:border-amber-800/40 w-fit hover:scale-105 transition-all active:scale-95 shadow-sm text-left cursor-pointer"
                                title="A data de entrega passou. Este pedido já foi atendido?"
                            >
                                <div className="flex items-center gap-1.5">
                                    <i className="bi bi-clock-history text-[10px]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">Pedido Atendido?</span>
                                </div>
                                {countdown.countdownLabel && (
                                    <span className="text-[8px] font-bold text-amber-600 dark:text-amber-500 tracking-tight mt-0.5">
                                        {countdown.countdownLabel}
                                    </span>
                                )}
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg animate-slide-up w-fit">
                                <span className="text-[9px] font-black uppercase text-slate-500 ml-1">Confirmar?</span>
                                <div className="flex gap-1">
                                    <button
                                        onClick={() => {
                                            onStatusUpdate(order.id!, 'fulfilled');
                                            setShowFulfillmentConfirm(false);
                                        }}
                                        className="px-2.5 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        Sim
                                    </button>
                                    <button
                                        onClick={() => setShowFulfillmentConfirm(false)}
                                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Não
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                <div className="grid grid-cols-2 gap-x-4 gap-y-2 mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/40">
                    <div className="flex flex-col">
                        <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">Pedido</span>
                        <div className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400 font-bold">
                            <i className="bi bi-calendar3 text-[10px]" />
                            <span className="text-[10px]">{formatToBRDate(order.date)}</span>
                        </div>
                    </div>

                    { (order.shipping?.scheduling?.date || order.shipping?.scheduling?.pendingScheduling) && (
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">
                                {order.orderType === 'return' ? 'Data de coleta' : (order.shipping?.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega')}
                            </span>
                            <div className={`flex items-center justify-end gap-1.5 font-bold ${order.shipping?.scheduling?.pendingScheduling ? 'text-slate-400 dark:text-slate-500' : 'text-blue-500 dark:text-blue-400'}`}>
                                <i className={`bi ${order.shipping?.scheduling?.pendingScheduling ? 'bi-clock-history text-orange-500' : 'bi-truck'} text-[11px]`} />
                                <span className="text-[10px]">
                                    {order.shipping?.scheduling?.pendingScheduling 
                                        ? 'PENDENTE'
                                        : (order.shipping.scheduling.dateType === 'range' && order.shipping.scheduling.endDate 
                                            ? `${formatToBRDate(order.shipping.scheduling.date)} até ${formatToBRDate(order.shipping.scheduling.endDate)}`
                                            : formatToBRDate(order.shipping.scheduling.date))}
                                </span>
                            </div>
                        </div>
                    )}

                    {(() => {
                        const sched = order.shipping?.scheduling;
                        let timeDisplay = "";
                        if (sched) {
                            if (sched.notInformed) timeDisplay = "Não informado";
                            else if (sched.type === 'range' && sched.startTime && sched.endTime) timeDisplay = `${sched.startTime} às ${sched.endTime}`;
                            else if (sched.startTime) timeDisplay = sched.startTime;
                            else if (sched.time) timeDisplay = sched.time;
                        }
                        if (!timeDisplay) return null;
                        return (
                            <div className="col-span-2 mt-0.5 flex justify-end">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-900/30">
                                    <i className="bi bi-clock-history text-[10px]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{timeDisplay}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

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
                    {showTrash ? (
                        <>
                            <button
                                onClick={() => onRestore(order.id!)}
                                className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <i className="bi bi-arrow-counterclockwise text-lg" />
                            </button>
                        </>
                    ) : (
                        <>
                            {/* Botão de Editar visível apenas para pedidos ativos/agendados (não cancelados, não atendidos e não rascunhos) */}
                            {!isEditLocked && !isCancelled && !isDraft && (
                                <button
                                    onClick={() => onEdit(order)}
                                    className="p-2 rounded-lg transition-colors bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400"
                                    title="Editar pedido"
                                >
                                    <i className="bi bi-pencil-fill text-lg" />
                                </button>
                            )}
                            
                            <div className="relative z-20">
                                <button
                                    ref={menuButtonRef}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (!showMenu && menuButtonRef.current) {
                                            const rect = menuButtonRef.current.getBoundingClientRect();
                                            const spaceBelow = window.innerHeight - rect.bottom;
                                            if (spaceBelow < 280) {
                                                setMenuPosition({ top: 'auto', bottom: window.innerHeight - rect.top + 8, right: window.innerWidth - rect.right });
                                            } else {
                                                setMenuPosition({ top: rect.bottom + 8, bottom: 'auto', right: window.innerWidth - rect.right });
                                            }
                                        }
                                        setShowMenu(!showMenu);
                                    }}
                                    className={`p-2 rounded-lg transition-colors ${isCancelled ? 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 shadow-sm cursor-pointer' : 'bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100'}`}
                                    title={isCancelled ? "Mais opções (Copiar pedido)" : "Mais opções"}
                                >
                                    <i className="bi bi-three-dots-vertical text-lg" />
                                </button>

                                {showMenu && typeof document !== 'undefined' && createPortal(
                                    <div className="portal-menu-container">
                                        <div className="fixed inset-0 z-[9990]" onClick={(e) => { e.stopPropagation(); setShowMenu(false); }} />
                                        <div className="fixed w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-[0_10px_40px_-10px_rgba(0,0,0,0.3)] z-[9999] p-1.5 flex flex-col gap-1 animate-slide-up"
                                             style={{ top: menuPosition.top, bottom: menuPosition.bottom, right: menuPosition.right }}
                                             onClick={(e) => e.stopPropagation()}
                                        >
                                                {isCancelled ? (
                                                    <button
                                                        type="button"
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            onAction('duplicateOrder', order);
                                                            setShowMenu(false);
                                                        }}
                                                        className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-emerald-600 hover:bg-emerald-50 dark:text-emerald-400 dark:hover:bg-emerald-950/30 transition-all cursor-pointer"
                                                        title="Criar uma cópia deste pedido"
                                                    >
                                                        <i className="bi bi-files text-lg" />
                                                        <span className="text-xs font-black uppercase tracking-widest">
                                                            Copiar Pedido
                                                        </span>
                                                    </button>
                                                ) : isDraft ? (
                                                    <>
                                                        {/* Opção de Retomar Cadastramento */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onEdit(order);
                                                                setShowMenu(false);
                                                            }}
                                                            className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-950/30 transition-all cursor-pointer"
                                                            title="Retomar cadastramento do pedido"
                                                        >
                                                            <i className="bi bi-arrow-repeat text-lg" />
                                                            <span className="text-xs font-black uppercase tracking-widest">
                                                                Retomar Cadastramento
                                                            </span>
                                                        </button>

                                                        {/* Opção de Descartar Rascunho */}
                                                        <button
                                                            type="button"
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                onDelete(order.id!);
                                                                setShowMenu(false);
                                                            }}
                                                            className="flex items-center gap-3 w-full p-2.5 rounded-xl text-left text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/30 transition-all cursor-pointer"
                                                            title="Descartar este rascunho permanentemente"
                                                        >
                                                            <i className="bi bi-trash3-fill text-lg" />
                                                            <span className="text-xs font-black uppercase tracking-widest">
                                                                Descartar Rascunho
                                                            </span>
                                                        </button>
                                                    </>
                                                ) : (
                                                    <>
                                                        {canReconcileTemporaryProducts && (
                                                            <button type="button" onClick={(e) => { e.stopPropagation(); onEdit(order, 2, true, true); setShowMenu(false); }} className="flex w-full items-center gap-3 rounded-xl p-2.5 text-left text-amber-600 transition-all hover:bg-amber-50 dark:text-amber-400 dark:hover:bg-amber-950/30">
                                                                <i className="bi bi-link-45deg text-lg" />
                                                                <span className="text-xs font-black uppercase tracking-widest">Conciliação Comercial</span>
                                                            </button>
                                                        )}
                                                        <PostSaleActionMenuButton
                                                            order={order}
                                                            onOpen={onShowPostSaleActions}
                                                            onCloseMenu={() => setShowMenu(false)}
                                                        />

                                                        {buttons.filter(btn => {
                                                            if (isPostSaleAction(btn.key)) return false;
                                                            if (btn.key === 'sendCustomerReviews' && order.orderType === 'assistance') return false;
                                                            if (btn.orderTypes && !btn.orderTypes.includes(order.orderType || 'sale')) return false;

                                                            const hasReturn = !!(
                                                                order.returnOrderId ||
                                                                order.orderType === 'return' ||
                                                                order.status === 'returned' ||
                                                                (order as any).hasReturn ||
                                                                (order as any).returned ||
                                                                (order as any).order_data?.returnOrderId ||
                                                                (order as any).order_data?.returned ||
                                                                (order as any).order_data?.status === 'returned'
                                                            );

                                                            if (btn.key === 'generateReturn' && (hasReturn || !canGenerateReturn(order))) return false;
                                                            if (btn.key === 'undoReturn' && (!hasReturn || order.status === 'cancelled')) return false;

                                                            return true;
                                                        }).map((btn) => {
                                                            const isPrintReceipt = btn.key === 'printReceipt';
                                                            const disablePrintReceipt = isPrintReceipt && (!order.customerData?.fullName || order.customerData.fullName === "Nenhum" || order.customerData.fullName === "Ao Consumidor");

                                                            return (
                                                                <button
                                                                    key={btn.key}
                                                                    disabled={disablePrintReceipt}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        if (disablePrintReceipt) return;
                                                                        onAction(btn.key, order);
                                                                        setShowMenu(false);
                                                                    }}
                                                                    className={`flex items-center gap-3 w-full p-2.5 rounded-xl transition-all ${disablePrintReceipt ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-50 dark:bg-slate-900/50' : `hover:bg-slate-50 dark:hover:bg-slate-800 ${btn.color}`}`}
                                                                    title={disablePrintReceipt ? 'Não é possível imprimir recibo sem cliente associado' : btn.tooltip}
                                                                >
                                                                    <i className={`bi ${btn.icon} text-lg`} />
                                                                    <span className="text-xs font-black uppercase tracking-widest text-left">
                                                                        {typeof btn.label === 'function' ? btn.label(order) : btn.label}
                                                                    </span>
                                                                </button>
                                                            )
                                                        })}

                                                        <CancelScheduledSaleButton
                                                            order={order}
                                                            onStatusUpdate={onStatusUpdate}
                                                            onCloseMenu={() => setShowMenu(false)}
                                                        />
                                                    </>
                                                )}
                                        </div>
                                    </div>,
                                    document.body
                                )}
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OrderHistoryCard;
