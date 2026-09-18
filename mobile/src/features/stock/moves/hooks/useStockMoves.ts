import { useState, useCallback, useEffect } from 'react';
import { StockMove } from '../../types/stock.types';
import * as stockService from '../../../../services/stockService';

export const useStockMoves = () => {
    const [moves, setMoves] = useState<StockMove[]>([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(1);
    const [productId, setProductId] = useState<string | undefined>(undefined);

    const loadMoves = useCallback(async (pageNum = 0, pId?: string) => {
        setLoading(true);

        try {
            const { data, totalCount } = await stockService.fetchStockMoves(pageNum, pId);
            
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
    }, []);

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
        reload: () => loadMoves(0, productId)
    };
};
