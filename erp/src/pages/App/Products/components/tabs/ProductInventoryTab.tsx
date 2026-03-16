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
    const [stats, setStats] = useState<{ giro: number, lt: number } | null>(null);
    const supplierInputRef = useRef<HTMLDivElement>(null);

    // Initialize search and load stats
    useEffect(() => {
        if (formData.mainSupplierId && suppliers.length > 0) {
            const current = suppliers.find(s => s.id === formData.mainSupplierId);
            if (current) {
                setSupplierSearch(current.fullName || '');
                setStats(prev => ({ ...prev, lt: current.leadTime || 0 } as any));
            }
        }
    }, [formData.mainSupplierId, suppliers]);

    useEffect(() => {
        const loadGiro = async () => {
            if (formData.id) {
                try {
                    const { avgMonthlySales } = await getProductSalesStats(formData.id);
                    setStats(prev => ({ ...prev, giro: avgMonthlySales } as any));
                } catch (e) {
                    console.error("Erro ao carregar giro:", e);
                }
            }
        };
        loadGiro();
    }, [formData.id]);

    const filteredSuppliers = suppliers.filter(s => 
        (s.fullName || '').toLowerCase().includes(supplierSearch.toLowerCase())
    );

    const isEditing = !!formData.id;

    return (
        <div className="flex flex-col gap-8 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {/* Initial Stock Toggle - ONLY IN CREATION */}
            {!isEditing && (
                <div className="bg-blue-50/50 dark:bg-blue-900/10 p-6 rounded-[2rem] border border-blue-100 dark:border-blue-900/30 flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                            <i className="bi bi-box-seam-fill text-blue-600 text-xl"></i>
                        </div>
                        <div>
                            <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200">Lançar Estoque Inicial?</h4>
                            <p className="text-[9px] text-slate-500 uppercase font-bold tracking-widest mt-0.5">Deseja cadastrar o saldo inicial e custos agora?</p>
                        </div>
                    </div>
                    <button
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, launchInitialStock: !prev.launchInitialStock, stock: 0 }))}
                        className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${formData.launchInitialStock ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/30' : 'bg-slate-200 text-slate-500 hover:bg-slate-300'}`}
                    >
                        {formData.launchInitialStock ? 'Sim, Lançar' : 'Não Lançar'}
                    </button>
                </div>
            )}

            {/* Cost Composition - ONLY IF LAUNCHING INITIAL STOCK OR... wait User said TIRE OS CAMPOS */}
            {(!isEditing && formData.launchInitialStock) && (
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6 animate-in zoom-in-95 duration-300">
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
                                    className={`px-2 py-0.5 text-[8px] font-black uppercase tracking-tighter rounded-md transition-all ${(formData.freightType === 'fixed' || !formData.freightType || formData.freightType === 'none') ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
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
                </div>
            )}

            <div className={`grid grid-cols-1 ${(!isEditing && !formData.launchInitialStock) ? 'md:grid-cols-1' : 'md:grid-cols-2'} gap-8`}>
                {/* Inventory Management */}
                {(isEditing || formData.launchInitialStock) && (
                <div className="bg-slate-50/50 dark:bg-slate-950/20 p-8 rounded-[2.5rem] border border-slate-100 dark:border-slate-800 flex flex-col gap-6">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-800 dark:text-slate-200 flex items-center gap-2">
                        <i className="bi bi-box-seam text-blue-600"></i> {isEditing ? 'Gestão de Estoque' : 'Quantidade Inicial'}
                    </h4>
                    <div className="flex flex-col gap-6">
                        <div className="flex flex-col gap-6">
                            {!formData.hasVariations ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className={`flex flex-col gap-2 p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl ${isEditing ? 'opacity-70' : ''}`}>
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400">{isEditing ? 'Estoque Atual' : 'Quantidade de Entrada'}</label>
                                        <input
                                            type="number"
                                            value={isNaN(formData.stock as number) || formData.stock === 0 ? '' : formData.stock}
                                            disabled={isEditing}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, stock: isNaN(val) ? 0 : val });
                                            }}
                                            className="w-full px-0 bg-transparent outline-none text-2xl font-black text-blue-600 dark:text-blue-400"
                                            placeholder="0"
                                        />
                                        {isEditing && <p className="text-[7px] font-black text-slate-400 uppercase tracking-tight italic">* Ajuste via Lançamentos de Estoque</p>}
                                    </div>
                                    <div className="flex flex-col gap-2 p-6 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-3xl relative">
                                        <label className="text-[9px] font-black uppercase tracking-widest text-slate-400 flex items-center justify-between">
                                            Estoque Mínimo / Segurança
                                            <button
                                                type="button"
                                                onClick={async () => {
                                                    if (!formData.id) return toast.warning("Salve o produto primeiro para calcular com dados reais.");
                                                    
                                                    setIsSyncingSales(true);
                                                    try {
                                                        const { avgMonthlySales } = await getProductSalesStats(formData.id);
                                                        const supplier = suppliers.find(s => s.id === formData.mainSupplierId);
                                                        const lt = supplier?.leadTime || 0;
                                                        
                                                        if (lt === 0) {
                                                            toast.warning("Vincule um fornecedor com Lead Time definido para usar a fórmula automática.");
                                                        }

                                                        const dailySales = avgMonthlySales / 30;
                                                        const margin = 0.20; // Default 20%
                                                        const suggested = Math.ceil((dailySales * lt) * (1 + margin)) || 5;
                                                        
                                                        setFormData(prev => ({ ...prev, minStock: suggested }));
                                                        setStats({ giro: avgMonthlySales, lt });
                                                        toast.success(`Sugerido: ${suggested} un. (Giro: ${avgMonthlySales}/mês, LT: ${lt}d)`);
                                                    } catch (e) {
                                                        toast.error("Erro ao calcular.");
                                                    } finally {
                                                        setIsSyncingSales(false);
                                                    }
                                                }}
                                                className="text-[8px] text-blue-600 hover:underline flex items-center gap-1 font-black"
                                            >
                                                <i className={`bi ${isSyncingSales ? 'bi-hourglass-split animate-spin' : 'bi-magic'}`}></i>
                                                Sugerir p/ Fórmula
                                            </button>
                                        </label>
                                        <input
                                            type="number"
                                            value={isNaN(formData.minStock as number) || formData.minStock === 0 ? '' : formData.minStock}
                                            onChange={(e) => {
                                                const val = parseInt(e.target.value);
                                                setFormData({ ...formData, minStock: isNaN(val) ? 0 : val });
                                            }}
                                            className="w-full px-0 bg-transparent outline-none text-2xl font-black text-slate-800 dark:text-slate-200"
                                            placeholder="0"
                                        />
                                        
                                        {stats && stats.lt > 0 && (
                                            <div className="absolute bottom-2 left-6 right-6 flex items-center gap-2 text-[8px] font-black uppercase tracking-widest text-slate-400 border-t border-slate-50 dark:border-slate-900 pt-2">
                                                <span>Giro: {stats.giro}/mês</span>
                                                <span className="w-1 h-1 rounded-full bg-slate-300" />
                                                <span>LT: {stats.lt}d</span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ) : (
                                <div className="p-6 bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/30 rounded-3xl flex items-center gap-4">
                                    <div className="w-12 h-12 rounded-2xl bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center shrink-0">
                                        <i className="bi bi-exclamation-triangle-fill text-amber-600 text-xl"></i>
                                    </div>
                                    <p className="text-[10px] font-bold text-amber-800 dark:text-amber-400 leading-tight uppercase tracking-widest">
                                        O estoque e níveis de segurança de produtos com variação são gerenciados individualmente na aba "Grade".
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                )}
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
                                                mainSupplierId: s.id
                                            });
                                            setSupplierSearch(s.fullName || '');
                                            setIsSupplierDropdownOpen(false);
                                            setStats(prev => ({ ...prev, lt: s.leadTime || 0 } as any));
                                        }}
                                        className="w-full px-5 py-3 text-left hover:bg-blue-50 dark:hover:bg-blue-900/10 transition-colors border-b border-slate-50 dark:border-slate-800 last:border-0"
                                    >
                                        <p className="text-sm font-bold text-slate-700 dark:text-slate-200">{s.fullName}</p>
                                        <div className="flex items-center gap-2">
                                            <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest">{s.cpfCnpj || 'Sem documento'}</p>
                                            {(s.leadTime ?? 0) > 0 && (
                                                <span className="px-1.5 py-0.5 rounded-md bg-blue-50 dark:bg-blue-900/20 text-blue-600 text-[8px] font-black uppercase">LT: {s.leadTime}d</span>
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </DropdownPortal>
                    </div>
                    
                    <div className="flex items-center gap-3 p-4 bg-blue-50/50 dark:bg-blue-900/10 border border-blue-100 dark:border-blue-900/30 rounded-2xl">
                        <i className="bi bi-info-circle-fill text-blue-500"></i>
                        <p className="text-[10px] font-bold text-blue-700 dark:text-blue-400 leading-tight">
                                                     Vincule o fornecedor para automatizar o cálculo de Lead Time e pedidos de compra. O Lead Time é definido no cadastro do fornecedor.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ProductInventoryTab;
