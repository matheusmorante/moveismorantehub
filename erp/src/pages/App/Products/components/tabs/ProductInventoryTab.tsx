import React, { useState, useRef, useEffect } from 'react';
import Product from '../../../../types/product.type';
import Person from '../../../../types/person.type';
import DropdownPortal from '../../../../../components/shared/DropdownPortal';
import { toast } from 'react-toastify';
import { getProductSalesStats } from '../../../../utils/productService';

interface ProductInventoryTabProps {
    formData: Partial<Product>;
    setFormData: React.Dispatch<React.SetStateAction<Partial<Product>>>;
    suppliers: Person[];
    handleSuggestPrices: () => void;
    isSuggestingPrices: boolean;
    suggestPricesResults: { low: any, medium: any, high: any } | null;
}

const ProductInventoryTab: React.FC<ProductInventoryTabProps> = ({
    formData,
    setFormData,
    suppliers,
    handleSuggestPrices,
    isSuggestingPrices,
    suggestPricesResults
}) => {
    const [supplierSearch, setSupplierSearch] = useState('');
    const [isSupplierDropdownOpen, setIsSupplierDropdownOpen] = useState(false);
    const [isSyncingSales, setIsSyncingSales] = useState(false);
    const supplierInputRef = useRef<HTMLDivElement>(null);

    // Initialize search with current supplier name
    useEffect(() => {
        if (formData.mainSupplierId && suppliers.length > 0) {
            const current = suppliers.find(s => s.id === formData.mainSupplierId);
            if (current) setSupplierSearch(current.fullName || '');
        }
    }, [formData.mainSupplierId, suppliers]);

    const filteredSuppliers = suppliers.filter(s => 
        (s.fullName || '').toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const calculateMinStock = () => {
        const leadTime = formData.leadTime || 0;
        const avgMonthlySales = formData.avgMonthlySales || 0;
        const classification = formData.classification || 'Q2';

        if (leadTime === 0 || avgMonthlySales === 0) {
            toast.warning("Preencha Lead Time e Venda Mensal para calcular.");
            return;
        }

        // Formula: (Venda Mensal / 30 * Lead Time) + Margin
        const dailySales = avgMonthlySales / 30;
        let baseMinStock = dailySales * leadTime;

        // Security Margin
        let margin = 0.15; // Default 15%
        if (classification === 'Q1') margin = 0.50;
        else if (classification === 'Q2') margin = 0.20;
        else if (classification === 'Q4') margin = 0;

        const totalMinStock = Math.ceil(baseMinStock * (1 + margin));
        setFormData({ ...formData, minStock: totalMinStock });
        toast.success(`Estoque M├¡nimo sugerido: ${totalMinStock} unidades.`);
    };

    const handleSyncSales = async () => {
        if (!formData.id) {
            toast.warning("Salve o produto primeiro para sincronizar com vendas reais.");
            return;
        }

        setIsSyncingSales(true);
        try {
            const { avgMonthlySales } = await getProductSalesStats(formData.id);
            setFormData(prev => ({ ...prev, avgMonthlySales }));
            toast.success(`Giro mensal atualizado: ${avgMonthlySales} un/m├¬s (baseado nos ├║ltimos 90 dias).`);
        } catch (error) {
            toast.error("Erro ao sincronizar vendas.");
        } finally {
            setIsSyncingSales(false);
        }
    };

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Cost Composition */}
            <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Composição de Custo / Compra</h4>
                        <p className="text-[9px] text-slate-400 uppercase font-black tracking-widest mt-1">Defina como o custo final do produto é formado</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="flex flex-col gap-2">
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Preço de Custo (Base)</label>
                        <input
                            type="number"
                            step="0.01"
                            value={isNaN(formData.costPrice as number) || formData.costPrice === 0 ? '' : formData.costPrice}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setFormData({ ...formData, costPrice: isNaN(val) ? 0 : val });
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">IPI</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, ipiType: 'percentage' })}
                                    className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all ${(!formData.ipiType || formData.ipiType === 'percentage') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >%</button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, ipiType: 'fixed' })}
                                    className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all ${formData.ipiType === 'fixed' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >$</button>
                            </div>
                        </div>
                        <input
                            type="number"
                            step="0.1"
                            value={isNaN(formData.ipiPercent as number) || formData.ipiPercent === 0 ? '' : formData.ipiPercent}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setFormData({ ...formData, ipiPercent: isNaN(val) ? 0 : val });
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                        />
                    </div>
                    <div className="flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                            <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Valor Frete Unit.</label>
                            <div className="flex bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, freightType: 'percentage' })}
                                    className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all ${formData.freightType === 'percentage' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >%</button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, freightType: 'fixed' })}
                                    className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all {(formData.freightType === 'fixed' || !formData.freightType || formData.freightType === 'none') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                                >$</button>
                            </div>
                        </div>
                        <input
                            type="number"
                            step="0.01"
                            value={isNaN(formData.freightCost as number) || formData.freightCost === 0 ? '' : formData.freightCost}
                            onChange={(e) => {
                                const val = parseFloat(e.target.value);
                                setFormData({ ...formData, freightCost: isNaN(val) ? 0 : val });
                            }}
                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                        />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-6 bg-blue-600 rounded-[2rem] flex items-center justify-between shadow-xl shadow-blue-500/20">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/10 rounded-2xl">
                                <i className="bi bi-wallet2 text-2xl text-white"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-blue-100 opacity-70">Preço Final de Custo</p>
                                <p className="text-2xl font-black text-white">R$ {formData.finalPurchasePrice?.toFixed(2)}</p>
                            </div>
                        </div>

                        <button
                            type="button"
                            onClick={handleSuggestPrices}
                            disabled={isSuggestingPrices}
                            className={`flex items-center gap-2 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isSuggestingPrices ? 'bg-white/10 text-white/40 cursor-not-allowed' : 'bg-white text-blue-600 hover:bg-blue-50'}`}
                        >
                            {isSuggestingPrices ? (
                                <><i className="bi bi-hourglass-split animate-spin"></i> Analisando...</>
                            ) : (
                                <><i className="bi bi-magic"></i> IA: Sugerir Preço</>
                            )}
                        </button>
                    </div>

                    <div className="p-6 bg-slate-900 dark:bg-slate-800 rounded-[2rem] flex items-center justify-between shadow-xl">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-emerald-500/20 rounded-2xl">
                                <i className="bi bi-graph-up-arrow text-2xl text-emerald-500"></i>
                            </div>
                            <div>
                                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Margem (Markup)</p>
                                <p className="text-2xl font-black text-white">
                                    {formData.unitPrice && formData.finalPurchasePrice && formData.finalPurchasePrice > 0
                                        ? `${Math.round(((formData.unitPrice / formData.finalPurchasePrice) - 1) * 100)}%`
                                        : '0%'
                                    }
                                </p>
                            </div>
                        </div>
                        <div className="text-right">
                            <p className="text-[9px] font-black uppercase tracking-widest text-slate-500">Lucro Bruto Est.</p>
                            <p className="text-sm font-black text-emerald-500">
                                R$ {((formData.unitPrice || 0) - (formData.finalPurchasePrice || 0)).toFixed(2)}
                            </p>
                        </div>
                    </div>
                </div>

                {suggestPricesResults && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 animate-in fade-in slide-in-from-top-4 duration-500">
                        {(['low', 'medium', 'high'] as const).map(tier => (
                            <button
                                key={tier}
                                type="button"
                                onClick={() => {
                                    setFormData({ ...formData, unitPrice: suggestPricesResults[tier].price });
                                    toast.success(`Preço ${suggestPricesResults[tier].label} aplicado!`);
                                }}
                                className={`flex flex-col gap-2 p-5 rounded-3xl border-2 text-left transition-all group ${tier === 'medium' ? 'bg-blue-50/50 border-blue-200 dark:bg-blue-900/10 dark:border-blue-900/30' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800 hover:border-blue-100'}`}
                            >
                                <span className={`text-[9px] font-black uppercase tracking-widest ${tier === 'medium' ? 'text-blue-600' : 'text-slate-400'}`}>
                                    {suggestPricesResults[tier].label}
                                </span>
                                <div className="flex items-center justify-between">
                                    <div className="flex items-baseline gap-1">
                                        <span className="text-xs font-bold text-slate-400">R$</span>
                                        <span className="text-xl font-black text-slate-800 dark:text-slate-100">
                                            {suggestPricesResults[tier].price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                                        </span>
                                    </div>
                                    {suggestPricesResults[tier].margin && (
                                        <span className="px-2 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 text-[9px] font-black">
                                            +{suggestPricesResults[tier].margin}%
                                        </span>
                                    )}
                                </div>
                                <div className="mt-2 flex items-center gap-2 text-[10px] font-bold text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span>Aplicar este valor</span>
                                    <i className="bi bi-arrow-right"></i>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Inventory Management */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-box-seam text-blue-600"></i> Gestão de Estoque
                    </h4>
                       {formData.hasVariations ? (
                        <div className="p-6 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-3xl">
                            <div className="flex items-center gap-3 mb-2">
                                <i className="bi bi-info-circle-fill text-blue-600"></i>
                                <h5 className="text-[10px] font-black uppercase tracking-widest text-blue-700 dark:text-blue-400">Gestão por Variação</h5>
                            </div>
                            <p className="text-[10px] font-bold text-blue-600/70 dark:text-blue-400/70 leading-relaxed">
                                Este produto possui variações. O estoque atual e o estoque mínimo são gerenciados individualmente para cada variação na aba "Variações".
                            </p>
                        </div>
                    ) : (
                        <div className="flex flex-col gap-6">
                            {/* Inventory Management Inputs */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 group-hover:text-blue-600 transition-colors">Estoque Atual</label>
                                    <input
                                        type="number"
                                        value={isNaN(formData.stock as number) || formData.stock === 0 ? '' : formData.stock}
                                        onChange={(e) => {
                                            const val = parseInt(e.target.value);
                                            setFormData({ ...formData, stock: isNaN(val) ? 0 : val });
                                        }}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-black text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500/20"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 tracking-tighter">Giro Mensal</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="number"
                                            value={formData.avgMonthlySales || ''}
                                            onChange={(e) => setFormData({ ...formData, avgMonthlySales: parseInt(e.target.value) || 0 })}
                                            placeholder="Ex: 50"
                                            className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold"
                                        />
                                        <button
                                            type="button"
                                            onClick={handleSyncSales}
                                            disabled={isSyncingSales}
                                            className="p-3 bg-blue-50 dark:bg-blue-900/20 text-blue-600 rounded-2xl hover:bg-blue-100 transition-colors"
                                            title="Sincronizar com histórico de vendas (90 dias)"
                                        >
                                            <i className={`bi ${isSyncingSales ? 'bi-hourglass-split animate-spin' : 'bi-arrow-repeat'}`}></i>
                                        </button>
                                    </div>
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 tracking-tighter">Lead Time (Dias)</label>
                                    <input
                                        type="number"
                                        value={formData.leadTime || ''}
                                        onChange={(e) => setFormData({ ...formData, leadTime: parseInt(e.target.value) || 0 })}
                                        placeholder="Ex: 15"
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold"
                                    />
                                </div>
                                <div className="flex flex-col gap-2">
                                    <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 tracking-tighter">Importância</label>
                                    <select
                                        value={formData.classification || 'Q2'}
                                        onChange={(e) => setFormData({ ...formData, classification: e.target.value as any })}
                                        className="w-full px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold"
                                    >
                                        <option value="Q1">Q1 (Crucial +50%)</option>
                                        <option value="Q2">Q2 (Importante)</option>
                                        <option value="Q3">Q3 (Normal)</option>
                                        <option value="Q4">Q4 (Eventual)</option>
                                    </select>
                                </div>
                            </div>

                            <div className="flex flex-col gap-2">
                                <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Estoque Mínimo</label>
                                <div className="flex flex-col md:flex-row gap-4">
                                    <div className="flex flex-1 gap-2">
                                        <input
                                            type="number"
                                            value={isNaN(formData.minStock as number) || formData.minStock === 0 ? '' : formData.minStock}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, minStock: isNaN(val) ? 0 : val });
                                            }}
                                            className="flex-1 px-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200"
                                        />
                                        <button
                                            type="button"
                                            onClick={calculateMinStock}
                                            className="p-3 bg-slate-100 dark:bg-slate-800 text-blue-600 hover:bg-blue-600 hover:text-white rounded-2xl transition-all"
                                            title="Calcular Estoque Mínimo Sugerido"
                                        >
                                            <i className="bi bi-calculator"></i>
                                        </button>
                                    </div>
                                    
                                    {/* Min Stock Formula Explanation */}
                                    <div className="flex-1 p-3 bg-white/50 dark:bg-slate-900/50 rounded-2xl border border-slate-100 dark:border-slate-800 text-[10px]">
                                        <p className="font-black uppercase tracking-widest text-slate-400 mb-1">Cálculo Automático:</p>
                                        <div className="flex flex-col gap-1 font-medium text-slate-600 dark:text-slate-300 italic">
                                            <p>Fórmula: (Venda Diária × Lead Time) + Margem Seg.</p>
                                            <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 font-bold not-italic">
                                                <span className="text-blue-600">Venda: {(formData.avgMonthlySales || 0) / 30 > 0 ? ((formData.avgMonthlySales || 0) / 30).toFixed(2) : '0'} un/dia</span>
                                                <span className="text-blue-600">L. Time: {formData.leadTime || 0} dias</span>
                                                <span className="text-blue-600">Margem: {
                                                    formData.classification === 'Q1' ? '50%' :
                                                    formData.classification === 'Q2' ? '20%' :
                                                    formData.classification === 'Q3' ? '15%' : '0%'
                                                }</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
                {/* Main Supplier */}
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-truck text-blue-600"></i> Fornecedor Principal
                    </h4>
                    <div className="flex flex-col gap-2 relative" ref={supplierInputRef}>
                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">Buscar Fornecedor</label>
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
                                className="w-full pl-10 pr-4 py-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl outline-none text-sm font-bold dark:text-slate-200 focus:ring-2 focus:ring-blue-500/20"
                            />
                        </div>

                        <DropdownPortal anchorRef={supplierInputRef} isOpen={isSupplierDropdownOpen && filteredSuppliers.length > 0}>
                            <div className="mt-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 shadow-2xl rounded-2xl overflow-hidden max-h-60 overflow-y-auto custom-scrollbar">
                                {filteredSuppliers.map(s => (
                                    <button
                                        key={s.id}
                                        type="button"
                                        onClick={() => {
                                            setFormData({ 
                                                ...formData, 
                                                mainSupplierId: s.id,
                                                leadTime: s.leadTime || formData.leadTime 
                                            });
                                            setSupplierSearch(s.fullName || '');
                                            setIsSupplierDropdownOpen(false);
                                        }}
                                        className="w-full px-5 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                                    >
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.fullName}</p>
                                        <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{s.cpfCnpj || 'Sem documento'}</p>
                                    </button>
                                ))}
                            </div>
                        </DropdownPortal>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                        <i className="bi bi-info-circle-fill text-blue-500"></i>
                        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-tight">
                            Vincule o fornecedor para automatizar o cálculo de Lead Time e pedidos de compra.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductInventoryTab;
