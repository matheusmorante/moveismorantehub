export type StockMoveType = 'entry' | 'withdrawal' | 'balance';

export interface StockMoveUpdate {
    type: StockMoveType;
    quantity: number;
    date: string;
    observation: string;
}

export interface StockMoveRecord {
    id: string;
    product_id?: string | null;
    variation_id?: string | null;
    canonical_variation_id?: string | null;
    type: string;
    quantity: number;
    unit_cost?: number | null;
    date: string;
    created_at?: string | null;
    label?: string | null;
    observation?: string | null;
    product_description?: string | null;
    product_name?: string | null;
    reason?: string | null;
    order_id?: string | null;
    variation_name?: string | null;
    products?: unknown;
    product_variations?: unknown;
}

export interface StockMoveResult {
    data: StockMoveRecord[];
    totalCount: number;
}
