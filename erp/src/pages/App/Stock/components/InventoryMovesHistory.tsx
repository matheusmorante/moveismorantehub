import React, { useState, useEffect, useMemo } from "react";
import InventoryMove from "../../../types/inventoryMove.type";
import Product, { Variation } from "../../../types/product.type";
import { subscribeToInventoryMoves, deleteInventoryMove } from '@/pages/utils/inventoryService';
import { formatDateTime } from "../../../utils/formatters";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import { toast } from "react-toastify";
import InventoryMoveDeleteModal from './InventoryMoveDeleteModal';
import InventoryMoveEditModal from './InventoryMoveEditModal';

interface InventoryMovesHistoryProps {
    selectedProduct?: Product | null;
    selectedVariation?: Variation;
    onSelectProduct?: (product: Product | null, variation?: Variation) => void;
}

const InventoryMovesHistory = ({
    selectedProduct: externalSelectedProduct,
    selectedVariation: externalSelectedVariation,
    onSelectProduct: externalOnSelectProduct
}: InventoryMovesHistoryProps) => {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [internalProduct, setInternalProduct] = useState<Product | null>(null);
    const [internalVariation, setInternalVariation] = useState<Variation | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [moveToDelete, setMoveToDelete] = useState<InventoryMove | null>(null);
    const [editingMove, setEditingMove] = useState<InventoryMove | null>(null);
    const [openMenuId, setOpenMenuId] = useState<string | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    const selectedProduct = externalSelectedProduct !== undefined ? externalSelectedProduct : internalProduct;
    const selectedVariation = externalSelectedVariation !== undefined ? externalSelectedVariation : internalVariation;

    useEffect(() => {
        const unsubscribe = subscribeToInventoryMoves((data) => {
            setMoves(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    useEffect(() => {
        const handleDocClick = () => setOpenMenuId(null);
        document.addEventListener('click', handleDocClick);
        return () => document.removeEventListener('click', handleDocClick);
    }, []);

    const getDisplayName = (prod: Product, variation?: Variation) => {
        if (variation?.name) return variation.name;
        return prod.name || prod.title || prod.description || "Produto";
    };

    const handleSelectProduct = (product: Product, variation?: Variation) => {
        try {
            localStorage.setItem('morante_stock_selected_product_filter', JSON.stringify({ product, variation }));
        } catch (e) {
            console.error("Erro ao salvar produto no localStorage:", e);
        }

        if (externalOnSelectProduct) {
            externalOnSelectProduct(product, variation);
        } else {
            setInternalProduct(product);
            setInternalVariation(variation);
        }
        const name = getDisplayName(product, variation);
        setSearchQuery(name);
    };

    const handleClearSelection = () => {
        try {
            localStorage.removeItem('morante_stock_selected_product_filter');
        } catch (e) {
            console.error("Erro ao remover produto do localStorage:", e);
        }

        if (externalOnSelectProduct) {
            externalOnSelectProduct(null, undefined);
        } else {
            setInternalProduct(null);
            setInternalVariation(undefined);
        }
        setSearchQuery("");
    };

    const currentStock = useMemo(() => {
        if (!selectedProduct) return 0;

        // Calcula dinamicamente: Saldo = Entradas - Saídas + Ajustes
        const relevantMoves = moves.filter(m => {
            if (m.status === 'cancelled') return false;
            if (m.productId !== selectedProduct.id) return false;
            if (selectedVariation && m.variationId) {
                return String(m.variationId) === String(selectedVariation.id);
            }
            return true;
        });

        if (relevantMoves.length > 0) {
            return relevantMoves.reduce((acc, m) => {
                if (m.type === 'entry') return acc + Number(m.quantity || 0);
                if (m.type === 'withdrawal') return acc - Number(m.quantity || 0);
                if (m.type === 'balance' || (m.type as any) === 'adjustment') return acc + Number(m.quantity || 0);
                return acc;
            }, 0);
        }

        if (selectedVariation !== undefined) {
            return Number(selectedVariation.stock || 0);
        }
        return Number(selectedProduct.stock || 0);
    }, [selectedProduct, selectedVariation, moves]);

    const filtered = useMemo(() => {
        // Se NENHUM produto estiver selecionado, não exibe movimentações
        if (!selectedProduct) return [];

        return moves.filter(m => {
            if (m.productId !== selectedProduct.id) return false;
            if (selectedVariation && m.variationId) {
                return String(m.variationId) === String(selectedVariation.id);
            }
            return true;
        });
    }, [moves, selectedProduct, selectedVariation]);

    const isPurchaseEntry = (move: InventoryMove) => move.relatedEntityType === 'purchase_order' || /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(move.label || '');
    const isOrderLinked = (move: InventoryMove) => move.relatedEntityType === 'sales_order' || isPurchaseEntry(move);
    const getCleanObservation = (move: InventoryMove) => {
        // 1. Se for pedido de venda
        if (move.relatedEntityType === 'sales_order' || /^Saída - Pedido\s*#/i.test(move.label || '') || /^Pedido\s*#/i.test(move.label || '')) {
            const rawId = move.relatedEntityId || move.label?.replace(/^(Saída - )?Pedido\s*#/i, '') || '';
            const orderNum = rawId.replace(/[^0-9]/g, '') || rawId;
            return `Pedido de venda #${orderNum}`.trim();
        }

        // 2. Se for pedido de compra ou entrada de pedido
        if (move.relatedEntityType === 'purchase_order' || /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(move.label || '') || /Pedido de Compra\s*#/i.test(move.observation || '')) {
            const match = (move.observation || move.label || '').match(/Pedido (?:de Compra )?#(\d+)/i);
            if (match && match[1]) {
                return `Pedido de compra #${match[1]}`.trim();
            }
            const cleanText = (move.observation || move.label || '')
                .replace(/\|\s*Fornecedor:[^|]+/gi, '')
                .replace(/Fornecedor:[^|]+/gi, '')
                .replace(/\|\s*Data do pedido:[^|]+/gi, '')
                .replace(/\|\s*Data:[^|]+/gi, '')
                .trim();
            return cleanText || 'Pedido de compra';
        }

        // 3. Se for estoque inicial
        if (move.label === 'ESTOQUE INICIAL') {
            return 'Estoque Inicial';
        }

        // 4. Se for observação/motivo avulso
        let text = move.observation || move.label || '';
        if (!text) return '';

        text = text
            .replace(/\|\s*Fornecedor:[^|]+/gi, '')
            .replace(/Fornecedor:[^|]+/gi, '')
            .replace(/\|\s*Data do pedido:[^|]+/gi, '')
            .replace(/\|\s*Data:[^|]+/gi, '')
            .trim()
            .replace(/\|\s*$/, '')
            .trim();

        return text;
    };

    const handleDelete = (move: InventoryMove) => {
        if (isOrderLinked(move)) {
            toast.warning("Esta movimentação pertence a um pedido e não pode ser excluída manualmente.");
            return;
        }
        setMoveToDelete(move);
    };

    const confirmDelete = async () => {
        if (!moveToDelete?.id) return;
        setIsDeleting(true);
        try {
            await deleteInventoryMove(moveToDelete.id);
            toast.success('Movimentação excluída com sucesso!');
            setMoveToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Erro ao excluir lançamento.");
        } finally { setIsDeleting(false); }
    };

    if (loading) {
        return (
            <div className="p-20 flex flex-col items-center justify-center">
                <div className="w-12 h-12 border-4 border-blue-600/30 border-t-blue-600 rounded-full animate-spin mb-4" />
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Carregando Histórico...</p>
            </div>
        );
    }

    const formatMoveLabel = (move: InventoryMove) => {
        if (move.label === 'ESTOQUE INICIAL') return 'Ajuste Inicial';
        if (move.relatedEntityType === 'purchase_order' || move.label?.startsWith('Entrada do Pedido')) {
            if (move.label?.startsWith('Entrada NF-')) return move.label;
            
            let supplierName = '';
            if (move.observation) {
                const match = move.observation.match(/Fornecedor:\s*([^|]+)/i);
                if (match && match[1]) {
                    supplierName = match[1].trim();
                }
            }
            
            const dateStr = formatToBRDate(move.date);
            if (supplierName && supplierName !== 'Desconhecido') {
                return `Entrada do Pedido da ${supplierName} (${dateStr})`;
            }
            if (move.label && !move.label.includes('-') && !move.label.includes('nº')) {
                return move.label.replace(/,\s*\)/g, ')');
            }
            if (move.relatedEntityId) {
                return `Entrada do Pedido #${move.relatedEntityId.slice(-4)} (${dateStr})`;
            }
        }
        return move.label || 'Manual';
    };

    return (
        <div className="flex flex-col">
            {/* Barra Superior: Busca de Produto / Rótulo Selecionado e Saldo de Estoque */}
            <div className="p-3 sm:p-3.5 border-b border-slate-100 dark:border-slate-800/80 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md sticky top-0 z-35 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex-1 max-w-xl flex items-center gap-2">
                    {selectedProduct ? (
                        <div className="flex-1 flex items-center justify-between gap-2 px-3 py-1.5 bg-emerald-50/70 dark:bg-emerald-950/30 border border-emerald-500/60 dark:border-emerald-500/50 rounded-xl min-h-[42px] transition-all shadow-2xs">
                            <div className="flex items-center gap-2 min-w-0">
                                <div className="w-6 h-6 rounded-lg bg-emerald-100 dark:bg-emerald-900/50 text-emerald-600 dark:text-emerald-300 flex items-center justify-center shrink-0">
                                    <i className="bi bi-box-seam text-xs" />
                                </div>
                                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-100 truncate">
                                    {getDisplayName(selectedProduct, selectedVariation)}
                                </span>
                            </div>
                            <button
                                type="button"
                                onClick={handleClearSelection}
                                className="p-1 hover:bg-emerald-200/60 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 rounded-md transition-all shrink-0 cursor-pointer"
                                title="Desmarcar produto"
                            >
                                <i className="bi bi-x-lg text-xs" />
                            </button>
                        </div>
                    ) : (
                        <div className="relative flex-1">
                            <ProductAutocomplete
                                value={searchQuery}
                                onChange={(val) => {
                                    setSearchQuery(val);
                                    if (!val) {
                                        handleClearSelection();
                                    }
                                }}
                                onSelect={handleSelectProduct}
                                placeholder="Buscar produto..."
                                className="w-full"
                            />
                        </div>
                    )}
                </div>

                {/* Saldo do Estoque quando houver produto selecionado */}
                {selectedProduct && (
                    <div className="flex items-center gap-2 self-start md:self-center flex-wrap shrink-0">
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200/50 dark:shadow-none">
                            <i className="bi bi-stack text-emerald-200 text-sm" />
                            <span>Saldo em Estoque: <strong className="font-black text-sm text-white">{currentStock} un</strong></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Listagem de Movimentações */}
            {filtered.length > 0 ? (
                <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-230px)] custom-scrollbar border border-slate-100 dark:border-slate-800/50 rounded-2xl m-3 mt-3 sm:m-4 sm:mt-4">
                    <table className="w-full text-left border-collapse whitespace-nowrap">
                        <thead>
                            <tr className="bg-slate-50/50 dark:bg-slate-955/50 border-b border-slate-100 dark:border-slate-800/50">
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Data e Horário</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Produto e Detalhes</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400">Tipo</th>
                                <th className="px-5 py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 text-center">Qtd.</th>
                                <th className="px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-400 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800/40">
                            {filtered.map((move) => (
                                <tr key={move.id} className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors ${
                                    move.status === 'cancelled' ? 'opacity-40 bg-slate-50/40 dark:bg-slate-950/40' : ''
                                }`}>
                                    <td className="px-5 py-3.5 text-xs font-semibold text-slate-500 dark:text-slate-400 whitespace-nowrap">
                                        {formatDateTime(move.date)}
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <div className="flex flex-col gap-0.5 max-w-xl">
                                            <span className="font-bold text-slate-800 dark:text-slate-200 text-xs">
                                                {move.productName || move.productDescription || 'Produto Desconhecido'}
                                            </span>

                                            {/* Observação / Vínculo exclusivo e limpo embaixo */}
                                            {getCleanObservation(move) && (
                                                <span className="text-[10px] font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1.5 mt-0.5">
                                                    <i className="bi bi-chat-left-text text-[9px] text-slate-400"></i>
                                                    {getCleanObservation(move)}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-5 py-3.5">
                                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                                            move.status === 'cancelled' 
                                                ? 'bg-slate-100 text-slate-400 dark:bg-slate-800/40 dark:text-slate-500' 
                                                : move.type === 'entry' 
                                                ? 'bg-emerald-100/50 text-emerald-600 dark:bg-emerald-955/20 dark:text-emerald-400' 
                                                : move.type === 'withdrawal' || move.type === 'exit'
                                                ? 'bg-rose-100/50 text-rose-600 dark:bg-rose-955/20 dark:text-rose-400' 
                                                : 'bg-amber-500/15 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400 border border-amber-500/20'
                                        }`}>
                                            {move.type === 'entry' ? (
                                                <><i className="bi bi-box-arrow-up text-xs"></i> Entrada</>
                                            ) : move.type === 'withdrawal' || move.type === 'exit' ? (
                                                <><i className="bi bi-box-arrow-down text-xs"></i> Saída</>
                                            ) : (
                                                <><span className="inline-flex items-center gap-0.5"><i className="bi bi-box-seam text-xs"></i><i className="bi bi-wrench text-[9px]"></i></span> Ajuste</>
                                            )}
                                        </span>
                                    </td>
                                    <td className={`px-5 py-3.5 font-black text-xs text-center ${
                                        move.type === 'entry' ? 'text-emerald-600 dark:text-emerald-400' :
                                        move.type === 'withdrawal' || move.type === 'exit' ? 'text-rose-600 dark:text-rose-400' :
                                        'text-amber-600 dark:text-amber-400'
                                    }`}>
                                        {move.type === 'withdrawal' || move.type === 'exit'
                                            ? `-${Math.abs(move.quantity)}` 
                                            : move.type === 'entry' 
                                            ? `+${move.quantity}` 
                                            : (Number(move.quantity) > 0 ? `+${move.quantity}` : move.quantity)}
                                    </td>
                                    <td className="px-6 py-4 text-right relative">
                                        {move.status === 'cancelled' ? (
                                            <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest select-none">Cancelado</span>
                                        ) : isOrderLinked(move) ? (
                                            <span className="inline-flex rounded-xl p-2 text-slate-300 dark:text-slate-600" title="Movimentação vinculada ao pedido: ações manuais bloqueadas">
                                                <i className="bi bi-lock-fill"></i>
                                            </span>
                                        ) : (
                                            <div className="relative inline-block text-left" onClick={(e) => e.stopPropagation()}>
                                                <button 
                                                    type="button"
                                                    onClick={() => setOpenMenuId(openMenuId === move.id ? null : move.id)}
                                                    className="p-2 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-all cursor-pointer"
                                                    title="Mais Ações"
                                                >
                                                    <i className="bi bi-three-dots-vertical text-sm"></i>
                                                </button>

                                                {openMenuId === move.id && (
                                                    <div className="absolute right-0 mt-1 w-36 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800 py-1.5 z-30 animate-in fade-in zoom-in-95 duration-100">
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                setEditingMove(move);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800/60 flex items-center gap-2 transition-colors cursor-pointer"
                                                        >
                                                            <i className="bi bi-pencil text-slate-400 text-xs"></i>
                                                            Editar
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => {
                                                                handleDelete(move);
                                                                setOpenMenuId(null);
                                                            }}
                                                            className="w-full px-3.5 py-2 text-left text-xs font-bold text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 flex items-center gap-2 transition-colors cursor-pointer"
                                                        >
                                                            <i className="bi bi-trash text-xs"></i>
                                                            Excluir
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            ) : (
                <div className="p-16 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-700 mb-4">
                        <i className={`bi ${selectedProduct ? 'bi-inboxes-fill' : 'bi-search'} text-2xl`}></i>
                    </div>
                    <h3 className="text-sm font-bold text-slate-700 dark:text-slate-300 mb-1">
                        {selectedProduct ? "Nenhuma movimentação para este produto" : "Selecione um produto"}
                    </h3>
                    <p className="text-xs text-slate-400 max-w-sm">
                        {selectedProduct 
                            ? "Não foram localizadas entradas, saídas ou ajustes para este produto."
                            : "Busque um produto no campo acima para visualizar seu histórico de movimentações."}
                    </p>
                </div>
            )}

            <InventoryMoveDeleteModal move={moveToDelete} isPurchaseEntry={moveToDelete ? isPurchaseEntry(moveToDelete) : false} isDeleting={isDeleting} onClose={() => !isDeleting && setMoveToDelete(null)} onConfirm={confirmDelete} />
            <InventoryMoveEditModal move={editingMove} isOpen={Boolean(editingMove)} onClose={() => setEditingMove(null)} />
        </div>
    );
};

export default InventoryMovesHistory;
