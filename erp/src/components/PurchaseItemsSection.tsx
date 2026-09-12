import React, { useState } from 'react';
import ProductAutocomplete from './ProductAutocomplete';
import { PurchaseItem } from '../pages/types/purchase.type';
import Product, { Variation } from '../pages/types/product.type';
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
    // Current item being added (utilizado no modo Compras tradicional)
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

    // No modo de recebimento: adiciona linha vazia para digitar o produto diretamente nela
    const handleAddNewItemRow = () => {
        if (isReceiptMode && !supplierId) {
            toast.warn('Selecione o fornecedor acima primeiro.');
            return;
        }

        onAddItem({
            productId: '',
            description: '',
            quantity: 1,
            baseCost: 0,
            unitCost: 0,
            totalCost: 0
        });
    };

    const handleSelectProductInRow = (idx: number, product: Product, variation?: Variation) => {
        const prodName = product.name || product.title || product.description || '';
        const description = variation ? (variation.name && variation.name.toLowerCase().includes(prodName.toLowerCase()) ? variation.name : `${prodName} - ${variation.name}`) : prodName;
        const cost = variation?.costPrice || product.costPrice || 0;
        const tempIpi = cost * (ipiPercent / 100);
        const tempFreight = cost * (freightPercent / 100);
        const unitCost = cost + tempIpi + tempFreight;
        const currentItem = items[idx];
        const quantity = currentItem?.quantity || 1;

        if (onUpdateItem) {
            onUpdateItem(idx, {
                ...currentItem,
                productId: product.id!,
                variationId: variation?.id,
                description,
                baseCost: cost,
                unitCost,
                totalCost: quantity * unitCost,
            });
        }

        const prodSupplierId = product.mainSupplierId || product.supplierId || (product as any).main_supplier_id || (product as any).supplier_id;
        if (!supplierId && prodSupplierId && onSupplierAutoSelect) {
            onSupplierAutoSelect(prodSupplierId);
        }
    };

    const handleEditProductInRow = (idx: number) => {
        if (onUpdateItem) {
            onUpdateItem(idx, {
                ...items[idx],
                productId: '',
            });
        }
    };

    const handleQtyChange = (idx: number, newQty: number) => {
        const item = items[idx];
        const validQty = Math.max(1, newQty);
        const updated: PurchaseItem = {
            ...item,
            quantity: validQty,
        };

        if (onUpdateItem) {
            onUpdateItem(idx, updated);
        }
    };

    const handleCostChange = (idx: number, newCost: number) => {
        const item = items[idx];
        const validCost = Math.max(0, newCost);
        const updated: PurchaseItem = {
            ...item,
            baseCost: validCost,
        };

        if (onUpdateItem) {
            onUpdateItem(idx, updated);
        }
    };

    const totalValue = items.reduce((sum, item) => sum + item.totalCost, 0);

    return (
        <div className="space-y-4">
            {/* Modo Recebimento: Barra compacta com Título e Botão na MESMA linha */}
            {isReceiptMode ? (
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-200/80 dark:border-slate-800">
                    <div className="flex items-center gap-2">
                        <i className="bi bi-plus-circle-fill text-emerald-600 text-sm" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">
                            Adicionar Item
                        </h3>
                        {items.length > 0 && (
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200/60 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-900/40">
                                {items.length} item(ns)
                            </span>
                        )}
                        {!supplierId && (
                            <span className="text-[10px] font-bold text-amber-500 ml-2">
                                (Selecione o fornecedor acima primeiro)
                            </span>
                        )}
                        {hasError && (
                            <span className="text-[10px] font-bold text-red-500 ml-2">
                                Adicione pelo menos um item ao recebimento.
                            </span>
                        )}
                    </div>

                    <button
                        type="button"
                        onClick={handleAddNewItemRow}
                        disabled={!supplierId}
                        className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100"
                        title={!supplierId ? "Selecione o fornecedor acima primeiro" : "Adicionar Item"}
                    >
                        <i className="bi bi-plus-lg text-sm font-black" />
                        <span>Adicionar Item</span>
                    </button>
                </div>
            ) : (
                /* Container de Adicionar Item original para compras */
                <div className={`rounded-2xl border p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4 ${hasError ? 'border-red-500 ring-2 ring-red-500/15' : 'border-slate-200 dark:border-slate-800'}`}>
                    <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                        <i className="bi bi-plus-circle-fill text-emerald-600 text-sm" />
                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Adicionar Item</h3>
                    </div>
                    {hasError && <p className="text-xs font-bold text-red-500">Adicione pelo menos um item ao recebimento.</p>}
                    
                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-end">
                        <div className="sm:col-span-6 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</label>
                            <ProductAutocomplete
                                supplierId={supplierId || undefined}
                                value={currentDescription}
                                onChange={setCurrentDescription}
                                disabled={Boolean(isReceiptMode && !supplierId)}
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
                                }}                                 onSelectDescription={setCurrentDescription}
                                placeholder="Buscar produto..."
                                inputClassName="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 rounded-none disabled:opacity-50 disabled:cursor-not-allowed"
                            />
                        </div>

                        <div className="sm:col-span-2 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd</label>
                            <div className="flex bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 p-1.5 focus-within:border-blue-600 transition-all items-center justify-center">
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

                        <div className="sm:col-span-3 flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Custo unitário</label>
                            <input 
                                type="number"
                                placeholder="0.00"
                                value={currentCost || ""}
                                onChange={(e) => setCurrentCost(Number(e.target.value))}
                                className="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all text-center rounded-none"
                            />
                        </div>

                        <div className="sm:col-span-1 flex justify-end">
                            <button 
                                type="button"
                                onClick={handleAddItemClick}
                                className="py-2.5 px-3 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 transition-all active:scale-95 flex items-center justify-center gap-1.5 font-bold shadow-md text-xs w-full"
                            >
                                <i className="bi bi-plus-lg text-lg font-black" />
                                <span className="font-black uppercase tracking-wider">Adicionar</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Items Table (Visible on desktop >= lg) */}
            <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-955 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400">Produto</th>
                            <th className="px-3 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center w-28">Qtd. recebida</th>
                            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Custo unitário</th>
                            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Desconto</th>
                            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Frete</th>
                            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Outras despesas</th>
                            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-emerald-700 dark:text-emerald-400 text-right bg-emerald-50/40 dark:bg-emerald-950/20">Custo unitário final</th>
                            <th className="px-4 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 text-right" title="Valor total antes do frete, desconto e outras despesas">Subtotal</th>
                            <th className="px-5 py-3.5 text-[9px] font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 text-right">Total do item final</th>
                            <th className="px-3 py-3.5 w-10"></th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {items.map((item, idx) => {
                            const unitDiscount = item.discountUnit || 0;
                            const unitFreight = item.freightUnit ?? ((item.baseCost || 0) * (freightPercent / 100));
                            const unitOther = item.otherExpensesUnit ?? (item.additionalCostUnit || 0);
                            const isRowEditing = isReceiptMode && !item.productId;
                            const itemSubtotal = item.quantity * (item.baseCost || 0);

                            return (
                                <tr key={idx} className="group hover:bg-slate-50/30 dark:hover:bg-slate-900/15 transition-colors">
                                    <td className="px-5 py-3.5 min-w-[260px]">
                                        {isRowEditing ? (
                                            <ProductAutocomplete
                                                supplierId={supplierId || undefined}
                                                value={item.description || ''}
                                                onChange={(desc) => {
                                                    if (onUpdateItem) onUpdateItem(idx, { ...item, description: desc });
                                                }}
                                                disabled={Boolean(isReceiptMode && !supplierId)}
                                                onSelect={(p, v) => handleSelectProductInRow(idx, p, v)}
                                                onSelectDescription={(desc) => {
                                                    if (onUpdateItem) onUpdateItem(idx, { ...item, description: desc });
                                                }}
                                                placeholder={supplierId ? "Buscar produto deste fornecedor..." : "Selecione o fornecedor acima..."}
                                                inputClassName="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-none transition-colors"
                                            />
                                        ) : (
                                            <div className="flex items-center justify-between gap-2 p-1.5 px-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60 group/item">
                                                <span className="text-sm font-bold text-slate-700 dark:text-slate-200 line-clamp-2">
                                                    {item.description || 'Produto não selecionado'}
                                                </span>
                                                {isReceiptMode && (
                                                    <button
                                                        type="button"
                                                        onClick={() => handleEditProductInRow(idx)}
                                                        className="opacity-0 group-hover/item:opacity-100 text-[10px] font-bold text-slate-400 hover:text-blue-600 p-1 rounded hover:bg-white dark:hover:bg-slate-800 transition-all shrink-0 border border-transparent hover:border-slate-200 dark:hover:border-slate-700"
                                                        title="Trocar produto"
                                                    >
                                                        <i className="bi bi-pencil-square" />
                                                    </button>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                    {/* Quantidade: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                                    <td className="px-3 py-3.5 text-center">
                                        <div className="flex items-center justify-center gap-1 bg-white dark:bg-slate-900 rounded-xl p-1 w-28 mx-auto border border-slate-100 dark:border-slate-800 shadow-sm">
                                            <button
                                                type="button"
                                                onClick={() => handleQtyChange(idx, item.quantity - 1)}
                                                className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors flex items-center justify-center text-xs"
                                            >
                                                -
                                            </button>
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity}
                                                onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                                                className="w-12 bg-white dark:bg-slate-900 text-center font-black text-sm text-slate-800 dark:text-slate-100 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none rounded-none py-0.5 transition-colors"
                                            />
                                            <button
                                                type="button"
                                                onClick={() => handleQtyChange(idx, item.quantity + 1)}
                                                className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-black hover:bg-emerald-700 transition-colors flex items-center justify-center text-xs shadow-sm"
                                            >
                                                +
                                            </button>
                                        </div>
                                    </td>
                                    {/* Custo Unitário: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                                    <td className="px-4 py-3.5 text-right">
                                        <input
                                            type="number"
                                            step="0.01"
                                            min="0"
                                            value={item.baseCost || ''}
                                            onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                                            className="w-24 bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1 text-right text-sm font-bold text-slate-800 dark:text-slate-100 rounded-none transition-colors"
                                        />
                                    </td>
                                    {/* Não-Editáveis (Calculados): Fundo Cinza */}
                                    <td className="px-4 py-3.5 text-right text-xs font-medium text-amber-600 dark:text-amber-400 bg-slate-50/70 dark:bg-slate-900/30">
                                        {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/30">
                                        {unitFreight > 0 ? formatCurrency(unitFreight) : '—'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-xs font-medium text-slate-600 dark:text-slate-400 bg-slate-50/70 dark:bg-slate-900/30">
                                        {unitOther > 0 ? formatCurrency(unitOther) : '—'}
                                    </td>
                                    <td className="px-4 py-3.5 text-right text-sm font-black text-emerald-600 dark:text-emerald-400 bg-slate-100/60 dark:bg-slate-900/50">
                                        {formatCurrency(item.unitCost || 0)}
                                    </td>
                                    {/* Subtotal: Valor total antes do frete, desconto e outras despesas */}
                                    <td className="px-4 py-3.5 text-right text-xs font-bold text-slate-700 dark:text-slate-300 bg-slate-50/70 dark:bg-slate-900/30" title="Valor total antes do frete, desconto e outras despesas">
                                        {formatCurrency(itemSubtotal)}
                                    </td>
                                    {/* Total do item final */}
                                    <td className="px-5 py-3.5 text-right text-sm font-black text-slate-800 dark:text-slate-100 bg-slate-100/60 dark:bg-slate-900/50">
                                        {formatCurrency(item.totalCost || 0)}
                                    </td>
                                    <td className="px-3 py-3.5 text-right">
                                        <button onClick={() => onRemoveItem(idx)} className="text-slate-400 hover:text-red-500 transition-all p-1" title="Remover Item">
                                            <i className="bi bi-trash text-sm" />
                                        </button>
                                    </td>
                                </tr>
                            );
                        })}
                        {items.length === 0 && (
                            <tr>
                                <td colSpan={10} className="px-6 py-10 text-center">
                                    <div className="flex flex-col items-center justify-center gap-2">
                                        <i className="bi bi-box-seam text-2xl text-slate-300 dark:text-slate-600" />
                                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum item adicionado</p>
                                        {isReceiptMode && supplierId && (
                                            <button
                                                type="button"
                                                onClick={handleAddNewItemRow}
                                                className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                                            >
                                                <i className="bi bi-plus-circle-fill" /> Clique para adicionar o primeiro item
                                            </button>
                                        )}
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                    {items.length > 0 && (
                        <tfoot className="bg-slate-900 text-white">
                            <tr>
                                <td colSpan={8} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-emerald-400">Valor Total do Recebimento</td>
                                <td className="px-5 py-4 text-right text-xl font-black text-emerald-400">{formatCurrency(totalValue)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Items Card List (Visible on mobile/tablet < lg) */}
            <div className="block lg:hidden space-y-4">
                {items.map((item, idx) => {
                    const unitDiscount = item.discountUnit || 0;
                    const unitFreight = item.freightUnit ?? ((item.baseCost || 0) * (freightPercent / 100));
                    const unitOther = item.otherExpensesUnit ?? (item.additionalCostUnit || 0);
                    const isRowEditing = isReceiptMode && !item.productId;
                    const itemSubtotal = item.quantity * (item.baseCost || 0);

                    return (
                        <div key={idx} className="bg-white dark:bg-slate-955 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 space-y-4 relative shadow-sm">
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                    {isRowEditing ? (
                                        <div className="space-y-1">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</label>
                                            <ProductAutocomplete
                                                supplierId={supplierId || undefined}
                                                value={item.description || ''}
                                                onChange={(desc) => {
                                                    if (onUpdateItem) onUpdateItem(idx, { ...item, description: desc });
                                                }}
                                                disabled={Boolean(isReceiptMode && !supplierId)}
                                                onSelect={(p, v) => handleSelectProductInRow(idx, p, v)}
                                                onSelectDescription={(desc) => {
                                                    if (onUpdateItem) onUpdateItem(idx, { ...item, description: desc });
                                                }}
                                                 placeholder={supplierId ? "Buscar produto deste fornecedor..." : "Selecione o fornecedor acima..."}
                                                inputClassName="w-full bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none px-2 py-1.5 text-xs sm:text-sm font-bold text-slate-800 dark:text-slate-100 placeholder:text-slate-400 rounded-none transition-colors"
                                            />
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-2 p-1.5 px-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                            <span className="text-sm font-black text-slate-800 dark:text-slate-100">{item.description}</span>
                                            {isReceiptMode && (
                                                <button
                                                    type="button"
                                                    onClick={() => handleEditProductInRow(idx)}
                                                    className="text-xs text-slate-400 hover:text-blue-600 p-1 hover:bg-white dark:hover:bg-slate-800 rounded transition-colors"
                                                    title="Trocar produto"
                                                >
                                                    <i className="bi bi-pencil-square" />
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                                <button 
                                    onClick={() => onRemoveItem(idx)} 
                                    className="text-slate-400 hover:text-red-500 p-1.5 hover:bg-red-50 dark:hover:bg-red-950/20 rounded-xl transition-colors shrink-0"
                                    title="Remover Item"
                                >
                                    <i className="bi bi-trash text-base" />
                                </button>
                            </div>

                            {/* Campo de Quantidade em Destaque: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                            <div className="p-3 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm space-y-1.5">
                                <span className="text-slate-400 uppercase tracking-widest text-[9px] font-black block">Qtd. recebida</span>
                                <div className="flex items-center gap-2">
                                    <button
                                        type="button"
                                        onClick={() => handleQtyChange(idx, item.quantity - 1)}
                                        className="flex-1 h-11 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 font-black text-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all shadow-sm flex items-center justify-center"
                                    >
                                        -
                                    </button>
                                    <input
                                        type="number"
                                        min="1"
                                        value={item.quantity}
                                        onChange={(e) => handleQtyChange(idx, Number(e.target.value))}
                                        className="w-24 sm:w-32 h-11 bg-white dark:bg-slate-800 text-center font-black text-base text-slate-800 dark:text-slate-100 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none rounded-none transition-colors"
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

                            {/* Flex de Valores e Métricas: Largura mínima igual ao conteúdo interno (min-w-fit), permitindo diminuir até o mínimo para caber mais campos por linha */}
                            <div className="flex flex-wrap gap-2 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3 items-stretch">
                                {/* Custo Unitário: Editável -> Fundo Branco, borda apenas embaixo cinza, focus azul */}
                                <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 shadow-sm flex flex-col justify-center">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">Custo unitário</span>
                                    <input
                                        type="number"
                                        step="0.01"
                                        min="0"
                                        value={item.baseCost || ''}
                                        onChange={(e) => handleCostChange(idx, Number(e.target.value))}
                                        className="w-full min-w-[70px] bg-white dark:bg-slate-900 border-0 border-b-2 border-slate-200 dark:border-slate-700 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-xs font-bold text-slate-800 dark:text-slate-200 px-1 py-1 mt-0.5 rounded-none transition-colors"
                                    />
                                </div>

                                {/* Desconto: Não-Editável -> Fundo Cinza */}
                                <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">Desconto</span>
                                    <span className="font-bold text-amber-600 dark:text-amber-400 block text-xs leading-normal whitespace-nowrap">
                                        {unitDiscount > 0 ? `- ${formatCurrency(unitDiscount)}` : '—'}
                                    </span>
                                </div>

                                {/* Frete: Não-Editável -> Fundo Cinza */}
                                <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">Frete</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal whitespace-nowrap">{formatCurrency(unitFreight)}</span>
                                </div>

                                {/* Outras despesas: Não-Editável -> Fundo Cinza */}
                                <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">Outras despesas</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal whitespace-nowrap">{unitOther > 0 ? formatCurrency(unitOther) : '—'}</span>
                                </div>

                                {/* Custo unitário final: Não-Editável -> Fundo Cinza */}
                                <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                                    <span className="text-emerald-600/70 dark:text-emerald-400/70 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">Custo unitário final</span>
                                    <span className="font-black text-emerald-600 dark:text-emerald-400 block text-xs leading-normal whitespace-nowrap">{formatCurrency(item.unitCost || 0)}</span>
                                </div>

                                {/* Subtotal: Não-Editável -> Fundo Cinza */}
                                <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/70 dark:bg-slate-800/60 rounded-xl border border-slate-200/60 dark:border-slate-700/60 flex flex-col justify-center">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">Subtotal</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal whitespace-nowrap" title="Valor total antes do frete, desconto e outras despesas">
                                        {formatCurrency(itemSubtotal)}
                                    </span>
                                </div>

                                {/* Total do item final: Não-Editável -> Fundo Cinza */}
                                <div className="flex-1 min-w-fit p-2 sm:p-2.5 bg-slate-100/80 dark:bg-slate-800/60 rounded-xl border border-slate-200/80 dark:border-slate-700/80 flex flex-col justify-center">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5 whitespace-nowrap">Total do item final</span>
                                    <span className="font-black text-slate-800 dark:text-slate-100 block text-sm leading-normal whitespace-nowrap">{formatCurrency(item.totalCost || 0)}</span>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {items.length === 0 && (
                    <div className="text-center py-10 bg-white dark:bg-slate-955 border border-dashed border-slate-200 dark:border-slate-800 rounded-3xl p-6 flex flex-col items-center justify-center gap-2">
                        <i className="bi bi-box-seam text-2xl text-slate-300 dark:text-slate-600" />
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Nenhum item adicionado</p>
                        {isReceiptMode && supplierId && (
                            <button
                                type="button"
                                onClick={handleAddNewItemRow}
                                className="mt-1 text-xs font-black text-emerald-600 dark:text-emerald-400 hover:underline inline-flex items-center gap-1"
                            >
                                <i className="bi bi-plus-circle-fill" /> Clique para adicionar o primeiro item
                            </button>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};


