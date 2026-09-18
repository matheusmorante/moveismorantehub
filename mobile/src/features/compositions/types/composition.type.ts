export type PricingMode = 'sum' | 'fixed' | 'discount';

export type CompositionVariationItem = {
    id?: string;
    composition_variation_id?: string;
    product_id: string;
    variation_id?: string;
    quantity: number;
    created_at?: string;
    // UI auxiliary fields
    productName?: string;
    productSku?: string;
    currentStock?: number;
    unitPrice?: number;
    unitCost?: number;
};

export type CompositionVariation = {
    id?: string;
    composition_id?: string;
    name: string;
    sku?: string;
    attributes?: { name: string; value: string; showName?: boolean }[];
    active: boolean;
    items?: CompositionVariationItem[];
    // UI auxiliary fields
    availableStock?: number; // Calculated availability
    created_at?: string;
    updated_at?: string;
};

export type Composition = {
    id?: string;
    code?: number;
    sku?: string;
    name: string;
    description?: string;
    category_id?: string;
    active: boolean;
    catalog_published: boolean;
    pricing_mode: PricingMode;
    manual_price?: number;
    images?: string[];
    variations?: CompositionVariation[];
    created_at?: string;
    updated_at?: string;
    status?: string;
    
    // UI auxiliary fields
    calculatedPrice?: number;
    calculatedCost?: number;
};

export default Composition;
