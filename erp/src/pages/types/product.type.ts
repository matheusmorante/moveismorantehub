export type InitialStockEntry = {
    quantity: number;
    unitCost: number;
    ipiPercent?: number;
    ipiType?: 'fixed' | 'percentage';
    freightCost?: number;
    freightType?: 'fixed' | 'percentage';
    finalUnitCost?: number;
};

export type Variation = {
    id: string;
    sku: string;
    name: string; // e.g., "Cor: Azul, Tamanho: P"
    stock: number;
    unitPrice: number;
    costPrice?: number;
    active: boolean;
    condition?: 'novo' | 'usado' | 'salvado' | '';
    attributes: { name: string; value: string; showName?: boolean }[];
    syncWithParent?: boolean; // Legacy/Global
    syncUnitPrice?: boolean;
    syncCostPrice?: boolean;
    syncCondition?: boolean;
    syncDescription?: boolean;
    hideAttributeNames?: boolean;
    images?: string[];

    freightType?: 'fixed' | 'percentage' | 'none';
    freightCost?: number;
    ipiPercent?: number;
    ipiType?: 'fixed' | 'percentage' | 'none';
    finalPurchasePrice?: number;
    minStock?: number;
    launchInitialStock?: boolean;
    initialStock?: number;
    initialCost?: number;
    initialStockEntries?: InitialStockEntry[];
    comboItems?: ComboItem[];
    // Intelligence Fields
    leadTime?: number;
    avgMonthlySales?: number;
    classification?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
};

export type FiscalInfo = {
    ncm?: string;
    ncmDescription?: string; // Auto-generated category or description of the NCM
    material?: string; // Material or composition to aid NCM search
    condition?: 'novo' | 'usado' | 'salvado' | ''; // Store condition inside fiscal jsonb for DB flexibility
    cest?: string;
    origem?: string;
    cst?: string; // or CSOSN
    cfop?: string;
    pisCst?: string;
    cofinsCst?: string;
    icmsPercent?: number;
    codigoServico?: string; // Para serviços LC 116/03
    issPercent?: number;    // Aliquota ISS Municipal
};

export type ComboItem = {
    productId: string;
    variationId?: string;
    quantity: number;
    description: string;
    unitPrice: number;
    stock: number;
};

export type ExtraDimension = {
    label: string;
    value: string;
};

export type Product = {
    id?: string;
    code?: string;
    description: string;
    category?: string;
    categoryIds?: string[]; // IDs das categorias/subcategorias associadas
    condition?: 'novo' | 'usado' | 'salvado' | ''; // Condição do Móvel
    unitPrice: number;
    costPrice?: number; // Preço de custo base
    freightType?: 'fixed' | 'percentage' | 'none';
    freightCost?: number; 
    ipiPercent?: number;
    ipiType?: 'fixed' | 'percentage' | 'none';
    finalPurchasePrice?: number; 
    initialStock?: number;
    stock?: number;
    minStock?: number;
    unit: string;
    active: boolean;
    isDraft?: boolean;
    deleted?: boolean;
    createdAt?: string;
    updatedAt?: string;

    // Dimensions & Details
    width?: number;
    height?: number;
    depth?: number;
    weight?: number; // Peso bruto em KG
    pkgWidth?: number; // Largura da embalagem
    pkgHeight?: number; // Altura da embalagem
    pkgDepth?: number; // Profundidade da embalagem
    extraDimensions?: ExtraDimension[];
    line?: string;
    mainDifferential?: string;
    material?: string;
    colors?: string;
    notIncluded?: string;

    // Ecommerce & Marketplace
    images?: string[];
    brand?: string;
    marketplaceTitle?: string;
    ecommerceDescription?: string;
    whatsappDescription?: string;
    ecommerceTemplate?: string;
    whatsappTemplate?: string;

    // Combo / Jogo
    isCombo?: boolean;
    comboItems?: ComboItem[];

    // Variations
    hasVariations?: boolean;
    variations?: Variation[];

    // Item Type
    itemType: 'product' | 'service';

    // UI Hierarchical fields (Synthetic)
    isParent?: boolean;
    isVariation?: boolean;
    parentId?: string;

    // Fiscal
    fiscal?: FiscalInfo;
    
    // Supplier Details
    supplierId?: string;
    mainSupplierId?: string; // Same as supplierId? Keeping for UI compatibility
    supplierRef?: string; // Referência do fornecedor

    // Per-product notification configuration
    notificationConfig?: ProductNotificationConfig;

    // Adicional
    observations?: string;
    sku?: string;

    // Intelligence Fields
    leadTime?: number;
    avgMonthlySales?: number;
    classification?: 'Q1' | 'Q2' | 'Q3' | 'Q4';
    hasNoLine?: boolean;
    noHeight?: boolean;
    noWidth?: boolean;
    noDepth?: boolean;
    noBrand?: boolean;
    noColors?: boolean;
    launchInitialStock?: boolean;
    initialStockEntries?: InitialStockEntry[];

    // Dynamic Title Rules
    productTypeId?: string;
    productTypeName?: string;
    environment?: string;
    includeEnvironment?: boolean;
    includeLine?: boolean;
    includeBrand?: boolean;
    includeSupplierRef?: boolean;
    titleComplement?: string;
    includeComplement?: boolean;
    titleOrder?: string[]; // e.g. ["type", "environment", "line", "brand", "supplierRef", "complement"]
};

export type ProductNotificationConfig = {
    enabled: boolean;             // Master toggle — disable all alerts for this product
    notifyZeroStock: boolean;     // Alert when stock reaches 0
    notifyMinStock: boolean;      // Alert when stock reaches minStock threshold
    notifyCustom?: string;        // Optional: custom note about what to watch for this product
};

export type ProductVisibilitySettings = {
    code: boolean;
    description: boolean;
    category: boolean;
    costPrice: boolean;
    unitPrice: boolean;
    stock: boolean;
    createdAt: boolean;
    actions: boolean;
};

export default Product;
