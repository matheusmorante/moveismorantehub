import React, { useState } from 'react';
import ProductAutocomplete from './ProductAutocomplete';
import { PurchaseItem } from '../pages/types/purchase.type';

interface Props {
    items: PurchaseItem[];
    onAddItem: (item: PurchaseItem) => void;
    onRemoveItem: (idx: number) => void;
    ipiPercent: number;
    freightPercent: number;
    formatCurrency: (value: number) => string;
    supplierId?: string;
    onSupplierAutoSelect?: (supplierId: string) => void;
}

export const PurchaseItemsSection = ({
    items,
    onAddItem,
    onRemoveItem,
    ipiPercent,
    freightPercent,
    formatCurrency,
    supplierId,
    onSupplierAutoSelect
}: Props) => {
    // Current item being added
    const [currentProductId, setCurrentProductId] = useState("");
    const [currentVariationId, setCurrentVariationId] = useState<string | undefined>(undefined);
    const [currentDescription, setCurrentDescription] = useState("");
    const [currentQty, setCurrentQty] = useState(1);
    const [currentCost, setCurrentCost] = useState(0);

    // Calcular valores temporários para exibição na adição de item
    const tempIpiVal = currentCost * (ipiPercent / 100);
    const tempFreightVal = currentCost * (freightPercent / 100);
    const tempTotalUnit = currentCost + tempIpiVal + tempFreightVal;
    const tempSubtotal = currentQty * currentCost;
    const tempTotalFinal = currentQty * tempTotalUnit;

    const handleAddItemClick = () => {
        if (!currentProductId || currentQty <= 0 || currentCost <= 0) return;

        onAddItem({
            productId: currentProductId,
            variationId: currentVariationId,
            description: currentDescription,
            quantity: currentQty,
            baseCost: currentCost,
            unitCost: tempTotalUnit,
            totalCost: tempTotalFinal
        });

        // Reset local states
        setCurrentProductId("");
        setCurrentVariationId(undefined);
        setCurrentDescription("");
        setCurrentQty(1);
        setCurrentCost(0);
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
            {/* Itens do Pedido Section */}
            {/* Container de Adicionar Item */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 bg-slate-50/50 dark:bg-slate-900/30 space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b border-slate-200/60 dark:border-slate-800">
                    <i className="bi bi-plus-circle-fill text-blue-600 text-sm" />
                    <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200">Adicionar Item</h3>
                </div>
                
                <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-end">
                    {/* Campo Produto */}
                    <div className="sm:col-span-6 flex flex-col gap-1.5">
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
                            inputClassName="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 focus:shadow-sm rounded-none"
                        />
                    </div>

                    {/* Campo Qtd */}
                    <div className="sm:col-span-2 flex flex-col gap-1.5">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd</label>
                        <div className="flex bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-1.5 focus-within:border-blue-600 dark:focus-within:border-blue-500 transition-all items-center justify-center">
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
                            className="w-full bg-transparent border-0 border-b-2 border-slate-200 dark:border-slate-700 p-2 focus:border-blue-600 dark:focus:border-blue-500 outline-none text-sm font-bold text-slate-700 dark:text-slate-300 transition-all focus:ring-0 text-center rounded-none"
                        />
                    </div>

                    {/* Botão Adicionar */}
                    <div className="sm:col-span-1 flex justify-end">
                        <button 
                            type="button"
                            onClick={handleAddItemClick}
                            className="w-full py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-all active:scale-95 flex items-center justify-center gap-1 font-bold shadow-md shadow-blue-200 dark:shadow-none text-xs"
                            title="Adicionar Item"
                        >
                            <i className="bi bi-plus-lg text-sm"></i>
                            <span className="sm:hidden font-black">Adicionar</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Items Table (Visible only on desktop >= lg) */}
            <div className="hidden lg:block overflow-hidden bg-white dark:bg-slate-950 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-sm">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50 dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800">
                        <tr>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400">Item</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Custo Base</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">IPI (R$)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Frete (R$)</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Total Unitário</th>
                            <th className="px-6 py-4 text-[9px] font-black uppercase tracking-widest text-slate-400 text-right">Subtotal</th>
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
                                <td className="px-6 py-4 text-center text-sm font-black text-slate-600 dark:text-slate-400">
                                    {item.quantity}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-bold text-slate-600 dark:text-slate-400">
                                    {formatCurrency(item.baseCost || 0)}
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
                                <td className="px-6 py-4 text-right text-sm font-black text-slate-600 dark:text-slate-400">
                                    {formatCurrency(item.subtotal || 0)}
                                </td>
                                <td className="px-6 py-4 text-right text-sm font-black text-blue-600 dark:text-blue-400">
                                    {formatCurrency(item.totalCost || 0)}
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button onClick={() => onRemoveItem(idx)} className="text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all p-1">
                                        <i className="bi bi-trash"></i>
                                    </button>
                                </td>
                            </tr>
                        ))}
                        {processedItems.length === 0 && (
                            <tr>
                                <td colSpan={9} className="px-6 py-10 text-center text-xs font-bold text-slate-300 uppercase tracking-widest">Nenhum item adicionado</td>
                            </tr>
                        )}
                    </tbody>
                    {processedItems.length > 0 && (
                        <tfoot className="bg-slate-900 text-white">
                            <tr>
                                <td colSpan={7} className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-blue-400">Valor Total da Compra</td>
                                <td className="px-6 py-4 text-right text-xl font-black">{formatCurrency(totalValue)}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    )}
                </table>
            </div>

            {/* Items Card List (Visible only on mobile/tablet < lg) */}
            <div className="block lg:hidden space-y-4">
                {processedItems.map((item, idx) => {
                    const baseCost = item.baseCost || 0;
                    const itemIpi = baseCost * (ipiPercent / 100);
                    const itemFreight = baseCost * (freightPercent / 100);
                    return (
                        <div key={idx} className="bg-white dark:bg-slate-950 p-4 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 dark:border-slate-800 space-y-3 relative shadow-sm">
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

                            {/* Grid Flexível de Métricas com Mais Colunas */}
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4 text-xs border-t border-slate-100 dark:border-slate-800/50 pt-3">
                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Quantidade</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">{item.quantity} un</span>
                                </div>

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Custo Base</span>
                                    <span className="font-bold text-slate-800 dark:text-slate-200 block text-xs leading-normal">{formatCurrency(baseCost)}</span>
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

                                <div className="p-2.5 bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-100 dark:border-slate-800/60">
                                    <span className="text-slate-400 uppercase tracking-wider text-[9px] font-black block mb-0.5">Subtotal</span>
                                    <span className="font-black text-slate-600 dark:text-slate-300 block text-xs leading-normal">{formatCurrency(item.subtotal || 0)}</span>
                                </div>
                            </div>

                            {/* Total Final com destaque e sem corte */}
                            <div className="border-t border-slate-100 dark:border-slate-800/50 pt-2.5 flex justify-between items-center px-1">
                                <span className="text-slate-400 uppercase tracking-wider text-[10px] font-black">Total Final</span>
                                <span className="font-black text-sm text-blue-600 dark:text-blue-400 leading-normal pb-0.5">{formatCurrency(item.totalCost || 0)}</span>
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
