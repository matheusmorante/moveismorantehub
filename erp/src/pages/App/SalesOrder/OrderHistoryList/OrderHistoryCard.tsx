import React from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";
import StockCheckModal from "./StockCheckModal";
import { getSettings } from '@/pages/utils/settingsService';
import { formatCurrency, formatToBRDate } from "../../../utils/formatters";
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";
import { buttons } from "../OrderActions/orderActionsConfig";

interface OrderHistoryCardProps {
    order: Order;
    onEdit: (order: Order) => void;
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
    onFilterByOrderId
}: OrderHistoryCardProps) => {
    const settings = getSettings();
    const [showMenu, setShowMenu] = React.useState(false);
    const [showPicker, setShowPicker] = React.useState(false);
    const [showBlingConfirm, setShowBlingConfirm] = React.useState(false);
    const [showFulfillmentConfirm, setShowFulfillmentConfirm] = React.useState(false);
    const [isStockCheckModalOpen, setIsStockCheckModalOpen] = React.useState(false);
    const [menuPosition, setMenuPosition] = React.useState({ top: 'auto' as number | string, bottom: 'auto' as number | string, right: 0 });
    const menuButtonRef = React.useRef<HTMLButtonElement>(null);

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

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const isDraft = order.status === 'draft';
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

    const isHandlingAssembly = (item: any) => {
        const hLabel = normalize(item.handlingType);
        const opt = getMatchingOption(hLabel);
        return opt?.includeInAssemblySchedule || false;
    };

    const isHandlingOutside = (item: any) => {
        const hLabel = normalize(item.handlingType);
        const opt = getMatchingOption(hLabel);
        return opt?.isAssemblyOutside || false;
    };

    const allOrderItems = [...(order.items || []), ...(order.assistanceItems || [])];
    const hasAssemblyConfig = allOrderItems.some(isHandlingAssembly);
    const isAssemblyOutside = allOrderItems.some(isHandlingOutside);

    // Marketing Origin Logic
    const mOrigin1 = (order.marketingOrigin || "").toLowerCase();
    const mOrigin2 = (((order as any).customerData?.marketingOrigin) || "").toLowerCase();
    const isPaidTraffic = 
        mOrigin1 === 'paid' || mOrigin1.includes('pago') || mOrigin1.includes('ads') || mOrigin1.includes('facebook') || mOrigin1.includes('insta') || mOrigin1.includes('trafego') || mOrigin1.includes('tráfego') || mOrigin1.includes('google') ||
        mOrigin2 === 'paid' || mOrigin2.includes('pago') || mOrigin2.includes('ads') || mOrigin2.includes('facebook') || mOrigin2.includes('insta') || mOrigin2.includes('trafego') || mOrigin2.includes('tráfego') || mOrigin2.includes('google');
    
    // Delivery Date calculation
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
    
    // Explicit colors to match legend and be visible
    const cardBgClass = 
        (order.orderType === 'budget'
            ? (isDraft ? 'bg-indigo-50/50 dark:bg-indigo-950/20' : 'bg-indigo-100/80 dark:bg-indigo-900/40')
            : (isDraft 
                ? 'bg-slate-100/80 dark:bg-slate-900/40' 
                : (colorKey === 'green' 
                    ? 'bg-green-100 dark:bg-green-950/40' 
                    : (colorKey === 'purple' 
                        ? 'bg-purple-100 dark:bg-purple-900/50' 
                        : (colorKey === 'orange' 
                            ? 'bg-orange-100/40 dark:bg-orange-900/40' 
                            : cls.rowHover)))));

    return (
        <div 
            id={id}
            className={`${cardBgClass} ${isDraft ? 'border-l-[12px] border-slate-300 dark:border-slate-600' : 'border-l-[6px] ' + cls.cardBorder.split(' ')[0].replace('border-', 'border-l-')} border-y border-r ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-800'} ${isHighlighted ? 'animate-highlight' : ''} rounded-xl p-3 shadow-sm active:scale-[0.98] transition-all relative ${order.status === 'cancelled' ? 'opacity-50 brightness-75 grayscale-[0.2]' : ''}`}
            onClick={() => onEdit(order)}
        >
            <div className="flex justify-between items-start mb-2.5">
                <div className="flex items-center gap-2">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection?.();
                        }}
                        className="w-5 h-5 text-blue-600 bg-white border-slate-300 rounded-md focus:ring-blue-500 dark:focus:ring-blue-600 dark:ring-offset-slate-900 focus:ring-2 dark:bg-slate-800 dark:border-slate-700 cursor-pointer"
                    />
                    <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                            #{order.id?.slice(-6).toUpperCase()}
                        </span>
                        {(() => {
                            const isAssistance = order.orderType === 'assistance';
                            const isPickup = order.shipping?.deliveryMethod === 'pickup';
                            const typeIcon = isAssistance ? 'bi-tools' : (isPickup ? 'bi-hand-index-thumb-fill' : 'bi-truck');
                            const typeColor = isAssistance ? 'text-orange-500' : (isPickup ? 'text-purple-500' : 'text-green-600');
                            return (
                                <div className="flex items-center gap-2 px-2 py-0.5 rounded-md bg-white/50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                                    <i className={`bi ${typeIcon} ${typeColor} text-[10px]`} title={isAssistance ? 'Assistência' : (isPickup ? 'Retirada' : 'Entrega')} />
                                    
                                    {isPaidTraffic && (
                                        <i className="bi bi-megaphone-fill text-indigo-600 dark:text-indigo-400 text-[9px]" title="Tráfego Pago/Ads" />
                                    )}

                                    {!showTrash && (
                                        <div className="flex items-center gap-1 border-r border-slate-200 dark:border-slate-700 pr-1.5 mr-1">
                                            <button 
                                                onClick={(e) => { e.stopPropagation(); setIsStockCheckModalOpen(true); }}
                                                className={`flex items-center gap-0.5 px-1 py-0.5 rounded border transition-all text-[8px] font-black uppercase tracking-tight ${
                                                    order.isStockChecked 
                                                    ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-900/20' 
                                                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-900/30 animate-pulse'
                                                }`}
                                                title={order.isStockChecked ? "Etiquetado" : "Não Etiquetado"}
                                            >
                                                <i className={`bi ${order.isStockChecked ? 'bi-check2-circle' : 'bi-exclamation-circle-fill'} text-[7px]`} />
                                                <span>{order.isStockChecked ? "Sim" : "Não"}</span>
                                            </button>

                                            <StockCheckModal
                                                isOpen={isStockCheckModalOpen}
                                                onClose={() => setIsStockCheckModalOpen(false)}
                                                order={order}
                                                onStockCheckUpdate={onStockCheckUpdate!}
                                            />
                                        </div>
                                    )}

                                    {order.orderType !== 'assistance' && !showTrash && (
                                        <div className="flex items-center gap-0.5" title={order.isRegisteredInBling ? "Lançado no Bling" : "Falta Lançar Bling"}>
                                            <span className={`text-[9px] font-black ${order.isRegisteredInBling ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-red-400 animate-pulse'}`}>B</span>
                                            <i className={`bi ${order.isRegisteredInBling ? 'bi-patch-check-fill text-emerald-500' : 'bi-exclamation-circle-fill text-rose-500 animate-pulse'} text-[8px]`} />
                                        </div>
                                    )}

                                    {order.stockProcessed && (
                                        <i className="bi bi-box-seam-fill text-emerald-600 dark:text-emerald-400 text-[9px]" title="Saída de Estoque Procesada" />
                                    )}

                                    {order.shipping?.scheduling?.pendingScheduling && (
                                        <i className="bi bi-clock-history text-orange-500 text-[9px] animate-pulse" title="Agendamento Pendente" />
                                    )}

                                    {hasAssemblyConfig && (
                                        <div className={`flex items-center gap-0.5 ${isAssemblyOutside ? 'text-red-600 animate-pulse' : 'text-yellow-600'}`} title={isAssemblyOutside ? 'Montagem Fora' : 'Montagem Depósito'}>
                                            <i className="bi bi-hammer text-[10px]" />
                                            {isAssemblyOutside && <i className="bi bi-house-door-fill text-[8px]" />}
                                        </div>
                                    )}
                                </div>
                            );
                        })()}
                    </div>
                    {order.orderType === 'assistance' && order.linkedOrderId && (
                        <div className="flex items-center gap-1.5 ml-2">
                            <button 
                                onClick={(e) => { e.stopPropagation(); onFilterByOrderId?.(order.linkedOrderId!); }}
                                className="flex items-center gap-1 text-[9px] font-black uppercase text-blue-500 hover:text-blue-600 transition-colors tracking-widest bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-1.5 py-0.5 rounded-md w-fit"
                                title="Filtrar por pedido vinculado"
                            >
                                <i className="bi bi-link-45deg"></i>
                                Vinc: {order.linkedOrderId.slice(-6).toUpperCase()}
                            </button>
                        </div>
                    )}
                </div>
                
                <div className="relative" onClick={(e) => e.stopPropagation()}>
                    <button 
                        onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
                        className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-${currentStatus.color}-50 dark:bg-${currentStatus.color}-900/10 border border-${currentStatus.color}-100 dark:border-${currentStatus.color}-900/20 active:scale-95 transition-all`}
                    >
                        <div className={`w-1 h-1 rounded-full bg-${currentStatus.color}-500 animate-pulse`} />
                        {currentStatus.id === 'draft' && <i className={`bi bi-clock text-[9px] text-${currentStatus.color}-600 dark:text-${currentStatus.color}-400 animate-pulse`} title="Rascunhos duram apenas 7 dias" />}
                        <span className={`text-[8px] font-black uppercase tracking-widest text-${currentStatus.color}-600 dark:text-${currentStatus.color}-400`}>
                            {currentStatus.label}
                        </span>
                        <i className={`bi bi-chevron-down text-[7px] text-${currentStatus.color}-400 ml-0.5`} />
                    </button>

                    {showPicker && (
                        <>
                            <div className="fixed inset-0 z-10" onClick={() => setShowPicker(false)} />
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

            <div className="mb-3">
                <h3 className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight">
                    {order.customerData?.fullName || "Cliente não informado"}
                </h3>
                
                {order.shipping?.scheduling?.pendingScheduling && (
                    <div className="mt-2 flex items-center gap-2 bg-orange-500 text-white p-2 rounded-lg border border-orange-600 animate-pulse shadow-sm">
                        <i className="bi bi-clock-history text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            AGENDAMENTO PENDENTE
                        </span>
                    </div>
                )}
                
                {isOnlyInternalAssembly && (
                    <div className="mt-2 flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 p-2 rounded-lg border border-orange-100 dark:border-orange-900/30 animate-pulse shadow-sm">
                        <i className="bi bi-hammer text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            MONTAGEM NO DEPÓSITO
                        </span>
                    </div>
                )}
                
                {isAssemblyOutside && (
                    <div className="mt-2 flex items-center gap-2 bg-red-600 text-white p-2 rounded-lg border border-red-700 animate-pulse shadow-sm">
                        <i className="bi bi-hammer text-white text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            MONTAGEM FORA
                        </span>
                    </div>
                )}
                
                {/* Redundância do Bling removida para privilegiar o ícone 'B' na barra de badges superior */}

                {/* Manual Fulfillment Prompt */}
                {isPastDelivery && order.status !== 'fulfilled' && order.status !== 'cancelled' && !showTrash && settings.showManualFulfillmentPrompt && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        {!showFulfillmentConfirm ? (
                            <button
                                onClick={() => setShowFulfillmentConfirm(true)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 rounded-lg border border-amber-200 dark:border-amber-900/30 w-fit animate-pulse hover:scale-105 transition-all active:scale-95 shadow-sm"
                                title="A data de entrega passou. Este pedido já foi atendido?"
                            >
                                <i className="bi bi-clock-history text-[10px]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Pedido Atendido?</span>
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

                {/* Review Request Button */}
                {order.orderType !== 'assistance' && order.status === 'fulfilled' && !order.reviewRequested && !showTrash && !(order.shipping?.deliveryMethod === 'pickup' && (order.customerData?.fullName === "Consumidor Final" || order.customerData?.fullName === "Ao Consumidor")) && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        <button
                            onClick={() => onAction("sendCustomerReviews", order)}
                            className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 rounded-lg border border-yellow-100 dark:border-yellow-900/30 w-fit animate-pulse hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-all active:scale-95 cursor-pointer shadow-sm"
                        >
                            <i className="bi bi-star-fill text-[10px]" />
                            <span className="text-[9px] font-black uppercase tracking-widest">Enviar Avaliação</span>
                        </button>
                    </div>
                )}

                {/* Review Already Requested Label */}
                {order.orderType !== 'assistance' && order.status === 'fulfilled' && order.reviewRequested && !showTrash && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900/20 w-fit shadow-sm">
                        <i className="bi bi-star-half text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Avaliação Solicitada</span>
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
                        <div className="flex flex-col">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">
                                {order.shipping?.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
                            </span>
                            <div className={`flex items-center gap-1.5 font-bold ${order.shipping?.scheduling?.pendingScheduling ? 'text-slate-400 dark:text-slate-500' : 'text-blue-500 dark:text-blue-400'}`}>
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
                            <div className="col-span-2 mt-0.5">
                                <div className="inline-flex items-center gap-1.5 px-2 py-0.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-md border border-blue-100 dark:border-blue-900/30">
                                    <i className="bi bi-clock-history text-[10px]" />
                                    <span className="text-[9px] font-black uppercase tracking-widest">{timeDisplay}</span>
                                </div>
                            </div>
                        );
                    })()}
                </div>
            </div>

            <div className="flex justify-between items-center border-t border-slate-50 dark:border-slate-800/50 pt-2.5">
                <div className="flex flex-col">
                    <span className="text-[9px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest mb-0.5">
                        Total
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
                            <button
                                onClick={() => onPermanentDelete(order.id!)}
                                className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 transition-colors"
                            >
                                <i className="bi bi-trash3-fill text-lg" />
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => onEdit(order)}
                                className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 transition-colors"
                            >
                                <i className="bi bi-pencil-fill text-lg" />
                            </button>
                            
                            <div className="relative">
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
                                    className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"
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
                                                {buttons.filter(btn => {
                                                    if (btn.key === 'sendCustomerReviews' && order.orderType === 'assistance') return false;
                                                    if (btn.orderTypes && !btn.orderTypes.includes(order.orderType || 'sale')) return false;
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
                                                        className={`flex items-center justify-between w-full p-2.5 rounded-lg transition-all ${disablePrintReceipt ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-50 dark:bg-slate-900/50' : `hover:bg-slate-50 dark:hover:bg-slate-800 ${btn.color}`}`}
                                                        title={disablePrintReceipt ? 'Não é possível imprimir recibo sem cliente associado' : btn.tooltip}
                                                >
                                                    <div className="flex items-center gap-3">
                                                        <i className={`bi ${btn.icon} text-base`} />
                                                        <span className="text-[9px] font-black uppercase tracking-widest">
                                                            {typeof btn.label === 'function' ? btn.label(order) : btn.label}
                                                        </span>
                                                    </div>
                                                    {order.isButtonsClicked?.[btn.key] && (
                                                        <i className="bi bi-check-circle-fill text-emerald-500 animate-in zoom-in-50 duration-300" />
                                                    )}
                                                </button>
                                                )
                                            })}
                                            <div className="border-t border-slate-50 dark:border-slate-800/50 my-1" />
                                            <button
                                                onClick={() => {
                                                    onDelete(order.id!);
                                                    setShowMenu(false);
                                                }}
                                                className="flex items-center gap-3 w-full p-2.5 rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                            >
                                                <i className="bi bi-trash-fill text-base" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Lixeira</span>
                                            </button>
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
