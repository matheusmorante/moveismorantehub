import React, { useState, useEffect, useRef } from "react";
import Product, { Variation } from "../../../types/product.type";
import Person from "../../../types/person.type";
import { subscribeToProducts } from '@/pages/utils/productService';
import { fetchPersons } from '@/pages/utils/personService';
import { getNextInventoryCode, saveInventoryMove, updateInventoryMove } from '@/pages/utils/inventoryService';
import ProductAutocomplete from "@/components/ProductAutocomplete";
import SupplierAutocomplete from "@/components/SupplierAutocomplete";
import InventoryAuditCards from "./InventoryAuditCards";
import { toast } from "react-toastify";
import InventoryMove from "../../../types/inventoryMove.type";
import { getVariationDisplayName } from "@/components/productAutocompleteUtils";
import type { InventorySnapshotItem, InventoryAuditSession } from "./InventoryAudit";

interface InventoryAuditModalProps {
    isOpen: boolean;
    onClose: () => void;
    copiedItems?: InventorySnapshotItem[] | null;
    editingSession?: InventoryAuditSession | null;
}

export interface AuditItem {
    id: string;
    key: string;
    productId: string;
    variationId?: string;
    name: string;
    supplierNames: string;
    systemStock: number;
    physicalCount: number;
    unit: string;
}

const InventoryAuditModal: React.FC<InventoryAuditModalProps> = ({ isOpen, onClose, copiedItems, editingSession }) => {
    const [allProducts, setAllProducts] = useState<Product[]>([]);
    const [suppliers, setSuppliers] = useState<Person[]>([]);
    const [selectedSupplierId, setSelectedSupplierId] = useState("");
    const [productSearch, setProductSearch] = useState("");
    const [selectedPendingProduct, setSelectedPendingProduct] = useState<{ product: Product, variation?: Variation } | null>(null);
    const [items, setItems] = useState<AuditItem[]>([]);
    const [isSaving, setIsSaving] = useState(false);
    const createItemId = () => crypto.randomUUID();
    const appliedCopyRef = useRef<string | null>(null);
    const appliedEditingRef = useRef<string | null>(null);

    useEffect(() => {
        if (!isOpen) return;
        const unsubscribe = subscribeToProducts((data) => {
            setAllProducts(data.filter((product) => product.itemType === 'product' && !product.deleted));
        }, true);
        fetchPersons('suppliers').then(setSuppliers);
        return () => unsubscribe();
    }, [isOpen]);

    useEffect(() => {
        if (isOpen) {
            if (!editingSession && !copiedItems) {
                setItems([]);
            }
            appliedCopyRef.current = null;
            appliedEditingRef.current = null;
            setSelectedSupplierId("");
            setProductSearch("");
            setSelectedPendingProduct(null);
        }
    }, [isOpen, editingSession]);

    const getProductName = (prod: Product, variation?: Variation) => {
        return getVariationDisplayName(prod, variation) || prod.description || "Produto";
    };

    const getSupplierNames = (product: Product) => {
        const supplierIds = [
            product.mainSupplierId,
            product.supplierId,
            ...(product.supplierIds || []),
        ].filter(Boolean).map(String);
        const names = supplierIds.map((supplierId) => {
            const supplier = suppliers.find((person) => String(person.id) === supplierId);
            return supplier?.tradeName || supplier?.fullName || supplier?.nickname;
        }).filter(Boolean) as string[];

        return [...new Set(names)].join(' / ') || 'Fábrica não informada';
    };

    useEffect(() => {
        if (!isOpen || !editingSession?.items?.length || !allProducts.length) return;
        if (appliedEditingRef.current === editingSession.id) return;

        setItems(editingSession.items.map((source) => {
            const product = allProducts.find((item) => String(item.id) === String(source.productId));
            const variation = product?.variations?.find((item) => String(item.id) === String(source.variationId));
            return {
                id: createItemId(),
                key: `${source.productId}-${source.variationId || 'main'}`,
                productId: source.productId,
                variationId: source.variationId,
                name: product ? getProductName(product, variation) : source.name,
                supplierNames: product ? getSupplierNames(product) : 'Fábrica não informada',
                systemStock: source.systemStock,
                physicalCount: source.physicalCount,
                unit: product?.unit || 'UN',
            };
        }));
        appliedEditingRef.current = editingSession.id;
    }, [isOpen, editingSession, allProducts, suppliers]);

    useEffect(() => {
        if (!isOpen || !copiedItems?.length || !allProducts.length) return;
        const copyKey = copiedItems.map((item) => `${item.productId}-${item.variationId || 'main'}`).join('|');
        if (appliedCopyRef.current === copyKey) return;
        setItems(copiedItems.map((source) => {
            const product = allProducts.find((item) => String(item.id) === String(source.productId));
            const variation = product?.variations?.find((item) => String(item.id) === String(source.variationId));
            return {
                id: createItemId(), key: `${source.productId}-${source.variationId || 'main'}`,
                productId: source.productId, variationId: source.variationId,
                name: product ? getProductName(product, variation) : source.name,
                supplierNames: product ? getSupplierNames(product) : 'Fábrica não informada',
                systemStock: Number(source.variationId ? variation?.stock ?? 0 : product?.stock ?? 0),
                physicalCount: source.physicalCount, unit: product?.unit || 'UN',
            };
        }));
        appliedCopyRef.current = copyKey;
    }, [isOpen, copiedItems, allProducts, suppliers]);

    if (!isOpen) return null;

    const handleAddIndividualProduct = () => {
        if (!selectedPendingProduct) return;
        const { product, variation } = selectedPendingProduct;
        const key = `${product.id}-${variation?.id || 'main'}`;
        const existingIndex = items.findIndex((item) => item.key === key);

        if (existingIndex !== -1) {
            setItems((prev) => prev.map((item, index) => index === existingIndex ? { ...item, physicalCount: item.physicalCount + 1 } : item));
            toast.info(`Quantidade de "${getProductName(product, variation)}" incrementada.`);
        } else {
            setItems((prev) => [
                {
                    id: createItemId(),
                    key,
                    productId: String(product.id),
                    variationId: variation?.id ? String(variation.id) : undefined,
                    name: getProductName(product, variation),
                    supplierNames: getSupplierNames(product),
                    systemStock: Number(variation ? variation.stock ?? 0 : product.stock ?? 0),
                    physicalCount: 0,
                    unit: product.unit || 'UN',
                },
                ...prev,
            ]);
            toast.success(`"${getProductName(product, variation)}" adicionado à lista do inventário.`);
        }

        setSelectedPendingProduct(null);
        setProductSearch("");
    };

    const handleAddSupplierProducts = (supplierId: string) => {
        if (!supplierId) return;
        const supplierProducts = allProducts.filter((product) => {
            const supplierIds = [
                product.mainSupplierId,
                product.supplierId,
                ...(product.supplierIds || []),
            ].filter(Boolean).map(String);
            return supplierIds.includes(String(supplierId));
        });

        if (supplierProducts.length === 0) {
            toast.warn("Nenhum produto vinculado a este fornecedor.");
            return;
        }

        const newItemsToAdd: AuditItem[] = [];
        for (const product of supplierProducts) {
            if (product.variations && product.variations.length > 0) {
                for (const variation of product.variations) {
                    const key = `${product.id}-${variation.id}`;
                    if (!items.some((item) => item.key === key)) {
                        newItemsToAdd.push({
                            id: createItemId(),
                            key,
                            productId: String(product.id),
                            variationId: String(variation.id),
                            name: getProductName(product, variation),
                            supplierNames: getSupplierNames(product),
                            systemStock: Number(variation.stock ?? 0),
                            physicalCount: 0,
                            unit: product.unit || 'UN',
                        });
                    }
                }
            } else {
                const key = `${product.id}-main`;
                if (!items.some((item) => item.key === key)) {
                    newItemsToAdd.push({
                        id: createItemId(),
                        key,
                        productId: String(product.id),
                        name: getProductName(product),
                        supplierNames: getSupplierNames(product),
                        systemStock: Number(product.stock ?? 0),
                        physicalCount: 0,
                        unit: product.unit || 'UN',
                    });
                }
            }
        }

        if (newItemsToAdd.length > 0) {
            setItems((prev) => [...newItemsToAdd, ...prev]);
            toast.success(`${newItemsToAdd.length} produto(s) do fornecedor adicionados! ✨`);
        }

        setSelectedSupplierId("");
    };

    const handleUpdateCount = (id: string, newCount: number) => {
        const validCount = isNaN(newCount) ? 0 : Math.max(0, newCount);
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, physicalCount: validCount } : item));
    };

    const handleIncrement = (id: string) => {
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, physicalCount: item.physicalCount + 1 } : item));
    };

    const handleDecrement = (id: string) => {
        setItems((prev) => prev.map((item) => item.id === id ? { ...item, physicalCount: Math.max(0, item.physicalCount - 1) } : item));
    };

    const handleRemoveItem = (id: string) => {
        setItems((prev) => prev.filter((item) => item.id !== id));
    };

    const handleSaveInProgress = async () => {
        if (items.length === 0) {
            onClose();
            return;
        }

        setIsSaving(true);
        try {
            const auditId = editingSession?.id || crypto.randomUUID();
            const code = editingSession?.inventoryCode || await getNextInventoryCode();
            const auditDate = editingSession?.date || new Date().toISOString();
            const auditObservation = JSON.stringify({
                inventoryAudit: true,
                inventoryCode: code,
                status: 'in_progress',
                items: items.map(({ productId, variationId, name, systemStock, physicalCount }) => ({ productId, variationId, name, systemStock, physicalCount })),
            });
            const auditMarker = items[0];

            if (editingSession?.markerMoveId) {
                await updateInventoryMove(editingSession.markerMoveId, {
                    date: auditDate,
                    observation: auditObservation,
                    label: `Inventário #${code}`
                });
            } else {
                await saveInventoryMove({
                    productId: auditMarker.productId,
                    variationId: auditMarker.variationId,
                    productDescription: 'Sessão de inventário',
                    type: 'adjustment',
                    quantity: 0,
                    date: auditDate,
                    label: `Inventário #${code}`,
                    observation: auditObservation,
                    relatedEntityId: auditId,
                }, auditMarker.systemStock);
            }

            toast.info(`Inventário #${code} salvo em andamento! ⏳`);
            onClose();
        } catch (error: any) {
            console.error("Erro ao salvar inventário em andamento:", error);
            toast.error("Erro ao salvar inventário em andamento.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleFinalize = async () => {
        if (items.length === 0) {
            toast.warn("Adicione pelo menos um produto para realizar o inventário.");
            return;
        }

        const itemsWithAdjustment = items.filter((item) => item.physicalCount !== item.systemStock);

        const confirmed = window.confirm(
            `Concluir inventário? ${items.length} item(ns) desta lista serão registrados; ${itemsWithAdjustment.length} terão ajuste de estoque alterado no saldo real.`
        );
        if (!confirmed) return;

        setIsSaving(true);
        try {
            const auditId = editingSession?.id || crypto.randomUUID();
            const code = editingSession?.inventoryCode || await getNextInventoryCode();
            const auditDate = new Date().toISOString();
            const auditObservation = JSON.stringify({
                inventoryAudit: true,
                inventoryCode: code,
                status: 'completed',
                items: items.map(({ productId, variationId, name, systemStock, physicalCount }) => ({ productId, variationId, name, systemStock, physicalCount })),
            });
            const auditMarker = items[0];

            if (editingSession?.markerMoveId) {
                await updateInventoryMove(editingSession.markerMoveId, {
                    date: auditDate,
                    observation: auditObservation,
                    label: `Inventário #${code}`
                });
            } else {
                await saveInventoryMove({
                    productId: auditMarker.productId,
                    variationId: auditMarker.variationId,
                    productDescription: 'Sessão de inventário',
                    type: 'adjustment',
                    quantity: 0,
                    date: auditDate,
                    label: `Inventário #${code}`,
                    observation: auditObservation,
                    relatedEntityId: auditId,
                }, auditMarker.systemStock);
            }

            for (const item of itemsWithAdjustment) {
                const diff = item.physicalCount - item.systemStock;
                const move: InventoryMove = {
                    productId: item.productId,
                    variationId: item.variationId,
                    productDescription: item.name,
                    type: 'adjustment',
                    quantity: diff,
                    date: auditDate,
                    label: `Ajuste lançado pelo inventário #${code}`,
                    observation: `Ajuste gerado pelo inventário #${code}`,
                    relatedEntityId: auditId,
                };

                await saveInventoryMove(move, item.systemStock);
            }

            toast.success(`Inventário #${code} concluído! ${items.length} produto(s) registrados e ${itemsWithAdjustment.length} ajuste(s) lançados no estoque. ✨`);
            onClose();
        } catch (error) {
            console.error("Erro ao salvar inventário:", error);
            toast.error("Erro ao processar as movimentações de inventário.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[999999] flex">
            <div className="absolute inset-0 bg-slate-950/60 backdrop-blur-sm animate-fade-in" onClick={handleSaveInProgress} />

            <div className="relative h-full w-full flex flex-col bg-white dark:bg-slate-900 overflow-hidden animate-slide-up">
                {/* Header Enxuto de Altura Mínima Sem Subtítulo */}
                <header className="flex shrink-0 items-center justify-between px-6 py-3.5 bg-emerald-600 text-white shadow-sm">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                            <i className="bi bi-clipboard-check text-lg" />
                        </div>
                        <h2 className="text-base font-black tracking-tight">
                            {editingSession ? `Editar Inventário #${editingSession.inventoryCode}` : 'Contagem / Inventário de Estoque'}
                        </h2>
                    </div>
                    <button
                        type="button"
                        onClick={handleSaveInProgress}
                        className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center transition-colors text-white"
                        title="Salvar e fechar"
                    >
                        <i className="bi bi-x-lg text-sm" />
                    </button>
                </header>

                <div className="flex-1 flex flex-col p-4 md:p-6 overflow-hidden max-w-7xl mx-auto w-full gap-4">
                    {/* Filtros e Adição de Produtos */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 shrink-0 bg-slate-50 dark:bg-slate-950/50 p-4 rounded-2xl border border-slate-100 dark:border-slate-800">
                        {/* 1. Selecionar por Fornecedor */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                1. Adicionar todos os produtos de um fornecedor
                            </label>
                            <SupplierAutocomplete
                                suppliers={suppliers}
                                value={selectedSupplierId}
                                onChange={(val) => {
                                    setSelectedSupplierId(val);
                                    handleAddSupplierProducts(val);
                                }}
                                placeholder="Buscar fornecedor..."
                            />
                        </div>

                        {/* 2. Selecionar por Produto Individual */}
                        <div className="flex flex-col gap-1.5">
                            <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">
                                2. Adicionar produto individual
                            </label>
                            <div className="flex gap-2">
                                <div className="flex-1">
                                    <ProductAutocomplete
                                        products={allProducts}
                                        value={productSearch}
                                        onChange={(e) => setProductSearch(e.target.value)}
                                        onSelectProduct={(product, variation) => {
                                            setSelectedPendingProduct({ product, variation });
                                            setProductSearch(getVariationDisplayName(product, variation));
                                        }}
                                        placeholder="Buscar por nome, SKU ou código..."
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={handleAddIndividualProduct}
                                    disabled={!selectedPendingProduct}
                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 dark:disabled:bg-slate-800 text-white text-xs font-bold rounded-xl transition-colors shrink-0 flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
                                >
                                    <i className="bi bi-plus-lg" />
                                    <span>Adicionar</span>
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Lista de Itens do Inventário */}
                    <div className="flex-1 flex flex-col bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm">
                        <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 flex items-center justify-between">
                            <h3 className="text-xs font-black uppercase tracking-widest text-slate-700 dark:text-slate-200 flex items-center gap-2">
                                <i className="bi bi-list-check text-blue-600" />
                                Lista de Contagem Física ({items.length})
                            </h3>
                            {items.length > 0 && (
                                <button
                                    type="button"
                                    onClick={() => setItems([])}
                                    className="text-[10px] font-bold text-rose-500 hover:text-rose-600 cursor-pointer"
                                >
                                    Limpar lista
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-y-auto">
                            {items.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center p-8 text-center text-slate-400">
                                    <i className="bi bi-box-seam text-4xl mb-2 text-slate-300 dark:text-slate-700" />
                                    <p className="text-xs font-bold">Nenhum produto adicionado à lista de inventário.</p>
                                    <p className="text-[10px] mt-1">Utilize os campos acima para adicionar produtos por fornecedor ou individualmente.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Exibição em Cards no Mobile */}
                                    <InventoryAuditCards
                                        items={items}
                                        onUpdateCount={handleUpdateCount}
                                        onIncrement={handleIncrement}
                                        onDecrement={handleDecrement}
                                        onRemoveItem={handleRemoveItem}
                                    />

                                    {/* Exibição em Tabela em Telas Maiores */}
                                    <table className="hidden md:table w-full text-left border-collapse">
                                        <thead>
                                            <tr className="bg-slate-50/80 dark:bg-slate-950/50 text-[10px] font-black uppercase tracking-widest text-slate-400 border-b border-slate-100 dark:border-slate-800">
                                                <th className="px-4 py-3">Produto / Variação</th>
                                                <th className="px-4 py-3">Fornecedor</th>
                                                <th className="px-4 py-3 text-center">Saldo Atual</th>
                                                <th className="px-4 py-3 text-center w-48">Contagem Física</th>
                                                <th className="px-4 py-3 text-center">Ajuste</th>
                                                <th className="px-4 py-3 text-right">Ações</th>
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs">
                                            {items.map((item) => {
                                                const diff = item.physicalCount - item.systemStock;
                                                return (
                                                    <tr key={item.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                                                        <td className="px-4 py-3 font-bold text-slate-800 dark:text-slate-200">
                                                            {item.name}
                                                        </td>
                                                        <td className="px-4 py-3 text-slate-500 font-medium truncate max-w-[200px]" title={item.supplierNames}>
                                                            {item.supplierNames}
                                                        </td>
                                                        <td className="px-4 py-3 text-center font-mono text-slate-600 dark:text-slate-400">
                                                            {item.systemStock} {item.unit}
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <div className="flex items-center justify-center gap-1.5">
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleDecrement(item.id)}
                                                                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                                                >
                                                                    -
                                                                </button>
                                                                <input
                                                                    type="number"
                                                                    min="0"
                                                                    value={item.physicalCount}
                                                                    onChange={(e) => handleUpdateCount(item.id, parseInt(e.target.value, 10))}
                                                                    className="w-16 text-center font-bold font-mono py-1 border border-slate-200 dark:border-slate-700 rounded-lg outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-100"
                                                                />
                                                                <button
                                                                    type="button"
                                                                    onClick={() => handleIncrement(item.id)}
                                                                    className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-600 dark:text-slate-300 font-bold flex items-center justify-center cursor-pointer transition-colors"
                                                                >
                                                                    +
                                                                </button>
                                                            </div>
                                                        </td>
                                                        <td className="px-4 py-3 text-center">
                                                            <span className={`inline-block px-2 py-0.5 rounded-md font-mono font-bold text-[11px] ${
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
                                                                onClick={() => handleRemoveItem(item.id)}
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
                                </>
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
                                onClick={handleSaveInProgress}
                                disabled={isSaving || items.length === 0}
                                className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl border border-amber-300 dark:border-amber-700 bg-amber-500 hover:bg-amber-600 text-xs font-bold text-white shadow-sm transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                                title="Salva o inventário em andamento sem alterar o saldo do estoque no banco"
                            >
                                <i className="bi bi-clock-history text-sm" />
                                <span>Salvar Em Andamento</span>
                            </button>
                            <button
                                type="button"
                                onClick={handleFinalize}
                                disabled={isSaving || items.length === 0}
                                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-xs font-black uppercase tracking-wider text-white shadow-lg shadow-emerald-200/50 dark:shadow-none transition-all active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-1.5"
                                title="Conclui o inventário e lança as movimentações de ajuste no estoque real"
                            >
                                {isSaving ? (
                                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <i className="bi bi-check2 text-sm" />
                                        <span>Concluir Inventário</span>
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
