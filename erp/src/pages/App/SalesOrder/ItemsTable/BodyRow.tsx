import React from 'react';
import Product, { Variation } from '../../../types/product.type';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
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
    onSelectProduct: (idx: number, product: Product, variation?: Variation) => void;
}

const BodyRow = ({ item, onChange, onToggleDiscountType, onDelete, idx, deliveryMethod, errors, isMobile, onSelectProduct }: Props) => {
    const errorKey = `item_${idx}_description`;
    const error = errors[errorKey];
    const settings = getSettings();

    if (isMobile) {
        return (
            <div className={`p-4 bg-white dark:bg-slate-900/40 border rounded-3xl ${error ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-100 dark:border-slate-800'} shadow-sm relative group overflow-hidden transition-all hover:shadow-lg`}>
                <div className="flex flex-col gap-4">
                    {/* Linha 1: Descrição e Manuseio */}
                    <div className="flex gap-3">
                        <div className="flex-[3] min-w-0">
                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Descrição do Item</label>
                            {!item.isComboItem ? (
                                <ProductAutocomplete
                                    value={item.description}
                                    onChange={(val) => onChange(idx, 'description', val)}
                                    onSelect={(p, v) => onSelectProduct(idx, p, v)}
                                    onSelectDescription={(desc) => onChange(idx, 'description', desc)}
                                    placeholder="Produto..."
                                    className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500/10' : ''}
                                />
                            ) : (
                                <div className="flex items-center gap-2 bg-slate-50/50 dark:bg-slate-800 p-2 rounded-xl border border-dashed border-slate-200 dark:border-slate-700">
                                    <i className="bi bi-arrow-return-right text-blue-500" />
                                    <span className="text-xs italic text-slate-500 truncate">{item.description}</span>
                                </div>
                            )}
                        </div>
                        {!item.isComboItem && (
                            <div className="flex-[2] min-w-0">
                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Manuseio</label>
                                <div className="relative group/sel">
                                    <select
                                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-2 py-2 rounded-xl text-[11px] font-bold outline-none dark:text-slate-300 transition-all pr-8"
                                        value={item.handlingType || ''}
                                        onChange={(e) => onChange(idx, 'handlingType', e.target.value)}
                                    >
                                        <option value="" disabled className="dark:bg-slate-900">Selecione...</option>
                                        {(() => {
                                            const options = deliveryMethod === 'delivery' ? (settings.deliveryHandlingOptions || []) : (settings.pickupHandlingOptions || []);
                                            const isSelectedInOptions = item.handlingType && options.some(o => o.label === item.handlingType);
                                            
                                            return (
                                                <>
                                                    {options.map(opt => (
                                                        <option key={opt.label} value={opt.label} className="dark:bg-slate-900">{opt.label}</option>
                                                    ))}
                                                    {item.handlingType && !isSelectedInOptions && (
                                                        <option value={item.handlingType} className="italic text-slate-400">
                                                            {item.handlingType} (Valor Atual)
                                                        </option>
                                                    )}
                                                </>
                                            );
                                        })()}
                                    </select>
                                </div>
                            </div>
                        )}
                        {!item.isComboItem && (
                             <button
                                type="button"
                                onClick={onDelete}
                                className="mt-5 p-2 text-slate-300 hover:text-red-500 active:scale-95 transition-all"
                                title="Excluir item"
                            >
                                <i className="bi bi-trash text-lg" />
                            </button>
                        )}
                    </div>

                    {/* Linha 2: Quantidade e Preço Unitário */}
                    {!item.isComboItem && (
                        <div className="flex gap-3">
                            <div className="flex-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Qtd</label>
                                <UnitInput
                                    value={item.quantity}
                                    onChange={(value: number) => onChange(idx, 'quantity', value)}
                                    disabled={item.isComboItem}
                                />
                            </div>
                            <div className="flex-[2]">
                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Preço Unitário</label>
                                <CurrencyInput
                                    value={item.unitPrice}
                                    onChange={(value: number) => onChange(idx, 'unitPrice', value)}
                                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-3 py-2 rounded-xl text-sm font-bold outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Linha 3: Desconto e Total */}
                    <div className="flex gap-3 items-end">
                        {!item.isComboItem ? (
                            <div className="flex-[3] space-y-1">
                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Desconto Unitário</label>
                                <div className="flex items-center gap-0 bg-slate-50 dark:bg-slate-800 border border-slate-100 dark:border-slate-800 rounded-xl pr-1 focus-within:border-blue-500 transition-all overflow-hidden">
                                    <CurrencyOrPercentInput
                                        prefix={item.discountType === "fixed" ? "R$ " : ""}
                                        suffix={item.discountType === "fixed" ? "" : " %"}
                                        value={item.unitDiscount}
                                        onChange={(value: number) => onChange(idx, 'unitDiscount', value)}
                                        className="w-full bg-transparent border-0 px-3 py-2 text-sm font-bold outline-none text-right"
                                    />
                                    <button 
                                        type="button"
                                        onClick={onToggleDiscountType}
                                        className="h-7 min-w-[28px] px-1 flex items-center justify-center bg-white dark:bg-slate-700 text-[9px] font-black text-blue-600 dark:text-blue-400 rounded-lg shadow-sm border border-slate-50 dark:border-slate-700 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        {item.discountType === 'fixed' ? 'R$' : '%'}
                                    </button>
                                </div>
                            </div>
                        ) : <div className="flex-[3]" />}
                        
                        <div className="flex-[2] flex flex-col items-end gap-1 px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30 dark:border-blue-500/10">
                            <span className="text-[8px] font-black uppercase text-blue-600/60 dark:text-blue-400/60 tracking-widest">Total Item</span>
                            <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                                <CurrencyDisplay value={calcItemTotalValue(item)} />
                            </div>
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
                    <ProductAutocomplete
                        value={item.description}
                        onChange={(val) => onChange(idx, 'description', val)}
                        onSelect={(p, v) => onSelectProduct(idx, p, v)}
                        onSelectDescription={(desc) => onChange(idx, 'description', desc)}
                        placeholder="Descrição do item..."
                        className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500' : ''}
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
                    <div className="relative">
                        <select
                            className="w-full min-w-[120px] bg-transparent border border-slate-100 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl outline-none transition-all text-[11px] font-bold text-slate-600 dark:text-slate-400 pr-7"
                            value={item.handlingType || ''}
                            onChange={(e) => onChange(idx, 'handlingType', e.target.value)}
                        >
                            <option value="" disabled className="dark:bg-slate-900">Manuseio...</option>
                            {(() => {
                                const options = deliveryMethod === 'delivery' ? (settings.deliveryHandlingOptions || []) : (settings.pickupHandlingOptions || []);
                                const isSelectedInOptions = item.handlingType && options.some(o => o.label === item.handlingType);
                                
                                return (
                                    <>
                                        {options.map(opt => (
                                            <option key={opt.label} value={opt.label} className="dark:bg-slate-900">{opt.label}</option>
                                        ))}
                                        {item.handlingType && !isSelectedInOptions && (
                                            <option value={item.handlingType} className="italic text-slate-400">
                                                {item.handlingType} (Atual)
                                            </option>
                                        )}
                                    </>
                                );
                            })()}
                        </select>
                    </div>
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