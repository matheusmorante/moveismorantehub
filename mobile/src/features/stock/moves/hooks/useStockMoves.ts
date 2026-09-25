import { useState, useCallback, useEffect } from 'react';
import { StockMove } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';
import {
  isInventoryAuditMarker,
  getCleanObservation as getCanonicalCleanObservation,
  calculateInventoryTimelineBalance,
} from '../domain/inventoryTimelineBalance';

export const useStockMoves = () => {
  const [moves, setMoves] = useState<StockMove[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [page, setPage] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [productId, setProductId] = useState<string | undefined>(undefined);
  const [variationId, setVariationId] = useState<string | undefined>(undefined);
  const [currentStock, setCurrentStock] = useState<number | null>(null);
  const [period, setPeriod] = useState<{ startDate: string; endDate: string }>(() =>
    getPeriodRange('Este Mês')
  );

  const loadMoves = useCallback(
    async (pageNum = 0, pId?: string, selectedPeriod = period, vId = variationId) => {
      setLoading(true);
      setError('');

      try {
        const { data, totalCount } = await stockService.fetchStockMoves(
          pageNum,
          pId,
          vId,
          selectedPeriod.startDate,
          selectedPeriod.endDate
        );

        // Ignora marcadores de inventário com quantidade zero (idêntico ao ERP)
        const rawRows = data.filter(move => !isInventoryAuditMarker({
          label: move.label || undefined,
          quantity: move.quantity,
        }));

        const formattedData: StockMove[] = rawRows.map(move => {
          const metadata = parseObservationMetadata(move.observation);
          const cleanObservation = getCanonicalCleanObservation({
            label: move.label || undefined,
            observation: move.observation || undefined,
            relatedEntityType: move.related_entity_type || move.relatedEntityType || undefined,
            relatedEntityId: move.related_entity_id || move.relatedEntityId || undefined,
          });

          return {
            id: move.id,
            productId: move.product_id || undefined,
            variationId: move.variation_id || undefined,
            type: toStockMoveType(move.type, move.quantity),
            quantity: Number(move.quantity || 0),
            productName:
              move.variation_name ||
              move.product_variations?.name ||
              move.productDescription ||
              move.product_description ||
              (move.product_id ? 'Variação não identificada' : move.label || 'Movimentação'),
            productDescription:
              move.variation_name ||
              move.product_variations?.name ||
              move.productDescription ||
              move.product_description ||
              (move.product_id ? 'Variação não identificada' : move.label || 'Movimentação'),
            label:
              move.label ||
              (move.type === 'entry'
                ? 'Entrada'
                : move.type === 'withdrawal'
                ? 'Saída'
                : 'Movimentação'),
            unitCost: move.unitCost || move.unit_cost || undefined,
            unitPrice: move.unitPrice || move.unit_price || undefined,
            status: move.status || metadata.status || 'effective',
            reversedAt: move.reversedAt || move.reversed_at || undefined,
            created_at: move.date || move.created_at || '',
            observation: cleanObservation,
            reversalReason: move.reversalReason || move.reversal_reason || metadata.reversalReason,
            relatedEntityType: move.related_entity_type || move.relatedEntityType || undefined,
            relatedEntityId: move.related_entity_id || move.relatedEntityId || undefined,
          };
        });

        setMoves(formattedData);
        setPage(pageNum);
        setTotalPages(Math.ceil(totalCount / stockService.ITEMS_PER_PAGE));

        if (pId) {
          const timelineBal = calculateInventoryTimelineBalance(formattedData);
          if (timelineBal !== null) {
            setCurrentStock(timelineBal);
          }
        } else {
          setCurrentStock(null);
        }
      } catch (err) {
        console.error('Failed to fetch stock moves:', err);
        setMoves([]);
        setTotalPages(1);
        setError(err instanceof Error ? err.message : 'Não foi possível carregar as movimentações.');
      } finally {
        setLoading(false);
      }
    },
    [period, variationId]
  );

  const changePeriod = useCallback(
    (periodLabel: string, customRange?: { startDate: string; endDate: string }) => {
      const nextPeriod =
        periodLabel === 'Personalizado' && customRange ? customRange : getPeriodRange(periodLabel);
      setPeriod(nextPeriod);
      void loadMoves(0, productId, nextPeriod, variationId);
    },
    [loadMoves, productId, variationId]
  );

  const goToPage = useCallback(
    (newPage: number) => {
      if (!loading && newPage >= 0 && newPage < totalPages) {
        void loadMoves(newPage, productId, period, variationId);
      }
    },
    [loading, totalPages, loadMoves, productId, period, variationId]
  );

  useEffect(() => {
    void loadMoves(0, productId, period, variationId);
  }, [loadMoves, productId, period, variationId]);

  return {
    moves,
    loading,
    error,
    page,
    totalPages,
    goToPage,
    productId,
    variationId,
    setProductId,
    setVariationId,
    currentStock,
    setCurrentStock,
    changePeriod,
    reload: () => loadMoves(0, productId),
  };
};

const parseObservationMetadata = (observation: unknown): { status?: string; reversalReason?: string } => {
  if (typeof observation !== 'string' || !observation.trim().startsWith('{')) return {};
  try {
    const parsed = JSON.parse(observation);
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {};
    return {
      status: typeof parsed.status === 'string' ? parsed.status : undefined,
      reversalReason: typeof parsed.reversalReason === 'string' ? parsed.reversalReason : undefined,
    };
  } catch {
    return {};
  }
};

const toStockMoveType = (type: string, quantity: number): StockMove['type'] => {
  switch (type) {
    case 'in': case 'out': case 'entry': case 'exit':
    case 'withdrawal': case 'adjustment': case 'balance':
      return type;
    default:
      return quantity > 0 ? 'in' : 'out';
  }
};

const getPeriodRange = (label: string) => {
  const now = new Date();
  const start = new Date(now);
  const end = new Date(now);
  end.setHours(23, 59, 59, 999);

  if (label === 'Hoje') {
    start.setHours(0, 0, 0, 0);
  } else if (label === 'Este Mês') {
    start.setDate(1);
    start.setHours(0, 0, 0, 0);
  } else if (label === 'Mês Passado') {
    start.setMonth(start.getMonth() - 1, 1);
    start.setHours(0, 0, 0, 0);
    end.setDate(0);
    end.setHours(23, 59, 59, 999);
  } else if (label === 'Este Ano') {
    start.setMonth(0, 1);
    start.setHours(0, 0, 0, 0);
  } else if (label === 'Todos') {
    return { startDate: '', endDate: '' };
  }

  return { startDate: start.toISOString(), endDate: end.toISOString() };
};
