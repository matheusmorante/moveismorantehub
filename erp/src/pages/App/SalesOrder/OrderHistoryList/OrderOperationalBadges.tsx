import React, { useState } from "react";
import Order from "../../../types/order.type";
import InventoryMovementBadge from "./InventoryMovementBadge";
import { binaryOrderBadgeClass, warningOrderBadgeClass } from "./orderBadgeStyles";

interface OrderOperationalBadgesProps {
    order: Order;
    showTrash?: boolean;
    isPaidTraffic: boolean;
    statusConfig: Record<string, { label: string; bg: string; text: string; dot: string }>;
    onStatusUpdate: (id: string, newStatus: Order['status']) => void;
    onBlingUpdate?: (id: string, value: boolean) => void;
    onStockCheckUpdate?: (id: string, value: boolean) => void;
    layout?: 'row' | 'card';
}

export const OrderOperationalBadges = ({
    order,
    showTrash,
    isPaidTraffic,
    statusConfig,
    onStatusUpdate,
    onBlingUpdate,
    onStockCheckUpdate,
    layout = 'row',
}: OrderOperationalBadgesProps) => {
    const [showPicker, setShowPicker] = useState(false);
    const isCancelled = order.status === 'cancelled';
    const isAssis = order.orderType === 'assistance';
    const isRet = order.orderType === 'return';
    const isPick = order.shipping?.deliveryMethod === 'pickup';

    const tIcon = isAssis ? 'bi-tools' : (isRet ? 'bi-arrow-return-left' : (isPick ? 'bi-shop' : 'bi-truck'));
    const sIcons: Record<string, string> = {
        draft: 'bi-clock',
        scheduled: 'bi-calendar3',
        fulfilled: 'bi-check-circle-fill',
        cancelled: 'bi-x-circle-fill',
    };
    const sIcon = sIcons[order.status || 'draft'] || 'bi-dot';

    const statusKey = (order.status as string) === 'completed' ? 'scheduled' : (order.status || 'draft');
    const currentStatus = statusConfig[statusKey] || statusConfig.draft || { label: 'Rascunho', bg: 'bg-slate-100', text: 'text-slate-500', dot: 'bg-slate-400' };
    const isStatusBadgeReadOnly = ['sale', 'showroom', 'return'].includes(order.orderType || 'sale');

    return (
        <div className={`flex flex-wrap items-center gap-1 ${isCancelled ? 'opacity-60 pointer-events-none' : ''}`}>
            {/* 1. Stock Check Badge — Selo de Etiquetado */}
            {!showTrash && order.orderType !== 'assistance' && order.orderType !== 'return' && (
                <div className="flex items-center" onClick={isCancelled ? undefined : (e) => e.stopPropagation()}>
                    <button
                        type="button"
                        onClick={() => onStockCheckUpdate?.(order.id!, !order.isStockChecked)}
                        className={`relative flex h-6 w-6 items-center justify-center rounded-md border cursor-pointer select-none transition-all hover:scale-105 shadow-2xs ${binaryOrderBadgeClass(Boolean(order.isStockChecked))}`}
                        title={order.isStockChecked ? 'Etiquetado (Clique para desmarcar)' : 'Não Etiquetado (Clique para marcar)'}
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

            {/* 2. Bling Status Badge — Selo do Bling */}
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

            {/* 3. Tráfego Pago Badge */}
            {isPaidTraffic && order.orderType !== 'return' && (
                <div 
                    className="flex items-center justify-center h-6 w-6 rounded-md bg-orange-500 text-white border border-orange-600 shadow-2xs"
                    title="Gerado por Tráfego Pago"
                >
                    <i className="bi bi-megaphone-fill text-[11px] text-white" />
                </div>
            )}

            {/* 4. Status Picker Button */}
            <div className="relative" onClick={isCancelled ? undefined : (e) => e.stopPropagation()}>
                <button
                    onClick={(e) => { e.stopPropagation(); if (!isStatusBadgeReadOnly) setShowPicker(!showPicker); }}
                    className={`flex items-center justify-center h-6 w-6 rounded-md ${
                        order.status === 'cancelled'
                            ? 'bg-red-600 border border-red-700'
                            : order.status === 'draft'
                            ? 'bg-slate-400 dark:bg-slate-600 border border-slate-500 dark:border-slate-600'
                            : currentStatus.bg.replace('/10', '').replace('/20', '').replace('-50', '-500')
                    } text-white transition-all shadow-2xs border border-black/10 ${isStatusBadgeReadOnly ? 'cursor-default' : 'hover:brightness-110 active:scale-95'}`}
                    title={`Status: ${currentStatus.label} | Tipo: ${isAssis ? 'Assistência' : (isRet ? 'Devolução' : (isPick ? 'Retirada' : 'Entrega'))}`}
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

            {/* 5. Transport Type Icon */}
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

            {/* 6. Stock Processed Indicator */}
            {(order.orderType === 'sale' || order.orderType === 'showroom' || order.orderType === 'return') && (
                <InventoryMovementBadge 
                    orderType={order.orderType} 
                    order={order}
                    hasMovement={order.orderType === 'return' ? Boolean(order.returnStockProcessed) : Boolean(order.stockProcessed)} 
                    isReversed={order.orderType === 'return' ? Boolean(order.returnStockReversed) : Boolean(order.stockReversed)}
                    isPartial={order.isPartialStockProcessed}
                />
            )}

            {/* 7. Return Status Badge */}
            {order.returnOrderId && (
                <div 
                    className={`flex h-6 ${layout === 'card' ? 'items-center gap-1 px-2' : 'w-6 items-center justify-center'} rounded-md border shadow-sm ${warningOrderBadgeClass}`}
                    title={`Este pedido possui uma devolução ${order.returnKind === 'complete' ? 'completa' : 'parcial'} vinculada`}
                >
                    <i className="bi bi-arrow-return-left text-[10px]" />
                    {layout === 'card' && (
                        <span className="text-[9px] font-black uppercase tracking-wider">
                            Devolução {order.returnKind === 'complete' ? 'Total' : 'Parcial'}
                        </span>
                    )}
                </div>
            )}
        </div>
    );
};
