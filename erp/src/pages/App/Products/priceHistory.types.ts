export interface PriceHistoryEntry {
    id: string;
    product_id: string;
    old_unit_price: number;
    new_unit_price: number;
    old_cost_price: number;
    new_cost_price: number;
    change_type: string;
    changed_at: string;
    changed_by: string;
    product_description?: string;
}

export interface InventoryMoveEntry {
    id: string;
    product_id: string;
    type: string;
    quantity: number;
    unit_cost: number;
    date: string;
    label: string;
    observation: string;
    balance?: number;
}
