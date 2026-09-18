import React from 'react';
import type Product from "@/pages/types/product.type";
import type { Variation } from "@/pages/types/product.type";
import type Person from "@/pages/types/person.type";
import SupplierAutocomplete from "@/components/SupplierAutocomplete";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import { getVariationDisplayName } from "@/components/productAutocompleteUtils";
import InventoryResponsibleSelect from "../components/InventoryResponsibleSelect";
import type { InventoryScopeType } from '../modals/InventoryScopeModal';

interface InventoryScopeConfigFormProps {
    readonly scopeType: InventoryScopeType | null;
    readonly inventoryName: string;
    readonly setInventoryName: (val: string) => void;
    readonly blindCount: boolean;
    readonly setBlindCount: (val: boolean) => void;
    readonly selectedSupplierId: string;
    readonly setSelectedSupplierId: (val: string) => void;
    readonly selectedResponsibleId: string;
    readonly setSelectedResponsibleId: (val: string) => void;
    readonly responsibleError: boolean;
    readonly setResponsibleError: (val: boolean) => void;
    readonly customProducts: Array<{ product: Product, variation?: Variation }>;
    readonly setCustomProducts: React.Dispatch<React.SetStateAction<Array<{ product: Product, variation?: Variation }>>>;
    readonly suppliers: readonly Person[];
    readonly employees: readonly Person[];
}

export const InventoryScopeConfigForm: React.FC<InventoryScopeConfigFormProps> = ({
    scopeType,
    inventoryName,
    setInventoryName,
    blindCount,
    setBlindCount,
    selectedSupplierId,
    setSelectedSupplierId,
    selectedResponsibleId,
    setSelectedResponsibleId,
    responsibleError,
    setResponsibleError,
    customProducts,
    setCustomProducts,
    suppliers,
    employees,
}) => {
    return (
        <div className="space-y-6 animate-fade-in-up">
            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 space-y-5 shadow-sm">
                <div>
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Nome do Inventário
                    </label>
                    <input
                        type="text"
                        value={inventoryName}
                        onChange={(e) => setInventoryName(e.target.value)}
                        className="w-full font-medium bg-slate-50 dark:bg-slate-900 border border-slate-300 dark:border-slate-600 text-slate-900 dark:text-slate-100 rounded-lg px-4 py-2.5 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        placeholder="Ex: Inventário Mensal..."
                    />
                </div>

                {scopeType === 'supplier' && (
                    <div className="space-y-4 relative z-20">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                                Fornecedor
                            </label>
                            <SupplierAutocomplete
                                suppliers={suppliers as Person[]}
                                selectedSupplierId={selectedSupplierId}
                                onSelect={(id) => {
                                    setSelectedSupplierId(id);
                                    const s = suppliers.find(x => String(x.id) === id);
                                    if (s) setInventoryName(`Inventário ${s.tradeName || s.fullName}`);
                                }}
                                placeholder="Buscar fornecedor..."
                                hideLabel
                            />
                        </div>
                    </div>
                )}

                {scopeType === 'custom' && (
                    <div className="space-y-3 relative z-20">
                        <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                            Adicionar Produtos ao Escopo
                        </label>
                        <div className="relative z-20">
                            <ProductAutocomplete
                                onSelect={(product, variation) => {
                                    const key = `${product.id}-${variation?.id || 'main'}`;
                                    if (!customProducts.some(cp => `${cp.product.id}-${cp.variation?.id || 'main'}` === key)) {
                                        setCustomProducts(prev => [...prev, { product, variation }]);
                                    }
                                }}
                                placeholder="Buscar por nome, SKU..."
                            />
                        </div>
                        
                        {customProducts.length > 0 && (
                            <div className="mt-4 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-700 max-h-48 overflow-y-auto">
                                {customProducts.map((cp, idx) => (
                                    <div key={idx} className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-700 last:border-0">
                                        <span className="text-sm font-bold text-slate-700 dark:text-slate-200 truncate pr-4">
                                            {getVariationDisplayName(cp.product, cp.variation)}
                                        </span>
                                        <button 
                                            onClick={() => setCustomProducts(prev => prev.filter((_, i) => i !== idx))}
                                            className="text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 p-1.5 rounded-lg shrink-0"
                                        >
                                            <i className="bi bi-trash"></i>
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
                
                <div className="relative z-10 pt-2">
                    <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-1.5">
                        Responsável pelo Inventário
                    </label>
                    <InventoryResponsibleSelect
                        employees={employees}
                        value={selectedResponsibleId}
                        hasError={responsibleError}
                        onChange={(val) => { setSelectedResponsibleId(val); setResponsibleError(false); }}
                    />
                </div>

                <div className="pt-2">
                    <label className="flex items-center gap-3 p-4 border border-slate-200 dark:border-slate-700 rounded-xl cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                        <div className="relative flex items-center justify-center">
                            <input
                                type="checkbox"
                                checked={blindCount}
                                onChange={(e) => setBlindCount(e.target.checked)}
                                className="peer sr-only"
                            />
                            <div className="w-11 h-6 bg-slate-200 dark:bg-slate-700 rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-emerald-500 after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-slate-600"></div>
                        </div>
                        <div>
                            <span className="block text-sm font-bold text-slate-800 dark:text-slate-200">Contagem Cega</span>
                            <span className="block text-xs text-slate-500 mt-0.5">Ocultar o estoque atual do sistema na hora da conferência.</span>
                        </div>
                    </label>
                </div>
            </div>
        </div>
    );
};
