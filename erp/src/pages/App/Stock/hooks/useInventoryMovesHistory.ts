import { useState, useEffect, useMemo } from "react";
import type { ReceiptPeriod } from "@/pages/App/Stock/Receipts/types/receiptPeriodFilter.types";
import type InventoryMove from "@/pages/types/inventoryMove.type";
import type Product from "@/pages/types/product.type";
import type { Variation } from "@/pages/types/product.type";
import { subscribeToInventoryMoves, reverseInventoryMove } from "@/pages/utils/inventoryService";
import { calculateInventoryTimelineBalance } from "@/pages/utils/inventoryTimelineBalance";
import { useInventoryOrdersLookup } from "./useInventoryOrdersLookup";
import { toast } from "react-toastify";

interface UseInventoryMovesHistoryProps {
    externalSelectedProduct?: Product | null;
    externalSelectedVariation?: Variation;
    externalOnSelectProduct?: (product: Product | null, variation?: Variation) => void;
}

export function useInventoryMovesHistory({
    externalSelectedProduct,
    externalSelectedVariation,
    externalOnSelectProduct
}: UseInventoryMovesHistoryProps) {
    const [moves, setMoves] = useState<InventoryMove[]>([]);
    const [loading, setLoading] = useState(true);
    const [internalProduct, setInternalProduct] = useState<Product | null>(null);
    const [internalVariation, setInternalVariation] = useState<Variation | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState("");
    const [moveToDelete, setMoveToDelete] = useState<InventoryMove | null>(null);
    const [editingMove, setEditingMove] = useState<InventoryMove | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [expandedMoveIds, setExpandedMoveIds] = useState<Record<string, boolean>>({});
    
    // Period filter
    const [period, setPeriod] = useState<ReceiptPeriod>('this_month');
    const [customStartDate, setCustomStartDate] = useState('');
    const [customEndDate, setCustomEndDate] = useState('');
    
    // Pagination
    const [page, setPage] = useState(1);
    const ITEMS_PER_PAGE = 15;

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
        } catch (e: unknown) {
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
        } catch (e: unknown) {
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

        const relevantMoves = moves.filter((m) => {
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
        let result = moves.filter((m) => !isInventoryAuditMarker(m));

        if (selectedProduct) {
            result = result.filter(m => m.productId === selectedProduct.id);
            if (selectedVariation && m.variationId) {
                result = result.filter(m => String(m.variationId) === String(selectedVariation.id));
            }
        }

        // Apply period filter
        if (period !== 'all') {
            const now = new Date();
            let start = new Date(0);
            let end = new Date();
            
            if (period === 'this_month') {
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                end = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
            } else if (period === 'last_month') {
                start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                end = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
            } else if (period === 'this_year') {
                start = new Date(now.getFullYear(), 0, 1);
                end = new Date(now.getFullYear(), 11, 31, 23, 59, 59);
            } else if (period === 'custom' && customStartDate && customEndDate) {
                start = new Date(`${customStartDate}T00:00:00`);
                end = new Date(`${customEndDate}T23:59:59`);
            }
            
            result = result.filter(m => {
                if (!m.date) return false;
                const mDate = new Date(m.date);
                return mDate >= start && mDate <= end;
            });
        }

        return result;
    }, [moves, selectedProduct, selectedVariation, period, customStartDate, customEndDate]);

    const paginatedFiltered = useMemo(() => {
        const startIndex = (page - 1) * ITEMS_PER_PAGE;
        return filtered.slice(startIndex, startIndex + ITEMS_PER_PAGE);
    }, [filtered, page]);

    const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE);

    const isPurchaseEntry = (move: InventoryMove) => move.relatedEntityType === 'purchase_order' || /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(move.label || '');
    const isOrderLinked = (move: InventoryMove) => move.relatedEntityType === 'sales_order' || isPurchaseEntry(move);

    const toggleExpand = (moveId: string) => {
        setExpandedMoveIds((prev) => ({ ...prev, [moveId]: !prev[moveId] }));
    };

    const getCleanObservation = (move: InventoryMove) => {
        let obsText = move.observation || '';
        if (obsText.startsWith('{') || obsText.startsWith('[')) {
            try {
                const parsed = JSON.parse(obsText) as Record<string, unknown>;
                const note = parsed.note || parsed.observation || parsed.reason;
                if (typeof note === 'string') obsText = note;
            } catch {
                // Não é JSON válido
            }
        }

        if (move.relatedEntityType === 'sales_order' || /^Saída - Pedido\s*#/i.test(move.label || '') || /^Pedido\s*#/i.test(move.label || '')) {
            const rawId = move.relatedEntityId || move.label?.replace(/^(Saída - )?Pedido\s*#/i, '') || '';
            const resolved = formatOrderLabel(rawId);
            if (resolved) return `Saída gerada pelo ${resolved.toLowerCase()}`;

            if (obsText && obsText.startsWith('Pedido de venda #')) return `Saída gerada pelo ${obsText.toLowerCase()}`;
            if (move.label && /^Saída - Pedido\s*#/i.test(move.label)) return `Saída gerada pelo ${move.label.replace(/^Saída - /i, '').toLowerCase()}`;
            return `Saída gerada pelo pedido de venda #${rawId}`.trim();
        }

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
        } catch (error: unknown) {
            const message = error instanceof Error ? error.message : "Erro ao estornar lançamento.";
            toast.error(message);
        } finally {
            setIsDeleting(false);
        }
    };

    return {
        loading,
        selectedProduct,
        selectedVariation,
        searchQuery,
        currentStock,
        filtered,
        expandedMoveIds,
        moveToDelete,
        editingMove,
        isDeleting,
        setSearchQuery,
        setMoveToDelete,
        setEditingMove,
        getDisplayName,
        handleSelectProduct,
        handleClearSelection,
        toggleExpand,
        getCleanObservation,
        isOrderLinked,
        handleDelete,
        confirmDelete,
        isPurchaseEntry,
        formatReversalReason,
        period,
        setPeriod,
        customStartDate,
        setCustomStartDate,
        customEndDate,
        setCustomEndDate,
        page,
        setPage,
        totalPages,
        paginatedFiltered,
        ITEMS_PER_PAGE,
        totalItems: filtered.length
    };
}
