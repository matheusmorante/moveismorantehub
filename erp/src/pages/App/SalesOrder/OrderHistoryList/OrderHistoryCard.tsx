import React from "react";
import { createPortal } from "react-dom";
import Order from "../../../types/order.type";
import { getSettings } from '@/pages/utils/settingsService';
import { formatCurrency, formatToBRDate } from "../../../utils/formatters";
import { formatOrderCode } from "../../../utils/orderCode";
import { getOrderTypeClasses, resolveOrderColor } from "../../../utils/orderTypeColorUtils";
import { buttons } from "../OrderActions/orderActionsConfig";
import { PackageCheck, Package } from "lucide-react";

interface OrderHistoryCardProps {
    order: Order;
    onEdit: (order: Order, initialStep?: number, highlightTemporary?: boolean) => void;
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
    const [showFulfillmentConfirm, setShowFulfillmentConfirm] = React.useState(false);
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
        order.handlingType || order.handling || order.shipping?.handlingType || order.shipping?.handling || ''
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
            className={`bg-white dark:bg-slate-900 min-h-fit border ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-200 dark:border-slate-800'} ${isHighlighted ? 'animate-highlight' : ''} rounded-xl shadow-none transition-all relative overflow-visible ${order.status === 'cancelled' ? 'opacity-50 brightness-75 grayscale-[0.2]' : ''} cursor-default`}
        >
            {/* Card Header com faixa colorida + todos os badges alinhados no canto superior direito */}
            <div className={`${headerAccentClass} rounded-t-xl px-3 py-2 flex items-center justify-between gap-2 flex-wrap`}>
                {/* Lado Esquerdo: Checkbox + ID do Pedido */}
                <div className="flex items-center gap-2 shrink-0">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                            e.stopPropagation();
                            onToggleSelection?.();
                        }}
                        className="w-4 h-4 text-blue-600 bg-white border-slate-300 rounded focus:ring-blue-500 cursor-pointer"
                    />
                    <span className="font-mono text-[10px] font-bold text-slate-500 dark:text-slate-400 bg-white/70 dark:bg-slate-800/80 px-2 py-0.5 rounded-md border border-slate-200/60 dark:border-slate-700/60">
                        #{formatOrderCode(order)}
                    </span>
                </div>

                {/* Canto Superior Direito: Todos os Selos + Status Picker */}
                <div className="flex items-center gap-1.5 flex-wrap justify-end ml-auto">
                    {/* 1. Selo de Etiquetado (Clicável: Bg Verde + Ícone Branco + Check no canto quando true) */}
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
                                title={order.isStockChecked ? "Etiquetado (Clique para desmarcar)" : "Não Etiquetado (Clique para marcar)"}
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

                    {/* 2. Selo do Bling (Clicável: Bg Verde + Texto Branco + Check no canto quando true) */}
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

                    {/* 3. Selo de Entrega / Retirada / Assistência */}
                    {(() => {
                        const isAssis = order.orderType === 'assistance';
                        const isRet = order.orderType === 'return';
                        const isPick = order.shipping?.deliveryMethod === 'pickup';
                        const typeIcon = isAssis ? 'bi-tools' : (isRet ? 'bi-arrow-return-left' : (isPick ? 'bi-hand-index-fill' : 'bi-truck'));
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
                    {(order.orderType === 'sale' || order.orderType === 'showroom') && (
                        order.stockProcessed ? (
                            <div 
                                className="flex items-center justify-center h-6 w-6 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-md border border-emerald-200 dark:border-emerald-800 shadow-sm" 
                                title="Saída de Estoque Lançada"
                            >
                                <PackageCheck className="w-3.5 h-3.5" />
                            </div>
                        ) : (
                            <div 
                                className="flex items-center justify-center h-6 w-6 bg-slate-50 dark:bg-slate-800/40 text-slate-400 dark:text-slate-500 rounded-md border border-slate-200/80 dark:border-slate-800 shadow-xs" 
                                title="Saída de Estoque Não Lançada"
                            >
                                <Package className="w-3.5 h-3.5" />
                            </div>
                        )
                    )}

                    {/* 6. Return Status Badge */}
                    {order.returnOrderId && (
                        <div 
                            className="flex items-center justify-center h-6 w-6 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 rounded-md border border-amber-100 dark:border-amber-900/20 shadow-sm" 
                            title="Este pedido possui uma devolução vinculada"
                        >
                            <i className="bi bi-arrow-return-left text-[10px]" />
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

                    {hasAssemblyOutside && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-red-600 text-white border-red-700 shadow-xs" title="Montagem Fora">
                            <i className="bi bi-hammer text-[11px] text-white" />
                        </span>
                    )}

                    {hasAssemblyDepot && (
                        <span className="flex h-6 w-6 items-center justify-center rounded-md border bg-amber-500 text-white border-amber-600 shadow-xs" title="Montagem no Depósito">
                            <i className="bi bi-hammer text-[11px]" />
                        </span>
                    )}

                    {order.linkedOrderId && (
                        <button 
                            onClick={(e) => { e.stopPropagation(); onFilterByOrderId?.(order.linkedOrderId!); }}
                            className="flex h-6 items-center gap-1 text-[8px] font-black uppercase text-blue-500 hover:text-blue-600 transition-colors tracking-wider bg-blue-50 hover:bg-blue-100 dark:bg-blue-900/20 dark:hover:bg-blue-900/40 px-2 rounded-md border border-blue-100 dark:border-blue-900/30"
                            title="Filtrar por pedido vinculado"
                        >
                            <i className="bi bi-link-45deg"></i>
                            Vinc: #{formatOrderCode({ id: order.linkedOrderId })}
                        </button>
                    )}

                    {/* 8. Status Picker Button */}
                    <div className="relative shrink-0" onClick={(e) => e.stopPropagation()}>
                        <button 
                            onClick={(e) => { e.stopPropagation(); setShowPicker(!showPicker); }}
                            className={`flex items-center justify-center h-6 w-6 rounded-md bg-${currentStatus.color}-500 text-white hover:brightness-110 active:scale-95 transition-all shadow-2xs border border-black/10`}
                            title={`Status: ${currentStatus.label}`}
                        >
                            <i className={`bi ${sIcon} text-white text-[11px]`} />
                        </button>

                        {showPicker && (
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
                    onClick={() => onEdit(order)}
                    className="text-sm font-bold text-slate-800 dark:text-slate-100 leading-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors cursor-pointer w-fit"
                    title="Clique para editar o pedido"
                >
                    {order.customerData?.fullName || "Cliente não informado"}
                </h3>
                
                {order.shipping?.scheduling?.pendingScheduling && (
                    <div className="mt-2 flex items-center gap-2 bg-orange-500 text-white p-2 rounded-lg border border-orange-600 shadow-sm">
                        <i className="bi bi-clock-history text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">
                            AGENDAMENTO PENDENTE
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
                                className="flex items-center gap-1.5 px-2 py-1 bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-500 rounded-lg border border-amber-200 dark:border-amber-900/30 w-fit hover:scale-105 transition-all active:scale-95 shadow-sm"
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
                            className="flex items-center gap-1.5 px-2 py-1 bg-yellow-50 dark:bg-yellow-900/20 text-yellow-600 dark:text-yellow-500 rounded-lg border border-yellow-100 dark:border-yellow-900/30 w-fit hover:bg-yellow-100 dark:hover:bg-yellow-900/40 transition-all active:scale-95 cursor-pointer shadow-sm"
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
                        <div className="flex flex-col items-end text-right">
                            <span className="text-[8px] font-black uppercase tracking-widest opacity-40 mb-0.5">
                                {order.shipping?.deliveryMethod === 'pickup' ? 'Retirada' : 'Entrega'}
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
