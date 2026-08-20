import React, { useState, useRef } from 'react';
import { Product } from '@/pages/types/product.type';
import { Person } from '../../../../types/person.type';
import InitialStockList from '../InitialStockList';
import DropdownPortal from '@/components/shared/DropdownPortal';
import CurrencyInput from '@/components/CurrencyInput';

interface ProductInventoryTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    suppliers: Person[];
    handleSuggestPrices: () => void;
    isSuggestingPrices: boolean;
    suggestPricesResults: { low: any, medium: any, high: any } | null;
    discountPercent: string;
    setDiscountPercent: React.Dispatch<React.SetStateAction<string>>;
    discountFixed: string;
    setDiscountFixed: React.Dispatch<React.SetStateAction<string>>;
    handlePriceChange: (newPrice: string) => void;
    handleDiscountPercentChange: (valStr: string) => void;
    handleDiscountFixedChange: (valStr: string) => void;
    handlePromoPriceFieldChange: (valStr: string) => void;
    validationErrors?: Record<string, boolean>;
    setValidationErrors?: React.Dispatch<React.SetStateAction<Record<string, boolean>>>;
}

const ProductInventoryTab: React.FC<ProductInventoryTabProps> = ({
    formData,
    setFormData,
    suppliers,
    discountPercent,
    discountFixed,
    handlePriceChange,
    handleDiscountPercentChange,
    handleDiscountFixedChange,
    handlePromoPriceFieldChange,
    validationErrors = {},
    setValidationErrors
}) => {
    const [supplierSearch, setSupplierSearch] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const supplierInputRef = useRef<HTMLDivElement>(null);

    const updateCost = (fields: Partial<Product>) => {
        setFormData(prev => {
            const next = { ...prev, ...fields };
            const cost = next.costPrice || 0;
            const ipi = next.ipiPercent || 0;
            const freight = next.freightCost || 0;
            const freightType = next.freightType || 'fixed';

            let finalCost = cost + (cost * (ipi / 100));
            if (freightType === 'fixed') {
                finalCost += freight;
            } else {
                finalCost += cost * (freight / 100);
            }

            next.finalPurchasePrice = Number(finalCost.toFixed(2));
            return next;
        });
    };

    const filteredSuppliers = suppliers.filter(s =>
        (s.fullName || '').toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const isEditing = !!formData.id && !formData.isDraft;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Lançar Estoque Inicial Toggle - ONLY IN CREATION AND WITHOUT VARIATIONS */}
            {(!isEditing && !formData.hasVariations) && (
                <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
                    <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center shrink-0">
                            <i className="bi bi-box-seam-fill text-blue-600 text-lg"></i>
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Lançar Estoque Inicial?</h4>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Deseja cadastrar o saldo inicial e custos agora?</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, launchInitialStock: !prev.launchInitialStock, stock: 0 }))}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.launchInitialStock ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-100 dark:bg-slate-800 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                    >
                        {formData.launchInitialStock ? 'Sim, Lançar' : 'Não Lançar'}
                    </button>
                </div>
            )}

            {/* Cost Composition / Batch List - ONLY IF LAUNCHING STOCK INITIAL WITHOUT VARIATIONS */}
            {(!isEditing && formData.launchInitialStock && !formData.hasVariations) && (
                <div className="flex flex-col gap-4 animate-in zoom-in-95 duration-300">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Lançamento de Estoque Inicial</h4>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Lançamento múltiplo de quantidades e seus respectivos custos</p>
                    </div>

                    <InitialStockList
                        entries={formData.initialStockEntries || []}
                        onChange={(entries) => {
                            const totalStock = entries.reduce((acc, curr) => acc + (curr.quantity || 0), 0);
                            const avgCost = entries.length > 0
                                ? entries.reduce((acc, curr) => acc + (curr.finalUnitCost || 0), 0) / entries.length
                                : 0;
                            
                            setFormData(prev => ({ 
                                ...prev, 
                                initialStockEntries: entries,
                                stock: totalStock,
                                costPrice: avgCost
                            }));
                        }}
                    />
                </div>
            )}

            {/* Fornecedor e Estoque Mínimo - Sempre Visíveis */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Fornecedor Principal */}
                <div id="field-main-supplier" className="md:col-span-2 flex flex-col gap-2 relative p-2 rounded-2xl" ref={supplierInputRef}>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                        <span>Fornecedor Principal</span>
                    </label>
                    <div className="relative">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-xs"></i>
                        <input
                            type="text"
                            value={supplierSearch}
                            onChange={(e) => {
                                setSupplierSearch(e.target.value);
                                setIsSupplierDropdownOpen(true);
                            }}
                            onFocus={() => setIsSupplierDropdownOpen(true)}
                            placeholder="Digite o nome do fornecedor..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                        />
                    </div>

                    <DropdownPortal anchorRef={supplierInputRef} isOpen={isSupplierDropdownOpen && filteredSuppliers.length > 0}>
                        <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                            {filteredSuppliers.map(s => (
                                <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => {
                                        updateCost({ 
                                            mainSupplierId: s.id,
                                            ipiPercent: s.defaultIpiPercent !== undefined ? s.defaultIpiPercent : formData.ipiPercent,
                                            freightCost: s.defaultFreightCost !== undefined ? s.defaultFreightCost : formData.freightCost,
                                            freightType: s.defaultFreightType || formData.freightType
                                        });
                                        setSupplierSearch(s.fullName || '');
                                        setIsSupplierDropdownOpen(false);
                                    }}
                                    className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-b-0"
                                >
                                    <p className="text-xs font-black text-slate-800 dark:text-slate-200">{s.fullName}</p>
                                    <div className="flex items-center gap-2">
                                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest">{s.cpfCnpj || 'Sem documento'}</p>
                                        {(s.leadTime ?? 0) > 0 && (
                                            <span className="px-1.5 py-0.5 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[8px] font-black uppercase">LT: {s.leadTime}d</span>
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </DropdownPortal>
                </div>

                {formData.hasVariations ? (
                    <div className="md:col-span-1 flex items-center">
                        <div className="p-4 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-xl flex items-center gap-3 w-full h-full">
                            <i className="bi bi-exclamation-triangle-fill text-amber-600 text-lg shrink-0"></i>
                            <p className="text-[9px] font-bold text-amber-800 dark:text-amber-400 leading-tight uppercase tracking-widest">
                                Grade de variações gerenciada na aba "Grade".
                            </p>
                        </div>
                    </div>
                ) : (
                    /* Estoque Mínimo */
                    <div className="flex flex-col gap-2 p-2 rounded-2xl">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Estoque Mínimo</span>
                        </label>
                        <input
                            type="number"
                            value={(formData.minStock === null || formData.minStock === undefined || isNaN(formData.minStock as number)) ? '' : formData.minStock}
                            onChange={(e) => {
                                const val = parseInt(e.target.value);
                                setFormData({ ...formData, minStock: isNaN(val) ? 0 : val });
                            }}
                            className="w-full px-4 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-black text-amber-600 dark:text-amber-500 focus:ring-2 focus:ring-amber-500/20"
                            placeholder="0"
                        />
                    </div>
                )}
            </div>

            {/* Precificação e Custo do Produto */}
            <div className="border-t border-slate-150 dark:border-slate-800/80 pt-6">
                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-600 mb-2 flex items-center gap-1.5">
                    <i className="bi bi-tag-fill"></i> Precificação e Descontos {formData.hasVariations ? '(Produto Pai)' : ''}
                </h5>
                {formData.hasVariations && (
                    <p className="text-[9px] font-bold text-blue-600 dark:text-blue-400 mb-4 bg-blue-50 dark:bg-blue-950/40 p-2.5 rounded-xl border border-blue-100 dark:border-blue-900/30 flex items-center gap-2">
                        <i className="bi bi-info-circle-fill text-xs"></i>
                        <span>As variações que possuem a opção "Sincronizar Preço" ativa herdarão os preços definidos abaixo do produto pai.</span>
                    </p>
                )}
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                    {/* Preço de Venda */}
                    <div id="field-unit-price" className="flex flex-col gap-2 transition-all p-2 rounded-2xl">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Preço de Venda</span>
                            <span className="text-red-500 ml-0.5">*</span>
                        </label>
                        <CurrencyInput
                            value={formData.unitPrice}
                            onChange={(val) => handlePriceChange(String(val))}
                            onBlur={() => {
                                if (formData.unitPrice && Number(formData.unitPrice) > 0 && setValidationErrors) {
                                    setValidationErrors(prev => {
                                        const next = { ...prev };
                                        delete next.unitPrice;
                                        return next;
                                    });
                                }
                            }}
                            className={`w-full text-left px-3 py-2.5 bg-white dark:bg-slate-955 border rounded-xl outline-none text-xs font-bold transition-all ${
                                validationErrors?.unitPrice 
                                    ? 'border-red-500 focus:ring-2 focus:ring-red-500/20 text-red-600' 
                                    : 'border-slate-200 dark:border-slate-800 text-blue-600 focus:ring-2 focus:ring-blue-500/20'
                            }`}
                        />
                    </div>

                    {/* Desconto % */}
                    <div className="flex flex-col gap-2 p-2 rounded-2xl">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Desconto (%)</span>
                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                        </label>
                        <div className="relative">
                            <input
                                type="number"
                                placeholder="0"
                                value={discountPercent}
                                onChange={(e) => handleDiscountPercentChange(e.target.value)}
                                className="w-full pl-4 pr-8 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 pointer-events-none">%</span>
                        </div>
                    </div>

                    {/* Desconto R$ */}
                    <div className="flex flex-col gap-2 p-2 rounded-2xl">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Desconto (R$)</span>
                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                        </label>
                        <CurrencyInput
                            value={discountFixed}
                            onChange={(val) => handleDiscountFixedChange(String(val))}
                            className="w-full text-left px-3 py-2.5 bg-white dark:bg-slate-955 border border-slate-200 dark:border-slate-800 rounded-xl outline-none text-xs font-bold text-emerald-600 focus:ring-2 focus:ring-emerald-500/20"
                        />
                    </div>

                    {/* Preço Promocional Final */}
                    <div className="flex flex-col gap-2 p-2 rounded-2xl">
                        <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-1.5 h-6">
                            <span>Preço Promocional Final</span>
                            <span className="inline-flex items-center text-[9px] font-black bg-purple-100/60 dark:bg-purple-955/40 text-purple-600 dark:text-purple-400 px-1.5 py-0.5 rounded border border-purple-200/30 uppercase select-none">Catálogo</span>
                        </label>
                        <CurrencyInput
                            placeholder="Sem desconto"
                            value={formData.promoPrice}
                            onChange={(val) => handlePromoPriceFieldChange(String(val))}
                            className="w-full text-left px-3 py-2.5 bg-amber-50/50 dark:bg-amber-900/10 border border-amber-100/50 dark:border-amber-900/30 rounded-xl outline-none text-xs font-black text-amber-600 dark:text-amber-500 focus:ring-2 focus:ring-amber-500/20"
                        />
                    </div>
                </div>
            </div>

            {/* Info Box */}
            <div className="flex items-center gap-3 p-3 bg-blue-50/50 dark:bg-blue-900/10 rounded-xl">
                <i className="bi bi-info-circle-fill text-blue-500 text-sm"></i>
                <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-tight">
                    Vincule o fornecedor para automatizar o cálculo de Lead Time e pedidos de compra. O Lead Time é definido no cadastro do fornecedor.
                </p>
            </div>
        </div>
    );
};

export default ProductInventoryTab;
