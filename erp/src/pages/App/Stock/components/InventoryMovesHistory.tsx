import React, { useState, useEffect, useMemo } from "react";
import InventoryMove from "../../../types/inventoryMove.type";
import Product, { Variation } from "../../../types/product.type";
import { subscribeToInventoryMoves, reverseInventoryMove } from "@/pages/utils/inventoryService";
import ProductAutocomplete from "@/components/ProductAutocomplete";
import { toast } from "react-toastify";
import InventoryMoveDeleteModal from "./InventoryMoveDeleteModal";
import InventoryMoveEditModal from "./InventoryMoveEditModal";
import InventoryMoveCard from "./InventoryMoveCard";
import InventoryMovesTable from "./InventoryMovesTable";
import { useInventoryOrdersLookup } from "./useInventoryOrdersLookup";
import { calculateInventoryTimelineBalance } from "@/pages/utils/inventoryTimelineBalance";

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
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedMoveIds, setExpandedMoveIds] = useState<Record<string, boolean>>({});

    const { formatOrderLabel, formatReversalReason } = useInventoryOrdersLookup();

    const selectedProduct = externalSelectedProduct !== undefined ? externalSelectedProduct : internalProduct;
    const selectedVariation = externalSelectedVariation !== undefined ? externalSelectedVariation : internalVariation;
    const isInventoryAuditMarker = (move: InventoryMove) =>
        move.label?.startsWith('Inventário #') && Number(move.quantity || 0) === 0;

    useEffect(() => {
        const unsubscribe = subscribeToInventoryMoves((data) => {
            setMoves(data);
            setLoading(false);
        });
        return () => unsubscribe();
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

        const relevantMoves = moves.filter(m => {
            if (m.status === 'reversed' || m.status === 'cancelled') return false;
            if (isInventoryAuditMarker(m)) return false;
            if (m.productId !== selectedProduct.id) return false;
            if (selectedVariation && m.variationId) {
                return String(m.variationId) === String(selectedVariation.id);
            }
            return true;
        });

        const timelineBalance = calculateInventoryTimelineBalance(relevantMoves);
        if (timelineBalance !== null) return timelineBalance;

        if (selectedVariation !== undefined) {
            return Number(selectedVariation.stock || 0);
        }
        return Number(selectedProduct.stock || 0);
    }, [selectedProduct, selectedVariation, moves]);

    const filtered = useMemo(() => {
        if (!selectedProduct) return [];

        return moves.filter(m => {
            if (isInventoryAuditMarker(m)) return false;
            if (m.productId !== selectedProduct.id) return false;
            if (selectedVariation && m.variationId) {
                return String(m.variationId) === String(selectedVariation.id);
            }
            return true;
        });
    }, [moves, selectedProduct, selectedVariation]);

    const isPurchaseEntry = (move: InventoryMove) => move.relatedEntityType === 'purchase_order' || /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(move.label || '');
    const isOrderLinked = (move: InventoryMove) => move.relatedEntityType === 'sales_order' || isPurchaseEntry(move);

    const toggleExpand = (moveId: string) => {
        setExpandedMoveIds(prev => ({ ...prev, [moveId]: !prev[moveId] }));
    };

    const getCleanObservation = (move: InventoryMove) => {
        let obsText = move.observation || '';
        if (obsText.startsWith('{') || obsText.startsWith('[')) {
            try {
                const parsed = JSON.parse(obsText);
                obsText = parsed.note || parsed.observation || parsed.reason || '';
            } catch { }
        }

        // 1. Pedidos de venda: formata dinamicamente o código de 6 dígitos + nome do cliente
        if (move.relatedEntityType === 'sales_order' || /^Saída - Pedido\s*#/i.test(move.label || '') || /^Pedido\s*#/i.test(move.label || '')) {
            const rawId = move.relatedEntityId || move.label?.replace(/^(Saída - )?Pedido\s*#/i, '') || '';
            const resolved = formatOrderLabel(rawId);
            if (resolved) return `Saída gerada pelo ${resolved.toLowerCase()}`;

            if (obsText && obsText.startsWith('Pedido de venda #')) return `Saída gerada pelo ${obsText.toLowerCase()}`;
            if (move.label && /^Saída - Pedido\s*#/i.test(move.label)) return `Saída gerada pelo ${move.label.replace(/^Saída - /i, '').toLowerCase()}`;
            return `Saída gerada pelo pedido de venda #${rawId}`.trim();
        }

        // 2. Pedidos de compra / fábrica
        if (move.relatedEntityType === 'purchase_order' || /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(move.label || '') || /Pedido de Compra\s*#/i.test(obsText)) {
            if (obsText && (obsText.startsWith('Pedido de Compra #') || obsText.startsWith('Entrada NF-'))) return `Entrada gerada por ${obsText}`;
            if (move.label) return `Entrada gerada por ${move.label}`;
            return 'Entrada gerada por pedido de compra';
        }

        if (move.label === 'ESTOQUE INICIAL') return 'Estoque Inicial';

        return obsText || move.label || 'Motivo de criação não informado';
    };

    const handleDelete = (move: InventoryMove) => {
        if (isOrderLinked(move)) {
            toast.warning("Esta movimentação pertence a um pedido e seu estorno ocorre pelo status do pedido.");
            return;
        }
        setMoveToDelete(move);
    };

    const confirmDelete = async (reason: string) => {
        if (!moveToDelete?.id) return;
        setIsDeleting(true);
        try {
            await reverseInventoryMove(moveToDelete.id, reason);
            toast.success('Movimentação estornada com sucesso!');
            setMoveToDelete(null);
        } catch (error: any) {
            toast.error(error.message || "Erro ao estornar lançamento.");
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

    return (
        <div className="flex flex-col w-full min-w-0">
            {/* Container Independente de Filtro de Produto e Saldo em Estoque */}
            <div className="p-3 sm:p-3.5 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm mb-3 flex flex-col md:flex-row md:items-center justify-between gap-3">
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
                                    if (!val) handleClearSelection();
                                }}
                                onSelect={handleSelectProduct}
                                variationsOnly
                                placeholder="Buscar produto..."
                                className="w-full"
                            />
                        </div>
                    )}
                </div>

                {selectedProduct && (
                    <div className="flex items-center gap-2 self-start md:self-center flex-wrap shrink-0">
                        <div className="flex items-center gap-2 px-3.5 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold shadow-sm shadow-emerald-200/50 dark:shadow-none">
                            <i className="bi bi-stack text-emerald-200 text-sm" />
                            <span>Saldo em Estoque: <strong className="font-black text-sm text-white">{currentStock} un</strong></span>
                        </div>
                    </div>
                )}
            </div>

            {/* Listagem de Movimentações: Cards em < XL e Tabela em >= XL */}
            {filtered.length > 0 ? (
                <div className="w-full min-w-0">
                    {/* Visualização em Cards para Telas menores que XL (< 1280px) */}
                    <div className="block xl:hidden space-y-3 w-full min-w-0">
                        {filtered.map((move) => {
                            const isReversed = move.status === 'reversed' || move.status === 'cancelled';
                            const cleanObs = getCleanObservation(move);
                            const isExpanded = !!expandedMoveIds[move.id || ''];
                            const reasonFormatted = formatReversalReason(move.reversalReason || (isReversed && typeof move.observation === 'string' && !move.observation.startsWith('{') ? move.observation : ''), move.relatedEntityId);
                            const enhancedMove = { ...move, reversalReason: reasonFormatted };

                            return (
                                <InventoryMoveCard
                                    key={move.id}
                                    move={enhancedMove}
                                    cleanObs={cleanObs}
                                    isReversed={isReversed}
                                    isExpanded={isExpanded}
                                    isOrderLinked={isOrderLinked(move)}
                                    onToggleExpand={() => toggleExpand(move.id!)}
                                    onEdit={() => setEditingMove(move)}
                                    onDelete={() => handleDelete(move)}
                                />
                            );
                        })}
                    </div>

                    {/* Visualização em Tabela para Desktop XL ou superior (>= 1280px) */}
                    <div className="hidden xl:block w-full">
                        <InventoryMovesTable
                            moves={filtered.map(m => ({ ...m, reversalReason: formatReversalReason(m.reversalReason || '', m.relatedEntityId) }))}
                            expandedMoveIds={expandedMoveIds}
                            toggleExpand={toggleExpand}
                            getCleanObservation={getCleanObservation}
                            isOrderLinked={isOrderLinked}
                            onEdit={(m) => setEditingMove(m)}
                            onDelete={(m) => handleDelete(m)}
                        />
                    </div>
                </div>
            ) : (
                <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm p-12 flex flex-col items-center justify-center text-center">
                    <div className="w-16 h-16 bg-slate-50 dark:bg-slate-800 rounded-2xl flex items-center justify-center text-slate-300 dark:text-slate-600 mb-4">
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

            <InventoryMoveDeleteModal
                move={moveToDelete}
                isPurchaseEntry={moveToDelete ? isPurchaseEntry(moveToDelete) : false}
                isDeleting={isDeleting}
                onClose={() => !isDeleting && setMoveToDelete(null)}
                onConfirm={confirmDelete}
            />
            <InventoryMoveEditModal
                move={editingMove}
                isOpen={Boolean(editingMove)}
                onClose={() => setEditingMove(null)}
            />
        </div>
    );
};

export default InventoryMovesHistory;
