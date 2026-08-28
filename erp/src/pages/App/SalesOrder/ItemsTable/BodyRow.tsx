import React from 'react';
import Product, { Variation } from '../../../types/product.type';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
import Item from '../../../types/items.type';
import { calcItemTotalValue } from '../../../utils/calculations';
import CurrencyOrPercentInput from '../../../../components/CurrencyOrPercentInput';
import UnitInput from './UnitInput';
import CurrencyInput from '../../../../components/CurrencyInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import { ValidationErrors } from '../../../utils/validations';
import { getSettings } from '@/pages/utils/settingsService';

interface Props {
    item: Item;
    onChange: (idx: number, key: keyof Item, value: string | number) => void;
    onBatchChange: (idx: number, changes: Partial<Item>) => void;
    onToggleDiscountType: () => void;
    onDelete: () => void;
    idx: number;
    deliveryMethod: 'delivery' | 'pickup';
    errors: ValidationErrors;
    isMobile?: boolean;
    onSelectProduct: (idx: number, product: Product, variation?: Variation) => void;
    isBudget?: boolean;
}

const BodyRow = ({ item, onChange, onBatchChange, onDelete, idx, deliveryMethod, errors, isMobile, onSelectProduct, isBudget }: Props) => {
    const isTemporaryProduct = Boolean(item.description?.trim() && !item.productId);
    const errorKey = `item_${idx}_description`;
    const error = errors[errorKey];
    const handlingErrorKey = `item_${idx}_handlingType`;
    const handlingError = errors[handlingErrorKey];
    const settings = getSettings();

    // Valores calculados com arredondamento preciso para evitar dízimas de ponto flutuante
    const discountInValue = item.discountType === "fixed" 
        ? item.unitDiscount 
        : Math.round(((item.unitPrice * item.unitDiscount) / 100) * 100) / 100;

    const discountInPercent = item.discountType === "percentage" 
        ? item.unitDiscount 
        : (item.unitPrice > 0 ? Math.round(((item.unitDiscount / item.unitPrice) * 100) * 100) / 100 : 0);

    const initialSubtotal = Math.round((item.unitPrice - discountInValue) * 100) / 100;
    // Estados locais temporários para digitação livre sem disparar recálculos prematuros
    const [tempUnitPrice, setTempUnitPrice] = React.useState(item.unitPrice || 0);
    const [tempDiscountValue, setTempDiscountValue] = React.useState(discountInValue);
    const [tempDiscountPercent, setTempDiscountPercent] = React.useState(discountInPercent);
    const [tempSubtotal, setTempSubtotal] = React.useState(initialSubtotal);

    // Sincronizar estados locais apenas quando os valores persistidos mudam externamente
    React.useEffect(() => {
        setTempUnitPrice(item.unitPrice || 0);
        setTempDiscountValue(discountInValue);
        setTempDiscountPercent(discountInPercent);
        setTempSubtotal(initialSubtotal);
    }, [item.unitPrice, discountInValue, discountInPercent, initialSubtotal]);

    const commitUnitPrice = () => {
        const newUnitPrice = Math.max(0, Math.round(tempUnitPrice * 100) / 100);
        if (item.discountType === 'percentage') {
            const percentVal = Math.min(100, Math.max(0, item.unitDiscount || 0));
            const calculatedDiscountVal = Math.round(((newUnitPrice * percentVal) / 100) * 100) / 100;
            const calculatedSubtotal = Math.max(0, Math.round((newUnitPrice - calculatedDiscountVal) * 100) / 100);
            setTempUnitPrice(newUnitPrice);
            setTempDiscountValue(calculatedDiscountVal);
            setTempSubtotal(calculatedSubtotal);
            onBatchChange(idx, { unitPrice: newUnitPrice });
        } else {
            const discountVal = item.unitDiscount || 0;
            const effectiveDiscount = Math.min(discountVal, newUnitPrice);
            const calculatedPercent = newUnitPrice > 0 ? Math.min(100, Math.round(((effectiveDiscount / newUnitPrice) * 100) * 100) / 100) : 0;
            const calculatedSubtotal = Math.max(0, Math.round((newUnitPrice - effectiveDiscount) * 100) / 100);
            setTempUnitPrice(newUnitPrice);
            setTempDiscountPercent(calculatedPercent);
            setTempSubtotal(calculatedSubtotal);
            onBatchChange(idx, { unitPrice: newUnitPrice });
        }
    };

    const commitDiscountPercent = () => {
        const percentVal = Math.min(100, Math.max(0, Math.round(tempDiscountPercent * 100) / 100));
        const currentUnitPrice = item.unitPrice || 0;
        const calculatedDiscountVal = Math.min(currentUnitPrice, Math.round(((currentUnitPrice * percentVal) / 100) * 100) / 100);
        const calculatedSubtotal = Math.max(0, Math.round((currentUnitPrice - calculatedDiscountVal) * 100) / 100);

        setTempDiscountPercent(percentVal);
        setTempDiscountValue(calculatedDiscountVal);
        setTempSubtotal(calculatedSubtotal);

        onBatchChange(idx, { 
            discountType: 'percentage', 
            unitDiscount: percentVal 
        });
    };

    const commitDiscountValue = () => {
        const currentUnitPrice = item.unitPrice || 0;
        const val = Math.max(0, Math.round(tempDiscountValue * 100) / 100);
        const effectiveDiscount = Math.min(val, currentUnitPrice);
        const calculatedPercent = currentUnitPrice > 0 
            ? Math.min(100, Math.round(((effectiveDiscount / currentUnitPrice) * 100) * 100) / 100) 
            : 0;
        const calculatedSubtotal = Math.max(0, Math.round((currentUnitPrice - effectiveDiscount) * 100) / 100);

        setTempDiscountValue(effectiveDiscount);
        setTempDiscountPercent(calculatedPercent);
        setTempSubtotal(calculatedSubtotal);

        onBatchChange(idx, { 
            discountType: 'fixed', 
            unitDiscount: effectiveDiscount 
        });
    };

    const commitSubtotal = () => {
        const currentUnitPrice = item.unitPrice || 0;
        const val = Math.min(currentUnitPrice, Math.max(0, Math.round(tempSubtotal * 100) / 100));
        if (val >= currentUnitPrice) {
            setTempSubtotal(currentUnitPrice);
            setTempDiscountValue(0);
            setTempDiscountPercent(0);
            onBatchChange(idx, {
                discountType: 'fixed',
                unitDiscount: 0
            });
        } else {
            const newDiscount = Math.round((currentUnitPrice - val) * 100) / 100;
            const newPercent = currentUnitPrice > 0 ? Math.min(100, Math.round(((newDiscount / currentUnitPrice) * 100) * 100) / 100) : 0;
            setTempSubtotal(val);
            setTempDiscountValue(newDiscount);
            setTempDiscountPercent(newPercent);
            onBatchChange(idx, {
                discountType: 'fixed',
                unitDiscount: newDiscount
            });
        }
    };

    if (isMobile) {
        return (
            <div className={`p-4 sm:p-5 bg-white dark:bg-slate-900 border rounded-3xl ${error ? 'border-red-500 ring-4 ring-red-500/10' : 'border-slate-200/80 dark:border-slate-800'} shadow-sm relative group transition-all hover:shadow-md space-y-4`}>
                {/* Header do Card: Número do Item + Botão Excluir */}
                <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-2.5 min-w-0">
                        <span className="w-7 h-7 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-black text-xs flex items-center justify-center border border-blue-200/60 dark:border-blue-800/60 shrink-0">
                            #{idx + 1}
                        </span>
                        <span className="text-xs font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 truncate">
                            {item.description ? item.description : 'Novo Item'}
                        </span>
                    </div>

                    {!item.isComboItem && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="w-8 h-8 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-xl transition-all shrink-0"
                            title="Excluir item"
                        >
                            <i className="bi bi-trash text-sm" />
                        </button>
                    )}
                </div>

                {/* Linha 1: Descrição e Manuseio */}
                <div className="flex flex-wrap items-start gap-3 sm:gap-4">
                    <div className="flex-1 min-w-[220px]">
                        <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ml-1 ${isTemporaryProduct ? 'text-amber-600' : 'text-slate-400 dark:text-slate-500'}`}>
                            Descrição do Item <span className="text-red-500">*</span>
                            {isTemporaryProduct && <TemporaryProductAlert />}
                        </label>
                        {!item.isComboItem ? (
                            <ProductAutocomplete
                                value={item.description}
                                onChange={(val) => onChange(idx, 'description', val)}
                                onSelect={(p, v) => onSelectProduct(idx, p, v)}
                                onSelectDescription={(desc) => onChange(idx, 'description', desc)}
                                placeholder="Buscar produto..."
                                isTemporary={isTemporaryProduct}
                                className={error ? 'border-red-500 rounded-2xl ring-2 ring-red-500' : ''}
                            />
                        ) : (
                            <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                                <i className="bi bi-arrow-return-right text-slate-400" />
                                <span className="text-xs italic font-bold text-slate-600 dark:text-slate-300">{item.description}</span>
                            </div>
                        )}
                    </div>

                    {!isBudget && !item.isComboItem && (
                        <div className="w-[240px] sm:w-[260px] shrink-0">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Tipo de Manuseio
                            </label>
                            <select
                                className={`w-full bg-transparent border-b-2 ${handlingError ? 'border-red-500' : 'border-slate-200 dark:border-slate-700'} focus:border-blue-600 px-3 py-2 shadow-sm outline-none transition-all text-xs font-bold text-slate-700 dark:text-slate-200`}
                                value={item.handlingType || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    if (item.handlingType === val) return;
                                    onChange(idx, 'handlingType', val);
                                }}
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
                </div>

                {/* Linha 2: Quantidade, Preço Unitário, Descontos, Líquido e Total */}
                {!item.isComboItem && (
                    <div className="flex flex-wrap items-end gap-3 pt-1">
                        <div className="w-[85px] shrink-0">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Qtd. <span className="text-red-500">*</span>
                            </label>
                            <UnitInput
                                value={item.quantity}
                                onChange={(value: number) => onChange(idx, 'quantity', value)}
                                disabled={item.isComboItem}
                            />
                        </div>

                        <div className="w-[120px] shrink-0">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Preço Un. <span className="text-red-500">*</span>
                            </label>
                            <CurrencyInput
                                value={tempUnitPrice}
                                onChange={(val: number) => setTempUnitPrice(val)}
                                onBlur={commitUnitPrice}
                            />
                        </div>

                        <div className="w-[110px] shrink-0">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Desc. R$
                            </label>
                            <CurrencyInput
                                value={tempDiscountValue}
                                max={item.unitPrice || undefined}
                                onChange={(val: number) => setTempDiscountValue(val)}
                                onBlur={commitDiscountValue}
                            />
                        </div>

                        <div className="w-[90px] shrink-0">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Desc. %
                            </label>
                            <CurrencyOrPercentInput
                                prefix=""
                                suffix=" %"
                                value={tempDiscountPercent}
                                max={100}
                                onChange={(val: number) => setTempDiscountPercent(val)}
                                onBlur={commitDiscountPercent}
                            />
                        </div>

                        <div className="w-[120px] shrink-0">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Preço Un. Líq.
                            </label>
                            <CurrencyInput
                                value={tempSubtotal}
                                max={item.unitPrice || undefined}
                                onChange={(val: number) => setTempSubtotal(val)}
                                onBlur={commitSubtotal}
                            />
                        </div>

                        {/* Total do Item */}
                        <div className="ml-auto flex flex-col items-end justify-center px-4 py-2 bg-blue-50/70 dark:bg-blue-950/30 rounded-2xl shrink-0">
                            <span className="text-[8px] font-black uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest">Total Item</span>
                            <div className="text-sm font-black text-blue-600 dark:text-blue-400">
                                <CurrencyDisplay value={calcItemTotalValue(item)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    return (
        <tr className="group hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 font-sans">
            <td className="px-4 py-2 relative group/desc">
                {!item.isComboItem ? (
                    <>
                    <ProductAutocomplete
                        value={item.description}
                        onChange={(val) => onChange(idx, 'description', val)}
                        onSelect={(p, v) => onSelectProduct(idx, p, v)}
                        placeholder="Busque ou digite um produto..."
                        isTemporary={isTemporaryProduct}
                        className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500' : ''}
                    />
                    {isTemporaryProduct && <div className="mt-1"><TemporaryProductAlert /></div>}
                    </>
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
            {!isBudget && (
                <td className="px-3 py-2 w-[140px]">
                    {!item.isComboItem && (
                        <div className="relative group/hsel">
                            <select
                                className={`w-full bg-white dark:bg-slate-950 border ${handlingError ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800'} focus:border-blue-500 px-2 py-1.5 rounded-xl outline-none transition-all text-[11px] font-bold text-slate-600 dark:text-slate-400 pr-7`}
                                value={item.handlingType || ''}
                                onChange={(e) => {
                                    const val = e.target.value;
                                    if (!val) return;
                                    if (item.handlingType === val) return;
                                    onChange(idx, 'handlingType', val);
                                }}
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
            )}
            <td className="px-2 py-2 w-[80px]">
                <UnitInput
                    value={item.quantity}
                    onChange={(value: number) => onChange(idx, 'quantity', value)}
                    disabled={item.isComboItem}
                />
            </td>
            <td className="px-2 py-2 w-[110px]">
                {!item.isComboItem ? (
                    <CurrencyInput
                        value={tempUnitPrice}
                        onChange={(val: number) => setTempUnitPrice(val)}
                        onBlur={commitUnitPrice}
                        className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-2 w-[100px]">
                {!item.isComboItem ? (
                    <CurrencyInput
                        value={tempDiscountValue}
                        max={item.unitPrice || undefined}
                        onChange={(val: number) => setTempDiscountValue(val)}
                        onBlur={commitDiscountValue}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-2 w-[85px]">
                {!item.isComboItem ? (
                    <CurrencyOrPercentInput
                        prefix=""
                        suffix=" %"
                        value={tempDiscountPercent}
                        max={100}
                        onChange={(val: number) => setTempDiscountPercent(val)}
                        onBlur={commitDiscountPercent}
                        className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-2 w-[110px]">
                {!item.isComboItem ? (
                    <CurrencyInput
                        value={tempSubtotal}
                        max={item.unitPrice || undefined}
                        onChange={(val: number) => setTempSubtotal(val)}
                        onBlur={commitSubtotal}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1.5 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-2 w-[105px] text-right">
                <div className="font-bold text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
                    <CurrencyDisplay value={calcItemTotalValue(item)} />
                </div>
            </td>
            <td className="px-2 py-2 w-[50px] text-center">
                {!item.isComboItem && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="w-8 h-8 mx-auto flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir item"
                    >
                        <i className="bi bi-trash" />
                    </button>
                )}
            </td>
        </tr>
    );
};

const TemporaryProductAlert = () => (
    <span className="relative inline-flex items-center group/temp-alert" tabIndex={0} aria-label="Item temporário">
        <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xs cursor-help" />
        <span className="pointer-events-none absolute left-0 top-full z-[80] mt-2 hidden w-64 rounded-xl bg-slate-900 px-3 py-2 text-[9px] font-bold normal-case leading-relaxed tracking-normal text-white shadow-xl group-hover/temp-alert:block group-focus/temp-alert:block">
            Item temporário: selecione depois um produto real da lista para vincular estoque, custos e gráficos.
        </span>
    </span>
);

export default BodyRow;
