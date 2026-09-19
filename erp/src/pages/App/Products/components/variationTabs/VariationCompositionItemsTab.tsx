import React, { useState } from 'react';
import type { Variation, ComboItem, Product } from '../../../../types/product.type';
import ProductAutocomplete from '../../../../../components/ProductAutocomplete';

interface VariationCompositionItemsTabProps {
    readonly formData: Variation;
    readonly setFormData: React.Dispatch<React.SetStateAction<Variation | null>>;
    readonly parentProduct: Product;
}

export const VariationCompositionItemsTab: React.FC<VariationCompositionItemsTabProps> = ({
    formData,
    setFormData,
    parentProduct
}) => {
    // Adiciona um item vazio para ser preenchido
    const handleAddNewEmptyRow = () => {
        setFormData(prev => {
            if (!prev) return prev;
            const currentItems = prev.comboItems || [];
            const newItem: ComboItem = {
                productId: '',
                variationId: undefined,
                quantity: 1,
                description: '',
                unitPrice: 0,
                stock: 0
            };
            return {
                ...prev,
                comboItems: [...currentItems, newItem]
            };
        });
    };

    const handleSelectProduct = (index: number, product: any, variation?: any) => {
        setFormData(prev => {
            if (!prev) return prev;
            const currentItems = [...(prev.comboItems || [])];
            currentItems[index] = {
                ...currentItems[index],
                productId: product.id,
                variationId: variation?.id,
                description: variation ? variation.name : product.name,
                unitPrice: variation?.unitPrice || product.unitPrice || 0,
                stock: variation?.stock || product.stock || 0
            };
            return { ...prev, comboItems: currentItems };
        });
    };

    const handleRemoveItem = (index: number) => {
        setFormData(prev => {
            if (!prev) return prev;
            const newItems = [...(prev.comboItems || [])];
            newItems.splice(index, 1);
            return { ...prev, comboItems: newItems };
        });
    };

    const handleQuantityChange = (index: number, quantity: number) => {
        if (quantity < 1) return;
        setFormData(prev => {
            if (!prev) return prev;
            const newItems = [...(prev.comboItems || [])];
            newItems[index] = { ...newItems[index], quantity };
            return { ...prev, comboItems: newItems };
        });
    };

    const handlePriceChange = (index: number, priceStr: string) => {
        const val = parseFloat(priceStr.replace(',', '.')) || 0;
        setFormData(prev => {
            if (!prev) return prev;
            const newItems = [...(prev.comboItems || [])];
            newItems[index] = { ...newItems[index], unitPrice: val };
            return { ...prev, comboItems: newItems };
        });
    };

    const items = formData.comboItems || [];
    const supplierId = parentProduct.supplierId || parentProduct.mainSupplierId;
    
    // Calcula o custo total da composição baseado nos itens
    const suggestedPrice = items.reduce((acc, item) => acc + (item.unitPrice * item.quantity), 0);

    return (
        <div className="flex flex-col gap-6 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                <div>
                    <h3 className="text-sm font-black text-slate-800 dark:text-slate-100 uppercase tracking-widest flex items-center gap-2">
                        <i className="bi bi-box-seam text-blue-500"></i>
                        Produtos que compõem a composição
                    </h3>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 font-medium">
                        Adicione os produtos reais que compõem esta variação. O estoque será deduzido deles.
                    </p>
                </div>
                
                <button
                    type="button"
                    onClick={handleAddNewEmptyRow}
                    className="flex items-center justify-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/40 rounded-xl font-bold transition-colors text-xs tracking-wide whitespace-nowrap"
                >
                    <i className="bi bi-plus-lg"></i>
                    Adicionar Produto
                </button>
            </div>

            {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-4 text-center border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl bg-slate-50/50 dark:bg-slate-900/50">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/20 text-blue-500 rounded-full flex items-center justify-center mb-4">
                        <i className="bi bi-diagram-3 text-2xl"></i>
                    </div>
                    <h4 className="text-sm font-black text-slate-800 dark:text-slate-200 uppercase tracking-widest mb-2">
                        Composição Vazia
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm">
                        Esta variação ainda não possui itens. Adicione os produtos reais para que a baixa de estoque funcione corretamente.
                    </p>
                </div>
            ) : (
                <div className="flex flex-col gap-4">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                                <tr className="border-b border-slate-100 dark:border-slate-800">
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 w-24">Qtd</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right w-32">Preço Unit.</th>
                                    <th className="py-3 px-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right w-32">Subtotal</th>
                                    <th className="py-3 px-4 w-12"></th>
                                </tr>
                            </thead>
                            <tbody>
                                {items.map((item, idx) => (
                                    <tr key={`${item.productId || 'new'}-${item.variationId || 'base'}-${idx}`} className="border-b border-slate-50 dark:border-slate-800/50 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                                        <td className="py-3 px-4">
                                            {item.productId ? (
                                                <div className="flex flex-col">
                                                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                                                        {item.description}
                                                    </span>
                                                </div>
                                            ) : (
                                                <ProductAutocomplete
                                                    supplierId={supplierId}
                                                    onSelect={(p, v) => handleSelectProduct(idx, p, v)}
                                                    clearOnSelect={false}
                                                    excludeCombos={true}
                                                    placeholder="Buscar produto (mesmo fornecedor)"
                                                    inputClassName="w-full border-b border-slate-300 dark:border-slate-700 bg-transparent px-0 py-1 text-xs font-medium outline-none focus:border-blue-500 transition-colors"
                                                />
                                            )}
                                        </td>
                                        <td className="py-3 px-4">
                                            <input
                                                type="number"
                                                min="1"
                                                value={item.quantity || ''}
                                                onChange={(e) => handleQuantityChange(idx, Number(e.target.value))}
                                                className="w-16 border-b border-slate-300 dark:border-slate-700 bg-transparent px-1 py-1 text-center outline-none focus:border-blue-500 text-xs font-bold transition-colors"
                                            />
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <div className="flex items-center justify-end gap-1">
                                                <span className="text-xs font-medium text-slate-800 dark:text-slate-200">
                                                    R$ {Number(item.unitPrice || 0).toFixed(2)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="py-3 px-4 text-right text-xs font-bold text-slate-800 dark:text-slate-200">
                                            R$ {(item.unitPrice * item.quantity).toFixed(2)}
                                        </td>
                                        <td className="py-3 px-4 text-right">
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveItem(idx)}
                                                className="text-slate-400 hover:text-red-500 transition-colors"
                                                title="Remover Item"
                                            >
                                                <i className="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    
                    <div className="flex justify-end p-4 bg-emerald-50 dark:bg-emerald-900/10 rounded-xl border border-emerald-100 dark:border-emerald-900/30 mt-2">
                        <div className="text-right">
                            <p className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">
                                Preço Sugerido da Composição
                            </p>
                            <p className="text-lg font-black text-emerald-700 dark:text-emerald-300">
                                R$ {suggestedPrice.toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default VariationCompositionItemsTab;
