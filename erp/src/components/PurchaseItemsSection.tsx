import React, { useState } from 'react';
import ProductAutocomplete from './ProductAutocomplete';
import { PurchaseItem } from '../pages/types/purchase.type';
import { toast } from 'react-toastify';

interface Props {
    items: PurchaseItem[];
    onAddItem: (item: PurchaseItem) => boolean | void;
    onRemoveItem: (idx: number) => void;
    onUpdateItem?: (idx: number, item: PurchaseItem) => void;
    ipiPercent: number;
    freightPercent: number;
    formatCurrency: (value: number) => string;
    supplierId?: string;
    onSupplierAutoSelect?: (supplierId: string) => void;
    hasError?: boolean;
    isReceiptMode?: boolean;
}

export const PurchaseItemsSection = ({
    items,
    onAddItem,
    onRemoveItem,
    onUpdateItem,
    ipiPercent,
    freightPercent,
    formatCurrency,
    supplierId,
    onSupplierAutoSelect,
    hasError = false,
    isReceiptMode = true
}: Props) => {
    // Current item being added
    const [currentProductId, setCurrentProductId] = useState("");
    const [currentVariationId, setCurrentVariationId] = useState<string | undefined>(undefined);
    const [currentDescription, setCurrentDescription] = useState("");
    const [currentQty, setCurrentQty] = useState(1);
    const [currentCost, setCurrentCost] = useState(0);

    const tempIpiVal = currentCost * (ipiPercent / 100);
    const tempFreightVal = currentCost * (freightPercent / 100);
    const tempTotalUnit = currentCost + tempIpiVal + tempFreightVal;

    const handleAddItemClick = () => {
        if (!currentProductId) {
            toast.error('Selecione um produto antes de adicionar.');
            return;
        }

        const qtyToAdd = isReceiptMode ? 1 : Math.max(1, currentQty);

        const added = onAddItem({
            productId: currentProductId,
            variationId: currentVariationId,
            description: currentDescription,
            quantity: qtyToAdd,
            baseCost: currentCost,
            unitCost: tempTotalUnit,
            totalCost: qtyToAdd * tempTotalUnit
        });

        if (added === false) return;

        toast.success('Item adicionado.');
        setCurrentProductId("");
        setCurrentVariationId(undefined);
        setCurrentDescription("");
        setCurrentQty(1);
        setCurrentCost(0);
    };

    const handleQtyChange = (idx: number, newQty: number) => {
        const item = items[idx];
        const validQty = Math.max(1, newQty);
        const baseCost = item.baseCost || item.unitCost;
        const itemIpi = baseCost * (ipiPercent / 100);
        const itemFreight = baseCost * (freightPercent / 100);
        const itemUnitCost = baseCost + itemIpi + itemFreight;

        const updated: PurchaseItem = {
            ...item,
            quantity: validQty,
            unitCost: itemUnitCost,
            totalCost: validQty * itemUnitCost
        };

        if (onUpdateItem) {
            onUpdateItem(idx, updated);
        }
    };

    const handleCostChange = (idx: number, newCost: number) => {
        const item = items[idx];
        const validCost = Math.max(0, newCost);
        const itemIpi = validCost * (ipiPercent / 100);
        const itemFreight = validCost * (freightPercent / 100);
        const itemUnitCost = validCost + itemIpi + itemFreight;

        const updated: PurchaseItem = {
            ...item,
            baseCost: validCost,
            unitCost: itemUnitCost,
            totalCost: item.quantity * itemUnitCost
        };

        if (onUpdateItem) {
            onUpdateItem(idx, updated);
        }
    };

    // Calcular valores dos itens da lista (com rateio dinâmico)
    const processedItems = items.map(item => {
        const baseCost = item.baseCost || item.unitCost;
        const itemIpi = baseCost * (ipiPercent / 100);
        const itemFreight = baseCost * (freightPercent / 100);
        const itemUnitCost = baseCost + itemIpi + itemFreight;
        const itemSubtotal = baseCost * item.quantity;
        const itemTotalCost = item.quantity * itemUnitCost;

        return {
            ...item,
            baseCost,
            unitCost: itemUnitCost,
            subtotal: itemSubtotal,
            totalCost: itemTotalCost
        };
    });

    const totalValue = processedItems.reduce((sum, item) => sum + item.totalCost, 0);

    return (
        <div className="space-y-6">
            {/* Container de Adicionar Item */}
            <div className={`rounded-2xl border p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4 ${hasError ? 'border-red-500 ring-2 ring-red-500/15' : 'border-slate-200 dark:border-slate-800'}`}>
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <i className="bi bi-plus-circle-fill text-emerald-600 text-sm" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Adicionar Item</h3>
                </div>
                {hasError && <p className="text-xs font-bold text-red-500">Adicione pelo menos um item ao recebimento.</p>}
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                    {/* Campo Produto */}
                    <div className={`${isReceiptMode ? 'sm:col-span-11' : 'sm:col-span-6'} flex flex-col gap-1.5`}>
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</label>
                        <ProductAutocomplete
                            supplierId={supplierId || undefined}
                            value={currentDescription}
                            onChange={setCurrentDescription}
                            onSelect={(p, v) => {
                                setCurrentProductId(p.id!);
                                setCurrentVariationId(v?.id);
                                const prodName = p.name || p.title || p.description;
                                setCurrentDescription(v ? (v.name && v.name.toLowerCase().includes(prodName.toLowerCase()) ? v.name : `${prodName} - ${v.name}`) : prodName);
                                
                                if (v?.costPrice) setCurrentCost(v.costPrice);
                                else if (p.costPrice) setCurrentCost(p.costPrice);
                                else setCurrentCost(0);

                                const prodSupplierId = p.mainSupplierId || p.supplierId || (p as any).main_supplier_id || (p as any).supplier_id;
                                if (!supplierId && prodSupplierId && onSupplierAutoSelect) {
                                    onSupplierAutoSelect(prodSupplierId);
                                }
                            }}
                            onSelectDescription={setCurrentDescription}
                            placeholder={supplierId ? "Buscar produto deste fornecedor..." : "Buscar produto..."}
                            inputClassName="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-emerald-600 dark:focus:border-emerald-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 focus:shadow-sm rounded-none"
                        />
                    </div>

                    {!isReceiptMode && (
                        <>
                            {/* Campo Qtd */}
                            <div className="sm:col-span-2 flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd</label>
                                <div className="flex bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-1.5 focus-within:border-emerald-600 transition-all items-center justify-center">
                                    <input 
                                        type="number"
                                        placeholder="0"
                                        value={currentQty || ""}
                                        max={999}
                                        onChange={(e) => setCurrentQty(Math.min(999, Math.max(1, Number(e.target.value))))}
                                        className="w-full bg-transparent outline-none font-bold text-sm text-center border-none focus:ring-0 p-0 text-slate-700 dark:text-slate-300 rounded-none"
                                    />
                                    <span className="text-[10px] font-black text-slate-400 ml-1">un</span>
                                </div>
                            </div>

                            {/* Campo Custo Base */}
                            <div className="sm:col-span-3 flex flex-col gap-1.5">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Custo Base (R$)</label>
                                <input 
                                    type="number"
                                    placeholder="0.00"
                                    value={currentCost || ""}
                                    onChange={(e) => setCurrentCost(Number(e.target.value))}
                                    className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-emerald-600 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all text-center rounded-none"
                                />
                            </div>
                        </>
                    )}

                    {/* Botão Adicionar (Apenas ícone de + no modo recebimento) */}
                    <div className={`${isReceiptMode ? 'sm:col-span-1' : 'sm:col-span-1'} flex justify-end`}>
                        <button 
                            type="button"
                            onClick={handleAddItemClick}
                            className={`w-full ${
                                isReceiptMode
                                    ? 'h-10 rounded-xl bg-emerald-600 text-white hover:bg-emerald-700 active:scale-95 flex items-center justify-center shadow-md transition-all'
                                    : 'py-2.5 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-1.5 font-bold shadow-md text-xs'
                            }`}
                            title="Adicionar Item"
                        >
                            <i className="bi bi-plus-lg text-lg font-black"></i>
                            {!isReceiptMode && <span className="font-black uppercase tracking-wider">Adicionar</span>}
                        </button>
                    </div>
                </div>
            </div>

            {/* Items Table (Visible on desktop >= lg) */}
            <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd Recebida</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Custo Base (R$)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">IPI (R$)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Frete (R$)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Total Unitário</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Total Final</th>
                            <th className="px-6 py-4"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {processedItems.map((item, idx) => (
                            <tr key={idx} className="group hover:bg-slate-50/30 dark:hover:bg-slate-900/15 transition-colors">
                                <td className="px-6 py-4">
                                    <span className="text-sm font-bold text-slate-700 dark:text-slate-200">{item.description}</span>
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex items-center justify-center gap-1 bg-slate-100 dark:bg-slate-800/80 rounded-xl p-1 w-32 mx-auto border border-slate-200/60 dark:border-slate-700">
                                        <button
                                            type="button"
                                            onClick={() => handleQtyChange(idx, item.quantity - 1)}
                                            className="w-7 h-7 rounded-lg bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors flex items-center justify-center text-xs shadow-sm"
                                        >
                                            -
                                        </button>
                                        <input
                                            type="number"
                                            min="1"
                                            value={item.quantity}
                                            onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                                            className="w-12 bg-transparent text-center font-black text-sm text-slate-800 dark:text-slate-100 outline-none p-0 border-none"
                                        />
                                        <button
                                            type="button"
                                            onClick={() => handleQtyChange(idx, item.quantity + 1)}
                                            className="w-7 h-7 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors flex items-center justify-center text-xs shadow-sm"
                                        >
                                            +
                                        </button>
                                    </div>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.baseCost || ''}
                                        onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                                        className="w-24 border-b-2 border-slate-200 dark:border-slate-700 bg-transparent px-2 py-1 text-right text-sm font-bold text-slate-800 dark:text-slate-100 outline-none focus:border-emerald-600"
                                    />
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-400">
                                    {formatCurrency((item.baseCost || 0) * (ipiPercent / 100))}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-400">
                                    {formatCurrency((item.baseCost || 0) * (freightPercent / 100))}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                    {formatCurrency(item.unitCost || 0)}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-black text-blue-600 dark:text-blue-400">
                                    {formatCurrency(item.totalCost || 0)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onRemoveItem(idx)} className="text-slate-400 hover:text-red-500 transition-all p-1">
                                        <i className="bi bi-trash text-sm"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {processedItems.length === 0 && (
                            <tr>
                                <td colSpan={8} className="px-6 py-10 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhum item adicionado</td>
                            </tr>
                        )}
                    </tbody>
                    {processedItems.length > 0 && (
                        <tfoot className="bg-slate-900 text-white">
                            <tr>
                                <td colSpan={6} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-400">Valor Total do Recebimento</td>
                                <td className="px-6 py-4 text-right text-xl font-black text-emerald-400">{formatCurrency(totalValue)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Items Card List (Visible on mobile/tablet < lg) */}
            <div className="block lg:hidden space-y-4">
                {processedItems.map((item, idx) => {
                    const baseCost = item.baseCost || 0;
                    const itemIpi = baseCost * (ipiPercent / 100);
                    const itemFreight = baseCost * (freightPercent / 100);
                    return (
                        <div key={idx} className="bg-white dark:bg-slate-950 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4 relative shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                                <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.description}</span>
                                <button 
                                    onClick={() => onRemoveItem(idx)} 
                                    className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors"
                                    title="Remover Item"
                                >
                                    <i className="bi bi-trash text-base"></i>
                                </button>
                            </div>

                            {/* Campo de Quantidade em Destaque ocupando a largura */}
                            <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 space-y-1.5">
                                <span className="text-slate-400 uppercase tracking-widest text-[9px] font-black block">Quantidade Recebida</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleQtyChange(idx, item.quantity - 1)}
                                        className="flex-1 h-11 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                                        className="w-24 sm:w-32 h-11 bg-white dark:bg-slate-800 text-center font-black text-base text-slate-800 dark:text-slate-100 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-sm"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => handleQtyChange(idx, item.quantity + 1)}
                                        className="flex-1 h-11 rounded-xl bg-emerald-600 text-white font-black text-lg hover:bg-emerald-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            {/* Grid de Valores e Métricas */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 flex flex-col justify-center">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Custo Base (R$)</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.baseCost || ''}
                                        onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                                        className="w-full bg-transparent border-b border-slate-300 dark:border-slate-700 text-xs font-bold text-slate-800 dark:text-slate-200 outline-none focus:border-emerald-600 p-0.5"
                                    />
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">IPI (R$)</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">{formatCurrency(itemIpi)}</span>
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Frete (R$)</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">{formatCurrency(itemFreight)}</span>
                                </div>

                                <div className="p-2.5 bg-emerald-50/50 dark:bg-emerald-950/20 rounded-xl border border-emerald-100/60 dark:border-emerald-900/40">
                                    <span className="text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider text-[9px] font-black block mb-0.5">Total Unitário</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 block text-xs leading-normal">{formatCurrency(item.unitCost || 0)}</span>
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 col-span-2 sm:col-span-2">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Total Final do Item</span>
                                    <span className="font-black text-blue-600 dark:text-blue-400 block text-sm leading-normal">{formatCurrency(item.totalCost || 0)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {processedItems.length === 0 && (
                    <div className="text-center py-10 bg-white dark:bg-slate-950 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl text-xs font-bold text-slate-300 uppercase tracking-widest animate-pulse">
                        Nenhum item adicionado
                    </div>
                )}
            </div>
        </div>
    );
};
