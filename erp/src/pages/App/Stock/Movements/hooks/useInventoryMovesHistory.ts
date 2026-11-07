import { useState, useEffect } from 'react';
import type { ReceiptPeriod } from '@/pages/App/Stock/Receipts/types/receiptPeriodFilter.types';
import type InventoryMove from '@/pages/types/inventoryMove.type';
import type Product from '@/pages/types/product.type';
import type { Variation } from '@/pages/types/product.type';
import {
  fetchCurrentInventoryStock,
  fetchInventoryMovesHistoryPage,
  INVENTORY_MOVES_HISTORY_PAGE_SIZE,
  reverseInventoryMove,
  subscribeToInventoryMoveMutations,
} from '@/pages/utils/inventoryService';
import { useInventoryOrdersLookup } from './useInventoryOrdersLookup';
import { toast } from 'react-toastify';
import { formatInventoryAuditObservation } from '../../../../../../../shared-utils/inventoryMoveObservation';

interface UseInventoryMovesHistoryProps {
  externalSelectedProduct?: Product | null;
  externalSelectedVariation?: Variation;
  externalOnSelectProduct?: (product: Product | null, variation?: Variation) => void;
}

export function useInventoryMovesHistory({
  externalSelectedProduct,
  externalSelectedVariation,
  externalOnSelectProduct,
}: UseInventoryMovesHistoryProps) {
  const [moves, setMoves] = useState<InventoryMove[]>([]);
  const [totalItems, setTotalItems] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [internalProduct, setInternalProduct] = useState<Product | null>(null);
  const [internalVariation, setInternalVariation] = useState<Variation | undefined>(undefined);
  const [searchQuery, setSearchQuery] = useState('');
  const [moveToDelete, setMoveToDelete] = useState<InventoryMove | null>(null);
  const [editingMove, setEditingMove] = useState<InventoryMove | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [expandedMoveIds, setExpandedMoveIds] = useState<Record<string, boolean>>({});
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState('');
  const [stockRefreshKey, setStockRefreshKey] = useState(0);

  // Period filter
  const [period, setPeriod] = useState<ReceiptPeriod>('this_month');
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');

  // A paginação é sempre de 15 registros no ERP.
  const [page, setPage] = useState(1);

  const selectedProduct =
    externalSelectedProduct !== undefined ? externalSelectedProduct : internalProduct;
  const selectedVariation =
    externalSelectedVariation !== undefined ? externalSelectedVariation : internalVariation;

  const filterKey = JSON.stringify([
    selectedProduct?.id || '',
    selectedVariation?.id || '',
    Boolean(selectedVariation?.isVirtual),
    period,
    customStartDate,
    customEndDate,
  ]);
  const [pageFilterKey, setPageFilterKey] = useState(filterKey);
  const effectivePage = pageFilterKey === filterKey ? page : 1;

  useEffect(() => {
    setPageFilterKey(filterKey);
    setPage(1);
  }, [filterKey]);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const scheduleRefresh = () => {
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        setRefreshKey((key) => key + 1);
        setStockRefreshKey((key) => key + 1);
      }, 250);
    };
    const unsubscribe = subscribeToInventoryMoveMutations(scheduleRefresh);
    if (typeof window !== 'undefined') window.addEventListener('online', scheduleRefresh);
    return () => {
      if (timer) clearTimeout(timer);
      unsubscribe();
      if (typeof window !== 'undefined') window.removeEventListener('online', scheduleRefresh);
    };
  }, []);

  useEffect(() => {
    const controller = new AbortController();
    let active = true;
    setLoading(true);
    setError('');
    void fetchInventoryMovesHistoryPage(
      effectivePage,
      {
        productId: selectedProduct?.id,
        variationId: selectedVariation?.id,
        variationIsVirtual: selectedVariation?.isVirtual,
        variationName: selectedVariation?.name,
        period,
        customStartDate,
        customEndDate,
      },
      { signal: controller.signal },
    ).then(({ data, total }) => {
      if (!active) return;
      setMoves(data);
      setTotalItems(total);
      setLoading(false);
    }).catch(() => {
      if (!active || controller.signal.aborted) return;
      setMoves([]);
      setTotalItems(0);
      setError('Não foi possível atualizar o histórico. Verifique a conexão e tente novamente.');
      setLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [
    effectivePage,
    filterKey,
    refreshKey,
    selectedProduct?.id,
    selectedVariation?.id,
    selectedVariation?.isVirtual,
    selectedVariation?.name,
    period,
    customStartDate,
    customEndDate,
  ]);

  useEffect(() => {
    const productId = selectedProduct?.id;
    if (!productId) {
      setCurrentStock(null);
      setStockError('');
      setStockLoading(false);
      return;
    }
    const controller = new AbortController();
    let active = true;
    setStockLoading(true);
    setStockError('');
    void fetchCurrentInventoryStock(
      productId,
      selectedVariation
        ? { id: selectedVariation.id, isVirtual: selectedVariation.isVirtual }
        : undefined,
      controller.signal,
    ).then((stock) => {
      if (!active) return;
      setCurrentStock(stock);
      setStockLoading(false);
    }).catch(() => {
      if (!active || controller.signal.aborted) return;
      setCurrentStock(null);
      setStockError('Saldo atual indisponível. Atualize a consulta para conferir novamente.');
      setStockLoading(false);
    });
    return () => {
      active = false;
      controller.abort();
    };
  }, [selectedProduct?.id, selectedVariation?.id, selectedVariation?.isVirtual, stockRefreshKey]);

  const getDisplayName = (_prod: Product, variation?: Variation) => {
    if (variation?.name) return variation.name;
    return 'Variação não identificada';
  };

  const handleSelectProduct = (product: Product, variation?: Variation) => {
    try {
      localStorage.setItem(
        'morante_stock_selected_product_filter',
        JSON.stringify({ product, variation })
      );
    } catch (e: unknown) {
      console.error('Erro ao salvar produto no localStorage:', e);
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
      console.error('Erro ao remover produto do localStorage:', e);
    }

    if (externalOnSelectProduct) {
      externalOnSelectProduct(null, undefined);
    } else {
      setInternalProduct(null);
      setInternalVariation(undefined);
    }
    setSearchQuery('');
  };

  const paginatedFiltered = moves;
  const orderReferences = paginatedFiltered.flatMap((move) => [
    move.relatedEntityId || '',
    move.label?.replace(/^(Saída - )?Pedido\s*#/i, '') || '',
    move.reversalReason?.match(/Cancelamento da venda\s*#?([a-zA-Z0-9_-]+)/i)?.[1] || '',
  ]);
  const { formatOrderLabel, formatReversalReason } = useInventoryOrdersLookup(orderReferences);

  const totalPages = Math.max(1, Math.ceil(totalItems / INVENTORY_MOVES_HISTORY_PAGE_SIZE));
  const handlePageChange = (nextPage: number) => {
    setPageFilterKey(filterKey);
    setPage(nextPage);
  };
  const retry = () => {
    setRefreshKey((key) => key + 1);
    setStockRefreshKey((key) => key + 1);
  };

  const isPurchaseEntry = (move: InventoryMove) =>
    move.relatedEntityType === 'purchase_order' ||
    /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(move.label || '');
  const isOrderLinked = (move: InventoryMove) =>
    move.relatedEntityType === 'sales_order' || isPurchaseEntry(move);

  const toggleExpand = (moveId: string) => {
    setExpandedMoveIds((prev) => ({ ...prev, [moveId]: !prev[moveId] }));
  };

  const getCleanObservation = (move: InventoryMove) => {
    let obsText = move.observation || '';
    if (obsText.startsWith('{') || obsText.startsWith('[')) {
      try {
        const parsed = JSON.parse(obsText) as Record<string, unknown>;
        const note = parsed.note || parsed.observation || parsed.reason;
        if (typeof note === 'string') obsText = note.trim();
        const auditObservation = formatInventoryAuditObservation(parsed);
        if (auditObservation) return auditObservation;
        if (obsText === move.observation) obsText = '';
      } catch {
        // Não é JSON válido
      }
    }

    if (move.relatedEntityType === 'goods_receipt' || move.sourceReceiptId) {
      if (obsText && !obsText.trim().startsWith('{') && !obsText.trim().startsWith('[')) {
        return obsText;
      }
      const invoiceReference =
        move.label && move.label !== 'Recebimento de Mercadorias'
          ? ` da NF-e ${move.label}`
          : '';
      return `Entrada gerada pelo recebimento${invoiceReference}`;
    }

    if (
      move.relatedEntityType === 'sales_order' ||
      /^Saída - Pedido\s*#/i.test(move.label || '') ||
      /^Pedido\s*#/i.test(move.label || '')
    ) {
      if (obsText.startsWith('Ajuste do pedido de venda #')) return obsText;
      const rawId =
        move.relatedEntityId || move.label?.replace(/^(Saída - )?Pedido\s*#/i, '') || '';
      const resolved = formatOrderLabel(rawId);
      if (resolved) return `Saída gerada pelo ${resolved.toLowerCase()}`;

      if (obsText && obsText.startsWith('Pedido de venda #'))
        return `Saída gerada pelo ${obsText.toLowerCase()}`;
      if (move.label && /^Saída - Pedido\s*#/i.test(move.label))
        return `Saída gerada pelo ${move.label.replace(/^Saída - /i, '').toLowerCase()}`;
      return `Saída gerada pelo pedido de venda #${rawId}`.trim();
    }

    if (
      move.relatedEntityType === 'purchase_order' ||
      /^(Entrada (a partir )?do Pedido|Entrada NF-)/i.test(move.label || '') ||
      /Pedido de Compra\s*#/i.test(obsText)
    ) {
      if (
        obsText &&
        (obsText.startsWith('Pedido de Compra #') || obsText.startsWith('Entrada NF-'))
      )
        return `Entrada gerada por ${obsText}`;
      if (move.label) return `Entrada gerada por ${move.label}`;
      return 'Entrada gerada por pedido de compra';
    }

    if (move.label === 'ESTOQUE INICIAL') return 'Estoque Inicial';

    return obsText || move.label || 'Motivo de criação não informado';
  };

  const handleDelete = (move: InventoryMove) => {
    if (isOrderLinked(move)) {
      toast.warning(
        'Esta movimentação pertence a um pedido e seu estorno ocorre pelo status do pedido.'
      );
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
      const message = error instanceof Error ? error.message : 'Erro ao estornar lançamento.';
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
    stockLoading,
    stockError,
    error,
    retry,
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
    page: effectivePage,
    setPage: handlePageChange,
    totalPages,
    paginatedFiltered,
    totalItems,
  };
}
