import React from "react";
import Order from "../../../types/order.type";
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
    onBlingUpdate?: (id: string, value: boolean) => void;
    isHighlighted?: boolean;
    id?: string;
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
    isHighlighted,
    id
}: OrderHistoryCardProps) => {
    const settings = getSettings();
    const [showMenu, setShowMenu] = React.useState(false);
    const [showPicker, setShowPicker] = React.useState(false);
    const [showBlingConfirm, setShowBlingConfirm] = React.useState(false);
    const [showFulfillmentConfirm, setShowFulfillmentConfirm] = React.useState(false);

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

    const checkItems = (itemsList: any[]) => itemsList?.some(item => {
        const hLabel = (item.handlingType || "").trim().toLowerCase();
        if (!hLabel) return false;
        const foundOpt = allOptions.find(opt => (opt?.label || "").trim().toLowerCase() === hLabel);
        return foundOpt?.includeInAssemblySchedule === true;
    });

    const hasAssembly = checkItems(order.items) || checkItems(order.assistanceItems as any);
    
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
        (colorKey === 'green' 
            ? 'bg-green-100 dark:bg-green-950/40' 
            : (colorKey === 'purple' 
                ? 'bg-purple-100 dark:bg-purple-900/50' 
                : (colorKey === 'orange' 
                    ? 'bg-orange-100/40 dark:bg-orange-900/40' 
                    : cls.rowHover)));

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
                                <div className="flex items-center gap-1">
                                    <i className={`bi ${typeIcon} ${typeColor} text-[10px]`} title={isAssistance ? 'Assistência' : (isPickup ? 'Retirada' : 'Entrega')} />
                                    {hasAssembly && (
                                        <i className="bi bi-hammer text-red-600 dark:text-red-500 text-[10px] animate-pulse" title="Necessita de Montagem" />
                                    )}
                                </div>
                            );
                        })()}
                    </div>
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
                
                {order.isRegisteredInBling && !showTrash && order.status !== 'draft' && order.status !== 'cancelled' && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        {!showBlingConfirm ? (
                            <button 
                                onClick={() => setShowBlingConfirm(true)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-emerald-50 dark:bg-emerald-900/10 text-emerald-600 dark:text-emerald-400 rounded-lg border border-emerald-100 dark:border-emerald-900/20 w-fit shadow-sm hover:scale-105 transition-all"
                            >
                                <i className="bi bi-check-circle-fill text-[10px]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Lançado no Bling</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg animate-slide-up w-fit">
                                <span className="text-[9px] font-black uppercase text-slate-500 ml-1">Desfazer?</span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => {
                                            onBlingUpdate?.(order.id!, false);
                                            setShowBlingConfirm(false);
                                        }}
                                        className="px-2.5 py-1 bg-red-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-red-700 transition-colors"
                                    >
                                        Sim
                                    </button>
                                    <button 
                                        onClick={() => setShowBlingConfirm(false)}
                                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Não
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* Bling Pending Flag */}
                {!order.isRegisteredInBling && !showTrash && order.status !== 'draft' && order.status !== 'cancelled' && (
                    <div className="mt-2" onClick={(e) => e.stopPropagation()}>
                        {!showBlingConfirm ? (
                            <button 
                                onClick={() => setShowBlingConfirm(true)}
                                className="flex items-center gap-1.5 px-2 py-1 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg border border-red-100 dark:border-red-900/30 animate-pulse hover:scale-105 transition-all w-fit shadow-sm"
                            >
                                <i className="bi bi-exclamation-triangle-fill text-[10px]" />
                                <span className="text-[9px] font-black uppercase tracking-widest">Falta Lançar Bling</span>
                            </button>
                        ) : (
                            <div className="flex items-center gap-2 bg-white dark:bg-slate-800 p-1.5 rounded-xl border border-slate-100 dark:border-slate-700 shadow-lg animate-slide-up w-fit">
                                <span className="text-[9px] font-black uppercase text-slate-500 ml-1">Já lançou?</span>
                                <div className="flex gap-1">
                                    <button 
                                        onClick={() => {
                                            onBlingUpdate?.(order.id!, true);
                                            setShowBlingConfirm(false);
                                        }}
                                        className="px-2.5 py-1 bg-emerald-600 text-white text-[9px] font-black uppercase rounded-lg hover:bg-emerald-700 transition-colors"
                                    >
                                        Sim
                                    </button>
                                    <button 
                                        onClick={() => setShowBlingConfirm(false)}
                                        className="px-2.5 py-1 bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-[9px] font-black uppercase rounded-lg hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                                    >
                                        Não
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

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
                {order.status === 'fulfilled' && !order.reviewRequested && !showTrash && !(order.shipping?.deliveryMethod === 'pickup' && (order.customerData?.fullName === "Consumidor Final" || order.customerData?.fullName === "Ao Consumidor")) && (
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
                {order.status === 'fulfilled' && order.reviewRequested && !showTrash && (
                    <div className="mt-2 flex items-center gap-1.5 px-2 py-1 bg-blue-50 dark:bg-blue-900/10 text-blue-600 dark:text-blue-400 rounded-lg border border-blue-100 dark:border-blue-900/20 w-fit shadow-sm">
                        <i className="bi bi-star-half text-[10px]" />
                        <span className="text-[9px] font-black uppercase tracking-widest">Avaliação Solicitada</span>
                    </div>
                )}



                <div className="flex items-center gap-3 mt-1.5">
                    <div className="flex items-center gap-1 text-[10px] text-slate-500 dark:text-slate-400 font-medium">
                        <i className="bi bi-calendar3 opacity-70" />
                        <span>{formatToBRDate(order.date)}</span>
                    </div>
                    {order.shipping?.scheduling?.date && (
                        <div className="flex items-center gap-1 text-[10px] text-blue-500 dark:text-blue-400 font-bold uppercase tracking-tighter">
                            <i className="bi bi-truck" />
                            <span>{formatToBRDate(order.shipping.scheduling.date)}</span>
                        </div>
                    )}
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
                                    onClick={() => setShowMenu(!showMenu)}
                                    className="p-2 bg-slate-50 dark:bg-slate-800 text-slate-600 dark:text-slate-400 rounded-lg hover:bg-slate-100 transition-colors"
                                >
                                    <i className="bi bi-three-dots-vertical text-lg" />
                                </button>

                                {showMenu && (
                                    <>
                                        <div className="fixed inset-0 z-10" onClick={() => setShowMenu(false)} />
                                        <div className="absolute bottom-full right-0 mb-2 w-48 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-[100] p-1.5 flex flex-col gap-1 animate-slide-up">
                                                {buttons.map((btn) => {
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
                                                        className={`flex items-center gap-3 w-full p-2.5 rounded-lg transition-all ${disablePrintReceipt ? 'opacity-50 cursor-not-allowed text-slate-400 bg-slate-50 dark:bg-slate-900/50' : `hover:bg-slate-50 dark:hover:bg-slate-800 ${btn.color}`}`}
                                                        title={disablePrintReceipt ? 'Não é possível imprimir recibo sem cliente associado' : btn.tooltip}
                                                >
                                                    <i className={`bi ${btn.icon} text-base`} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{btn.label}</span>
                                                </button>
                                                )
                                            })}
                                            <div className="border-t border-slate-50 dark:border-slate-800/50 my-1" />
                                            <button
                                                onClick={() => onDelete(order.id!)}
                                                className="flex items-center gap-3 w-full p-2.5 rounded-lg transition-all hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
                                            >
                                                <i className="bi bi-trash-fill text-base" />
                                                <span className="text-[9px] font-black uppercase tracking-widest">Lixeira</span>
                                            </button>
                                        </div>
                                    </>
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
