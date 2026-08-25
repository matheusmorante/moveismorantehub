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
                                    placeholder="Descrição do item..."
                                    className={error ? 'border-red-500 rounded-2xl ring-2 ring-red-500' : ''}
                                />
                            ) : (
                                <div className="flex items-center gap-2 pl-3 py-2">
                                    <i className="bi bi-arrow-return-right text-slate-300" />
                                    <span className="text-sm italic text-slate-500 dark:text-slate-400">{item.description}</span>
                                </div>
                            )}
                        </div>
                        
                        {!item.isComboItem && (
                            <div className="flex-[2] min-w-0">
                                <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Manuseio</label>
                                <select
                                    className={`w-full bg-white dark:bg-slate-950 border ${handlingError ? 'border-red-500 ring-2 ring-red-500/10' : 'border-slate-200 dark:border-slate-800'} focus:border-blue-500 px-3 py-2 rounded-xl outline-none transition-all text-xs font-bold text-slate-600 dark:text-slate-400`}
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

                        {!item.isComboItem && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="w-9 h-9 mt-5 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-all"
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
                                    value={tempUnitPrice}
                                    onChange={(val: number) => setTempUnitPrice(val)}
                                    onBlur={commitUnitPrice}
                                    className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-3 py-2 rounded-xl text-sm font-bold outline-none"
                                />
                            </div>
                        </div>
                    )}

                    {/* Linha 3: Desconto e Total */}
                    <div className="flex gap-3 items-end">
                        {!item.isComboItem ? (
                            <div className="flex-[3] space-y-1">
                                <div className="grid grid-cols-2 gap-2">
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Desconto R$</label>
                                        <CurrencyInput
                                            value={tempDiscountValue}
                                            max={item.unitPrice || undefined}
                                            onChange={(val: number) => setTempDiscountValue(val)}
                                            onBlur={commitDiscountValue}
                                            className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-3 py-2 rounded-xl text-sm font-bold outline-none text-right"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Desconto %</label>
                                        <CurrencyOrPercentInput
                                            prefix=""
                                            suffix=" %"
                                            value={tempDiscountPercent}
                                            max={100}
                                            onChange={(val: number) => setTempDiscountPercent(val)}
                                            onBlur={commitDiscountPercent}
                                            className="w-full bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-3 py-2 rounded-xl text-sm font-bold outline-none text-right"
                                        />
                                    </div>
                                </div>
                            </div>
                        ) : <div className="flex-[3]" />}
                        
                        <div className="flex-1">
                            <label className="text-[9px] font-black uppercase text-slate-400 mb-1 block ml-1">Preço Un. Líquido</label>
                            <CurrencyInput
                                value={tempSubtotal}
                                max={item.unitPrice || undefined}
                                onChange={(val: number) => setTempSubtotal(val)}
                                onBlur={commitSubtotal}
                                className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-3 py-2 rounded-xl text-sm font-bold outline-none text-right"
                            />
                        </div>

                        <div className="flex-1 flex flex-col items-end gap-1 px-4 py-2 bg-blue-50/50 dark:bg-blue-900/10 rounded-2xl border border-blue-100/30 dark:border-blue-500/10">
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
                            {handlingError && (
                                <div className="absolute left-0 -top-8 hidden group-hover/hsel:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap font-sans">
                                    {handlingError}
                                    <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                                </div>
                            )}
                        </div>
                    )}
                </td>
            )}
            <td className="px-2 py-2 w-[80px]">
                <div className="w-full mx-auto">
                    <UnitInput
                        value={item.quantity}
                        onChange={(value: number) => onChange(idx, 'quantity', value)}
                        disabled={item.isComboItem}
                    />
                </div>
            </td>
            <td className="px-2 py-2 w-[110px]">
                {!item.isComboItem ? (
                    <div className="w-full ml-auto">
                        <CurrencyInput
                            value={tempUnitPrice}
                            onChange={(val: number) => setTempUnitPrice(val)}
                            onBlur={commitUnitPrice}
                            showBadge={true}
                            badgeText="R$"
                        />
                    </div>
                ) : (
                    <div className="text-center text-[10px] text-slate-400 font-bold">---</div>
                )}
            </td>
            <td className="px-2 py-2 w-[100px] text-right">
                {!item.isComboItem && (
                    <div className="w-full ml-auto">
                        <CurrencyInput
                            value={tempDiscountValue}
                            max={item.unitPrice || undefined}
                            onChange={(val: number) => setTempDiscountValue(val)}
                            onBlur={commitDiscountValue}
                            showBadge={true}
                            badgeText="R$"
                        />
                    </div>
                )}
            </td>
            <td className="px-2 py-2 w-[85px] text-right">
                {!item.isComboItem && (
                    <div className="w-full ml-auto">
                        <CurrencyOrPercentInput
                            value={tempDiscountPercent}
                            max={100}
                            onChange={(val: number) => setTempDiscountPercent(val)}
                            onBlur={commitDiscountPercent}
                            showBadge={true}
                            badgeText="%"
                        />
                    </div>
                )}
            </td>
            <td className="px-2 py-2 w-[110px]">
                <div className="w-full ml-auto">
                    <CurrencyInput
                        value={tempSubtotal}
                        max={item.unitPrice || undefined}
                        onChange={(val: number) => setTempSubtotal(val)}
                        onBlur={commitSubtotal}
                        showBadge={true}
                        badgeText="R$"
                    />
                </div>
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

export default BodyRow;
