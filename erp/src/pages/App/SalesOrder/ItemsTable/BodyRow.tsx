import React from 'react';
import Product, { Variation } from '../../../types/product.type';
import ProductAutocomplete from '../../../../components/ProductAutocomplete';
import Item from '../../../types/items.type';
import Service from '../../../types/service.type';
import { calcItemTotalValue } from '../../../utils/calculations';
import CurrencyOrPercentInput from '../../../../components/CurrencyOrPercentInput';
import UnitInput from './UnitInput';
import CurrencyInput from '../../../../components/CurrencyInput';
import CurrencyDisplay from '../../../../components/CurrencyDisplay';
import { ValidationErrors } from '../../../utils/validations';
import { getSettings } from '@/pages/utils/settingsService';
import ServiceAutocomplete from './ServiceAutocomplete';

interface Props {
    item: Item;
    productItems: Item[];
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
    isReturn?: boolean;
    hideHandling?: boolean;
    highlightAsTemporary?: boolean;
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

const BodyRow = ({
    item,
    productItems,
    onChange,
    onBatchChange,
    onDelete,
    idx,
    deliveryMethod,
    errors,
    isMobile,
    onSelectProduct,
    isBudget,
    isReturn,
    hideHandling,
    highlightAsTemporary,
    isExpanded = true,
    onToggleExpand
}: Props) => {
    const isService = item.itemType === 'service';
    const shouldHideHandling = Boolean(isService || hideHandling || isBudget || isReturn);
    const isLinkedProduct = Boolean(!isService && item.description?.trim() && item.productId);
    const isTemporaryProduct = Boolean(!isService && item.description?.trim() && !item.productId);
    const errorKey = `item_${idx}_description`;
    const error = errors[errorKey];
    const handlingErrorKey = `item_${idx}_handlingType`;
    const handlingError = !isService && errors[handlingErrorKey];
    const itemHasError = Boolean(error || handlingError);
    const settings = getSettings();
    const serviceProductLink = isService ? (
        <div className="mt-2">
            <label className="mb-1 ml-1 block text-[10px] font-black uppercase tracking-wider text-slate-400">Vincular ao produto</label>
            <select
                aria-label="Vincular ao produto"
                value={item.linkedProductOrderItemId || ''}
                onChange={event => onChange(idx, 'linkedProductOrderItemId', event.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200"
            >
                <option value="">Sem vínculo</option>
                {productItems.map((product, productIndex) => (
                    <option key={product.orderItemId || productIndex} value={product.orderItemId || ''} disabled={!product.orderItemId}>
                        {product.description || 'Produto sem descrição'} — {product.code || 'Sem SKU'} (linha {productIndex + 1})
                    </option>
                ))}
            </select>
        </div>
    ) : null;

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
    const [tempObservation, setTempObservation] = React.useState(item.observation || '');

    // Sincronizar estados locais apenas quando os valores persistidos mudam externamente
    React.useEffect(() => {
        setTempUnitPrice(item.unitPrice || 0);
        setTempDiscountValue(discountInValue);
        setTempDiscountPercent(discountInPercent);
        setTempSubtotal(initialSubtotal);
        setTempObservation(item.observation || '');
    }, [item.unitPrice, discountInValue, discountInPercent, initialSubtotal, item.observation]);

    const commitObservation = () => {
        if ((item.observation || '') !== tempObservation) {
            onChange(idx, 'observation', tempObservation);
        }
    };

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

    const handleSelectService = (service: Service) => {
        onBatchChange(idx, {
            description: service.description,
            unitPrice: service.unitPrice || 0,
            costPrice: service.costPrice || 0,
            itemType: 'service'
        });
    };

    // VISUALIZAÇÃO EM CARD (isMobile / width < 1280px)
    if (isMobile) {
        // MODO COMPACTO
        if (!isExpanded) {
            return (
                <div
                    onClick={onToggleExpand}
                    className={`px-3.5 py-2.5 bg-white dark:bg-slate-900 border rounded-2xl ${
                        highlightAsTemporary 
                            ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/10 dark:bg-amber-950/10' 
                            : itemHasError
                            ? 'border-red-500 ring-2 ring-red-500/10' 
                            : 'border-slate-200/80 dark:border-slate-800'
                    } shadow-sm hover:shadow-md transition-all cursor-pointer flex items-center justify-between gap-3 group`}
                >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 text-xs ${
                            isService
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/40'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border border-blue-100 dark:border-blue-900/40'
                        }`}>
                            <i className={`bi ${isService ? 'bi-tools' : 'bi-box-seam'}`} />
                        </div>

                        <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                                <span className={`text-xs font-bold truncate ${itemHasError ? 'text-red-600 dark:text-red-400' : 'text-slate-800 dark:text-slate-100'}`}>
                                    {item.description?.trim() || (
                                        <span className="text-slate-400 italic font-normal">
                                            {isService ? 'Serviço sem descrição' : 'Produto sem descrição'}
                                        </span>
                                    )}
                                </span>
                                {isTemporaryProduct && <TemporaryProductAlert />}
                                {item.handlingType && !shouldHideHandling && (
                                    <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-[10px] font-semibold text-slate-500">
                                        {item.handlingType}
                                    </span>
                                )}
                            </div>
                            {item.observation && (
                                <div className="text-[10px] text-slate-400 truncate max-w-sm mt-0.5">
                                    {item.observation}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right">
                            <span className="text-[10px] text-slate-400 font-bold block leading-none">
                                {item.quantity || 1} un
                            </span>
                            <span className="text-xs font-black text-blue-600 dark:text-blue-400">
                                <CurrencyDisplay value={calcItemTotalValue(item)} />
                            </span>
                        </div>

                        <div className="flex items-center gap-1">
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleExpand?.();
                                }}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-950/30 rounded-lg transition-colors"
                                title="Editar item"
                            >
                                <i className="bi bi-pencil text-xs" />
                            </button>
                            {!item.isComboItem && (
                                <button
                                    type="button"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete();
                                    }}
                                    className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                    title="Excluir item"
                                >
                                    <i className="bi bi-trash text-xs" />
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            );
        }

        // MODO EXPANDIDO (FORMULÁRIO COMPACTO)
        return (
            <div className={`p-3.5 sm:p-4 bg-white dark:bg-slate-900 border rounded-2xl ${
                highlightAsTemporary 
                    ? 'border-amber-400 dark:border-amber-500 ring-2 ring-amber-400/20 bg-amber-50/10 dark:bg-amber-950/10' 
                    : itemHasError
                    ? 'border-red-500 ring-2 ring-red-500/10' 
                    : 'border-slate-200/80 dark:border-slate-800'
            } shadow-sm relative group transition-all space-y-3`}>
                
                {/* Cabeçalho do Card Expandido com Ações */}
                <div className={`flex items-center justify-between border-b pb-2 ${itemHasError ? 'border-red-300 dark:border-red-800' : 'border-slate-100 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-2">
                        <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] ${
                            isService
                                ? 'bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400'
                                : 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400'
                        }`}>
                            <i className={`bi ${isService ? 'bi-tools' : 'bi-box-seam'}`} />
                        </span>
                        <span className={`text-[11px] font-black uppercase tracking-wider ${itemHasError ? 'text-red-600 dark:text-red-400' : 'text-slate-500 dark:text-slate-400'}`}>
                            Item #{idx + 1} • {isService ? 'Serviço' : 'Produto'}
                        </span>
                    </div>

                    <div className="flex items-center gap-1">
                        <button
                            type="button"
                            onClick={onToggleExpand}
                            className="px-2 py-1 flex items-center gap-1 text-[11px] font-bold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                            title="Recolher item"
                        >
                            <span>Recolher</span>
                            <i className="bi bi-chevron-up text-xs" />
                        </button>
                        {!item.isComboItem && (
                            <button
                                type="button"
                                onClick={onDelete}
                                className="w-7 h-7 flex items-center justify-center text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition-colors"
                                title="Excluir item"
                            >
                                <i className="bi bi-trash text-xs" />
                            </button>
                        )}
                    </div>
                </div>

                {/* Linha 1: Descrição */}
                <div className="w-full">
                    <label className={`text-[10px] font-black uppercase tracking-wider mb-1 flex items-center gap-1.5 ml-1 ${error ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                        <span>{isService ? 'Descrição do Serviço' : 'Descrição do Item'}</span> <span className="text-red-500">*</span>
                        {isTemporaryProduct && <TemporaryProductAlert />}
                    </label>
                    {isService ? (
                        <ServiceAutocomplete
                            value={item.description}
                            onChange={(val) => onChange(idx, 'description', val)}
                            onSelectService={handleSelectService}
                            placeholder="Buscar serviço cadastrado ou digite o nome..."
                            className={error ? 'border-red-500 ring-2 ring-red-500' : ''}
                        />
                    ) : !item.isComboItem ? (
                        <ProductAutocomplete
                            value={item.description}
                            onChange={(val) => onChange(idx, 'description', val)}
                            onSelect={(p, v) => onSelectProduct(idx, p, v)}
                            placeholder="Buscar produto no catálogo..."
                            isTemporary={isTemporaryProduct}
                            isSelected={isLinkedProduct}
                            className={error ? 'border-red-500 rounded-2xl ring-2 ring-red-500' : ''}
                        />
                    ) : (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-50 dark:bg-slate-800/40 rounded-2xl border border-slate-100 dark:border-slate-800">
                            <i className="bi bi-arrow-return-right text-slate-400" />
                            <span className="text-xs italic font-bold text-slate-600 dark:text-slate-300">{item.description}</span>
                        </div>
                    )}
                </div>
                {serviceProductLink}

                {/* Linha 2: Manuseio (se produto) e Observação */}
                {!item.isComboItem && (
                    <div className="flex flex-wrap sm:flex-nowrap items-start gap-3">
                        {!shouldHideHandling && (
                            <div className="w-full sm:w-[220px] md:w-[240px] shrink-0">
                                <label className={`text-[10px] font-black uppercase tracking-wider mb-1 block ml-1 ${handlingError ? 'text-red-600 dark:text-red-400' : 'text-slate-400 dark:text-slate-500'}`}>
                                    Tipo de Manuseio <span className="text-red-500">*</span>
                                </label>
                                <select
                                    className={`w-full appearance-none border-b-2 bg-transparent px-3 py-1.5 text-xs font-bold text-slate-700 outline-none transition-colors dark:text-slate-200 ${handlingError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-700 dark:focus:border-blue-500'}`}
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

                        <div className="flex-1 min-w-[200px] w-full">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Observação
                            </label>
                            <input
                                type="text"
                                value={tempObservation}
                                onChange={(e) => setTempObservation(e.target.value)}
                                onBlur={commitObservation}
                                placeholder="Observação sobre este item..."
                                className="w-full bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 focus:border-blue-500 px-3 py-1.5 rounded-xl text-xs font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                    </div>
                )}

                {/* Linha 3: Grid de Valores */}
                {!item.isComboItem && (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 items-end pt-1">
                        <div className="w-full">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Qtd. <span className="text-red-500">*</span>
                            </label>
                            <UnitInput
                                value={item.quantity}
                                onChange={(value: number) => onChange(idx, 'quantity', value)}
                                disabled={item.isComboItem}
                            />
                        </div>

                        <div className="w-full">
                            <label className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1 block ml-1">
                                Preço Un. <span className="text-red-500">*</span>
                            </label>
                            <CurrencyInput
                                value={tempUnitPrice}
                                onChange={(val: number) => setTempUnitPrice(val)}
                                onBlur={commitUnitPrice}
                            />
                        </div>

                        <div className="w-full">
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

                        <div className="w-full">
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

                        <div className="w-full">
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
                        <div className="w-full flex flex-col items-end justify-center px-3 py-1.5 bg-blue-50/70 dark:bg-blue-950/30 border border-blue-100/80 dark:border-blue-900/40 rounded-xl min-h-[44px]">
                            <span className="text-[8px] font-black uppercase text-blue-600/70 dark:text-blue-400/70 tracking-widest">Total</span>
                            <div className="text-xs font-black text-blue-600 dark:text-blue-400">
                                <CurrencyDisplay value={calcItemTotalValue(item)} />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // VISUALIZAÇÃO EM TABELA (width >= 1280px)
    return (
        <tr className={`group transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 font-sans ${highlightAsTemporary ? 'bg-amber-50/50 dark:bg-amber-950/20 ring-2 ring-inset ring-amber-400/50' : 'hover:bg-slate-50/50 dark:hover:bg-slate-800/20'}`}>
            <td className="px-3 py-1.5 relative group/desc">
                {isService ? (
                    <>
                        <ServiceAutocomplete
                            value={item.description}
                            onChange={(val) => onChange(idx, 'description', val)}
                            onSelectService={handleSelectService}
                            placeholder="Descrição do serviço..."
                            className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500' : ''}
                        />
                        <div className="mt-1 flex items-center gap-2">
                            <input
                                type="text"
                                value={tempObservation}
                                onChange={(e) => setTempObservation(e.target.value)}
                                onBlur={commitObservation}
                                placeholder="Observação..."
                                className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
                            />
                        </div>
                        {serviceProductLink}
                    </>
                ) : !item.isComboItem ? (
                    <>
                    <ProductAutocomplete
                        value={item.description}
                        onChange={(val) => onChange(idx, 'description', val)}
                        onSelect={(p, v) => onSelectProduct(idx, p, v)}
                        placeholder="Busque ou digite um produto..."
                        isTemporary={isTemporaryProduct}
                        isSelected={isLinkedProduct}
                        className={error ? 'border-red-500 rounded-xl ring-2 ring-red-500' : ''}
                    />
                    <div className="mt-1 flex items-center gap-2">
                        <input
                            type="text"
                            value={tempObservation}
                            onChange={(e) => setTempObservation(e.target.value)}
                            onBlur={commitObservation}
                            placeholder="Observação (ex: salvados, peça do mostruário com avaria)..."
                            className="w-full bg-slate-50/60 dark:bg-slate-800/40 border border-slate-200/80 dark:border-slate-700/80 focus:border-blue-500 px-2 py-0.5 rounded-lg text-[11px] font-medium text-slate-700 dark:text-slate-200 outline-none transition-all placeholder:text-slate-400"
                        />
                    </div>
                    {isLinkedProduct && (
                        <div className="flex items-center gap-1 mt-0.5 text-[9px] font-bold text-emerald-600 dark:text-emerald-400 ml-1">
                            <i className="bi bi-check-circle-fill text-emerald-500 text-[10px]" />
                            <span>Produto vinculado ao catálogo</span>
                        </div>
                    )}
                    {isTemporaryProduct && (
                        <div className="mt-0.5 ml-1">
                            <TemporaryProductAlert />
                        </div>
                    )}
                    </>
                ) : (
                    <div className="flex items-center gap-2 pl-3">
                        <i className="bi bi-arrow-return-right text-slate-300" />
                        <span className="text-xs italic text-slate-500 dark:text-slate-400">{item.description}</span>
                    </div>
                )}
                {error && (
                    <div className="absolute left-4 -top-8 hidden group-hover/desc:flex items-center px-2 py-1 bg-red-500 text-white text-[10px] font-bold rounded shadow-lg z-50 whitespace-nowrap font-sans">
                        {error}
                        <div className="absolute -bottom-1 left-4 w-2 h-2 bg-red-500 rotate-45" />
                    </div>
                )}
            </td>
            {!shouldHideHandling && (
                <td className="px-2 py-1.5 w-[140px]">
                    {!item.isComboItem && (
                        <div className="relative group/hsel">
                            <select
                                className={`w-full appearance-none border-b-2 bg-transparent px-2 py-1 text-[11px] font-bold text-slate-600 outline-none transition-colors dark:text-slate-400 ${handlingError ? 'border-red-500 focus:border-red-500' : 'border-slate-200 focus:border-blue-600 dark:border-slate-800 dark:focus:border-blue-500'}`}
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
            {isService && !hideHandling && !isBudget && !isReturn && (
                <td className="px-2 py-1.5 w-[140px] text-center text-xs text-slate-300 dark:text-slate-700">
                    -
                </td>
            )}
            <td className="px-2 py-1.5 w-[80px]">
                <UnitInput
                    value={item.quantity}
                    onChange={(value: number) => onChange(idx, 'quantity', value)}
                    disabled={item.isComboItem}
                />
            </td>
            <td className="px-2 py-1.5 w-[110px]">
                {!item.isComboItem ? (
                    <CurrencyInput
                        value={tempUnitPrice}
                        onChange={(val: number) => setTempUnitPrice(val)}
                        onBlur={commitUnitPrice}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-1.5 w-[100px]">
                {!item.isComboItem ? (
                    <CurrencyInput
                        value={tempDiscountValue}
                        max={item.unitPrice || undefined}
                        onChange={(val: number) => setTempDiscountValue(val)}
                        onBlur={commitDiscountValue}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-1.5 w-[85px]">
                {!item.isComboItem ? (
                    <CurrencyOrPercentInput
                        prefix=""
                        suffix=" %"
                        value={tempDiscountPercent}
                        max={100}
                        onChange={(val: number) => setTempDiscountPercent(val)}
                        onBlur={commitDiscountPercent}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-1.5 w-[110px]">
                {!item.isComboItem ? (
                    <CurrencyInput
                        value={tempSubtotal}
                        max={item.unitPrice || undefined}
                        onChange={(val: number) => setTempSubtotal(val)}
                        onBlur={commitSubtotal}
                        className="w-full bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-blue-500 px-2 py-1 rounded-xl text-xs font-bold outline-none text-right"
                    />
                ) : (
                    <div className="text-right text-xs font-bold text-slate-400">-</div>
                )}
            </td>
            <td className="px-2 py-1.5 w-[105px] text-right">
                <div className="font-bold text-slate-700 dark:text-slate-200 text-xs whitespace-nowrap">
                    <CurrencyDisplay value={calcItemTotalValue(item)} />
                </div>
            </td>
            <td className="px-2 py-1.5 w-[50px] text-center">
                {!item.isComboItem && (
                    <button
                        type="button"
                        onClick={onDelete}
                        className="w-7 h-7 mx-auto flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-red-500 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                        title="Excluir item"
                    >
                        <i className="bi bi-trash text-xs" />
                    </button>
                )}
            </td>
        </tr>
    );
};

const TemporaryProductAlert = () => (
    <span className="relative inline-flex items-center gap-1 text-[10px] font-bold text-amber-600 dark:text-amber-400 group/temp-alert" tabIndex={0} aria-label="Produto sem cadastro">
        <i className="bi bi-exclamation-triangle-fill text-amber-500 text-xs cursor-help" />
        <span>Produto sem cadastro</span>
        <span className="pointer-events-none absolute left-0 top-full z-[80] mt-1 hidden w-72 rounded-xl bg-slate-900 px-3 py-2 text-[9px] font-bold normal-case leading-relaxed tracking-normal text-white shadow-xl group-hover/temp-alert:block group-focus/temp-alert:block">
            Produto sem cadastro: este item não gera movimentação de estoque (nem na venda, nem na devolução, nem na conciliação comercial). Selecione um produto da lista para vinculá-lo ao catálogo.
        </span>
    </span>
);

export default BodyRow;
