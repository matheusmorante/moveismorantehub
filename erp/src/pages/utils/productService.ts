import { supabase } from '@/pages/utils/supabaseConfig';
import Product, { Variation } from "../types/product.type";
import { crmIntelligenceService } from "./crmIntelligenceService";
import { saveInventoryMove } from "./inventoryService";

const TABLE_NAME = "products";

const mapToDB = (product: Partial<Product>) => {
    const data: any = {
        updated_at: new Date().toISOString()
    };

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
    if (product.supplierId !== undefined) data.supplier_id = product.supplierId;
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
    
    // Dimensions & Details
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
    if (product.mainSupplierId !== undefined) data.main_supplier_id = product.mainSupplierId;
    if (product.supplierRef !== undefined) data.supplier_ref = product.supplierRef;
    if (product.observations !== undefined) data.observations = product.observations;
    if (product.parentId !== undefined) data.parent_id = product.parentId;
    if (product.isVariation !== undefined) data.is_variation = product.isVariation;
    if (product.noWidth !== undefined) data.no_width = product.noWidth;
    if (product.noHeight !== undefined) data.no_height = product.noHeight;
    if (product.noDepth !== undefined) data.no_depth = product.noDepth;
    if (product.noBrand !== undefined) data.no_brand = product.noBrand;
    if (product.noColors !== undefined) data.no_colors = product.noColors;
    if (product.hasNoLine !== undefined) data.has_no_line = product.hasNoLine;

    // Dynamic Title fields
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

    // SEO Fields
    if (product.slug !== undefined) data.slug = product.slug;
    if (product.meta_title !== undefined) data.meta_title = product.meta_title;
    if (product.meta_description !== undefined) data.meta_description = product.meta_description;
    if (product.seo_description !== undefined) data.seo_description = product.seo_description;

    return data;
};

const mapFromDB = (data: any): Product => {
    return {
        id: String(data.id),
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
        
        // Dimensions & Details
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
        
        // SEO Fields
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

        // Dynamic Title fields
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

export const subscribeToProducts = (callback: (products: Product[]) => void) => {
    let currentProducts: Product[] = [];

    const fetchInitial = async () => {
        try {
            // Tenta primeiro com categorias relacionadas
            let { data, error } = await supabase.from(TABLE_NAME)
                .select(LIGHT_COLUMNS_WITH_CATS)
                .eq('deleted', false)
                .order('description', { ascending: true });

            // Se falhar (400, coluna não encontrada ou schema cache), tenta sem o join de categorias
            if (error) {
                console.warn("[ProductService] Fetch com categorias falhou, tentando sem join...", error.message);
                const res = await supabase.from(TABLE_NAME)
                    .select(LIGHT_COLUMNS)
                    .eq('deleted', false)
                    .order('description', { ascending: true });
                data = res.data;
                error = res.error;
            }

            // Último fallback: apenas colunas básicas
            if (error) {
                console.warn("[ProductService] Fallback básico...", error.message);
                const res = await supabase.from(TABLE_NAME)
                    .select('id, code, description, brand, category, unit_price, cost_price, stock, item_type, created_at, active, deleted, images, variations')
                    .eq('deleted', false)
                    .order('description', { ascending: true });
                data = res.data;
                error = res.error;
            }

            if (!error && data) {
                currentProducts = data.map(mapFromDB);
                callback(currentProducts);
            } else {
                console.error("[ProductService] Erro fatal nos 3 níveis de fallback:", error);
                callback([]);
            }
        } catch (err) {
            console.error("[ProductService] Exceção crítica ao buscar produtos:", err);
            callback([]);
        }
    };

    fetchInitial();

    const channel = supabase.channel('products_changes')
        .on('postgres_changes', { event: '*', schema: 'public', table: TABLE_NAME }, (payload: any) => {
            if (payload.eventType === 'INSERT') {
                const newProduct = mapFromDB(payload.new);
                currentProducts = [...currentProducts, newProduct].sort((a, b) => a.description.localeCompare(b.description));
                callback(currentProducts);
            } else if (payload.eventType === 'UPDATE') {
                const updatedProduct = mapFromDB(payload.new);
                currentProducts = currentProducts.map(p => p.id === updatedProduct.id ? { ...p, ...updatedProduct } : p);
                callback(currentProducts);
            } else if (payload.eventType === 'DELETE') {
                currentProducts = currentProducts.filter(p => p.id !== String(payload.old.id));
                callback(currentProducts);
            }
        })
        .subscribe();

    return () => {
        supabase.removeChannel(channel);
    };
};

/**
 * Busca um produto completo com todos os campos (para edição)
 */
export const getFullProduct = async (id: string): Promise<Product | null> => {
    try {
        // Tenta buscar com categorias relacionadas
        let { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*, product_categories(category_id)')
            .eq('id', id)
            .single();

        // Fallback sem join caso schema cache falhe
        if (error) {
            console.warn('[ProductService] getFullProduct com join falhou, tentando sem join...', error.message);
            const res = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('id', id)
                .single();
            data = res.data;
            error = res.error;
        }

        if (error) throw error;
        return data ? mapFromDB(data) : null;
    } catch (error) {
        console.error("Erro ao buscar produto completo:", error);
        return null;
    }
};

/**
 * Verifica se múltiplos SKUs já existem no sistema (em produtos ou variações) de uma vez só.
 * Otimiza a performance de salvamento permitindo validar todos os SKUs em 2 chamadas ao banco.
 */
export const checkSkusUniquenessBatch = async (skus: string[], excludeProductId?: string): Promise<{ [sku: string]: string }> => {
    const uniqueSkus = Array.from(new Set(skus.filter(s => s && s.trim() !== "")));
    if (uniqueSkus.length === 0) return {};

    const duplicates: { [sku: string]: string } = {};

    try {
        // 1. Verificar em produtos (campo code)
        let productQuery = supabase.from(TABLE_NAME)
            .select('id, description, code')
            .in('code', uniqueSkus)
            .eq('deleted', false);
        
        if (excludeProductId) productQuery = productQuery.neq('id', excludeProductId);

        const { data: productMatches } = await productQuery;
        productMatches?.forEach((p: any) => {
            duplicates[p.code] = p.description;
        });

        // 2. Verificar em variações (field JSON)
        // Infelizmente Supabase/PostgREST não suporta muito bem um "ANY" dentro de um array de objetos JSON direto na clause in.
        // Como o volume de SKUs por produto raramente passa de 50-100, verificaremos via .or() com @> ou simplesmente via um RPC se necessário.
        // Abordagem via .or() para ser compatível sem criar novas funcoes SQL:
        const filterOr = uniqueSkus.map(s => `variations.cs.[{"sku": "${s}"}]`).join(',');
        
        let variationQuery = supabase.from(TABLE_NAME)
            .select('id, description, variations')
            .eq('deleted', false)
            .or(filterOr);

        if (excludeProductId) variationQuery = variationQuery.neq('id', excludeProductId);

        const { data: variationMatches } = await variationQuery;
        variationMatches?.forEach((p: any) => {
            const vrs = p.variations || [];
            uniqueSkus.forEach(s => {
                if (!duplicates[s] && vrs.some((v: any) => v.sku === s)) {
                    duplicates[s] = p.description;
                }
            });
        });
    } catch (err) {
        console.error("[ProductService] Erro na verificação em lote de SKUs:", err);
    }

    return duplicates;
};

export const saveProduct = async (product: Product): Promise<string> => {
    // 1. Identificar todos os SKUs que precisam de validação
    const skusToValidate: string[] = [];
    if (product.code) skusToValidate.push(product.code);
    if (product.variations?.length) {
        product.variations.forEach(v => { if (v.sku) skusToValidate.push(v.sku); });
    }

    // 2. Validação em LOTE (Apenas 1 ou 2 requisições em vez de N)
    if (skusToValidate.length > 0) {
        const duplicates = await checkSkusUniquenessBatch(skusToValidate, product.id);
        const duplicateSkus = Object.keys(duplicates);
        if (duplicateSkus.length > 0) {
            const firstSku = duplicateSkus[0];
            const desc = duplicates[firstSku];
            throw new Error(`O código (SKU) "${firstSku}" já está em uso no produto: ${desc}`);
        }
    }

    if (product.id) {
        await updateProduct(product.id, product);
        return product.id;
    }

    try {
        const dbProduct = mapToDB(product);
        // Supabase serial ID will handle the auto-increment
        let { data, error } = await supabase
            .from(TABLE_NAME)
            .insert([dbProduct])
            .select('id, description');

        // Fail-safe: If insert fails due to missing columns
        if (error && (error.message?.includes("column") || error.message?.includes("schema cache") || error.code === '42703')) {
            console.warn("[ProductService] Schema mismatch on insert. Retrying without newer columns...", error.message);
            
            const safeDBProduct = { ...dbProduct };
            const fieldsToStrip = [
                'width', 'height', 'depth', 'weight', 'pkg_width', 'pkg_height', 'pkg_depth',
                'lead_time', 'avg_monthly_sales', 'classification',
                'extra_dimensions', 'line', 'main_differential', 'material', 'colors', 
                'not_included', 'main_supplier_id', 'supplier_ref', 'observations', 'parent_id', 'is_variation',
                'no_width', 'no_height', 'no_depth', 'no_brand', 'no_colors', 'has_no_line',
                'product_type_id', 'product_type_name', 'environment', 'include_environment', 
                'include_line', 'include_brand', 'include_supplier_ref', 'title_order',
                'title_complement', 'include_complement', 'include_type',
                'whatsapp_sync', 'ecommerce_sync', 'whatsapp_auto_sync', 'last_whatsapp_sync'
            ];
            fieldsToStrip.forEach(field => delete (safeDBProduct as any)[field]);
            
            const { data: retryData, error: retryError } = await supabase
                .from(TABLE_NAME)
                .insert([safeDBProduct])
                .select('id, description');
            
            data = retryData;
            error = retryError;
        }

        if (error) throw error;

        if (data && data[0]) {
            const newId = String(data[0].id);
            const secondaryPromises: Promise<any>[] = [];

            if (product.categoryIds && product.categoryIds.length > 0) {
                const links = product.categoryIds.map(cid => ({ product_id: newId, category_id: cid }));
                secondaryPromises.push(supabase.from('product_categories').insert(links));
            }

            // Lógica de CRM: Se o produto for 'salvado' ou 'usado', busca interessados
            const condition = product.condition?.toLowerCase();
            if (condition === 'salvado' || condition === 'usado') {
                secondaryPromises.push((async () => {
                    try {
                        const matches = await crmIntelligenceService.findMatchingDesires(product.description);
                        for (const match of matches) {
                            if (match.id) await crmIntelligenceService.registerMatch(match.id, newId);
                        }
                    } catch (crmError) {
                        console.error("Erro CRM:", crmError);
                    }
                })());
            }

            // Lançamento de Estoque Inicial
            secondaryPromises.push((async () => {
                const { saveInventoryMove } = await import('./inventoryService');
                
                // Legado
                if (product.launchInitialStock && Number(product.stock) > 0) {
                    await saveInventoryMove({
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

                // Múltiplas Entradas
                if (product.initialStockEntries?.length) {
                    for (const entry of product.initialStockEntries) {
                        if (entry.quantity > 0) {
                            await saveInventoryMove({
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

                // Variações
                if (product.variations?.length) {
                    for (const v of product.variations) {
                        if (v.launchInitialStock && Number(v.initialStock) > 0) {
                            await saveInventoryMove({
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
                        if (v.initialStockEntries?.length) {
                            for (const entry of v.initialStockEntries) {
                                if (entry.quantity > 0) {
                                    await saveInventoryMove({
                                        productId: newId,
                                        variationId: v.id,
                                        productDescription: `${product.description} (${v.name})`,
                                        type: 'entry',
                                        quantity: entry.quantity,
                                        unitCost: entry.finalUnitCost || entry.unitCost,
                                        date: new Date().toISOString(),
                                        label: 'ESTOQUE INICIAL',
                                        observation: `Entrada múltipla variação.`
                                    }, 0).catch(console.error);
                                }
                            }
                        }
                    }
                }
            })());

            // Executar tudo em paralelo para não travar o retorno do ID
            Promise.all(secondaryPromises).catch(err => console.error("Erro em operações secundárias:", err));
            
            return newId;
        }
        return "";
    } catch (error: any) {
        console.error("Erro ao salvar o produto:", error.message || error);
        if (error.details) console.error("Detalhes do erro:", error.details);
        if (error.hint) console.error("Dica:", error.hint);
        throw error;
    }
};

export const updateProduct = async (id: string, productToUpdate: Partial<Product>): Promise<void> => {
    // 1. Identificar SKUs para validar (Somente se mudaram)
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

    try {
        // Fetch current product for history log
        const { data: currentItem, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('id, description, unit_price, cost_price, code, variations')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        const dbProduct = mapToDB(productToUpdate);
        let { error } = await supabase
            .from(TABLE_NAME)
            .update(dbProduct)
            .eq('id', id);

        // Fail-safe: If update fails due to missing columns (common after schema changes),
        // try to update without the newer dimension/detail columns.
        if (error && (error.message?.includes("column") || error.message?.includes("schema cache") || error.message?.includes("not found"))) {
            console.warn("[ProductService] updateProduct schema issue. Retrying without extended fields...", error.message);
            
            // Lista abrangente de colunas que podem não existir no banco de dados ainda
            const unsafeFields = [
                'width', 'height', 'depth', 'weight', 'pkg_width', 'pkg_height', 'pkg_depth',
                'lead_time', 'avg_monthly_sales', 'classification',
                'extra_dimensions', 'line', 'main_differential', 'material', 'colors', 
                'not_included', 'main_supplier_id', 'supplier_ref', 'observations', 'parent_id', 'is_variation',
                'no_width', 'no_height', 'no_depth', 'no_brand', 'no_colors', 'has_no_line',
                'product_type_id', 'product_type_name', 'environment', 'include_environment', 
                'include_line', 'include_brand', 'include_supplier_ref', 'title_order',
                'title_complement', 'include_complement', 'include_type',
                'slug', 'meta_title', 'meta_description', 'seo_description',
                'whatsapp_sync', 'ecommerce_sync', 'whatsapp_auto_sync', 'last_whatsapp_sync'
            ];
            
            const safeDBProduct = { ...dbProduct };
            unsafeFields.forEach(field => {
                if (field in (safeDBProduct as any)) {
                    delete (safeDBProduct as any)[field];
                }
            });
            
            // Log for debugging
            console.log("[ProductService] Cleaned payload keys:", Object.keys(safeDBProduct));
            
            const { error: retryError } = await supabase
                .from(TABLE_NAME)
                .update(safeDBProduct)
                .eq('id', id);
            
            error = retryError;
        }

        if (error) throw error;

        const secondaryPromises: Promise<any>[] = [];

        // Price History Logic (Pode ser paralelo)
        const oldUnitPrice = Number(currentItem.unit_price);
        const newUnitPrice = productToUpdate.unitPrice !== undefined ? Number(productToUpdate.unitPrice) : oldUnitPrice;
        const oldCostPrice = Number(currentItem.cost_price);
        const newCostPrice = productToUpdate.costPrice !== undefined ? Number(productToUpdate.costPrice) : oldCostPrice;

        if (oldUnitPrice !== newUnitPrice || oldCostPrice !== newCostPrice) {
            let changeType = 'both';
            if (oldUnitPrice !== newUnitPrice && oldCostPrice === newCostPrice) changeType = 'unit_price';
            else if (oldUnitPrice === newUnitPrice && oldCostPrice !== newCostPrice) changeType = 'cost_price';

            secondaryPromises.push(supabase.from('product_price_history').insert([{
                product_id: id,
                old_unit_price: oldUnitPrice,
                new_unit_price: newUnitPrice,
                old_cost_price: oldCostPrice,
                new_cost_price: newCostPrice,
                change_type: changeType
            }]));
        }

        if (productToUpdate.categoryIds !== undefined) {
            secondaryPromises.push((async () => {
                await supabase.from('product_categories').delete().eq('product_id', id);
                if (productToUpdate.categoryIds!.length > 0) {
                    const links = productToUpdate.categoryIds!.map(cid => ({ product_id: id, category_id: cid }));
                    await supabase.from('product_categories').insert(links);
                }
            })());
        }

        // --- Code Sync Logic ---
        const oldCode = currentItem.code;
        const newCode = dbProduct.code;
        const variationsChanged = productToUpdate.variations !== undefined;

        if ((newCode && oldCode !== newCode) || variationsChanged) {
            secondaryPromises.push(syncCodesInOrders(id, newCode || oldCode, productToUpdate.variations));
        }

        // Não wait por esses processos para não segurar o usuário
        Promise.all(secondaryPromises).catch(e => console.error("Erro em processos paralelos de update:", e));
    } catch (error: any) {
        console.error("Erro ao atualizar o produto:", error.message || error);
        if (error.details) console.error("Detalhes do erro:", error.details);
        if (error.hint) console.error("Dica:", error.hint);
        throw error;
    }
};

/**
 * Verifica se um produto ou variação possui movimentações de estoque vinculadas
 */
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

/**
 * Sincroniza códigos de produtos e variações em pedidos de venda existentes
 */
const syncCodesInOrders = async (productId: string, parentCode: string, variations?: Variation[]) => {
    try {
        // Find orders containing this product
        const { data: orders, error } = await supabase
            .from('orders')
            .select('id, order_data')
            .contains('order_data', { items: [{ productId }] });

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

export const moveToTrash = async (id: string): Promise<void> => {
    try {
        // Verificar se existem movimentações de estoque vinculadas (em qualquer variação ou no pai)
        const hasMoves = await checkProductHasMoves(id);

        if (hasMoves) {
            throw new Error("Este produto possui histórico de movimentações (entradas/saídas) e não pode ser desativado/excluído para preservar a integridade do estoque.");
        }

        await updateProduct(id, {
            deleted: true,
            active: false
        });
    } catch (error) {
        console.error("Erro ao mover produto para lixeira: ", error);
        throw error;
    }
};

export const restoreProduct = async (id: string): Promise<void> => {
    try {
        await updateProduct(id, {
            deleted: false,
            active: true
        });
    } catch (error) {
        console.error("Erro ao restaurar o produto: ", error);
        throw error;
    }
};

export const permanentDeleteProduct = async (id: string): Promise<void> => {
    try {
        // Check if there are any orders linked to this product
        // We look inside the order_data JSON column for the productId
        const { data: linkedOrders, error: checkError } = await supabase
            .from('orders')
            .select('id')
            .contains('order_data', { items: [{ productId: id }] })
            .limit(1);

        if (checkError) {
            console.error("Erro ao verificar vínculos do produto:", checkError);
        }

        if (linkedOrders && linkedOrders.length > 0) {
            throw new Error("Este produto possui vendas vinculadas e não pode ser excluído permanentemente. Por favor, utilize a desativação (Mover para Lixeira).");
        }

        // Verificar se existem movimentações de estoque vinculadas
        const hasMoves = await checkProductHasMoves(id);

        if (hasMoves) {
            throw new Error("Este produto possui histórico de movimentações e não pode ser excluído permanentemente.");
        }

        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('id', id);

        if (error) throw error;
    } catch (error: any) {
        console.error("Erro ao deletar permanentemente o produto: ", error);
        throw error;
    }
};

export const saveVariation = async (productId: string, variation: any): Promise<void> => {
    try {
        const { data: parent, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('id', productId)
            .single();

        if (fetchError) throw fetchError;
        if (!parent) throw new Error("Produto pai não encontrado.");

        const variations = parent.variations || [];
        const index = variations.findIndex((v: any) => v.id === variation.id);

        // Price History Logic
        let oldUnitPrice = 0;
        let oldCostPrice = 0;
        
        if (index !== -1) {
            const oldVar = variations[index];
            oldUnitPrice = Number(oldVar.unitPrice || 0);
            oldCostPrice = Number(oldVar.costPrice || 0);
        }

        const newUnitPrice = Number(variation.unitPrice || 0);
        const newCostPrice = Number(variation.costPrice || 0);

        if (oldUnitPrice !== newUnitPrice || oldCostPrice !== newCostPrice) {
            let changeType = index === -1 ? 'both' : 'both';
            if (index !== -1) {
                if (oldUnitPrice !== newUnitPrice && oldCostPrice === newCostPrice) changeType = 'unit_price';
                else if (oldUnitPrice === newUnitPrice && oldCostPrice !== newCostPrice) changeType = 'cost_price';
            }

            await supabase.from('product_price_history').insert([{
                product_id: productId,
                variation_id: variation.id,
                old_unit_price: oldUnitPrice,
                new_unit_price: newUnitPrice,
                old_cost_price: oldCostPrice,
                new_cost_price: newCostPrice,
                change_type: changeType
            }]);
        }

        let newVariations = [...variations];
        if (index === -1) {
            newVariations.push(variation);
        } else {
            newVariations[index] = variation;
        }

        const { error: updateError } = await supabase
            .from(TABLE_NAME)
            .update({ variations: newVariations, updated_at: new Date().toISOString() })
            .eq('id', productId);

        if (updateError) throw updateError;
    } catch (error) {
        console.error("Erro ao salvar variação: ", error);
        throw error;
    }
};

/**
 * Sincroniza fotos e descrições do catálogo do WhatsApp para um produto existente no ERP
 */
export const syncFromWhatsApp = async (whatsappProduct: any): Promise<string> => {
    try {
        let existingProduct = null;
        const cleanRetailerId = whatsappProduct.retailer_id?.trim();

        // 1. Tentar encontrar pelo Código correspondente ao Retailer ID (Prioridade Máxima)
        if (cleanRetailerId) {
            console.log(`[WhatsAppSync] Buscando por código: ${cleanRetailerId}`);
            const { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .eq('code', cleanRetailerId)
                .eq('deleted', false)
                .limit(1);
            
            if (error) console.error("[WhatsAppSync] Erro Supabase (Code):", error);
            if (data && data.length > 0) existingProduct = data[0];
        }

        // 2. Tentar encontrar pelo Nome (Description) - Busca Flexível
        if (!existingProduct && whatsappProduct.name) {
            const cleanName = whatsappProduct.name.trim();
            console.log(`[WhatsAppSync] Buscando por nome: ${cleanName}`);
            
            let { data, error } = await supabase
                .from(TABLE_NAME)
                .select('*')
                .ilike('description', `%${cleanName}%`)
                .eq('deleted', false)
                .limit(1);
            
            if (error) console.error("[WhatsAppSync] Erro Supabase (Name):", error);
                
            if (data && data.length > 0) {
                existingProduct = data[0];
            } else {
                // Se não achou exato/inteiro, pega as 2 primeiras palavras significativas (> 3 letras)
                const words = cleanName.split(' ').filter((w: string) => w.length > 3);
                if (words.length >= 2) {
                    const partialPattern = `%${words[0]}%${words[1]}%`;
                    console.log(`[WhatsAppSync] Tentando busca parcial: ${partialPattern}`);
                    const { data: partialData } = await supabase
                        .from(TABLE_NAME)
                        .select('*')
                        .ilike('description', partialPattern)
                        .eq('deleted', false)
                        .limit(1);
                        
                    if (partialData && partialData.length > 0) existingProduct = partialData[0];
                }
            }
        }

        if (existingProduct) {
            console.log(`[WhatsAppSync] Produto encontrado (ID: ${existingProduct.id}). Atualizando imagens...`);
            let currentImages = Array.isArray(existingProduct.images) ? existingProduct.images : [];
            
            // Adiciona a imagem do WhatsApp no topo, caso ela exista e já não esteja na lista
            if (whatsappProduct.image_url && !currentImages.includes(whatsappProduct.image_url)) {
                currentImages = [whatsappProduct.image_url, ...currentImages];
            }

            // Atualiza o produto com a nova imagem e descrição do WhatsApp
            await updateProduct(existingProduct.id, {
                images: currentImages,
                whatsappDescription: whatsappProduct.description || existingProduct.whatsapp_description,
            });
            
            return String(existingProduct.id);
        } else {
            console.warn(`[WhatsAppSync] Produto "${whatsappProduct.name}" não encontrado. Criando rascunho...`);
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
    try {
        const { data, error } = await supabase
            .from(TABLE_NAME)
            .select('*, product_categories(category_id)')
            .in('id', ids);

        if (error) throw error;
        return (data || []).map(mapFromDB);
    } catch (error) {
        console.error("Erro ao buscar produtos por IDs:", error);
        return [];
    }
};

export const getProductByCode = async (code: string): Promise<{ product: Product, variation?: Variation } | null> => {
    try {
        // 1. Try to find product by its own code
        const { data: directMatch, error: directError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('code', code)
            .eq('deleted', false)
            .maybeSingle();

        if (directMatch) {
            return { product: mapFromDB(directMatch) };
        }

        // 2. Try to find a product that has a variation with this SKU
        // This is tricky with JSON columns in Supabase/Postgres if not indexed properly,
        // but for now we search for variations where SKU matches.
        // If we have MANY products, we might want a better index or a dedicated variations table.
        // For now, we fetch products that have variations and filter in memory if needed,
        // or try a specialized JSON query.
        
        const { data: variationMatch, error: variationError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .not('variations', 'is', null)
            .eq('deleted', false);
            
        if (variationMatch) {
            for (const p of variationMatch) {
                const mapped = mapFromDB(p);
                const variation = mapped.variations?.find(v => v.sku === code);
                if (variation) {
                    return { product: mapped, variation };
                }
            }
        }

        return null;
    } catch (error) {
        console.error("Erro ao buscar produto por código:", error);
        return null;
    }
};
/**
 * Busca estat├¡sticas de venda de um produto nos ├║ltimos 90 dias para calcular o giro mensal
 */
export const getProductSalesStats = async (productId: string, variationId?: string): Promise<{ avgMonthlySales: number }> => {
    try {
        const ninetyDaysAgo = new Date();
        ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

        let query = supabase
            .from('orders')
            .select('order_data')
            .eq('deleted', false)
            .gte('created_at', ninetyDaysAgo.toISOString());

        // We use contains to find orders with this product
        // Using a simpler query if JSON contains fails or is slow
        if (variationId) {
            query = query.filter('order_data->items', 'cs', `[{"productId": "${productId}", "variationId": "${variationId}"}]`);
        } else {
            query = query.filter('order_data->items', 'cs', `[{"productId": "${productId}"}]`);
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

        // Avg per month (90 days = 3 months)
        return { avgMonthlySales: Math.round(totalQty / 3) };
    } catch (error) {
        console.error("Erro ao buscar estatísticas de venda:", error);
        return { avgMonthlySales: 0 };
    }
};

/**
 * Converte todos os produtos simples (sem variações) para o modelo de variações
 * criando uma variação padrão "COR: BRANCO" herdando os dados do pai.
 */
export const bulkConvertToVariations = async (): Promise<{ success: number, fails: number }> => {
    try {
        // 1. Buscar produtos simples que não foram deletados
        const { data: simpleProducts, error: fetchError } = await supabase
            .from(TABLE_NAME)
            .select('*')
            .eq('has_variations', false)
            .eq('deleted', false);

        if (fetchError) throw fetchError;
        if (!simpleProducts || simpleProducts.length === 0) return { success: 0, fails: 0 };

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
                    unitPrice: Number(p.unit_price || 0),
                    costPrice: Number(p.cost_price || 0),
                    active: true,
                    condition: p.condition || 'novo',
                    attributes: [{ name: 'COR', value: 'BRANCO' }],
                    syncWithParent: true,
                    syncUnitPrice: true,
                    syncCostPrice: true,
                    syncCondition: true
                };

                const { error: updateError } = await supabase
                    .from(TABLE_NAME)
                    .update({
                        has_variations: true,
                        variations: [defaultVariation],
                        code: null,
                        stock: 0,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', p.id);

                if (updateError) throw updateError;
                success++;
            } catch (err) {
                console.error(`Falha ao converter produto ${p.id}:`, err);
                fails++;
            }
        }

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
        
        const { error } = await supabase
            .from(TABLE_NAME)
            .delete()
            .eq('is_draft', true)
            .lt('updated_at', sevenDaysAgo.toISOString());
            
        if (error) throw error;
    } catch (error) {
        console.error("Erro ao limpar rascunhos antigos:", error);
    }
};

/**
 * Migra todas as referências de um produto antigo para um novo
 */
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

/**
 * Busca descrições de produtos baseadas em pedidos e compras passadas.
 * Útil para itens que não estão cadastrados formalmente (serviços ad-hoc, fretes, etc).
 */
export const searchHistoricalItems = async (query: string): Promise<string[]> => {
    if (!query || query.length < 2) return [];

    try {
        const queryLower = query.toLowerCase();

        // 1. Buscar em Pedidos de Venda
        const { data: salesData } = await supabase
            .from('orders')
            .select('order_data')
            .eq('deleted', false)
            .order('id', { ascending: false })
            .limit(100);

        // 2. Buscar em Pedidos de Compra
        const { data: purchaseData } = await supabase
            .from('purchases')
            .select('items')
            .order('id', { ascending: false })
            .limit(100);

        const descriptions = new Set<string>();

        // Processar Vendas
        salesData?.forEach((row: any) => {
            const items = row.order_data?.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                if (desc.toLowerCase().includes(queryLower)) {
                    descriptions.add(desc);
                }
            });
        });

        // Processar Compras
        purchaseData?.forEach((row: any) => {
            const items = row.items || [];
            items.forEach((item: any) => {
                const desc = item.description || "";
                if (desc.toLowerCase().includes(queryLower)) {
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

