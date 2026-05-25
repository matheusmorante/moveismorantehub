import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { Variation } from "../types/product.type";
import { crmIntelligenceService } from "./crmIntelligenceService";
import { saveInventoryMove } from "./inventoryService";

const TABLE_NAME = "products";
const LOCAL_STORAGE_KEY = 'local_products';

const mapToDB = (product: Partial<Product>) => {
    const data: any = {
        updated_at: new Date().toISOString()
    };

    if (product.id !== undefined && product.id !== '') data.id = product.id;
    if (product.code !== undefined) data.code = product.code;
    if (product.description !== undefined) data.description = product.description;
    if (product.brand !== undefined) data.brand = product.brand;
    if (product.category !== undefined) data.category = product.category;
    if (product.condition !== undefined) data.condition = product.condition;
    if (product.unitPrice !== undefined) data.unit_price = product.unitPrice;
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
    if (product.hasVariations !== undefined) data.has_variations = product.hasVariations;
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
    if (product.width !== undefined) data.width = product.width;
    if (product.height !== undefined) data.height = product.height;
    if (product.depth !== undefined) data.depth = product.depth;
    if (product.weight !== undefined) data.weight = product.weight;
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
    if (product.productTypeId !== undefined) data.product_type_id = product.productTypeId;
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
    if (product.slug !== undefined) data.slug = product.slug;
    if (product.meta_title !== undefined) data.meta_title = product.meta_title;
    if (product.meta_description !== undefined) data.meta_description = product.meta_description;
    if (product.seo_description !== undefined) data.seo_description = product.seo_description;

    return data;
};

export const mapFromDB = (data: any): Product => {
    return {
        id: String(data.id),
        sku: data.sku || '',
        code: data.code || '',
        description: data.description || '',
        brand: data.brand || '',
        category: data.category || '',
        condition: data.condition || 'novo',
        unitPrice: Number(data.unit_price || 0),
        costPrice: Number(data.cost_price || 0),
        freightType: data.freight_type || 'fixed',
        freightCost: Number(data.freight_cost || 0),
        ipiPercent: Number(data.ipi_percent || 0),
        finalPurchasePrice: Number(data.final_purchase_price || 0),
        initialStock: Number(data.initial_stock || 0),
        stock: Number(data.stock || 0),
        minStock: Number(data.min_stock || 0),
        unit: data.unit || 'UN',
        active: data.active ?? true,
        isDraft: data.is_draft ?? false,
        deleted: data.deleted ?? false,
        supplierId: data.supplier_id || '',
        images: data.images || [],
        ecommerceDescription: data.ecommerce_description || '',
        whatsappDescription: data.whatsapp_description || '',
        whatsappTemplate: data.whatsapp_template || '',
        ecommerceTemplate: data.ecommerce_template || '',
        hasVariations: data.has_variations ?? false,
        variations: (data.variations || []).map((v: any) => ({
            ...v,
            unitPrice: v.unitPrice || 0,
            costPrice: v.costPrice || 0,
            stock: v.stock || 0,
            sku: v.sku || ''
        })),
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
        categoryIds: data.product_categories?.map((pc: any) => pc.category_id) || [],
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        width: Number(data.width || 0),
        height: Number(data.height || 0),
        depth: Number(data.depth || 0),
        weight: Number(data.weight || 0),
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

const LIGHT_COLUMNS = "id, code, description, brand, category, condition, unit_price, cost_price, freight_type, freight_cost, ipi_percent, final_purchase_price, initial_stock, stock, min_stock, unit, active, is_draft, deleted, supplier_id, images, has_variations, variations, item_type, created_at, updated_at";
const LIGHT_COLUMNS_WITH_CATS = LIGHT_COLUMNS + ", product_categories(category_id)";

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

// Helper to initialize products from Supabase once if not done yet
const initializeProductsIfEmpty = async (): Promise<Product[]> => {
    const existing = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (existing !== null) {
        return getLocalProducts();
    }
    
    try {
        console.log("[ProductService] Inicializando banco de produtos local a partir do Supabase...");
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select(LIGHT_COLUMNS_WITH_CATS)
            .order('description', { ascending: true });
            
        let fetchedProducts: Product[] = [];
        if (!error && data) {
            fetchedProducts = data.map(mapFromDB);
        } else {
            const res = await supabase
                .from(TABLE_NAME)
                .select(LIGHT_COLUMNS)
                .order('description', { ascending: true });
            if (res.data) {
                fetchedProducts = res.data.map(mapFromDB);
            }
        }
        
        saveLocalProducts(fetchedProducts);
        return fetchedProducts;
    } catch (e) {
        console.error("[ProductService] Erro ao sincronizar dados iniciais do Supabase:", e);
        saveLocalProducts([]);
        return [];
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

export const getFullProduct = async (id: string): Promise<Product | null> => {
    const products = getLocalProducts();
    const product = products.find(p => String(p.id) === String(id));
    return product || null;
};

export const checkSkusUniquenessBatch = async (skus: string[], excludeProductId?: string): Promise<{ [sku: string]: string }> => {
    const uniqueSkus = Array.from(new Set(skus.filter(s => s && s.trim() !== "")));
    if (uniqueSkus.length === 0) return {};

    const duplicates: { [sku: string]: string } = {};
    const products = getLocalProducts().filter(p => !p.deleted);

    products.forEach(p => {
        if (excludeProductId && String(p.id) === String(excludeProductId)) return;

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

export const saveProduct = async (product: Product, forceInsert = false): Promise<string> => {
    const skusToValidate: string[] = [];
    if (product.code) skusToValidate.push(product.code);
    if (product.variations?.length) {
        product.variations.forEach(v => { if (v.sku) skusToValidate.push(v.sku); });
    }

    if (skusToValidate.length > 0) {
        const duplicates = await checkSkusUniquenessBatch(skusToValidate, product.id);
        const duplicateSkus = Object.keys(duplicates);
        if (duplicateSkus.length > 0) {
            const firstSku = duplicateSkus[0];
            const desc = duplicates[firstSku];
            throw new Error(`O código (SKU) "${firstSku}" já está em uso no produto: ${desc}`);
        }
    }

    const products = getLocalProducts();

    if (product.id && !forceInsert) {
        await updateProduct(product.id, product);
        return String(product.id);
    }

    const newId = product.id || String(Date.now() + Math.floor(Math.random() * 1000));
    const newProduct: Product = {
        ...product,
        id: newId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
    };

    products.push(newProduct);
    saveLocalProducts(products);
    notifySubscribers();

    if (product.launchInitialStock && Number(product.stock) > 0) {
        saveInventoryMove({
            productId: newId,
            productDescription: product.description || "Estoque Inicial",
            type: 'entry',
            quantity: Number(product.stock),
            unitCost: product.finalPurchasePrice || product.costPrice || 0,
            date: new Date().toISOString(),
            label: 'ESTOQUE INICIAL',
            observation: 'Lançamento automático de estoque inicial.'
        }, 0).catch(console.error);
    }

    if (product.initialStockEntries?.length) {
        for (const entry of product.initialStockEntries) {
            if (entry.quantity > 0) {
                saveInventoryMove({
                    productId: newId,
                    productDescription: product.description || "Estoque Inicial",
                    type: 'entry',
                    quantity: entry.quantity,
                    unitCost: entry.finalUnitCost || entry.unitCost,
                    date: new Date().toISOString(),
                    label: 'ESTOQUE INICIAL',
                    observation: 'Entrada múltipla.'
                }, 0).catch(console.error);
            }
        }
    }

    if (product.variations?.length) {
        for (const v of product.variations) {
            if (v.launchInitialStock && Number(v.initialStock) > 0) {
                saveInventoryMove({
                    productId: newId,
                    variationId: v.id,
                    productDescription: `${product.description} (${v.name})`,
                    type: 'entry',
                    quantity: Number(v.initialStock),
                    unitCost: v.finalPurchasePrice || v.initialCost || v.costPrice || 0,
                    date: new Date().toISOString(),
                    label: 'ESTOQUE INICIAL',
                    observation: `Estoque da variação ${v.name}.`
                }, 0).catch(console.error);
            }
        }
    }

    return newId;
};

export const checkProductLinkedToSales = async (id: string | number): Promise<string | null> => {
    try {
        const idStr = String(id);
        const allIdsToCheck = new Set<string>([idStr]);
        const allCodesToCheck = new Set<string>();
        const allNamesToCheck = new Set<string>();

        const product = getLocalProducts().find(p => String(p.id) === idStr);

        if (product) {
            if (product.code) allCodesToCheck.add(product.code);
            if (product.description) allNamesToCheck.add(product.description);
            
            const vars = product.variations || [];
            if (Array.isArray(vars)) {
                vars.forEach((v: any) => {
                    if (v.id) allIdsToCheck.add(String(v.id));
                    if (v.sku) {
                        allCodesToCheck.add(v.sku);
                        allIdsToCheck.add(`${idStr}_${v.sku}`);
                    }
                    if (v.name) allNamesToCheck.add(`${product.description} - ${v.name}`);
                });
            }
        }

        const idsArray = Array.from(allIdsToCheck);
        const codesArray = Array.from(allCodesToCheck);
        const namesArray = Array.from(allNamesToCheck);
        
        const queryPromises: any[] = [];
        const getBaseQuery = () => supabase.from('orders').select('id, order_data');

        for (const targetId of idsArray) {
            queryPromises.push(getBaseQuery().contains('order_data', { items: [{ productId: targetId }] }).limit(5));
            queryPromises.push(getBaseQuery().contains('order_data', { items: [{ variationId: targetId }] }).limit(5));
            queryPromises.push(getBaseQuery().contains('order_data', { assistanceItems: [{ id: targetId }] }).limit(5));
        }

        for (const targetCode of codesArray) {
            queryPromises.push(getBaseQuery().contains('order_data', { items: [{ code: targetCode }] }).limit(1));
            queryPromises.push(getBaseQuery().contains('order_data', { assistanceItems: [{ sku: targetCode }] }).limit(1));
        }

        for (const targetName of namesArray) {
            queryPromises.push(getBaseQuery().contains('order_data', { items: [{ description: targetName }] }).limit(1));
            queryPromises.push(getBaseQuery().contains('order_data', { assistanceItems: [{ description: targetName }] }).limit(1));
        }

        const results = await Promise.all(queryPromises);
        for (const res of results) {
            if (res.data && res.data.length > 0) {
                const validOrder = res.data.find((o: any) => {
                    const isBudget = o.order_data?.orderType === 'budget';
                    const isDeleted = o.order_data?.deleted === true || o.order_data?.deleted === 'true';
                    return !isBudget && !isDeleted;
                });
                
                if (validOrder) {
                    return String(validOrder.id);
                }
            }
        }

        return null;
    } catch (err) {
        console.error("Erro ao verificar vínculos do produto:", err);
        return null;
    }
};

export const updateProduct = async (id: string, productToUpdate: Partial<Product>): Promise<void> => {
    const skusToValidate: string[] = [];
    if (productToUpdate.code) skusToValidate.push(productToUpdate.code);
    if (productToUpdate.variations?.length) {
        productToUpdate.variations.forEach(v => { if (v.sku) skusToValidate.push(v.sku); });
    }

    if (skusToValidate.length > 0) {
        const duplicates = await checkSkusUniquenessBatch(skusToValidate, id);
        const duplicateSkus = Object.keys(duplicates);
        if (duplicateSkus.length > 0) {
            const firstSku = duplicateSkus[0];
            throw new Error(`O código (SKU) "${firstSku}" já está em uso no produto: ${duplicates[firstSku]}`);
        }
    }

    const products = getLocalProducts();
    const index = products.findIndex(p => String(p.id) === String(id));
    if (index === -1) throw new Error("Produto não encontrado.");

    const currentItem = products[index];

    const updatedProduct = {
        ...currentItem,
        ...productToUpdate,
        updatedAt: new Date().toISOString()
    };

    products[index] = updatedProduct;
    saveLocalProducts(products);
    notifySubscribers();

    const oldCode = currentItem.code;
    const newCode = productToUpdate.code;
    const variationsChanged = productToUpdate.variations !== undefined;

    if ((newCode && oldCode !== newCode) || variationsChanged) {
        syncCodesInOrders(id, newCode || oldCode, productToUpdate.variations).catch(console.error);
    }
};

export const checkProductHasMoves = async (productId: string, variationId?: string): Promise<boolean> => {
    try {
        let query = supabase
            .from('inventory_moves')
            .select('id')
            .eq('product_id', productId)
            .limit(1);

        if (variationId) {
            query = query.eq('variation_id', variationId);
        }

        const { data, error } = await query;
        if (error) throw error;
        
        return data !== null && data.length > 0;
    } catch (error) {
        console.error("Erro ao verificar movimentações:", error);
        return false;
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

export const bulkMoveToTrash = async (ids: string[]): Promise<{ successCount: number, errorCount: number, errors: string[] }> => {
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
            const products = getLocalProducts();
            idsToUpdate.forEach(id => {
                const idx = products.findIndex(p => String(p.id) === String(id));
                if (idx !== -1) {
                    products[idx].deleted = true;
                    products[idx].active = false;
                    products[idx].updatedAt = new Date().toISOString();
                }
            });
            saveLocalProducts(products);
            notifySubscribers();
        }

        return {
            successCount: idsToUpdate.length,
            errorCount: idsWithOrders.size,
            errors
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

export const moveToTrash = async (id: string): Promise<void> => {
    const linkedOrderId = await checkProductLinkedToSales(id);
    if (linkedOrderId) {
        throw new Error(`Este produto possui vendas vinculadas (Pedido #${linkedOrderId}) e não pode ser removido para preservar o histórico.`);
    }
    await updateProduct(id, { deleted: true, active: false });
};

export const restoreProduct = async (id: string): Promise<void> => {
    await updateProduct(id, { deleted: false, active: true });
};

export const permanentDeleteProduct = async (id: string): Promise<void> => {
    const linkedOrderId = await checkProductLinkedToSales(id);
    if (linkedOrderId) {
        throw new Error(`Este produto possui vendas vinculadas (Pedido #${linkedOrderId}) e não pode ser excluído permanentemente.`);
    }

    const hasMoves = await checkProductHasMoves(id);
    if (hasMoves) {
        throw new Error("Este produto possui histórico de movimentações e não pode ser excluído permanentemente.");
    }

    let products = getLocalProducts();
    products = products.filter(p => String(p.id) !== String(id));
    saveLocalProducts(products);
    notifySubscribers();
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

            await updateProduct(existingProduct.id, {
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
                active: true,
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
            .order('id', { ascending: false })
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
