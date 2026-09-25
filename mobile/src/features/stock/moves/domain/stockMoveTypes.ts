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
    productDescription?: string | null;
    unitCost?: number | null;
    unitPrice?: number | null;
    unit_price?: number | null;
    status?: string | null;
    reversedAt?: string | null;
    reversed_at?: string | null;
    reversalReason?: string | null;
    reversal_reason?: string | null;
    relatedEntityType?: string | null;
    relatedEntityId?: string | null;
    related_entity_type?: string | null;
    related_entity_id?: string | null;
    products?: unknown;
    product_variations?: { id: string; name?: string | null } | null;
}

export interface StockMoveResult {
    data: StockMoveRecord[];
    totalCount: number;
}

export interface StockProductSelection {
    id: string;
    variation_id?: string;
    variationName?: string;
    name?: string;
    stock?: number | null;
    sku?: string;
}
