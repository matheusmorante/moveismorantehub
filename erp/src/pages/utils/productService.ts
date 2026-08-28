import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { Variation } from "../types/product.type";
import { crmIntelligenceService } from "./crmIntelligenceService";
import { saveInventoryMove } from "./inventoryService";
import { normalizeSlug, resolveUniqueSlug } from './uniqueSlug';

const TABLE_NAME = "products";
const LOCAL_STORAGE_KEY = 'local_products';

export const parseVariationImages = (rawImageUrl: any, rawImages?: any): string[] => {
    const candidates: any[] = [];
    
    if (rawImages) {
        if (Array.isArray(rawImages)) candidates.push(...rawImages);
        else candidates.push(rawImages);
    }
    
    if (rawImageUrl) {
        if (Array.isArray(rawImageUrl)) candidates.push(...rawImageUrl);
        else candidates.push(rawImageUrl);
    }
    
    const result: string[] = [];
    
    candidates.forEach(item => {
        if (!item) return;
        if (typeof item === 'string') {
            const trimmed = item.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        parsed.forEach(p => {
                            const clean = String(p).trim().replace(/^["']|["']$/g, '');
                            if (clean && !result.includes(clean)) result.push(clean);
                        });
                        return;
                    }
                } catch (e) {}
            }
            trimmed.split(',').forEach((s: string) => {
                const clean = s.trim().replace(/^["']|["']$/g, '');
                if (clean && !result.includes(clean)) result.push(clean);
            });
        } else if (typeof item === 'object') {
            const clean = String(item.url || item.image_url || item).trim();
            if (clean && !result.includes(clean)) result.push(clean);
        }
    });

    return result;
};

const mapToDB = (product: Partial<Product>) => {
    const data: any = {
        updated_at: new Date().toISOString()
    };

    if (product.id !== undefined && product.id !== '') data.id = product.id;
    if (product.code !== undefined) data.code = product.code;

    const nameCandidate = product.name || product.title || product.marketplaceTitle || product.description;
    if (nameCandidate !== undefined && nameCandidate !== '') {
        data.name = nameCandidate;
        data.slug = normalizeSlug(nameCandidate);
    } else if (product.isDraft) {
        data.name = 'Rascunho de Produto';
        data.slug = normalizeSlug(`rascunho-${product.id || Date.now()}`);
    }
    if (product.description !== undefined) data.description = product.description;
    if (product.brand !== undefined) data.brand = product.brand;
    if (product.category !== undefined) data.category = product.category;
    if ((product as any).category_id !== undefined) data.category_id = (product as any).category_id;
    if (Array.isArray(product.categoryIds) && product.categoryIds.length > 0) {
        data.category_id = product.categoryIds[0];
    } else if (Array.isArray(product.categoryIds) && product.categoryIds.length === 0) {
        data.category_id = null;
    }
    if (product.condition !== undefined) data.condition = product.condition;
    if (product.unitPrice !== undefined) {
        data.unit_price = product.unitPrice;
        data.price = product.unitPrice;
    }
    if (product.costPrice !== undefined) data.cost_price = product.costPrice;
    if (product.freightType !== undefined) data.freight_type = product.freightType;
    if (product.freightCost !== undefined) data.freight_cost = product.freightCost;
    if (product.ipiPercent !== undefined) data.ipi_percent = product.ipiPercent;
    if (product.finalPurchasePrice !== undefined) data.final_purchase_price = product.finalPurchasePrice;
    if (product.initialStock !== undefined) data.initial_stock = product.initialStock;
    if (product.stock !== undefined) data.stock = product.stock;
    if (product.minStock !== undefined) data.min_stock = product.minStock;
    if (product.unit !== undefined) data.unit = product.unit;
    if (product.active !== undefined) data.active = product.active;
    if (product.isDraft !== undefined) data.is_draft = product.isDraft;
    if (product.deleted !== undefined) data.deleted = product.deleted;
    if (product.supplierId !== undefined) data.supplier_id = product.supplierId || null;
    if (product.images !== undefined) data.images = product.images;
    if (product.ecommerceDescription !== undefined) data.ecommerce_description = product.ecommerceDescription;
    if (product.whatsappDescription !== undefined) data.whatsapp_description = product.whatsappDescription;
    if (product.whatsappTemplate !== undefined) data.whatsapp_template = product.whatsappTemplate;
    if (product.ecommerceTemplate !== undefined) data.ecommerce_template = product.ecommerceTemplate;
    if (product.hasVariations !== undefined || product.variations !== undefined) {
        data.has_variations = Boolean(product.hasVariations) || (Array.isArray(product.variations) && product.variations.length > 0);
    }
    if (product.variations !== undefined) data.variations = product.variations;
    if (product.itemType !== undefined) data.item_type = product.itemType;
    if (product.fiscal !== undefined) data.fiscal = product.fiscal;
    if (product.notificationConfig !== undefined) data.notification_config = product.notificationConfig;
    if (product.isCombo !== undefined) data.is_combo = product.isCombo;
    if (product.comboItems !== undefined) data.combo_items = product.comboItems;
    if (product.initialStockEntries !== undefined) data.initial_stock_entries = product.initialStockEntries;
    if (product.whatsappSync !== undefined) data.whatsapp_sync = product.whatsappSync;
    if (product.ecommerceSync !== undefined) data.ecommerce_sync = product.ecommerceSync;
    if (product.whatsappAutoSync !== undefined) data.whatsapp_auto_sync = product.whatsappAutoSync;
    if (product.lastWhatsappSync !== undefined) data.last_whatsapp_sync = product.lastWhatsappSync;
    if (product.width !== undefined) data.width = product.width !== null ? String(product.width) : null;
    if (product.height !== undefined) data.height = product.height !== null ? String(product.height) : null;
    if (product.depth !== undefined) data.depth = product.depth !== null ? String(product.depth) : null;

    // Manter o campo measures sincronizado no Supabase se houver dimensões
    const measureParts: string[] = [];
    if (product.height) measureParts.push(`Altura: ${product.height}cm`);
    if (product.width) measureParts.push(`Largura: ${product.width}cm`);
    if (product.depth) measureParts.push(`Profundidade: ${product.depth}cm`);
    if (measureParts.length > 0) {
        data.measures = measureParts.join(' | ');
    }
    if (product.pkgWidth !== undefined) data.pkg_width = product.pkgWidth;
    if (product.pkgHeight !== undefined) data.pkg_height = product.pkgHeight;
    if (product.pkgDepth !== undefined) data.pkg_depth = product.pkgDepth;
    if (product.extraDimensions !== undefined) data.extra_dimensions = product.extraDimensions;
    if (product.line !== undefined) data.line = product.line;
    if (product.mainDifferential !== undefined) data.main_differential = product.mainDifferential;
    if (product.material !== undefined) data.material = product.material;
    if (product.colors !== undefined) data.colors = product.colors;
    if (product.notIncluded !== undefined) data.not_included = product.notIncluded;
    if (product.mainSupplierId !== undefined) data.main_supplier_id = product.mainSupplierId || null;
    if (product.supplierRef !== undefined) data.supplier_ref = product.supplierRef;
    if (product.observations !== undefined) data.observations = product.observations;
    if (product.parentId !== undefined) data.parent_id = product.parentId || null;
    if (product.isVariation !== undefined) data.is_variation = product.isVariation;
    if (product.noWidth !== undefined) data.no_width = product.noWidth;
    if (product.noHeight !== undefined) data.no_height = product.noHeight;
    if (product.noDepth !== undefined) data.no_depth = product.noDepth;
    if (product.noBrand !== undefined) data.no_brand = product.noBrand;
    if (product.noColors !== undefined) data.no_colors = product.noColors;
    if (product.hasNoLine !== undefined) data.has_no_line = product.hasNoLine;
    if (product.productTypeId !== undefined) data.product_type_id = product.productTypeId || null;
    if (product.productTypeName !== undefined) data.product_type_name = product.productTypeName;
    if (product.environment !== undefined) data.environment = product.environment;
    if (product.includeEnvironment !== undefined) data.include_environment = product.includeEnvironment;
    if (product.includeLine !== undefined) data.include_line = product.includeLine;
    if (product.includeBrand !== undefined) data.include_brand = product.includeBrand;
    if (product.includeType !== undefined) data.include_type = product.includeType;
    if (product.includeSupplierRef !== undefined) data.include_supplier_ref = product.includeSupplierRef;
    if (product.titleComplement !== undefined) data.title_complement = product.titleComplement;
    if (product.includeComplement !== undefined) data.include_complement = product.includeComplement;
    if (product.titleOrder !== undefined) data.title_order = product.titleOrder;
    if (product.slug !== undefined && product.slug.trim()) data.slug = normalizeSlug(product.slug);
    if (product.meta_title !== undefined) data.meta_title = product.meta_title;
    if (product.meta_description !== undefined) data.meta_description = product.meta_description;
    if (product.seo_description !== undefined) data.seo_description = product.seo_description;

    // Novas propriedades do e-commerce
    if (product.promoPrice !== undefined) data.promo_price = product.promoPrice || null;
    if (product.featured !== undefined) data.featured = product.featured;
    if (product.depthUseLength !== undefined) data.depth_use_length = product.depthUseLength;
    if (product.status !== undefined) data.status = product.status;
    if (product.condition !== undefined) data.is_salvado = product.condition === 'salvado';
    if (product.opportunityId !== undefined) data.opportunity_id = product.opportunityId || null;

    return data;
};

export const mapFromDB = (data: any, index?: number): Product => {
    const rawName = data.name || data.title || (data.description ? data.description.split('\n')[0].substring(0, 120) : '');

    // Coletar imagens (da tabela relacionada product_images, data.images, ou variações)
    let productImages: string[] = [];
    if (Array.isArray(data.product_images) && data.product_images.length > 0) {
        const sortedImages = [...data.product_images].sort((a, b) => (b.is_main ? 1 : 0) - (a.is_main ? 1 : 0));
        productImages = sortedImages.map((img: any) => img.image_url ? String(img.image_url).trim() : '').filter(Boolean);
    }

    if (productImages.length === 0) {
        if (Array.isArray(data.images)) {
            productImages = data.images.map((img: any) => typeof img === 'string' ? img.trim() : String(img)).filter(Boolean);
        } else if (typeof data.images === 'string' && data.images.trim()) {
            const trimmed = data.images.trim();
            if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
                try {
                    const parsed = JSON.parse(trimmed);
                    if (Array.isArray(parsed)) {
                        productImages = parsed.map((img: any) => String(img).trim()).filter(Boolean);
                    }
                } catch (e) {
                    productImages = [trimmed];
                }
            } else if (trimmed.includes(',')) {
                productImages = trimmed.split(',').map((s: string) => s.trim()).filter(Boolean);
            } else {
                productImages = [trimmed];
            }
        }
    }

    const variationRecords = data.product_variations || data.variations || [];
    
    // Coletar categoria
    let categoryNames: string[] = [];
    if (Array.isArray(data.product_categories) && data.product_categories.length > 0) {
        categoryNames = data.product_categories
            .map((pc: any) => pc.categories?.name || pc.category_name || pc.name)
            .filter(Boolean);
    }
    let primaryCategory = data.category || (categoryNames.length > 0 ? categoryNames.join(' | ') : '');

    // A flag armazenada nunca deve manter ativo no ERP um produto importado que
    // ainda não possui os dados internos exigidos para operar nesse canal.
    const isErpEligible = Boolean(
        data.description && String(data.description).trim().length >= 2 &&
        Number(data.unit_price ?? data.price ?? 0) > 0 &&
        Number(data.cost_price || 0) > 0 &&
        data.main_supplier_id &&
        Array.isArray(data.product_categories) && data.product_categories.length > 0
    );

    // Extrair dimensões (height, width, depth) com parsing numérico robusto e fallback para string measures
    let parsedWidth = data.width !== null && data.width !== undefined && String(data.width).trim() !== '' ? parseFloat(String(data.width).replace(',', '.')) : undefined;
    let parsedHeight = data.height !== null && data.height !== undefined && String(data.height).trim() !== '' ? parseFloat(String(data.height).replace(',', '.')) : undefined;
    let parsedDepth = data.depth !== null && data.depth !== undefined && String(data.depth).trim() !== '' ? parseFloat(String(data.depth).replace(',', '.')) : undefined;

    const measuresText = data.measures || '';
    if (measuresText) {
        const wMatch = measuresText.match(/larg(?:ura)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*larg/i);
        if (wMatch) {
            const val = parseFloat(wMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedWidth = val;
        }

        const hMatch = measuresText.match(/alt(?:ura)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*alt/i);
        if (hMatch) {
            const val = parseFloat(hMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedHeight = val;
        }

        const dMatch = measuresText.match(/prof(?:undidade)?:\s*([0-9.,]+)/i) || measuresText.match(/([0-9.,]+)\s*cm\s*de\s*prof/i);
        if (dMatch) {
            const val = parseFloat(dMatch[1].replace(',', '.'));
            if (!isNaN(val) && val > 0) parsedDepth = val;
        }
    }

    const fallbackCode = index !== undefined ? String(index + 1).padStart(6, '0') : '';
    const parentCode = data.code || data.sku || fallbackCode;

    return {
        id: String(data.id),
        sku: data.sku || parentCode,
        code: parentCode,
        name: rawName,
        title: data.title || rawName,
        // The ERP form still uses marketplaceTitle internally. Products coming
        // from the catalog persist this same value in `title`.
        marketplaceTitle: data.title || rawName,
        description: data.description || '',
        brand: data.brand || '',
        category: primaryCategory,
        condition: data.condition || (data.is_salvado ? 'salvado' : 'novo'),
        opportunityId: data.opportunity_id || null,
        opportunityName: data.opportunities?.name || data.opportunity_name || null,
        opportunity: data.opportunities ? { id: data.opportunities.id, name: data.opportunities.name, badge_color: data.opportunities.badge_color } : null,
        unitPrice: Number(data.price !== undefined && data.price !== null ? data.price : (data.unit_price || 0)),
        costPrice: Number(data.cost_price || 0),
        freightType: data.freight_type || 'fixed',
        freightCost: Number(data.freight_cost || 0),
        ipiPercent: Number(data.ipi_percent || 0),
        finalPurchasePrice: Number(data.final_purchase_price || 0),
        initialStock: Number(data.initial_stock || 0),
        stock: Number(data.stock || 0),
        minStock: Number(data.min_stock || 0),
        unit: data.unit || 'UN',
        active: Boolean(data.active),
        isDraft: Boolean(data.is_draft) || data.status === 'draft',
        deleted: data.deleted ?? false,
        supplierId: data.supplier_id || '',
        images: productImages,
        ecommerceDescription: data.ecommerce_description || '',
        whatsappDescription: data.whatsapp_description || '',
        whatsappTemplate: data.whatsapp_template || '',
        ecommerceTemplate: data.ecommerce_template || '',
        hasVariations: Boolean(data.has_variations) || (Array.isArray(variationRecords) && variationRecords.length > 0),
        variations: variationRecords.map((v: any, vIdx: number) => {
            const varImages = parseVariationImages(v.image_url, v.images);
            const suffix = String(vIdx + 1).padStart(2, '0');
            const expectedPrefix = parentCode ? `${parentCode}-` : '';
            const isAlreadyFormatted = expectedPrefix && v.sku && typeof v.sku === 'string' && v.sku.startsWith(expectedPrefix);
            const resolvedSku = isAlreadyFormatted ? v.sku : (parentCode ? `${parentCode}-${suffix}` : (v.sku || ''));
            
            // Parse robusto de atributos da variação
            let attributesList: { name: string; value: string; showName?: boolean }[] = [];
            const rawAttrs = v.attributes;

            if (Array.isArray(rawAttrs)) {
                attributesList = rawAttrs.map((a: any) => ({
                    name: a.name || a.attribute_name || a.key || '',
                    value: String(a.value || a.option || ''),
                    showName: a.showName ?? true
                })).filter(a => a.name && a.value);
            } else if (rawAttrs && typeof rawAttrs === 'object') {
                attributesList = Object.entries(rawAttrs).map(([name, value]) => ({
                    name,
                    value: typeof value === 'object' && value !== null ? String((value as any).value || (value as any).name || JSON.stringify(value)) : String(value),
                    showName: true
                })).filter(a => a.name && a.value);
            } else if (typeof rawAttrs === 'string') {
                try {
                    const parsed = JSON.parse(rawAttrs);
                    if (Array.isArray(parsed)) {
                        attributesList = parsed.map((a: any) => ({ name: a.name || '', value: String(a.value || ''), showName: true }));
                    } else if (parsed && typeof parsed === 'object') {
                        attributesList = Object.entries(parsed).map(([name, value]) => ({ name, value: String(value), showName: true }));
                    }
                } catch (e) {}
            }

            if (v.product_id) {
                return {
                    id: String(v.id),
                    sku: resolvedSku,
                    name: v.name || '',
                    stock: Number(v.stock || 0),
                    unitPrice: v.use_parent_price ? Number(data.unit_price || 0) : Number(v.price || 0),
                    promoPrice: v.use_parent_promo_price ? Number(data.promo_price || 0) : Number(v.promo_price || 0),
                    costPrice: Number(v.cost_price || 0),
                    // Variações não possuem status de ERP próprio no banco.
                    // Elas devem refletir a elegibilidade do produto-pai, em vez
                    // de sempre aparecerem como ativas na lista.
                    active: Boolean(data.active),
                    condition: data.condition || 'novo',
                    attributes: attributesList,
                    images: varImages,
                    syncUnitPrice: v.use_parent_price !== false,
                    syncPromoPrice: v.use_parent_promo_price !== false,
                    syncDescription: v.use_parent_description !== false,
                    description: v.description || '',
                    syncWidth: v.use_parent_dimensions !== false,
                    syncHeight: v.use_parent_dimensions !== false,
                    syncDepth: v.use_parent_dimensions !== false,
                    syncWeight: v.use_parent_dimensions !== false,
                    width: v.width ? Number(v.width) : undefined,
                    depth: v.depth ? Number(v.depth) : undefined,
                    height: v.height ? Number(v.height) : undefined,
                    weight: v.weight ? Number(v.weight) : undefined,
                };
            }
            return {
                ...v,
                images: varImages,
                attributes: attributesList,
                unitPrice: v.unitPrice || 0,
                costPrice: v.costPrice || 0,
                stock: v.stock || 0,
                sku: resolvedSku
            };
        }),
        itemType: data.item_type || 'product',
        fiscal: {
            ncm: data.fiscal?.ncm || '',
            cest: data.fiscal?.cest || '',
            ncmDescription: data.fiscal?.ncmDescription || '',
            cfop: data.fiscal?.cfop || '5102',
            icmsPercent: Number(data.fiscal?.icmsPercent || 0)
        },
        notificationConfig: data.notification_config || {},
        isCombo: data.is_combo || false,
        comboItems: data.combo_items || [],
        categoryIds: (Array.isArray(data.product_categories) && data.product_categories.length > 0)
            ? data.product_categories.map((pc: any) => pc.category_id || pc.id || pc).filter(Boolean)
            : (data.category_id ? [data.category_id] : []),
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        width: parsedWidth,
        height: parsedHeight,
        depth: parsedDepth,
        weight: data.weight !== null && data.weight !== undefined ? Number(data.weight) : undefined,
        pkgWidth: Number(data.pkg_width || 0),
        pkgHeight: Number(data.pkg_height || 0),
        pkgDepth: Number(data.pkg_depth || 0),
        extraDimensions: data.extra_dimensions || [],
        line: data.line || '',
        mainDifferential: data.main_differential || '',
        material: data.material || '',
        colors: data.colors || '',
        notIncluded: data.not_included || '',
        slug: data.slug || '',
        meta_title: data.meta_title || '',
        meta_description: data.meta_description || '',
        seo_description: data.seo_description || '',
        promoPrice: data.promo_price !== null && data.promo_price !== undefined ? Number(data.promo_price) : undefined,
        featured: data.featured ?? false,
        depthUseLength: data.depth_use_length ?? false,
        status: data.status || 'draft',
        mainSupplierId: data.main_supplier_id || '',
        supplierRef: data.supplier_ref || '',
        observations: data.observations || '',
        parentId: data.parent_id || '',
        isVariation: data.is_variation ?? false,
        noWidth: data.no_width ?? false,
        noHeight: data.no_height ?? false,
        noDepth: data.no_depth ?? false,
        noBrand: data.no_brand ?? false,
        noColors: data.no_colors ?? false,
        hasNoLine: data.has_no_line ?? false,
        productTypeId: data.product_type_id || '',
        productTypeName: data.product_type_name || '',
        environment: data.environment || '',
        includeEnvironment: data.include_environment ?? true,
        includeLine: data.include_line ?? true,
        includeBrand: data.include_brand ?? true,
        includeType: data.include_type ?? true,
        includeSupplierRef: data.include_supplier_ref ?? false,
        titleComplement: data.title_complement || '',
        includeComplement: data.include_complement ?? true,
        titleOrder: data.title_order || ["type", "environment", "line", "brand", "complement"],
        whatsappSync: data.whatsapp_sync ?? false,
        ecommerceSync: data.ecommerce_sync ?? false,
        whatsappAutoSync: data.whatsapp_auto_sync ?? false,
        lastWhatsappSync: data.last_whatsapp_sync
    };
};

const LIGHT_COLUMNS = "id, code, description, brand, category, condition, opportunity_id, width, height, depth, unit_price, cost_price, freight_type, freight_cost, ipi_percent, final_purchase_price, initial_stock, stock, min_stock, unit, active, is_draft, deleted, supplier_id, images, has_variations, item_type, created_at, updated_at";
const LIGHT_COLUMNS_WITH_CATS = LIGHT_COLUMNS + ", product_categories(category_id), product_variations(*), product_images(*)";

// Helper to get products from localStorage
const getLocalProducts = (): Product[] => {
    const data = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (!data) return [];
    try {
        return JSON.parse(data);
    } catch (e) {
        console.error("Erro ao ler produtos locais:", e);
        return [];
    }
};

// Helper to save products to localStorage
const saveLocalProducts = (products: Product[]) => {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(products));
};

// Helper to initialize products from Supabase
const initializeProductsIfEmpty = async (): Promise<Product[]> => {
    try {
        console.log("[ProductService] Carregando produtos a partir da tabela do Supabase do e-commerce...");
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
            .order('created_at', { ascending: false });
            
        if (error) {
            console.error("[ProductService] Erro ao buscar produtos do Supabase:", error);
            return getLocalProducts();
        }

        let fetchedProducts: Product[] = (data || []).map((p, idx) => mapFromDB(p, idx));
        
        saveLocalProducts(fetchedProducts);
        return fetchedProducts;
    } catch (e) {
        console.error("[ProductService] Exceção ao sincronizar dados do Supabase:", e);
        return getLocalProducts();
    }
};

// Simple reactive subscription system for UI updates
type SubscriptionCallback = (products: Product[]) => void;
const subscribers = new Set<{ callback: SubscriptionCallback; includeDeleted: boolean }>();

const notifySubscribers = () => {
    const products = getLocalProducts();
    subscribers.forEach(sub => {
        const filtered = products.filter(p => !!p.deleted === sub.includeDeleted);
        sub.callback(filtered);
    });
};

export const subscribeToProducts = (callback: (products: Product[]) => void, includeDeleted = false) => {
    const run = async () => {
        const products = await initializeProductsIfEmpty();
        const filtered = products.filter(p => !!p.deleted === includeDeleted);
        callback(filtered);
    };
    run();

    const subObj = { callback, includeDeleted };
    subscribers.add(subObj);

    return () => {
        subscribers.delete(subObj);
    };
};

/**
 * Busca uma página de produtos diretamente do Supabase.
 * Usado para paginação real no BD em telas >= lg (desktop).
 */
export const fetchProductsPage = async (
    page: number,
    pageSize: number,
    options?: {
        showTrash?: boolean;
        search?: string;
        category?: string;
        activeOnly?: boolean;
        status?: string;
        isDraft?: boolean;
        supplierId?: string;
        sortBy?: string;
        sortOrder?: 'asc' | 'desc';
    }
): Promise<{ data: Product[]; total: number }> => {
    try {
        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const showTrash = options?.showTrash ?? false;
        const sortBy = options?.sortBy || 'created_at';
        const sortOrder = options?.sortOrder || 'desc';
        const ascending = sortOrder === 'asc';

        // Mapear sortBy do frontend para a coluna real do BD
        const columnMap: Record<string, string> = {
            description: 'description',
            unitPrice: 'unit_price',
            stock: 'stock',
            code: 'code',
            createdAt: 'created_at',
            category: 'category',
        };
        const orderColumn = columnMap[sortBy] || 'created_at';

        let query = supabase
            .from(TABLE_NAME)
            .select('*, product_variations(*), product_images(*), product_categories(*, categories(*))', { count: 'exact' });

        query = query.eq('deleted', false);

        // 3 Estados exclusivos no ERP: Ativo, Desativado ou Rascunho
        if (options?.isDraft === true) {
            // RASCUNHO: Apenas rascunhos (is_draft = true ou status = 'draft')
            query = query.or('is_draft.eq.true,status.eq.draft');
        } else {
            // NÃO É RASCUNHO: Deve ser produto com cadastro concluído
            query = query.not('is_draft', 'is', true).neq('status', 'draft');

            if (showTrash || options?.activeOnly === false) {
                // DESATIVADO: Cadastro concluído e desativado no ERP (NUNCA rascunho)
                query = query.eq('active', false);
            } else if (options?.activeOnly === true) {
                // ATIVO: Cadastro concluído e ativo no ERP (NUNCA rascunho nem desativado)
                query = query.eq('active', true);
            }
        }

        query = query
            .order(orderColumn, { ascending })
            .range(from, to);

        // Filtro de busca textual — busca EXCLUSIVAMENTE pelo nome do produto (name) na tabela de produtos e variações
        if (options?.search) {
            const rawSearch = options.search.trim().replace(/[(),]/g, ' ').replace(/[%_]/g, '');
            if (rawSearch.length > 0) {
                const term = `%${rawSearch}%`;

                // 1. Buscar variações exclusivamente pelo campo 'name' na tabela product_variations
                let variationParentIds: string[] = [];
                try {
                    const { data: matchedVariations } = await supabase
                        .from('product_variations')
                        .select('product_id')
                        .ilike('name', term)
                        .limit(100);

                    if (matchedVariations && matchedVariations.length > 0) {
                        variationParentIds = Array.from(new Set(
                            matchedVariations.map(v => v.product_id).filter(Boolean)
                        ));
                    }
                } catch (e) {
                    console.warn('[ProductService] Erro ao buscar em product_variations:', e);
                }

                // 2. Montar filtro or exclusivamente com o campo name dos produtos e os IDs de variações
                const orConditions = [`name.ilike.${term}`];

                if (variationParentIds.length > 0) {
                    variationParentIds.forEach(id => {
                        orConditions.push(`id.eq.${id}`);
                    });
                }

                query = query.or(orConditions.join(','));
            }
        }

        // Filtro de categoria
        if (options?.category && options.category !== 'Serviços' && options.category !== 'Produtos') {
            query = query.eq('category', options.category);
        } else if (options?.category === 'Serviços') {
            query = query.eq('item_type', 'service');
        } else if (options?.category === 'Produtos') {
            query = query.eq('item_type', 'product');
        }

        // Filtro por status do catálogo digital (ex: 'published', 'hidden')
        if (options?.status) {
            query = query.eq('status', options.status);
        }

        // Filtro por fornecedor
        if (options?.supplierId) {
            query = query.or(`supplier_id.eq.${options.supplierId},main_supplier_id.eq.${options.supplierId}`);
        }

        const { data, error, count } = await query;

        if (error) {
            console.error('[ProductService] Erro na paginação do BD:', error);
            return { data: [], total: 0 };
        }

        const mapped: Product[] = (data || []).map((p, idx) => mapFromDB(p, idx));
        return { data: mapped, total: count ?? 0 };
    } catch (e) {
        console.error('[ProductService] Exceção em fetchProductsPage:', e);
        return { data: [], total: 0 };
    }
};


export const getFullProduct = async (id: string): Promise<Product | null> => {
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        if (isUUID) {
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*, product_variations(*), product_categories(*, categories(*)), product_images(*)')
                .eq('id', id)
                .maybeSingle();

            if (!error && data) {
                const mapped = mapFromDB(data);
                // Atualiza cache local
                const localProducts = getLocalProducts();
                const idx = localProducts.findIndex(p => String(p.id) === String(id));
                if (idx !== -1) {
                    localProducts[idx] = mapped;
                } else {
                    localProducts.push(mapped);
                }
                saveLocalProducts(localProducts);
                return mapped;
            }
        }
    } catch (e) {
        console.error("[ProductService] Erro ao buscar produto detalhado do Supabase:", e);
    }

    const products = getLocalProducts();
    const product = products.find(p => String(p.id) === String(id));
    return product || null;
};

/**
 * Gera um código (SKU) numérico único de 6 dígitos que não está em uso
 * por nenhum outro produto no cache local.
 * Estratégia: pega o maior valor numérico existente e incrementa.
 */
export const generateUniqueCode = (excludeProductId?: string): string => {
    const products = getLocalProducts().filter(p => !p.deleted);
    let maxNum = 0;
    const usedCodes = new Set<string>();

    products.forEach(p => {
        if (excludeProductId && String(p.id) === String(excludeProductId)) return;
        if (p.code) {
            usedCodes.add(p.code);
            const num = parseInt(p.code, 10);
            if (!isNaN(num) && num > maxNum) maxNum = num;
        }
        (p.variations || []).forEach((v: any) => {
            if (v.sku) {
                usedCodes.add(v.sku);
                const num = parseInt(v.sku, 10);
                if (!isNaN(num) && num > maxNum) maxNum = num;
            }
        });
    });

    let candidate = maxNum + 1;
    let candidateStr = String(candidate).padStart(6, '0');
    // Garante que não há colisão (por SKUs não-numéricos já presentes)
    while (usedCodes.has(candidateStr)) {
        candidate++;
        candidateStr = String(candidate).padStart(6, '0');
    }
    return candidateStr;
};

export const checkSkusUniquenessBatch = async (skus: string[], excludeProductId?: string, legacyId?: string): Promise<{ [sku: string]: string }> => {
    const uniqueSkus = Array.from(new Set(skus.filter(s => s && s.trim() !== "")));
    if (uniqueSkus.length === 0) return {};

    const duplicates: { [sku: string]: string } = {};
    const products = getLocalProducts().filter(p => !p.deleted);

    products.forEach(p => {
        if (excludeProductId && String(p.id) === String(excludeProductId)) return;
        if (legacyId && String(p.id) === String(legacyId)) return;

        if (p.code && uniqueSkus.includes(p.code)) {
            duplicates[p.code] = p.description;
        }

        const vrs = p.variations || [];
        uniqueSkus.forEach(s => {
            if (!duplicates[s] && vrs.some((v: any) => v.sku === s)) {
                duplicates[s] = p.description;
            }
        });
    });

    return duplicates;
};

const syncProductToSupabase = async (product: Product): Promise<void> => {
    try {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id || '');
        if (!isUUID && product.id) {
            const oldId = product.id;
            const newId = crypto.randomUUID();
            console.log(`[ProductService] Convertendo ID legado ${oldId} para UUID ${newId}`);
            
            product.id = newId;
            
            if (product.variations) {
                product.variations.forEach(v => {
                    (v as any).product_id = newId;
                    if (!v.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)) {
                        v.id = crypto.randomUUID();
                    }
                });
            }
            
            const localProducts = getLocalProducts();
            const idx = localProducts.findIndex(p => String(p.id) === String(oldId));
            if (idx !== -1) {
                localProducts[idx] = product;
                saveLocalProducts(localProducts);
            }
        }

        const dbData = mapToDB(product);
        // Remover propriedades que não são colunas diretas da tabela products
        delete dbData.variations;
        delete dbData.brand;
        delete dbData.category;
        delete dbData.ecommerce_description;
        delete dbData.whatsapp_description;
        delete dbData.whatsapp_template;
        delete dbData.ecommerce_template;
        delete dbData.initial_stock_entries;
        delete dbData.meta_title;
        delete dbData.meta_description;
        delete dbData.seo_description;

        dbData.slug = await resolveUniqueSlug(
            supabase,
            TABLE_NAME,
            dbData.slug || dbData.name || product.description || 'produto',
            dbData.id
        );
        
        // Preencher category_id primário na tabela products se houver categorias selecionadas
        if (Array.isArray(product.categoryIds) && product.categoryIds.length > 0) {
            dbData.category_id = product.categoryIds[0];
        } else if (Array.isArray(product.categoryIds) && product.categoryIds.length === 0) {
            dbData.category_id = null;
        }

        // O upsert atende tanto produtos novos quanto edições pelo UUID.
        dbData.name = dbData.name || product.description || 'Produto Sem Nome';
        let { error: productError } = await supabase.from(TABLE_NAME).upsert(dbData);
        if (productError && (productError.code === '23505' || productError.message?.toLowerCase().includes('slug'))) {
            dbData.slug = await resolveUniqueSlug(supabase, TABLE_NAME, dbData.slug, dbData.id);
            const retry = await supabase.from(TABLE_NAME).upsert(dbData);
            productError = retry.error;
        }
        if (productError) throw productError;

        // Atualizar category_id primário e sincronizar tabela product_categories
        if (product.id && Array.isArray(product.categoryIds)) {
            try {
                // Sincronizar na tabela intermediária N:N product_categories
                await supabase.from("product_categories").delete().eq("product_id", product.id);
                if (product.categoryIds.length > 0) {
                    const categoryRecords = product.categoryIds.map(catId => ({
                        product_id: product.id,
                        category_id: catId
                    }));
                    const { error: catInsertErr } = await supabase.from("product_categories").insert(categoryRecords);
                    if (catInsertErr) {
                        console.warn("[ProductService] Aviso ao inserir product_categories:", catInsertErr);
                    }
                }
            } catch (catErr) {
                console.error("[ProductService] Erro ao sincronizar product_categories:", catErr);
            }
        }

        // Sincronizar imagens na tabela product_images
        if (product.id && Array.isArray(product.images) && product.images.length > 0) {
            try {
                const imageRecords = product.images.map((url, idx) => ({
                    product_id: product.id,
                    image_url: url,
                    is_main: idx === 0
                }));
                await supabase.from("product_images").delete().eq("product_id", product.id);
                await supabase.from("product_images").insert(imageRecords);
            } catch (imgErr) {
                console.error("[ProductService] Erro ao sincronizar product_images:", imgErr);
            }
        }

        // Sincronizar variações na tabela product_variations
        if (product.id) {
            if ((product.hasVariations || (Array.isArray(product.variations) && product.variations.length > 0)) && product.variations && product.variations.length > 0) {
                if (!product.isDraft) {
                    const varWithoutImage = product.variations.find(v => !v.images || v.images.length === 0);
                    if (varWithoutImage) {
                        throw new Error(`A variação "${varWithoutImage.name || 'Sem título'}" deve ter pelo menos 1 foto vinculada.`);
                    }
                }

                const currentIds = product.variations.map(v => v.id).filter(Boolean);
                if (currentIds.length > 0) {
                    await supabase
                        .from("product_variations")
                        .delete()
                        .eq("product_id", product.id)
                        .not("id", "in", `(${currentIds.join(",")})`);
                } else {
                    await supabase.from("product_variations").delete().eq("product_id", product.id);
                }

                const recordsToSave = product.variations.map((v, index) => {
                    const attributesObj: Record<string, string> = {};
                    (v.attributes || []).forEach((attr: any) => {
                        if (attr.name && attr.value) {
                            attributesObj[attr.name] = attr.value;
                        }
                    });

                    const parentCode = product.code && product.code !== '000000' ? product.code : generateUniqueCode(product.id);
                    const suffix = String(index + 1).padStart(2, '0');
                    const defaultSku = `${parentCode}-${suffix}`;
                    const isAlreadyFormatted = v.sku && typeof v.sku === 'string' && v.sku.startsWith(`${parentCode}-`) && v.sku !== '000000-01';
                    const resolvedSku = isAlreadyFormatted ? v.sku : defaultSku;

                    return {
                        ...(v.id ? { id: v.id } : {}),
                        product_id: product.id,
                        name: v.name,
                        sku: resolvedSku,
                        price: v.syncUnitPrice ? (product.unitPrice ? Number(product.unitPrice) : 0) : (v.unitPrice !== undefined && v.unitPrice !== null ? Number(v.unitPrice) : 0),
                        stock: v.stock ? parseInt(String(v.stock), 10) : 0,
                        image_url: v.images && v.images.length > 0 ? v.images.join(",") : null,
                        attributes: attributesObj,
                        promo_price: v.syncPromoPrice !== false ? (product.promoPrice ? Number(product.promoPrice) : null) : (v.promoPrice !== undefined && v.promoPrice !== null ? Number(v.promoPrice) : null),
                        description: v.syncDescription ? null : (v.description || null),
                        width: v.width ? String(v.width) : null,
                        depth: v.depth ? String(v.depth) : null,
                        height: v.height ? String(v.height) : null,
                        use_parent_price: v.syncUnitPrice !== false,
                        use_parent_promo_price: v.syncPromoPrice !== false,
                        use_parent_dimensions: v.syncWidth !== false,
                        use_parent_description: v.syncDescription !== false,
                        use_parent_name: true,
                        status: v.status || 'published'
                    };
                });

                const { error: varErr } = await supabase.from("product_variations").upsert(recordsToSave);
                if (varErr) throw varErr;
            } else {
                await supabase.from("product_variations").delete().eq("product_id", product.id);
            }
        }

        // O feed CSV é atualizado dinamicamente pelo catálogo; não é necessário
        // chamar a API do Meta pelo navegador a cada alteração de produto.
    } catch (err: any) {
        console.error("[ProductService] Erro ao salvar dados no Supabase:", err);
        throw new Error(err.message || "Erro ao salvar no Supabase");
    }
};

const ensureUuidFormat = (product: Partial<Product>): string => {
    if (!product.id) return crypto.randomUUID();
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id);
    if (isUUID) return product.id;

    const oldId = product.id;
    const newId = crypto.randomUUID();
    console.log(`[ProductService] ensureUuidFormat: Normalizando ID legado ${oldId} para UUID ${newId}`);
    
    product.id = newId;
    if (product.variations) {
        product.variations.forEach(v => {
            (v as any).product_id = newId;
            if (!v.id || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v.id)) {
                v.id = crypto.randomUUID();
            }
        });
    }

    let localProducts = getLocalProducts();
    // Limpar qualquer duplicata no cache local com o mesmo SKU (exceto o ID legado que estamos migrando) para evitar conflitos de SKU em uso
    if (product.code) {
        localProducts = localProducts.filter(p => String(p.id) === String(oldId) || p.code !== product.code);
    }
    const idx = localProducts.findIndex(p => String(p.id) === String(oldId));
    if (idx !== -1) {
        localProducts[idx] = {
            ...localProducts[idx],
            ...product,
            id: newId
        };
    } else {
        localProducts.push({
            ...product,
            id: newId
        } as Product);
    }
    saveLocalProducts(localProducts);
    return newId;
};

export const saveProduct = async (product: Product, forceInsert = false): Promise<string> => {
    const legacyId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(product.id || '') ? product.id : undefined;
    const resolvedId = ensureUuidFormat(product);

    if (!product.code || product.code === '000000') {
        product.code = generateUniqueCode(resolvedId);
    }

    const skusToValidate: string[] = [];
    if (product.code) skusToValidate.push(product.code);
    if (product.variations?.length) {
        product.variations.forEach(v => { if (v.sku) skusToValidate.push(v.sku); });
    }

    if (skusToValidate.length > 0) {
        const duplicates = await checkSkusUniquenessBatch(skusToValidate, resolvedId, legacyId);
        const duplicateSkus = Object.keys(duplicates);
        if (duplicateSkus.length > 0) {
            // Auto-corrige: gera um código único para substituir o SKU duplicado
            if (product.code && duplicateSkus.includes(product.code)) {
                product.code = generateUniqueCode(resolvedId);
                console.warn(`[ProductService] SKU duplicado detectado. Novo código gerado automaticamente: ${product.code}`);
            }
            if (product.variations?.length) {
                product.variations.forEach(v => {
                    if (v.sku && duplicateSkus.includes(v.sku)) {
                        v.sku = generateUniqueCode(resolvedId);
                        console.warn(`[ProductService] SKU de variação duplicado. Novo SKU gerado: ${v.sku}`);
                    }
                });
            }
        }
    }

    const products = getLocalProducts();

    if (resolvedId && !forceInsert && products.some(item => String(item.id) === String(resolvedId))) {
        await updateProduct(resolvedId, product);
        return String(resolvedId);
    }

    const newProduct: Product = {
        ...product,
        id: resolvedId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveLocalProducts(products);
    notifySubscribers();
    
    // Sincronizar com Supabase e aguardar conclusão
    await syncProductToSupabase(newProduct);

    if (product.launchInitialStock && Number(product.stock) > 0) {
        saveInventoryMove({
            productId: resolvedId,
            productDescription: product.description || "Estoque Inicial",
            type: 'entry',
            quantity: Number(product.stock),
            unitCost: product.finalPurchasePrice || product.costPrice || 0,
            date: new Date().toISOString(),
            label: 'ESTOQUE INICIAL',
            observation: 'Lançamento automático de estoque inicial no cadastro do produto.'
        }, 0).catch(console.error);
    }

    if (product.initialStockEntries?.length) {
        for (const entry of product.initialStockEntries) {
            if (entry.quantity > 0) {
                saveInventoryMove({
                    productId: resolvedId,
                    productDescription: product.description || "Estoque Inicial",
                    type: 'entry',
                    quantity: entry.quantity,
                    unitCost: entry.finalUnitCost || entry.unitCost,
                    date: new Date().toISOString(),
                    label: 'ESTOQUE INICIAL',
                    observation: 'Lançamento automático de estoque inicial no cadastro do produto (lote múltiplo).'
                }, 0).catch(console.error);
            }
        }
    }

    if (product.variations?.length) {
        for (const v of product.variations) {
            if (v.launchInitialStock && Number(v.initialStock) > 0) {
                saveInventoryMove({
                    productId: resolvedId,
                    variationId: v.id,
                    productDescription: `${product.description} (${v.name})`,
                    type: 'entry',
                    quantity: Number(v.initialStock),
                    unitCost: v.finalPurchasePrice || v.initialCost || v.costPrice || 0,
                    date: new Date().toISOString(),
                    label: 'ESTOQUE INICIAL',
                    observation: `Lançamento automático de estoque inicial no cadastro da variação: ${v.name}.`
                }, 0).catch(console.error);
            }
        }
    }

    return resolvedId;
};

export const checkProductLinkedToSales = async (id: string | number): Promise<string | null> => {
    return null;
};

export const updateProduct = async (id: string, productToUpdate: Partial<Product>): Promise<void> => {
    const legacyId = !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id) ? id : undefined;
    const dummyProduct = { ...productToUpdate, id };
    const resolvedId = ensureUuidFormat(dummyProduct);
    if (productToUpdate.id) productToUpdate.id = resolvedId;

    const skusToValidate: string[] = [];
    if (productToUpdate.code) skusToValidate.push(productToUpdate.code);
    if (productToUpdate.variations?.length) {
        productToUpdate.variations.forEach(v => { if (v.sku) skusToValidate.push(v.sku); });
    }

    if (skusToValidate.length > 0) {
        const duplicates = await checkSkusUniquenessBatch(skusToValidate, resolvedId, legacyId);
        const duplicateSkus = Object.keys(duplicates);
        if (duplicateSkus.length > 0) {
            // Auto-corrige: gera um código único para substituir o SKU duplicado
            if (productToUpdate.code && duplicateSkus.includes(productToUpdate.code)) {
                productToUpdate.code = generateUniqueCode(resolvedId);
                console.warn(`[ProductService] SKU duplicado em updateProduct. Novo código: ${productToUpdate.code}`);
            }
            if (productToUpdate.variations?.length) {
                productToUpdate.variations.forEach(v => {
                    if (v.sku && duplicateSkus.includes(v.sku)) {
                        v.sku = generateUniqueCode(resolvedId);
                        console.warn(`[ProductService] SKU de variação duplicado em updateProduct. Novo SKU: ${v.sku}`);
                    }
                });
            }
        }
    }

    const products = getLocalProducts();
    const index = products.findIndex(p => String(p.id) === String(resolvedId));
    if (index === -1) {
        // A lista do ERP pode estar usando dados carregados diretamente do
        // Supabase, sem uma cópia no cache local. Atualiza apenas os campos
        // recebidos para não sobrescrever colunas obrigatórias, como price.
        const dbUpdate = mapToDB({ ...productToUpdate, id: resolvedId });
        delete dbUpdate.id;
        const { data, error } = await supabase.from(TABLE_NAME).update(dbUpdate).eq('id', resolvedId).select('*').single();
        if (error) throw error;
        const fullProduct = mapFromDB(data) as Product;
        const currentProducts = getLocalProducts();
        currentProducts.push(fullProduct);
        saveLocalProducts(currentProducts);
        notifySubscribers();
        return;
    }

    const currentItem = products[index];

    const updatedProduct = {
        ...currentItem,
        ...productToUpdate,
        id: resolvedId,
        updatedAt: new Date().toISOString()
    };

    products[index] = updatedProduct;
    saveLocalProducts(products);
    notifySubscribers();

    // Sincronizar com Supabase e aguardar conclusão
    await syncProductToSupabase(updatedProduct);

    const oldCode = currentItem.code;
    const newCode = productToUpdate.code;
    const variationsChanged = productToUpdate.variations !== undefined;

    if ((newCode && oldCode !== newCode) || variationsChanged) {
        syncCodesInOrders(id, newCode || oldCode || '', productToUpdate.variations).catch(console.error);
    }
};

export const checkProductHasMoves = async (productId: string, variationId?: string): Promise<boolean> => {
    try {
        const realId = String(productId).split('_')[0];
        
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        if (!isUUID) return false;

        // 1. Verificar movimentações de estoque (inventory_moves)
        let query = supabase
            .from('inventory_moves')
            .select('id')
            .eq('product_id', realId)
            .limit(1);

        if (variationId) {
            query = query.eq('variation_id', variationId);
        }

        const { data: movesData, error: movesErr } = await query;
        if (!movesErr && movesData && movesData.length > 0) {
            return true;
        }

        // 2. Verificar vendas vinculadas na tabela orders (order_data JSONB)
        const { data: ordersData, error: ordersErr } = await supabase
            .from('orders')
            .select('id')
            .filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${realId}\\"}]}"`)
            .limit(1);

        if (!ordersErr && ordersData && ordersData.length > 0) {
            return true;
        }

        return false;
    } catch (error) {
        console.error("Erro ao verificar movimentações do produto:", error);
        return true; // Por segurança, assume que possui histórico se a consulta falhar
    }
};

export const deleteProduct = async (id: string): Promise<{ success: boolean; message?: string }> => {
    try {
        const realId = String(id).split('_')[0];
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(realId);
        
        if (isUUID) {
            await deactivateProduct(realId);
        }

        return { 
            success: true, 
            message: "Produto desativado com sucesso. Deleções físicas não são permitidas para preservar o histórico do sistema."
        };
    } catch (error: any) {
        console.error("Erro ao desativar produto:", error);
        return {
            success: false,
            message: error.message || "Erro ao desativar o produto."
        };
    }
};

const syncCodesInOrders = async (productId: string, parentCode: string, variations?: Variation[]) => {
    try {
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, order_data')
            .filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${productId}\\"}]}"`)
            .neq('order_data->>deleted', 'true');

        if (error) throw error;
        if (!orders || orders.length === 0) return;

        for (const order of orders) {
            let changed = false;
            const orderData = order.order_data;
            if (!orderData?.items) continue;

            const updatedItems = orderData.items.map((item: any) => {
                if (item.productId === productId) {
                    let correctCode = parentCode;
                    
                    if (item.variationId && variations) {
                        const v = variations.find((v: any) => v.id === item.variationId);
                        if (v?.sku) correctCode = v.sku;
                    }

                    if (item.code !== correctCode) {
                        changed = true;
                        return { ...item, code: correctCode };
                    }
                }
                return item;
            });

            if (changed) {
                await supabase
                    .from('orders')
                    .update({ order_data: { ...orderData, items: updatedItems } })
                    .eq('id', order.id);
            }
        }
    } catch (err) {
        console.error(`Falha no sync de códigos para produto ${productId}:`, err);
    }
};

export const bulkMoveToTrash = async (ids: string[]): Promise<{ successCount: number, errorCount: number, errors: string[], deactivatedIds: string[] }> => {
    try {
        const idsWithOrders = new Set<string>();
        const orderConflicts: string[] = [];

        await Promise.all(ids.map(async (id) => {
            const linkedOrderId = await checkProductLinkedToSales(id);
            if (linkedOrderId) {
                idsWithOrders.add(id);
                orderConflicts.push(`Produto ID ${id} possui pedido vinculado (Ex: #${linkedOrderId})`);
            }
        }));

        const idsToUpdate = ids.filter(id => !idsWithOrders.has(id));
        
        let errors: string[] = [];
        if (idsWithOrders.size > 0) {
            errors.push(`${idsWithOrders.size} produto(s) possuem pedidos de venda/assistência vinculados e não puderam ser movidos para a lixeira.`);
            orderConflicts.forEach(oc => errors.push(oc));
        }

        if (idsToUpdate.length > 0) {
            await Promise.all(idsToUpdate.map(id => deactivateProduct(id)));
        }

        return {
            successCount: idsToUpdate.length,
            errorCount: ids.length - idsToUpdate.length,
            errors,
            deactivatedIds: idsToUpdate,
        };
    } catch (error) {
        console.error("Erro no bulkMoveToTrash:", error);
        throw error;
    }
};

export const bulkRestoreProducts = async (ids: string[]): Promise<void> => {
    try {
        const products = getLocalProducts();
        ids.forEach(id => {
            const idx = products.findIndex(p => String(p.id) === String(id));
            if (idx !== -1) {
                products[idx].deleted = false;
                products[idx].active = true;
                products[idx].updatedAt = new Date().toISOString();
            }
        });
        saveLocalProducts(products);
        notifySubscribers();
    } catch (error) {
        console.error("Erro no bulkRestoreProducts:", error);
        throw error;
    }
};

export const bulkPermanentDeleteProducts = async (ids: string[]): Promise<{ successCount: number, errorCount: number, errors: string[] }> => {
    try {
        const { data: moves } = await supabase
            .from('inventory_moves')
            .select('product_id')
            .in('product_id', ids);
            
        const idsWithMoves = new Set(moves?.map((m: any) => String(m.product_id)));
        const idsToProcess = ids.filter(id => !idsWithMoves.has(id));
        const idsWithOrders = new Set<string>();
        
        for (const id of idsToProcess) {
             const linkedOrderId = await checkProductLinkedToSales(id);
             if (linkedOrderId) idsWithOrders.add(id);
        }

        const idsToDelete = idsToProcess.filter(id => !idsWithOrders.has(id));
        
        let errors: string[] = [];
        if (idsWithMoves.size > 0) errors.push(`${idsWithMoves.size} produto(s) possuem movimentações de estoque (entradas/saídas).`);
        if (idsWithOrders.size > 0) errors.push(`${idsWithOrders.size} produto(s) possuem pedidos de venda ou assistência vinculados.`);

        if (idsToDelete.length > 0) {
            let products = getLocalProducts();
            products = products.filter(p => !idsToDelete.includes(String(p.id)));
            saveLocalProducts(products);
            notifySubscribers();
        }

        return {
            successCount: idsToDelete.length,
            errorCount: ids.length - idsToDelete.length,
            errors
        };
    } catch (error) {
        console.error("Erro no bulkPermanentDeleteProducts:", error);
        throw error;
    }
};

export const deactivateProduct = async (id: string): Promise<void> => {
    await updateProduct(id, { active: false, deleted: true, status: 'hidden' });
};

export const activateProduct = async (id: string): Promise<void> => {
    await updateProduct(id, { active: true, deleted: false, status: 'published' });
};

export const moveToTrash = async (id: string): Promise<void> => {
    await deactivateProduct(id);
};

export const restoreProduct = async (id: string): Promise<void> => {
    await activateProduct(id);
};

export const saveVariation = async (productId: string, variation: any): Promise<void> => {
    try {
        const products = getLocalProducts();
        const index = products.findIndex(p => String(p.id) === String(productId));
        if (index === -1) throw new Error("Produto pai não encontrado.");

        const parent = products[index];
        const variations = parent.variations || [];
        const varIndex = variations.findIndex((v: any) => v.id === variation.id);

        let newVariations = [...variations];
        if (varIndex === -1) {
            newVariations.push(variation);
        } else {
            newVariations[varIndex] = variation;
        }

        await updateProduct(productId, { variations: newVariations });
    } catch (error) {
        console.error("Erro ao salvar variação: ", error);
        throw error;
    }
};
export const syncFromWhatsApp = async (whatsappProduct: any): Promise<string> => {
    try {
        let existingProduct = null;
        const cleanRetailerId = whatsappProduct.retailer_id?.trim();
        const products = getLocalProducts().filter(p => !p.deleted);

        if (cleanRetailerId) {
            existingProduct = products.find(p => p.code === cleanRetailerId) || null;
        }

        if (!existingProduct && whatsappProduct.name) {
            const cleanName = whatsappProduct.name.trim().toLowerCase();
            existingProduct = products.find(p => p.description.toLowerCase().includes(cleanName)) || null;

            if (!existingProduct) {
                const words = cleanName.split(' ').filter((w: string) => w.length > 3);
                if (words.length >= 2) {
                    existingProduct = products.find(p => {
                        const desc = p.description.toLowerCase();
                        return desc.includes(words[0]) && desc.includes(words[1]);
                    }) || null;
                }
            }
        }

        if (existingProduct) {
            let currentImages = Array.isArray(existingProduct.images) ? existingProduct.images : [];
            if (whatsappProduct.image_url && !currentImages.includes(whatsappProduct.image_url)) {
                currentImages = [whatsappProduct.image_url, ...currentImages];
            }

            await updateProduct(String(existingProduct.id), {
                images: currentImages,
                whatsappDescription: whatsappProduct.description || existingProduct.whatsappDescription,
            });
            
            return String(existingProduct.id);
        } else {
            const newProduct: Partial<Product> = {
                description: whatsappProduct.name,
                unitPrice: Number(whatsappProduct.price?.replace(/[^0-9.-]+/g, "") || 0),
                images: whatsappProduct.image_url ? [whatsappProduct.image_url] : [],
                whatsappDescription: whatsappProduct.description,
                isDraft: true,
                active: false,
                status: 'draft',
                itemType: 'product',
                brand: 'Móveis Morante',
                condition: 'novo',
                code: cleanRetailerId
            };
            
            return await saveProduct(newProduct as Product);
        }
    } catch (error) {
        console.error("[WhatsAppSync] Falha crítica na sincronização:", error);
        throw error;
    }
};

export const getProductsByIds = async (ids: string[]): Promise<Product[]> => {
    const products = getLocalProducts();
    const idStrings = ids.map(String);
    return products.filter(p => idStrings.includes(String(p.id)));
};

export const getProductByCode = async (code: string): Promise<{ product: Product, variation?: Variation } | null> => {
    try {
        const products = getLocalProducts().filter(p => !p.deleted);

        const directMatch = products.find(p => p.code === code);
        if (directMatch) {
            return { product: directMatch };
        }

        for (const p of products) {
            const variation = p.variations?.find(v => v.sku === code);
            if (variation) {
                return { product: p, variation };
            }
        }

        return null;
    } catch (error) {
        console.error("Erro ao buscar produto por código:", error);
        return null;
    }
};

export const getProductSalesStats = async (productId: string, variationId?: string): Promise<{ avgMonthlySales: number }> => {
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        let query = supabase
            .from('orders')
            .select('order_data')
            .neq('order_data->>deleted', 'true')
            .gte('created_at', ninetyDaysAgo.toISOString());

        if (variationId) {
            query = query.filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${productId}\\", \\"variationId\\": \\"${variationId}\\"}]}"`);
        } else {
            query = query.filter('order_data', 'cs', `"{\\"items\\": [{\\"productId\\": \\"${productId}\\"}]}"`);
        }

        const { data, error } = await query;
        if (error) throw error;
        if (!data) return { avgMonthlySales: 0 };

        let totalQty = 0;
        data.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                if (item.productId === productId && (!variationId || item.variationId === variationId)) {
                    totalQty += item.quantity || 0;
                }
            });
        });

        return { avgMonthlySales: Math.round(totalQty / 3) };
    } catch (error) {
        console.error("Erro ao buscar estatísticas de venda:", error);
        return { avgMonthlySales: 0 };
    }
};

export const bulkConvertToVariations = async (): Promise<{ success: number, fails: number }> => {
    try {
        const products = getLocalProducts();
        const simpleProducts = products.filter(p => !p.hasVariations && !p.deleted);

        if (simpleProducts.length === 0) return { success: 0, fails: 0 };

        let success = 0;
        let fails = 0;

        for (const p of simpleProducts) {
            try {
                const variationId = crypto.randomUUID();
                const defaultVariation: Variation = {
                    id: variationId,
                    name: "COR: BRANCO",
                    sku: p.code || `SKU-${variationId.substring(0, 8)}`,
                    stock: Number(p.stock || 0),
                    unitPrice: Number(p.unitPrice || 0),
                    costPrice: Number(p.costPrice || 0),
                    active: true,
                    condition: p.condition || 'novo',
                    attributes: [{ name: 'COR', value: 'BRANCO' }],
                    syncWithParent: true,
                    syncUnitPrice: true,
                    syncCostPrice: true,
                    syncCondition: true
                };

                const idx = products.findIndex(prod => String(prod.id) === String(p.id));
                if (idx !== -1) {
                    products[idx] = {
                        ...products[idx],
                        hasVariations: true,
                        variations: [defaultVariation],
                        code: '',
                        stock: 0,
                        updatedAt: new Date().toISOString()
                    };
                    success++;
                } else {
                    fails++;
                }
            } catch (err) {
                console.error(`Falha ao converter produto ${p.id}:`, err);
                fails++;
            }
        }

        saveLocalProducts(products);
        notifySubscribers();

        return { success, fails };
    } catch (error) {
        console.error("Erro crítico na conversão em massa:", error);
        throw error;
    }
};

export const cleanupOldDrafts = async () => {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        
        let products = getLocalProducts();
        const initialCount = products.length;
        
        products = products.filter(p => {
            if (p.isDraft) {
                const updatedTime = p.updatedAt ? new Date(p.updatedAt).getTime() : 0;
                return updatedTime >= sevenDaysAgo.getTime();
            }
            return true;
        });

        if (products.length !== initialCount) {
            saveLocalProducts(products);
            notifySubscribers();
        }
    } catch (error) {
        console.error("Erro ao limpar rascunhos antigos:", error);
    }
};

export const migrateProductReferences = async (oldId: string, newId: string): Promise<void> => {
    try {
        const { error } = await supabase.rpc('migrate_product_data', { 
            old_id: parseInt(oldId), 
            new_id: parseInt(newId) 
        });
        if (error) throw error;
    } catch (error) {
        console.error("Erro ao migrar referências de produto:", error);
        throw error;
    }
};

export const searchHistoricalItems = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) return [];

    try {
        const words = query.trim().toLowerCase().split(/\s+/).filter(w => w.length > 0);

        const { data: salesData } = await supabase
            .from('orders')
            .select('order_data')
            .neq('order_data->>deleted', 'true')
            .order('created_at', { ascending: false })
            .limit(100);

        const { data: purchaseData } = await supabase
            .from('purchases')
            .select('items')
            .order('id', { ascending: false })
            .limit(100);

        const descriptions = new Set<string>();

        salesData?.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                const descLower = desc.toLowerCase();
                const matchesAll = words.every(word => descLower.includes(word));
                if (matchesAll) {
                    descriptions.add(desc);
                }
            });
        });

        purchaseData?.forEach((row: any) => {
            const items = row.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                const descLower = desc.toLowerCase();
                const matchesAll = words.every(word => descLower.includes(word));
                if (matchesAll) {
                    descriptions.add(desc);
                }
            });
        });

        return Array.from(descriptions).slice(0, 10);
    } catch (error) {
        console.error("Erro ao buscar histórico de itens:", error);
        return [];
    }
};

/**
 * Busca o próximo código sequencial de 6 dígitos no Supabase/localStorage
 * Padrão: 000001, 000002, 000003, ...
 */
export const getNextSequentialProductCode = async (): Promise<string> => {
    try {
        const { data, error } = await supabase.from(TABLE_NAME).select('id');
        let maxNum = 0;
        
        if (!error && Array.isArray(data)) {
            maxNum = data.length;
            data.forEach((p: any) => {
                const raw = String(p.code || p.sku || '').trim();
                const match = raw.match(/^(\d+)/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    if (!isNaN(num) && num > maxNum) {
                        maxNum = num;
                    }
                }
            });
        }
        
        const local = localStorage.getItem(LOCAL_STORAGE_KEY);
        if (local) {
            try {
                const parsed = JSON.parse(local);
                if (Array.isArray(parsed)) {
                    if (parsed.length > maxNum) maxNum = parsed.length;
                    parsed.forEach((p: any) => {
                        const raw = String(p.code || p.sku || '').trim();
                        const match = raw.match(/^(\d+)/);
                        if (match) {
                            const num = parseInt(match[1], 10);
                            if (!isNaN(num) && num > maxNum) maxNum = num;
                        }
                    });
                }
            } catch (e) {
                // Ignore parse errors
            }
        }

        return String(maxNum + 1).padStart(6, '0');
    } catch (err) {
        console.error("Erro ao calcular próximo SKU sequencial:", err);
        return '000001';
    }
};

/**
 * Gera o SKU da variação no formato {CodigoPai}-{01|02|03}
 */
export const generateVariationSku = (parentCode: string, index: number): string => {
    const cleanParent = parentCode ? parentCode.trim() : '000000';
    const suffix = String(index + 1).padStart(2, '0');
    return `${cleanParent}-${suffix}`;
};

