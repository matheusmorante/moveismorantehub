import React, { useState, useEffect } from "react";
import Product, { Variation } from "../../../types/product.type";
import Person from "../../../types/person.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { fetchPersons } from '@/pages/utils/personService';
import { saveInventoryMove } from '@/pages/utils/inventoryService';
import ProductAutocomplete from "@/components/ProductAutocomplete";
import SupplierAutocomplete from "@/components/SupplierAutocomplete";
import { toast } from "react-toastify";
import InventoryMove from "../../../types/inventoryMove.type";

interface InventoryAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export interface AuditItem {
    key: string;
    productId: string;
    variationId?: string;
    name: string;
    code?: string;
    systemStock: number;
    physicalCount: number;
    unit: string;
}

const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({ isOpen, onClose }) => {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [selectedPendingProduct, setSelectedPendingProduct] = useState<{ product: Product, variation?: Variation } | null>(null);
    const [items, setItems] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToProducts((data) => {
            setAllProducts(data.filter(p => p.itemType === 'product' && !p.deleted));
        });
        fetchPersons('suppliers').then(setSuppliers);
        return () => unsubscribe();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            setItems([]);
            setSelectedSupplierId("");
            setProductSearch("");
            setSelectedPendingProduct(null);
        }
    }, [isOpen]);

    if (!isOpen) return null;

    const getProductName = (prod: Product, variation?: Variation) => {
        const baseName = prod.name || prod.title || prod.description || "Produto";
        if (variation?.name) {
            if (variation.name.toLowerCase().includes(baseName.toLowerCase())) {
                return variation.name;
            }
            return `${baseName} (${variation.name})`;
        }
        return baseName;
    };

    const addProductToAudit = (product: Product, variation?: Variation) => {
        const targetVarId = variation?.id;
        const itemKey = `${product.id}-${targetVarId || 'main'}`;

        const exists = items.some(item => item.key === itemKey);
        if (exists) {
            toast.warn(`O produto "${getProductName(product, variation)}" já está na lista do inventário.`);
            setProductSearch("");
            setSelectedPendingProduct(null);
            return;
        }

        const systemStock = Number(targetVarId ? (variation?.stock ?? 0) : (product.stock ?? 0));
        const newItem: AuditItem = {
            key: itemKey,
            productId: product.id!,
            variationId: targetVarId,
            name: getProductName(product, variation),
            code: variation?.sku || product.code,
            systemStock,
            physicalCount: systemStock,
            unit: product.unit || 'UN'
        };

        setItems(prev => [newItem, ...prev]);
        setProductSearch("");
        setSelectedPendingProduct(null);
        toast.success(`"${newItem.name}" adicionado à lista.`);
    };

    const handleSelectProductFromAutocomplete = (product: Product, variation?: Variation) => {
        setSelectedPendingProduct({ product, variation });
        setProductSearch(getProductName(product, variation));
        addProductToAudit(product, variation);
    };

    const handleAddProductButtonClick = () => {
        if (selectedPendingProduct) {
            addProductToAudit(selectedPendingProduct.product, selectedPendingProduct.variation);
        } else if (productSearch.trim()) {
            const found = allProducts.find(p => 
                (p.name && p.name.toLowerCase().includes(productSearch.toLowerCase())) ||
                (p.code && p.code.toLowerCase().includes(productSearch.toLowerCase()))
            );
            if (found) {
                addProductToAudit(found);
            } else {
                toast.info("Selecione um produto sugerido na lista para adicionar.");
            }
        } else {
            toast.info("Digite o nome ou código do produto para adicionar.");
        }
    };

    const handleAddSupplierBatch = () => {
        if (!selectedSupplierId || !selectedSupplierId.trim()) {
            toast.info("Selecione ou digite o nome de um fornecedor para adicionar seus produtos.");
            return;
        }

        let supplier = suppliers.find(s => String(s.id) === String(selectedSupplierId));
        if (!supplier) {
            const norm = selectedSupplierId.trim().toLowerCase();
            supplier = suppliers.find(s => 
                (s.fullName || '').trim().toLowerCase() === norm ||
                (s.tradeName || '').trim().toLowerCase() === norm ||
                (s.nickname || '').trim().toLowerCase() === norm
            );
        }

        const supplierName = (supplier?.fullName || supplier?.tradeName || supplier?.nickname || selectedSupplierId || "").trim().toLowerCase();
        const supplierIdStr = supplier?.id ? String(supplier.id) : String(selectedSupplierId);

        // Busca produtos vinculados por ID, por brand, por supplierName ou pelo nome/descrição do produto
        const matchingProducts = allProducts.filter(p => {
            const pSupplierId = p.supplierId ? String(p.supplierId) : '';
            const pSupplierIdDB = (p as any).supplier_id ? String((p as any).supplier_id) : '';
            const pSupplierIds = Array.isArray(p.supplierIds) ? p.supplierIds.map(String) : [];
            const pSupplierIdsDB = Array.isArray((p as any).supplier_ids) ? (p as any).supplier_ids.map(String) : [];

            // 1. Vínculo direto por ID
            if (supplierIdStr && (pSupplierId === supplierIdStr || pSupplierIdDB === supplierIdStr || pSupplierIds.includes(supplierIdStr) || pSupplierIdsDB.includes(supplierIdStr))) {
                return true;
            }

            // 2. Vínculo por brand ou supplierName
            if (supplierName) {
                const pBrand = (p.brand || '').trim().toLowerCase();
                const pSupName = ((p as any).supplierName || (p as any).supplier_name || '').trim().toLowerCase();
                if (pBrand && (pBrand === supplierName || supplierName.includes(pBrand))) return true;
                if (pSupName && (pSupName === supplierName || supplierName.includes(pSupName))) return true;

                // 3. Reconhecimento inteligente do fornecedor no nome ou descrição do produto
                const prodName = (p.name || p.title || '').toLowerCase();
                const prodDesc = (p.description || '').slice(0, 150).toLowerCase();
                
                if (supplierName.length >= 3) {
                    if (prodName.includes(supplierName) || prodDesc.includes(supplierName)) {
                        return true;
                    }
                } else if (supplierName.length > 0) {
                    const regex = new RegExp(`\\b${supplierName}\\b`, 'i');
                    if (regex.test(prodName) || regex.test(prodDesc)) {
                        return true;
                    }
                }
            }

            return false;
        });

        if (matchingProducts.length === 0) {
            toast.info(`Nenhum produto encontrado para o fornecedor "${supplier?.fullName || selectedSupplierId}".`);
            return;
        }

        const newItemsToAdd: AuditItem[] = [];
        const alreadyInList: string[] = [];

        matchingProducts.forEach(p => {
            if (p.hasVariations && p.variations && p.variations.length > 0) {
                p.variations.forEach(v => {
                    const itemKey = `${p.id}-${v.id}`;
                    if (items.some(it => it.key === itemKey)) {
                        alreadyInList.push(getProductName(p, v));
                    } else {
                        const vStock = Number(v.stock ?? 0);
                        newItemsToAdd.push({
                            key: itemKey,
                            productId: p.id!,
                            variationId: v.id,
                            name: getProductName(p, v),
                            code: v.sku || p.code,
                            systemStock: vStock,
                            physicalCount: vStock,
                            unit: p.unit || 'UN'
                        });
                    }
                });
            } else {
                const itemKey = `${p.id}-main`;
                if (items.some(it => it.key === itemKey)) {
                    alreadyInList.push(getProductName(p));
                } else {
                    const pStock = Number(p.stock ?? 0);
                    newItemsToAdd.push({
                        key: itemKey,
                        productId: p.id!,
                        variationId: undefined,
                        name: getProductName(p),
                        code: p.code,
                        systemStock: pStock,
                        physicalCount: pStock,
                        unit: p.unit || 'UN'
                    });
                }
            }
        });

        if (alreadyInList.length > 0) {
            toast.warn(`${alreadyInList.length} produto(s) deste fornecedor já estavam na lista e não foram duplicados.`);
        }

        if (newItemsToAdd.length > 0) {
            setItems(prev => [...newItemsToAdd, ...prev]);
            toast.success(`${newItemsToAdd.length} produto(s) do fornecedor adicionados! ✨`);
        }

        setSelectedSupplierId("");
    };

    const handleUpdateCount = (key: string, newCount: number) => {
        const validCount = isNaN(newCount) ? 0 : Math.max(0, newCount);
        setItems(prev => prev.map(item => item.key === key ? { ...item, physicalCount: validCount } : item));
    };

    const handleIncrement = (key: string) => {
        setItems(prev => prev.map(item => item.key === key ? { ...item, physicalCount: item.physicalCount + 1 } : item));
    };

    const handleDecrement = (key: string) => {
        setItems(prev => prev.map(item => item.key === key ? { ...item, physicalCount: Math.max(0, item.physicalCount - 1) } : item));
    };

    const handleRemoveItem = (key: string) => {
        setItems(prev => prev.filter(item => item.key !== key));
    };

    const handleFinalize = async () => {
        if (items.length === 0) {
            toast.warn("Adicione pelo menos um produto para realizar o inventário.");
            return;
        }

        const itemsWithAdjustment = items.filter(item => item.physicalCount !== item.systemStock);
        
        if (itemsWithAdjustment.length === 0) {
            toast.success("Contagem conferida! Todos os produtos estavam em conformidade com o estoque.");
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            for (const item of itemsWithAdjustment) {
                const diff = item.physicalCount - item.systemStock;
                const move: InventoryMove = {
                    productId: item.productId,
                    variationId: item.variationId,
                    productDescription: item.name,
                    type: 'adjustment',
                    quantity: diff,
                    date: new Date().toISOString(),
                    label: 'Inventário',
                    observation: 'Inventário'
                };

                await saveInventoryMove(move, item.systemStock);
            }

            toast.success(`Inventário finalizado! ${itemsWithAdjustment.length} ajuste(s) lançado(s) nas movimentações. ✨`);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar inventário:", error);
            toast.error("Erro ao processar as movimentações de inventário.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />

            <div className="relative w-full max-w-5xl max-h-[92vh] flex flex-col bg-white dark:bg-slate-900 rounded-3xl shadow-2xl overflow-hidden animate-slide-up border border-slate-100 dark:border-slate-800">
                {/* Header Enxuto de Altura Mínima Sem Subtítulo */}
                <header className="flex shrink-0 items-center justify-between px-6 py-3.5 bg-emerald-600 text-white shadow-sm">
                    <div className="flex items-center gap-2.5">
                        <i className="bi bi-journal-check text-lg" />
                        <h2 className="text-sm sm:text-base font-black uppercase tracking-wider">Novo Inventário</h2>
                    </div>
                    <button 
                        type="button" 
                        onClick={onClose} 
                        className="rounded-lg p-1.5 transition-colors hover:bg-white/10 cursor-pointer"
                        title="Fechar modal"
                    >
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </header>

                {/* Corpo do Modal */}
                <div className="flex-1 flex flex-col min-h-0 p-5 space-y-4 overflow-hidden">
                    {/* Topo Organizado: 65% Produto Individual / 35% Fornecedor (Lote) */}
                    <div className="flex flex-col md:flex-row gap-4 shrink-0">
                        {/* 1. Adicionar Produto Individual (65%) */}
                        <div className="w-full md:w-[65%] bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-600 flex items-center justify-center text-[10px] font-black">1</span>
                                    <span>Adicionar Produto Individual</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <ProductAutocomplete
                                        value={productSearch}
                                        onChange={(val) => {
                                            setProductSearch(val);
                                            if (!val) setSelectedPendingProduct(null);
                                        }}
                                        onSelect={handleSelectProductFromAutocomplete}
                                        placeholder="Buscar produto..."
                                        onlyName={true}
                                        className="w-full"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddProductButtonClick}
                                    className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm shadow-emerald-200 dark:shadow-none flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Adicionar produto"
                                >
                                    <i className="bi bi-plus-lg" />
                                </button>
                            </div>
                        </div>

                        {/* 2. Adicionar por Fornecedor (35%) */}
                        <div className="w-full md:w-[35%] bg-slate-50 dark:bg-slate-950 p-3.5 sm:p-4 rounded-2xl border border-slate-100 dark:border-slate-800 flex flex-col justify-between gap-2.5 shadow-sm">
                            <div className="flex items-center justify-between">
                                <label className="text-[11px] font-black uppercase tracking-wider text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center text-[10px] font-black">2</span>
                                    <span>Adicionar por Fornecedor (Lote)</span>
                                </label>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 min-w-0">
                                    <SupplierAutocomplete
                                        suppliers={suppliers}
                                        selectedSupplierId={selectedSupplierId}
                                        onSelect={setSelectedSupplierId}
                                        hideLabel={true}
                                        placeholder="Selecione o fornecedor..."
                                        inputClassName="w-full h-10 rounded-xl border border-slate-200 bg-white dark:bg-slate-900 px-3.5 text-xs font-bold outline-none focus:border-blue-500 dark:border-slate-700 dark:text-white"
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddSupplierBatch}
                                    className="w-10 h-10 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-black transition-all active:scale-95 shadow-sm shadow-blue-200 dark:shadow-none flex items-center justify-center shrink-0 cursor-pointer"
                                    title="Adicionar produtos do fornecedor"
                                >
                                    <i className="bi bi-plus-lg" />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Tabela de Produtos no Inventário */}
                    <div className="flex-1 flex flex-col min-h-0 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden bg-white dark:bg-slate-900">
                        <div className="overflow-x-auto overflow-y-auto flex-1 custom-scrollbar">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-12 text-center text-slate-400">
                                    <i className="bi bi-box-seam text-4xl mb-2 text-slate-300 dark:text-slate-700" />
                                    <p className="text-sm font-bold text-slate-600 dark:text-slate-300">Nenhum produto adicionado ao inventário</p>
                                    <p className="text-xs text-slate-400 mt-1 max-w-sm">
                                        Use os campos acima para adicionar produtos individuais ou selecione um fornecedor para trazer todos os produtos de uma só vez.
                                    </p>
                                </div>
                            ) : (
                                <table className="w-full text-left border-collapse whitespace-nowrap">
                                    <thead className="bg-slate-50 dark:bg-slate-955 sticky top-0 z-10 border-b border-slate-100 dark:border-slate-800">
                                        <tr>
                                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto</th>
                                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Estoque Atual</th>
                                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center w-52">Contagem Física</th>
                                            <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Ajuste Resultante</th>
                                            <th className="px-4 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ação</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50 dark:divide-slate-800/50 text-xs">
                                        {items.map((item) => {
                                            const diff = item.physicalCount - item.systemStock;
                                            return (
                                                <tr key={item.key} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/30 transition-colors">
                                                    <td className="px-5 py-3">
                                                        <div className="flex flex-col">
                                                            <span className="font-bold text-slate-800 dark:text-slate-200">
                                                                {item.name}
                                                            </span>
                                                            {item.code && (
                                                                <span className="text-[10px] font-mono text-slate-400">
                                                                    SKU / Cód: {item.code}
                                                                </span>
                                                            )}
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-center font-bold text-slate-500">
                                                        {item.systemStock} {item.unit}
                                                    </td>
                                                    <td className="px-5 py-3">
                                                        <div className="flex items-center justify-center gap-1.5">
                                                            <button
                                                                type="button"
                                                                onClick={() => handleDecrement(item.key)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm transition-all active:scale-90 cursor-pointer"
                                                                title="Descontar 1"
                                                            >
                                                                -
                                                            </button>
                                                            <input
                                                                type="number"
                                                                min="0"
                                                                value={item.physicalCount}
                                                                onChange={(e) => handleUpdateCount(item.key, parseInt(e.target.value, 10))}
                                                                className="w-20 text-center font-black text-xs py-1 px-2 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-950 text-slate-800 dark:text-white outline-none focus:border-emerald-500 transition-colors"
                                                            />
                                                            <button
                                                                type="button"
                                                                onClick={() => handleIncrement(item.key)}
                                                                className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 font-black text-sm transition-all active:scale-90 cursor-pointer"
                                                                title="Acrescentar 1"
                                                            >
                                                                +
                                                            </button>
                                                        </div>
                                                    </td>
                                                    <td className="px-5 py-3 text-center">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                                            diff > 0 
                                                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' 
                                                                : diff < 0 
                                                                ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' 
                                                                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                                                        }`}>
                                                            {diff > 0 ? `+${diff}` : diff} {item.unit}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 text-right">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleRemoveItem(item.key)}
                                                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors cursor-pointer"
                                                            title="Remover da lista"
                                                        >
                                                            <i className="bi bi-trash text-xs" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            )}
                        </div>
                    </div>

                    {/* Rodapé com Contador e Botões */}
                    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 shrink-0">
                        <div className="text-xs text-slate-500 font-medium">
                            Total de itens na lista: <strong className="font-black text-slate-700 dark:text-slate-200">{items.length}</strong>
                        </div>
                        <div className="flex items-center gap-2 w-full sm:w-auto">
                            <button
                                type="button"
                                onClick={onClose}
                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                            >
                                Cancelar
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalize}
                                disabled={isSaving || items.length === 0}
                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <i className="bi bi-check2 text-sm" />
                                        <span>Finalizar Inventário</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default InventoryAuditModal;
