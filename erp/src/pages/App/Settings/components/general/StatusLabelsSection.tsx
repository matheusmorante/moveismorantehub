/** @jsxImportSource react */
import React from "react";
import { AppSettings, OrderStatusConfig, OrderTypeColor } from '@/pages/utils/settingsService';
import { ORDER_TYPE_COLOR_OPTIONS } from "../../../utils/orderTypeColorUtils";

interface Props {
    settings: AppSettings;
    onChange: (path: string, value: any) => void;
}

const STATUS_COLOR_OPTIONS = [
    { value: 'slate', dot: 'bg-slate-500', hover: 'hover:bg-slate-100 dark:hover:bg-slate-800' },
    { value: 'amber', dot: 'bg-amber-500', hover: 'hover:bg-amber-100 dark:hover:bg-amber-900/40' },
    { value: 'emerald', dot: 'bg-emerald-500', hover: 'hover:bg-emerald-100 dark:hover:bg-emerald-900/40' },
    { value: 'rose', dot: 'bg-rose-500', hover: 'hover:bg-rose-100 dark:hover:bg-rose-900/40' },
    { value: 'blue', dot: 'bg-blue-500', hover: 'hover:bg-blue-100 dark:hover:bg-blue-900/40' },
    { value: 'purple', dot: 'bg-purple-500', hover: 'hover:bg-purple-100 dark:hover:bg-purple-900/40' },
] as const;

interface OrderTypeRowProps {
    label: string;
    icon: string;
    labelPath: string;
    colorPath: string;
    currentLabel: string;
    currentColor: OrderTypeColor;
    onChange: (path: string, value: any) => void;
}

const OrderTypeRow = ({ label, icon, labelPath, colorPath, currentLabel, currentColor, onChange }: OrderTypeRowProps) => {
    const currentOpt = ORDER_TYPE_COLOR_OPTIONS.find(o => o.value === currentColor);

    return (
        <div className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:border-slate-300 dark:hover:border-slate-700">
            <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest flex items-center gap-1.5 ml-1">
                <i className={`bi ${icon}`} />
                {label}
            </label>
            <div className="flex items-center gap-3">
                {/* Color Picker */}
                <div className="relative group/picker flex-shrink-0">
                    <button
                        type="button"
                        className="flex items-center gap-1.5 px-2.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:scale-105 transition-transform"
                        title="Escolher cor"
                    >
                        <div className={`w-3 h-3 rounded-full ${currentOpt?.dotClass ?? 'bg-slate-400'}`} />
                        <span className="text-[9px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-wider">
                            {currentOpt?.label ?? 'Cor'}
                        </span>
                        <i className="bi bi-chevron-down text-[8px] text-slate-400" />
                    </button>

                    {/* Dropdown */}
                    <div className="absolute top-full left-0 mt-2 p-2.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-20 hidden group-hover/picker:flex flex-wrap w-52 gap-1.5 animate-slide-up">
                        {ORDER_TYPE_COLOR_OPTIONS.map(opt => (
                            <button
                                key={opt.value}
                                type="button"
                                onClick={() => onChange(colorPath, opt.value)}
                                className={`flex items-center gap-2 w-full px-2.5 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-colors ${currentColor === opt.value ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`}
                            >
                                <div className={`w-3 h-3 rounded-full flex-shrink-0 ${opt.dotClass} ${currentColor === opt.value ? 'ring-2 ring-offset-1 ring-blue-500 dark:ring-offset-slate-900' : ''}`} />
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Label input */}
                <input
                    type="text"
                    value={currentLabel}
                    onChange={(e) => onChange(labelPath, e.target.value)}
                    className="flex-1 bg-transparent border-none px-2 py-1 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 rounded-lg outline-none transition-all placeholder:text-slate-300"
                    placeholder="Nome do tipo de pedido"
                />
            </div>
        </div>
    );
};

export default function StatusLabelsSection({ settings, onChange }: Props): any {
    const statuses = settings.orderStatuses || [];
    const colors = settings.orderTypeColors ?? { delivery: 'green', pickup: 'purple', assistance: 'orange' };

    const updateStatus = (index: number, changes: Partial<OrderStatusConfig>) => {
        const next = [...statuses];
        next[index] = { ...next[index], ...changes };
        onChange('orderStatuses', next);
    };

    const addStatus = () => {
        const newId = `custom_${Date.now()}`;
        const next = [...statuses, { id: newId, label: 'Novo Status', color: 'blue', isCore: false }];
        onChange('orderStatuses', next);
    };

    const removeStatus = (index: number) => {
        const next = [...statuses];
        next.splice(index, 1);
        onChange('orderStatuses', next);
    };

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-0 divide-y md:divide-y-0 md:divide-x divide-slate-50 dark:divide-slate-800/50 border-b border-slate-50 dark:border-slate-800/50">
            {/* Status Labels */}
            <div className="p-8 space-y-6">
                <div className="flex justify-between items-center mb-4">
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-0">Status de Pedidos</h5>
                    <button
                        onClick={addStatus}
                        className="px-3 py-1.5 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg text-[10px] font-black uppercase tracking-widest hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors shadow-sm"
                    >
                        <i className="bi bi-plus-lg mr-1"/> Adicionar
                    </button>
                </div>

                <div className="space-y-3">
                    {statuses.map((status, index) => (
                        <div key={status.id} className="group flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl transition-all hover:border-slate-300 dark:hover:border-slate-700 animate-slide-down">
                            <div className="flex items-center gap-3">
                                {/* Color Selector Button */}
                                <div className="relative group/picker">
                                    <button className="flex items-center justify-center w-8 h-8 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm cursor-pointer hover:scale-105 transition-transform">
                                        <div className={`w-3 h-3 rounded-full ${STATUS_COLOR_OPTIONS.find(c => c.value === status.color)?.dot || 'bg-slate-500'}`} />
                                    </button>

                                    {/* Color Picker Dropdown */}
                                    <div className="absolute top-full left-0 mt-2 p-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-xl z-10 hidden group-hover/picker:flex flex-wrap w-40 gap-1 animate-slide-up">
                                        {STATUS_COLOR_OPTIONS.map(opt => (
                                            <button
                                                key={opt.value}
                                                onClick={() => updateStatus(index, { color: opt.value as any })}
                                                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${opt.hover}`}
                                            >
                                                <div className={`w-4 h-4 rounded-full ${opt.dot} ${status.color === opt.value ? 'ring-2 ring-offset-2 ring-blue-500 dark:ring-offset-slate-900' : ''}`} />
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Label Input (Inline Edit) */}
                                <input
                                    type="text"
                                    value={status.label}
                                    onChange={(e) => updateStatus(index, { label: e.target.value })}
                                    className="flex-1 bg-transparent border-none px-2 py-1 text-sm font-bold text-slate-700 dark:text-slate-200 focus:ring-2 focus:ring-blue-100 dark:focus:ring-blue-900/20 rounded-lg outline-none transition-all placeholder:text-slate-300"
                                    placeholder="Nome do status"
                                />

                                {/* Delete Button (Only for non-core) */}
                                {!status.isCore ? (
                                    <button
                                        onClick={() => removeStatus(index)}
                                        className="text-slate-300 hover:text-red-500 transition-colors p-2"
                                        title="Remover status"
                                    >
                                        <i className="bi bi-trash3-fill" />
                                    </button>
                                ) : (
                                    <div className="p-2 opacity-50 text-[10px] font-bold text-slate-400" title="Status de sistema">
                                        <i className="bi bi-lock-fill" />
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Order Type Labels + Colors */}
            <div className="p-8 space-y-6">
                <div>
                    <h5 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-600 dark:text-blue-400 mb-1">Tipos de Pedido</h5>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 mb-4">Personalize o nome e a cor de cada tipo.</p>
                </div>
                <div className="space-y-3">
                    <OrderTypeRow
                        label="Entrega / Serviço"
                        icon="bi-truck"
                        labelPath="orderTypeLabels.delivery"
                        colorPath="orderTypeColors.delivery"
                        currentLabel={settings.orderTypeLabels.delivery}
                        currentColor={colors.delivery}
                        onChange={onChange}
                    />
                    <OrderTypeRow
                        label="Retirada"
                        icon="bi-hand-index-thumb-fill"
                        labelPath="orderTypeLabels.pickup"
                        colorPath="orderTypeColors.pickup"
                        currentLabel={settings.orderTypeLabels.pickup}
                        currentColor={colors.pickup}
                        onChange={onChange}
                    />
                    <OrderTypeRow
                        label="Assistência"
                        icon="bi-tools"
                        labelPath="orderTypeLabels.assistance"
                        colorPath="orderTypeColors.assistance"
                        currentLabel={settings.orderTypeLabels.assistance}
                        currentColor={colors.assistance}
                        onChange={onChange}
                    />
                </div>
            </div>
        </div>
    );
}
