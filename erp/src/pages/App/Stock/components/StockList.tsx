import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import Product, { Variation } from "../../../types/product.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import QRScannerModal from "@/components/shared/QRScannerModal";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

interface StockListProps {
    onLaunch: (product: Product, variation?: Variation) => void;
}

const StockList = ({ onLaunch }: StockListProps) => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);


    useEffect(() => {
        const unsubscribe = subscribeToProducts((data) => {
            // Only show products (not services) and not deleted
            const onlyProducts = data.filter(p => p.itemType === 'product' && !p.deleted);
            setProducts(onlyProducts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filtered = products.filter(p => {
        const searchLower = search.toLowerCase();
        const matchesParent = p.description.toLowerCase().includes(searchLower) || 
                             p.code?.toLowerCase().includes(searchLower) ||
                             p.supplierRef?.toLowerCase().includes(searchLower);
        
        const matchesVariation = p.hasVariations && p.variations?.some(v => 
            v.sku?.toLowerCase().includes(searchLower) || 
            v.name?.toLowerCase().includes(searchLower)
        );

        return matchesParent || matchesVariation;
    });

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Estoque...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="p-6 border-b border-slate-50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-md">
                    <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400"></i>
                    <input 
                        type="text" 
                        placeholder="Buscar produto por nome ou código..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full pl-12 pr-12 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-slate-200"
                    />
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center text-slate-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-lg transition-all"
                        title="Escanear Código de Barras"
                    >
                        <i className="bi bi-qr-code-scan"></i>
                    </button>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-emerald-600 dark:text-emerald-400">Total de Itens:</span>
                    <span className="text-sm font-black text-emerald-700 dark:text-emerald-300">{filtered.length}</span>
                </div>
            </div>

            <div className="overflow-x-auto overflow-y-auto max-h-[60vh] custom-scrollbar">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead className="sticky top-0 z-20 bg-slate-50 dark:bg-slate-950">
                        <tr>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Item / Produto</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Saldo Atual</th>
                            <th className="px-4 md:px-8 py-3 md:py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-right">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filtered.map((product, pIdx) => (
                            <React.Fragment key={product.id || `product-${pIdx}`}>
                                <tr className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-4 md:px-8 py-3 md:py-5">
                                        <div className="flex items-center gap-4">
                                            <div className="relative shrink-0">
                                                <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 dark:group-hover:bg-emerald-900/30 transition-all">
                                                    <i className="bi bi-box-seam text-lg"></i>
                                                </div>
                                                {product.hasVariations && (
                                                    <div className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white rounded-md flex items-center justify-center shadow-lg border-2 border-white dark:border-slate-800 animate-in zoom-in duration-300">
                                                        <i className="bi bi-layers-fill text-[8px]"></i>
                                                    </div>
                                                )}
                                            </div>
                                            <div className="flex flex-col min-w-[120px]">
                                                <span className="block font-bold text-slate-700 dark:text-slate-200 truncate">{product.description}</span>
                                                {product.code && <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest truncate">{product.code}</span>}
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-8 py-3 md:py-5 text-center">
                                        <div className={`inline-flex items-center px-4 py-2 rounded-2xl font-black text-sm ${(product.stock || 0) <= (product.minStock || 0)
                                            ? 'bg-rose-50 text-rose-600 dark:bg-rose-900/20 dark:text-rose-400'
                                            : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-900/20 dark:text-emerald-400'
                                            }`}>
                                            {product.stock || 0} {product.unit}
                                        </div>
                                    </td>
                                    <td className="px-4 md:px-8 py-3 md:py-5 text-right flex items-center justify-end gap-2">
                                        {!product.hasVariations && (
                                            <>
                                                <Link
                                                    to="/stock/label-printing"
                                                    state={{ product }}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 dark:bg-slate-800 text-slate-500 hover:text-blue-600 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest border border-slate-100 dark:border-slate-700"
                                                    title="Imprimir Etiquetas deste Produto"
                                                >
                                                    <i className="bi bi-printer"></i>
                                                </Link>
                                                <button
                                                    onClick={() => onLaunch(product)}
                                                    className="inline-flex items-center gap-2 px-4 py-2 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-500 hover:text-emerald-600 dark:text-slate-400 dark:hover:text-emerald-400 hover:border-emerald-200 dark:hover:border-emerald-900/50 rounded-xl transition-all font-black uppercase text-[10px] tracking-widest shadow-sm"
                                                >
                                                    <i className="bi bi-lightning-charge"></i>
                                                    <span className="hidden sm:inline">Lançar</span>
                                                </button>
                                            </>
                                        )}
                                        {product.hasVariations && (
                                            <span className="text-[9px] font-black uppercase tracking-widest text-slate-400">Ver Variações</span>
                                        )}
                                    </td>
                                </tr>
                                {product.hasVariations && product.variations?.map((v, vIdx) => (
                                    <tr key={v.id || `var-${vIdx}`} className="bg-slate-50/30 dark:bg-slate-900/30 hover:bg-emerald-50/40 dark:hover:bg-emerald-900/10 transition-colors group border-l-4 border-emerald-500/20">
                                        <td className="px-4 md:px-8 py-3 md:py-4 pl-8 md:pl-16">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-lg bg-white dark:bg-slate-800 flex items-center justify-center text-slate-300 border border-slate-100 dark:border-slate-800 shrink-0">
                                                    <i className="bi bi-stack text-sm"></i>
                                                </div>
                                                <div className="flex flex-col min-w-[120px]">
                                                    <span className="text-sm font-bold text-slate-600 dark:text-slate-400 truncate">{v.name}</span>
                                                    <span className="block text-[8px] font-black text-slate-400 uppercase tracking-widest truncate">{v.sku || "Sem SKU"}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-8 py-3 md:py-4 text-center">
                                            <div className={`inline-flex items-center px-3 py-1.5 rounded-xl font-black text-xs ${v.stock <= (v.minStock || 0)
                                                ? 'bg-rose-50/50 text-rose-500'
                                                : 'bg-emerald-50/50 text-emerald-500'
                                                }`}>
                                                {v.stock} {product.unit}
                                            </div>
                                        </td>
                                        <td className="px-4 md:px-8 py-3 md:py-4 text-right flex items-center justify-end gap-2">
                                            <Link
                                                to="/stock/label-printing"
                                                state={{ product: { ...product, description: `${product.description} - ${v.name}`, unitPrice: v.unitPrice || product.unitPrice } }}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-slate-800 text-slate-400 hover:text-blue-600 rounded-lg transition-all font-black uppercase text-[9px] tracking-widest"
                                                title="Imprimir Etiquetas desta Variação"
                                            >
                                                <i className="bi bi-printer"></i>
                                            </Link>
                                            <button
                                                onClick={() => onLaunch(product, v)}
                                                className="inline-flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 hover:text-emerald-600 rounded-lg transition-all font-black uppercase text-[9px] tracking-widest"
                                            >
                                                <i className="bi bi-lightning-charge"></i>
                                                <span className="hidden sm:inline">Lançar</span>
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </React.Fragment>
                        ))}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="p-20 flex flex-col items-center justify-center text-center">
                    <div className="w-20 h-20 bg-slate-50 dark:bg-slate-900 rounded-[2rem] flex items-center justify-center text-slate-200 dark:text-slate-800 mb-6">
                        <i className="bi bi-search text-4xl"></i>
                    </div>
                    <h4 className="text-xl font-black text-slate-400">Nenhum produto encontrado</h4>
                    <p className="text-sm text-slate-300 dark:text-slate-600 mt-2 max-w-xs">Tente ajustar seus filtros de busca ou cadastre novos produtos.</p>
                </div>
            )}
            {isScannerOpen && (
                <ErrorBoundary name="Scanner de Estoque">
                    <QRScannerModal 
                        isOpen={isScannerOpen} 
                        onClose={() => setIsScannerOpen(false)} 
                        onScan={(code) => {
                            setSearch(code);
                            setIsScannerOpen(false);
                        }}
                        title="Escanear Produto"
                    />
                </ErrorBoundary>
            )}
        </div>
    );
};

export default StockList;
