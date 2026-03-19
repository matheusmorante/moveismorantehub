import React from 'react';
import Item from '../../../types/items.type';
import { calcItemTotalValue } from '../../../utils/calculations';
import CurrencyOrPercentInput from '../../../../components/CurrencyOrPercentInput';
import UnitInput from './UnitInput';
import CurrencyInput from '../../../../components/CurrencyInput';
import ToggleValueTypeBtn from '../ToggleValueTypeBtn';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import { ValidationErrors } from '../../../utils/validations';
import { getSettings } from '@/pages/utils/settingsService';

interface Props {
    item: Item;
    onChange: (idx: number, key: keyof Item, value: string | number) => void;
    onToggleDiscountType: () => void;
    onDelete: () => void;
    idx: number;
    deliveryMethod: 'delivery' | 'pickup';
    errors: ValidationErrors;
    isMobile?: boolean;
}

const BodyRow = ({ item, onChange, onToggleDiscountType, onDelete, idx, deliveryMethod, errors, isMobile }: Props) => {
    const errorKey = `item_${idx}_description`;
    const error = errors[errorKey];
    const settings = getSettings();

    if (isMobile) {
        return (
            <div className={`p-4 bg-white dark:bg-slate-900/40 rounded-2xl border ${error ? 'border-red-500 ring-1 ring-red-500' : 'border-slate-100 dark:border-slate-800'} shadow-sm relative group overflow-hidden`}>
                <div className="flex flex-col gap-4">
                    <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                            {!item.isComboItem ? (
                                <input
                                    type="text"
                                    className={`w-full bg-slate-50 dark:bg-slate-900 border px-4 py-3 rounded-2xl text-sm outline-none placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-slate-200 transition-all ${error ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-800 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10'}`}
                                    value={item.description}
                                    onChange={(e) => onChange(idx, 'description', e.target.value)}
                                    placeholder="Descrição do produto/serviço..."
                                />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <i className="bi bi-arrow-return-right text-slate-400" />
                                    <span className="text-sm italic text-slate-500 font-medium">{item.description}</span>
                                </div>
                            )}
                        </div>
                        {!item.isComboItem && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
                            >
                                <i className="bi bi-trash" />
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                            <label className="text-[9px] font-black uppercase text-slate-400">Qtd.</label>
                            <UnitInput
                                value={item.quantity}
                                onChange={(value: number) => onChange(idx, 'quantity', value)}
                                disabled={item.isComboItem}
                            />
                        </div>
                        {!item.isComboItem && (
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400">Manuseio</label>
                                <select
                                    className="w-full bg-slate-50/50 dark:bg-slate-800/30 border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-2 py-2 rounded-xl text-[11px] font-bold outline-none"
                                    value={item.handlingType || ''}
                                    onChange={(e) => onChange(idx, 'handlingType', e.target.value)}
                                >
                                    {(deliveryMethod === 'delivery' ? (settings.deliveryHandlingOptions || []) : (settings.pickupHandlingOptions || [])).map(opt => (
                                        <option key={opt} value={opt}>{opt}</option>
                                    ))}
                                </select>
                            </div>
                        )}
                        {!item.isComboItem && (
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400">Preço Un.</label>
                                <CurrencyInput
                                    value={item.unitPrice}
                                    onChange={(value: number) => onChange(idx, 'unitPrice', value)}
                                />
                            </div>
                        )}
                        {!item.isComboItem && (
                            <div className="space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400">Desconto</label>
                                <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-xl pr-2 border border-slate-100 dark:border-slate-800">
                                    <CurrencyOrPercentInput
                                        prefix={item.discountType === "fixed" ? "R$ " : ""}
                                        suffix={item.discountType === "fixed" ? "" : " %"}
                                        value={item.unitDiscount}
                                        onChange={(value: number) => onChange(idx, 'unitDiscount', value)}
                                    />
                                    <ToggleValueTypeBtn onClick={onToggleDiscountType}>
                                        {item.discountType === 'fixed' ? 'R$' : '%'}
                                    </ToggleValueTypeBtn>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="flex justify-between items-center pt-3 border-t border-slate-50 dark:border-slate-800 mt-2">
                        <span className="text-[10px] font-black uppercase text-slate-400">Subtotal Item:</span>
                        <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                            <CurrencyDisplay value={calcItemTotalValue(item)} />
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 font-sans">
            <td className="px-4 py-2 relative group/desc">
                {!item.isComboItem ? (
                    <input
                        type="text"
                        className={`w-full bg-transparent border px-3 py-1.5 rounded-xl outline-none transition-all text-sm placeholder:text-slate-300 dark:placeholder:text-slate-700 dark:text-slate-200 ${error ? 'border-red-500 ring-2 ring-red-500 rounded-xl' : 'border-slate-100 dark:border-slate-800 focus:border-blue-500'}`}
                        value={item.description}
                        onChange={(e) => onChange(idx, 'description', e.target.value)}
                        placeholder="Descrição do item..."
                    />
                ) : (
                    <div className="flex items-center gap-2 pl-3">
                        <i className="bi bi-arrow-return-right text-slate-300" />
                        <span className="text-sm italic text-slate-500 dark:text-slate-400">{item.description}</span>
                    </div>
                )}
                {error && (
                    <div className="absolute left-4 -top-8 hidden group-hover/desc:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap font-sans">
                        {error}
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                    </div>
                )}
            </td>
            <td className="px-4 py-2">
                {!item.isComboItem && (
                    <select
                        className="w-full min-w-[120px] bg-transparent border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl outline-none transition-all text-[11px] font-bold text-slate-600 dark:text-slate-400"
                        value={item.handlingType || ''}
                        onChange={(e) => onChange(idx, 'handlingType', e.target.value)}
                    >
                        <option value="" disabled className="dark:bg-slate-900">Selecione...</option>
                        {(deliveryMethod === 'delivery' ? (settings.deliveryHandlingOptions || []) : (settings.pickupHandlingOptions || [])).map(opt => (
                            <option key={opt} value={opt} className="dark:bg-slate-900">{opt}</option>
                        ))}
                    </select>
                )}
            </td>
            <td className="px-4 py-2">
                <UnitInput
                    value={item.quantity}
                    onChange={(value: number) => onChange(idx, 'quantity', value)}
                    disabled={item.isComboItem}
                />
            </td>
            <td className="px-4 py-2">
                {!item.isComboItem ? (
                    <CurrencyInput
                        value={item.unitPrice}
                        onChange={(value: number) => onChange(idx, 'unitPrice', value)}
                    />
                ) : (
                    <div className="text-center text-[10px] text-slate-400 font-bold">---</div>
                )}
            </td>
            <td className="px-4 py-2">
                {!item.isComboItem && (
                    <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800/30 rounded-lg pr-2 border border-slate-100/50 dark:border-slate-800/50 group-focus-within:border-blue-200 dark:group-focus-within:border-blue-500/30 transition-all">
                        <CurrencyOrPercentInput
                            prefix={item.discountType === "fixed" ? "R$ " : ""}
                            suffix={item.discountType === "fixed" ? "" : " %"}
                            value={item.unitDiscount}
                            onChange={(value: number) => onChange(idx, 'unitDiscount', value)}
                        />
                        <ToggleValueTypeBtn onClick={onToggleDiscountType}>
                            {item.discountType === 'fixed' ? 'R$' : '%'}
                        </ToggleValueTypeBtn>
                    </div>
                )}
            </td>
            <td className="px-4 py-2 text-right">
                <div className="font-bold text-slate-700 dark:text-slate-200">
                    <CurrencyDisplay value={calcItemTotalValue(item)} />
                </div>
            </td>
            <td className="px-4 py-2 text-center">
                {!item.isComboItem && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="w-8 h-8 flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir item"
                    >
                        <i className="bi bi-trash" />
                    </button>
                )}
            </td>
        </tr>
    );
};

export default BodyRow;