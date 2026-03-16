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
    isHighlighted,
    id
}: OrderHistoryCardProps) => {
    const settings = getSettings();
    const [showMenu, setShowMenu] = React.useState(false);
    const [showPicker, setShowPicker] = React.useState(false);

    const statuses = settings.orderStatuses ? [...settings.orderStatuses] : [
        { id: 'draft', label: 'Rascunho', color: 'slate' },
        { id: 'scheduled', label: 'Agendado', color: 'amber' },
        { id: 'fulfilled', label: 'Atendido', color: 'emerald' },
        { id: 'cancelled', label: 'Cancelado', color: 'rose' },
    ];

    if (!statuses.find((s: any) => s.id === 'chargeback')) {
        statuses.push({ id: 'chargeback', label: 'Chargeback', color: 'rose' });
        statuses.push({ id: 'disputed', label: 'Em Disputa', color: 'amber' });
    }

    const currentStatus = statuses.find(s => s.id === (order.status || 'draft')) || statuses[0];

    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };
    const colorKey = resolveOrderColor(order.orderType, order.shipping?.deliveryMethod, colors);
    const cls = getOrderTypeClasses(colorKey);
    const cardBgClass = cls.rowHover;

    return (
        <div 
            id={id}
            className={`${cardBgClass} border ${isSelected ? 'border-blue-500 ring-1 ring-blue-500' : 'border-slate-100 dark:border-slate-800'} ${isHighlighted ? 'animate-highlight' : ''} rounded-xl p-3 shadow-sm active:scale-[0.98] transition-all relative`}
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
                    <span className="font-mono text-[9px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-800/50 px-1.5 py-0.5 rounded border border-slate-100 dark:border-slate-800">
                        #{order.id?.slice(-6).toUpperCase()}
                    </span>
                    {(order.status === 'chargeback' || order.status === 'disputed') && (
                        <span className="bg-red-600 text-white text-[8px] font-black uppercase px-2 py-0.5 rounded animate-pulse shadow-sm flex items-center gap-1" title="Atenção: Pagamento Constestado na Rede Itaú (Chargeback)! Não envie a mercadoria.">
                            <i className="bi bi-exclamation-triangle-fill" /> ALERTA: FRAUDE
                        </span>
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
