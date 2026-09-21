export type PendencyType =
    | 'supplier'
    | 'category'
    | 'ncm'
    | 'price'
    | 'name'
    | 'category_attribute'
    | 'incomplete_attribute'
    | 'variation_price';

export interface ProductPendency {
    readonly id: string;
    readonly type: PendencyType;
    readonly level: 'parent' | 'variation';
    readonly variationId?: string;
    readonly variationName?: string;
    readonly field: string;
    readonly label: string;
    readonly currentValue?: any;
    readonly isCritical: boolean;
    /** Quantidade de variações que serão resolvidas se este campo for definido no pai */
    readonly resolvesVariationsCount?: number;
    readonly attributeId?: string;
    readonly attributeName?: string;
    readonly attributeDataType?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
    readonly attributeUnit?: string;
}

export interface ReconciliationVariationItem {
    readonly id: string;
    sku: string;
    name: string;
    price?: number;
    useParentPrice?: boolean;
    active?: boolean;
    attributes: Array<{ name: string; value: string; showName?: boolean }>;
    pendencies?: ProductPendency[];
}

export interface ReconciliationProductItem {
    readonly id: string;
    code?: string;
    sku?: string;
    name: string;
    category?: string;
    categoryId?: string;
    categoryIds?: string[];
    mainSupplierId?: string;
    supplierId?: string;
    supplierIds?: string[];
    people?: {
        fullName: string;
        tradeName?: string;
    } | null;
    price?: number;
    fiscal?: {
        ncm?: string;
        cest?: string;
    };
    variations: ReconciliationVariationItem[];
    pendencies: ProductPendency[];
    hasParentPendencies: boolean;
    hasVariationPendencies: boolean;
}

export interface RequiredCategoryAttribute {
    readonly categoryId: string;
    readonly attributeId: string;
    readonly isRequired: boolean;
    readonly attribute?: {
        readonly id: string;
        readonly name: string;
        readonly data_type?: 'list' | 'integer' | 'decimal' | 'text' | 'boolean' | 'measure';
        readonly unit?: string;
    };
}

export interface ReconciliationSummary {
    totalPendingProducts: number;
    totalPendencies: number;
    totalCritical: number;
    chipCounts: {
        all: number;
        supplier: number;
        category: number;
        ncm: number;
        attributes: number;
        price: number;
    };
}

export interface ReconciliationFilterState {
    pendencyType?: PendencyType | 'all' | 'attributes';
    categoryId?: string;
    supplierId?: string;
    search?: string;
    onlyCritical?: boolean;
}
