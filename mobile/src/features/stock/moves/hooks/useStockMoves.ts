import { useState, useCallback, useEffect } from 'react';
import { StockMove } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';

export const useStockMoves = () => {
    const [moves, setMoves] = useState<StockMove[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [productId, setProductId] = useState<string | undefined>(undefined);
    const [period, setPeriod] = useState<{ startDate: string; endDate: string }>(() => getPeriodRange('Este Mês'));

    const loadMoves = useCallback(async (pageNum = 0, pId?: string, selectedPeriod = period) => {
        setLoading(true);

        try {
            const { data, totalCount } = await stockService.fetchStockMoves(pageNum, pId, selectedPeriod.startDate, selectedPeriod.endDate);
            
            const formattedData = (data || []).map((move: any) => ({
                id: move.id,
                type: move.type || (move.quantity > 0 ? 'in' : 'out'),
                quantity: Math.abs(move.quantity || 0),
                productDescription: move.productDescription || move.product_description || 'Produto Desconhecido',
                label: move.label || (move.type === 'entry' ? 'Entrada' : move.type === 'withdrawal' ? 'Saída' : 'Movimentação'),
                unitCost: move.unitCost || move.unit_cost,
                unitPrice: move.unitPrice || move.unit_price,
                status: move.status || 'effective',
                reversedAt: move.reversedAt || move.reversed_at || move.reversedAt,
                created_at: move.created_at || move.date,
                observation: move.observation,
                reversalReason: move.reversalReason || move.reversal_reason
            }));

            setMoves(formattedData);
            setPage(pageNum);
            setTotalPages(Math.ceil(totalCount / stockService.ITEMS_PER_PAGE));
            
        } catch (err) {
            console.error('Failed to fetch stock moves:', err);
        } finally {
            setLoading(false);
        }
    }, [period]);

    const changePeriod = useCallback((periodLabel: string) => {
        const nextPeriod = getPeriodRange(periodLabel);
        setPeriod(nextPeriod);
        void loadMoves(0, productId, nextPeriod);
    }, [loadMoves, productId]);

    const goToPage = useCallback((newPage: number) => {
        if (!loading && newPage >= 0 && newPage < totalPages) {
            void loadMoves(newPage, productId);
        }
    }, [loading, totalPages, loadMoves, productId]);

    useEffect(() => {
        void loadMoves(0, productId);
    }, [loadMoves, productId]);

    return {
        moves,
        loading,
        page,
        totalPages,
        goToPage,
        setProductId,
        changePeriod,
        reload: () => loadMoves(0, productId)
    };
};

const getPeriodRange = (label: string) => {
    const now = new Date();
    const start = new Date(now);
    const end = new Date(now);
    end.setHours(23, 59, 59, 999);

    if (label === 'Hoje') {
        start.setHours(0, 0, 0, 0);
    } else if (label === 'Esta Semana') {
        const day = start.getDay();
        start.setDate(start.getDate() - (day === 0 ? 6 : day - 1));
        start.setHours(0, 0, 0, 0);
    } else if (label === 'Este Mês') {
        start.setDate(1);
        start.setHours(0, 0, 0, 0);
    } else if (label === 'Últimos 30 Dias') {
        start.setDate(start.getDate() - 29);
        start.setHours(0, 0, 0, 0);
    } else if (label === 'Este Trimestre') {
        start.setMonth(Math.floor(start.getMonth() / 3) * 3, 1);
        start.setHours(0, 0, 0, 0);
    }

    return { startDate: start.toISOString(), endDate: end.toISOString() };
};
