import React, { useState, useEffect, useMemo, useCallback } from "react";
import Product, { Variation } from "../../../types/product.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import { toast } from "react-toastify";
import InventoryMove from "../../../types/inventoryMove.type";
import QRScannerModal from "@/components/shared/QRScannerModal";
import ErrorBoundary from "@/components/shared/ErrorBoundary";

const InventoryAudit = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [counts, setCounts] = useState<Record<string, string>>({}); // Use string to allow empty input during typing
    const [processing, setProcessing] = useState(false);
    const [search, setSearch] = useState("");
    const [isScannerOpen, setIsScannerOpen] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeToProducts((data) => {
            const onlyProducts = data.filter(p => p.itemType === 'product' && !p.deleted);
            setProducts(onlyProducts);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const flatItems = useMemo(() => {
        const items: any[] = [];
        products.forEach((p, pIdx) => {
            const productId = p.id || `p-ref-${pIdx}`;
            if (p.hasVariations && p.variations) {
                p.variations.forEach((v, vIdx) => {
                    const variationId = v.id || `v-ref-${vIdx}`;
                    items.push({
                        id: `v-${variationId}-${productId}-${vIdx}`, // Added vIdx for extra safety
                        productId: productId,
                        variationId: variationId,
                        name: `${p.description} (${v.name})`,
                        code: v.sku || p.code,
                        supplierRef: p.supplierRef,
                        systemStock: v.stock || 0,
                        unit: p.unit,
                        isVariation: true
                    });
                });
            } else {
                items.push({
                    id: `p-${productId}-${pIdx}`, // Added pIdx for extra safety
                    productId: productId,
                    name: p.description,
                    code: p.code,
                    supplierRef: p.supplierRef,
                    systemStock: p.stock || 0,
                    unit: p.unit,
                    isVariation: false
                });
            }
        });
        return items;
    }, [products]);

    const filtered = flatItems.filter(item => 
        item.name.toLowerCase().includes(search.toLowerCase()) || 
        item.code?.toLowerCase().includes(search.toLowerCase()) ||
        item.supplierRef?.toLowerCase().includes(search.toLowerCase())
    );

    const handleCountChange = (itemId: string, value: string) => {
        setCounts(prev => ({ ...prev, [itemId]: value }));
    };

    const hasChanges = Object.keys(counts).some(id => counts[id] !== "");

    const handleFinalize = async () => {
        const modifiedItems = Object.entries(counts).filter(([_, val]) => val !== "");
        
        if (modifiedItems.length === 0) {
            toast.warn("Nenhum item foi contado ainda.");
            return;
        }

        if (!confirm(`Deseja aplicar o balanço em ${modifiedItems.length} itens? O estoque do sistema será substituído pelos valores informados.`)) {
            return;
        }

        setProcessing(true);
        try {
            for (const [itemId, physicalVal] of modifiedItems) {
                const item = flatItems.find(fi => fi.id === itemId);
                if (!item) continue;

                const physicalQty = parseFloat(physicalVal);
                if (isNaN(physicalQty)) continue;

                const move: InventoryMove = {
                    productId: item.productId,
                    variationId: item.variationId,
                    productDescription: item.name,
                    type: 'balance',
                    quantity: physicalQty,
                    date: new Date().toISOString(),
                    label: 'Balanço de Inventário',
                    observation: `Contagem física de rotina. Antigo: ${item.systemStock} ${item.unit}.`
                };

                await saveInventoryMove(move, item.systemStock);
            }

            toast.success("Balanço de estoque processado com sucesso! ✨");
            setCounts({}); // Clear counts
        } catch (error) {
            console.error(error);
            toast.error("Erro ao processar o balanço em alguns itens.");
        } finally {
            setProcessing(false);
        }
    };

    const getDiff = (itemId: string, systemStock: number) => {
        const val = counts[itemId];
        if (val === "" || val === undefined) return null;
        const physical = parseFloat(val);
        if (isNaN(physical)) return null;
        const diff = physical - systemStock;
        return diff;
    };

    const handleScan = useCallback((code: string) => {
        const cleanCode = code.trim().toLowerCase();
        const item = flatItems.find(fi => 
            fi.code?.trim().toLowerCase() === cleanCode || 
            fi.supplierRef?.trim().toLowerCase() === cleanCode
        );
        if (item) {
            setCounts(prev => {
                const currentVal = prev[item.id] || "0";
                const newVal = (parseFloat(currentVal) + 1).toString();
                return { ...prev, [item.id]: newVal };
            });
            toast.success(`+1: ${item.name}`, { autoClose: 1000, position: "top-center" });
            
            // Scroll to the row and highlight it
            setTimeout(() => {
                const row = document.querySelector(`tr[data-code="${code}"]`);
                if (row) {
                    row.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    row.classList.add('bg-emerald-50', 'dark:bg-emerald-900/20');
                    setTimeout(() => {
                        row.classList.remove('bg-emerald-50', 'dark:bg-emerald-900/20');
                    }, 2000);
                }
            }, 100);
        } else {
            toast.error(`Código "${code}" não encontrado na lista.`, { autoClose: 2000 });
        }
    }, [flatItems]);

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-emerald-600/30 border-t-emerald-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Preparando Folha de Inventário...</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col">
            <div className="p-8 border-b border-slate-50 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-30 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-xl font-black text-slate-800 dark:text-slate-100 uppercase tracking-tight">Folha de Contagem</h2>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mt-1">Insira a quantidade física encontrada no depósito</p>
                </div>

                <div className="flex flex-col md:flex-row gap-4 flex-1 max-w-2xl px-1">
                    <button
                        onClick={() => setIsScannerOpen(true)}
                        className="bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 px-6 py-3 rounded-2xl font-black uppercase tracking-widest text-xs transition-all hover:scale-105 active:scale-95 flex items-center justify-center gap-2 shadow-xl shadow-slate-200 dark:shadow-none min-w-[200px]"
                    >
                        <i className="bi bi-qr-code-scan text-base" />
                        Iniciar contagem
                    </button>

                    <div className="relative flex-1 group/search">
                        <i className="bi bi-search absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within/search:text-emerald-500 transition-colors"></i>
                        <input 
                            id="inventory-search"
                            type="text" 
                            placeholder="Pesquisar..." 
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-slate-50 dark:bg-slate-950 border-none rounded-2xl text-sm outline-none focus:ring-2 focus:ring-emerald-500 transition-all dark:text-slate-200 font-bold"
                        />
                    </div>
                    
                    <button
                        onClick={handleFinalize}
                        disabled={!hasChanges || processing}
                        className="bg-emerald-600 hover:bg-emerald-700 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-widest text-xs shadow-xl shadow-emerald-200 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2 whitespace-nowrap"
                    >
                        {processing ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <i className="bi bi-check-all text-lg"></i>
                        )}
                        Finalizar
                    </button>
                </div>
            </div>

            <ErrorBoundary name="Scanner de Inventário">
                <QRScannerModal 
                    isOpen={isScannerOpen} 
                    onClose={() => setIsScannerOpen(false)} 
                    closeOnScan={false} // Allow multiple scans
                    onScan={handleScan}
                    title="Contagem por Escaneamento"
                />
            </ErrorBoundary>

            <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse whitespace-nowrap">
                    <thead>
                        <tr className="bg-slate-50 dark:bg-slate-950">
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">Item / SKU</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Saldo Sistema</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Contagem Física</th>
                            <th className="px-8 py-5 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800 text-center">Diferença</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                        {filtered.map((item) => {
                            const diff = getDiff(item.id, item.systemStock);
                            return (
                                <tr key={item.id} data-code={item.code} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors group">
                                    <td className="px-8 py-4">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 group-hover:bg-emerald-100 group-hover:text-emerald-600 transition-all shrink-0">
                                                <i className={`bi ${item.isVariation ? 'bi-stack' : 'bi-box-seam'}`}></i>
                                            </div>
                                            <div>
                                                <span className="block font-bold text-slate-700 dark:text-slate-200">{item.name}</span>
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{item.code || "Sem Código"}</span>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <span className="text-sm font-black text-slate-500">{item.systemStock} {item.unit}</span>
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        <input 
                                            type="number"
                                            value={counts[item.id] || ""}
                                            onChange={(e) => handleCountChange(item.id, e.target.value)}
                                            placeholder="--"
                                            className="w-24 px-4 py-2 bg-slate-100 dark:bg-slate-800 border-none rounded-xl text-center font-black text-emerald-600 dark:text-emerald-400 outline-none focus:ring-2 focus:ring-emerald-500"
                                        />
                                    </td>
                                    <td className="px-8 py-4 text-center">
                                        {diff !== null && (
                                            <div className={`inline-flex items-center gap-1 font-black text-xs px-3 py-1 rounded-lg ${
                                                diff === 0 ? 'text-slate-400 bg-slate-100 dark:bg-slate-800' :
                                                diff > 0 ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20' :
                                                'text-rose-600 bg-rose-50 dark:bg-rose-900/20'
                                            }`}>
                                                <i className={`bi ${diff === 0 ? 'bi-check-circle' : diff > 0 ? 'bi-plus-circle' : 'bi-dash-circle'}`}></i>
                                                {diff > 0 ? `+${diff}` : diff}
                                            </div>
                                        )}
                                        {diff === null && <span className="text-slate-300">--</span>}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {filtered.length === 0 && (
                <div className="p-20 text-center">
                    <p className="text-slate-400 font-bold">Nenhum item encontrado para contagem.</p>
                </div>
            )}
        </div>
    );
};

export default InventoryAudit;
